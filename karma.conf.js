var webpack = require('webpack');

module.exports = function (config) {
  config.set({
    browsers: ['PhantomJS'],
    singleRun: true,
    frameworks: ['tap'],
    files: [
      'webpack/tests.config.js',
    ],
    preprocessors: {
      'webpack/tests.config.js': ['webpack', 'sourcemap']
    },
    reporters: ['dots', 'coverage'],
    coverageReporter: {
      dir: "coverage",
      reporters: [
        {type: "text"},
        {type: "lcov", subdir: "lcov"}
      ]
    },
    webpack: {
      module: {
        preLoaders: [
          {
            test: /\.js$/,
            exclude: [
              __dirname + "/tests",
              /node_modules/
            ],
            loader: 'babel'
          },
          {
            test: /\.js$/,
            include: __dirname + "/src",
            loader: 'isparta'
          }
        ],
        loaders: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel'
          }
        ]
      },
      watch: true,
      resolve: {
        extensions: ["", ".js"]
      },
      devtool: 'inline-source-map',
      node: {
        fs: 'empty'
      }
    },
    webpackServer: {
      noInfo: true
    }
  });
};
