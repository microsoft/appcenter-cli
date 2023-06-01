import { AppCommand} from "../../util/commandline";
import { StreamingArrayOutput } from "../../util/interaction";
import * as fsHelper from "../../util/misc/fs-helper";
import * as Fs from "fs";
import * as os from "os";
import * as path from "path";
import fetch from 'node-fetch';

const debug = require("debug")("appcenter-cli:util:misc:download");

export function downloadFileAndSave(downloadUrl: string, filePath: string): Promise<void> {
  debug(`Downloading file from ${downloadUrl} to the path ${filePath}`);

  return new Promise<void>(async (resolve, reject) => {
    const response = await fetch(downloadUrl);
    const dest = Fs.createWriteStream(filePath);
    response.body.pipe(dest);
    response.body.on("end", () => resolve());
    dest.on("error", reject);
  });
}

export async function downloadArtifacts(
  command: AppCommand,
  streamingOutput: StreamingArrayOutput,
  outputDir: string,
  testRunId: string,
  artifacts: { [propertyName: string]: string }
): Promise<void> {
  for (const key in artifacts) {
    const reportPath: string = fsHelper.generateAbsolutePath(outputDir);
    const pathToArchive: string = path.join(reportPath, `${key.toString()}.zip`);
    fsHelper.createLongPath(reportPath);
    await downloadFileAndSave(artifacts[key], pathToArchive);

    // Print only in VSTS environment
    // https://docs.microsoft.com/en-us/vsts/build-release/concepts/definitions/build/variables?view=vsts&tabs=batch#tfbuild
    if (process.env["TF_BUILD"]) {
      streamingOutput.text((command: AppCommand): string => {
        return `##vso[task.setvariable variable=${key}]${pathToArchive}${os.EOL}`;
      }, command);
    }

    streamingOutput.text((command: AppCommand): string => {
      return `Downloaded artifacts to ${pathToArchive}`;
    }, command);
  }
}
