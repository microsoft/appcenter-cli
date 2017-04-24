import { expect } from "chai";
import * as Os from "os";
import * as Fs from "async-file";
import * as Path from "path";
import * as Mkdirp from "mkdirp";
import * as Rimraf from "rimraf";

import { SearchAppDelegateFile } from "../../../../../src/commands/lib/ios/sdk-integration-steps/search-app-delegate-file";
import { XcodeIntegrationStepContext } from "../../../../../src/commands/lib/ios/xcode-sdk-integration";
import { MobileCenterSdkModule } from "../../../../../src/commands/lib/models/mobilecenter-sdk-module";

describe("SearchAppDelegateFile", () => {
  interface PathContent {
    path: string;
    content: string;
  }

  const tempDirPath = Path.join(Os.tmpdir(), Math.random() * 100000000 + "-SearchAppDelegateFileTest");

  async function runStep(pathContentList: PathContent[]) {
    await Fs.createDirectory(tempDirPath);
    const context = new XcodeIntegrationStepContext(null, null, "***", MobileCenterSdkModule.All, null);
    context.projectRootDirectory = tempDirPath;

    for (const pathContent of pathContentList) {
      const path = Path.join(tempDirPath, pathContent.path);
      Mkdirp.sync(Path.dirname(path));
      await Fs.writeTextFile(path, pathContent.content);
    }

    await new SearchAppDelegateFile().run(context)
    return Path.relative(tempDirPath, context.appDelegateFile);
  };

  afterEach(() => Rimraf.sync(tempDirPath));

  const appDelegateSwiftDefaultContent = 
`import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
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
    return YES;
}
@end`;

  it("Search AppDelegate.swift", async function () {
    const pathContentList: PathContent[] = [{ content: appDelegateSwiftDefaultContent, path: "project\\AppDelegate.swift" }];
    const appDelegatePath = await runStep(pathContentList);

    expect(appDelegatePath).to.eq(pathContentList[0].path);
  });

  it("Search AppDelegate.m", async function () {
    const pathContentList: PathContent[] = [
      { content: appDelegateHDefaultContent, path: "project\\AppDelegate.h" },
      { content: appDelegateMDefaultContent, path: "project\\AppDelegate.m" }
    ];
    const appDelegatePath = await runStep(pathContentList);

    expect(appDelegatePath).to.eq(pathContentList[1].path);
  });

  it("Search top level AppDelegate.m", async function () {
    const pathContentList: PathContent[] = [
      { content: appDelegateSwiftDefaultContent, path: "project\\SomeDirectory\\AppDelegate.swift" },
      { content: appDelegateHDefaultContent, path: "project\\AppDelegate.h" },
      { content: appDelegateMDefaultContent, path: "project\\AppDelegate.m" }
    ];
    const appDelegatePath = await runStep(pathContentList);
    expect(appDelegatePath).to.eq(pathContentList[2].path);
  });

  it("Search top level AppDelegate.swift", async function () {
    const pathContentList: PathContent[] = [
      { content: appDelegateSwiftDefaultContent, path: "project\\AppDelegate.swift" },
      { content: appDelegateHDefaultContent, path: "project\\SomeDirectory\\AppDelegate.h" },
      { content: appDelegateMDefaultContent, path: "project\\SomeDirectory\\AppDelegate.m" }
    ];
    const appDelegatePath = await runStep(pathContentList);
    expect(appDelegatePath).to.eq(pathContentList[0].path);
  });
});