import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { twitterRepository } from "../../../src/services/db/repositories";
import * as transaction from "../../../src/services/db/transaction";
import * as twitterQueries from "../../../src/services/twitter/queries";

// Mock the transaction module
mock.module("../../../src/services/db/transaction", () => ({
  executeOperation: mock((callback, isWrite = false) =>
    callback({ mockDb: true }),
  ),
  withDatabaseErrorHandling: mock(async (operation, options, defaultValue) => {
    try {
      return await operation();
    } catch (error) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }),
}));

// Mock the twitter queries
mock.module("../../../src/services/twitter/queries", () => ({
  setTwitterCookies: mock(),
  getTwitterCookies: mock(),
  deleteTwitterCookies: mock(),
  setTwitterCacheValue: mock(),
  getTwitterCacheValue: mock(),
  deleteTwitterCacheValue: mock(),
  clearTwitterCache: mock(),
}));

describe("TwitterRepository", () => {
  // No need for beforeEach reset as we're using fresh mocks for each test

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

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.setTwitterCookies).toHaveBeenCalledWith(
        { mockDb: true },
        username,
        JSON.stringify(cookies),
      );
    });

    test("should handle null cookies", async () => {
      const username = "testuser";

      await twitterRepository.setTwitterCookies(username, null);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.setTwitterCookies).toHaveBeenCalledWith(
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

      mock.module("../../../src/services/twitter/queries", () => ({
        ...twitterQueries,
        getTwitterCookies: mock().mockResolvedValue({
          cookies: JSON.stringify(cookies),
        }),
      }));

      const result = await twitterRepository.getTwitterCookies(username);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.getTwitterCookies).toHaveBeenCalledWith(
        { mockDb: true },
        username,
      );
      expect(result).toEqual(cookies);
    });

    test("should return null when no cookies found", async () => {
      const username = "testuser";

      mock.module("../../../src/services/twitter/queries", () => ({
        ...twitterQueries,
        getTwitterCookies: mock().mockResolvedValue(null),
      }));

      const result = await twitterRepository.getTwitterCookies(username);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.getTwitterCookies).toHaveBeenCalledWith(
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

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.deleteTwitterCookies).toHaveBeenCalledWith(
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

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.setTwitterCacheValue).toHaveBeenCalledWith(
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

      mock.module("../../../src/services/twitter/queries", () => ({
        ...twitterQueries,
        getTwitterCacheValue: mock().mockResolvedValue({ value }),
      }));

      const result = await twitterRepository.getTwitterCacheValue(key);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.getTwitterCacheValue).toHaveBeenCalledWith(
        { mockDb: true },
        key,
      );
      expect(result).toEqual(value);
    });

    test("should return null when no cache value found", async () => {
      const key = "testkey";

      mock.module("../../../src/services/twitter/queries", () => ({
        ...twitterQueries,
        getTwitterCacheValue: mock().mockResolvedValue(null),
      }));

      const result = await twitterRepository.getTwitterCacheValue(key);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.getTwitterCacheValue).toHaveBeenCalledWith(
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

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.deleteTwitterCacheValue).toHaveBeenCalledWith(
        { mockDb: true },
        key,
      );
    });
  });

  describe("clearTwitterCache", () => {
    test("should call executeOperation with the correct parameters", async () => {
      await twitterRepository.clearTwitterCache();

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(twitterQueries.clearTwitterCache).toHaveBeenCalledWith({
        mockDb: true,
      });
    });
  });
});
