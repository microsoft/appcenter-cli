//
// Custom credentials object for talking to Mobile center
//

import { WebResource } from "ms-rest";
const debug = require("debug")("mobile-center-cli:util:apis:mobile-center-client-credentials");
export class MobileCenterClientCredentials {
  private token: Promise<string>;

  constructor(token: Promise<string>) {
    this.token = token;
  }

  signRequest(request: WebResource, callback: {(err: Error): void}): void {
    debug("Getting token for request");
    this.token
      .then(token => {
        debug("got token");
        request.withHeader("x-api-token", token);
        callback(null);
      })
      .catch((err: Error) => {
        debug("Token fetch failed, failing request");
        callback(err);
      });
  }
}
