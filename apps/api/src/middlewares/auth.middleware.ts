import { Context, MiddlewareHandler, Next } from "hono";
import { verify } from "near-sign-verify";

export function createAuthMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    let accountId: string | null = null;

    if (method === "GET") {
      const nearAccountHeader = c.req.header("X-Near-Account");
      if (
        nearAccountHeader &&
        nearAccountHeader.toLowerCase() !== "anonymous"
      ) {
        accountId = nearAccountHeader;
      }
      // If header is missing or "anonymous", accountId remains null
      c.set("accountId", accountId);
      await next();
      return;
    }

    // For non-GET requests (POST, PUT, DELETE, PATCH, etc.)
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      c.status(401);
      return c.json({
        error: "Unauthorized",
        details: "Missing or malformed Authorization header.",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    try {
      const verificationResult = await verify(token, {
        expectedRecipient: "curatefun.near",
        requireFullAccessKey: false,
        nonceMaxAge: 300000, // 5 mins
      });

      accountId = verificationResult.accountId;
      c.set("accountId", accountId);
      await next();
    } catch (error) {
      console.error("Token verification error:", error);
      c.status(401);
      return c.json({
        error: "Unauthorized",
        details: "Invalid token signature or recipient.",
      });
    }
  };
}
