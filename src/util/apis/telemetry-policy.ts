import { PipelinePolicy, PipelineRequest, PipelineResponse, createPipelineRequest } from "@azure/core-rest-pipeline";
import * as uuid from "uuid";
import { getTelemetrySourceFromEnvironmentVar } from "../profile";

const sessionId: string = uuid.v4();

const sessionHeaderName = "diagnostic-context";
const commandNameHeaderName = "cli-command-name";

export function telemetryPolicy(commandName: string, telemetryIsEnabled: boolean): PipelinePolicy {
  const telemetrySource = getTelemetrySourceFromEnvironmentVar() || "cli";
  
  return {
    name: 'telemetryPolicy',
    sendRequest: async (request: PipelineRequest, next: Function): Promise<PipelineResponse> => {
      if (telemetryIsEnabled) {
        request.headers.set("internal-request-source", telemetrySource);
        request.headers.set(sessionHeaderName, sessionId);
        request.headers.set(commandNameHeaderName, commandName);
      }
      return next(request);
    }
  };
}
