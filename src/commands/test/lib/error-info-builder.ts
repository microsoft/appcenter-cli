import { ErrorCodes, AppCommand } from "../../../util/commandline";
import { Profile } from "../../../util/profile";
import * as os from "os";

export function buildErrorInfo(err: any, profile: Profile, command: AppCommand): { message: string, exitCode: number } {
  const exitCode = err.exitCode || err.errorCode || ErrorCodes.Exception;
  let message : string = null;

  let helpMessage = `Further error details: For help, please send both the reported error above and the following environment information to us by going to https://appcenter.ms/apps and starting a new conversation (using the icon in the bottom right corner of the screen)${os.EOL}
    Environment: ${os.platform()}
    App Upload Id: ${command.identifier}
    Timestamp: ${Date.now()}
    Operation: ${command.constructor.name}
    Exit Code: ${exitCode}`;

  if (profile) {
    helpMessage += `
    User Email: ${profile.email}
    User Name: ${profile.userName}
    User Id: ${profile.userId}
    `;
  }

  if (err.message && err.message.indexOf("Not Found") !== -1) {
    message = `Requested resource not found - please check --app: ${command.identifier}${os.EOL}${os.EOL}${helpMessage}`;
  } else if (err.errorCode === 5) {
    message = `Unauthorized error - please check --token or log in to the appcenter CLI.${os.EOL}${os.EOL}${helpMessage}`;
  } else if (err.errorMessage) {
    message = `${err.errorMessage}${os.EOL}${os.EOL}${helpMessage}`;
  } else {
    message = `${err.message}${os.EOL}${os.EOL}${helpMessage}`;
  }

  return { message, exitCode };
}
