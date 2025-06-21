import { Context, MiddlewareHandler, Next } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";

export function createAuthMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const token = getCookie(c, "token");
    let accountId: string | null = null;

    if (token) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("JWT_SECRET is not set.");
        c.status(500);
        return c.json({ error: "Internal Server Error" });
      }
      try {
        const decodedPayload = await verify(token, secret);
        if (decodedPayload && typeof decodedPayload.sub === "string") {
          accountId = decodedPayload.sub;
        }
      } catch (error) {
        // Invalid token, proceed as anonymous
        console.warn("JWT verification failed:", error);
      }
    }

    c.set("accountId", accountId);
    await next();
  };
}
