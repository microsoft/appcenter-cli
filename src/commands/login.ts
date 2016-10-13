// Implementation of Sonoma login command

import { Command, CommandArgs, CommandResult, success, failure, help, shortName, longName, required, hasArg } from "../util/commandline";
import { environments, defaultEnvironmentName, getUser, saveUser, deleteUser } from "../util/profile";
import { prompt, out } from "../util/interaction";
import { AuthTokenClient, CreateAuthTokenResponse } from "../util/apis";
import { UserClient, GetUserResponse } from "../util/apis";

import { inspect } from "util";

import SonomaClient = require("../util/apis/generated/SonomaClient");
import { ApiTokensPostResponse, UserProfileResponse } from "../util/apis/generated/models";

import { ServiceClientCredentials } from "ms-rest";
import { SonomaClientCredentials } from "../util/apis/sonoma-client-credentials";
const BasicAuthenticationCredentials = require("ms-rest").BasicAuthenticationCredentials;

const debug = require("debug")("sonoma-cli:commands:login");

@help("Log in to the sonoma system.")
export default class LoginCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("user name to log in as")
  @shortName("u")
  @longName("user")
  @hasArg
  userName: string;

  @help("password to log in with")
  @shortName("p")
  @longName("password")
  @hasArg
  password: string;

  //@help(`environment to log into (defaults to ${defaultEnvironmentName()})`)
  @shortName("e")
  @longName("env")
  @hasArg
  environmentName: string;

  async run(): Promise<CommandResult> {
    let questions: any[] = [
      {
        name: "userName",
        message: "Username: "
      },
      {
        type: "password",
        name: "password",
        message: "Password: "
      }
    ];

    if (this.password) {
      questions.splice(1, 1);
    }

    if (this.userName) {
      questions.splice(0, 1);
    }

    if (questions.length > 0) {
      let answers = await prompt.question(questions);
      Object.keys(answers).forEach(key => {
        (<any>this)[key] = answers[key];
      });
    }

    await this.removeLoggedInUserAutorest();
    await this.doLoginAutorest();

    return success();
  }


  private async doLogin(): Promise<GetUserResponse> {
    const endpoint = environments(this.environmentName).endpoint;
    const tokenClient = new AuthTokenClient(endpoint, this.userName, this.password);

    let token = await out.progress("Logging in ...", tokenClient.createToken());
    debug(`Got response = ${inspect(token)}`);

    let userClient = new UserClient(endpoint, token.api_token);
    let user = await out.progress("Getting user info ...", userClient.getUser());

    saveUser(user, token, this.environmentName);

    out.text(`Logged in as ${user.name}`);
    return user;
  }

  private async doLoginAutorest(): Promise<void> {
    let token: ApiTokensPostResponse = await out.progress("Logging in ...", this.createAuthTokenAutorest());
    debug(`Got response = ${inspect(token)}`);
    let user: UserProfileResponse = await out.progress("Getting user info ...", this.getUserInfoAutorest(token.apiToken));
    debug(`Got response = ${inspect(user)}`);
    saveUser(user, token, this.environmentName);
    out.text(`Logged in as ${user.name}`);
  }

  private createAuthTokenAutorest(): Promise<ApiTokensPostResponse> {
    const endpoint = environments(this.environmentName).endpoint;
    const creds: ServiceClientCredentials = new BasicAuthenticationCredentials(this.userName, this.password);
    const client = new SonomaClient(creds, endpoint, {});

    return new Promise((resolve, reject) => {
      client.account.createApiToken({description: "Created from sonoma cli"}, function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  private getUserInfoAutorest(token: string): Promise<UserProfileResponse> {
    const endpoint = environments(this.environmentName).endpoint;
    const creds: ServiceClientCredentials = new SonomaClientCredentials(token);
    const client = new SonomaClient(creds, endpoint, {});

    return new Promise((resolve, reject) => {
      client.account.getUserProfile(function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  private async removeLoggedInUser(): Promise<void> {
    const currentUser = getUser();
    if (currentUser !== null) {
      debug(`Currently logged in as ${currentUser.userName}, removing token id ${currentUser.accessTokenId}`);
      const tokenClient = new AuthTokenClient(currentUser.endpoint, currentUser.accessToken);
      await out.progress("Cleaning up existing user...",
        tokenClient.deleteToken(currentUser.accessTokenId));
      debug(`Token has been removed`);
      deleteUser();
    }
  }

  private async removeLoggedInUserAutorest(): Promise<void> {
    const currentUser = getUser();
    if (currentUser !== null) {
      debug(`Currently logged in as ${currentUser.userName}, removing token id ${currentUser.accessTokenId}`);
      const creds = new SonomaClientCredentials(currentUser.accessToken);
      const client = new SonomaClient(creds, currentUser.endpoint, {});
      await out.progress("Cleaning up existing user...",
        new Promise((resolve, reject) => client.account.deleteApiToken(currentUser.accessTokenId, function (err, result) {
          if (err) { reject(err); }
          else { resolve(result); }
        })));
      debug(`Token has been removed`);
      deleteUser();
    }
  }
}
