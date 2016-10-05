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


If you need multiple versions of node on your machine at the same time, consider a node version manager.
For Mac or Linux, try [nvm](https://github.com/creationix/nvm). For Windows machines, [nodist](https://github.com/marcelklehr/nodist)
works well.

If you are running on a Mac and have to use `sudo` to install global npm modules (for example, `npm install -g typescript`),
the please check out [this tutorial](https://docs.npmjs.com/getting-started/fixing-npm-permissions).



