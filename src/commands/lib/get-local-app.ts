import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";
import * as _ from "lodash";
import * as fs from "async-file";
import * as mkdirp from "mkdirp";
import * as path from "path";
import * as request from "request";

import { Answers, Question, Questions, Separator } from "../../util/interaction/prompt";
import { ErrorCodes, failure } from "../../util/commandline/index";
import { out, prompt } from "../../util/interaction";

import { ClientResponse } from "../../util/apis/index";
import { IAppBase } from './models/i-app-base';
import { ILocalApp } from "./models/i-local-app";
import { downloadFile } from "../../util/misc/promisfied-https";
import { glob } from "../../util/misc/promisfied-glob";

export async function getLocalApp(dir: string,
  os: string,
  platform: string,
  sampleApp: boolean): Promise<ILocalApp> {  
  
  const detectedApp = await detectLocalApp(dir);
  if (detectedApp) {
    out.text("");
    out.text(`An existing ${detectedApp.os ? detectedApp.os + "/" : ""}${detectedApp.platform} app has been detected.`);
    if (await prompt.confirm("Do you want to use it?"))
    return detectedApp;
  } 
  
  out.text("");
  out.text("If you don't have an app yet, we can download a sample one");
  out.text("for you to have a starting point.");
  const question: Question = {
    type: "confirm",
    name: "confirm",
    message: "Do you want to download a sample app?",
    default: false
  };
  const answers = await prompt.autoAnsweringQuestion(question, sampleApp || undefined);

  if (answers.confirm) {
    const appBase = await inquireOsPlatform(os, platform);
    const app = await downloadSampleApp(dir, appBase);
    out.text(`A sample ${app.os}/${app.platform} app has been succesfully downloaded`);
    out.text("into the following folder:");
    out.text(app.dir);
    return app;
  }

  return null;
}

export async function getLocalAppNonInteractive(dir: string,
  os: string,
  platform: string,
  sampleApp: boolean): Promise<ILocalApp> {

  if (sampleApp) {
    if (!platform)
      throw failure(ErrorCodes.IllegalCommand, "In non-interactive mode at least --platform argument is expected.");
    return downloadSampleApp(dir, { os, platform });
  }

  return detectLocalApp(dir);
}

async function downloadSampleApp(dir: string, app: IAppBase): Promise<ILocalApp> {
  const { uri, name } = getArchiveUrl(app.os, app.platform);
  const appDir = path.join(dir, name);
  const response = await out.progress(`Downloading the file... ${uri}`, downloadFile(uri));
  await out.progress("Unzipping the archive...", unzip(appDir, response.result));
  return {
    dir: appDir,
    os: app.os,
    platform: app.platform
  };

  function getArchiveUrl(os: string, platform: string): { uri: string, name: string } {
    switch (os && os.toLowerCase()) {
      case "android":
        switch (platform.toLowerCase()) {
          case "java": return { uri: "https://github.com/MobileCenter/quickstart-android/archive/master.zip", name: "android-sample" };
          case "react-native": break;
          case "xamarin": return { uri: "https://github.com/MobileCenter/quickstart-xamarin/archive/master.zip", name: "xamarin-sample" };
        }
      case "ios":
        switch (platform.toLowerCase()) {
          case "objective-c-swift": return { uri: "https://github.com/MobileCenter/quickstart-ios/archive/master.zip", name: "ios-sample" };
          case "react-native": break;
          case "xamarin": return { uri: "https://github.com/MobileCenter/quickstart-xamarin/archive/master.zip", name: "xamarin-sample" };
        }
    }

    throw failure(ErrorCodes.InvalidParameter, "Unsupported OS or platform");
  }

  async function unzip(directory: string, buffer: Buffer) {
    const zip = await new JsZip().loadAsync(buffer);
    for (const file of _.values(zip.files) as JSZipObject[]) {
      if (file.dir) {
        continue;
      }

      const match = /.+?\/(.+)/.exec(file.name);
      if (!match) {
        continue;
      }

      const filePath = path.join(directory, match[1]);
      const dirName = path.dirname(filePath);
      if (!await fs.exists(dirName)) {
        mkdirp.sync(dirName);
      }
      await fs.writeTextFile(filePath, await file.async("string"));
    }
  }
}

async function detectLocalApp(dir: string): Promise<ILocalApp> {
  const xcodeDirs = await glob(path.join(dir, "*.*(xcworkspace|xcodeproj)/"));
  if (xcodeDirs.length)
    return {
      dir,
      os: 'iOS',
      platform: "Objective-C-Swift"
    };
  const gradleFiles = await glob(path.join(dir, "build.gradle"));
  if (gradleFiles.length)
    return {
      dir,
      os: 'Android',
      platform: "Java"
    };
  const reactNativeFiles = [
    ...await glob(path.join(dir, "index.ios.js")),
    ...await glob(path.join(dir, "index.android.js")),
    ...await glob(path.join(dir, "package.json"))];
  if (reactNativeFiles.length)
    return {
      dir,
      os: null,
      platform: "React-Native"
    };
  return null;
}

async function inquireOsPlatform(osDefault: string, platformDefault: string): Promise<IAppBase> {
  let question: Question;
  let answers: Answers;

  question = {
    type: "list",
    name: "os",
    message: "Please choose OS:",
    choices: ["Android", "iOS"]
  };
  answers = await prompt.autoAnsweringQuestion(question, osDefault);
  const os = answers.os as string;

  const platforms: string[] = [];
  if (os.toLowerCase() === "ios") {
    platforms.push("Objective-C-Swift", "React-Native", "Xamarin");
  }
  if (os.toLowerCase() === "android") {
    platforms.push("Java", "React-Native", "Xamarin");
  }

  if (!platforms.length)
    throw failure(ErrorCodes.Exception, `Unsupported OS: ${os}`);

  question = {
    type: "list",
    name: "platform",
    message: "Please choose platform:",
    choices: platforms
  };
  answers = await prompt.autoAnsweringQuestion(question, platformDefault);
  const platform = answers.platform as string;

  return { os, platform };
}