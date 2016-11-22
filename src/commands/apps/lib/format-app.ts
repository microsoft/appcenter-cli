import { out } from "../../../util/interaction";
import { models } from "../../../util/apis";

export function reportApp(app: models.AppResponse): void {
  out.report(
  [
    ["ID", "id" ],
    [ "App Secret", "appSecret" ],
    [ "Description", "description"],
    [ "Display Name", "displayName"],
    [ "Name", "name"],
    [ "OS", "os"],
    [ "Platform", "platform"],
    [ "Owner", "owner",
      [
        [ "ID", "id" ],
        [ "Display Name", "displayName"],
        [ "Email", "email" ],
        [ "Name", "name" ]
      ]
    ],
    [ "Azure Subscription ID", "azureSubscriptionId"]
  ], app);
}
