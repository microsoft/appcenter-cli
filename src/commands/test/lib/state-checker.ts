import { MobileCenterClient, models, clientCall } from "../../../util/apis";
import { out } from "../../../util/interaction";
import * as os from "os";
import * as process from "process";
import { ExitCodes } from "./exit-codes";

export class StateChecker {
  private readonly client: MobileCenterClient;
  private readonly testRunId: string;
  private readonly ownerName: string;
  private readonly appName: string;

  constructor(client: MobileCenterClient, testRunId: string, ownerName: string, appName: string) {
    this.client = client;
    this.testRunId = testRunId;
    this.ownerName = ownerName;
    this.appName = appName;
  }

  public async checkUntilCompleted(timeoutSec: number = null): Promise<number> {
    let exitCode = 0;
    let startTime = process.hrtime();

    while (true) {
      let state = await out.progress("Checking status...", this.getTestRunState(this.client, this.testRunId));
      out.text(`Current test status: ${state.message.join(os.EOL)}`);

      if (typeof state.exitCode === "number") {
        exitCode = state.exitCode;
        break;
      }

      if (timeoutSec) {
        let elapsedSeconds = process.hrtime(startTime)[0];
        if (elapsedSeconds + state.waitTime > timeoutSec) {
          exitCode = ExitCodes.Timeout;
          out.text(`Command timed out waiting for tests to finish after ${timeoutSec} sec. Returning exit code ${exitCode}.`)
          break;
        }
      }

      await out.progress(`Waiting ${state.waitTime} seconds...`, this.delay(1000 * state.waitTime));
    }

    return exitCode;
  }

  public async checkOnce(): Promise<number> {
    let state = await out.progress("Checking status...", this.getTestRunState(this.client, this.testRunId));
    out.text(`Current test status: ${state.message.join(os.EOL)}`);

    return state.exitCode;
  }

  private getTestRunState(client: MobileCenterClient, testRunId: string): Promise<models.TestRunState> {
    return clientCall(cb => {
      client.test.getTestRunState(
        testRunId,
        this.ownerName,
        this.appName,
        cb
      );
    });
  }

  private async delay(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }
}