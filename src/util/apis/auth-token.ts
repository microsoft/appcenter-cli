import * as fetch from "node-fetch";
import { FetchFunc, FetchFilter, chainFilters, basicAuthFilter, sonomaAuthFilter, httpFailedFilter, noop as noopFilter, logFilter } from "../http";


interface PostAuthTokenRequest {
  "description": string;
}

export interface CreateAuthTokenResponse extends GetAuthTokenResponse {
  api_token: string;
}

export interface GetAuthTokenResponse {
  id: string;
  description: string;
  created_at: string;
}

export interface DeleteAuthTokenResponse {

}

export class AuthTokenClient {

  private endpoint: string;
  private fetch: FetchFunc;

  constructor(endpoint: string, username: string, password: string, filters?: FetchFilter);
  constructor(endpoint: string, accessToken: string, filters?: FetchFilter);
  constructor(...args: any[])
  {
    let endpoint: string;
    let authFilter: FetchFilter;
    let filters: FetchFilter;

    this.endpoint = args[0];

    if(args.length === 3) {
      authFilter = sonomaAuthFilter(args[1]);
      filters = args[2] || noopFilter;
    } else {
      authFilter = basicAuthFilter(args[1], args[2]);
      filters = args[3] || noopFilter;
    }

    this.fetch = chainFilters(filters, authFilter, httpFailedFilter, logFilter)(fetch);
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

  async deleteToken(tokenId: string): Promise<DeleteAuthTokenResponse> {
    return await this.fetch(`${this.endpoint}/v0.1/auth_tokens/${tokenId}`, {
      method: "DELETE",
    });
  }
}
