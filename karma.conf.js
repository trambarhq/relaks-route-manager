var Path = require('path');

module.exports = function(config) {
  config.set({
    port: 9876,
    colors: true,
    logLevel: config.LOG_WARNING,
    autoWatch: true,
    singleRun: false,
    browsers: [ 'Chrome' ],
    frameworks: [ 'chai', 'mocha' ],
    files: [
      'tests.bundle.js',
    ],

    preprocessors: {
      'tests.bundle.js': [ 'webpack', 'sourcemap' ]
    },

    plugins: [
      'karma-chai',
      'karma-chrome-launcher',
      'karma-mocha',
      'karma-sourcemap-loader',
      'karma-webpack',
      'karma-spec-reporter',
    ],

    reporters: [ 'spec' ],

    webpack: {
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.(jsx?|mjs)$/,
            loader: 'babel-loader',
            exclude: Path.resolve('./node_modules'),
            query: {
              presets: [
                '@babel/env',
              ],
              plugins: [
                '@babel/transform-runtime',
              ]
            }
          }
        ]
      },
      resolve: {
        extensions: [ '.mjs', '.js', '.jsx' ],
        modules: [ 'node_modules' ].map((folder) => {
          return Path.resolve(`./${folder}`);
        })
      },
      externals: {
      }
    },

    webpackMiddleware: {
      noInfo: true,
    },
  })
};
