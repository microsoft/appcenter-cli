// Definitions and helpers for building pre- and post-processing filters
// over the fetch API.

import { Request, isRequest, RequestInit, Response, Headers, isHeaders, HeaderInit, FetchFunc, fetch } from "./fetch-api";
import { inspect } from "util";
import { isDebug } from "../interaction";

const debug = require("debug")("sonoma-cli:util:http:filters");

export interface FetchFilter {
  (next: FetchFunc): FetchFunc;
}

//
// Null filter that doesn't filter anything
//
export function noop(next: FetchFunc): FetchFunc {
  return next;
}

function headersFromDictionary(headers: {[header: string]: string}): Headers {
  const result = new fetch.Headers();
  Object.keys(headers).forEach(header => {
    debug("Setting header ${header} to ${headers[header]}")
    result.set(header, headers[header]);
  });
  return result;
}

//
// Helper function for filter implementers.
// Takes all the various possible inputs to fetch and returns a tuple of
// [ Request, RequestInit, Headers], where the headers object is guaranteed
// to be plugged into the request or requestInit. So you can party on the resulting
// objects and then pass them down to the next caller in the chain directly
// and everything's wired up correctly.
//
export function normalizedRequest(input: string | Request, init?: RequestInit): [string | Request, RequestInit, Headers] {
    let headers: Headers;
    if (typeof input === "string") {
      debug("Normalizing headers from string input");
      init = init || {};
      if (!init.headers) {
        debug("No headers in input, creating empty headers object");
        init.headers = new fetch.Headers();
      }
      let x = init.headers;
      if (isHeaders(x)) {
        debug("Headers object exists in init");
        headers = x;
      } else {
        debug("Initializing headers object in init from plain object");
        init.headers = headersFromDictionary(<{[key:string]:string}>init.headers);
        headers = <Headers>init.headers;
      }
    } else if (isRequest(input)) {
      debug("Normalizing headers from Request object");
      headers = input.headers;
    }
    return [input, init, headers];
}

//
// Creates a new filter which is a combination of two (or more) filters.
// Doing:
//
//    let filter1: FetchFilter, filter2: FetchFilter
//    let chain: FetchFilter = chainFilters(filter1, filter2);
//    let fetcher: FetchFunc = chain(fetch);
//
// Will result in the same filtering as if you'd called:
//    filter1(filter2(fetch));
//
export function chainFilters(firstFilter: FetchFilter, ...otherFilters: FetchFilter[]): FetchFilter;
export function chainFilters(filters: FetchFilter[]): FetchFilter;
export function chainFilters(...args: any[]): FetchFilter {
  if (args.length === 0)
  {
    throw new Error("You must supply at least one filter");
  }

  let allFilters: FetchFilter[] = [];

  if(args.length === 1) {
    allFilters = <FetchFilter[]>args;
    if (allFilters.length === 0) {
      throw new Error("You must supply at least one filter");
    }
  } else {
    allFilters = [<FetchFilter>args[0]].concat(<FetchFilter[]>args.slice(1));
  }

  if (allFilters.length === 1) {
    return allFilters[0];
  }

  return function(next: FetchFunc): FetchFunc {
    return allFilters.reduceRight((fetcher, filter) => filter(fetcher), next);
  }
}

//
// Default filter that is used to translate failed HTTP responses to
// exceptions so everything surfaces as a TypeError, not just network errors.
//
export function httpFailedFilter(next: FetchFunc): FetchFunc {
  return function translatorFetch(input: string | Request, init?: RequestInit): Promise<Response> {
    debug("Running error translation filter request processing");
    return next(input, init)
      .then(response => {
        debug("Running error translation filter response processing");
        if (!response.ok) {
          throw new TypeError(`Request failed with ${response.status} ${response.statusText}`);
        }
        return response;
      }
    );
  };
}

export function logFilter(next: FetchFunc): FetchFunc {
  if (isDebug()) {
    return function loggingFetch(input: string | Request, init?: RequestInit): Promise<Response> {
      console.log(`Sending request to: ${inspect(input, {depth: null})} init = ${inspect(init, {depth: null})}`);
      return next(input, init)
        .then(response => {
          console.log(`Response: ${inspect(response)}`);
          return response;
        })
        .catch(ex => {
          console.log(`Fetch failed with error: ${inspect(ex)}`);
          throw ex;
        });
    }
  } else {
    return next;
  }
}
