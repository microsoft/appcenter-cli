import * as _ from "lodash";

export function extractEmailsFromString(listString: string) {
    return _.chain(listString).words(/\S+/g).uniq().value();
}