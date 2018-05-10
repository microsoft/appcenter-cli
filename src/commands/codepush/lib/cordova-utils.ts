import * as which from "which";
import * as xml2js from "xml2js";
import * as fs from "fs";
import * as path from "path";

export function getCordovaProjectAppVersion(projectRoot?: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let configString: string;
    try {
      projectRoot = projectRoot || process.cwd();
      configString = fs.readFileSync(path.join(projectRoot, "config.xml"), { encoding: "utf8" });
    } catch (error) {
      return reject(new Error(`Unable to find or read "config.xml" in the CWD. The "release-cordova" command must be executed in a Cordova project folder.`));
    }

    xml2js.parseString(configString, (err: Error, parsedConfig: any) => {
      if (err) {
        reject(new Error(`Unable to parse "config.xml" in the CWD. Ensure that the contents of "config.xml" is valid XML.`));
      }

      const config: any = parsedConfig.widget;
      resolve(config["$"].version);
    });
  });
}

export function isValidOS(os: string): boolean {
  switch (os.toLowerCase()) {
    case "android":
    case "ios":
      return true;
    default:
      return false;
  }
}

export function isValidPlatform(platform: string): boolean {
  return platform.toLowerCase() === "cordova";
}

// Check whether the Cordova or PhoneGap CLIs are
// installed, and if not, fail early
export function getCordovaOrPhonegapCLI(): string {
  let cordovaCLI: string = "cordova";

  try {
    which.sync(cordovaCLI);
    return cordovaCLI;
  } catch (e) {
    cordovaCLI = "phonegap";
    which.sync(cordovaCLI);
    return cordovaCLI;
  }
}
