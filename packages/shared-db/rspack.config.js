require("dotenv").config();
const path = require("path");
const { rspack } = require("@rspack/core");

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  entry: "./src/index.ts",
  mode: isProduction ? "production" : "development",
  target: "async-node",
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    library: {
      type: "commonjs2",
    },
    clean: true,
  },
  externals: {
    "drizzle-orm": "commonjs drizzle-orm",
    postgres: "commonjs postgres",
    zod: "commonjs zod",
    "async-retry": "commonjs async-retry",
    "drizzle-zod": "commonjs drizzle-zod",
    "pg-native": "commonjs pg-native",
    bufferutil: "commonjs bufferutil",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "builtin:swc-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new rspack.IgnorePlugin({
      resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
    }),
  ],
};
