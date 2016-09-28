import * as fetch from "node-fetch";
import { FetchFilter, sonomaAuthFilter } from "../http";
import { ClientBase } from "./client-base";

export interface AppResponse {
  id: string;
  app_secret: string;
  display_name: string;
  name: string;
  platform: string;
  language: string;
  icon_url: string;
  owner: Owner;
}

export interface Owner {
  id: string;
  avatar_url: string;
  email: string;
  display_name: string;
  name: string;
  type: string;
}

export class AppsClient extends ClientBase {

  constructor(endpoint: string, authToken: string, filters?: FetchFilter) {
    super(endpoint, "/v0.1/apps", sonomaAuthFilter(authToken), filters);
  }

  async list(): Promise<AppResponse[]> {
    return this.fetch(this.rootEndpoint)
      .then(response => response.json());
  }
}
