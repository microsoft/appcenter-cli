// Helper functions for dealing with autorest generation of the HTTP client object.

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


function downloadNuget() {
  if (checkStats(nugetExe, s => s.isFile())) {
    return Promise.resolve();
  }

  if (!checkStats(path.dirname(nugetExe), s => s.isDirectory())) {
    fs.mkdirSync(path.dirname(nugetExe));
  }

  return new Promise((resolve, reject) => {
    let finished = false;
    const s = request('https://nuget.org/nuget.exe')
      .pipe(fs.createWriteStream(nugetExe));

    s.on('error', (e) => {
      if (!finished) {
        finished = true;
        reject(e);
      }
    });

    s.on('finish', () => {
      if (!finished) {
        finished = true;
        resolve();
      }
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

  var nugetCmd = `${clrCmd(nugetExe)} install Autorest -Source ${nugetSource} -Version ${defaultAutoRestVersion} -o packages`;
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

module.exports = {
  downloadTools,
  generateCode
};
