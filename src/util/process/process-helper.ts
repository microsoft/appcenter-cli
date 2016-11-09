import * as child_process from "child_process";
import { out } from "../interaction";

export function execAndWait(command: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let process = child_process.exec(command);
    process.on("exit", (exitCode: number) => {
      resolve(exitCode);
    })

    process.on("error", (message: string) => {
      reject(new Error(message));
    });

    process.stdout.on("data", data => {
      out.text(data as string);
    });

    process.stderr.on("data", data => {
      out.text(data as string);
    });
  });
}
