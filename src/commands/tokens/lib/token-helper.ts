import { AppCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { failure, ErrorCodes } from "../../../util/commandline";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:commands:tokens:lib:token-helper");

export async function checkToken(client: AppCenterClient): Promise<boolean> {
  try {
    //TODO: Change this to call a purpose built api endpoint for this purpose:
    const httpResponse = await clientRequest<models.ApiTokensGetResponse[]>((cb) => client.apiTokens.list(cb));
    if (httpResponse.response.statusCode < 400) {
      return true;
    } else {
      throw httpResponse.response;
    }
  } catch (error) {
    if (error.statusCode === 401) {
      debug(`Invalid token tokens- ${inspect(error)}`);
      false;
    } else {
      debug(`Failed to load list of tokens- ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to load list of tokens");
    }
  }
}
