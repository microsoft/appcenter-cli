import * as fetch from "node-fetch";
import { FetchFunc, FetchFilter, chainFilters, basicAuthFilter, httpFailedFilter, noop as noopFilter, logFilter } from "../http";

export interface GetAuthTokenResponse {
  id: string;
  description: string;
  created_at: string;
}

export interface PostAuthTokenRequest {
  "description": string;
}

export interface CreateAuthTokenResponse extends GetAuthTokenResponse {
  api_token: string;
}

export class AuthTokenClient {

  private endpoint: string;
  private fetch: FetchFunc;

  constructor(endpoint: string, username: string, password: string, filters: FetchFilter = noopFilter) {
    this.endpoint = endpoint;
    this.fetch = chainFilters(filters, basicAuthFilter(username, password), httpFailedFilter, logFilter)(fetch);
  }

  async createToken(): Promise<CreateAuthTokenResponse> {
    const request: PostAuthTokenRequest = {
      description: "Created by sonoma-cli login",
    };

    return await this.fetch(`${this.endpoint}/v0.1/auth_tokens`, { 
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request) })
      .then(response => {
        return response.json();
      });
  }
}
