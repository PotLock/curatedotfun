if (typeof window.near === "undefined") {
  console.error("need to install fastintear");
}

export const near = window.near;

near.config({ networkId: "mainnet" });
