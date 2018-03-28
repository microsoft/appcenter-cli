export class TestCloudError extends Error {
  public exitCode?: number;

  constructor(message: string, errorCode?: number) {
    super(message);

    this.exitCode = errorCode;
  }
}
