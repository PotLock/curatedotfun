import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "crypto";
import { logger } from "../utils/logger.js";

export class EncryptionService {
  private readonly algorithm: CipherGCMTypes = "aes-256-gcm";
  private readonly encryptionKey: Buffer;

  constructor(masterKeyHex: string) {
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      logger.error(
        "EncryptionService: Invalid or missing ENCRYPTION_MASTER_KEY. Must be a 64-character hex string (32 bytes).",
      );
      throw new Error(
        "EncryptionService: Invalid or missing ENCRYPTION_MASTER_KEY. Must be a 32-byte hex string.",
      );
    }
    try {
      this.encryptionKey = Buffer.from(masterKeyHex, "hex");
      if (this.encryptionKey.length !== 32) {
        // Double check byte length after hex conversion
        logger.error(
          "EncryptionService: ENCRYPTION_MASTER_KEY does not produce 32 bytes after hex decoding.",
        );
        throw new Error(
          "EncryptionService: ENCRYPTION_MASTER_KEY must be 32 bytes after hex decoding.",
        );
      }
      logger.info("EncryptionService initialized successfully.");
    } catch (error) {
      logger.error(
        "EncryptionService: Failed to decode ENCRYPTION_MASTER_KEY from hex.",
        { error },
      );
      throw new Error(
        "EncryptionService: Failed to decode ENCRYPTION_MASTER_KEY. Ensure it is a valid hex string.",
      );
    }
  }

  encrypt(plaintext: string): {
    encryptedValue: Buffer;
    iv: Buffer;
    authTag: Buffer;
  } {
    if (typeof plaintext !== "string" || plaintext.length === 0) {
      // It's often better to encrypt an empty string than to throw an error,
      // depending on application requirements. For secrets, an empty secret might be valid.
      logger.warn(
        "EncryptionService: Attempting to encrypt empty or non-string plaintext.",
      );
    }
    const iv = randomBytes(12); // AES-GCM standard IV size is 12 bytes (96 bits) for better performance and security. Spec used 16, but 12 is common. Let's stick to 12.
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: Buffer.from(encrypted, "hex"),
      iv: iv,
      authTag: authTag,
    };
  }

  decrypt(encryptedValue: Buffer, iv: Buffer, authTag: Buffer): string {
    if (!encryptedValue || !iv || !authTag) {
      logger.error(
        "EncryptionService: Missing encryptedValue, iv, or authTag for decryption.",
      );
      throw new Error("Decryption inputs missing.");
    }
    try {
      const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(
        encryptedValue.toString("hex"),
        "hex",
        "utf8",
      ); // Provide 'hex' as inputEncoding for encryptedValue
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      logger.error(
        "EncryptionService: Decryption failed. This could be due to an incorrect key, IV, authTag, or corrupted data.",
        { error },
      );
      // Do not throw the original error to avoid leaking crypto details.
      throw new Error("Decryption failed.");
    }
  }
}
