//
// Filter to add command telemetry headers for requests.
//

import { WebResource } from "ms-rest";
import { Readable, Writable } from "stream";
import { getTelemetrySourceFromEnvironmentVar } from "../profile";

const requestPipeline = require("ms-rest/lib/requestPipeline");

const uuid = require("uuid");

const sessionId : string = uuid.v4();

const sessionHeaderName = "diagnostic-context";
const commandNameHeaderName = "cli-command-name";

export function telemetryFilter(commandName: string, telemetryIsEnabled: boolean) : {(resource: WebResource, next: any, callback: any): any} {
  const telemetrySource = getTelemetrySourceFromEnvironmentVar() || "cli";
  return (resource: WebResource, next: any, callback: any): any => {
    return requestPipeline.interimStream((input: Readable, output: Writable) => {
      input.pause();
      if (telemetryIsEnabled) {
        resource.headers["internal-request-source"] = telemetrySource;
        resource.headers[sessionHeaderName] = sessionId;
        resource.headers[commandNameHeaderName] = commandName;
      }
      const nextStream = next(resource, callback);
      (resource.pipeInput(input, nextStream) as any as Readable).pipe(output);
      input.resume();
    });
  };
}
