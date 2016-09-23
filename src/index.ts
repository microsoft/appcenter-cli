import {
  Command,
  CommandResult,
  succeeded,
  failed,
  ErrorCodes,
  runner as commandRunner
} from "./util/commandline";

import * as path from "path";

let runner = commandRunner(path.join(__dirname, "commands"));
runner(process.argv.slice(2))
  .then((result: CommandResult) => {
    if (failed(result)) {
      console.log(`Command failed, ${result.errorMessage}`);
      process.exit(result.errorCode);
    }
  });
