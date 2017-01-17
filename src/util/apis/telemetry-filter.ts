//
// Filter to add command telemetry headers for requests.
//

import { WebResource } from "ms-rest";
const uuid = require("uuid");

const sessionId : string = uuid.v4();

const sessionHeaderName = "diagnostic-context";
const commandNameHeaderName = "cli-command-name";

export function telemetryFilter(commandName: string) : {(resource: WebResource, next: any, callback: any): any} {
  return (resource: WebResource, next: any, callback: any): any => {
    resource.withHeader("internal-request-source", "cli");
    resource.withHeader(sessionHeaderName, sessionId);
    resource.withHeader(commandNameHeaderName, commandName);
    return next(resource, callback);
  };
}
