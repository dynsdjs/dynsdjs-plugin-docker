const path = require('path'),
      webpack = require('webpack')

module.exports = {
  entry: './src/',
  target: 'node',
  node: {
    __dirname: false,
    __filename: false,
  },
  stats: {
    warnings: false
  },
  resolve: {
    extensions: [ '.js' ]
  },
  output: {
    path: path.resolve( __dirname, 'dist' ),
    filename: 'DynsdDocker.js',
    library: 'DynsdDocker',
    libraryTarget: "umd2"
  },
  plugins: [],
  module: {
    rules: [
      {
        test: /index\.js$/,
        loader: 'shebang-loader',
        include: [
          /node_modules\/JSONStream/
        ]
      }
    ]
  }
};
