// Functions to read information from the user

import * as promptly from "promptly";

interface PromptFunc {
  (prompt: string): Promise<string>;
  password: {(prompt: string): Promise<string>};
}

const prompt =  <PromptFunc>function prompt(prompt: string): Promise<string> {
  // TODO: Support --quiet global script
  return promptly.prompt(prompt);
}

prompt.password = function password(prompt: string): Promise<string> {
  // TODO: Support --quient global script
  return promptly.password(prompt);
}

export { prompt };
