#!/usr/bin/env node

const util = require("util");

// Verify user has minimum required version of node installed
const minMajorVersion = 10;
const minMinorVersion = 0;

function getCurrentVersion() {
  const matches = process.version.match(/v?(\d+)\.(\d+)\.(\d+)/);
  return [+matches[1], +matches[2]];
}

function ensureNodeVersion() {
  const currentVersion = getCurrentVersion();
  const major = currentVersion[0];
  const minor = currentVersion[1];
  if (major > minMajorVersion) {
    return true;
  }
  if (major === minMajorVersion && minor >= minMinorVersion) {
    return true;
  }

  console.log(`appcenter command requires at least node version ${minMajorVersion}.${minMinorVersion}.0.`);
  console.log(`You are currently running version ${process.version}.`);
  console.log(`Please upgrade your version of node.js to at least ${minMajorVersion}.${minMinorVersion}.0`);
  return false;
}

function runCli() {
  const path = require("path");
  const commandLine = require("../dist/util/commandline");

  const runner = commandLine.runner(path.join(__dirname, "..", "dist", "commands"));
  const args = process.argv.slice(2);

  if (args.indexOf("--quiet") === -1) {
    const updateNotifier = require("update-notifier");
    // eslint-disable-next-line security/detect-non-literal-require
    const pkg = require(path.join(__dirname, "..", "package.json"));

    const notifier = updateNotifier({ pkg });
    notifier.notify();
  }

  runner(args).then(function (result) {
    if (commandLine.failed(result)) {
      const chalk = require("chalk");
      console.log(`${chalk.bold.red("Error:")} ${result.errorMessage}`);
      process.exit(result.errorCode);
    }
  });
}

if (ensureNodeVersion()) {
  const commandLine = require("../dist/util/commandline");
  commandLine.executeAutoComplete(); // if it is an autocomplete run, then it exits here
  runCli();
} else {
  process.exit(1);
}
