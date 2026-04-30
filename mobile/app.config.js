const baseConfig = require('./app.json').expo;
const withLocalEmulatorNetworkSecurity = require('./plugins/withLocalEmulatorNetworkSecurity');

module.exports = () => {
  const releaseStage = String(process.env.EXPO_PUBLIC_RELEASE_STAGE || baseConfig?.extra?.releaseStage || '').trim().toLowerCase();
  const isLocalEmulator = releaseStage === 'local-emulator';
  const plugins = Array.isArray(baseConfig.plugins) ? [...baseConfig.plugins] : [];

  if (isLocalEmulator) {
    plugins.push(withLocalEmulatorNetworkSecurity);
  }

  return {
    ...baseConfig,
    android: {
      ...baseConfig.android,
      usesCleartextTraffic: isLocalEmulator,
    },
    plugins,
  };
};
