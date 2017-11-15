//
// Misc string padding - no npm disasters for us! :-)
//
const debug = require("debug")("appcenter-cli:util:interaction:padding");

export function padding(width: number, text: string): string {
  const len = text.length;
  if (len >= width) {
    return "";
  }
  debug(`Adding ${width - len + 1} spaces of padding to width ${width}`);
  return new Array(width - len + 1).join(" ");
}

export function padLeft(width: number, text: string): string {
  return padding(width, text) + text;
}

export function padRight(width: number, text: string): string {
  return text + padding(width, text);
}
