import { serve } from "@hono/node-server";
import { createApp } from "../../src/app";
import { AppInstance } from "../../src/types/app";

/**
 * Creates and starts a test server
 * @param options Options for the test server
 * @returns The server instance and app context
 */
export async function createTestServer(options: { port?: number } = {}) {
  // Create the app
  const appInstance: AppInstance = await createApp();

  // Start the server on a random port if not specified
  const port = options.port || 0;
  const server = serve({
    fetch: appInstance.app.fetch,
    port,
  });

  // Get the actual port that was assigned
  const actualPort = (server.address() as any).port;

  return {
    server,
    app: appInstance.app,
    context: appInstance.context,
    port: actualPort,

    // Helper method to close the server
    close: async () => {
      return new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
  };
}
