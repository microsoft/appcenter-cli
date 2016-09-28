//
// Clients and data structures for getting/setting user information
//

import * as fetch from "node-fetch";
import { FetchFilter, sonomaAuthFilter } from "../http";
import { ClientBase } from "./client-base";

export interface GetUserResponse {
  id: string;
  display_name: string;
  email: string;
  name: string;
  avatar_url: string;
  can_change_password: boolean;
}

export interface UpdateUserRequest {
  display_name?: string;
}

export interface UpdateUserResponse extends GetUserResponse {
  // No extra fields, but this gives us a separate type name
  // in case the return types diverge in the future.
}

export class UserClient extends ClientBase {
  constructor(endpoint: string, token: string, filters?: FetchFilter) {
    super(endpoint, "/v0.1/user", sonomaAuthFilter(token), filters);
  }

  async getUser(): Promise<GetUserResponse> {
    return this.fetch(this.rootEndpoint)
      .then(response => {
          return response.json();
      });
  }

  async updateUser(update: UpdateUserRequest): Promise<UpdateUserResponse> {
    return this.fetch(this.rootEndpoint,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update)
      })
    .then(response => {
      return response.json();
    });
  }
}
