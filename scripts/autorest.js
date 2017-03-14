// Helper functions for dealing with autorest generation of the HTTP client object.

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const exec = require('child_process').exec;

const request = require('request');

const defaultAutoRestVersion = '0.17.0-Nightly20161011';
const nugetExe = path.join('tools', 'nuget.exe');
const nugetSource = 'https://www.myget.org/F/autorest/api/v2';

const isWindows = (process.platform.lastIndexOf('win') === 0);
function clrCmd(cmd) {
  return isWindows ? cmd : `mono ${cmd}`;
}

function constructAutorestExePath(version) {
  return path.join('packages', `Autorest.${version}`, 'tools', 'AutoRest.exe');
}

function checkStats(path, predicate) {
  try {
    const stats = fs.statSync(path);
    return predicate(stats);
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

function streamDone(origResolve, origReject) {
  let finished = false;

  return {
    resolve: () => {
      if (!finished) {
        origResolve();
        finished = true;
      }
    },
    reject: (e) => {
      if (!finished) {
        origReject(e);
        finished = true;
      }
    }
  };
}

function downloadNuget() {
  if (checkStats(nugetExe, s => s.isFile())) {
    return Promise.resolve();
  }

  if (!checkStats(path.dirname(nugetExe), s => s.isDirectory())) {
    fs.mkdirSync(path.dirname(nugetExe));
  }

  return new Promise((resolve, reject) => {
    const sd = streamDone(resolve, reject);

    const s = request('https://nuget.org/nuget.exe')
      .pipe(fs.createWriteStream(nugetExe));

    s.on('error', (e) => {
      sd.reject(e);
    });

    s.on('finish', () => {
      sd.resolve();
    });
  });
}

function downloadTools() {
  return downloadNuget()
    .then(downloadAutorest);
}

function downloadAutorest() {
  if (checkStats(constructAutorestExePath(defaultAutoRestVersion), s => s.isFile())) {
    return Promise.resolve();
  }

  const nugetCmd = `${clrCmd(nugetExe)} install Autorest -Source ${nugetSource} -Version ${defaultAutoRestVersion} -o packages`;
  console.log(`Downloading default AutoRest version: ${nugetCmd}`);
  return new Promise((resolve, reject) => {
    exec(nugetCmd, function (err, stdout, stderr) {
      console.log(stdout);
      console.error(stderr);
      if (err) { reject(err); }
      else { resolve(); }
    });
  });
}

const endpoints = {
  prod: "https://api.mobile.azure.com",
  int: "https://bifrost-int.trafficmanager.net"
};

const swaggerPath = "/preview/swagger.json";
const swaggerDest = path.join('swagger', 'bifrost.swagger.before.json');

function downloadSwagger(environment) {
  if (!endpoints[environment]) {
    throw new Error(`Unknown environment ${environment}, cannot download swagger`);
  }

  const swaggerUrl = endpoints[environment] + swaggerPath;
  console.log(`Downloading swagger from ${swaggerUrl}`);

  return new Promise((resolve, reject) => {
    let sd = streamDone(resolve, reject);

    const s = request(endpoints[environment] + swaggerPath)
      .pipe(fs.createWriteStream(swaggerDest));

    s.on('error', (e) => {
      sd.reject(e);
    });

    s.on('finish', () => {
      sd.resolve();
    });
  });
}

function generateCode(swaggerFile, dest, clientName) {
  const autoRestExe = constructAutorestExePath(defaultAutoRestVersion);
  const cmd = `${autoRestExe} -Modeler Swagger -i ${swaggerFile} -AddCredentials true -ClientName ${clientName} -CodeGenerator NodeJS -OutputDirectory ${dest} -ft 3`;
  console.log(`Running AutoRest to generate code: ${cmd}`);
  return new Promise((resolve, reject) => {
    exec(clrCmd(cmd), function (err, stdout, stderr) {
      console.log(stdout);
      console.error(stderr);
      if (err) { reject(err); }
      else { resolve(); }
    })
  });
}

//
// Fix up the swagger file so that we have consistent operationIds and remove the
// bad empty paths.
//

function fixupRawSwagger(rawSwaggerPath, fixedSwaggerPath) {
  let swagger = JSON.parse(fs.readFileSync(rawSwaggerPath, 'utf8'));
  let urlPaths = Object.keys(swagger.paths);
  urlPaths.forEach(urlPath => {
    if (_.isEmpty(swagger.paths[urlPath])) {
      delete swagger.paths[urlPath];
    } else {
      if (urlPath === '/v0.1/apps/{owner_name}/{app_name}/commits/batch/{sha_collection}') {
        fixupGetCommits(swagger.paths[urlPath]);
      }
      let operations = _.toPairs(swagger.paths[urlPath]);
      operations.forEach(([method, operationObj]) => {
        if (!operationIdIsValid(operationObj)) {
          if (operationObj.operationId) {
            operationObj.operationId = `${getArea(operationObj)}_${operationObj.operationId}`;
          } else {
            operationObj.operationId = `${getArea(operationObj)}_${method}${urlPathToOperation(urlPath)}`;
          }
        }
      });
    }
  });

  fs.writeFileSync(fixedSwaggerPath, JSON.stringify(swagger, null, 2), 'utf8');
}

// Is the operationId present and of the form "area_id"
function operationIdIsValid(operationObj) {
  return operationObj.operationId && operationIdHasArea(operationObj);
}

function operationIdHasArea(operationObj) {
  return operationObj.operationId.includes('_');
}

function getArea(operationObj) {
  if (operationObj.tags && operationObj.tags.length > 0) {
    return operationObj.tags[0];
  }
  return 'misc';
}

// Case conversion for path parts used in generating operation Ids
function snakeToPascalCase(s) {
  return s.split('_')
    .filter(_.negate(_.isEmpty))
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function removeIllegalCharacters(s) {
  return s.replace(/\./g, '');
}

function convertParameter(part) {
  if (part[0] === '{') {
    return `by_${part.slice(1, -1)}`;
  }
  return part;
}

function urlPathToOperation(urlPath) {
  return urlPath.split('/')
    .filter(_.negate(_.isEmpty))
    .map(convertParameter)
    .map(removeIllegalCharacters)
    .map(snakeToPascalCase)
    .join('');
}

function fixupGetCommits(operations) {
  let getCommits = operations['get'];
  if (!getCommits) {
    console.error('Could not find getCommits operation!');
    return;
  }

  let parameters = getCommits.parameters;
  if(!parameters) {
    console.error('Could not find parameters for get operation!');
    return;
  }

  let shaCollection = parameters.filter(p => p.name && p.name === 'sha_collection');
  if (shaCollection.length !== 1) {
    return;
  }

  let shaCollectionParam = shaCollection[0];
  if (!shaCollectionParam['x-ms-skip-url-encoding']) {
    shaCollectionParam['x-ms-skip-url-encoding'] = true;
  }
}

module.exports = {
  downloadSwagger,
  downloadTools,
  generateCode,
  fixupRawSwagger,
};
