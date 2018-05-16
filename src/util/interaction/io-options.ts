// Management for the "--debug" flag
// Just a global switch, individual commands/utilities need to check
// if needed to vary their behavior. Typically handled directly
// by the methods on out.

let debug: boolean = false;

export function isDebug(): boolean { return debug; }
export function setDebug(): void { debug = true; }

let quiet: boolean = false;

export function isQuiet() { return quiet; }
export function setQuiet(): void { quiet = true; }

let format: "list" | "json" | "csv" = "list";

// Can be used to prevent output which will make output un-parsable
export function formatIsParsingCompatible(): boolean { return format === "json" || format === "csv"; }

// Key is a string to be passed to "--output" parameter, e.g. "json"
// Value is a function which can be used to switch to this parameter, e.g. setFormatJson
export type OutputFormatSupport = { [formatKey: string]: () => void };

export function formatIsJson(): boolean { return format === "json"; }
export function setFormatJson(): void { format = "json"; }

export function supportsCsv(supportedFormats: OutputFormatSupport): void {
  supportedFormats["csv"] = setFormatCsv;
}

export function formatIsCsv(): boolean { return format === "csv"; }
export function setFormatCsv(): void { format = "csv"; }
