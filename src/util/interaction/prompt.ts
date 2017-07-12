// Functions to read information from the user

import * as _ from "lodash";
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

  /**
   * Automatically picks up an option if either 
   * it's the only choice in the list 
   * or autoAnswer is provided.
   * 
   * @param question Question object to ask
   * @param autoAnswer If provided & exists in choices list, then used as auto answer
   */
  export function autoAnsweringQuestion(question: inquirer.Question, autoAnswer?: string | string[] | boolean): Promise<inquirer.Answers> {
    if (question.type === "checkbox" && autoAnswer && _.isArray(autoAnswer)) {
      question.default = autoAnswer;
      question.pageSize = 1;
      const pr: any = inquirer.prompt(question);
      pr.ui.activePrompt.getCurrentValue();
      pr.ui.activePrompt.onEnd({ value: autoAnswer });
      return pr;
    }

    if (question.type === "confirm" && _.isBoolean(autoAnswer)) {
      question.default = autoAnswer;
      const pr: any = inquirer.prompt(question);
      pr.ui.activePrompt.onEnd(autoAnswer ? "y" : "n");
      return pr;
    }

    if (question.type === "input" && autoAnswer) {
      question.default = autoAnswer;
      const pr: any = inquirer.prompt(question);
      pr.ui.activePrompt.onEnd({ value: autoAnswer });
      return pr;
    }

    if (question.type === "list" && question.choices) {
      if (!autoAnswer && question.choices.length === 1)
        autoAnswer = (<any>question.choices)[0];

      if (autoAnswer) {
        const answer = _(question.choices)
          .find((x: string) => x.toLowerCase() === String(autoAnswer).toLowerCase())

        if (answer) {
          question.default = answer;
          question.pageSize = 1;
          const pr: any = inquirer.prompt(question);
          pr.ui.activePrompt.onSubmit(answer);
          return pr;
        }
      }
    }

    return prompt.question(question);
  }
}
