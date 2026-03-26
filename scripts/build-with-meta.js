const { spawnSync } = require('child_process');
const path = require('path');
const pkg = require('../package.json');

const buildTime = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
const env = {
  ...process.env,
  REACT_APP_BUILD_TIME: buildTime,
  REACT_APP_BUILD_VERSION: pkg.version,
};

const reactScriptsBin = path.join(__dirname, '..', 'node_modules', '.bin', 'react-scripts');
const result = spawnSync(reactScriptsBin, ['build'], {
  stdio: 'inherit',
  env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
