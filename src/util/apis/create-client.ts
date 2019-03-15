// Helper function to create client objects
const debug = require("debug")("appcenter-cli:util:apis:create-client");
import { inspect } from "util";
import { IncomingMessage } from "http";

import { AppCenterClient } from "./generated/appCenterClient";
import { AppCenterClientCredentials } from "./appcenter-client-credentials";
import { userAgentFilter } from "./user-agent-filter";
import { telemetryFilter } from "./telemetry-filter";

const BasicAuthenticationCredentials = require("ms-rest").BasicAuthenticationCredentials;
import { ServiceCallback, ServiceError, WebResource } from "ms-rest";

const createLogger = require("ms-rest").LogFilter.create;

import { isDebug } from "../interaction";
import { Profile } from "../profile";
import { failure, ErrorCodes } from "../../util/commandline/command-result";

export interface AppCenterClientFactory {
  fromUserNameAndPassword(userName: string, password: string, endpoint: string): AppCenterClient;
  fromToken(token: string | Promise<string> | {(): Promise<string>}, endpoint: string): AppCenterClient;
  fromProfile(user: Profile): AppCenterClient;
}

export function createAppCenterClient(command: string[], telemetryEnabled: boolean): AppCenterClientFactory {
  function createClientOptions(): any {
    debug(`Creating client options, isDebug = ${isDebug()}`);
    const filters = [userAgentFilter, telemetryFilter(command.join(" "), telemetryEnabled)];
    return {
      filters: isDebug() ? [createLogger()].concat(filters) : filters
    };
  }

  return {
    fromUserNameAndPassword(userName: string, password: string, endpoint: string): AppCenterClient {
      debug(`Creating client from user name and password for endpoint ${endpoint}`);
      return new AppCenterClient(new BasicAuthenticationCredentials(userName, password), endpoint, createClientOptions());
    },

    fromToken(token: string | Promise<string> | {(): Promise<string>}, endpoint: string): AppCenterClient {
      debug(`Creating client from token for endpoint ${endpoint}`);
      let tokenFunc: {(): Promise<string>};

      if (typeof token === "string") {
        debug("Creating from token as string");
        tokenFunc = () => Promise.resolve(token as string);
      } else if (typeof token === "object") {
        debug("Creating from token as promise");
        tokenFunc = () => token as Promise<string>;
      } else {
        debug("Creating from token as function");
        tokenFunc = token;
      }
      debug(`Passing token ${tokenFunc} of type ${typeof tokenFunc}`);
      return new AppCenterClient(new AppCenterClientCredentials(tokenFunc), endpoint, createClientOptions());
    },

    fromProfile(user: Profile): AppCenterClient {
      if (!user) {
        debug(`No current user, not creating client`);
        return null;
      }
      debug(`Creating client from user for user ${inspect(user)}`);
      return new AppCenterClient(new AppCenterClientCredentials(() => user.accessToken), user.endpoint, createClientOptions());
    }
  };
}

// Helper function to wrap client calls into promises while maintaining some type safety.
export function clientCall<T>(action: {(cb: ServiceCallback<any>): void}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    action((err: Error, result: T) => {
      if (err) { reject(err); } else { resolve(result); }
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

export async function handleHttpError(error: any, check404: boolean,
    messageDefault: string, message404: string = `404 Error received from api`, message401: string = `401 Error received from api`): Promise<void> {
  if (check404 && error.statusCode === 404) {
    throw failure(ErrorCodes.InvalidParameter, message404);
  }

  if (error.statusCode === 401) {
    throw failure(ErrorCodes.NotLoggedIn, message401);
  } else {
    debug(`${messageDefault}- ${inspect(error)}`);
    throw failure(ErrorCodes.Exception, messageDefault);
  }
}

// Helper function to wrap client calls into pormises and returning both HTTP response and parsed result
export function clientRequest<T>(action: {(cb: ServiceCallback<any>): void}): Promise<ClientResponse<T>> {
  return new Promise<ClientResponse<T>>((resolve, reject) => {
    action((err: Error | ServiceError, result: T, request: WebResource, response: IncomingMessage) => {
      if (err) { reject(err); } else {
        resolve({ result, response});
      }
    });
  });
}
