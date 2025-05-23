import nock from "nock";
import { createTestServer } from "./test-server";
import { createTestClient } from "./test-client";

/**
 * Sets up a test server and returns the server and API client
 * @returns An object containing the server and API client
 */
export async function setupTestServer() {
  const testServer = await createTestServer();
  const apiClient = createTestClient(testServer.port);

  return { server: testServer, apiClient };
}

/**
 * Cleans up after tests
 * @param server The server to close
 */
export async function cleanupTestServer(server: any) {
  await server.close();
  nock.cleanAll();
}

/**
 * Waits for a specified amount of time
 * @param ms Time to wait in milliseconds
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a random string for use in tests
 * @param length Length of the string to generate
 * @returns A random string
 */
export function randomString(length = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
