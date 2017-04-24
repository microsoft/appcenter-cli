export function injectSdkBuildGradle(code: string, lines: string[]): string {
  let result: string = code.trim() + '\r\n';
  lines.forEach(x => result += '\r\n' + x);
  return result;
}