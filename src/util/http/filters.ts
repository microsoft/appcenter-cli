// Definitions and helpers for building pre- and post-processing filters
// over the fetch API.

import { Request, isRequest, RequestInit, Response, Headers, isHeaders, HeaderInit, FetchFunc, fetch } from "./fetch-api";

export interface FetchFilter {
  (next: FetchFunc): FetchFunc;
}

function headersFromDictionary(headers: {[header: string]: string}): Headers {
  const result = new Headers();
  Object.keys(headers).forEach(header => {
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
      init = init || {};
      if (!init.headers) {
        init.headers = new Headers();
      }
      let x = init.headers;
      if (isHeaders(x)) {
        headers = x;
      } else {
        init.headers = headersFromDictionary(<{[key:string]:string}>init.headers);
        headers = <Headers>init.headers;
      }
    } else if (isRequest(input)) {
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
