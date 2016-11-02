// Helper function to create client objects
const debug = require("debug")("sonoma-cli:util:apis:create-client");

import SonomaClient = require("./generated/SonomaClient");
import { SonomaClientCredentials } from "./sonoma-client-credentials";
import { userAgentFilter } from "./user-agent-filter";
const BasicAuthenticationCredentials = require("ms-rest").BasicAuthenticationCredentials;
import { ServiceCallback } from "ms-rest";

const createLogger = require('ms-rest').LogFilter.create;

import { isDebug } from "../interaction";
import { Profile } from "../profile";

export function createSonomaClient(userName: string, password: string, endpoint: string): SonomaClient;
export function createSonomaClient(token: string, endpoint:string): SonomaClient;
export function createSonomaClient(user: Profile): SonomaClient;
export function createSonomaClient(...args: any[]): SonomaClient {
  if (args.length === 3) {
    return createBasicAuthClient(args[0], args[1], args[2]);
  }
  else if (args.length === 2) {
    return createSonomaAuthClientFromToken(args[0], args[1]);
  }
  return createSonomaAuthClient(args[0]);
}

function createClientOptions(): any {
  debug(`Creating client options, isDebug = ${isDebug()}`);
  const filters = [ userAgentFilter ];
  return {
    filters: isDebug() ? [createLogger()].concat(filters) : filters
  };
}


function createBasicAuthClient(userName: string, password: string, endpoint: string): SonomaClient {
  debug(`Creating client from user name and password for endpoint ${endpoint}`);
  return new SonomaClient(new BasicAuthenticationCredentials(userName, password), endpoint, createClientOptions());
}

function createSonomaAuthClientFromToken(token: Promise<string>, endpoint: string): SonomaClient {
  debug(`Creating client from token for endpoint ${endpoint}`);
  return new SonomaClient(new SonomaClientCredentials(token), endpoint, createClientOptions());
}

function createSonomaAuthClient(user: Profile): SonomaClient {
  if (!user) {
    debug(`No current user, not creating client`);
    return null;
  }
  debug(`Creating client from user for endpoint ${user.endpoint}`);
  return new SonomaClient(new SonomaClientCredentials(user.accessToken), user.endpoint, createClientOptions());
}

// Helper function to wrap client calls into promises while maintaining some type safety.
export function clientCall<T>(action: {(cb: ServiceCallback<any>): void}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    action((err: Error, result: T) => {
      if (err) { reject(err); }
      else { resolve(result); }
    });
  });
}
