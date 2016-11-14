import { AppCommand, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn } from "../../../util/commandLine";
import { SonomaClient } from "../../../util/apis";
import { TestCloudUploader } from "../lib/test-cloud-uploader";
import { getUser } from "../../../util/profile";
import { out } from "../../../util/interaction";
import { parseTestParameters } from "../lib/parameters-parser";

const debug = require("debug")("mobile-center:commands:test");

@help("Submits tests to Visual Studio Mobile Center")
export default class RunTestsCommand extends AppCommand {
  @help("Path to an application file")
  @longName("app-path")
  @hasArg
  @required
  appPath: string;

  @help("Selected devices slug")
  @longName("devices")
  @hasArg
  @required
  devices: string;

  @help("Path to manifest file")
  @longName("manifest-path")
  @hasArg
  @required
  manifestPath: string;

  @help("Path to dSym files")
  @longName("dsym-path")
  @hasArg
  dSymPath: string;

  @help("Test parameters")
  @shortName("p")
  @longName("test-parameter")
  @hasArg
  testParameters: string[];

  @help("Locale for the test run (e.g. en-US)")
  @longName("locale")
  @hasArg
  locale: string;

  @help("Test series name")
  @longName("test-series")
  @hasArg
  testSeries: string;

  constructor(args: CommandArgs) {
    super(args);

    if (typeof this.testParameters === "string") {
      this.testParameters = [ this.testParameters ];
    }
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    let uploader = new TestCloudUploader(
      client, 
      getUser().userName,
      this.app.appName,
      this.manifestPath,
      this.devices);

    uploader.appPath = this.appPath;
    uploader.dSymPath = this.dSymPath;
    uploader.locale = this.locale;
    uploader.testSeries = this.testSeries;
    if (this.testParameters) {
      uploader.testParameters = parseTestParameters(this.testParameters);
    }

    let testRun = await uploader.uploadAndStart();
    
    out.text(`Test run id: "${testRun.testRunId}"`);
    out.text("Accepted devices: ");
    out.list(item => `  - ${item}`, testRun.acceptedDevices);
    
    if (testRun.rejectedDevices && testRun.rejectedDevices.length > 0) {
      out.text("Rejected devices: ");
      out.list(item => `  - ${item}`, testRun.rejectedDevices);
    }
    
    return success();
  }
}