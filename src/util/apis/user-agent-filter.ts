//
// Filter to add a user agent to our outgoing HTTP requests
//

import { WebResource } from "ms-rest";
import { platform, release } from "os";
import { scriptName } from "../commandline";
const { version: cliVersion } = require("../../../package.json");

export function userAgentFilter(resource: WebResource, next: any, callback: any): any {
  resource.withHeader("User-Agent", `${scriptName}Cli/${cliVersion} NodeJS/${process.version} ${platform()}/${release()}`);
  return next(resource, callback);
}
