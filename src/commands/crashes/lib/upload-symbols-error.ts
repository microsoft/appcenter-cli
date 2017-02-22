import { ErrorCodes } from "../../../util/commandline";

export class UploadSymbolsError extends Error {
  constructor(public errorCode: ErrorCodes, message: string) {
    super(message);
  }
}
