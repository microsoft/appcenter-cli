/**
 * Some commands have pairs of parameters which are used to specify the same list of users.
 * One of these parameters is used to specify list of users as string, another one is used to specify path to file which contains the list of users.
 * This helper handles correct user list retrieval for such parameters.
 */

import * as Pfs from "./promisfied-fs";
import { failure, ErrorCodes } from "../commandline";
import { inspect } from "util";
import * as _ from "lodash";

export async function getUsersList(listOfUsers: string, pathToListOfUsers: string, debug: Function): Promise<string[]> {
  return extractUsersFromString(await getUserListString(listOfUsers, pathToListOfUsers, debug));
}

async function getUserListString(listOfUsers: string, pathToListOfUsers: string, debug: Function): Promise<string> {
  if (listOfUsers != null) {
    return listOfUsers;
  } else if (pathToListOfUsers != null) {
    try {
      debug("Reading file with the list of users");
      return await Pfs.readFile(pathToListOfUsers, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw failure(ErrorCodes.InvalidParameter, `file ${pathToListOfUsers} doesn't exists`);
      } else {
        debug(`Failed to read file with list of users - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to read file ${pathToListOfUsers}`);
      }
    }
  } else {
    return "";
  }
}

function extractUsersFromString(listString: string) {
    return _.chain(listString).words(/\S+/g).uniq().value();
}
