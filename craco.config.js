const path = require('path')

const webpack = require('webpack');

module.exports = {
  reactScriptsVersion: 'react-scripts',
  style: {
    sass: {
      loaderOptions: {
        sassOptions: {
          includePaths: ['node_modules', 'src/assets']
        }
      }
    },
    postcss: {
      plugins: [require('postcss-rtl')()]
    }
  },
  eslint: {
    enable: false // Disable ESLint during build
  },
  webpack: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/@core/assets'),
      '@constant': path.resolve(__dirname, 'src/constants'),
      '@components': path.resolve(__dirname, 'src/@core/components'),
      '@layouts': path.resolve(__dirname, 'src/@core/layouts'),
      '@store': path.resolve(__dirname, 'src/redux'),
      '@styles': path.resolve(__dirname, 'src/@core/scss'),
      '@configs': path.resolve(__dirname, 'src/configs'),
      '@utils': path.resolve(__dirname, 'src/utility/Utils'),
      '@hooks': path.resolve(__dirname, 'src/utility/hooks')
    },
    configure: (webpackConfig, { env, paths }) => {
      // Add polyfill fallbacks
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        path: require.resolve("path-browserify"),
        stream: require.resolve("stream-browserify"),
        crypto: require.resolve("crypto-browserify"),
        buffer: require.resolve("buffer/"),
        process: require.resolve("process/browser.js"),
        util: require.resolve("util/"),
        assert: require.resolve("assert/"),
        fs: false,
        os: require.resolve("os-browserify/browser"),
        vm: require('path').resolve(__dirname, 'src/empty-module.js')
      };

      // Add plugins
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          process: 'process/browser.js',
          Buffer: ['buffer', 'Buffer']
        })
      ];

      // Disable ESLint WebpackPlugin
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );

      // Disable optimization in development for faster builds
      if (env === 'development') {
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
        };
      } else {
        // Production: split JS chunks but don't aggressively split CSS
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            minSize: 20000,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            cacheGroups: {
              defaultVendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                reuseExistingChunk: true
              },
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true
              }
            }
          }
        };

        // Ignore CSS chunk ordering warnings
        const MiniCssExtractPlugin = webpackConfig.plugins.find(
          (plugin) => plugin.constructor.name === 'MiniCssExtractPlugin'
        );
        if (MiniCssExtractPlugin) {
          MiniCssExtractPlugin.options.ignoreOrder = true;
        }
      }
      return webpackConfig;
    }
  },
  devServer: {
    hot: true,
    port: process.env.PORT || 3000,
    historyApiFallback: true,
    allowedHosts: 'all',
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    }
  }
}
