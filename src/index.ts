import { CommandResult, failed, runner as commandRunner } from "./util/commandline";
import { formatIsJson } from "./util/interaction/io-options";

import * as path from "path";
import * as chalk from "chalk";

const runner = commandRunner(path.join(__dirname, "commands"));
runner(process.argv.slice(2)).then((result: CommandResult) => {
  if (failed(result)) {
    if (formatIsJson()) {
      console.error(`${chalk.red(JSON.stringify(result))}`);
    } else {
      console.error(`${chalk.bold.red("Error:")} ${result.errorMessage}`);
    }
    process.exit(result.errorCode);
  }
});
