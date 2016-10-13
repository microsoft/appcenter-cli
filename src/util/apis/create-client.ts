// Helper function to create client objects
const debug = require("debug")("sonoma-cli:util:apis:create-client");

import SonomaClient = require("./generated/SonomaClient");
import { SonomaClientCredentials } from "./sonoma-client-credentials";
const BasicAuthenticationCredentials = require("ms-rest").BasicAuthenticationCredentials;
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
  return {
    filters: isDebug() ? [createLogger()] : []
  };
}


function createBasicAuthClient(userName: string, password: string, endpoint: string): SonomaClient {
  debug(`Creating client from user name and password for endpoint ${endpoint}`);
  return new SonomaClient(new BasicAuthenticationCredentials(userName, password), endpoint, createClientOptions());
}

function createSonomaAuthClientFromToken(token: string, endpoint: string): SonomaClient {
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
