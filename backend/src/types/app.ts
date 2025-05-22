import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import { DB } from "../services/db/types";
import { ServiceProvider } from "../utils/service-provider";

export type Env = {
  Variables: {
    db: DB;
    sp: ServiceProvider;
  } & JwtVariables;
};

export interface AppInstance {
  app: Hono<Env>;
}
