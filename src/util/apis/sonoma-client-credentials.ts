//
// Custom credentials object for talking to Sonoma
//

import { WebResource } from "ms-rest";

export class SonomaClientCredentials {
  private token: Promise<string>;

  constructor(token: Promise<string>) {
    this.token = token;
  }

  signRequest(request: WebResource, callback: {(err: Error): void}): void {
    this.token.then(token => {
      request.withHeader("x-api-token", token);
      callback(null);
    });
  }
}
