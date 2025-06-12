import { Hono } from "hono";
import { db } from "../db";
import { ServiceProvider } from "../utils/service-provider";

export type Env = {
  Variables: {
    db: typeof db;
    sp: ServiceProvider;
    accountId?: string;
  };
};

export interface AppInstance {
  app: Hono<Env>;
}
