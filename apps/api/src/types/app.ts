import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import { ServiceProvider } from "../utils/service-provider";
import { db } from "../db";

export type Env = {
  Variables: {
    db: typeof db;
    sp: ServiceProvider;
  } & JwtVariables;
};

export interface AppInstance {
  app: Hono<Env>;
}
