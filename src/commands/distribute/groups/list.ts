import { AppCommand, CommandResult, ErrorCodes, failure, help, success} from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";

const pLimit = require("p-limit");

const debug = require("debug")("mobile-center-cli:commands:distribute:groups:list");

@help("Lists all distribution groups of the app")
export default class ListDistributionGroupsCommand extends AppCommand {

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    debug("Getting list of the distribution groups");
    let distributionGroupsListRequestResponse: ClientResponse<models.DistributionGroupResponse[]>;
    try {
      distributionGroupsListRequestResponse = await out.progress("Getting list of the distribution groups...",
        clientRequest<models.DistributionGroupResponse[]>((cb) => client.distributionGroups.list(app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Failed to get list of the distribution groups - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to fetch list of all distribution groups");
    }

    if (distributionGroupsListRequestResponse.response.statusCode >= 400) {
      return failure(ErrorCodes.Exception, "failed to fetch list of all distribution groups");
    }

    const distributionGroupsNames = _(distributionGroupsListRequestResponse.result)
      .sortBy((distributionGroup) => distributionGroup.name)
      .map((distributionGroup) => distributionGroup.name).value();

    const limit = pLimit(10);

    debug("Creating requests for retrieving user counts of distribution groups");
    const distributionGroupUsersPromises: Array<Promise<ClientResponse<models.DistributionGroupUserGetResponse[]>>> = [];
    for (const distributionGroupName of distributionGroupsNames){
      distributionGroupUsersPromises.push(limit(() => clientRequest<models.DistributionGroupUserGetResponse[]>(
          (cb) => client.distributionGroups.listUsers(this.app.ownerName, this.app.appName, distributionGroupName, cb))));
    }

    // Showing progress spinner while requests are being sent
    const requestsCompletedPromise = out.progress("Getting number of users for distribution groups", 
      Promise.all(distributionGroupUsersPromises.map((dg) => dg.catch((res) => Promise.resolve()))));

    const userCounts: string[] = [];
    for (let i = 0; i < distributionGroupUsersPromises.length; i++) {
      const distributionGroupUsers = distributionGroupUsersPromises[i];
      let userCount: string;

      try {
        debug(`Waiting for ${distributionGroupsNames[i]} distribution group users request response`); 
        const distributionGroupUsersRequestResponse = await distributionGroupUsers;
        if (distributionGroupUsersRequestResponse.response.statusCode >= 400) {
          throw distributionGroupUsersRequestResponse.response.statusCode;
        }
        debug(`Request for the list of ${distributionGroupsNames[i]} distribution group users has succeeded`); 
        userCount = distributionGroupUsersRequestResponse.result.length.toString();
      } catch (error) {
        debug(`Request for the list of ${distributionGroupsNames[i]} distribution group users has failed - ${inspect(error)}`); 
        userCount = "failed to get number of users";
      }

      userCounts.push(userCount);
    }

    // Waiting for spinner to stop
    await requestsCompletedPromise;

    const outputArray = [["Group", "Users"]].concat(_.zip(distributionGroupsNames, userCounts));

    // Printing the result table
    out.text("");
    this.printTwoColumnTableWithHeader(outputArray);

    return success();
  }

  private printTwoColumnTableWithHeader(tableData: string[][]) {
    let firstColumnWidth: number = 0;
    let secondColumnWidth: number = 0;
    const styledTable: Object[][] = [];
    for (const tableRow of tableData){
      firstColumnWidth = Math.max(tableRow[0].length, firstColumnWidth);
      secondColumnWidth = Math.max(tableRow[1].length, secondColumnWidth);
      styledTable.push([{content: tableRow[0]}, { hAlign: "center", content: tableRow[1]}]);
    }

    const header = styledTable.slice(0, 1);
    const divider = [[{content: _.repeat("-", firstColumnWidth)}, {content: _.repeat("-", secondColumnWidth)}]];
    const body = styledTable.slice(1);
    
    const outputTable = header.concat(divider, body);

    out.table(this.getTwoColumnTableOptions(firstColumnWidth, secondColumnWidth), outputTable);  
  }

  private getTwoColumnTableOptions(firstColumnWidth: number, secondColumnWidth: number): any {
    return {
      chars: {
        "bottom": "", "bottom-left": "", "bottom-mid": "", "bottom-right": "",        
        "left": "", "left-mid": "", "mid": "", "mid-mid": "", "middle": " ",        
        "right": "", "right-mid": "",
        "top": "", "top-left": "", "top-mid": "", "top-right": "",
      },
      colWidths: [firstColumnWidth, secondColumnWidth],
      style: { "padding-left": 0, "padding-right": 0 },
      wordWrap: true
    };
  }
}
