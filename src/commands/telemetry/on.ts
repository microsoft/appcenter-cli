// telemetry on command

import { Command, CommandArgs, CommandResult, help, success } from "../../util/commandline";
import { saveTelemetryOption } from "../../util/profile";
import { scriptName } from "../../util/misc";
import { out } from "../../util/interaction";

@help("Turn on the sending of telemetry")
export default class TelemetryOnCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    await saveTelemetryOption(true);
    out.text(`${scriptName} cli will now send telemetry with requests`);
    return success();
  }
}
