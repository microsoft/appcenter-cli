import { IMainActivity } from './models/main-activity';
import { IBuildGradle } from './models/build-gradle';
import injectSdkMainActivity from "./inject-sdk-main-activity";
import injectSdkBuildGradle from "./inject-sdk-build-gradle";
import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";
import ejectSdkBuildGradle from "./eject-sdk-build-gradle";
import ejectSdkMainActivity from "./eject-sdk-main-activity";
import * as fs from "async-file";

/**
 * 
 * @param buildGradle 
 * IBuildGradle object
 * @param mainActivity
 * IMainActivity object 
 * @param sdkVersion 
 * The version of the Mobile Center SDK to integrate
 * @param appSecret 
 * The App Secret
 * @param sdkModules 
 * The argument of type enum (number) which uses three bits to hold flags. 
 * Each of the flags determines whether the corresponding Mobile Center SDK module is enabled or not.
 */

export async function injectAndroidJava(buildGradle: IBuildGradle, mainActivity: IMainActivity,
    sdkVersion: string, appSecret: string, sdkModules: MobileCenterSdkModule): Promise<void> {
  
  let buildGradleContents = ejectSdkBuildGradle(buildGradle);
  buildGradleContents = injectSdkBuildGradle(buildGradle.contents, sdkVersion, sdkModules);

  let mainActivityContents = ejectSdkMainActivity(mainActivity);
  mainActivityContents = injectSdkMainActivity(mainActivityContents, mainActivity.name, appSecret, sdkModules);

  await fs.writeFile(buildGradle.path, buildGradleContents, { encoding: "utf8" });
  await fs.writeFile(mainActivity.path, mainActivityContents, { encoding: "utf8" });
}

/**
 * Removes previous Mobile Center SDK integrations
 * 
 * @param buildGradle 
 * IBuildGradle object
 * @param mainActivity
 * IMainActivity object 
 */
export async function ejectAndroidJava(buildGradle: IBuildGradle, mainActivity: IMainActivity): Promise<void> {
  
  const buildGradleContents = ejectSdkBuildGradle(buildGradle);
  const mainActivityContents = ejectSdkMainActivity(mainActivity);

  await fs.writeFile(buildGradle.path, buildGradleContents, { encoding: "utf8" });
  await fs.writeFile(mainActivity.path, mainActivityContents, { encoding: "utf8" });
}




