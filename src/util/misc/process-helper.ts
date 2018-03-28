import * as child_process from "child_process";
import { out } from "../interaction";

export function execAndWait(command: string, onStdOut?: (text: string) => void, onStdErr?: (text: string) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!onStdOut) {
      onStdOut = (text) => out.text(text);
    }
    if (!onStdErr) {
      onStdErr = (text) => out.text(text);
    }

    const process = child_process.exec(command);

    process.on("exit", (exitCode: number) => {
      resolve(exitCode);
    });

    process.on("error", (message: string) => {
      reject(new Error(message));
    });

    process.stdout.on("data", (data) => {
      onStdOut(data as string);
    });

    process.stderr.on("data", (data) => {
      onStdErr(data as string);
    });
  });
}
