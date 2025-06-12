import type * as FastIntear from "fastintear";

declare global {
  interface Window {
    near: typeof FastIntear;
    $$: typeof FastIntear.utils.convertUnit;
  }
}
