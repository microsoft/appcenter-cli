//
// Custom credentials object for talking to Sonoma
//

import { WebResource } from "ms-rest";

export class SonomaClientCredentials {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  signRequest(request: WebResource, callback: {(err: Error): void}): void {
    request.withHeader("x-api-token",this.token);
    callback(null);
  }
}
