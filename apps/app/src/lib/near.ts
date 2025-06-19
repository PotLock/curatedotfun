import * as FastIntear from "fastintear";

export const near: typeof FastIntear =
  typeof window !== "undefined"
    ? window.near // in browser
    : FastIntear; // on server
