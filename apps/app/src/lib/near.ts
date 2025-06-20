import { NETWORK_ID } from "@/config";
import * as FastIntear from "fastintear";

export const near: typeof FastIntear =
  typeof window !== "undefined"
    ? window.near // in browser
    : FastIntear && FastIntear.config({ networkId: NETWORK_ID }) && FastIntear; // on server
