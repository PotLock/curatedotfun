import { JwtVariables } from "hono/jwt";
import { Hono } from "hono";

export type Env = {
  Variables: {
    db: ReturnType<typeof import("../services/db").getDatabase>; // TODO: better return type?
  } & JwtVariables;
};

export interface AppInstance {
  app: Hono<Env>;
}
