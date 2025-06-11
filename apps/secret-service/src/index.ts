import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "hono/adapter";
import { db } from "./db/index.js";
import { EncryptionService } from "./services/encryption.service.js";
import { SecretStoreService } from "./services/secret-store.service.js";
import { logger } from "./utils/logger.js";
import { KeyPair } from "near-api-js";
import { bufferToHex } from "./utils/crypto-helpers.js";

// Define types for environment variables for clarity
interface AppEnv {
  ENCRYPTION_MASTER_KEY: string;
  SECRET_SERVICE_INTERNAL_API_KEY: string;
  PORT?: string; // Optional port from environment
  DATABASE_URL: string; // Already checked in db/index.js, but good to have here
  [key: string]: string | undefined; // Index signature for Hono compatibility
}

const app = new Hono<{ Variables: AppEnv }>();

// Initialize services - these will be set in the 'request' hook or a startup function
let encryptionService: EncryptionService;
let secretStoreService: SecretStoreService;

// Middleware for API Key Authentication & Service Initialization
app.use("*", async (c, next) => {
  // Service initialization logic (lazy, on first request)
  // This ensures env vars are loaded via Hono's adapter before services use them.
  if (!encryptionService) {
    const { ENCRYPTION_MASTER_KEY, DATABASE_URL } = env<AppEnv>(c);
    if (!ENCRYPTION_MASTER_KEY) {
      logger.error(
        "FATAL: ENCRYPTION_MASTER_KEY is not defined in the environment.",
      );
      return c.json(
        { error: "Server configuration error: Missing master key." },
        500,
      );
    }
    if (!DATABASE_URL) {
      // Though db/index.js checks, good to be defensive
      logger.error(
        "FATAL: DATABASE_URL is not defined in the environment for service initialization.",
      );
      return c.json(
        { error: "Server configuration error: Missing database URL." },
        500,
      );
    }
    try {
      encryptionService = new EncryptionService(ENCRYPTION_MASTER_KEY);
      secretStoreService = new SecretStoreService(
        db,
        encryptionService,
        logger,
      );
      logger.info("Services initialized successfully.");
    } catch (error) {
      logger.error("FATAL: Failed to initialize services.", { error });
      return c.json({ error: "Server initialization failed." }, 500);
    }
  }

  // API Key Authentication
  const { SECRET_SERVICE_INTERNAL_API_KEY } = env<AppEnv>(c);
  if (!SECRET_SERVICE_INTERNAL_API_KEY) {
    logger.error(
      "FATAL: SECRET_SERVICE_INTERNAL_API_KEY is not defined in the environment.",
    );
    return c.json(
      { error: "Server configuration error: Missing internal API key." },
      500,
    );
  }

  const providedKey = c.req.header("X-API-Key");
  if (providedKey !== SECRET_SERVICE_INTERNAL_API_KEY) {
    logger.warn(
      `Unauthorized access attempt to secret-service. Provided key: ${providedKey ? providedKey.substring(0, 5) + "..." : "None"}`,
    );
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});

// Endpoint to retrieve a plaintext secret
app.post("/v1/secrets/get-plaintext", async (c) => {
  try {
    const { feedId, keyName } = await c.req.json<{
      feedId: string;
      keyName: string;
    }>();
    if (!feedId || !keyName) {
      logger.warn(
        "/v1/secrets/get-plaintext: Missing feedId or keyName in request.",
      );
      return c.json({ error: "Missing feedId or keyName" }, 400);
    }

    const plaintext = await secretStoreService.getPlaintextSecret(
      feedId,
      keyName,
    );
    if (plaintext === null) {
      logger.info(
        `/v1/secrets/get-plaintext: Secret not found or decryption failed for feedId '${feedId}', keyName '${keyName}'.`,
      );
      return c.json({ error: "Secret not found or decryption failed" }, 404);
    }

    // CRITICAL: Ensure this endpoint is NOT used for private keys that should only be used for signing.
    // Add checks here if certain keyNames (e.g., those ending with _PRIVATE_KEY) should be disallowed.
    if (keyName.toUpperCase().includes("PRIVATE_KEY")) {
      logger.error(
        `/v1/secrets/get-plaintext: Attempt to retrieve a private key ('${keyName}') via plaintext endpoint for feedId '${feedId}'. This is disallowed.`,
      );
      return c.json(
        {
          error:
            "Retrieving this type of key via plaintext is not allowed. Use a signing endpoint.",
        },
        403,
      );
    }

    logger.info(
      `/v1/secrets/get-plaintext: Successfully retrieved secret for feedId '${feedId}', keyName '${keyName}'.`,
    );
    return c.json({ plaintext });
  } catch (error) {
    logger.error("/v1/secrets/get-plaintext: Unexpected error.", { error });
    return c.json({ error: "An unexpected error occurred." }, 500);
  }
});

// Endpoint to sign a payload with a NEAR private key
app.post("/v1/secrets/sign-near", async (c) => {
  try {
    const { feedId, keyName, payload } = await c.req.json<{
      feedId: string;
      keyName: string;
      payload: string;
    }>();
    if (!feedId || !keyName || !payload) {
      logger.warn(
        "/v1/secrets/sign-near: Missing feedId, keyName, or payload in request.",
      );
      return c.json({ error: "Missing feedId, keyName, or payload" }, 400);
    }

    const privateKey = await secretStoreService.getPlaintextSecret(
      feedId,
      keyName,
    );
    if (privateKey === null) {
      logger.warn(
        `/v1/secrets/sign-near: Attempt to sign with non-existent or inaccessible key '${keyName}' for feed '${feedId}'.`,
      );
      return c.json(
        { error: "Private key not found or decryption failed" },
        404,
      );
    }

    try {
      const keyPair = KeyPair.fromString(privateKey as any); // Cast to satisfy KeyPairString type
      const signature = keyPair.sign(new TextEncoder().encode(payload));

      logger.info(
        `/v1/secrets/sign-near: Successfully signed payload for feedId '${feedId}', keyName '${keyName}'.`,
      );
      return c.json({
        signature: bufferToHex(Buffer.from(signature.signature)),
        publicKey: keyPair.getPublicKey().toString(), // Use getPublicKey() for consistency
      });
    } catch (signError) {
      logger.error(
        `/v1/secrets/sign-near: Error signing payload for feed '${feedId}' with key '${keyName}'.`,
        { signError },
      );
      return c.json({ error: "Signing failed" }, 500);
    }
  } catch (error) {
    logger.error("/v1/secrets/sign-near: Unexpected error.", { error });
    return c.json({ error: "An unexpected error occurred." }, 500);
  }
});

// Endpoint to add/update secrets
app.post("/v1/secrets/set-secret", async (c) => {
  try {
    // The spec mentions publicKey here, but SecretStoreService.setSecret doesn't use it.
    // If publicKey needs to be stored, the service and schema would need an update.
    // For now, matching the service method.
    const { feedId, keyName, plaintextValue } = await c.req.json<{
      feedId: string;
      keyName: string;
      plaintextValue: string;
      publicKey?: string;
    }>();
    if (!feedId || !keyName || plaintextValue === undefined) {
      // Check plaintextValue for undefined as empty string might be valid
      logger.warn(
        "/v1/secrets/set-secret: Missing feedId, keyName, or plaintextValue in request.",
      );
      return c.json(
        { error: "Missing feedId, keyName, or plaintextValue" },
        400,
      );
    }

    await secretStoreService.setSecret(feedId, keyName, plaintextValue);
    logger.info(
      `/v1/secrets/set-secret: Secret stored/updated successfully for feedId '${feedId}', keyName '${keyName}'.`,
    );
    return c.json({ message: "Secret stored/updated successfully" });
  } catch (error) {
    logger.error("/v1/secrets/set-secret: Error setting secret.", { error });
    // secretStoreService.setSecret already logs details if it throws
    return c.json({ error: "Failed to store secret" }, 500);
  }
});

// Basic health check endpoint
app.get("/health", (c) => {
  logger.info("Health check successful.");
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// For environment variables at startup, use process.env directly.
// The AppEnv interface helps type 'c.var' within Hono handlers.
const port = parseInt(process.env.PORT || "3000", 10);

logger.info(`SecretService is starting on port ${port}...`);

serve(
  {
    fetch: app.fetch,
    port: port,
  },
  (info) => {
    logger.info(`SecretService is running at http://localhost:${info.port}`);
  },
);

export default app;
