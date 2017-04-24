import { expect } from "chai";
import * as Os from "os";
import * as Fs from "async-file";
import * as Path from "path";
import * as Mkdirp from "mkdirp";
import * as Rimraf from "rimraf";

import { GetAppSecretFromAppDelegate } from "../../../../../src/commands/lib/ios/sdk-integration-steps/get-app-secret-from-app-delegate";
import { SearchAppDelegateFile } from "../../../../../src/commands/lib/ios/sdk-integration-steps/search-app-delegate-file";
import { XcodeIntegrationStepContext } from "../../../../../src/commands/lib/ios/xcode-sdk-integration";
import { MobileCenterSdkModule } from "../../../../../src/commands/lib/models/mobilecenter-sdk-module";

describe("GetAppSecretFromAppDelegate", () => {
  interface PathContent {
    path: string;
    content: string;
  }

  const tempDirPath = Path.join(Os.tmpdir(), Math.random() * 100000000 + "-GetAppSecretFromAppDelegate");
  const testAppSecret = "2126acc3-3f3c-4416-b8d1-e7b5fd12bfa4";

  async function runStep(pathContentList: PathContent[]) {
    await Fs.createDirectory(tempDirPath);
    const context = new XcodeIntegrationStepContext(null, null, "***", MobileCenterSdkModule.All, null);
    context.projectRootDirectory = tempDirPath;

    for (const pathContent of pathContentList) {
      const path = Path.join(tempDirPath, pathContent.path);
      Mkdirp.sync(Path.dirname(path));
      await Fs.writeTextFile(path, pathContent.content);
    }

    await new SearchAppDelegateFile().run(context);
    await new GetAppSecretFromAppDelegate().run(context);

    return context.appSecret;
  };

  const appDelegateSwiftDefaultContent =
    `import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
        MSMobileCenter.start("${testAppSecret}", withServices: [MSAnalytics.self, MSCrashes.self, MSDistribute.self, MSPush.self])
        return true
    }
}`;
  const appDelegateHDefaultContent =
    `#import <UIKit/UIKit.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@end`;
  const appDelegateMDefaultContent =
    `#import "AppDelegate.h"

@interface AppDelegate ()
@end

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [MSMobileCenter start:@"${testAppSecret}" withServices:@[[MSAnalytics class], [MSCrashes class], [MSDistribute class], [MSPush class]]];
    return YES;
}
@end`;

  it("Get AppDelegate.swift app secret", async function () {
    const pathContentList: PathContent[] = [{ content: appDelegateSwiftDefaultContent, path: "project\\AppDelegate.swift" }];
    const appSecret = await runStep(pathContentList);

    expect(appSecret).to.eq(testAppSecret);
  });

  it("Get AppDelegate.m app secret", async function () {
    const pathContentList: PathContent[] = [
      { content: appDelegateHDefaultContent, path: "project\\AppDelegate.h" },
      { content: appDelegateMDefaultContent, path: "project\\AppDelegate.m" }
    ];
    const appSecret = await runStep(pathContentList);

    expect(appSecret).to.eq(testAppSecret);
  });
});