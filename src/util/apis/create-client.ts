// Helper function to create client objects
const debug = require("debug")("appcenter-cli:util:apis:create-client");
import { inspect } from "util";

import { AppCenterClient } from "./generated/src/appCenterClient";
import { createEmptyPipeline } from "@azure/core-rest-pipeline"
import { userAgentPolicy } from "./user-agent-policy";
import { telemetryPolicy } from "./telemetry-policy";
import { TokenCredential, GetTokenOptions, AccessToken } from '@azure/core-auth';

import { ServiceClientOptions } from "@azure/core-client";

const BasicAuthenticationCredentials = require("@azure/ms-rest-js").BasicAuthenticationCredentials;
import { ServiceCallback, RestError, HttpOperationResponse, WebResource } from "@azure/ms-rest-js";

// import { isDebug } from "../interaction";
import { Profile } from "../profile";
import { failure, ErrorCodes } from "../../util/commandline/command-result";

export interface AppCenterClientFactory {
  fromToken(token: string | Promise<string> | { (): Promise<string> }, endpoint: string): AppCenterClient;
  fromProfile(user: Profile): AppCenterClient;
}

export function createAppCenterClient(command: string[], telemetryEnabled: boolean): AppCenterClientFactory {
  function createClientOptions(): ServiceClientOptions {
    const pipeline = createEmptyPipeline();
    pipeline.addPolicy(telemetryPolicy(command.join(" "), telemetryEnabled));
    pipeline.addPolicy(userAgentPolicy());
  
    const serviceClientOptions: ServiceClientOptions = {
      pipeline,
    };
  
    return serviceClientOptions;
  }

  return {
    fromToken(token: string | Promise<string> | { (): Promise<string> }, endpoint: string): AppCenterClient {
      debug(`Creating client from token for endpoint ${endpoint}`);
      let tokenFunc: { (): Promise<string> };

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
      return new AppCenterClient(new SimpleTokenCredential(tokenFunc), { endpoint: endpoint, ...createClientOptions() });
    },

    fromProfile(user: Profile): AppCenterClient {
      if (!user) {
        debug(`No current user, not creating client`);
        return null;
      }
      debug(`Creating client from user for user ${inspect(user)}`);
      return new AppCenterClient(new SimpleTokenCredential(() => user.accessToken), { endpoint: user.endpoint, ...createClientOptions() });
    },
  };
}

// Helper function to wrap client calls into promises while maintaining some type safety.
export function clientCall<T>(action: { (cb: ServiceCallback<any>): void }): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    action((err: Error, result: T) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

//
// Response type for clientRequest<T> - returns both parsed result and the HTTP response.
//
export interface ClientResponse<T> {
  result: T;
  response: HttpOperationResponse;
}

export async function handleHttpError(
  error: any,
  check404: boolean,
  messageDefault: string,
  message404: string = `404 Error received from api`,
  message401: string = `401 Error received from api`
): Promise<void> {
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
export function clientRequest<T>(action: { (cb: ServiceCallback<any>): void }): Promise<ClientResponse<T>> {
  return new Promise<ClientResponse<T>>((resolve, reject) => {
    action((err: Error | RestError, result: T, request: WebResource, response: HttpOperationResponse) => {
      if (err) {
        reject(err);
      } else {
        resolve({ result, response });
      }
    });
  });
}

class SimpleTokenCredential implements TokenCredential {
  constructor(private tokenFunc: () => Promise<string>) {}

  async getToken(scope: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> {
    const token = await this.tokenFunc();
    // Assuming the token never expires. You might want to provide a way to set the expiry.
    const expiryTimestamp = new Date().getTime() + 60 * 60 * 24 * 1000;
    
    return { token, expiresOnTimestamp: expiryTimestamp };
  }
}
