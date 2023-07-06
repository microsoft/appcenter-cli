// tokens delete command

import {
  CommandArgs,
  CommandResult,
  help,
  success,
  position,
  required,
  name,
  AppCommand,
  shortName,
  longName,
  hasArg,
  defaultValue,
  failure,
  ErrorCodes,
} from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { AppCenterClient } from "../../util/apis";
import { DefaultApp } from "../../util/profile";
import { PrincipalType, validatePrincipalType as validateTokenPrincipal } from "../../util/misc/principal-type";

@help("Delete an API token")
export default class TokenDeleteCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("ID of the API token")
  @name("token")
  @required
  @position(0)
  id: string;

  @help("The type of token: [ user, app ]. An app must be specified for app type tokens")
  @shortName("t")
  @longName("type")
  @hasArg
  @defaultValue("user")
  principalType: PrincipalType;

  async run(client: AppCenterClient): Promise<CommandResult> {
    validateTokenPrincipal(this.principalType);
    const tokenMessaging = `Deleting ${this.principalType} API token ...`;
    const confirmation = await prompt.confirm(`Do you really want to delete the ${this.principalType} API token with ID "${this.id}"`);

    if (!confirmation) {
      out.text(`Deletion of ${this.principalType} API token with ID "${this.id}" canceled`);
      return success();
    }

    try {
      if (this.principalType === PrincipalType.USER) {
        await out.progress(
          tokenMessaging,
          client.userApiTokens.delete(this.id, {
            onResponse: (response, _flatResponse, _error?) => this.handleCreateTokenResponse(response.status),
          })
        );
      } else if (this.principalType === PrincipalType.APP) {
        const app: DefaultApp = this.app;
        await out.progress(
          tokenMessaging,
          client.appApiTokens.delete(app.ownerName, app.appName, this.id, {
            onResponse: (response, _flatResponse, _error?) => this.handleCreateTokenResponse(response.status),
          })
        );
      }
    } catch (error) {
      return error;
    }

    return success();
  }

  private handleCreateTokenResponse(statusCode: number) {
    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
        default:
          throw failure(ErrorCodes.Exception, "invalid request");
        case 401:
          throw failure(ErrorCodes.InvalidParameter, "authorization to create an API token failed");
        case 404:
          throw failure(ErrorCodes.NotLoggedIn, `the ${this.principalType} API token with ID "${this.id}" could not be found`);
      }
    }
  }
}
