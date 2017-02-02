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
| `mobile-center apps create` | Create a new app |
| `mobile-center apps delete` | Delete an app |
| `mobile-center apps get-current` | Get the application that's set as default for all CLI commands |
| `mobile-center apps list` | Get list of configured applications |
| `mobile-center apps set-current` | Set default application for all CLI commands |
| `mobile-center apps show` | Get the details of an app |
| `mobile-center apps update` | Update an app |
| | |
| `mobile-center profile list` | Get information about logged in user |
| `mobile-center profile update` | Update user information |
| | |
| `mobile-center telemetry off` | Turn on the sending of telemetry |
| `mobile-center telemetry on` | Turn on the sending of telemetry |
| | |
| `mobile-center test status` | Checks status of started test run. |
| `mobile-center test prepare appium` | Creates artifacts directory with Appium tests |
| `mobile-center test prepare calabash` | Creates artifacts directory with Calabash tests |
| `mobile-center test prepare espresso` | Creates artifacts directory with Espresso tests |
| `mobile-center test prepare uitest` | Creates artifacts directory with Xamarin UI Tests |
| `mobile-center test run appium` | Starts test run with Appium tests |
| `mobile-center test run calabash` | Starts test run with Calabash tests |
| `mobile-center test run espresso` | Starts test run with Espresso tests |
| `mobile-center test run manifest` | Starts test run with previously prepared artifacts |
| `mobile-center test run uitest` | Starts test run with Xamarin UI Tests |
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
