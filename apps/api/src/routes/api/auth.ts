import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AuthService } from "../../services/auth.service";
import { Env } from "../../types/app";
import { setCookie } from "hono/cookie";

export const authRoutes = new Hono<Env>();

const CreateAuthRequestSchema = z.object({
  accountId: z.string(),
});

const VerifyAuthRequestSchema = z.object({
  token: z.string(),
  accountId: z.string(),
});

authRoutes.post(
  "/initiate-login",
  zValidator("json", CreateAuthRequestSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const sp = c.var.sp;
    const authService = sp.getService<AuthService>("authService");
    const result = await authService.createAuthRequest(payload);
    return c.json(result);
  },
);

authRoutes.post(
  "/verify-login",
  zValidator("json", VerifyAuthRequestSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const sp = c.var.sp;
    const authService = sp.getService<AuthService>("authService");
    try {
      const { jwt } = await authService.verifyAuthRequest(payload);
      setCookie(c, "token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return c.json({ success: true });
    } catch (error: unknown) {
      c.status(401);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      });
    }
  },
);

authRoutes.post("/logout", async (c) => {
  setCookie(c, "token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/",
    maxAge: 0,
  });
  return c.json({ success: true });
});
