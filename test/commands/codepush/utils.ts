import * as fs from "fs";
import * as temp from "temp";
import * as path from "path";
import * as Nock from "nock";
import * as Sinon from "sinon";
import { CommandArgs } from "../../../src/util/commandline/command";
import { getLastFolderInPath } from "../../../src/commands/codepush/lib/file-utils";

export interface FakeParamsForRequests {
  userName: string;
  appName: string;
  path: string;
  appVersion: string;
  host: string;
  token: string;
}

export function getFakeParamsForRequest(): FakeParamsForRequests {
  const fakeParamsForRequests = {
    userName: "fakeUserName",
    appName: "fakeAppName",
    path: "fake/path",
    appVersion: "v0.1",
    host: "https://api.appcenter.ms/",
    token: "c1o3d3e7",
  };

  return fakeParamsForRequests;
}

export const releaseUploadResponse = {
  id: "id",
  token: "token",
  upload_domain: "https://uploadDomain.test"
};

export const setMetadataResponse = {
  error: false,
  id: "123",
  chunk_size: 512,
  resume_restart: false,
  blob_partitions: 1,
  chunk_list: [0]
};

export function createTempPathWithFakeLastFolder(nameTmpFolder: string, lastFolderName: string): string {
  let testPath = temp.mkdirSync(nameTmpFolder);
  testPath = path.join(testPath, lastFolderName);
  fs.mkdirSync(testPath);
  return testPath;
}

export function createFile(folderPath: string, fileName: string, fileContent: string): string {
  const finalPath = path.join(folderPath, fileName);
  fs.writeFileSync(finalPath, fileContent);
  return finalPath;
}

export function getCommandArgsForReleaseCommand(additionalArgs: string[], fakeConsts: FakeParamsForRequests, ): CommandArgs {
  const args: string[] = ["-a", `${fakeConsts.userName}/${fakeConsts.appName}`, "-d", "Staging", "-t", "1.0", "--token", fakeConsts.token].concat(additionalArgs);
  return {
    args,
    command: ["codepush", "release"],
    commandPath: fakeConsts.path,
  };
}

export function nockRequestForValidation(fakeConsts: FakeParamsForRequests): Nock.Scope {
  return Nock(fakeConsts.host)
    .get(`/${fakeConsts.appVersion}/apps/${fakeConsts.userName}/${fakeConsts.appName}/deployments/Staging`)
    .reply(200, (uri: any, requestBody: any) => { return {}; });
}

export function nockPlatformRequest(fakePlatform: string, fakeConsts: FakeParamsForRequests, nockedRequests: Nock.Scope) {
  nockedRequests.get(`/${fakeConsts.appVersion}/apps/${fakeConsts.userName}/${fakeConsts.appName}`).reply(200, (uri: any, requestBody: any) => {
    return { platform: fakePlatform };
  });
}

export function getLastFolderForSignPath(stubedSign: Sinon.SinonStub): string {
  Sinon.assert.called(stubedSign);

  const signPath = stubedSign.getCalls()[0].args[1];
  return getLastFolderInPath(signPath);
}
