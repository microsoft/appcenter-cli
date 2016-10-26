import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn } from "../../util/commandLine";
import { out } from "../../util/interaction";
import { getUser } from "../../util/profile";
import { SonomaClient, models, clientCall } from "../../util/apis";
import { PathResolver } from "./lib/path-resolver";
import { TestManifest } from "./lib/test-manifest";
import { TestManifestReader } from "./lib/test-manifest-reader";
import * as path from "path";
import * as fs from "fs";

const debug = require("debug")("somona-cli:commands:submit-tests");

@help("Submits tests to Sonoma")
export default class SubmitTestsCommand extends Command {
  @help("Application name")
  @shortName("an")
  @longName("appName")
  @hasArg
  @required
  applicationName: string;

  @help("Application file path")
  @shortName("ap")
  @longName("appPath")
  @hasArg
  @required
  applicationPath: string;

  @shortName("d")
  @longName("devices")
  @hasArg
  @required
  devices: string;

  @shortName("m")
  @longName("manifest")
  @hasArg
  @required
  manifestPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    debug("Parsing manifest");
    let manifest = await TestManifestReader.readFromFile(this.manifestPath);
    debug(`Test framework: ${manifest.testFramework.name}`);

    await clientCall(cb => {
      return client.tests.createTestRun(getUser().userName, this.applicationName, cb);
    });

    return success();
  }
}