# App Center CLI - command line for App Center

App Center CLI is a command line interface to interact with the App Center services. It's intended
for use by mobile developers and people building scripts that need to interact with App Center (for example,
local CI configurations).

## Technologies Used

App Center cli is written using Node.js version 10 and [Typescript](http://typescriptlang.org). 
Wrappers over the App Center HTTP API are generated using the [AutoRest](https://github.com/Azure/autorest) code generator. 
And the usual plethora of npm modules.

We use [mocha](https://http://mochajs.org/) for a test runner / framework. [Chai](http://http://chaijs.com/) is
the assertion library. [Sinon](http://sinonjs.org) is the general mocking library, and [nock](https://github.com/node-nock/nock)
is used to record and playback mock http traffic.

# Setting Up

## Prerequisites

Install the latest version of Node 10 from [here](https://nodejs.org). If you are on a Mac, we recommend
a 64-bit version.

Also have a working git installation. The code is available from this [repo](https://github.com/Microsoft/appcenter-cli).

### Optional Tools

The repo is set up so that once you've got node and the repo, everything you need to do will work. However, it is
convenient to install some tools globally in addition.

#### Node Version Management

If you need multiple versions of node on your machine at the same time, consider a node version manager.
For Mac or Linux, try [nvm](https://github.com/creationix/nvm). For Windows machines, [nodist](https://github.com/marcelklehr/nodist)
works well.

Make sure you have selected the correct version of node from `nvm` - you
can check this by running `nvm ls` from a terminal for example.

#### Typescript compiler

The typescript compilation can be run via the `npm run build` command.

#### gulp

gulp is used as a task runner under the hood, but should not be called directly. Use the npm scripts listed below.

#### ts-node

By default, to run the CLI you need to compile the typescript explicitly first. The `ts-node` command line tool will let you run
`.ts` files directly from the command line. Install it with `npm install -g ts-node`.

The latest `ts-node` required installation in local dev to work
correctly.

#### mono

If you want to regenerate the HTTP client code from a non-Windows machine, you'll need mono installed and on your path.
see the [Mono download page](http://www.mono-project.com/download/) for downloads and installation instructions.

## Troubleshooting

If you are running on a Mac and have to use `sudo` to install global npm modules (for example, `npm install -g typescript`),
then please check out [this tutorial](https://docs.npmjs.com/getting-started/fixing-npm-permissions).

# Building

After installing node and cloning the repo, do:

 1. `npm install`
 2. `npm run build`

To run the test suite, do:
 3. `npm test`

# Running the cli in development

If you're using node directly, do:

 1. `npm run build`
 2. `node dist/index.js <command...> <args...>`

If you've installed `ts-node` as mentioned above, you can skip the build step and do:

 1. `ts-node src/index.ts <command...> <args...>`

# Scripts

There are a bunch of scripts in package.json file. Here's what they are and what they do:

| Script command | What it does |
|----------------|------------- |
| `npm run build` | Runs tslint, compiles the typescript into javascript, creates `dist` directory |
| `npm run test` | Runs tslint, runs the test suite. Can also be run with `npm test` |
| `npm run watch-test` | Runs a watcher on the test file that will rerun tests automatically on save |
| `npm run clean` | Cleans up any compilation output |
| `npm run autorest` | Regenerate the HTTP client libraries. Downloads required tools as part of this process |
| `npm run tslint` | Run tslint over the codebase |

There will be more over time.

## Gulp targets

The gulpfile.js file contains the following targets that can be called manually if you desire

| Target | npm script | What it does |
|--------|------------|--------------|
| `default` | | Runs the `build` task |
| `build:raw` | `build` | Runs the build (build-ts, copy-assets, copy-generated-clients) |
| `build-sourcemaps` | | Create sourcemap files for the compiled typescript to aid in debugging |
| `build-ts-sourcemaps` | | Run Typescript compiler to output sourcemap files |
| `build-ts` | | Runs typesscript compiler, using settings in tsconfig.json |
| `clean`  | `clean` | Deletes the dist folder |
| `clean-sourcemaps` | | Delete generated source map files from dist directory |
| `copy-assets` | | Copies .txt files from src to dist (category descriptions) |
| `copy-generated-client` | | Copies the generated HTTP client code to dist |
| `prepublish` | `prepublish` | Runs the `clean` and `build:raw` tasks before publishing to npm |

# Touring the codebase

## General design principles

Use promises for async operations. Use `async`/`await` in Typescript for handling typical promises.

If you've got a bunch of related code, export the library as a whole in a single import using an `index.ts` file.
For example, the `profile` library includes files `environment.ts` and `profile.ts`, but users of the module
just needs to do `import { stuff } from "../util/profile"`

Don't overuse objects or inheritance. In many cases global functions or modules can do just as well and be easier to consume.

### Directory structure

#### dist

Created by the `npm run build` command, contains the compiled-to-javascript code.

#### src

This is where the source code for the CLI lives.

#### src/commands

The implementation of each command is in this directory. Each category (distribute, build, app, etc) will be a subdirectory of 
this directory. Each command lives in an individual source file with the same name as the command.

For example:

| Command | Source File |
| ------- | ----------- |
| `appcenter login` | src/commands/login.ts |
| `appcenter profile configure` | src/commands/profile/configure.ts |
| `appcenter apps list` | src/commands/apps/list.ts |

The command line parser and dispatcher uses the directory structure and file names to determine which code to run, so the 
naming conventions are important.

In addition, place a `category.txt` file in your category directory. The contents of
this file will be displayed by the help system when getting help for the category.

If you have shared code across commands in your category, you can add a directory named `lib` in your category's directory and 
put that code there. The command line dispatcher will explicitly ignore this directory and not try to accidentally run your 
utility code from the command line.

#### src/util

This contains framework and utility code used across all the commands. See readme files in each directory for specific details 
of each one. (Working on these.)

#### src/util/apis

Http client wrappers and utility code for handling HTTP communication with Bifrost.

#### src/util/apis/generated

Autorest-generated client code for talking to Bifrost.

#### src/util/commandline

The command line parser and dispatching code, along with base class and decorators for implementing commands.

#### src/util/interaction

Central point for all user I/O done by commands. Use `interaction.prompt` to get input from a user, and
`interaction.out` to output various forms of results.

Commands should use these rather than directly using `console.log` because the interaction library handles output formats 
(the `--format` switch) and the `--quiet` switch transparently to the command author.

#### src/util/profile

Code for storing and retrieving information about the current logged in user.

#### scripts

Support files for build and packaging.

#### test

Test code lives here. For new tests create a subdirectory structure corresponding to the `src` folder. Test code will be 
automatically run if you name the file `<testname>-test.ts` or `<testname>-test.js`. We recommend using Typescript for 
you tests to keep things consistent across the entire codebase.

#### typings

Stores type definitions for the external Javascript libraries used. These are checked in rather than dynamically 
downloaded in case we need to edit them.

# Naming conventions
To get consistent user experience among commands for all beacons, the command line argument names should follow 
the following conventions.

1. **All argument names**: lower-case nouns, separated by dash "-".

   Examples:
   - `--app-path`
   - `--dsym-dir`
   - `--debug`

1. **Arguments that describe application**: the first noun is "app".

   Examples:
   - `--app`
   - `--app-path`

1. **Arguments that point to directories**: the last noun is "dir".

   Examples:
   - `--tests-dir`
   - `--build-dir`
   - `--dsym-dir`

1. **Arguments that point to a single file**: the last noun is "path".

   Examples:
   - `--manifest-path`
   - `--app-path`

# Development Processes

We follow the standard GitHub flow. Each person working on the cli should create their own fork of the repo. Work in 
your own repo (preferably on a feature branch). When ready, send a pull request to the master 
Microsoft/MobileCenter-cli repo against the master branch. After review, the pull request will be merged.

# Submitting a PR

PR submitters should include a description of the change they would like to include in the 
[changelog](https://docs.microsoft.com/en-us/appcenter/general/changelog). Each time a PR is merged and the next 
version of the CLI is released, the first paragraph in the PR description will be copied into the changelog.

A good description should include:

- Friendly description of the fixes/changes made
- Details of the change

An example of a good description is: "Distribute your app via the CLI: Users can now create & manage your 
distribution groups, upload your release and distribute it"

# Building Installers

TBD. We'll need builds for a Mac installer, Windows MSI, and at least one format of Linux package, 
plus be able to push to NPM.

