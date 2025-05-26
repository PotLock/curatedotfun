import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import { ServiceProvider } from "../utils/service-provider";
import { DB } from "@curatedotfun/shared-db";

export type Env = {
  Variables: {
    db: DB;
    sp: ServiceProvider;
  } & JwtVariables;
};

export interface AppInstance {
  app: Hono<Env>;
}
