import * as _ from "lodash";
import * as fs from "async-file";
import * as path from "path";

import { ClientResponse, MobileCenterClient, clientRequest, models } from "../../util/apis/index";
import { ErrorCodes, failure } from "../../util/commandline/index";
import { Question, Questions } from "../../util/interaction/prompt";
import { out, prompt } from "../../util/interaction/index";

import { IRemoteApp } from './models/i-remote-app';
import { IProjectDescription } from "./models/project-description";
import collectBuildGradleInfo from "./android/collect-build-gradle-info";
import { glob } from "../../util/misc/promisfied-glob";

type BranchConfigurations = { [branchName: string]: models.BranchConfiguration };

export async function getProjectDescription(client: MobileCenterClient,
  appDir: string,
  remoteApp: IRemoteApp,
  branchName: string,
  reactNativeProjectPath: string,
  androidModule: string,
  androidBuildVariant: string,
  iosProjectPath: string,
  iosPodfilePath: string): Promise<IProjectDescription> {

  out.text("");
  out.text("And now we are going to collect some information about your project.");
  out.text("We can fetch it either from your build configuration");
  out.text("on the Mobile Center portal or ask you to provide it manually.");
  let inputManually = false;
  let projectDescription: IProjectDescription;

  const branches = await getBranchesWithBuilds(client, remoteApp);
  const branchConfigurations = await getBranchConfigurations(client, remoteApp, branches);
  branchName = await inquireBranchName(branches, branchConfigurations, branchName);

  if (!branchName)
    inputManually = true;
  else {
    const branchResponse = await out.progress("Getting branch configuration ...",
      clientRequest<models.BranchConfiguration>(cb =>
        client.branchConfigurations.get(branchName, remoteApp.ownerName, remoteApp.appName, cb)));

    if (branchResponse.response.statusCode >= 400) {
      inputManually = true;
    } else {
      return await getProjectDescriptionFromBranch(remoteApp, appDir, branchResponse, reactNativeProjectPath, androidModule, androidBuildVariant, iosProjectPath, iosPodfilePath);
    }
  }

  if (inputManually)
    return inquireProjectDescription(remoteApp, appDir, androidModule, reactNativeProjectPath, androidBuildVariant, iosProjectPath, iosPodfilePath);
}

export async function getProjectDescriptionNonInteractive(client: MobileCenterClient,
  remoteApp: IRemoteApp,
  appDir: string,
  branchName: string,
  reactNativeProjectPath: string,
  androidModule: string,
  androidBuildVariant: string,
  iosProjectPath: string,
  iosPodfilePath: string): Promise<IProjectDescription> {

  let projectDescription: IProjectDescription;

  const branches = await getBranchesWithBuilds(client, remoteApp);

  if (branchName) {
    const branchResponse = await out.progress("Getting branch configuration ...",
      clientRequest<models.BranchConfiguration>(cb =>
        client.branchConfigurations.get(branchName, remoteApp.ownerName, remoteApp.appName, cb)));

    if (branchResponse.response.statusCode >= 400) {
      throw failure(ErrorCodes.Exception, "An error during getting branch configuration.");
    } else {
      return await getProjectDescriptionFromBranch(remoteApp, appDir, branchResponse, reactNativeProjectPath, androidModule, androidBuildVariant, iosProjectPath, iosPodfilePath);
    }
  }

  if ((remoteApp.os.toLowerCase() === "android" && remoteApp.os.toLowerCase() === "ios") && remoteApp.platform.toLowerCase() === "react-native") {
    if (remoteApp.os.toLowerCase() === "android") {
      if (!reactNativeProjectPath)
        throw failure(ErrorCodes.IllegalCommand, "You must specify --packageJsonPath argument.");

      androidModule = androidModule || (await findReactNativeGradleModules(appDir, reactNativeProjectPath))[0];
      return {
        moduleName: androidModule,
        buildVariant: androidBuildVariant,
        reactNativeProjectPath: reactNativeProjectPath && path.normalize(reactNativeProjectPath)
      };
    } else {
      iosProjectPath = iosProjectPath || (await findReactNativeIosProjectsAndWorkspaces(appDir, reactNativeProjectPath))[0];
      return {
        projectOrWorkspacePath: iosProjectPath,
        podfilePath: iosPodfilePath,
        reactNativeProjectPath: reactNativeProjectPath && path.normalize(reactNativeProjectPath)
      };
    }
  }

  if (remoteApp.os.toLowerCase() === "android" && remoteApp.platform.toLowerCase() === "java") {

    if (!androidModule || !androidBuildVariant)
      throw failure(ErrorCodes.IllegalCommand, "You must specify --android-module and --android-build-variant arguments.");
    return {
      moduleName: androidModule,
      buildVariant: androidBuildVariant
    }
  }

  if (remoteApp.os.toLowerCase() === "ios" && remoteApp.platform.toLowerCase() === "objective-c-swift" || remoteApp.platform.toLowerCase() === "react-native") {
    if (!iosProjectPath)
      throw failure(ErrorCodes.IllegalCommand, "You must specify --ios-project-path argument.");
    return {
      projectOrWorkspacePath: iosProjectPath,
      podfilePath: iosPodfilePath
    }
  }

  throw failure(ErrorCodes.Exception, "Unsupported OS/Platform");
}

async function getProjectDescriptionFromBranch(
  remoteApp: IRemoteApp,
  appDir: string,
  branchResponse: ClientResponse<models.BranchConfiguration>,
  reactNativeProjectPath: string,
  androidModule: string,
  androidBuildVariant: string,
  iosProjectPath: string,
  iosPodfilePath: string) {
  if (remoteApp.platform.toLowerCase() === "react-native" && !androidModule) {
    if (branchResponse.result.toolsets.android) {
      return {
        moduleName: androidModule || path.join(path.dirname(branchResponse.result.toolsets.android.gradleWrapperPath), "app"),
        buildVariant: androidBuildVariant || branchResponse.result.toolsets.android.buildVariant,
        reactNativeProjectPath: path.normalize(reactNativeProjectPath || path.dirname(branchResponse.result.toolsets.javascript.packageJsonPath))
      }
    }
    if (branchResponse.result.toolsets.xcode) {
      return {
        projectOrWorkspacePath: iosProjectPath || branchResponse.result.toolsets.xcode.projectOrWorkspacePath,
        podfilePath: iosPodfilePath || branchResponse.result.toolsets.xcode.podfilePath,
        reactNativeProjectPath: path.normalize(reactNativeProjectPath || path.dirname(branchResponse.result.toolsets.javascript.packageJsonPath))
      }
    }
  } else {
    if (branchResponse.result.toolsets.android) {
      return {
        moduleName: androidModule || branchResponse.result.toolsets.android.module,
        buildVariant: androidBuildVariant || branchResponse.result.toolsets.android.buildVariant
      }
    }
    if (branchResponse.result.toolsets.xcode) {
      return {
        projectOrWorkspacePath: iosProjectPath || branchResponse.result.toolsets.xcode.projectOrWorkspacePath,
        podfilePath: iosPodfilePath || branchResponse.result.toolsets.xcode.podfilePath
      }
    }
  }

  throw new Error("Unsupported OS/Platform");
}

async function getBranchesWithBuilds(client: MobileCenterClient, app: IRemoteApp): Promise<models.BranchStatus[]> {
  let branchesStatusesRequestResponse: ClientResponse<models.BranchStatus[]>;
  try {
    branchesStatusesRequestResponse = await out.progress(`Getting statuses for branches of app ${app.appName}...`,
      clientRequest<models.BranchStatus[]>((cb) => client.builds.listBranches(app.ownerName, app.appName, cb)));
  } catch (error) {
    return [];
  }

  return _(branchesStatusesRequestResponse.result)
    .filter((branch) => !_.isNil(branch.lastBuild))
    .sortBy((b) => b.lastBuild.sourceBranch)
    .value();
}

async function getBranchConfigurations(client: MobileCenterClient, app: IRemoteApp, branches: models.BranchStatus[]): Promise<BranchConfigurations> {
  let branchConfigurationsRequestResponse: ClientResponse<models.BranchConfiguration>[];
  try {
    branchConfigurationsRequestResponse = await out.progress(`Getting branch configurations of app ${app.appName}...`,
      Promise.all(branches.map(branch =>
        clientRequest<models.BranchConfiguration>((cb) => client.branchConfigurations.get(branch.lastBuild.sourceBranch, app.ownerName, app.appName, cb)))));
  } catch (error) {
    return {};
  }

  const branchConfigurations: BranchConfigurations = {};
  for (let i = 0, length = branchConfigurationsRequestResponse.length; i < length; i++) {
    branchConfigurations[branches[i].lastBuild.sourceBranch] = branchConfigurationsRequestResponse[i].result;
  }

  return branchConfigurations;
}

async function inquireBranchName(branches: models.BranchStatus[], branchConfigurations: BranchConfigurations, branchName: string): Promise<string> {
  const choices = [
    "Input manually..."
  ].concat(branches.map(x => getChoiceName(x.lastBuild.sourceBranch)));

  const question: Question = {
    type: "list",
    name: "answer",
    message: "Where do you want to get project settings from?",
    choices: choices
  };
  const answers = await prompt.autoAnsweringQuestion(question, getChoiceName(branchName));
  const answerIndex = choices.indexOf((answers as any).answer);

  return answerIndex === 0 ? null : branches[answerIndex - 1].lastBuild.sourceBranch;

  function getChoiceName(branchName: string): string {
    const branchConfiguration = branchConfigurations[branchName];
    let name = branchName;
    switch (branchConfiguration && _.first(_.keys(branchConfiguration.toolsets))) {
      case "android":
        const android = branchConfiguration.toolsets.android;
        return `${name} [Android Module: ${android.module}, Build Variant: ${android.buildVariant}]`;
      case "xcode":
        const xcode = branchConfiguration.toolsets.xcode;
        return `${name} [Project/Workspace: ${xcode.projectOrWorkspacePath}, Shared Scheme: ${xcode.scheme}]`;
      case "xamarin": return name;
      case "javascript": return name;
      default: return name;
    }
  }
}

async function inquireProjectDescription(
  app: IRemoteApp,
  appDir: string,
  reactNativeProjectPath: string,
  androidModule: string,
  androidBuildVariant: string,
  iosProjectPath: string,
  iosPodfilePath: string): Promise<IProjectDescription> {

  if (app.platform.toLowerCase() === "react-native") {
    const reactNativeProjectsPaths = await findReactNativeProjects(appDir);
    if (!reactNativeProjectsPaths || !reactNativeProjectsPaths.length)
      throw failure(ErrorCodes.Exception, "No React-Native projects found.");
    const question: Question = {
      type: "list",
      name: "reactNativeProjectPath",
      message: "Package.json path:",
      choices: reactNativeProjectsPaths.map(path.normalize)
    };

    const answers = await prompt.autoAnsweringQuestion(question, reactNativeProjectPath && path.normalize(reactNativeProjectPath));
    reactNativeProjectPath = (answers as any).reactNativeProjectPath as string;
    return {
      reactNativeProjectPath: reactNativeProjectPath && path.normalize(reactNativeProjectPath)
    };
  }

  if (app.os.toLowerCase() === "android") {
    let gradleModules: string[];
    if (app.platform.toLowerCase() === "java") {
      gradleModules = await findGradleModules(appDir);
    } else {
      gradleModules = await findReactNativeGradleModules(appDir, reactNativeProjectPath);
    }

    if (!gradleModules || !gradleModules.length)
      throw failure(ErrorCodes.Exception, "No Android/Java modules found.")

    const question: Question = {
      type: "list",
      name: "moduleName",
      message: "Gradle Module name:",
      choices: gradleModules.map(path.normalize)
    };
    const answers = await prompt.autoAnsweringQuestion(question, androidModule && path.normalize(androidModule));
    const moduleName = (answers as any).moduleName as string;
    if (moduleName) {
      const filePath = path.join(appDir, moduleName, "build.gradle");
      const buildGradle = await collectBuildGradleInfo(filePath);
      if (buildGradle.buildVariants && buildGradle.buildVariants.length) {
        let question: Question = {
          type: "list",
          name: "buildVariant",
          message: "Build Variant:",
          choices: buildGradle.buildVariants.map(x => x.name)
        };
        const answers = await prompt.autoAnsweringQuestion(question, androidBuildVariant);

        if (app.platform.toLowerCase() === "java") {
          return {
            moduleName,
            buildVariant: (answers as any).buildVariant as string
          };
        } else {
          return {
            moduleName,
            buildVariant: (answers as any).buildVariant as string,
            reactNativeProjectPath: reactNativeProjectPath && path.normalize(reactNativeProjectPath)
          };
        }
      } else
        throw new Error(`Incorrect file format: ${filePath}`);
    }
  }

  if (app.os.toLowerCase() === "ios") {
    let projectsAndWorkspaces: string[];
    if (app.platform.toLowerCase() === "objective-c-swift") {
      projectsAndWorkspaces = await findIosProjectsAndWorkspaces(appDir);
    } else {
      projectsAndWorkspaces = await findReactNativeIosProjectsAndWorkspaces(appDir, reactNativeProjectPath);
    }
    if (!projectsAndWorkspaces.length)
      throw failure(ErrorCodes.Exception, "No XCode projects/workspaces found.")

    let question: Question = {
      type: "list",
      name: "projectOrWorkspacePath",
      message: "Project/Workspace path:",
      choices: projectsAndWorkspaces.map(path.normalize)
    };
    let answers = await prompt.autoAnsweringQuestion(question, iosProjectPath && path.normalize(iosProjectPath));
    const projectOrWorkspacePathAnswer = (answers as any).projectOrWorkspacePath as string;

    if (app.platform.toLowerCase() === "objective-c-swift") {
      return {
        projectOrWorkspacePath: projectOrWorkspacePathAnswer,
        podfilePath: iosPodfilePath
      };
    } else {
      return {
        projectOrWorkspacePath: projectOrWorkspacePathAnswer,
        podfilePath: iosPodfilePath,
        reactNativeProjectPath: reactNativeProjectPath && path.normalize(reactNativeProjectPath)
      };
    }
  }

  throw new Error(`Unsupported OS/Platform: ${app.os}/${app.platform}`);
}

async function findReactNativeProjects(appDir: string) {
  const files = await glob(path.join(appDir, "**/package.json"), { ignore: ["**/node_modules/**/*"] });
  const reactNativeProjectsPaths: string[] = [];
  for (const file of files) {
    if ((await glob(path.join(path.dirname(file), "index.android.js"))).length || (await glob(path.join(path.dirname(file), "index.ios.js"))).length) {
      reactNativeProjectsPaths.push(path.dirname(file));
    }
  }

  return reactNativeProjectsPaths.map(p => path.relative(appDir, p)).sort((a, b) => a.split("/").length - b.split("/").length);
}

async function findReactNativeGradleModules(appDir: string, reactNativeProjectPath: string) {
  const modules = await findGradleModules(path.join(appDir, reactNativeProjectPath));
  return modules.sort((a, b) => a.split("/").length - b.split("/").length);
}

async function findReactNativeIosProjectsAndWorkspaces(appDir: string, reactNativeProjectPath: string) {
  const modules = await findIosProjectsAndWorkspaces(path.join(appDir, reactNativeProjectPath));
  return modules.sort((a, b) => a.split("/").length - b.split("/").length);
}

async function findGradleModules(appDir: string): Promise<string[]> {
  const files = await glob(path.join(appDir, "**/build.gradle"), { ignore: ["**/node_modules/**/*"] });
  const modules: string[] = [];
  for (let file of files) {
    let contents = await fs.readTextFile(file);
    if (/apply plugin:\s*['"]com\.android\.application['"]/m.test(contents)) {
      modules.push(path.relative(appDir, path.dirname(file)) || ".");
    }
  }
  return modules.sort((a, b) => a.split("/").length - b.split("/").length);;
}

async function findIosProjectsAndWorkspaces(appDir: string): Promise<string[]> {
  let dirs = await glob(path.join(appDir, "**/*.*(xcworkspace|xcodeproj)/"), { ignore: ["**/node_modules/**/*"] });

  const xcworkspaceDirs = dirs
    .filter(x => path.extname(x).toLowerCase() === ".xcworkspace")
    .map(x => path.join(path.dirname(x), path.basename(x, path.extname(x))));

  dirs = dirs.filter(x => path.extname(x).toLowerCase() === ".xcworkspace"
    || !~xcworkspaceDirs.indexOf(path.join(path.dirname(x), path.basename(x, path.extname(x)))));

  return dirs.map(d => path.relative(appDir, d)).sort((a, b) => a.split("/").length - b.split("/").length);
}