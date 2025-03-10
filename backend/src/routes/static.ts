import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "fs/promises";
import { Context, Hono } from "hono";
import path from "path";
import { logger } from "../utils/logger";

/**
 * Serve files with specific MIME type
 */
async function serveFileWithMimeType(
  basePath: string,
  filePath: string,
  mimeType: string,
  c: Context,
) {
  // Prevent path traversal attacks by checking for ".." in the path
  if (filePath.includes("..") || !filePath) {
    logger.warn(`Potential path traversal attempt: ${filePath}`);
    return c.notFound();
  }
  const fullPath = path.join(basePath, filePath);

  try {
    const content = await readFile(fullPath);
    return c.newResponse(content, {
      headers: {
        "Content-Type": mimeType,
      },
    });
  } catch (error) {
    logger.error(`Error serving file ${fullPath}: ${error}`);
    return c.notFound();
  }
}

/**
 * Router for static file serving
 */
export const staticRoutes = new Hono();

/**
 * Configure static file serving for production
 * @param publicDir Path to the public directory containing static files
 */
export function configureStaticRoutes(publicDir: string) {
  const staticOptions = { root: publicDir };

  // Handle JS files
  staticRoutes.get("/static/js/*", async (c) => {
    const filename = c.req.path.replace("/static/js/", "");

    return serveFileWithMimeType(
      path.join(publicDir, "static/js"),
      filename,
      "application/javascript",
      c,
    );
  });

  // Handle CSS files
  staticRoutes.get("/static/css/*", async (c) => {
    const filename = c.req.path.replace("/static/css/", "");

    return serveFileWithMimeType(
      path.join(publicDir, "static/css"),
      filename,
      "text/css",
      c,
    );
  });

  // Serve other static files
  staticRoutes.use("/static/*", serveStatic(staticOptions));
  staticRoutes.use("/assets/*", serveStatic(staticOptions));

  // For all other routes, serve the index.html file (SPA routing)
  staticRoutes.get("*", async (c) => {
    try {
      const filePath = path.join(publicDir, "index.html");
      const content = await readFile(filePath, "utf-8");
      return c.html(content);
    } catch (error) {
      logger.error(`Failed to read index.html: ${error}`);
      return c.text("Failed to load application", 500);
    }
  });
}
