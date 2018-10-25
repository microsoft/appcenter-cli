import { Command, CommandResult, help, name, position, ErrorCodes, success, failure, shortName, longName, hasArg } from "../util/commandline";
import * as _ from "lodash";
import * as Path from "path";
import * as mkdirp from "mkdirp";
import * as Process from "process";
import { setupAutoCompleteForShell } from "../util/commandline/autocomplete";
import { out } from "../util/interaction";

@help("Setup tab completion for your shell")
export default class SetupAutoCompleteCommand extends Command {
  private static readonly supportedShells = ["bash", "zsh", "fish"];

  @help("Shell to generate autocompletion code for. Supported values - bash, zsh, fish. Default: shell specified in $SHELL")
  @shortName("s")
  @longName("shell")
  @hasArg
  shell: string;

  @help("Optional shell profile path. Default: $HOME/.bash_profile for bash, $HOME/.zshrc for zsh, $HOME/.config/fish/config.fish for fish")
  @name("shell-profile-path")
  @position(0)
  shellProfilePath: string;

  async runNoClient(): Promise<CommandResult> {
    if (_.isNil(this.shellProfilePath) && !_.isNil(this.shell)) {
      return failure(ErrorCodes.InvalidParameter, "Shell should be specified only when shell profile path is specified");
    }

    if (!_.isNil(this.shell) && SetupAutoCompleteCommand.supportedShells.indexOf(this.shell) === -1) {
      return failure(ErrorCodes.InvalidParameter, `${this.shell} is not supported. Only ${SetupAutoCompleteCommand.supportedShells.join(", ")} are supported`);
    }

    if (_.isNil(this.shell) && (!process.env.SHELL || !process.env.SHELL.match(SetupAutoCompleteCommand.supportedShells.join("|")))) {
      return failure(ErrorCodes.InvalidParameter, "Current shell cannot be detected, please specify it explicitly");
    }

    if (!_.isNil(this.shellProfilePath)) {
      mkdirp.sync(Path.dirname(this.shellProfilePath));
    }

    Process.on("exit", (code: number ) => {
      if (code === 0) {
        out.text("Please restart shell to apply changes");
      }
    });

    setupAutoCompleteForShell(this.shellProfilePath, this.shell);

    return success();
  }
}
