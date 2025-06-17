const { getDefaultConfig } = require('@expo/metro-config');
const config = getDefaultConfig(__dirname);

// Agregar soporte para archivos .cjs
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
