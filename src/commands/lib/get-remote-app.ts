import { ErrorCodes, failure } from "../../util/commandline/index";
import { MobileCenterClient, clientRequest, models } from "../../util/apis/index";
import { Question, Questions, Separator } from "../../util/interaction/prompt";
import { out, prompt } from "../../util/interaction/index";

import { IRemoteApp } from "./models/i-remote-app";
import { toDefaultApp } from "../../util/profile/index";
import { getAppSecret as getAppSecretIos } from "./ios/inject-sdk-ios";

export async function getRemoteApp(client: MobileCenterClient,
  appName: string,
  os: string,
  platform: string,
  createNew: boolean,
  appDir: string): Promise<IRemoteApp> {

  out.text("");
  out.text(`It's time to specify which ${getOsPlatformText(os, platform)} Mobile Center app`);
  out.text("is associated with your local code.");
  if (!createNew) {
    let apps = await fetchApps(client);
    apps = apps.filter(app =>
      (!os || app.os.toLowerCase() === os.toLowerCase()) &&
      (!platform || app.platform.toLowerCase() === platform.toLowerCase()));

    const appSecret = await getAppSecret(os, appDir);
    if (appSecret) {
      apps = apps.sort((a,b) => b.appSecret === appSecret ? 1 : 0);
    }

    appName = await inquireAppName(apps, appName);

    if (!appName)
      createNew = true;
    else 
      return fetchApp(client, appName);
  } else if (createNew) {
    await inquireAppName([]);
  }

  if (createNew) {
    const newAppDetails = await inquireNewAppDetails(appName, os, platform);
    const app = await createApp(client, newAppDetails);
    out.text(`A new ${app.ownerName}/${app.appName} (${app.os}/${app.platform}) app`);
    out.text("has been succesfully created on the Mobile Center portal.");
    return app;
  }
}

function getOsPlatformText(os: string, platform: string) {
  os = os && ({ ios: "iOS", android: "Android" } as any)[os.toLowerCase()];
  platform = platform && ({
    'java': "Java",
    'react-native': "React-Native",
    'xamarin': "Xamarin",
    'objective-c-swift': "Objective-C/Swift"
  } as any)[platform.toLowerCase()];

  return (os || "") + ((os && platform) ? "/" : "") + (platform || "");
}

async function getAppSecret(os: string, appDir: string) {
  switch (os.toLowerCase()) {
    case "android": return null;
    case "ios": return await getAppSecretIos(appDir);
  }
}

export async function getRemoteAppNonInteractive(client: MobileCenterClient,
  appName: string,
  os: string,
  platform: string,
  createNew: boolean): Promise<IRemoteApp> {

  if (!appName)
    throw failure(ErrorCodes.IllegalCommand, "In non-interactive mode you must use --app(-android/-ios) argument.");

  if (createNew) {
    const appRequest: models.AppRequest = {
      displayName: appName,
      os,
      platform
    };
    
    return createApp(client, appRequest);
  } else
    return fetchApp(client, appName);
}

async function fetchApps(client: MobileCenterClient): Promise<models.AppResponse[]> {
  const appsResponse = await out.progress("Getting app list ...",
    clientRequest<models.AppResponse[]>(cb => client.apps.list(cb)));

  if (appsResponse.response.statusCode >= 400) {
    throw failure(ErrorCodes.Exception, "Unknown error when loading apps");
  }

  return appsResponse.result;
}

async function fetchApp(client: MobileCenterClient, appName: string): Promise<IRemoteApp> {
  const app = toDefaultApp(appName);
  if (!app) {
    throw failure(ErrorCodes.InvalidParameter, `'${appName}' is not a valid application id`);
  }

  const appDetailsResponse = await out.progress("Getting app details ...",
    clientRequest<models.AppResponse>(cb => client.apps.get(app.ownerName, app.appName, cb)));

  const statusCode = appDetailsResponse.response.statusCode;

  if (statusCode >= 400) {
    switch (statusCode) {
      case 400:
        throw failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
      case 404:
        throw failure(ErrorCodes.NotFound, `the app "${app.identifier}" could not be found`);
      default:
        throw failure(ErrorCodes.Exception, "Unknown error when loading apps");
    }
  }

  return {
    appName: appDetailsResponse.result.name,
    ownerName: appDetailsResponse.result.owner.name,
    appSecret: appDetailsResponse.result.appSecret,
    os: appDetailsResponse.result.os,
    platform: appDetailsResponse.result.platform
  }
}

async function createApp(client: MobileCenterClient, newAppDetails: models.AppRequest): Promise<IRemoteApp> {
  const createAppResponse = await out.progress("Creating app ...",
      clientRequest<models.AppResponse>(cb => client.apps.create(newAppDetails, cb))
    );
    const statusCode = createAppResponse.response.statusCode;
    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
          throw failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
        case 404:
          throw failure(ErrorCodes.NotFound, "there appears to be no such user");
        case 409:
          throw failure(ErrorCodes.IllegalCommand, "an app with this 'name' already exists");
      }
    }

    return {
      appName: createAppResponse.result.name,
      ownerName: createAppResponse.result.owner.name,
      appSecret: createAppResponse.result.appSecret,
      os: createAppResponse.result.os,
      platform: createAppResponse.result.platform
    }
}

async function inquireAppName(apps: models.AppResponse[], appName?: string): Promise<string> {
  const createNewText: string = "Create new...";
  
  const question: Question = {
    type: "list",
    name: "appName",
    message: "Mobile Center app to work with:",
    choices: [createNewText].concat(apps.map(app => `${app.owner.name}/${app.name}`))
  };
  const answers = await prompt.autoAnsweringQuestion(question, appName);

  return answers.appName === createNewText ? null : answers.appName as string;
}

async function inquireNewAppDetails(appName: string, os: string, platform: string): Promise<models.AppRequest> {
  let question: Question = {
    type: "input",
    name: "appName",
    message: "New app's name:"
  };
  let answers = await prompt.autoAnsweringQuestion(question, appName);
  const appNameAnswer = answers.appName as string;

  question = {
    type: "list",
    name: "os",
    message: "New app's OS:",
    choices: ["iOS", "Android"]
  };
  answers = await prompt.autoAnsweringQuestion(question, os);
  const osAnswer = answers.os as string;

  const platforms: string[] = [];
  if (osAnswer === "iOS") {
    platforms.push("Objective-C-Swift", "React-Native", "Xamarin");
  }
  if (osAnswer === "Android") {
    platforms.push("Java", "React-Native", "Xamarin");
  }
  if (!platforms.length)
    throw failure(ErrorCodes.Exception, `Unsupported OS: ${os}`);
    
  question = {
    type: "list",
    name: "platform",
    message: "New app's platform:",
    choices: platforms
  };
  answers = await prompt.autoAnsweringQuestion(question, platform);
  const platformAnswer = answers.platform as string;

  return {
    displayName: appNameAnswer,
    os: osAnswer,
    platform: platformAnswer
  };
}