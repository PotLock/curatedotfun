const { UniversalFederationPlugin } = require('@module-federation/node');

/** @type {import('@rspack/core').Configuration} */
const config = {
  target: 'async-node',
  entry: {
    main: './src/index.ts',
  },
  output: {
    publicPath: 'http://localhost:3001/',
    library: { type: 'commonjs-module' },
  },
  devServer: {
    port: 3001,
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new UniversalFederationPlugin({
      remoteType: 'script',
      isServer: true,
      name: 'host',
      library: { type: 'commonjs-module' },
      filename: 'remoteEntry.js',
      shared: {},
      useRuntimePlugin: true,
      remotes: {
        '@curatedotfun/distributor-rss': 'rss@http://localhost:3002/remoteEntry.js',
      }
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  }
};

module.exports = config;
