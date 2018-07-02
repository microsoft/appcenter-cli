import * as process from "process";
import { defaultEnvironmentName } from "./environments";

export const appCenterAccessTokenEnvVar = "APPCENTER_ACCESS_TOKEN";
export const appCenterTelemetrySourceEnvVar = "APPCENTER_TELEMETRY_SOURCE";

export function getTokenFromEnvironmentVar(): string {
  return process.env[appCenterAccessTokenEnvVar];
}

export function getTelemetrySourceFromEnvironmentVar(): string {
  return process.env[appCenterTelemetrySourceEnvVar];
}

export function getEnvFromEnvironmentVar(): string {
  return process.env["APPCENTER_ENV"] || defaultEnvironmentName();
}
