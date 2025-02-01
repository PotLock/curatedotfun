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
      useRuntimePlugin: true,
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  }
};

module.exports = config;
