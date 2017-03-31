import { AppCommand, CommandResult, help, success, shortName, longName, required, hasArg, isCommandFailedResult } from "../../../util/commandline";
import { MobileCenterClient } from "../../../util/apis";

import { showDistributionGroupView } from "./lib/group-view-helper";

const debug = require("debug")("mobile-center-cli:commands:distribute:groups:show");

@help("Shows information about the distribution group")
export default class ShowDistributionGroupCommand extends AppCommand {
  @help("Distribution group name")
  @shortName("g")
  @longName("group")
  @required
  @hasArg
  public distributionGroup: string;

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    // showing distribution group view
    try {
      await showDistributionGroupView(client, app, this.distributionGroup, debug);
    } catch (error) {
      if (isCommandFailedResult(error)) {
        return error;
      } else {
        throw error;
      }
    }

    return success();
  }
}
