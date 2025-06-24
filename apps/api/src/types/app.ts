import type { ServiceProvider } from "@curatedotfun/core-services";
import { Hono } from "hono";
import { db } from "../db";

export type Env = {
  Variables: {
    db: typeof db;
    sp: ServiceProvider;
    accountId?: string | null;
  };
};

export interface AppInstance {
  app: Hono<Env>;
}
