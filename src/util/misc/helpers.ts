export function splice(str: string, start: number, delCount: number, newSubStr: string) {
  return str.slice(0, start) + newSubStr + str.slice(start + Math.abs(delCount));
}

export function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export function execAll(regExp: RegExp, str: string) {
  let arr, extras, matches: string[] = [];
  str.replace(regExp.global ? regExp : new RegExp(regExp.source, (regExp + '').replace(/[\s\S]+\//g, 'g')), function () {
    matches.push(arr = [].slice.call(arguments));
    extras = arr.splice(-2);
    arr.index = extras[0];
    arr.input = extras[1];
  } as any);
  return matches[0] ? matches : null;
}