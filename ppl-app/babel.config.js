module.exports = function (api) {
  api.cache(true)
  const isProd = process.env.BABEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  return {
    presets: ['babel-preset-expo'],
    plugins: isProd
      // Strip console.* calls (except .error / .warn) from release builds.
      // Keeps logs visible in dev for debugging.
      ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
      : [],
  }
}