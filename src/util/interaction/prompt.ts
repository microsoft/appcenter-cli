// Functions to read information from the user

import * as inquirer from "inquirer";
import { isQuiet } from "./io-options";
export { Questions, Question, Answers, Separator } from "inquirer";

export function prompt(message: string): Promise<string> {
  return prompt.question([
    {
      name: "result", message: message
    }])
    .then(answers => answers["result"]);
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
    .then(answers => {
      return answers["confirm"];
    });
  }

  export function confirmWithTimeout(message: string, timeoutMS: number, defaultResponse?: boolean): Promise<boolean> {
    if (isQuiet()) {
      return Promise.resolve(!!defaultResponse);
    } else {
      let timerId: NodeJS.Timer;
      let confirmPrompt = inquirer.prompt({
        type: "confirm",
        name: "confirm",
        message: message,
        default: !!defaultResponse
      });

      let promptCompleted = confirmPrompt.then(answers => {
        clearTimeout(timerId);
        return answers["confirm"];
      });

      let timeoutPromise: Promise<boolean> = new Promise((resolve, reject) => {
        timerId = setTimeout(resolve, timeoutMS);
      }).then(() => {
        (<any>confirmPrompt).ui.close();
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
    .then(answers => answers["result"]);
  };

  export function question(questions: inquirer.Questions): Promise<inquirer.Answers> {
    if (isQuiet()) {
      if (!Array.isArray(questions)) {
        questions = [questions];
      }
      let answers: any = questions.reduce((answers: any, q: inquirer.Question) => {
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
  };
}
