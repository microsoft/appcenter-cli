const _ = require("lodash");
const Fs = require("fs");
const Path = require("path");
let OptionDecorators; // OptionDecorators.js is not yet compiled at this point, it should be loaded later

const rootPath = Path.resolve("dist");
const commandsPath = Path.join(rootPath, "commands");
const treeFile = "autocomplete-tree.json";
const treeFilePath = Path.join(rootPath, treeFile);

/**
 * Generates autocomplete tree and saves it to file
 */
function generateAndSave() {
  OptionDecorators = require("../dist/util/commandline/option-decorators"); // OptionDecorators.js is available here
  const treeObject = generateAutoCompleteTree(commandsPath);

  // saving tree
  Fs.writeFileSync(treeFilePath, JSON.stringify(treeObject), "utf8");
}

/** 
 * Constructs autocomplete tree from FS structure
 * @param {string} path 
 * @param {object} treeObject
 * @returns {object | string[]}
 */
function generateAutoCompleteTree(path) {
  let dirEntries;
  if (dirEntries = getDirEntriesOrNull(path)) {
    // path points to directory (category)
    const treeObject = {};
    const filteredDirEntries = dirEntries.filter((entry) => entry !== "lib" && entry !== "category.txt" && Path.extname(entry) !== ".map");

    filteredDirEntries.forEach((entry) => {
      treeObject[Path.parse(entry).name] = generateAutoCompleteTree(Path.join(path, entry));
    })

    return treeObject;
  } else {
    // path points to file (command)
    return getOptionsForCommand(path);
  }
}

/**
 * Returns directory content or null for files
 * @param {string} path 
 * @return {string[] | null}
 */
function getDirEntriesOrNull(path) {
  try {
    return Fs.readdirSync(path);
  } catch (error) {
    // return null for files
    if (error.code === "ENOTDIR") {
      return null;
    } else {
      throw error;
    }
  }
}

/**
 * Returns options for the specified command
 * @param {string} path 
 * @returns {object[]}
 */
function getOptionsForCommand(path) {
  const command = require(path).default;

  // getting command options
  const optionsDescriptionsObject = OptionDecorators.getOptionsDescription(command.prototype);
  const optionsDescriptions = Object.keys(optionsDescriptionsObject).map((key) => optionsDescriptionsObject[key]);
  return optionsDescriptions.map((option) => ({ 
    short: option.shortName ? "-" + option.shortName : undefined,
    long: option.longName ? "--" + option.longName : undefined
  }));
}

module.exports = {
  generateAndSave
}