import { describe, test, expect } from "bun:test";
import { sanitizeJson } from "../utils/sanitize";

describe("sanitizeJson", () => {
  test("handles normal objects correctly", () => {
    const input = { name: "test", value: 123 };
    const result = sanitizeJson(input);
    expect(result).toEqual(input);
  });

  test("handles arrays correctly", () => {
    const input = [1, 2, 3, { test: "value" }];
    const result = sanitizeJson(input);
    expect(result).toEqual(input);
  });

  test("handles primitive values correctly", () => {
    expect(sanitizeJson("simple string")).toBe("simple string");
    expect(sanitizeJson(123)).toBe(123);
    expect(sanitizeJson(true)).toBe(true);
    expect(sanitizeJson(null)).toBe(null);
    expect(sanitizeJson(undefined)).toBe(undefined);
  });

  test("parses stringified JSON", () => {
    const obj = { name: "test", value: 123 };
    const stringified = JSON.stringify(obj);
    const result = sanitizeJson(stringified);
    expect(result).toEqual(obj);
  });

  test("handles nested stringified JSON", () => {
    const innerObj = { inner: "value" };
    const outerObj = { outer: JSON.stringify(innerObj) };
    const result = sanitizeJson(outerObj);
    expect(result).toEqual({ outer: innerObj });
  });

  test("removes BOM characters from JSON strings", () => {
    const obj = { name: "test" };
    const stringified = "\uFEFF" + JSON.stringify(obj);
    const result = sanitizeJson(stringified);
    expect(result).toEqual(obj);
  });

  test("handles invalid JSON strings gracefully", () => {
    const invalidJson = '{"name": "test", invalid}';
    const result = sanitizeJson(invalidJson);
    expect(result).toBe(invalidJson);
  });

  test("recursively processes nested objects and arrays", () => {
    const input = {
      name: "test",
      nested: {
        array: [1, 2, { stringified: JSON.stringify({ value: "nested" }) }],
      },
    };
    
    const expected = {
      name: "test",
      nested: {
        array: [1, 2, { stringified: { value: "nested" } }],
      },
    };
    
    const result = sanitizeJson(input);
    expect(result).toEqual(expected);
  });
});
