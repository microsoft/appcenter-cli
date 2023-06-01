// Command line tool to download swagger files from the given environment.

const _ = require("lodash");
const fs = require("fs");
const pipeline = require("stream");
const util = require("util");
const path = require("path");
const fetch = require("node-fetch");

const endpoints = {
  prod: "https://api.appcenter.ms",
  int: "https://api-gateway-core-integration.dev.avalanch.es",
  dev: "https://appcenter-api.dev.xtc.xmn.co",
};

const defaultVersion = "preview";

const parseOpts = {
  string: ["env", "version"],
  alias: { env: "e", version: "v" },
  default: { env: "prod", version: defaultVersion },
};

const args = require("minimist")(process.argv.slice(2), parseOpts);

function streamDone(origResolve, origReject) {
  let finished = false;
  return {
    resolve: () => {
      if (!finished) {
        finished = true;
        origResolve();
      }
    },
    reject: (e) => {
      if (!finished) {
        finished = true;
        origReject(e);
      }
    },
  };
}

function swaggerDest(environment, version) {
  return path.join("swagger", "bifrost.swagger.before.json");
}

function downloadSwagger(environment, version) {
  return Promise.resolve().then(() => {
    if (!endpoints[environment]) {
      console.error(`Unknown environment ${environment}`);
      return -1;
    }

    const swaggerUrl = `${endpoints[environment]}/${version}/swagger.json`;
    console.log(`Downloading swagger from ${swaggerUrl}`);

    // return new Promise((resolve, reject) => {
    //   const sd = streamDone(resolve, reject);
    //   fetch(swaggerUrl).then((response) => {
    //     if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

    //     response.body.pipe(fs.createWriteStream(swaggerDest(environment, version)));
    //     response.body.on("end", () => sd.resolve());
    //     response.body.on("error", (error) => sd.reject(error));
    //   })
    // });
  });
}

module.exports = {
  downloadSwagger,
  defaultVersion,
  parseOpts,
};
