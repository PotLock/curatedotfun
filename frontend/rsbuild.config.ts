import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";

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
        ],
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        secure: false,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  dev: {
    writeToDisk: true,
  },
});
