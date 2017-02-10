// Helper function to create client objects
const debug = require("debug")("mobile-center-cli:util:apis:create-client");
import { inspect } from "util";
import { IncomingMessage } from "http";

import MobileCenterClient = require("./generated/mobileCenterClient");
import { MobileCenterClientCredentials } from "./mobile-center-client-credentials";
import { userAgentFilter } from "./user-agent-filter";
import { telemetryFilter } from "./telemetry-filter";

const BasicAuthenticationCredentials = require("ms-rest").BasicAuthenticationCredentials;
import { ServiceCallback, ServiceError, WebResource } from "ms-rest";

const createLogger = require('ms-rest').LogFilter.create;

import { isDebug } from "../interaction";
import { Profile } from "../profile";

export interface MobileCenterClientFactory {
  fromUserNameAndPassword(userName: string, password: string, endpoint: string): MobileCenterClient;
  fromToken(token: string | Promise<string> | {(): Promise<string>}, endpoint: string): MobileCenterClient;
  fromProfile(user: Profile): MobileCenterClient;
}

export function createMobileCenterClient(command: string[], telemetryEnabled: boolean): MobileCenterClientFactory {
  function createClientOptions(): any {
    debug(`Creating client options, isDebug = ${isDebug()}`);
    const filters = [userAgentFilter, telemetryFilter(command.join(" "), telemetryEnabled)];
    return {
      filters: isDebug() ? [createLogger()].concat(filters) : filters
    };
  }

  return {
    fromUserNameAndPassword(userName: string, password: string, endpoint: string): MobileCenterClient {
      debug(`Creating client from user name and password for endpoint ${endpoint}`);
      return new MobileCenterClient(new BasicAuthenticationCredentials(userName, password), endpoint, createClientOptions());
    },

    fromToken(token: string | Promise<string> | {(): Promise<string>}, endpoint: string): MobileCenterClient {
      debug(`Creating client from token for endpoint ${endpoint}`);
      let tokenFunc: {(): Promise<string>};

      if (typeof token === "string") {
        debug("Creating from token as string");
        tokenFunc = () => Promise.resolve(<string>token);
      } else if (typeof token === "object") {
        debug("Creating from token as promise");
        tokenFunc = () => <Promise<string>>token;
      } else {
        debug("Creating from token as function");
        tokenFunc = token;
      }
      debug(`Passing token ${tokenFunc} of type ${typeof tokenFunc}`);
      return new MobileCenterClient(new MobileCenterClientCredentials(tokenFunc), endpoint, createClientOptions());
    },

    fromProfile(user: Profile): MobileCenterClient {
      if (!user) {
        debug(`No current user, not creating client`);
        return null;
      }
      debug(`Creating client from user for user ${inspect(user)}`);
      return new MobileCenterClient(new MobileCenterClientCredentials(() => user.accessToken), user.endpoint, createClientOptions());
    }
  };
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

//
// Response type for clientRequest<T> - returns both parsed result and the HTTP response.
//
export interface ClientResponse<T> {
  result: T;
  response: IncomingMessage;
}

// Helper function to wrap client calls into pormises and returning both HTTP response and parsed result
export function clientRequest<T>(action: {(cb: ServiceCallback<any>): void}): Promise<ClientResponse<T>> {
  return new Promise<ClientResponse<T>>((resolve, reject) => {
    action((err: Error | ServiceError, result: T, request: WebResource, response: IncomingMessage) => {
      if (err) { reject(err); }
      else {
        resolve({ result, response});
      }
    });
  });
}
