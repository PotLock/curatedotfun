import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import * as schema from "../services/db/schema";

export type Env = {
  Variables: {
    db: ReturnType<typeof import("../services/db").getDatabase>; // TODO: better return type?
  } & JwtVariables;
};

export interface AppInstance {
  app: Hono<Env>;
}