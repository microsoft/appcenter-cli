import { AppCenterClient, models, clientCall } from "../../../util/apis";
import { out, StreamingArrayOutput } from "../../../util/interaction";
import * as os from "os";
import * as process from "process";
import { ExitCodes } from "./exit-codes";

export class StateChecker {
  private readonly client: AppCenterClient;
  private readonly testRunId: string;
  private readonly ownerName: string;
  private readonly appName: string;
  private readonly streamingOutput: StreamingArrayOutput;
  private readonly isInternalStreamingOutput: boolean;

  constructor(client: AppCenterClient, testRunId: string, ownerName: string, appName: string, streamingOutput?: StreamingArrayOutput) {
    this.client = client;
    this.testRunId = testRunId;
    this.ownerName = ownerName;
    this.appName = appName;
    if (!streamingOutput) {
      this.streamingOutput = new StreamingArrayOutput();
      this.isInternalStreamingOutput = true;
    } else {
      this.streamingOutput = streamingOutput;
      this.isInternalStreamingOutput = false;
    }
  }

  public async checkUntilCompleted(timeoutSec: number = null): Promise<number> {
    let exitCode = 0;
    let errorCount = 0;
    const maxErrors = 60;
    const errorRetryWait = 2;
    const startTime = process.hrtime();
    if (this.isInternalStreamingOutput) {
      this.streamingOutput.start();
    }
    while (true) {
      let state;
      try {
        state = await out.progress("Checking status...", this.getTestRunState(this.client, this.testRunId));
      } catch (error) {
        errorCount++;
        if (errorCount >= maxErrors) {
          throw error;
        }

        if (this.timeIsUp(timeoutSec, startTime, errorRetryWait)) {
          exitCode = ExitCodes.Timeout;
          break;
        }

        await out.progress("Status check failed, retrying...", this.delay(1000 * errorRetryWait));
        continue;
      }

      errorCount = 0;

      if (state && state.message) {
        this.streamingOutput.text((state) => `Current test status: ${state.message.join(os.EOL)}`, state);
      }

      if (typeof state.exitCode === "number") {
        exitCode = state.exitCode;
        break;
      }

      if (this.timeIsUp(timeoutSec, startTime, state.waitTime)) {
        exitCode = ExitCodes.Timeout;
        break;
      }

      await out.progress(`Waiting ${state.waitTime} seconds...`, this.delay(1000 * state.waitTime));
    }
    if (this.isInternalStreamingOutput) {
      this.streamingOutput.finish();
    }

    return exitCode;
  }

  public timeIsUp(timeoutSec: number, startTime: [number, number], waitTime: number): Boolean {
    if (timeoutSec) {
      const elapsedSeconds = process.hrtime(startTime)[0];
      if (elapsedSeconds + waitTime > timeoutSec) {
        this.streamingOutput.text((timeoutSec) => `After ${timeoutSec} seconds, command timed out waiting for tests to finish.`, timeoutSec);
        return true;
      }
    }
    return false;
  }

  public async checkOnce(): Promise<number> {
    const state = await out.progress("Checking status...", this.getTestRunState(this.client, this.testRunId));
    if (this.isInternalStreamingOutput) {
      this.streamingOutput.start();
    }

    this.streamingOutput.text((state) => `Current test status: ${state.message.join(os.EOL)}`, state);

    if (this.isInternalStreamingOutput) {
      this.streamingOutput.finish();
    }

    return state.exitCode;
  }

  private getTestRunState(client: AppCenterClient, testRunId: string): Promise<models.TestRunState> {
    return clientCall((cb) => {
      client.test.getTestRunState(
        testRunId,
        this.ownerName,
        this.appName,
        cb
      );
    });
  }

  private async delay(milliseconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
      // Turn off tslint false error
      /* tslint:disable-next-line:no-string-based-set-timeout */
      setTimeout(resolve, milliseconds);
    });
  }
}
