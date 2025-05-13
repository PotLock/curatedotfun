import { Context, Next } from "hono";
import * as jose from "jose";
import { Env } from "../types/app";

export class JwtTokenInvalid extends Error {
  constructor(message = "Invalid JWT token") {
    super(message);
    this.name = "JwtTokenInvalid";
  }
}

export class JwtTokenExpired extends Error {
  constructor(message = "JWT token has expired") {
    super(message);
    this.name = "JwtTokenExpired";
  }
}

export class JwtTokenSignatureMismatched extends Error {
  constructor(message = "JWT token signature mismatch") {
    super(message);
    this.name = "JwtTokenSignatureMismatched";
  }
}

/**
 * Decodes a JWT token without verification
 * @param token The JWT token to decode
 * @returns The decoded header and payload
 * @throws JwtTokenInvalid if the token format is invalid
 */
export function decode(token: string): { header: any; payload: any } {
  try {
    const [headerB64, payloadB64] = token.split(".");

    if (!headerB64 || !payloadB64) {
      throw new JwtTokenInvalid("Token format is invalid");
    }

    const headerStr = Buffer.from(headerB64, "base64").toString();
    const payloadStr = Buffer.from(payloadB64, "base64").toString();

    return {
      header: JSON.parse(headerStr),
      payload: JSON.parse(payloadStr),
    };
  } catch (error) {
    if (error instanceof JwtTokenInvalid) {
      throw error;
    }
    throw new JwtTokenInvalid("Failed to decode token");
  }
}

/**
 * Verifies a JWT token from Web3Auth
 * @param token The JWT token to verify
 * @param loginType The type of login ("social" or "wallet")
 * @returns The decoded JWT payload if verification is successful
 * @throws Error if verification fails
 */
export async function verify(
  token: string,
  loginType: "social" | "wallet" = "social",
) {
  try {
    // Determine the JWKS URL based on login type
    const jwksUrl =
      loginType === "social"
        ? "https://api-auth.web3auth.io/jwks"
        : "https://authjs.web3auth.io/jwks";

    // Get the JWKS used to sign the JWT
    const jwks = jose.createRemoteJWKSet(new URL(jwksUrl));

    // Verify the JWT using Web3Auth's JWKS
    const jwtDecoded = await jose.jwtVerify(token, jwks, {
      algorithms: ["ES256"],
    });

    return jwtDecoded.payload;
  } catch (error) {
    console.error(`Error verifying ${loginType} JWT:`, error);

    if (error instanceof jose.errors.JWTExpired) {
      throw new JwtTokenExpired();
    } else if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      throw new JwtTokenSignatureMismatched();
    }

    throw new JwtTokenInvalid("Token verification failed");
  }
}

/**
 * Middleware for Web3Auth JWT verification
 * @param c The Hono context
 * @param next The next middleware function
 */
export async function web3AuthJwtMiddleware(c: Context<Env>, next: Next) {
  // Extract token from Authorization header
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await next();
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    await next();
    return;
  }

  try {
    let payload;
    let loginType: "social" | "wallet" = "social";

    // Try social login verification first
    try {
      payload = await verify(token, "social");
      loginType = "social";
    } catch (socialError) {
      // If social login verification fails, try external wallet verification
      payload = await verify(token, "wallet");
      loginType = "wallet";
    }

    c.set("jwtPayload", {
      ...payload,
      loginType,
      authProviderId: extractAuthProviderIdFromJwt(payload),
    });
  } catch (error) {
    // If verification fails, continue without setting jwtPayload
    console.error("JWT verification failed:", error);
  }

  await next();
}

/**
 * Extracts the public key from a social login JWT payload
 * @param payload The decoded JWT payload
 * @param keyType The type of key to extract (default: "web3auth_app_key")
 * @returns The public key if found, null otherwise
 */
export function extractPublicKeyFromSocialLoginJwt(
  payload: any,
  keyType: string = "web3auth_app_key", // TODO: if doing a self-service, this would be where to build off of
): string | null {
  if (!payload.wallets || !Array.isArray(payload.wallets)) {
    return null;
  }

  const wallet = payload.wallets.find((w: any) => w.type === keyType);
  return wallet?.public_key || null;
}

/**
 * Extracts the wallet address from an external wallet JWT payload
 * @param payload The decoded JWT payload
 * @param walletType The type of wallet (default: "ethereum")
 * @returns The wallet address if found, null otherwise
 */
export function extractAddressFromExternalWalletJwt(
  payload: any,
  walletType: string = "ethereum",
): string | null {
  if (!payload.wallets || !Array.isArray(payload.wallets)) {
    return null;
  }

  const wallet = payload.wallets.find((w: any) => w.type === walletType);
  return wallet?.address || null;
}

/**
 * Extracts the auth provider identifier from a JWT payload
 * @param payload The decoded JWT payload
 * @returns The auth provider identifier (verifierId)
 */
export function extractAuthProviderIdFromJwt(payload: any): string | null {
  return payload.verifierId || null;
}

/**
 * Verifies a JWT token and extracts relevant information based on the login type
 * @param idToken The JWT token to verify
 * @param publicKey The public key or address to verify against (optional)
 * @returns An object containing the verification result and extracted information
 */
export async function verifyAndExtractJwtInfo(
  idToken: string,
  publicKey?: string,
) {
  try {
    // Try social login verification first
    try {
      const socialPayload = await verify(idToken, "social");
      const extractedPublicKey =
        extractPublicKeyFromSocialLoginJwt(socialPayload);
      const authProviderId = extractAuthProviderIdFromJwt(socialPayload);

      // If publicKey is provided, verify it matches
      if (publicKey && extractedPublicKey) {
        const isValid =
          extractedPublicKey.toLowerCase() === publicKey.toLowerCase();
        if (!isValid) {
          throw new Error("Public key mismatch");
        }
      }

      return {
        isValid: true,
        loginType: "social",
        authProviderId,
        publicKey: extractedPublicKey,
        payload: socialPayload,
      };
    } catch (socialError) {
      // If social login verification fails, try external wallet verification
      const walletPayload = await verify(idToken, "wallet");
      const extractedAddress =
        extractAddressFromExternalWalletJwt(walletPayload);
      const authProviderId = extractAuthProviderIdFromJwt(walletPayload);

      // If publicKey (address) is provided, verify it matches
      if (publicKey && extractedAddress) {
        const isValid =
          extractedAddress.toLowerCase() === publicKey.toLowerCase();
        if (!isValid) {
          throw new Error("Wallet address mismatch");
        }
      }

      return {
        isValid: true,
        loginType: "wallet",
        authProviderId,
        address: extractedAddress,
        payload: walletPayload,
      };
    }
  } catch (error) {
    console.error("JWT verification failed:", error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
