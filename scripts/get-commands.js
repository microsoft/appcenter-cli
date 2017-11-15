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

const { getClassHelpText } = require('../dist/util/commandline/option-decorators');

const trimRe = /^\s*(.*?)\s*$/;
function trim(s) {
  return s.match(trimRe)[1];
}

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

function loadCommand(dir, cmdFileName) {
  return require(path.join(dir, cmdFileName)).default;
}

function loadCommandHelp(dir, cmdFileName) {
  let helpText = getClassHelpText(loadCommand(dir, cmdFileName));
  helpText = trim(helpText.split('\n')[0]);
  if (helpText[helpText.length -1] === '.') {
    helpText = helpText.slice(0, -1);
  }
  return helpText;
}

function getHelpForDir(dir, category = []) {
  const files = fs.readdirSync(dir);
  const [commands, categories] = _.partition(files, f => isFile(dir, f));
  const thisDirCommands = commands
    .filter(cmdName => path.extname(cmdName) === '.js')
    .map(cmdName => ({
      name: path.parse(cmdName).name,
      category,
      help: loadCommandHelp(dir, cmdName)
    }));

  const subCategoryCommands = categories
    .filter(dirName => dirName !== 'lib')
    .map(dirName => getHelpForDir(path.join(dir, dirName), category.concat([dirName])));

  return _.flattenDeep([thisDirCommands, subCategoryCommands]);
}

function formatCommandInfo(info) {
  if (info.name) {
    const name = _.flattenDeep([ 'appcenter', info.category, info.name]).join(' ');
    return `| \`${name}\` | ${info.help} |`;
  }
  return '| | |';
}

function addSpacers(total, current) {
  if (total.length === 0) {
    return [ current ];
  }
  const prevCategory = total[total.length - 1].category[0];
  if (current.category[0] !== prevCategory) {
    total = total.concat({ name: '', category: '', help: '' });
  }
  return total.concat(current);
}

const commandInfos = getHelpForDir(path.join(__dirname, '../dist/commands'));
commandInfos.reduce(addSpacers, []).map(formatCommandInfo).forEach(s => console.log(s));
