import { defineConfig, rspack } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/rspack";
import "dotenv/config";
import path from "path";

const network = process.env.PUBLIC_NETWORK || "testnet";

const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: "./index.html",
    templateParameters: {
      // near
      networkId: isProduction ? "mainnet" : network,
      fastintear:
        isProduction || isStaging
          ? "https://unpkg.com/fastintear@latest/dist/umd/browser.global.js"
          : "/js/fastintear.js",
    },
  },
  source: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@fonts": path.resolve(__dirname, "public/fonts"),
    },
    define: {
      "process.env": {
        ...Object.keys(process.env)
          .filter((key) => key.startsWith("PUBLIC_"))
          .reduce((acc, key) => {
            // @ts-expect-error whatever
            acc[key] = JSON.stringify(process.env[key]);
            return acc;
          }, {}),
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    },
  },
  output: {
    assetPrefix: "/",
  },
  tools: {
    rspack: {
      plugins: [
        tanstackRouter({
          routesDirectory: "./src/routes",
          enableRouteGeneration: true,
        }),
        ...(isProduction || isStaging
          ? []
          : [
              new rspack.CopyRspackPlugin({
                patterns: [
                  {
                    from: path.resolve(
                      __dirname,
                      "node_modules/fastintear/dist/umd/browser.global.js",
                    ),
                    to: "js/fastintear.js",
                  },
                ],
              }),
            ]),
      ],
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
        // target: "https://staging.curate.press",
        target: "http://localhost:3000",
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
