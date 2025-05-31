import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";
import path from "path";

const getProxyTarget = () => {
  switch (process.env.NODE_ENV) {
    case "production":
      return "https://app.curate.fun";
    case "staging":
      return "https://curatedotfun-staging-31fe.up.railway.app";
    default: // development
      return "http://localhost:3000";
  }
};

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginNodePolyfill({
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  html: {
    template: "./index.html",
  },
  source: {
    alias: {
      "@fonts": path.resolve(__dirname, "public/fonts"),
    },
    define: {
      "import.meta.env.PUBLIC_WEB3_CLIENT_ID": JSON.stringify(
        "BGv7EZrPFf601UlYbS5DH40oIUQyEghhP5hOrheXU9m7cz5BcXkEDfY4KIg_fOu0m336UzTRca08Ic4y-wzqoPs",
      ),
      "import.meta.env.PUBLIC_NETWORK": JSON.stringify("testnet"),
    },
  },
  output: {
    assetPrefix: "/",
  },
  tools: {
    rspack: {
      plugins: [TanStackRouterRspack()],
      module: {
        rules: [
          {
            test: /\.(woff|woff2|eot|ttf|otf)$/i,
            type: "asset/resource",
            generator: {
              filename: "fonts/[name][ext]",
            },
          },
          {
            test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
            type: "asset/resource",
            generator: {
              filename: "images/[name][ext]",
            },
          },
        ],
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: getProxyTarget(),
        secure: process.env.NODE_ENV !== "development", // secure should be true for https (prod/staging)
        changeOrigin: true,
        ws: true,
      },
    },
  },
  dev: {
    assetPrefix: "/",
    writeToDisk: true,
  },
});
