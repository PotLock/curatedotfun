import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";
import path from "path";
import 'dotenv/config'

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
      ...Object.keys(process.env)
        .filter((key) => key.startsWith('PUBLIC_'))
        .reduce((acc, key) => {
          // @ts-expect-error whatever
          acc[`process.env.${key}`] = JSON.stringify(process.env[key]);
          return acc;
        }, {}),
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
        target: "https://staging.curate.press",
        // target: "http://localhost:3000",
        secure: false,
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
