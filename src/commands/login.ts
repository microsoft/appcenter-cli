// Implementation of Sonoma login command

import { Command, CommandArgs, CommandResult, success, failure, help, shortName, longName, required, hasArg } from "../util/commandline";
import { environments, defaultEnvironmentName, getUser, saveUser, deleteUser } from "../util/profile";
import { prompt, out } from "../util/interaction";
import { models, createSonomaClient, clientCall } from "../util/apis";
import { logout } from "./lib/logout";

import { inspect } from "util";

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

  async runNoClient(): Promise<CommandResult> {
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

    await this.removeLoggedInUser();
    await this.doLogin();

    return success();
  }

  private async doLogin(): Promise<void> {
    let token: models.ApiTokensPostResponse = await out.progress("Logging in ...", this.createAuthToken());
    debug(`Got response = ${inspect(token)}`);
    let user: models.UserProfileResponse = await out.progress("Getting user info ...", this.getUserInfo(token.apiToken));
    debug(`Got response = ${inspect(user)}`);
    saveUser(user, { id: token.id, token: token.apiToken }, this.environmentName);
    out.text(`Logged in as ${user.name}`);
  }

  private createAuthToken(): Promise<models.ApiTokensPostResponse> {
    const endpoint = environments(this.environmentName).endpoint;
    const client = createSonomaClient(this.userName, this.password, endpoint);
    return clientCall<models.ApiTokensPostResponse>(cb => client.account.createApiToken({ description: "Created from sonoma cli"}, cb));
  }

  private getUserInfo(token: string): Promise<models.UserProfileResponse> {
    const endpoint = environments(this.environmentName).endpoint;
    const client = createSonomaClient(token, endpoint);
    return clientCall<models.UserProfileResponse>(cb => client.account.getUserProfile(cb));
  }

  private async removeLoggedInUser(): Promise<void> {
    const currentUser = getUser();
    if (currentUser !== null) {
      debug(`Currently logged in as ${currentUser.userName}, removing token id ${currentUser.accessTokenId}`);

      const client = createSonomaClient(currentUser);
      await logout(client, currentUser);
    }
  }
}
