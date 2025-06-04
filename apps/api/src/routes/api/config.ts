import { Hono } from "hono";
import { Env } from "types/app";

const configRoutes = new Hono<Env>();

export { configRoutes };
