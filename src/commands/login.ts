// Implementation of Sonoma login command

import { Command, CommandResult, success, failure, shortName, longName, required, hasArg } from "../util/commandline";
import { environments, getUser, saveUser, deleteUser } from "../util/profile";
import { prompt, out } from "../util/interaction";
import { AuthTokenClient, CreateAuthTokenResponse } from "../util/apis/auth-token";
import { UserClient, GetUserResponse } from "../util/apis/users";
import { basicAuthFilter } from "../util/http/basic-auth-filter";

import { inspect } from "util";

const debug = require("debug")("sonoma-cli:commands:login");

export default class LoginCommand extends Command {
  constructor(command: string[]) {
    super(command);
  }

  @shortName("u")
  @longName("user")
  @hasArg
  userName: string;

  @shortName("p")
  @longName("password")
  @hasArg
  password: string;

  @shortName("e")
  @longName("env")
  @hasArg
  environmentName: string;

  async run(): Promise<CommandResult> {
    if (!this.userName) {
      this.userName = await prompt("Username: ");
    }

    if (!this.password) {
      this.password = await prompt.password("Password: ");
    }

    await this.doLogin();

    return success();
  }

  private async doLogin(): Promise<GetUserResponse> {
    if (getUser() !== null) {

    }

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

  private async removeLoggedInUser(): Promise<void> {
    // TODO: Can't currently delete existing token off server since
    // you have to have a password at the moment to manage api keys.
    // Server is changing, finish this stuff then.

    const currentUser = getUser();
    if (currentUser !== null) {
      // TODO: remove existing token

    }
  }
}
