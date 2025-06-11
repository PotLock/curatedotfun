/**
 * Converts a Buffer to its hexadecimal string representation.
 * @param buffer The Buffer to convert.
 * @returns The hexadecimal string.
 */
export function bufferToHex(buffer: Buffer): string {
  return buffer.toString("hex");
}

/**
 * Converts a hexadecimal string to a Buffer.
 * @param hexString The hexadecimal string to convert.
 * @returns The Buffer.
 */
export function hexToBuffer(hexString: string): Buffer {
  return Buffer.from(hexString, "hex");
}
