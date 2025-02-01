const { UniversalFederationPlugin } = require('@module-federation/node');
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  target: 'async-node',
  output: {
    publicPath: 'auto',
    path: path.join(__dirname, 'dist'),
  },
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3002,
    hot: true,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: false,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new UniversalFederationPlugin({
      remoteType: 'script',
      isServer: true,
      name: 'rss',
      useRuntimePlugin: true,
      library: { type: 'commonjs-module' },
      filename: 'remoteEntry.js',
      exposes: {
        './plugin': './src/index.ts',
      },
    }),
  ],
};
