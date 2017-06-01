# Introduction

Mobile Center command line interface is a unified tool for running Mobile Center services from the command line. Our aim is to offer a concise and powerful tool for our developers to use Mobile Center services and easily script a sequence of commands that they'd like to execute. You can currently login and view/configure all the apps that you have access to in Mobile Center.

Although our current feature set is minimal, all the existing Mobile Center services will be added going forward. Note that the Mobile Center CLI is currently in public preview.

# Prerequisites

Mobile Center CLI requires Node.js version 6.3 or better. Do not use Node.js 7.1.0, there is a known issue that breaks the CLI code (and many other projects) on Windows 10. This bug has been fixed in later releases of Node.js 7.

# Installation

```
npm install -g mobile-center-cli
```

Once installed, use the `mobile-center` command. See below for the available commands.

# Getting Help

To get a top level list of the available commands, run `mobile-center help`.

To get help on a specific command or category, run `mobile-center help command` or pass the `-h` flag to any command or category name.

# Commands

Below is the list of commands currently supported by Mobile Center CLI:

| Command                               | Description                                                    |
| ------------------------------------- | -------------------------------------------------------------- |
| `mobile-center help` | Get command or category help |
| `mobile-center login` | Login to Mobile Center |
| `mobile-center logout` | Logout from Mobile Center |
| | |
| `mobile-center setup-autocomplete` | Setups autocompletion for the shell |
| | |
| `mobile-center analytics app-versions` | Shows versions of the application |
| `mobile-center analytics audience` | Show audience statistics |
| `mobile-center analytics sessions` | Show statistics for sessions |
| `mobile-center analytics events delete` | Delete event |
| `mobile-center analytics events show` | Show statistics for events |
| | |
| `mobile-center apps create` | Create a new app |
| `mobile-center apps delete` | Delete an app |
| `mobile-center apps get-current` | Get the application that's set as default for all CLI commands |
| `mobile-center apps list` | Get list of configured applications |
| `mobile-center apps set-current` | Set default application for all CLI commands |
| `mobile-center apps show` | Get the details of an app |
| `mobile-center apps update` | Update an app |
| | |
| `mobile-center build download` | Download the binary, logs or symbols for a completed build |
| `mobile-center build logs` | Displays log for build |
| `mobile-center build queue` | Queue a new build |
| `mobile-center build branches list` | Show list of branches |
| `mobile-center build branches show` | Show branch build status |
| | |
| `mobile-center crashes upload-missing-symbols` | Upload missing crash symbols for the application (only from macOS) |
| `mobile-center crashes upload-symbols` | Upload the crash symbols for the application |
| | |
| `mobile-center distribute release` | Upload release binary and trigger distribution |
| `mobile-center distribute groups create` | Create new distribution group |
| `mobile-center distribute groups delete` | Deletes the distribution group |
| `mobile-center distribute groups download` | Download release package for the distribution group |
| `mobile-center distribute groups list` | Lists all distribution groups of the app |
| `mobile-center distribute groups show` | Shows information about the distribution group |
| `mobile-center distribute groups update` | Update existing distribution group |
| `mobile-center distribute releases delete` | Deletes the release |
| `mobile-center distribute releases list` | Shows the list of all releases for the application |
| `mobile-center distribute releases show` | Shows full details about release |
| | |
| `mobile-center profile list` | Get information about logged in user |
| `mobile-center profile update` | Update user information |
| | |
| `mobile-center telemetry off` | Turn off the sending of telemetry |
| `mobile-center telemetry on` | Turn on the sending of telemetry |
| | |
| `mobile-center test status` | Checks the status of the started test run. |
| `mobile-center test generate appium` | Generates an Appium project |
| `mobile-center test generate uitest` | Generates a Xamarin.UITest project |
| `mobile-center test prepare appium` | Creates an artifacts directory with Appium tests. |
| `mobile-center test prepare calabash` | Creates an artifacts directory with Calabash tests. |
| `mobile-center test prepare espresso` | Creates an artifacts directory with Espresso tests. |
| `mobile-center test prepare uitest` | Creates an artifacts directory with Xamarin UI Tests. |
| `mobile-center test prepare xcuitest` | Creates an artifacts directory with XCUITest tests. |
| `mobile-center test run appium` | Starts a test run with Appium tests. |
| `mobile-center test run calabash` | Starts a test run with Calabash tests. |
| `mobile-center test run espresso` | Starts a test run with Espresso tests. |
| `mobile-center test run manifest` | Starts a test run with previously prepared artifacts. |
| `mobile-center test run uitest` | Starts a test run with Xamarin UI Tests. |
| `mobile-center test run xcuitest` | Starts a test run with XCUITest tests. |
| | |
| `mobile-center tokens create` | Create a new API token |
| `mobile-center tokens delete` | Delete an API token |
| `mobile-center tokens list` | Get a list of API tokens |

Please use the `mobile-center help` command to get more information about each one.

# Contributing

Please see the [contributing](./contributing.md) file
for an introduction to the codebase and what the various moving parts are.

# Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact opencode@microsoft.com with any additional questions or comments.
