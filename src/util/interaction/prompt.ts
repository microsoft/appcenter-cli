// Functions to read information from the user

import * as inquirer from "inquirer";
import { isQuiet } from "./io-options";
export { Questions, Answers, Separator } from "inquirer";

export function prompt(message: string): Promise<string> {
  return prompt.question([
    {
      name: "result", message: message
    }])
    .then(answers => answers["result"]);
}

export namespace prompt {
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

      // Wrap inquirer promise in "real" promise, typescript definitions
      // don't line up.
      return Promise.resolve(answers);
    }
    // Wrap inquirer promise in "real" promise, typescript definitions
    // don't line up.
    return Promise.resolve(inquirer.prompt(questions));
  };
}
