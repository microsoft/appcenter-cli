import * as path from "path";
import chalk from "chalk";
import { out } from "../../../util/interaction";
const childProcess = require("child_process");

export let spawn = childProcess.spawn;

export function getElectronProjectAppVersion(projectRoot?: string): string {
    projectRoot = projectRoot || process.cwd();
    try {
      /* tslint:disable-next-line:non-literal-require */
      const projectPackageJson: any = require(path.join(projectRoot, "package.json"));
      const projectVersion: string = projectPackageJson.version;

      if (!projectVersion) {
        throw new Error(`The package.json file in "${projectRoot}" does not have the "version" field set.`);
      }

      return projectVersion;
    } catch (error) {
        throw new Error(`Unable to find or read "package.json" in "${projectRoot}". The "release-electron" command must be executed in a Electron project folder.`);
    }
}

export function runWebPackBundleCommand(bundleName: string, mode: string, webpackConfig: string, entryFile: string, outputFolder: string, sourcemapFileName: string, extraBundlerOptions: string[]): Promise<void> {
    const webpackArgs: string[] = [];
    const envNodeArgs: string = process.env.CODE_PUSH_NODE_ARGS;

    if (typeof envNodeArgs !== "undefined") {
        Array.prototype.push.apply(webpackArgs, envNodeArgs.trim().split(/\s+/));
    }

    Array.prototype.push.apply(webpackArgs, [
        path.join("node_modules", "webpack-cli", "bin", "cli.js"),
        "--output-filename", bundleName,
        "--output-path", outputFolder,
        "--mode", mode,
        "--entry-file", entryFile,
        ...extraBundlerOptions,
    ]);

    if (webpackConfig) {
        webpackArgs.push("--config", webpackConfig);
    }

    if (sourcemapFileName) {
        webpackArgs.push("--output-source-map-filename", sourcemapFileName);
    }

    out.text(chalk.cyan(`Running "webpack bundle" command:\n`));
    const webpackProcess = spawn("node", webpackArgs);
    out.text(`node ${webpackArgs.join(" ")}`);

    return new Promise<void>((resolve, reject) => {
        webpackProcess.stdout.on("data", (data: Buffer) => {
            out.text(data.toString().trim());
        });

        webpackProcess.stderr.on("data", (data: Buffer) => {
            console.error(data.toString().trim());
        });

        webpackProcess.on("close", (exitCode: number) => {
            if (exitCode) {
                reject(new Error(`"webpack bundle" command exited with code ${exitCode}.`));
            }

            resolve(null as void);
        });
    });
}

export function isValidOS(os: string): boolean {
    switch (os.toLowerCase()) {
        case "linux":
        case "macos":
        case "windows":
            return true;
        default:
            return false;
    }
}

export function isValidPlatform(platform: string): boolean {
    return platform.toLowerCase() === "electron";
}

export function isElectronProject(): boolean {
    try {
        /* tslint:disable-next-line:non-literal-require */
        const projectPackageJson: any = require(path.join(process.cwd(), "package.json"));
        const projectName: string = projectPackageJson.name;
        if (!projectName) {
            throw new Error(`The "package.json" file in the CWD does not have the "name" field set.`);
        }

        return projectPackageJson.dependencies["electron"] || (projectPackageJson.devDependencies && projectPackageJson.devDependencies["electron"]);
    } catch (error) {
        throw new Error(`Unable to find or read "package.json" in the CWD. The "release-electron" command must be executed in a Electron project folder.`);
    }
}
