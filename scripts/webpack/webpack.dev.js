'use strict';

const browserslist = require('browserslist');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { EsbuildPlugin } = require('esbuild-loader');
const { resolveToEsbuildTarget } = require('esbuild-plugin-browserslist');
const ESLintPlugin = require('eslint-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const { DefinePlugin, EnvironmentPlugin } = require('webpack');
const WebpackAssetsManifest = require('webpack-assets-manifest');
const { merge } = require('webpack-merge');
const WebpackBar = require('webpackbar');

const getEnvConfig = require('./env-util.js');
const HTMLWebpackCSSChunks = require('./plugins/HTMLWebpackCSSChunks');
const common = require('./webpack.common.js');
const esbuildTargets = resolveToEsbuildTarget(browserslist(), { printUnknownTargets: false });
// esbuild-loader 3.0.0+ requires format to be set to prevent it
// from defaulting to 'iife' which breaks monaco/loader once minified.
const esbuildOptions = {
  target: esbuildTargets,
  format: undefined,
};

const envConfig = getEnvConfig();
module.exports = (env = {}) => {
  return merge(common, {
    devtool: false,
    mode: 'development',

    entry: {
      app: './public/app/index.ts',
      dark: './public/sass/grafana.dark.scss',
      light: './public/sass/grafana.light.scss',
      fn_dashboard: './public/app/fn_dashboard.ts',
      swagger: './public/swagger/index.tsx',
    },

    // If we enabled watch option via CLI
    watchOptions: {
      ignored: /node_modules/,
    },

    module: {
      // Note: order is bottom-to-top and/or right-to-left
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'esbuild-loader',
            options: esbuildOptions,
          },
        },
        require('./sass.rule.js')({
          sourceMap: false,
          preserveUrl: false,
        }),
      ],
    },

    // https://webpack.js.org/guides/build-performance/#output-without-path-info
    output: {
      pathinfo: false,
    },

    // https://webpack.js.org/guides/build-performance/#avoid-extra-optimization-steps
    // optimization: {
    //   moduleIds: 'named',
    //   runtimeChunk: true,
    //   removeAvailableModules: false,
    //   removeEmptyChunks: false,
    //   splitChunks: false,
    // },
    optimization: {
      moduleIds: 'named',
      runtimeChunk: true,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
      minimize: parseInt(env.noMinify, 10) !== 1,
      minimizer: [new EsbuildPlugin(esbuildOptions), new CssMinimizerPlugin()],
    },

    // enable persistent cache for faster cold starts
    cache: {
      type: 'filesystem',
      name: 'grafana-default-development',
      buildDependencies: {
        config: [__filename],
      },
    },

    performance: {
      hints: false,
    },
    parallelism: 2,

    plugins: [
      parseInt(env.noTsCheck, 10)
        ? new DefinePlugin({}) // bogus plugin to satisfy webpack API
        : new ForkTsCheckerWebpackPlugin({
            async: true, // don't block webpack emit
            typescript: {
              mode: 'write-references',
              memoryLimit: 4096,
              diagnosticOptions: {
                semantic: true,
                syntactic: true,
              },
            },
          }),
      new ESLintPlugin({
        cache: true,
        lintDirtyModulesOnly: true, // don't lint on start, only lint changed files
        extensions: ['.ts', '.tsx'],
      }),
      new MiniCssExtractPlugin({
        filename: 'grafana.[name].[contenthash].css',
      }),
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, '../../public/microfrontends/fn_dashboard/index.html'),
        template: path.resolve(__dirname, '../../public/views/index-microfrontend-template.html'),
        inject: false,
        chunksSortMode: 'none',
        excludeChunks: ['dark', 'light', 'app', 'swagger'],
      }),
      new HTMLWebpackCSSChunks(),
      new WebpackAssetsManifest({
        entrypoints: true,
        integrity: true,
        publicPath: true,
      }),
      new WebpackBar({
        color: '#eb7b18',
        name: 'Grafana',
      }),
      new EnvironmentPlugin(envConfig),
      new DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('development'),
          SHOULD_LOG: JSON.stringify(process.env.SHOULD_LOG),
        },
      }),
    ],
  });
};
