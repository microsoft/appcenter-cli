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
  @shortName("a")
  @longName("applicationPath")
  @position(null)
  @help("Path of the application file")
  @required
  applicationPath: string;

  @shortName("d")
  @longName("devices")
  @hasArg
  @required
  devices: string;

  @shortName("mp")
  @longName("manifestPath")
  @hasArg
  @required
  manifestPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    out.text("Parsing manifest");
    let manifest = await this.readManifest();
    out.text(`Test framework: ${manifest.testFramework.name}`);
    return success();
  }

  async readManifest(): Promise<TestManifest> {
    let workspaceDir = path.dirname(this.manifestPath);
    let pathResolver = new PathResolver(workspaceDir);
    let manifestJson = await this.getManifestJson();
    let manifestReader = new TestManifestReader(pathResolver);

    return await manifestReader.readManifest(manifestJson);
  }

  async getManifestJson(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      fs.readFile(this.manifestPath, "utf8", (error, data) => {
        if (error) {
          reject(error);
        }
        else {
          resolve(JSON.parse(data));
        }
      });
    });
  }
}