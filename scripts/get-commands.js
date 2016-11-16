//
// Helper script to gather top-level help on the currently installed commands
// so we can put it in the docs.
//
// Reads from the dist directory, so be sure to build before running this script.
//

'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const util = require('util');

const decorators = require('../dist/util/commandline/option-decorators');

function checkStats(dir, fileName, checker) {
  try {
    let s = fs.statSync(path.join(dir, fileName));
    return checker(s);
  }
  catch (err) {
    return false;
  }
}

function isFile(dir, fileName) {
  return checkStats(dir, fileName, s => s.isFile());
}

function isDir(dir, fileName) {
  return checkStats(dir, fileName, s => s.isDirectory());
}

function getHelpForCommandClass(command) {
  return decorators.getClassHelpText(command);
}

function getHelpForDir(dir, category = [], result = []) {
  let files = fs.readdirSync(dir);
  let [commands, categories] = _.partition(files, f => isFile(dir, f));
  commands.forEach(cmdName => {
    let parsed = path.parse(cmdName);
    if (parsed.ext === '.js') {
      let cmdClass = require(path.join(dir, cmdName)).default;
      let name = parsed.name;
      let help = getHelpForCommandClass(cmdClass);
      result.push({name, category, help});
    }
  });

  _(categories)
    .filter(n => n !== 'lib')
    .forEach(dirName => getHelpForDir(path.join(dir, dirName), category.concat([dirName]), result));
  return result;
}

function formatCommandInfo(info) {
  const name = _.flattenDeep([ 'mobile-center', info.category, info.name]).join(' ');
  return `| \`${name}\` | ${info.help} |`;
}

const commandInfos = getHelpForDir(path.join(__dirname, '../dist/commands'));
commandInfos.map(formatCommandInfo).forEach(s => console.log(s));