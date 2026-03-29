export function leftPad(str: string, length: number, char?: string): string {
  const padChar = char ?? ' ';
  if (str.length >= length) return str;
  return padChar.repeat(length - str.length) + str;
}

export function rightPad(str: string, length: number, char?: string): string {
  const padChar = char ?? ' ';
  if (str.length >= length) return str;
  return str + padChar.repeat(length - str.length);
}
