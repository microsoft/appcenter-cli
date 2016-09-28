// Functions to read information from the user

import * as inquirer from "inquirer";

export { Questions, Answers, Separator } from "inquirer";

interface PromptFunc {
  (prompt: string): Promise<string>;
  password: {(prompt: string): Promise<string>};
  question: {(questions: inquirer.Questions): Promise<inquirer.Answers>};
}

const prompt =  <PromptFunc>function prompt(message: string): Promise<string> {
  return (<PromptFunc>prompt).question([
    {
      name: "result", message: message
    }])
    .then(answers => answers["result"]);
}

prompt.password = function password(message: string): Promise<string> {
  return (<PromptFunc>prompt).question([
    {
      type: "password",
      name: "result",
      message: message
    }])
  .then(answers => answers["result"]);
};

prompt.question = function(questions: inquirer.Questions): Promise<inquirer.Answers> {
  // Wrap inquirer promise in "real" promise, typescript definitions
  // don't line up.
  return Promise.resolve(inquirer.prompt(questions));
};

export { prompt };

