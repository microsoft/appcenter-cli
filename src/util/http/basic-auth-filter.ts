import { FetchFunc, Request, RequestInit, Response } from "./fetch-api";
import { normalizedRequest, FetchFilter } from "./filters";

const debug = require("debug")("sonoma-cli:util:http:basic-auth-filter");

export function basicAuthFilter(user: string, password: string): FetchFilter {
  const authHeader = new Buffer(`${user}:${password}`).toString("base64");

  return function (next: FetchFunc): FetchFunc {
    return function (input: string | Request, init?: RequestInit): Promise<Response> {
      debug("Running basic auth filter request processing");
      const [req, reqInit, headers] = normalizedRequest(input, init);
      headers.set("Authorization", `Basic ${authHeader}`);
      return next(req, reqInit);
    };
  };
}
