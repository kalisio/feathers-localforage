const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');

function createConfig (lib, dist, name, isProduction = false) {
  const output = name === 'index' ? 'feathersjs-offline' : 'feathersjs-offline-' + name;
  const entry = 'index';
  const commons = {
    entry: `${lib}/${entry}.js`,
    resolve: {
      fallback: {
        "util": false,
        "fs": false,
        "assert": false,
        "stream": false,
        "constants": false,
        "path": false
      }
    },
    output: {
      library: `feathersjsOffline${name.substr(0,1).toUpperCase()}${name.substr(1)}`,
      libraryTarget: 'var', // 'umd',
      globalObject: 'this',
      path: `${dist}`,
      filename: `${output}.js`
    },
    module: {
      rules: [{
        test: /\.js/,
        exclude: /node_modules\/(?!(@feathersjs|debug))/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }]
    }
  };

  const dev = {
    mode: 'development',
    devtool: 'source-map'
  };

  const production = {
    mode: 'production',
    output: {
      filename: `${output}.min.js`
    },
    optimization: {
      minimize: true,
      }
  };

  return merge(commons, isProduction ? production : dev);
}

module.exports = (env) => {
  let lib = path.resolve(env.home, 'src') || path.resolve(__dirname, 'src');
  let dist = env.dist || path.resolve(__dirname, 'dist')
  return [
    createConfig(lib, dist, 'localforage'),
    createConfig(lib, dist, 'localforage', true),
  ];
}
