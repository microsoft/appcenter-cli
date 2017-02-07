import * as os from "os";

export module Messages {
  export module TestCloud {
    export module Commands {
      export const GenerateUITest = "Generates a Xamarin.UITest project";

      export const PrepareAppium = "Creates artifacts directory with Appium tests.";
      export const PrepareCalabash = `Creates artifacts directory with Calabash tests.${os.EOL}` + 
                                     `Required external tools:${os.EOL}` + 
                                     `- Ruby ${os.EOL}` + 
                                     `- Gem xamarin-test-cloud`;
      export const PrepareEspresso = "Creates artifacts directory with Espresso tests.";
      export const PrepareUITests = `Creates artifacts directory with Xamarin UI Tests.${os.EOL}` +
                                    `Required external tools:${os.EOL}` + 
                                    `- .NET Framework on Windows, Mono Runtime on OS X${os.EOL}` + 
                                    `- NuGet package Xamarin.UITests, version 2.0.1 or higher`;

      export const RunAppium = "Starts test run with Appium tests.";
      export const RunCalabash = `Starts test run with Calabash tests.${os.EOL}` + 
                                 `Required external tools:${os.EOL}` + 
                                 `- Ruby ${os.EOL}` + 
                                 `- Gem xamarin-test-cloud`;
      export const RunEspresso = "Starts test run with Espresso tests.";
      export const RunManifest = "Starts test run with previously prepared artifacts.";
      export const RunUITests = `Starts test run with Xamarin UI Tests.${os.EOL}` + 
                                `Required external tools:${os.EOL}` + 
                                `- .NET Framework on Windows, Mono Runtime on OS X${os.EOL}` + 
                                `- NuGet package Xamarin.UITests, version 2.0.1 or higher`;

      export const Status = "Checks status of started test run.";
    }

    export module Arguments {
      export const Include = 'Additional files and directories to include. The value must be either path relative to the input directory, or be in format "targetDir=sourceDir"';
      export const TestParameter = 'Additional test parameters. The value must be in format "key=value"';
      export const AppPath = "Path to an application file";
      export const AppPlatform = "The app's platform ('ios' or 'android')";

      export const GemerateOutputPath = "The path where the tests will be generated";

      export const PrepareArtifactsDir = "Path to artifacts directory to create";
      export const RunDevices = "Device selection slug";
      export const RunDSymDir = "Path to directory with iOS symbol files";
      export const RunLocale = "Locale (OS language) of the test run. For example, en-US";
      export const RunTestSeries = "Name of the test series";
      export const RunAsync = "Exit the command when tests are uploaded, without waiting for test results";

      export const AppiumBuildDir = "Path to directory with Appium tests (usually <project>/target/upload)";
      
      export const CalabashProjectDir = 'Path to Calabash workspace directory (usually <project>/features)';
      export const CalabashSignInfo = "Use Signing Info for signing the test server";
      export const CalabashConfigPath = "Path to Cucumber configuration file (usually cucumber.yml)";
      export const CalabashProfile = "Profile to run. It must exist in the configuration file";
      export const CalabashSkipConfigCheck = "Force running without Cucumber profile";
      
      export const EspressoBuildDir = "Path to Espresso output directory (usually <project>/build/outputs/apk)";
      export const EspressoTestApkPath = "Path to *.apk file with Espresso tests. If not set, build-dir is used to discover it";

      export const UITestsBuildDir = "Path to directory with built test assemblies (usually <project>/bin/<configuration>)";
      export const UITestsStoreFilePath = "Path to the keystore file";
      export const UITestsStorePassword = 'Password to the keystore. Corresponds to the "-storepass" argument in jarsigner';
      export const UITestsKeyAlias = 'Alias to the key in the keystore. Corresponds to the "-alias" argument in jarsigner';
      export const UITestsKeyPassword = 'Password to the matching private key in the keystore. Corresponds to the "-keypass" argument in jarsigner';
      export const UITestsSignInfo = "Use Signing Info for signing the test server.";
      export const UITestsToolsDir = "Path to directory with Xamarin UI Tests tools that contains test-cloud.exe";

      export const StatusTestRunId = "ID of started test run";
      export const StatusContinuous = "Continuously checks test run status until it completes";
    }
  }
}