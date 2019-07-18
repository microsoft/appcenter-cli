import {
  CommandResult,
  failed,
  runner as commandRunner
} from "./util/commandline";

import * as path from "path";
import chalk from "chalk";

const runner = commandRunner(path.join(__dirname, "commands"));
runner(process.argv.slice(2))
  .then((result: CommandResult) => {
    if (failed(result)) {
      console.log(`${chalk.bold.red("Error:")} ${result.errorMessage}`);
      process.exit(result.errorCode);
    }
  });
