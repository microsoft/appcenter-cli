import {
  Command,
  CommandResult,
  CommandArgs,
  ErrorCodes,
  failure,
  hasArg,
  help,
  longName,
  required,
  shortName,
  success,
} from "../../../util/commandline";
import { AppCenterClient, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { reportApp } from "../../apps/lib/format-app";
import { APP_RELEASE_TYPE_VALIDATIONS } from "../../apps/lib/app-release-type-validation";

@help("Create a new app in an organization")
export default class OrgAppCreateCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Name of the organization")
  @shortName("n")
  @longName("org-name")
  @required
  @hasArg
  orgName: string;

  @help(
    "The name of the app used in URLs. Can optionally be provided specifically, otherwise a generated name will be derived from display-name"
  )
  @shortName("a")
  @longName("app-name")
  @hasArg
  appName: string;

  @help("Description of the app")
  @longName("description")
  @hasArg
  description: string;

  @help("The descriptive name of the app. This can contain any characters")
  @shortName("d")
  @longName("display-name")
  @required
  @hasArg
  displayName: string;

  @help("The OS the app will be running on. Supported values: Android, Custom, iOS, macOS, tvOS, Windows")
  @shortName("o")
  @longName("os")
  @required
  @hasArg
  os: string;

  @help(
    "The platform of the app. Supported values: Cordova, Java, Objective-C-Swift, React-Native, Unity, UWP, WinForms, WPF, Xamarin, Custom"
  )
  @shortName("p")
  @longName("platform")
  @required
  @hasArg
  platform: string;

  @help(
    "The app release type. Suggested values are Alpha, Beta, Production, Store, Enterprise. Custom values are allowed and must be must be one word, alphanumeric, first letter capitalized."
  )
  @shortName("r")
  @longName("release-type")
  @hasArg
  release_type: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const appAttributes: models.AppRequest = {
      displayName: this.displayName,
      platform: this.platform,
      os: this.os,
      description: this.description,
      name: this.appName,
    };

    if (this.release_type) {
      if (this.release_type.length > APP_RELEASE_TYPE_VALIDATIONS.maxLength.rule) {
        return failure(ErrorCodes.InvalidParameter, APP_RELEASE_TYPE_VALIDATIONS.maxLength.errorMessage);
      }
      if (!APP_RELEASE_TYPE_VALIDATIONS.matchRegexp.rule.test(this.release_type)) {
        return failure(ErrorCodes.InvalidParameter, APP_RELEASE_TYPE_VALIDATIONS.matchRegexp.errorMessage);
      }
      appAttributes.releaseType = this.release_type;
    }

    try {
      const createAppResponse = await out.progress(
        "Creating app in org...",
        client.apps.createForOrg(this.orgName, appAttributes)
      );

      reportApp(createAppResponse);

      return success();
    } catch (error) {
      switch (error.statusCode) {
        case 404:
          return failure(ErrorCodes.NotFound, "there appears to be no such org");
        case 409:
          return failure(ErrorCodes.InvalidParameter, "an app with this 'name' already exists");
        default:
          return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
      }
    }
  }
}
