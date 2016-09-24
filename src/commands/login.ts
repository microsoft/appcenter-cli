// Implementation of Sonoma login command

import { Command, CommandResult, success, failure, shortName, longName, required, hasArg } from "../util/commandline";
import { prompt, out } from "../util/interaction";

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

    await out.progress(`Logging in user ${this.userName} with password ${this.password} (shh!) ...`,
      new Promise(resolve => setTimeout(resolve, 2000)));

    console.log(`Logged in!`);
    return success();
  }
}