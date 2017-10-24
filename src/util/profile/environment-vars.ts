import * as process from "process";
import { defaultEnvironmentName } from "./environments";

export const appCenterAccessTokenEnvVar = "APPCENTER_ACCESS_TOKEN";

export function getTokenFromEnvironmentVar(): string {
  return process.env[appCenterAccessTokenEnvVar];
}

export function getEnvFromEnvironmentVar(): string {
  return process.env["APPCENTER_ENV"] || defaultEnvironmentName();
}
