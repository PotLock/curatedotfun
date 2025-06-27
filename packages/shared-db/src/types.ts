import { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];
