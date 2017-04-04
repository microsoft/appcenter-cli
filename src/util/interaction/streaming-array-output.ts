import * as IoOptions from "./io-options";
import * as out from "./out";

export default class StreamingArrayOutput {
  private counter: number = 0;

  public start(): void {
    if (IoOptions.formatIsJson()) {
      console.log("[");
    }
  }

  public text<T>(converter: {(data: T): string}, data: T): void {
    if (this.counter) {
      if (IoOptions.formatIsJson()) {
        console.log(",");
      } else {
        console.log("");
      }
    }

    out.text(converter, data);
    this.counter++;
  }

  public finish() {
    if (IoOptions.formatIsJson()) {
      console.log("]");
    }
  }
}
