import {
  Command,
  CommandResult,
  succeeded,
  failed,
  ErrorCodes,
  runner as commandRunner
} from "./util/commandline";

import * as path from "path";
import * as chalk from "chalk";

let runner = commandRunner(path.join(__dirname, "commands"));
runner(process.argv.slice(2))
  .then((result: CommandResult) => {
    if (failed(result)) {
      console.log(`${chalk.bold.red("Error:")} ${result.errorMessage}`);
      process.exit(result.errorCode);
    }
  });
