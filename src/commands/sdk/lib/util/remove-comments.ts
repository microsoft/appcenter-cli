export default function removeComments(text: string, comments: RegExp[] = standardComments): string {
  if (!text || !comments || !comments.length)
    return text;

  let result = text;
  comments.forEach(useless => {
    result = result.replace(useless, ' ');
  });

  return result;
}

let standardComments: RegExp[] = [
  /\s*\/\/[^]*?\n\s*/g,
  /\s*\/\*[^]*?\*\/\s*/g
]