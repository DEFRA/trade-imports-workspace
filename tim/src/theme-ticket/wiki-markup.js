const MAX_WRAPPED_LINE_CHARACTERS = 79
const MAX_REPORTED_LINES = 3
const PROSE_START = /^[A-Za-z(“"]/u
const HEADING = /^h[0-9]\./
const MARKUP_LINE = /^(h[0-9]\.|\*|\|)/

const linesOf = (text) => {
  const lines = text.split('\n')
  return text.endsWith('\n') ? lines.slice(0, -1) : lines
}

const isShortProse = (line) =>
  PROSE_START.test(line) &&
  Array.from(line).length <= MAX_WRAPPED_LINE_CHARACTERS

const continuesProse = (previous, line) =>
  previous !== '' &&
  line !== '' &&
  !MARKUP_LINE.test(previous) &&
  !MARKUP_LINE.test(line)

/**
 * The first three line numbers, counted from 1, where one line of prose
 * runs straight on from another, in a description that has a wiki
 * heading and at least one short prose line. Empty when it has neither,
 * or when no paragraph is wrapped.
 *
 * @param {string} description - Jira wiki markup
 * @returns {number[]}
 */
export const hardWrappedLines = (description) => {
  const lines = linesOf(description)
  const looksLikeWrappedWikiMarkup =
    lines.some(isShortProse) && lines.some((line) => HEADING.test(line))
  if (!looksLikeWrappedWikiMarkup) return []
  return lines
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(
      ({ line, number }) =>
        number > 1 && continuesProse(lines[number - 2], line)
    )
    .map(({ number }) => number)
    .slice(0, MAX_REPORTED_LINES)
}

/**
 * @param {string} description - Jira wiki markup
 * @returns {boolean} Whether it uses the `{expand}` macro
 */
export const usesExpandMacro = (description) => description.includes('{expand')
