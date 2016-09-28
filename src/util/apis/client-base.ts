// Base class for API clients

import * as fetch from "node-fetch";
import { FetchFunc, FetchFilter, chainFilters, basicAuthFilter, sonomaAuthFilter, httpFailedFilter, noop as noopFilter, logFilter } from "../http";

export abstract class ClientBase {
  protected endpoint: string;
  protected pathRoot: string;
  protected fetch: FetchFunc;

  constructor(endpoint: string, pathRoot: string, authFilter: FetchFilter, otherFilters: FetchFilter) {
    this.endpoint = endpoint;
    this.pathRoot = pathRoot;
    otherFilters = otherFilters || noopFilter;
    this.fetch = chainFilters(otherFilters, authFilter, httpFailedFilter, logFilter)(fetch);
  }

  protected get rootEndpoint() {
    return `${this.endpoint}${this.pathRoot}`;
  }
}

