import { out } from "../../../util/interaction";
import { models } from "../../../util/apis";

export function reportProfile(user: models.UserProfileResponse): void {
  out.report(
  [
    ["Username", "name" ],
    [ "Display Name", "displayName" ],
    [ "Email", "email"]
  ], user);
}
