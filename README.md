# Sonoma CLI - command line for Sonoma
(Kind of obvious from the name, really)

Sonoma CLI is a command command line interface to interact with the Sonoma services. It's intended
for use by mobile developers and people building scripts that need to interact with Sonoma (for example,
local CI configurations).

## Technologies Used

sonoma cli is written using Node.js version 6 and [Typescript](http://typescriptlang.org). Wrappers over the Bifrost HTTP api are
generated using the [AutoRest][https://github.com/Azure/autorest] code generator. And the usual
plethora of npm modules.

We use [mocha](https://http://mochajs.org/) for a test runner / framework. [Chai](http://http://chaijs.com/) is
the assertion library. [Sinonn](http://sinonjs.org) is the general mocking library, and [nock](https://github.com/node-nock/nock)
will be used to record and playback mock http traffic. [Note: this isn't set up yet.]

# Setting Up

## Prerequisites

Install the latese version of Node 6 from [here](https://nodejs.org). If you are on a Mac, we recommend
a 64-bit version.

Also have a working git installation. You will need access to this [repo](https://github.com/Microsoft/sonoma-cli).
At this time, repo access is managed manually, please contact Chris Tavares (ctavares@microsoft.com or @ctavares-ms on Xamarin slack)
or Matt Gibbs (matt.gibbs@microsoft.com or @mattgi on Xamarin slack) to get added to the repo.

### Optional Tools

The repo is set up so that once you've got node and the repo, everything you need to do will work. However, it is
convenient to install some tools globally in addition.

#### Node Version Management

If you need multiple versions of node on your machine at the same time, consider a node version manager.
For Mac or Linux, try [nvm](https://github.com/creationix/nvm). For Windows machines, [nodist](https://github.com/marcelklehr/nodist)
works well.

#### Typescript compiler and Typings

The typescript compilation can be run via the `npm run build` command, but if you want the Typescript compiler available directly,
install it on you machine by doing `npm install -g typescript`.

The Typings tool is useful if you're bringing in a new exteral Javascript library and want to get access to type definitions
for that library. The typings files are checked into the repo, but if you want to download and add new ones, you'll need to
install typings: `npm install -g typings`.

#### ts-node

By default, to run the CLI you need to compile the typescript explicitly first. The `ts-node` command line tool will let you run
`.ts` files directly from the command line. Install it with `npm install -g ts-node`.

## Troubleshooting

If you are running on a Mac and have to use `sudo` to install global npm modules (for example, `npm install -g typescript`),
the please check out [this tutorial](https://docs.npmjs.com/getting-started/fixing-npm-permissions).

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
| `npm run build` | Compiles the typescript into javascript, creates `dist` directory |
| `npm run test` | Runs the test suite. Can also be run with `npm test` |
| `npm run watch-test` | Runs a watcher on the test file that will rerun tests automatically on save |
| `npm run clean` | Cleans up any compilation output |

There will be more over time.

# Touring the codebase

## General design principles

Use promises for async operations. Use `async`\`await` in Typescript for handling typical promises.

If you've got a bunch of related code, export the library as a whole in a single import using an `index.ts` file.
For example, the `profile` library includes files `environment.ts` and `profile.ts`, but users of the module
just needs to do `import { stuff } from "../util/profile"`

Don't overuse objects or inheritance. In many cases global functions or modules can do just as well and be easier to consume.

### Directory structure

#### src

This is where the source code for the CLI lives.
## Util

The `util` directory is a place to put shared utility code

