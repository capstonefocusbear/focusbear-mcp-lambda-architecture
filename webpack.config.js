const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

module.exports = (options) => ({
  ...options,
  devtool: "hidden-source-map",
  plugins: [
    ...(options.plugins || []),
    sentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "focus-bear",
      project: "backend",
    }),
  ],
});
