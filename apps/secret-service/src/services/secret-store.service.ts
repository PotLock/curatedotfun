import {
  secrets,
  type DB,
  type InsertSecret,
  type SelectSecret,
} from "@curatedotfun/shared-db";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../utils/logger.js";
import type { EncryptionService } from "./encryption.service.js";

export class SecretStoreService {
  private db: DB;
  private encryptionService: EncryptionService;
  private logger: Logger;

  constructor(
    db: DB,
    encryptionService: EncryptionService,
    logger: Logger,
  ) {
    this.db = db;
    this.encryptionService = encryptionService;
    this.logger = logger;
    this.logger.info("SecretStoreService initialized.");
  }

  async setSecret(
    feedId: string,
    keyName: string,
    plaintextValue: string,
  ): Promise<void> {
    this.logger.debug(
      `Attempting to set secret for feedId: ${feedId}, keyName: ${keyName}`,
    );
    const { encryptedValue, iv, authTag } =
      this.encryptionService.encrypt(plaintextValue);

    const insertSecretValues: InsertSecret = {
      feedId: feedId,
      keyName,
      encryptedValue,
      encryptionIv: iv,
      authenticationTag: authTag,
    };

    try {
      await this.db
        .insert(secrets)
        .values(insertSecretValues)
        .onConflictDoUpdate({
          target: [secrets.feedId, secrets.keyName],
          set: {
            encryptedValue,
            encryptionIv: iv,
            authenticationTag: authTag,
          },
        })
        .execute();
      this.logger.info(
        `Secret '${keyName}' for feed '${feedId}' stored/updated successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Error storing/updating secret '${keyName}' for feed '${feedId}':`,
        { error },
      );
      throw new Error(`Failed to store/update secret '${keyName}'.`);
    }
  }

  async getPlaintextSecret(
    feedId: string,
    keyName: string,
  ): Promise<string | null> {
    this.logger.debug(
      `Attempting to get plaintext secret for feedId: ${feedId}, keyName: ${keyName}`,
    );
    let secretRecord: SelectSecret | undefined;

    try {
      secretRecord = await this.db.query.secrets.findFirst({
        where: and(eq(secrets.feedId, feedId), eq(secrets.keyName, keyName)),
      });
    } catch (error) {
      this.logger.error(
        `Database error retrieving secret '${keyName}' for feed '${feedId}':`,
        { error },
      );
      return null;
    }

    if (!secretRecord) {
      this.logger.warn(`Secret '${keyName}' not found for feed '${feedId}'.`);
      return null;
    }

    // Ensure all necessary bytea fields are present and are Buffers
    if (
      !(secretRecord.encryptedValue instanceof Buffer) ||
      !(secretRecord.encryptionIv instanceof Buffer) ||
      !(secretRecord.authenticationTag instanceof Buffer)
    ) {
      this.logger.error(
        `Corrupted or invalid data format for secret '${keyName}', feed '${feedId}'. Expected Buffers.`,
      );
      return null;
    }

    try {
      const decryptedText = this.encryptionService.decrypt(
        secretRecord.encryptedValue,
        secretRecord.encryptionIv,
        secretRecord.authenticationTag,
      );
      this.logger.info(
        `Secret '${keyName}' for feed '${feedId}' decrypted successfully.`,
      );
      return decryptedText;
    } catch (error) {
      // EncryptionService's decrypt method already logs detailed errors
      this.logger.warn(
        `Failed to decrypt secret '${keyName}' for feed '${feedId}'. This might indicate a data integrity issue or incorrect master key.`,
      );
      return null;
    }
  }
}
