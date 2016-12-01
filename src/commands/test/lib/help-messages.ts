import * as os from "os";

export module Messages {
  export module TestCloud {
    export module Commands {
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

      export const CheckState = "Checks status of started test run.";
    }
  }
}