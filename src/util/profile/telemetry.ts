// Function to query and persist telemetry enabling settings

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import * as mkdirp from "mkdirp";

import { getProfileDir, fileExistsSync } from "../misc";
import { out, prompt, terminal, isQuiet } from "../interaction";
import * as wrap from "wordwrap";

const telemetryOptionFile: string = "telemetryEnabled.json";
const telemetryDisableEnvironmentVar = "MOBILE_CENTER_TELEMETRY";

const telemetryPromptText = os.EOL +
"App Center CLI would like to collect data about how users use CLI commands " +
 "and some problems they encounter. Participation is voluntary and when you choose to participate your " +
 "device automatically sends information to Microsoft about how you use App Center CLI." +
 os.EOL +
 "For more information, please see our privacy policy at https://aka.ms/mobilecenterprivacy" +
 os.EOL;

 function promptForTelemetryEnable() : Promise<boolean> {
  const width = terminal.columns() - 2;

  const promptText = wrap(width)(telemetryPromptText);
  if (!isQuiet()) {
    out.text(promptText);
  }
  return prompt.confirmWithTimeout("Enable telemetry? ", 30000, true);
}

export function telemetryIsEnabled(disableTelemetrySwitch: boolean): Promise<boolean> {
  if (disableTelemetrySwitch) {
    return Promise.resolve(false);
  }

  if (process.env[telemetryDisableEnvironmentVar]) {
    return Promise.resolve(process.env[telemetryDisableEnvironmentVar].toLowerCase() === "on");
  }

  if (hasTelemetryOptionSaved()) {
    return getSavedTelemetryOption();
  }

  if (!terminal.isInteractive()) {
    return Promise.resolve(false);
  }

  return promptForTelemetryEnable()
    .then((enabled: boolean) => {
      saveTelemetryOption(enabled);
      return enabled;
    });
}

function telemetryFileName(): string {
  return path.join(getProfileDir(), telemetryOptionFile);
}

function hasTelemetryOptionSaved(): boolean {
  return fileExistsSync(telemetryFileName());
}

function getSavedTelemetryOption(): Promise<boolean> {
  const fileContents = fs.readFileSync(telemetryFileName(), "utf8");
  const enabled: any = JSON.parse(fileContents);
  return Promise.resolve(!!enabled);
}

export function saveTelemetryOption(enabled: boolean) {
  mkdirp.sync(getProfileDir());
  fs.writeFileSync(telemetryFileName(), JSON.stringify(enabled), { encoding: "utf8" });
}
