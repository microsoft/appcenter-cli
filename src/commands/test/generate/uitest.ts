import { CommandArgs, help } from "../../../util/commandline";
import { GenerateCommand } from "../lib/generate-command";
import { Messages } from "../lib/help-messages";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as request from "request";
import * as path from "path";

@help(Messages.TestCloud.Commands.GenerateUITest)
export default class GenerateUITestCommand extends GenerateCommand {

  constructor(args: CommandArgs) {
    super(args);
  }

  protected templatePathAndroid = path.join(__dirname, "../lib/templates/uitest/android");
  protected templatePathiOS = path.join(__dirname, "../lib/templates/uitest/ios");

  protected async processTemplate(): Promise<void> {
    const platform = this.isIOS() ? "iOS" : "Android";
    const packageFilePath = path.join(this.outputPath, `AppCenter.UITest.${platform}/packages.config`);
    const projectFilePath = path.join(this.outputPath, `AppCenter.UITest.${platform}/AppCenter.UITest.${platform}.csproj`);

    let latestVersion: string;

    try {
      latestVersion = await this.getLatestUITestVersionNumber();
    } catch (e) {
      console.warn("Can't retrieve latest UITest version. Using default version from template. Details: " + e);
      return;
    }

    try {
      // Replace version inside packages.config file
      await this.replaceVersionInFile(packageFilePath, /(id="Xamarin\.UITest" version=")(\d+(\.\d+)+)/, latestVersion);

      // Replace version inside *.csproj file
      await this.replaceVersionInFile(projectFilePath, /(packages\\Xamarin\.UITest\.)(\d+(\.\d+)+)/, latestVersion);
    } catch (e) {
      await this.copyTemplates();
      console.warn("Can't update UITest version. Using default templates. Details: " + e);
      return;
    }
  }

  private async getLatestUITestVersionNumber(): Promise<string> {
    // Retrieve the latest stable version number of Xamarin.UITest via NuGet api
    return new Promise<string>((resolve, reject) => {
      const UITestNugetApiUrl = "https://api.nuget.org/v3-flatcontainer/Xamarin.UITest/index.json";

      request({
        url: UITestNugetApiUrl,
        json: true
      }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const stableVersions: string[] = (body.versions as string[]).filter((version) => version.indexOf("dev") === -1 && version.indexOf("beta") === -1);
          if (stableVersions.length) {
            resolve(stableVersions[stableVersions.length - 1]);
          } else {
            reject("Can't load latest UITest NuGet version number: response does not contain valid versions");
          }
        } else {
          reject(`Can't load latest UITest NuGet version number: ${response.statusCode}: ${error}`);
        }
      });
    });
  }

  private async replaceVersionInFile(filePath: string, regex: RegExp, version: string): Promise<void> {
    let fileContent = await pfs.readFile(filePath, "utf8");
    fileContent = fileContent.replace(regex, `$1${version}`);
    await pfs.writeFile(filePath, fileContent);
  }
}
