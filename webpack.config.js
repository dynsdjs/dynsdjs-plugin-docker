const path = require('path'),
      webpack = require('webpack'),
      package = require('./package.json')
      MinifyPlugin = require('babel-minify-webpack-plugin'),
      WebpackSourceMapSupport = require('webpack-source-map-support')

module.exports = function( env ) {
  const filename = package.main.replace( 'dist/', '' ),
        libraryName = filename.replace( '.js', '' )

  let config = {
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
      path: path.resolve(__dirname, 'dist'),
      filename: filename,
      library: libraryName,
      libraryTarget: 'umd2'
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
  }

  if ( !env ) {
    // ---- DEV ----
    config.devtool = 'inline-source-map'

    Array.prototype.push.apply(
      config.plugins,
      [
        new WebpackSourceMapSupport()
      ]
    )
  } else {
    // ---- PROD ----
    Array.prototype.push.apply(
      config.plugins,
      [
        new webpack.LoaderOptionsPlugin({
          minimize: true,
          debug: false
        }),
        new MinifyPlugin({
          mangle: false
        }, {
          comments: false,
          sourceMap: false
        })
      ]
    )
  }

  return config
}