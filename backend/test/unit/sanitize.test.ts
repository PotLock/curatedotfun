import { describe, test, expect } from "bun:test";
import { sanitizeJson } from "../../src/utils/sanitize";

describe("Sanitize Utilities", () => {
  describe("sanitizeJson", () => {
    test("should handle normal JSON objects", () => {
      const input = { key: "value", number: 123, bool: true };
      const result = sanitizeJson(input);
      expect(result).toEqual(input);
    });

    test("should handle nested JSON objects", () => {
      const input = {
        key: "value",
        nested: {
          inner: "innerValue",
          array: [1, 2, 3],
        },
      };
      const result = sanitizeJson(input);
      expect(result).toEqual(input);
    });

    test("should handle arrays", () => {
      const input = [1, 2, 3, { key: "value" }];
      const result = sanitizeJson(input);
      expect(result).toEqual(input);
    });

    test("should handle stringified JSON", () => {
      const obj = { key: "value", number: 123 };
      const input = JSON.stringify(obj);
      const result = sanitizeJson(input);
      expect(result).toEqual(obj);
    });

    test("should handle double stringified JSON", () => {
      const obj = { key: "value", number: 123 };
      const input = JSON.stringify(JSON.stringify(obj));
      const result = sanitizeJson(input);
      expect(result).toEqual(obj);
    });

    test("should handle BOM characters", () => {
      const obj = { key: "value" };
      const input = "\uFEFF" + JSON.stringify(obj);
      const result = sanitizeJson(input);
      expect(result).toEqual(obj);
    });

    test("should handle null values", () => {
      const input = null;
      const result = sanitizeJson(input);
      expect(result).toBeNull();
    });

    test("should handle undefined values", () => {
      const input = undefined;
      const result = sanitizeJson(input);
      expect(result).toBeUndefined();
    });

    test("should handle primitive values", () => {
      expect(sanitizeJson(123)).toBe(123);
      expect(sanitizeJson("string")).toBe("string");
      expect(sanitizeJson(true)).toBe(true);
    });

    test("should handle invalid JSON strings", () => {
      const input = "{ invalid: json }";
      expect(() => sanitizeJson(input)).not.toThrow();
      // Should return the original string if it can't be parsed
      expect(sanitizeJson(input)).toBe(input);
    });

    test("should handle nested stringified JSON with BOM", () => {
      const obj = { key: "value", nested: { inner: "value" } };
      const stringified = JSON.stringify(obj);
      const withBom = "\uFEFF" + stringified;
      const doubleStringified = JSON.stringify(withBom);

      const result = sanitizeJson(doubleStringified);
      expect(result).toEqual(obj);
    });
  });
});
