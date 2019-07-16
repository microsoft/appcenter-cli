# Introduction

Visual Studio App Center command line interface (cli) is a unified tool for running App Center services from the command line.
Our aim is to offer a concise and powerful tool for our developers to use App Center services and easily script a sequence of
commands that they'd like to execute. You can currently login and view/configure all the apps that you have access to in App Center.

# Prerequisites

App Center CLI requires Node.js version 10 or better.

# Installation

```
npm install -g appcenter-cli
```

Once installed, use the `appcenter` command. See below for the available commands.

# Getting Help

To get a top level list of the available commands, run `appcenter help`.

To get help on a specific command or category, run `appcenter help command` or pass the `-h` flag to any command or category name.

App Center SDK support is provided directly within the App Center portal. Any time you need help, just log in to [App Center](https://appcenter.ms), then click the blue chat button in the lower-right corner of any page and our dedicated support team will respond to your questions and feedback. For additional information, see the [App Center Help Center](https://intercom.help/appcenter/getting-started/welcome-to-app-center-support).

# Commands

Below is the list of commands currently supported by Visual Studio App Center CLI:

| Command                               | Description                                                    |
| ------------------------------------- | -------------------------------------------------------------- |
| `appcenter help` | Get help using appcenter commands |
| `appcenter login` | Log in |
| `appcenter logout` | Log out |
| `appcenter setup-autocomplete` | Setup tab completion for your shell |
| | |
| `appcenter analytics app-versions` | Shows versions of the application |
| `appcenter analytics audience` | Show audience statistics |
| `appcenter analytics log-flow` | Command to see the incoming logs in real time |
| `appcenter analytics sessions` | Show statistics for sessions |
| `appcenter analytics events delete` | Delete event |
| `appcenter analytics events show` | Show statistics for events |
| | |
| `appcenter apps create` | Create a new app |
| `appcenter apps delete` | Delete an app |
| `appcenter apps get-current` | Get the application that's set as default for all CLI commands |
| `appcenter apps list` | Get list of configured applications |
| `appcenter apps set-current` | Set default application for all CLI commands. Not compatible when authenticating with '--token' or an environment variable. Use environment variable 'MOBILE_CENTER_CURRENT_APP' to set the default app instead |
| `appcenter apps show` | Get the details of an app |
| `appcenter apps update` | Update an app |
| | |
| `appcenter build download` | Download the binary, logs or symbols for a completed build |
| `appcenter build logs` | Displays log for build |
| `appcenter build queue` | Queue a new build |
| `appcenter build branches list` | Show list of branches |
| `appcenter build branches show` | Show branch build status |
| | |
| `appcenter codepush patch` | Update the metadata for an existing CodePush release |
| `appcenter codepush promote` | Create a new release for the destination deployment, which includes the exact code and metadata from the latest release of the source deployment |
| `appcenter codepush release-cordova` | Release a Cordova update to an app deployment |
| `appcenter codepush release-electron` | Release an Electron update to a deployment |
| `appcenter codepush release-react` | Release a React Native update to an app deployment |
| `appcenter codepush release` | Release an update to an app deployment |
| `appcenter codepush rollback` | Rollback a deployment to a previous release |
| `appcenter codepush deployment add` | Add a new deployment to an app |
| `appcenter codepush deployment clear` | Clear the release history associated with a deployment |
| `appcenter codepush deployment history` | Display the release history for a CodePush deployment |
| `appcenter codepush deployment list` | List the deployments associated with an app |
| `appcenter codepush deployment remove` | Remove CodePush deployment |
| `appcenter codepush deployment rename` | Rename CodePush deployment |
| | |
| `appcenter crashes upload-mappings` | Upload the Android mappings for the application |
| `appcenter crashes upload-missing-symbols` | Upload missing crash symbols for the application (only from macOS) |
| `appcenter crashes upload-symbols` | Upload the crash symbols for the application |
| | |
| `appcenter distribute release` | Upload release binary and trigger distribution |
| `appcenter distribute groups create` | Create new distribution group |
| `appcenter distribute groups delete` | Deletes the distribution group |
| `appcenter distribute groups download` | Download release package for the distribution group |
| `appcenter distribute groups list` | Lists all distribution groups of the app |
| `appcenter distribute groups show` | Shows information about the distribution group |
| `appcenter distribute groups update` | Update existing distribution group |
| `appcenter distribute releases add-destination` | Distributes an existing release to an additional destination |
| `appcenter distribute releases delete` | Deletes the release |
| `appcenter distribute releases edit` | Toggles enabling and disabling the specified release |
| `appcenter distribute releases list` | Shows the list of all releases for the application |
| `appcenter distribute releases show` | Shows full details about release |
| | |
| `appcenter orgs create` | Create a new organization |
| `appcenter orgs list` | Lists organizations in which current user is collaborator |
| `appcenter orgs show` | Show information about organization |
| `appcenter orgs update` | Update organization information |
| `appcenter orgs apps list` | Lists applications of organization |
| `appcenter orgs collaborators list` | Lists collaborators of organization |
| `appcenter orgs collaborators update` | Update list of organization collaborators |
| | |
| `appcenter profile list` | Get information about logged in user |
| `appcenter profile update` | Update user information |
| | |
| `appcenter telemetry off` | Turn off the sending of telemetry |
| `appcenter telemetry on` | Turn on the sending of telemetry |
| | |
| `appcenter test download` | Download the report artifacts, unpack and merge them. This command is only available for UITest and Appium test runs |
| `appcenter test status` | Checks the status of the started test run |
| `appcenter test stop` | Stop the started test run |
| `appcenter test wizard` | Start a test run interactively. All the parameters will be prompted on-the-go |
| `appcenter test generate appium` | Generates an Appium project |
| `appcenter test generate uitest` | Generates a Xamarin.UITest project |
| `appcenter test prepare appium` | Creates an artifacts directory with Appium tests |
| `appcenter test prepare calabash` | Creates an artifacts directory with Calabash tests |
| `appcenter test prepare espresso` | Creates an artifacts directory with Espresso tests |
| `appcenter test prepare uitest` | Creates an artifacts directory with Xamarin UI Tests |
| `appcenter test prepare xcuitest` | Creates an artifacts directory with XCUITest tests |
| `appcenter test run appium` | Starts a test run with Appium tests |
| `appcenter test run calabash` | Starts a test run with Calabash tests |
| `appcenter test run espresso` | Starts a test run with Espresso tests |
| `appcenter test run manifest` | Starts a test run with previously prepared artifacts |
| `appcenter test run uitest` | Starts a test run with Xamarin UI Tests |
| `appcenter test run xcuitest` | Starts a test run with XCUITest tests |
| | |
| `appcenter tokens create` | Create a new API token |
| `appcenter tokens delete` | Delete an API token |
| `appcenter tokens list` | Get a list of API tokens |

Please use the `appcenter help` command to get more information about each one.

# Contributing

Please see the [contributing](./contributing.md) file
for an introduction to the codebase and what the various moving parts are.

# Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact opencode@microsoft.com with any additional questions or comments.
