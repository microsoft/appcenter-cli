//
// Helper script to gather all help on all currently installed commands.
//
// Reads from dist directory, so be sure to build before running this target
//

'use strict'

const _ = require('lodash')
const fs = require('fs')
const os = require('os')
const path = require('path')
const util = require('util')
const Table = require('cli-table3')
const { getClassHelpText, getOptionsDescription, getPositionalOptionsDescription } = require('../dist/util/commandline/option-decorators')
const { getOptionsForTwoColumnTableWithNoBorders } = require('../dist/util/interaction/out')
function checkStats(dir, fileName, checker) {
  try {
    let s = fs.statSync(path.join(dir, fileName))
    return checker(s)
  }
  catch (err) {
    return false
  }
}

function isFile(dir, fileName) {
  return checkStats(dir, fileName, s => s.isFile())
}

function getCommands(rootDirName, parentCategory, currentDirName) {
  const thisCategory = categoryInfo(rootDirName, parentCategory, currentDirName)

  let files = fs.readdirSync(currentDirName)
  const [commands, categories] = _.partition(files, n => isFile(currentDirName, n))
  const thisCategoryCommands = commands
    .filter(cmd => path.extname(cmd) === '.js')
    .map(cmd => commandInfo(thisCategory, currentDirName, cmd))

  const relativeSubdirPaths = categories
    .filter(dir => dir !== 'lib')
    .map(cat => path.join(currentDirName, cat))

  return thisCategoryCommands.concat(
    relativeSubdirPaths.reduce((acc, item) => acc.concat(getCommands(rootDirName, thisCategory.name, item)), []))
}

//
// Category data extraction functions
//
function categoryNameFromDir(rootDirName, dirName) {
  return dirName === rootDirName ?
    '' :
    path.basename(dirName)
}

function combineCategories(parentCategory, currentCategory) {
  if (!parentCategory) {
    return currentCategory
  }
  return `${parentCategory} ${currentCategory}`
}

function categoryHelp(categoryDirName) {
  if (isFile(categoryDirName, 'category.txt')) {
    return fs.readFileSync(path.join(categoryDirName, 'category.txt'), 'utf8')
  }
  return ''
}

function categoryInfo(rootDirName, parentCategory, categoryDirName) {
  return {
    name: combineCategories(parentCategory, categoryNameFromDir(rootDirName, categoryDirName)),
    help: categoryHelp(categoryDirName)
  }
}

//
// Command data extraction functions
//

function commandHelp(commandObj) {
  return getClassHelpText(commandObj)
}

function commandOptions(commandObj) {
  return switchOptions(commandObj).concat(positionalOptions(commandObj))
}

function positionalOptions(commandObj) {
  const descriptions = getPositionalOptionsDescription(commandObj.prototype)

  return descriptions.map(desc => ({
    name: desc.name,
    position: desc.position,
    required: !!desc.required,
    defaultValue: desc.defaultValue || null,
    help: desc.helpText
  }))
}

function switchText(switchOption) {
  // Desired formats look like:
  //
  //  -x
  //  -x|--xopt
  //     --xopt
  //  -y <arg>
  //  -y|--yopt <arg>
  //     --yopt <arg>
  const start = switchOption.shortName ? [ '-' + switchOption.shortName ] : [ "  " ];
  const sep = switchOption.shortName && switchOption.longName ? [ "|" ] : [ " " ];
  const long = switchOption.longName ? [ '--' + switchOption.longName ] : [];
  const arg = switchOption.argName ? [ " " + switchOption.argName ] : [];
  return start.concat(sep).concat(long).concat(arg).join("");
}

function switchOptions(commandObj) {
  const descriptions = getOptionsDescription(commandObj.prototype)
  return _.values(descriptions).map(desc => ({
    shortName: desc.shortName || null,
    longName: desc.longName || null,
    switchText: switchText(desc),
    hasArg: !!desc.hasArg,
    required: !!desc.required,
    defaultValue: desc.defaultValue || null,
    help: desc.helpText
  }))
}

function commandInfo(categoryInfo, dir, commandFile) {
  const command = require(path.join(dir, commandFile)).default
  const commandName = path.basename(commandFile).slice(0, -path.extname(commandFile).length)
  const help = getClassHelpText(command)
  const options = commandOptions(command)
  return {
    category: categoryInfo,
    commandName,
    help,
    options: options
  }
}

//
// Functions for formatting resulting data into text
//

function usage(commandInfo) {
  let lines = []
  let currentLine = `    appcenter ${commandInfo.category.name} ${commandInfo.commandName}`

  let maxWidth = 120
  let rightMargin = 4
  optionUsages(commandInfo)
    .forEach((example) => {
      if (currentLine.length + example.length + 1 > maxWidth - rightMargin) {
        lines.push(currentLine)
        currentLine = `        ${example}`
      } else {
        currentLine += ` ${example}`
      }
    })

  lines.push(currentLine)

  return lines.join(os.EOL)
}

function optionUsages(commandInfo) {
  let [positionalOpts, switchOpts] = _.partition(commandInfo.options, opt => opt.name)

  let positionalUsages = _.sortBy(positionalOpts, 'position')
    .map(desc => {
      if (desc.position !== null) {
        return `<${desc.name}>`
      }
      return `<desc.name>...`
    })

  let switchUsages = switchOpts.map(desc => {
    let result = desc.switchText
    if (desc.hasArg) {
      result += ' <arg>'
    }
    if (!desc.required) {
      result = `[${result.trim()}]`
    }
    return result.trim()
  })

  return switchUsages.concat(positionalUsages)
}

function optionsText(commandInfo) {
  let optionInfo = commandInfo.options.map(desc => {
    if (desc.name) {
      return [desc.name, desc.help]
    } else {
      return [desc.switchText, desc.help]
    }
  })

  const firstColumnWidth = optionInfo.reduce((currentMax, opt) => Math.max(opt[0].length, currentMax), 0)
  const table = new Table(getOptionsForTwoColumnTableWithNoBorders(firstColumnWidth))
  optionInfo.forEach(opt => table.push(opt))
  return table.toString()
}

function formatCommand(commandInfo) {
  return `CATEGORY: ${commandInfo.category.name}

COMMAND: ${commandInfo.commandName}

${commandInfo.help}

USAGE:

  ${usage(commandInfo)}

OPTIONS:

${optionsText(commandInfo)}
`
}

const root = path.join(__dirname, '../dist/commands')
let text = getCommands(root, null, root).map(formatCommand).join('----------' + os.EOL)
console.log(text)
// console.log(util.inspect(getCommands(root, null, root), { depth: null }))
