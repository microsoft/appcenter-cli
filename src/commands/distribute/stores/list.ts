import { AppCommand, CommandResult, ErrorCodes, failure, help, success } from "../../../util/commandline";
import { AppCenterClient, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:distribute:stores:list");

@help("Lists all stores of the app")
export default class ListStoresCommand extends AppCommand {
  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    debug("Getting list of the stores");
    let storesListRequestResponse: models.StoresListResponse;
    try {
      storesListRequestResponse = await out.progress("Getting list of the stores...", client.stores.list(app.ownerName, app.appName));
    } catch (error) {
      debug(`Failed to get list of the stores - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to fetch list of all stores");
    }

    const sortedStores = _(storesListRequestResponse).sortBy((store) => [store.type, store.track, store.name]);

    const storesNames = sortedStores.map((store) => store.name).value();
    const storesTypes = sortedStores.map((store) => store.type).value();
    const storesTracks = sortedStores.map((store) => store.track).value();
    const outputArray = _.zip(storesNames, storesTypes, storesTracks);

    if (!outputArray.length) {
      out.text(`No stores configured for app '${app.ownerName}/${app.appName}'`);
      out.table(out.getCommandOutputTableOptions([]), outputArray);
    } else {
      out.table(out.getCommandOutputTableOptions(["Store", "Type", "Track"]), outputArray);
    }

    return success();
  }
}
