import * as process from "process";
import { defaultEnvironmentName } from "./environments";

export const mobileCenterAccessTokenEnvVar = "MOBILE_CENTER_ACCESS_TOKEN";

export function getTokenFromEnvironmentVar(): string {
  return process.env[mobileCenterAccessTokenEnvVar];
}

export function getEnvFromEnvironmentVar(): string {
  return process.env["MOBILE_CENTER_ENV"] || defaultEnvironmentName();
}
