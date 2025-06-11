import {
  customType,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";

// Define a custom type for bytea, assuming it will be handled as Buffer in JS/TS
const byteaType = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer): string {
    // Convert Buffer to hex string for storage, or let the driver handle it
    // For node-postgres, it can often handle Buffers directly.
    // If direct Buffer handling is problematic, convert to hex: value.toString('hex')
    // However, for now, let's assume the driver handles Buffer correctly.
    // If not, this mapping function would be: `return '\\x' + value.toString('hex');`
    return value as any;
  },
  fromDriver(value: string | Buffer): Buffer {
    // node-postgres might return Buffer directly for bytea.
    // If it returns a hex string (e.g., '\\x...'), convert it.
    if (typeof value === "string") {
      // Assuming hex format like \x... from postgres
      if (value.startsWith("\\x")) {
        return Buffer.from(value.substring(2), "hex");
      }
      return Buffer.from(value, "hex");
    }
    return value;
  },
});

export const secrets = pgTable(
  "secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedId: uuid("feed_id").notNull(),
    keyName: varchar("key_name", { length: 255 }).notNull(),
    encryptedValue: byteaType("encrypted_value").notNull(),
    encryptionIv: byteaType("encryption_iv").notNull(), // Initialization Vector for AES
    authenticationTag: byteaType("authentication_tag").notNull(), // Authentication Tag for AES-256-GCM
    ...timestamps
  },
  (table) => [
    uniqueIndex("ux_feed_key_name").on(
      table.feedId,
      table.keyName,
    )
  ],
);
