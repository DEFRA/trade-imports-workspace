/**
 * A text file's non-blank lines, each carrying its physical line number (1
 * based) so a caller that parses line by line can report where a malformed
 * one actually sits — a blank line still advances the count, it just yields
 * nothing to the caller.
 *
 * @param {string} text
 * @returns {{lineNumber: number, text: string}[]}
 */
export const nonBlankLines = (text) =>
  text
    .split('\n')
    .map((line, index) => ({ lineNumber: index + 1, text: line.trim() }))
    .filter((line) => line.text !== '')
