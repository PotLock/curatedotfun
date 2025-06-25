require("dotenv").config();
const path = require("path");
const { rspack } = require("@rspack/core");

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  entry: "./src/index",
  mode: isProduction ? "production" : "development",
  target: "async-node",
  devtool: isProduction ? false : "source-map",
  watch: !isProduction,
  externals: {
    bufferutil: "commonjs bufferutil",
    "pg-native": "commonjs pg-native",
    "@roamhq/wrtc": "commonjs @roamhq/wrtc",
    "utf-8-validate": "commonjs utf-8-validate",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.cjs",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "builtin:swc-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.md$/,
        type: "asset/source",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    new rspack.IgnorePlugin({
      resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
    }),
    //   new rspack.container.ModuleFederationPlugin({
    //     name: "host",
    //     runtimePlugins: [
    //       require.resolve("@module-federation/node/runtimePlugin"),
    //     ],
    //     shared: {
    //       "@curatedotfun/types": {
    //         singleton: true,
    //         eager: true
    //       },
    //     }
    //   })
  ].filter(Boolean),
};
