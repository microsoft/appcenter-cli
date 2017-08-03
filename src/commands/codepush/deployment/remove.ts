import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { DefaultApp } from "../../../util/profile";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:codepush:deployment:remove");

@help("Remove a deployment from an app")
export default class RemoveCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    return success();
  }
}