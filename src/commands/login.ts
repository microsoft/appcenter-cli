// Implementation of AppCenter login command
import * as os from "os";
const opener = require("opener");
import * as qs from "qs";
import { Command, CommandArgs, CommandResult, success, failure, succeeded, ErrorCodes, help, shortName, longName, hasArg } from "../util/commandline";
import { environments, getUser, saveUser, getTokenFromEnvironmentVar, appCenterAccessTokenEnvVar } from "../util/profile";
import { prompt, out } from "../util/interaction";
import { models, clientRequest, ClientResponse } from "../util/apis";
import { TokenValueType } from "../util/token-store";
import { logout } from "./lib/logout";

const debug = require("debug")("appcenter-cli:commands:login");

@help("Log in")
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
    let result = this.validateArguments();
    let userSuppliedToken = false;
    try {
      if (succeeded(result)) {

        await this.removeLoggedInUser();

        let token: TokenValueType;
        if (this.token) {
          userSuppliedToken = true;
          token = await this.doTokenLogin();
        } else if (this.isInteractiveEnvironment) {
          userSuppliedToken = false;
          token = await this.doInteractiveLogin();
        } else {
          userSuppliedToken = false;
          token = await this.doUserNameAndPasswordLogin();
        }

        const userResponse = await out.progress("Getting user info ...", this.getUserInfo(token.token));
        await saveUser(userResponse.result, { id: token.id, token: token.token }, this.environmentName, userSuppliedToken);
        out.text(`Logged in as ${userResponse.result.name}`);
        // Force early exit to avoid long standing delays if token deletion is slow
        process.exit(0);
        result = success();
      }
    } catch (err) {
     result =  failure(ErrorCodes.Exception, err.message);
    }
    return result;
  }

  private get isInteractiveEnvironment(): boolean {
    return !!(environments(this.environmentName).loginEndpoint);
  }

  private validateArguments(): CommandResult {
    if (this.isInteractiveEnvironment && (this.userName || this.password) && !this.token) {
      return failure(ErrorCodes.InvalidParameter, "this environment requires interactive login, do not use the --user or --password switches");
    }
    if (!this.isInteractiveEnvironment && (this.userName || this.password) && this.token) {
      return failure(ErrorCodes.InvalidParameter, "you must specify either a token or a user/password, not both");
    }
    if (getTokenFromEnvironmentVar()) {
      return failure(ErrorCodes.IllegalCommand, `can't login when token is set in environment variable ${appCenterAccessTokenEnvVar}`);
    }
    return success();
  }

  private async doUserNameAndPasswordLogin(): Promise<TokenValueType> {
    const questions: any[] = this.userNameQuestion.concat(this.passwordQuestion);
    if (questions.length > 0) {
      const answers = await prompt.question(questions);
      Object.assign(this, answers);
    }

    const endpoint = environments(this.environmentName).endpoint;
    const client = this.clientFactory.fromUserNameAndPassword(this.userName, this.password, endpoint);

    const createTokenResponse = await out.progress("Logging in...",
      clientRequest<models.ApiTokensCreateResponse>((cb) => client.apiTokens.newMethod({ description: "AppCenter CLI"}, cb)));

    if (createTokenResponse.response.statusCode >= 400) {
      throw new Error("login was not successful");
    }
    return { id: createTokenResponse.result.id, token: createTokenResponse.result.apiToken };
  }

  private async doInteractiveLogin(): Promise<TokenValueType> {
    const loginUrl = environments(this.environmentName).loginEndpoint + "?" + qs.stringify({ hostname: os.hostname()});

    out.text(`Opening your browser... ${os.EOL}? Visit ${loginUrl} and enter the code:`);
    opener(loginUrl);
    const token = await prompt("Access code from browser: ");
    return { id: null, token: token };
  }

  private async doTokenLogin(): Promise<TokenValueType> {
    return { id: "SuppliedByUser", token: this.token };
  }

  private get userNameQuestion(): any[] {
    if (!this.token && !this.userName) {
      return [{
        name: "userName",
        message: "Username or email: "
      }];
    }
    return [];
  }

  private get passwordQuestion(): any[] {
    if (!this.token && !this.password) {
      return [{
        type: "password",
        name: "password",
        message: "Password: "
      }];
    }
    return [];
  }

  private getUserInfo(token: string): Promise<ClientResponse<models.UserProfileResponse>> {
    const endpoint = environments(this.environmentName).endpoint;
    const client = this.clientFactory.fromToken(token, endpoint);
    return clientRequest<models.UserProfileResponse>((cb) => client.users.get(cb));
  }

  private async removeLoggedInUser(): Promise<void> {
    const currentUser = getUser();
    if (currentUser !== null) {
      debug(`Currently logged in as ${currentUser.userName}, removing token`);

      debug(`Creating client factory`);
      const client = this.clientFactory.fromProfile(currentUser);
      debug(`Removing existing token`);
      await logout(client, currentUser);
    }
  }
}
