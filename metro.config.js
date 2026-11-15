const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Projeto_entrega-main/ is a read-only reference project (own node_modules, Vite sources).
const existing = config.resolver.blockList;
// Match both separators: Metro tests absolute paths, which use backslashes on Windows.
const blocked = /[\\/]Projeto_entrega-main[\\/].*/;
config.resolver.blockList = existing
  ? [].concat(existing, blocked)
  : blocked;

module.exports = config;
