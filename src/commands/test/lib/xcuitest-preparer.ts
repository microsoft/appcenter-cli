import * as iba from "../../../util/misc/ios-bundle-archiver";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as pglob from "../../../util/misc/promisfied-glob";
import { TestCloudError } from "./test-cloud-error";

export class XCUITestPreparer {
  private readonly artifactsDir: string;
  private readonly buildDir: string;
  private testIpaPath: string;

  constructor(artifactsDir: string, buildDir: string, testIpaPath: string, include?: string[]) {
    if (!artifactsDir) {
      throw new Error("Argument --artifacts-dir is required");
    }

    if (!(buildDir || testIpaPath)) {
      throw new Error("Either --build-dir or --test-ipa-path argument is required");
    }

    if (buildDir && testIpaPath) {
      throw new Error("Arguments --build-dir and --test-ipa-path cannot be used together");
    }

    if (include && include.length) {
      throw new Error("Argument --include cannot be used for XCUITest");
    }

    this.artifactsDir = artifactsDir;
    this.buildDir = buildDir;
    this.testIpaPath = testIpaPath;
  }

  public async prepare(): Promise<string> {
    if (!await pfs.exists(this.artifactsDir)) {
      await pfs.mkdir(this.artifactsDir);
    }

    if (this.buildDir) {
      await this.generateTestIpa();
    } else {
      if (!await pfs.fileExists(this.testIpaPath)) {
        throw new Error(`File not found for test ipa path: "${this.testIpaPath}"`);
      }
      await pfs.cpFile(this.testIpaPath, path.join(this.artifactsDir, path.basename(this.testIpaPath)));
    }

    const manifestPath = path.join(this.artifactsDir, "manifest.json");
    const manifest = await this.createXCUITestManifest();
    const manifestJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, manifestJson);

    return manifestPath;
  }

  private async createXCUITestManifest(): Promise<any> {
    const ipaArtifactsPath = path.basename(this.testIpaPath);
    const result = {
      schemaVersion: "1.0.0",
      files: [ipaArtifactsPath],
      testFramework: {
        name: "xcuitest",
        data: { }
      }
    };

    return result;
  }

  private async generateTestIpa(): Promise<void> {
    const runnerAppPaths = await pglob.glob(path.join(this.buildDir, "*-Runner.app"));
    if (runnerAppPaths.length === 0) {
      throw new TestCloudError(`Unable to find test runner app within ${this.buildDir}`);
    }
    if (runnerAppPaths.length > 1) {
      throw new TestCloudError(`Multiple test runner apps found within ${this.buildDir}`);
    }
    this.testIpaPath = path.join(this.artifactsDir, `${path.parse(runnerAppPaths[0]).name}.ipa`);
    await iba.archiveAppBundle(runnerAppPaths[0], this.testIpaPath);
  }
}
