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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers":
          "Origin, X-Requested-With, Content-Type, Accept",
        "Cache-Control": "public, max-age=31536000",
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

  // Handle font files (both paths for compatibility)
  staticRoutes.get("/fonts/*", async (c) => {
    const filename = c.req.path.replace("/fonts/", "");
    let mimeType = "application/octet-stream";

    if (filename.endsWith(".ttf")) mimeType = "font/ttf";
    else if (filename.endsWith(".woff")) mimeType = "font/woff";
    else if (filename.endsWith(".woff2")) mimeType = "font/woff2";
    else if (filename.endsWith(".eot"))
      mimeType = "application/vnd.ms-fontobject";
    else if (filename.endsWith(".otf")) mimeType = "font/otf";

    return serveFileWithMimeType(
      path.join(publicDir, "fonts"),
      filename,
      mimeType,
      c,
    );
  });

  staticRoutes.get("/assets/fonts/*", async (c) => {
    const filename = c.req.path.replace("/assets/fonts/", "");
    let mimeType = "application/octet-stream";

    if (filename.endsWith(".ttf")) mimeType = "font/ttf";
    else if (filename.endsWith(".woff")) mimeType = "font/woff";
    else if (filename.endsWith(".woff2")) mimeType = "font/woff2";
    else if (filename.endsWith(".eot"))
      mimeType = "application/vnd.ms-fontobject";
    else if (filename.endsWith(".otf")) mimeType = "font/otf";

    return serveFileWithMimeType(
      path.join(publicDir, "assets/fonts"),
      filename,
      mimeType,
      c,
    );
  });

  // Handle image files (both paths for compatibility)
  staticRoutes.get("/images/*", async (c) => {
    const filename = c.req.path.replace("/images/", "");
    let mimeType = "application/octet-stream";

    if (filename.endsWith(".png")) mimeType = "image/png";
    else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))
      mimeType = "image/jpeg";
    else if (filename.endsWith(".gif")) mimeType = "image/gif";
    else if (filename.endsWith(".svg")) mimeType = "image/svg+xml";
    else if (filename.endsWith(".ico")) mimeType = "image/x-icon";

    return serveFileWithMimeType(
      path.join(publicDir, "images"),
      filename,
      mimeType,
      c,
    );
  });

  staticRoutes.get("/assets/images/*", async (c) => {
    const filename = c.req.path.replace("/assets/images/", "");
    let mimeType = "application/octet-stream";

    if (filename.endsWith(".png")) mimeType = "image/png";
    else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))
      mimeType = "image/jpeg";
    else if (filename.endsWith(".gif")) mimeType = "image/gif";
    else if (filename.endsWith(".svg")) mimeType = "image/svg+xml";
    else if (filename.endsWith(".ico")) mimeType = "image/x-icon";

    return serveFileWithMimeType(
      path.join(publicDir, "assets/images"),
      filename,
      mimeType,
      c,
    );
  });

  // Handle icon files
  staticRoutes.get("/icons/*", async (c) => {
    const filename = c.req.path.replace("/icons/", "");
    let mimeType = "image/svg+xml"; // Default for icons

    if (filename.endsWith(".png")) mimeType = "image/png";
    else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))
      mimeType = "image/jpeg";
    else if (filename.endsWith(".ico")) mimeType = "image/x-icon";

    return serveFileWithMimeType(
      path.join(publicDir, "icons"),
      filename,
      mimeType,
      c,
    );
  });

  // Handle root-level files (favicon, etc.)
  staticRoutes.get("/:filename{.+\\..+}", async (c) => {
    const filename = c.req.param("filename");
    let mimeType = "application/octet-stream";

    if (filename.endsWith(".ico")) mimeType = "image/x-icon";
    else if (filename.endsWith(".png")) mimeType = "image/png";
    else if (filename.endsWith(".svg")) mimeType = "image/svg+xml";
    else if (filename.endsWith(".webmanifest"))
      mimeType = "application/manifest+json";

    return serveFileWithMimeType(publicDir, filename, mimeType, c);
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
