import { PipelinePolicy, PipelineRequest, PipelineResponse } from "@azure/core-rest-pipeline";

const apiTokenHeaderName = "X-API-Token";

export function authorizationPolicy(token: Promise<string>): PipelinePolicy {
  return {
    name: "tokenAuthorizationPolicy",
    sendRequest: async (request: PipelineRequest, next: Function): Promise<PipelineResponse> => {
      request.headers.set(apiTokenHeaderName, await token);
      return next(request);
    },
  };
}
