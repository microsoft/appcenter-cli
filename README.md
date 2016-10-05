# Sonoma CLI - command line for Sonoma
(Kind of obvious from the name, really)

Sonoma CLI is a command command line interface to interact with the Sonoma services. It's intended
for use by mobile developers and people building scripts that need to interact with Sonoma (for example,
local CI configurations).

## Technologies Used

sonoma cli is written using Node.js version 6 and Typescript. Wrappers over the Bifrost HTTP api are
generated using the [AutoRest][https://github.com/Azure/autorest] code generator. And the usual
plethora of npm modules.

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


