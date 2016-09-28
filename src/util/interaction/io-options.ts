// Management for the "--debug" flag
// Just a global switch, individual commands/utilities need to check
// if needed to vary their behavior. Typically handled directly
// by the methods on out.

let debug: boolean = false;

export function isDebug(): boolean { return debug; }
export function setDebug(): void { debug = true; }


let format: string = "list";

export function formatIsJson(): boolean { return format === "json"; };
export function setFormatJson(): void{ format = "json"; }
