require("dotenv").config();
const path = require("path");
const { rspack } = require("@rspack/core");

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  entry: "./src/index.ts",
  mode: isProduction ? "production" : "development",
  target: "async-node",
  devtool: isProduction ? false : "source-map",
  watch: !isProduction,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.cjs",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "builtin:swc-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    new rspack.IgnorePlugin({
      resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
    }),
  ].filter(Boolean),
};
