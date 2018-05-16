import * as Readline from "readline";
import { out } from "../interaction";

const ctrlCPressed: Symbol = Symbol("Ctrl+C was pressed by user");

export async function pollContinuously<T>(executeRequest: () => PromiseLike<T>, processResponse: (response: T, responsesProcessed: number) => void, pollContinuously: boolean, delayBetweenRequests: number, progressMessage: string): Promise<void> {
  let requestsDone: number = 0;
  const readline = Readline.createInterface(process.stdin, process.stdout);
  const waitingForCtrlC = waitForCtrlC(readline);
  let timeoutTimer: NodeJS.Timer;
  try {
    while (true) {
      // executing request
      const executionResult = await out.progress(progressMessage, Promise.race([executeRequest(), waitingForCtrlC]));
      if (executionResult === ctrlCPressed) {
        // user pressed ctrl+c, exiting
        break;
      }

      // processing result
      processResponse(executionResult as T, requestsDone);

      if (!pollContinuously) {
        break;
      }

      requestsDone++;

      // waiting before next request
      const delayBeforeNextRequest = new Promise<void>((resolve) => {
        timeoutTimer = setTimeout(() => resolve(), delayBetweenRequests);
      });

      const waitingResult = await Promise.race([delayBeforeNextRequest, waitingForCtrlC]);
      if (waitingResult === ctrlCPressed) {
        // user pressed ctrl+c, exiting
        break;
      }
    }
  } finally {
    // cancelling timeout timer
    clearTimeout(timeoutTimer);
    // closing readline interface
    readline.close();
  }
}

function waitForCtrlC(readline: Readline.ReadLine): Promise<Symbol> {
  return new Promise<Symbol>((resolve) => {
    readline.once("SIGINT", () => {
      resolve(ctrlCPressed);
    });
  });
}
