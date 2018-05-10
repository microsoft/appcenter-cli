import { ErrorCodes, failure } from "../../../util/commandline";
import * as _ from "lodash";
export function parseDate(date: string, defaultDate: Date, errorMessage: string): Date {
  if (!_.isNil(date)) {
    const timeStamp = Date.parse(date);
    if (!_.isNaN(timeStamp)) {
      return new Date(timeStamp);
    } else {
      throw failure(ErrorCodes.InvalidParameter, errorMessage);
    }
  } else {
    return defaultDate;
  }
}
