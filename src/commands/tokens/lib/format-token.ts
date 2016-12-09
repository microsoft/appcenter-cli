import { out } from "../../../util/interaction";
import { models } from "../../../util/apis";

export function reportTokenInfo(token: models.ApiTokensGetResponse | models.ApiTokensCreateResponse): void {
  out.report(
  [
    ["ID", "id" ],
    [ "Description", "description"],
    [ "Created at", "createdAt"]
  ], token);
}

export function reportToken(token: models.ApiTokensGetResponse | models.ApiTokensCreateResponse): void {
  out.report(
  [
    ["ID", "id" ],
    [ "API Token", "apiToken" ],
    [ "Description", "description"],
    [ "Created at", "createdAt"]
  ], token);
}
