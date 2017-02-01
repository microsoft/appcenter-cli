// telemetry off command

import { Command, CommandArgs, CommandResult, help, success } from "../../util/commandline";
import { saveTelemetryOption } from "../../util/profile";
import { out } from "../../util/interaction";

@help("Turn on the sending of telemetry")
export default class TelemetryOnCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    await saveTelemetryOption(false);
    out.text("mobile-center cli will not send telemetry with requests");
    return success();
  }
}
