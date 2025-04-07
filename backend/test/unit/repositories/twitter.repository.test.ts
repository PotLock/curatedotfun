import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { twitterRepository } from "../../../src/services/db/repositories";
import * as transaction from "../../../src/services/db/transaction";
import * as twitterQueries from "../../../src/services/twitter/queries";

// Use spyOn to mock the transaction functions
const executeOperationSpy = spyOn(
  transaction,
  "executeOperation",
).mockImplementation(async (callback, isWrite = false) => {
  // Make sure to await the callback to ensure it's executed
  return await callback({ mockDb: true });
});

const withDatabaseErrorHandlingSpy = spyOn(
  transaction,
  "withDatabaseErrorHandling",
).mockImplementation(async (operation, options, defaultValue) => {
  try {
    // Just directly call the operation function and return its result
    return await operation();
  } catch (error) {
    // For error tests, return the default value if provided
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
});

// Use spyOn to mock the twitter query functions
const setTwitterCookiesSpy = spyOn(
  twitterQueries,
  "setTwitterCookies",
).mockImplementation(async () => {});
const getTwitterCookiesSpy = spyOn(
  twitterQueries,
  "getTwitterCookies",
).mockImplementation(async () => null);
const deleteTwitterCookiesSpy = spyOn(
  twitterQueries,
  "deleteTwitterCookies",
).mockImplementation(async () => {});
const setTwitterCacheValueSpy = spyOn(
  twitterQueries,
  "setTwitterCacheValue",
).mockImplementation(async () => {});
const getTwitterCacheValueSpy = spyOn(
  twitterQueries,
  "getTwitterCacheValue",
).mockImplementation(async () => null);
const deleteTwitterCacheValueSpy = spyOn(
  twitterQueries,
  "deleteTwitterCacheValue",
).mockImplementation(async () => {});
const clearTwitterCacheSpy = spyOn(
  twitterQueries,
  "clearTwitterCache",
).mockImplementation(async () => {});

describe("TwitterRepository", () => {
  beforeEach(() => {
    // Reset all spies before each test
    executeOperationSpy.mockClear();
    withDatabaseErrorHandlingSpy.mockClear();
    setTwitterCookiesSpy.mockClear();
    getTwitterCookiesSpy.mockClear();
    deleteTwitterCookiesSpy.mockClear();
    setTwitterCacheValueSpy.mockClear();
    getTwitterCacheValueSpy.mockClear();
    deleteTwitterCacheValueSpy.mockClear();
    clearTwitterCacheSpy.mockClear();
  });

  describe("setTwitterCookies", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const username = "testuser";
      const cookies = [
        {
          name: "cookie1",
          value: "value1",
          domain: "domain",
          path: "/",
          secure: true,
          httpOnly: true,
        },
      ];

      await twitterRepository.setTwitterCookies(username, cookies);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(setTwitterCookiesSpy).toHaveBeenCalledWith(
        { mockDb: true },
        username,
        JSON.stringify(cookies),
      );
    });

    test("should handle null cookies", async () => {
      const username = "testuser";

      await twitterRepository.setTwitterCookies(username, null);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(setTwitterCookiesSpy).toHaveBeenCalledWith(
        { mockDb: true },
        username,
        "null",
      );
    });
  });

  describe("getTwitterCookies", () => {
    test("should return parsed cookies when found", async () => {
      const username = "testuser";
      const cookies = [
        {
          name: "cookie1",
          value: "value1",
          domain: "domain",
          path: "/",
          secure: true,
          httpOnly: true,
        },
      ];

      getTwitterCookiesSpy.mockResolvedValueOnce({
        cookies: JSON.stringify(cookies),
      });

      const result = await twitterRepository.getTwitterCookies(username);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getTwitterCookiesSpy).toHaveBeenCalledWith(
        { mockDb: true },
        username,
      );
      expect(result).toEqual(cookies);
    });

    test("should return null when no cookies found", async () => {
      const username = "testuser";

      getTwitterCookiesSpy.mockResolvedValueOnce(null);

      const result = await twitterRepository.getTwitterCookies(username);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getTwitterCookiesSpy).toHaveBeenCalledWith(
        { mockDb: true },
        username,
      );
      expect(result).toBeNull();
    });
  });

  describe("deleteTwitterCookies", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const username = "testuser";

      await twitterRepository.deleteTwitterCookies(username);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(deleteTwitterCookiesSpy).toHaveBeenCalledWith(
        { mockDb: true },
        username,
      );
    });
  });

  describe("setTwitterCacheValue", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const key = "testkey";
      const value = "testvalue";

      await twitterRepository.setTwitterCacheValue(key, value);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(setTwitterCacheValueSpy).toHaveBeenCalledWith(
        { mockDb: true },
        key,
        value,
      );
    });
  });

  describe("getTwitterCacheValue", () => {
    test("should return cache value when found", async () => {
      const key = "testkey";
      const value = "testvalue";

      getTwitterCacheValueSpy.mockResolvedValueOnce({ value });

      const result = await twitterRepository.getTwitterCacheValue(key);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getTwitterCacheValueSpy).toHaveBeenCalledWith(
        { mockDb: true },
        key,
      );
      expect(result).toEqual(value);
    });

    test("should return null when no cache value found", async () => {
      const key = "testkey";

      getTwitterCacheValueSpy.mockResolvedValueOnce(null);

      const result = await twitterRepository.getTwitterCacheValue(key);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getTwitterCacheValueSpy).toHaveBeenCalledWith(
        { mockDb: true },
        key,
      );
      expect(result).toBeNull();
    });
  });

  describe("deleteTwitterCacheValue", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const key = "testkey";

      await twitterRepository.deleteTwitterCacheValue(key);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(deleteTwitterCacheValueSpy).toHaveBeenCalledWith(
        { mockDb: true },
        key,
      );
    });
  });

  describe("clearTwitterCache", () => {
    test("should call executeOperation with the correct parameters", async () => {
      await twitterRepository.clearTwitterCache();

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(clearTwitterCacheSpy).toHaveBeenCalledWith({
        mockDb: true,
      });
    });
  });
});
