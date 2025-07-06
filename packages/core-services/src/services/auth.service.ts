import {
  AuthRequestRepository,
  InsertAuthRequest,
} from "@curatedotfun/shared-db";
import { toHex } from "@fastnear/utils";
import { randomBytes } from "crypto";
import { sign } from "hono/jwt";
import { verify } from "near-sign-verify";
import { z } from "zod";
import { UserService } from "./users.service";

const AUTH_REQUEST_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

const CreateAuthRequestSchema = z.object({
  accountId: z.string(),
});

const VerifyAuthRequestSchema = z.object({
  token: z.string(),
  accountId: z.string(),
});

export class AuthService {
  private userService: UserService;
  private authRequestRepository: AuthRequestRepository;

  constructor(
    authRequestRepository: AuthRequestRepository,
    userService: UserService,
  ) {
    this.authRequestRepository = authRequestRepository;
    this.userService = userService;
  }

  async createAuthRequest(payload: z.infer<typeof CreateAuthRequestSchema>) {
    const { accountId } = payload;
    await this.userService.ensureUserProfile(accountId);

    // Invalidate any existing auth requests for this account
    await this.authRequestRepository.deleteByAccountId(accountId);

    const nonce = randomBytes(32).toString("hex");

    const expiresAt = new Date(Date.now() + AUTH_REQUEST_EXPIRY_MS);

    const newAuthRequest: InsertAuthRequest = {
      nonce,
      accountId,
      expiresAt,
    };

    await this.authRequestRepository.create(newAuthRequest);

    return {
      nonce,
      recipient: "curatefun.near",
    };
  }

  async verifyAuthRequest(payload: z.infer<typeof VerifyAuthRequestSchema>) {
    const { token, accountId } = payload;

    const latestRequest =
      await this.authRequestRepository.findLatestByAccountId(accountId);

    if (!latestRequest) {
      throw new Error("No recent auth request found for this account.");
    }

    if (latestRequest.expiresAt < new Date()) {
      await this.authRequestRepository.deleteById(latestRequest.id);
      throw new Error("Auth request has expired.");
    }

    const message = `Authorize Curate.fun`;

    const verificationResult = await verify(token, {
      expectedRecipient: "curatefun.near",
      expectedMessage: message,
      validateNonce: (nonceFromToken) => {
        const receivedNonceHex = toHex(nonceFromToken);
        return receivedNonceHex === latestRequest.nonce;
      },
    });

    if (verificationResult.accountId !== accountId) {
      throw new Error("Account ID mismatch.");
    }

    await this.authRequestRepository.deleteById(latestRequest.id);

    const jwtPayload = {
      sub: accountId,
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set.");
    }

    const jwt = await sign(jwtPayload, secret);
    return { jwt };
  }
}
