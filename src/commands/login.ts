// Implementation of Mobile Center login command

import { Command, CommandArgs, CommandResult, success, failure, ErrorCodes, help, shortName, longName, required, hasArg } from "../util/commandline";
import { environments, defaultEnvironmentName, getUser, saveUser, deleteUser } from "../util/profile";
import { prompt, out } from "../util/interaction";
import { models, createMobileCenterClient, clientCall } from "../util/apis";
import { TokenValueType } from "../util/token-store";
import { logout } from "./lib/logout";

import { inspect } from "util";

const debug = require("debug")("mobile-center-cli:commands:login");

@help("Login to Mobile Center")
export default class LoginCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Username to log in as")
  @shortName("u")
  @longName("user")
  @hasArg
  userName: string;

  @help("Password to log in with")
  @shortName("p")
  @longName("password")
  @hasArg
  password: string;

  async runNoClient(): Promise<CommandResult> {
    if (this.token && (this.userName || this.password)) {
      return failure(ErrorCodes.InvalidParameter, "You must specify either a token or a user/password, not both");
    }

    let questions: any[] = this.userNameQuestion().concat(this.passwordQuestion());

    if (questions.length > 0) {
      let answers = await prompt.question(questions);
      Object.assign(this, answers);
    }

    await this.removeLoggedInUser();
    await this.doLogin();

    return success();
  }

  private userNameQuestion(): any[] {
    if (!this.token && !this.userName) {
      return [{
        name: "userName",
        message:"Username or email: "
      }];
    }
    return [];
  }

  private passwordQuestion(): any[] {
    if (!this.token && !this.password) {
      return [{
        type: "password",
        name: "password",
        message: "Password: "
      }];
    }
    return [];
  }

  private async doLogin(): Promise<void> {
    let token: TokenValueType;
    let userSupplied = false;
    if (this.token) {
      token = { id: "SuppliedByUser", token: this.token };
      userSupplied = true;
    } else {
      let createTokenResponse = await out.progress("Logging in...", this.createAuthToken());
      token = { id: createTokenResponse.id, token: createTokenResponse.apiToken };
    }
    let user: models.UserProfileResponse = await out.progress("Getting user info ...", this.getUserInfo(token.token));
    saveUser(user, { id: token.id, token: token.token }, this.environmentName, userSupplied);
    out.text(`Logged in as ${user.name}`);
  }

  private createAuthToken(): Promise<models.ApiTokensPostResponse> {
    const endpoint = environments(this.environmentName).endpoint;
    const client = createMobileCenterClient(this.userName, this.password, endpoint);
    return clientCall<models.ApiTokensPostResponse>(cb => client.account.createApiToken({ description: "Created from mobile center cli"}, cb));
  }

  private getUserInfo(token: string): Promise<models.UserProfileResponse> {
    const endpoint = environments(this.environmentName).endpoint;
    const client = createMobileCenterClient(token, endpoint);
    return clientCall<models.UserProfileResponse>(cb => client.account.getUserProfile(cb));
  }

  private async removeLoggedInUser(): Promise<void> {
    const currentUser = getUser();
    if (currentUser !== null) {
      debug(`Currently logged in as ${currentUser.userName}, removing token id ${currentUser.accessTokenId}`);

      const client = createMobileCenterClient(currentUser);
      await logout(client, currentUser);
    }
  }
}
