import * as crypto from "crypto";
import * as fs from "fs";
import * as hashUtils from "../hash-utils";
import * as jwt from "jsonwebtoken";
import * as os from "os";
import * as path from "path";
import * as pfs from "../../../../util/misc/promisfied-fs";
import { isBinaryOrZip, copyFileToTmpDir } from "../file-utils";

const CURRENT_CLAIM_VERSION: string = "1.0.0";
const METADATA_FILE_NAME: string = ".codepushrelease"

interface CodeSigningClaims {
  claimVersion: string;
  contentHash: string;
}

export default async function sign(privateKeyPath: string, updateContentsPath: string): Promise<void> {
  if (!privateKeyPath) {
    return Promise.resolve<void>(null);
  }

  let privateKey: Buffer;
  let signatureFilePath: string;

  try {
    privateKey = await pfs.readFile(privateKeyPath);
  } catch (err) {
    return Promise.reject(new Error(`The path specified for the signing key ("${privateKeyPath}") was not valid.`));
  }

  // If releasing a single file, copy the file to a temporary 'CodePush' directory in which to publish the release
  if (!(await pfs.stat(updateContentsPath)).isDirectory()) {
    updateContentsPath = await copyFileToTmpDir(updateContentsPath);
  }

  signatureFilePath = path.join(updateContentsPath, METADATA_FILE_NAME);
  let prevSignatureExists = true;
  try {
    await pfs.access(signatureFilePath, fs.constants.F_OK);
  } catch (err) {
    if (err.code === "ENOENT") {
      prevSignatureExists = false;
    } else {
      return Promise.reject<void>(new Error(
        `Could not delete previous release signature at ${signatureFilePath}.
                Please, check your access rights.`)
      );
    }
  }

  if (prevSignatureExists) {
    console.log(`Deleting previous release signature at ${signatureFilePath}`);
    await pfs.rmDir(signatureFilePath);
  }

  const hash: string = await hashUtils.generatePackageHashFromDirectory(updateContentsPath, path.join(updateContentsPath, ".."));
  const claims: CodeSigningClaims = {
    claimVersion: CURRENT_CLAIM_VERSION,
    contentHash: hash
  };

  return new Promise<void>((resolve, reject) => {
    jwt.sign(claims, privateKey, { algorithm: "RS256" }, async (err: Error, signedJwt: string) => {
      if (err) {
        reject(new Error("The specified signing key file was not valid"));
      }

      try {
        fs.writeFileSync(signatureFilePath, signedJwt);
        console.log(`Generated a release signature and wrote it to ${signatureFilePath}`);
        resolve(null);
      } catch (error) {
        reject(error);
      }
    });
  });
}
