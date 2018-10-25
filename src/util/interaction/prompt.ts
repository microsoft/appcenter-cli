// Functions to read information from the user

import * as inquirer from "inquirer";
import { isQuiet } from "./io-options";
export { Questions, Answers, Separator } from "inquirer";

export function prompt(message: string): Promise<string> {
  return prompt.question([
    {
      name: "result", message: message
    }])
    .then((answers) => answers["result"].toString());
}

export namespace prompt {
  export function confirm(message: string, defaultResponse?: boolean): Promise<boolean> {
    return prompt.question([
      {
        type: "confirm",
        name: "confirm",
        message: message,
        default: !!defaultResponse
      }
    ])
    .then((answers) => !!answers["confirm"]);
  }

  export function confirmWithTimeout(message: string, timeoutMS: number, defaultResponse?: boolean): Promise<boolean> {
    if (isQuiet()) {
      return Promise.resolve(!!defaultResponse);
    } else {
      let timerId: NodeJS.Timer;
      const confirmPrompt = inquirer.prompt({
        type: "confirm",
        name: "confirm",
        message: message,
        default: !!defaultResponse
      });

      const promptCompleted = confirmPrompt.then((answers: any) => {
        clearTimeout(timerId);
        return !!answers["confirm"];
      });

      const timeoutPromise: Promise<boolean> = new Promise((resolve, reject) => {
        /* tslint:disable-next-line:no-string-based-set-timeout */
        timerId = setTimeout(resolve, timeoutMS);
      }).then(() => {
        (confirmPrompt as any).ui.close();
        return !!defaultResponse;
      });

      return Promise.race([promptCompleted, timeoutPromise]);
    }
  }

  export function password(message: string): Promise<string> {
    return prompt.question([
      {
        type: "password",
        name: "result",
        message: message
      }])
    .then((answers) => answers["result"].toString());
  }

  export function question(questions: inquirer.Questions): Promise<inquirer.Answers> {
    if (isQuiet()) {
      if (!Array.isArray(questions)) {
        // Casting is done here due to incompatibility between typings and @types package
        questions = [questions as inquirer.Question];

      }
      const answers: any = (questions as inquirer.Question[]).reduce((answers: any, q: inquirer.Question) => {
        if (answers instanceof Error) {
          return answers;
        }
        if (q.type !== "confirm") {
          return new Error("Cannot prompt for input in quiet mode");
        }
        answers[q.name] = true;
        return answers;
      }, {});

      if (answers instanceof Error) {
        return Promise.reject(answers);
      }
      return Promise.resolve(answers);
    }
    // Wrap inquirer promise in "real" promise, typescript definitions
    // don't line up.
    return Promise.resolve(inquirer.prompt(questions));
  }
}
