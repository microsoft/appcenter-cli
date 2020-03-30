const _ = require("lodash");
const childProcess = require("child_process");
const path = require("path");

const downloadSwagger = require("./download-swagger");
const {
  fixupRawSwagger,
  rawSwaggerPath,
  fixedSwaggerPath
} = require("./fixup-swagger");

const args = require("minimist")(
  process.argv.slice(2),
  downloadSwagger.parseOpts
);

function checkNodeVersion() {
  const version = process.version.match(/v([0-9]+)\..*/)[1];
  if (version < 12) {
    throw `Please switch to Node v12+ to execute autorest. Current version: ${process.version}`;
  }
}

function runAutorest() {
  let autorestScript = "autorest";
  if (process.platform === "win32") {
    autorestScript += ".cmd";
  }

  const configFilePath = path.join(__dirname, "..", "swagger");

  console.log(
    `Running ${autorestScript} "${configFilePath}" in "${process.cwd()}"`
  );

  return new Promise((resolve, reject) => {
    let arp = childProcess.spawn(
      "node",
      [
        "--max-old-space-size=16384",
        path.join(__dirname, "..", "node_modules", ".bin", autorestScript),
        configFilePath,
        "--verbose",
        "--debug"
      ],
      {
        cwd: path.join(__dirname, ".."),
        env: { FORCE_COLOR: "1", ...process.env }
      }
    );

    arp.stdout.on("data", data =>
      console.log(data.toString().replace(/\n$/, ""))
    );
    arp.stderr.on("data", data =>
      console.error(data.toString().replace(/\n$/, ""))
    );
    arp.stderr.on("error", data =>
      console.error(data.toString().replace(/\n$/, ""))
    );
    arp.on("close", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        if (signal !== null) {
          reject(`Received signal ${signal}`);
        }
        reject(`Error code ${code}`);
      }
    });
  });
}

checkNodeVersion();
downloadSwagger
  .downloadSwagger(args.env, args.version)
  .then(() => fixupRawSwagger(rawSwaggerPath, fixedSwaggerPath))
  .then(() => runAutorest())
  .then(() => console.log(`Swagger update complete`))
  .catch(err => console.log(`Autorest process failed, ${err}`));
