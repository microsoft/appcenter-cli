#!/usr/bin/env node

const path = require('path');
const commandLine = require('../dist/util/commandline');

const runner = commandLine.runner(path.join(__dirname, '..', 'dist', 'commands'));
runner(process.argv.slice(2))
  .then((result) => {
    if (commandLine.failed(result)) {
      console.log(`Command failed, ${result.errorMessage}`);
      process.exit(result.errorCode);
    }
  });
