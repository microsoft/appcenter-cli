import { AppCommand, CommandResult, ErrorCodes, failure, help, success } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:distribute:stores:list");

@help("Lists all stores of the app")
export default class ListStoresCommand extends AppCommand {

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    debug("Getting list of the stores");
    let storesListRequestResponse: ClientResponse<models.ExternalStoreResponse[]>;
    try {
      storesListRequestResponse = await out.progress("Getting list of the stores...",
        clientRequest<models.ExternalStoreResponse[]>((cb) => client.stores.list(app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Failed to get list of the stores - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to fetch list of all stores");
    }

    if (storesListRequestResponse.response.statusCode >= 400) {
      return failure(ErrorCodes.Exception, "failed to fetch list of all stores");
    }

    const storesNames = _(storesListRequestResponse.result)
      .sortBy((store) => [store.type, store.track, store.name])
      .map((store) => store.name).value();

    const storesTypes = _(storesListRequestResponse.result)
      .sortBy((store) => [store.type, store.track, store.name])
      .map((store) => store.type).value();

    const storesTracks = _(storesListRequestResponse.result)
      .sortBy((store) => [store.type, store.track, store.name])
      .map((store) => store.track).value();

    const outputArray = _.zip(storesNames, storesTypes, storesTracks);

    // Printing the result table
    out.table(out.getCommandOutputTableOptions(["Store", "Type", "Track"]), outputArray);

    return success();
  }
}
