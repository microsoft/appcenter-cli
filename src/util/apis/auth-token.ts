import * as fetch from "node-fetch";
import { FetchFilter, basicAuthFilter, sonomaAuthFilter } from "../http";
import { ClientBase } from "./client-base";

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

export class AuthTokenClient extends ClientBase {
  constructor(endpoint: string, username: string, password: string, filters?: FetchFilter);
  constructor(endpoint: string, accessToken: string, filters?: FetchFilter);
  constructor(...args: any[])
  {
    let endpoint: string = args[0];
    let authFilter: FetchFilter;
    let filters: FetchFilter;

    switch(args.length) {
      case 2:
        authFilter = sonomaAuthFilter(args[1]);
        filters = null;
        break;

      case 3:
        if (typeof args[2] !== "string") {
          authFilter = sonomaAuthFilter(args[1]);
          filters = args[2];
        } else {
          authFilter = basicAuthFilter(args[1], args[2]);
          filters = null;
        }
        break;

      case 4:
        authFilter = basicAuthFilter(args[1], args[2]);
        filters = args[3];
        break;
    }

    super(endpoint, "/v0.1/api_tokens", authFilter, filters);
  }

  async createToken(): Promise<CreateAuthTokenResponse> {
    const request: PostAuthTokenRequest = {
      description: "Created by sonoma-cli login",
    };

    return await this.fetch(this.rootEndpoint, {
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
    return await this.fetch(`${this.rootEndpoint}/${tokenId}`, {
      method: "DELETE",
    });
  }
}
