import * as which from "which";
import * as xml2js from "xml2js";
import * as fs from "fs";
import * as path from "path";

export function getCordovaProjectAppVersion(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const projectRoot: string = process.cwd();
      var configString: string = fs.readFileSync(path.join(projectRoot, "config.xml"), { encoding: "utf8" });
    } catch (error) {
      reject(new Error(`Unable to find or read "config.xml" in the CWD. The "release-cordova" command must be executed in a Cordova project folder.`));
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

export function isValidPlatform(platform: string): boolean {
  switch (platform.toLowerCase()) {
    case "android":
    case "ios":
      return true;
    default:
      return false;
  }
}

// Check whether the Cordova or PhoneGap CLIs are
// installed, and if not, fail early
export function getCordovaOrPhonegapCLI(): string {
  var cordovaCLI: string = "cordova";

  try {
    which.sync(cordovaCLI);
    return cordovaCLI;
  } catch (e) {
    cordovaCLI = "phonegap";
    which.sync(cordovaCLI);
    return cordovaCLI;
  }
}