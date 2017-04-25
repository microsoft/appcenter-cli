export function splice(str: string, start: number, delCount: number, newSubStr: string) {
  return str.slice(0, start) + newSubStr + str.slice(start + Math.abs(delCount));
}

export function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}