// Functions to support outputting stuff to the user
const debug = require("debug")("mobile-center-cli:util:interaction:out");
import { inspect } from "util";

import { isDebug, isQuiet, formatIsJson, formatIsCsv, formatIsParsingCompatible } from "./io-options";

import * as os from "os";
import * as wrap from "wordwrap";

const Table = require("cli-table2");
const Spinner = require("cli-spinner").Spinner;

import { terminal } from "./terminal";

import * as _ from "lodash";

//
// Display a progress spinner while waiting for the provided promise
// to complete.
//
export function progress<T>(title: string, action: Promise<T>): Promise<T> {
  if (!formatIsParsingCompatible() && !isQuiet()) {
    const spinner = new Spinner(title);
    spinner.start();
    return action.then(result => {
      spinner.stop(true);
      return result;
    })
    .catch(ex => {
      spinner.stop(true);
      throw ex;
    });
  }  else {
    return action;
  }
}

//
// Output an array of items, passing each item through a formatting
// function.
//
export function list<T>(formatter: {(item: T): string}, items: T[]): void {
  console.assert(!formatIsCsv(), "this function doesn't support CSV mode");
  if (!items || Object.keys(items).length === 0) { return; }

  if (!formatIsJson()) {
    items.map(formatter).forEach(text => console.log(text));
  } else {
    console.log(JSON.stringify(items));
  }
}

//
// Output a line of help text
//
export function help(t: string): void;
export function help(): void;
export function help(...args: any[]) : void
{
  console.assert(!formatIsCsv(), "this function doesn't support CSV mode");
  let t: string;
  if (args.length === 0) {
    t = "";
  } else {
    t = args[0];
  }
  console.log(t);
}

//
// Output a line of plain text. Only outputs if the format is regular text.
// If passing a converter, then the raw data is output in json format instead.
//
export function text<T>(converter: {(data: T): string}, data: T): void;
export function text(t: string): void;
export function text(...args: any[]): void {
  console.assert(!formatIsCsv(), "this function doesn't support CSV mode");
  let converter: {(data: any): string};
  let data: any;
  if (args.length === 1) {
    converter = null;
    data = args[0];
  } else {
    [converter, data] = args;
  }

  if (formatIsJson()) {
    if (converter) {
      console.log(JSON.stringify(data));
    }
  } else {
    converter = converter || (s => s);
    console.log(converter(data));
  }
}

//
// Output tabular data.
// By default, does a simple default table using cli-table2.
// If you want to, you can pass in explicit table initialization
// options. See https://github.com/jamestalmage/cli-table2 for docs
// on the module.
//
export function table(options: any, data: any[]): void;
export function table(data: any[]): void;
export function table(...args: any[]): void {
  console.assert(!formatIsCsv(), "this function doesn't support CSV mode");
  let options: any;
  let data: any[];
  [options, data] = args;

  if (!data) {
    data = options;
    options = undefined;
  }

  if(!formatIsJson()) {
    let cliTable = new Table(options);
    data.forEach(item => cliTable.push(item));
    console.log(cliTable.toString());
  } else {
    console.log(JSON.stringify(data));
  }
}

//
// Formatting helper for cli-table2 - no table outlines. 
// It may be used for table output of command result
//
export function getNoTableBordersOptions() {
  return {
    chars: {
      "top": "", "top-mid": "", "top-left": "", "top-right": "",
      "bottom": "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
      "left": "", "left-mid": "", "mid": " ", "mid-mid": "",
      "right": "", "right-mid": "", "middle": " "
    },
    style: { "padding-left": 0, "padding-right": 0 },
    wordWrap: true
  };
}

//
// Formatting helper for cli-table2 - two columns with no table outlines. Used by
// help commands for formatting lists of options, commands, etc.
//
export function getOptionsForTwoColumnTableWithNoBorders(firstColumnWidth: number) {
  const consoleWidth = terminal.columns();
  // There will be a single whitespace to the right from the each column, count it as unavailable
  const availableWidth = consoleWidth - 2;
  const secondColumnWidth = availableWidth - firstColumnWidth;

  return _.extend(getNoTableBordersOptions(), {
    colWidths: [firstColumnWidth, secondColumnWidth],
  });
};

//
// Output a "report", which is a formatted output of a single object
// with ability to control naming of fields in the output, lets you
// output subobjects formatted nicely, and aligns everything for you.
//
// Usage looks like:
//  out.report([
//    // Report format here, one array entry per field to output
//    [ "Field name to display", "path.to.property.to.display.in.data", optionalFormatter ],
//    [ "Second field name", "second.path.to.display", /* No formatter on this one */ ]
//  ],
//  "Optional string to print if no data is available",
//  theDataToFormat);
//
// The paths to properties are simple dotted property names like you'd use in javascript.
// For example, in the profile list command, there's this line to display some of the
// current profile properties:
//
//   out.report([
//       ["Username", "userName" ],
//       [ "Display Name", "displayName" ],
//       [ "Email", "email"]
//     ], "No logged in user. Use 'mobile-center login' command to log in.",
//     user);
//
// "userName", "displayName", and "email" are names of properties on the user object being
// passed in. If there were subobjects, for example if the input object looked like this:
//
//   let user = {
//     name: {
//       userName: "chris",
//       displayName: "christav"
//     },
//     email: "not.giving@real.email.here"
//    };
//
// This format could be displayed in a report like so:
//
//   out.report([
//       [ "Username", "name.userName" ],
//       [ "Display Name", "name.displayName" ],
//       [ "Email", "email"]
//     ], "No logged in user. Use 'mobile-center login' command to log in.",
//     user);
//
// Each report format entry can have a formatter supplied with it. This is a function that
// takes the field's value and returns the appropriate string for display. By default
// report just calls 'toString' on the value, but you can use a formatter to customize
// to whatever you like.
//
// There are a few supplied formatters you can use out of the box attached to the report
// function. They are:
//
//   out.report.asDate: takes an input string, parses it as a Date object, then outputs the result.
//   out.report.inspect: takes any input object and returns the result of calling util.inspect on it.
//   out.report.allProperties: Takes an object with properties itself, and runs report
//                             recursively on that object. This results in a nicely indented subreport
//                             in the final output.
//
// In addition, if the formatter is itself an array, it becomes the report format for the subobjects.
// So you can nest arbitrary reports. For exmaple, asssuming the same user field, then using this:
//
//   out.report(
//     [
//       [ "Email", "email" ],
//       // Nested subobject
//       [ "Names", "name",
//         [
//           // report format for each of the subobject's fields
//           [ "User Name", "userName" ],
//           [ "Display Name", "displayName" ]
//         ]
//       ]
//     ],
//     {
//       // reformat our user to show subobjects
//       name: {
//         displayName: user.displayName,
//         userName: user.userName
//       },
//       email: user.email
//     });
//
// The resulting output looks like this:
//
//   Email: not.giving@real.email.here
//   Names:
//          User Name:    christav-yngr
//          Display Name: christav
//

//
// Support functions for "report" output
//
function spaces(num: number): string {
  if (num > 0) {
    return new Array(num + 1).join(" ");
  }
  return "";
}

function toWidth(s: string, width: number): string {
  var pad = width - s.length;
  return s + spaces(pad);
}

function defaultFormat(data: any): string {
  if (typeof data === "undefined" || data === null) {
    return "";
  }
  if (data instanceof Array) {
    if (data.length === 0) {
      return "[]";
    }
    return data.join(", ");
  }

  return data.toString();
}

function getProperty(value: any, propertyName: string): any {
  if (typeof value === 'undefined' || value === null) {
    return '';
  }

  if (!propertyName) {
    return value;
  }

  var first = propertyName.split('.')[0];
  var rest = propertyName.slice(first.length + 1);
  return getProperty(value[first], rest);
}

function doReport(indentation: number, reportFormat: any[], data: any, outfn: {(message: string): void}): void {
  if (reportFormat.length === 0) {
    return;
  }

  var maxWidth = 80;
  if ((<any>process.stdout).isTTY) {
    maxWidth = (<any>process.stdout).columns;
  }

  var headerWidth = Math.max.apply(null,
    reportFormat.map(function (item) { return item[0].length; })
    ) + 2;

  reportFormat.forEach(function (item) {
    var title = item[0] + ":";
    var field = item[1];
    var formatter = item[2] || defaultFormat;

    var value = getProperty(data, field);
    if (formatter instanceof Array) {
      outfn(spaces(indentation) + toWidth(title, headerWidth));
      doReport(indentation + headerWidth, formatter, value, outfn);
    } else {
      var leftIndentation = "verbose: ".length + indentation + headerWidth;
      var formatted = wrap.hard(leftIndentation, maxWidth)(formatter(value));
      formatted = spaces(indentation) + toWidth(title, headerWidth) +
        formatted.slice(leftIndentation);
      outfn(formatted);
    }
  });
}

interface ReportFunc {
  (reportFormat: any, nullMessage: string, data:any): void;
  (reportFormat: any, data: any): void;
  allProperties: {(data: any): string };
  asDate: {(data: any): string };
  inspect: {(data: any): string };
};

function makeReport(reportFormat: any, nullMessage: string, data:any): void;
function makeReport(reportFormat: any, data: any): void;
function makeReport(...args: any[]): void {
  console.assert(!formatIsCsv(), "this function doesn't support CSV mode");
  let reportFormat: any;
  let nullMessage: string;
  let data: any;

  if (args.length === 3) {
    [reportFormat, nullMessage, data] = args;
  } else {
    [reportFormat, data] = args;
    nullMessage = "No data available";
  }

  if (!formatIsJson()) {
    if (data === null || data === undefined) {
      console.log(nullMessage);
    } else {
      doReport(0, reportFormat, data, console.log);
    }
  } else {
     console.log(JSON.stringify(data));
  }
}

export const report = <ReportFunc> makeReport;

report.allProperties = function (data: any): any {
  if (typeof data === "undefined" || data === null || data === "") {
    return "[]";
  }
  var subreport = Object.keys(data).map(function (key) {
    return [key, key];
  });
  var result: string[] = [];
  doReport(0, subreport, data, function (o) { result.push(o); });
  result.push("");
  return result.join(os.EOL);
};

report.asDate = function (data: any): string {
  const date = new Date(data);
  if (formatIsJson()) {
    return date.toJSON();
  } else {
    return date.toString();
  }
};

report.inspect = function (data: any): string {
  return inspect(data, {depth: null});
};

export function reportNewLineSeparatedArray(reportFormat: any, data: any[]) {
  console.assert(!formatIsCsv(), "this function doesn't support CSV mode");
  if (!formatIsJson()) {
    data.forEach((item, index) => {
      if (index) {
        console.log("");
      }

      report(reportFormat, item);
    });
  } else {
    console.log(JSON.stringify(data));
  }
}

export function reportTitledGroupsOfTables(dataGroups: Array<{title: string, reportFormat: any, tables: any[]}>){
  console.assert(!formatIsCsv(), "this function doesn't support CSV mode");
  if (!formatIsJson()) {
    dataGroups.forEach((dataGroup, index) => {
      if (index) {
        console.log("");
      }
      console.log(dataGroup.title);
      console.log("");
      reportNewLineSeparatedArray(dataGroup.reportFormat, dataGroup.tables);
    });
  } else {
    console.log(JSON.stringify(dataGroups));
  }
}

export function getNoTableBordersCollapsedVerticallyOptions() {
  return {
    chars: {
      "top": "", "top-mid": "", "top-left": "", "top-right": "",
      "bottom": "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
      "left": "", "left-mid": "", "mid": "", "mid-mid": "",
      "right": "", "right-mid": "", "middle": " "
    },
    style: { "padding-left": 0, "padding-right": 0 },
    wordWrap: true
  };
}

function convertNamedTablesToCsvString (stringTables: NamedTables, columnsCount: number): string {
  const delimitersCount = columnsCount - 1;
  const delimitersString = _.repeat(",", delimitersCount);
  let output: string = "";
  stringTables.forEach((table, index) => {
    // tables break
    if (index) {
      output += delimitersString + os.EOL;
    }

    // table name
    output += table[0] + delimitersString + os.EOL;

    // table contents
    const contents = _.cloneDeep(table[1]);
    for (const row of contents) {
      row.length = columnsCount;
      output += row.join(",") + os.EOL;
    }
  });
  return output;
}

function convertNamedTablesToListString (stringTables: NamedTables): string {
  const delimiter = " ";
  let output: string = "";
  stringTables.forEach((table, index) => {
    // tables break
    if (index) {
      output += os.EOL;
    }

    // table name
    output += table[0] + os.EOL;

    // table contents
    const cliTable = new Table(getNoTableBordersCollapsedVerticallyOptions());
    table[1].forEach((row) => cliTable.push(row));
    output += cliTable.toString() + os.EOL;
  });
  return output;
}

export type NamedTables = Array<[string, string[][]]>;
type ObjectToNamedTablesConvertor<T> = (object: T, 
                                dateFormatter: (date: Date) => string,
                                percentageFormatter: (percentage: number) => string,
                              ) => NamedTables;

export function reportObjectAsTitledTables<T>(toNamedTables: ObjectToNamedTablesConvertor<T>, object: T, columnsCount: number) {
  if (formatIsJson()) {
    console.log(JSON.stringify(object));
  } else {
    let output: string;
    if (formatIsCsv()) {
      const stringTables = toNamedTables(object, (date) => date.toISOString(), (percentage) => percentage.toString());
      output = convertNamedTablesToCsvString(stringTables, columnsCount);
    } else {
      const stringTables = toNamedTables(object, (date) => date.toString(), (percentage) => _.round(percentage, 2).toString() + "%");
      output = convertNamedTablesToListString(stringTables);
    }
    
    console.log(output);
  }
}

