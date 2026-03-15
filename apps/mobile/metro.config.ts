// apps/mobile/metro.config.js

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to follow symlinks to the workspace root
config.watchFolders = [workspaceRoot];

// Ensure modules are resolved from workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
