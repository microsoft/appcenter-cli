import { AppCommand, Command, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success, defaultValue } from "../../util/commandline";
import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out, prompt } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Process from "process";
import * as Request from "request";
import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";
import * as Path from "path";
import * as pfs from "../../util/misc/promisfied-fs";
import { DefaultApp } from "../../util/profile";
import * as chalk from "chalk";
import { sign, zip } from "./lib/update-contents-tasks";
import { isValidVersion, isValidRollout } from "./lib/validation-utils";
import { isBinaryOrZip, copyFileToTmpDir } from "./lib/file-utils";

const debug = require("debug")("mobile-center-cli:commands:codepush:release");

@help("Release an update to an app deployment")
export default class CodePushReleaseCommand extends AppCommand {
    @help("Path to update contents folder")
    @shortName("u")
    @longName("update-contents-path")
    @required
    @hasArg
    public updateContentsPath: string;

    @help("Semver expression that specifies the binary app version(s) this release is targeting (e.g. 1.1.0, ~1.2.3)")
    @shortName("t")
    @longName("target-binary-version")
    @required
    @hasArg
    public targetBinaryVersion: string;

    @help("Deployment to release the update to")
    @shortName("d")
    @longName("deployment-name")
    @defaultValue("Staging")
    @hasArg
    public deploymentName: string;

    @help("Description of the changes made to the app in this release")
    @shortName("des")
    @longName("description")
    @hasArg
    public description: string;

    @help("Specifies whether this release should be immediately downloadable")
    @shortName("x")
    @longName("disabled")
    public disabled: boolean;

    @help("Specifies whether this release should be considered mandatory")
    @shortName("m")
    @longName("mandatory")
    public mandatory: boolean;

    @help("Specifies the location of a RSA private key to sign the release with." + chalk.yellow("NOTICE:") + " use it for react native applications only, client SDK on other platforms will be ignoring signature verification for now!")
    @shortName("k")
    @longName("private-key-path")
    @defaultValue("Staging")
    @hasArg
    public privateKeyPath: string;

    @help("When this flag is set, releasing a package that is identical to the latest release will produce a warning instead of an error")
    @shortName("dre")
    @longName("no-duplicate-release-error")
    public noDuplicateReleaseError: boolean;

    @help("Percentage of users this release should be available to")
    @shortName("r")
    @longName("rollout")
    @defaultValue("100%")
    @hasArg
    public rollout: string;

    public async run(client: MobileCenterClient): Promise<CommandResult> {
        try {
            if (isBinaryOrZip(this.updateContentsPath)) {
                return failure(ErrorCodes.InvalidParameter, "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).");
            }
    
            if (!isValidVersion(this.targetBinaryVersion)) {
                return failure(ErrorCodes.Exception, "Invalid binary version(s) for a release.");
            }
    
            if (!isValidRollout(this.rollout)) {
                return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold('0')} or ${chalk.bold('100')}.`);
            }
    
            if (this.privateKeyPath && !prompt.confirm("You are going to use code signing which is experimental feature. If it is the first time you sign bundle please make sure that you have configured a public key for your client SDK and released new binary version of your app. Also, be sure that this release is targeting to new binary version. You can find more information about code signing feature here: https://github.com/Microsoft/code-push/blob/master/cli/README.md#code-signing  Do you want to continue?")) {
                return success();
            }
    
            if (this.privateKeyPath) {
                await sign(this.privateKeyPath, this.updateContentsPath);
            }

            const updateContentsZipPath = await zip(this.updateContentsPath);

            return success();
        } catch (error) {
            debug(`Failed to release a CodePush update - ${inspect(error)}`);
            return failure(ErrorCodes.Exception, error.response.body);
        }
    }
}
