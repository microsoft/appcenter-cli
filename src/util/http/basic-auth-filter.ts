import { FetchFunc, Request, RequestInit, Response } from "./fetch-api";
import { normalizedRequest, FetchFilter } from "./filters";

export function basicAuthFilter(user: string, password: string): FetchFilter {
  const authHeader = new Buffer(`${user}:{$password}`).toString("base64");

  return function (next: FetchFunc): FetchFunc {
    return function (input: string | Request, init?: RequestInit): Promise<Response> {
      const [req, reqInit, headers] = normalizedRequest(input, init);
      headers.set("Authorization", `Basic ${authHeader}`);
      return next(req, reqInit);
    };
  };
}
