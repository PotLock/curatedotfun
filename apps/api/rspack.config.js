require("dotenv").config();
const path = require("path");
const { rspack } = require("@rspack/core");

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  entry: "./src/index",
  mode: isProduction ? "production" : "development",
  target: "async-node",
  devtool: "source-map",
  watch: !isProduction,
  externals: {
    bufferutil: "commonjs bufferutil",
    "pg-native": "commonjs pg-native",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
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
      services: path.resolve(__dirname, "src/services"),
      utils: path.resolve(__dirname, "src/utils"),
      types: path.resolve(__dirname, "src/types"),
      routes: path.resolve(__dirname, "src/routes"),
      validation: path.resolve(__dirname, "src/validation"),
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
