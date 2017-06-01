#!/usr/bin/env node

var util = require('util');

// Verify user has minimum required version of node installed
var minMajorVersion = 6;
var minMinorVersion = 3;

function getCurrentVersion() {
  var matches = process.version.match(/v?(\d+)\.(\d+)\.(\d+)/);
  return [+matches[1], +matches[2]];
}

function ensureNodeVersion() {
  var currentVersion = getCurrentVersion();
  var major = currentVersion[0];
  var minor = currentVersion[1];
  if (major > minMajorVersion) {
    return true;
  }
  if (major == minMajorVersion && minor >= minMinorVersion) {
    return true;
  }

  console.log(`mobile-center command requires at least node version ${minMajorVersion}.${minMinorVersion}.0.`);
  console.log(`You are currently running version ${process.version}.`);
  console.log(`Please upgrade your version of node.js to at least ${minMajorVersion}.${minMinorVersion}.0`);
  return false;
}

function runCli() {
  var path = require('path');
  var commandLine = require('../dist/util/commandline');

  var runner = commandLine.runner(path.join(__dirname, '..', 'dist', 'commands'));
  runner(process.argv.slice(2))
    .then(function (result) {
      if (commandLine.failed(result)) {
        console.log(`Command failed: ${result.errorMessage}`);
        process.exit(result.errorCode);
      }
    });
}

if (ensureNodeVersion()) {
  var commandLine = require('../dist/util/commandline');
  commandLine.executeAutoComplete();   // if it is an autocomplete run, then it exits here
  runCli();
} else {
  process.exit(1);
}
