require("dotenv").config();
const path = require("path");
const { rspack } = require("@rspack/core");

const isProduction = process.env.NODE_ENV === "production";
console.log("isProduction", isProduction);
console.log("env", process.env.NODE_ENV);

module.exports = {
  entry: "./src/index",
  mode: isProduction ? "production" : "development",
  target: "async-node",
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  externals: {
    "@libsql/client": "commonjs @libsql/client",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "builtin:swc-loader",
        exclude: /node_modules/,
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new rspack.CopyRspackPlugin({
      patterns: [
        {
          from: "../frontend/dist",
          to: "public",
          noErrorOnMissing: true // Don't error in development when dist doesn't exist
        }
      ]
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
  ],
};
