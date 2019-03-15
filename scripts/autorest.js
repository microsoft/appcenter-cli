const _ = require('lodash')
const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const util = require('util')

const downloadSwagger = require('./download-swagger')
const { fixupRawSwagger, rawSwaggerPath, fixedSwaggerPath } = require('./fixup-swagger')

const args = require('minimist')(process.argv.slice(2), downloadSwagger.parseOpts)

function runAutorest() {
  let autorestScript = 'autorest'
  if (process.platform === 'win32') {
    autorestScript += '.cmd'
  }

  const configFilePath = path.join(__dirname, '..', 'swagger', 'readme.md')

  console.log(`Running ${autorestScript} "${configFilePath}"`)

  return new Promise((resolve, reject) => {
    let arp = childProcess.spawn(
      path.join(__dirname, '..', 'node_modules', '.bin', autorestScript),
      [ configFilePath ],
      { cwd: path.join(__dirname, '..') }
    )

  	arp.stdout.on('data', (data) => console.log(data.toString()))
  	arp.stderr.on('error', (data) => console.error(data.toString()))
  	arp.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    })
  })
}

downloadSwagger.downloadSwagger(args.env, args.version)
  .then(() => fixupRawSwagger(rawSwaggerPath, fixedSwaggerPath))
  .then(() => runAutorest())
  .then(() => console.log(`Swagger update complete`))
  .catch((err) => console.log(`Autorest process failed, ${err}`))
