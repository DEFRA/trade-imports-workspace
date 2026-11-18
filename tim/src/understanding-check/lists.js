const UNICODE_WHITE_SPACE =
  '\\t\\n\\v\\f\\r \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'

const LEADING_WHITE_SPACE = new RegExp(`^[${UNICODE_WHITE_SPACE}]+`)
const TRAILING_WHITE_SPACE = new RegExp(`[${UNICODE_WHITE_SPACE}]+$`)

const trimWhiteSpace = (text) =>
  text.replace(LEADING_WHITE_SPACE, '').replace(TRAILING_WHITE_SPACE, '')

/**
 * A comma-separated option as a list: split on commas, empty parts
 * dropped, then each part trimmed of Unicode white space. A part of only
 * white space is kept as an empty string.
 *
 * @param {string} text
 * @returns {string[]}
 */
export const commaList = (text) =>
  text
    .split(',')
    .filter((part) => part.length > 0)
    .map(trimWhiteSpace)

const fileAndLines = (part) => {
  const separator = part.lastIndexOf(':')
  if (separator < 0) return []
  return [{ file: part.slice(0, separator), lines: part.slice(separator + 1) }]
}

/**
 * `file:lines[,file:lines…]` as evidence. Each part is split on its last
 * colon; a part with no colon is dropped.
 *
 * @param {string} text
 * @returns {{file: string, lines: string}[]}
 */
export const evidenceList = (text) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap(fileAndLines)
