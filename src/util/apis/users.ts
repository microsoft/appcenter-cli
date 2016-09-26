//
// Clients and data structures for getting/setting user information
//

import * as fetch from "node-fetch";
import { FetchFunc, FetchFilter, chainFilters, httpFailedFilter, noop as noopFilter, sonomaAuthFilter } from "../http";

export interface GetUserResponse {
  id: string;
  display_name: string;
  email: string;
  name: string;
  avatar_url: string;
  can_change_password: boolean;
}

export class UserClient {
  endpoint: string;
  fetch: FetchFunc;

  constructor(endpoint: string, token: string, filters: FetchFilter = noopFilter) {
    this.endpoint = endpoint;
    this.fetch = chainFilters(filters, sonomaAuthFilter(token), httpFailedFilter)(fetch);
  }

  async getUser(): Promise<GetUserResponse> {
    return this.fetch(`${this.endpoint}/v0.1/user`)
      .then(response => {
          return response.json();
      });
  }
}
