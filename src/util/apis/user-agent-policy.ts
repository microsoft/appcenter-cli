import { PipelinePolicy, PipelineRequest, PipelineResponse } from "@azure/core-rest-pipeline";
import { platform, release } from "os";
const { version: cliVersion } = require("../../../package.json");
import { scriptName } from "../misc";

export function userAgentPolicy(): PipelinePolicy {
  return {
    name: 'userAgentPolicy',
    sendRequest: async (request: PipelineRequest, next: Function): Promise<PipelineResponse> => {
      const userAgentValue = `${scriptName}Cli/${cliVersion} NodeJS/${process.version} ${platform()}/${release()}`;
      request.headers.set("user-agent", userAgentValue);
      return next(request);
    }
  };
}
