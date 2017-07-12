import * as _ from "lodash";

import { ErrorCodes, failure } from "../../util/commandline/index";
import { out, prompt } from "../../util/interaction";

import { MobileCenterSdkModule } from "./models/mobilecenter-sdk-module";
import { Question } from "../../util/interaction/prompt";

export async function getSdkModules(platform: string, analytics: boolean, crashes: boolean, distribute: boolean, push: boolean): Promise<MobileCenterSdkModule> {
  out.text("");
  out.text("We almost done. The final thing to do is to select");
  out.text("a set of Mobile Center SDK modules to integrate.");
  return inquireSdkModules(platform, analytics, crashes, distribute, push);
}

export async function getSdkModulesNonInteractive(platform: string, analytics: boolean, crashes: boolean, distribute: boolean, push: boolean): Promise<MobileCenterSdkModule> {
  let sdkModules = MobileCenterSdkModule.None;
  if (analytics)
    sdkModules |= MobileCenterSdkModule.Analytics;
  if (crashes)
    sdkModules |= MobileCenterSdkModule.Crashes;
  if (distribute && platform.toLowerCase() != "react-native")
    sdkModules |= MobileCenterSdkModule.Distribute;
  if (push)
    sdkModules |= MobileCenterSdkModule.Push;

  if (!sdkModules)
    throw failure(ErrorCodes.IllegalCommand, "You must provide at least one of --analytics, --crashes, --distribute or --push flags.");
  
  return sdkModules;
}

async function inquireSdkModules(platform: string, analytics: boolean, crashes: boolean, distribute: boolean, push: boolean): Promise<MobileCenterSdkModule> {
  let choises = [];
  choises.push({
    name: "Analytics",
    value: "analytics"
  });
  choises.push({
    name: "Crashes",
    value: "crashes"
  });
  if (platform.toLowerCase() != "react-native") {
    choises.push({
      name: "Distribute",
      value: "distribute"
    });
  };
  choises.push({
    name: "Push",
    value: "push"
  });

  let questions: Question = {
    type: "checkbox",
    name: "modules",
    message: "Which modules do you want to integrate?",
    choices: choises,
    validate: (x: any) => {
      return x && x.length ? true : "Please choose at least one module";
    }
  };

  let modules: string[] = [];
  if (analytics)
    modules.push("analytics");
  if (crashes)
    modules.push("crashes");
  if (distribute && platform.toLowerCase() != "react-native")
    modules.push("distribute");
  if (push)
    modules.push("push");
  if (!modules.length)
     modules = null;

  const answers = await prompt.autoAnsweringQuestion(questions, modules);
  modules = answers.modules as string[];
  let sdkModules = MobileCenterSdkModule.None;
  if (_.includes(modules, "analytics"))
    sdkModules |= MobileCenterSdkModule.Analytics;
  if (_.includes(modules, "crashes"))
    sdkModules |= MobileCenterSdkModule.Crashes;
  if (_.includes(modules, "distribute"))
    sdkModules |= MobileCenterSdkModule.Distribute;
  if (_.includes(modules, "push"))
    sdkModules |= MobileCenterSdkModule.Push;

  return sdkModules;
}