//
// Custom credentials object for talking to AppCenter
//

import { WebResource } from "ms-rest";
const debug = require("debug")("appcenter-cli:util:apis:appcenter-client-credentials");

export class AppCenterClientCredentials {
  private getToken: {(): Promise<string>};

  constructor(getToken: {(): Promise<string>}) {
    debug(`Constructor with getToken = ${getToken} of type ${typeof getToken}`);
    this.getToken = getToken;
  }

  signRequest(request: WebResource, callback: {(err: Error): void}): void {
    debug("Getting token for request");
    this.getToken()
      .then((token) => {
        debug(`got token ${token} of type ${typeof token}`);
        request.headers["x-api-token"] = token;
        callback(null);
      })
      .catch((err: Error) => {
        debug("Token fetch failed, failing request");
        callback(err);
      });
  }
}
