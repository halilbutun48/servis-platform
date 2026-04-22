const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const appRoot = __dirname;
const repoRoot = path.resolve(appRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(appRoot);

config.watchFolders = [
  path.resolve(repoRoot, 'backend'),
  path.resolve(repoRoot, 'web'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(appRoot, 'node_modules'),
  path.resolve(repoRoot, 'backend', 'node_modules'),
  path.resolve(repoRoot, 'web', 'node_modules'),
];

module.exports = config;
