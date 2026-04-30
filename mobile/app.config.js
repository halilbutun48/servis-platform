const baseConfig = require('./app.json').expo;

module.exports = () => {
  const releaseStage = String(process.env.EXPO_PUBLIC_RELEASE_STAGE || baseConfig?.extra?.releaseStage || '').trim().toLowerCase();
  const isLocalEmulator = releaseStage === 'local-emulator';

  return {
    ...baseConfig,
    android: {
      ...baseConfig.android,
      usesCleartextTraffic: isLocalEmulator,
    },
  };
};
