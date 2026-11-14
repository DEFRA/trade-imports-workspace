import { isEchoOptionsOnly } from './echo.js'
import { rawOutput } from './jq-values.js'

const CATEGORICAL_VERBS = [
  'names',
  'identifies',
  'explains',
  'describes',
  'cites',
  'distinguishes',
  'contrasts',
  'enumerates'
]

const WORD_CHARACTER = /^[\p{L}\p{Nd}_]$/u

const isWordCharacterAt = (text, index) => {
  if (index < 0 || index >= text.length) return false
  const codePoint = text.codePointAt(index)
  const startsAt =
    index > 0 && codePoint >= 0xdc00 && codePoint <= 0xdfff ? index - 1 : index
  return WORD_CHARACTER.test(String.fromCodePoint(text.codePointAt(startsAt)))
}

const asciiLowerCase = (text) =>
  text.replace(/[A-Z]/g, (letter) => letter.toLowerCase())

const occurrencesOf = (text, word) => {
  const found = []
  for (
    let index = text.indexOf(word);
    index !== -1;
    index = text.indexOf(word, index + 1)
  ) {
    found.push(index)
  }
  return found
}

const standsAlone = (text, start, length) =>
  !isWordCharacterAt(text, start - 1) &&
  !isWordCharacterAt(text, start + length)

/**
 * Whether a rubric clause holds a categorical verb as a whole word,
 * matched without regard to ASCII case. A letter, a decimal digit or an
 * underscore next to the verb joins it to a longer word.
 *
 * @param {string} clause
 * @returns {boolean}
 */
export const hasCategoricalVerb = (clause) => {
  const folded = asciiLowerCase(clause)
  return CATEGORICAL_VERBS.some((verb) =>
    occurrencesOf(folded, verb).some((start) =>
      standsAlone(folded, start, verb.length)
    )
  )
}

const SPACE_RUN =
  /[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g

/**
 * Text with each run of white space made one space and one space trimmed
 * from each end. Text made only of echo options (`-n`, `-e`, `-E`)
 * becomes empty.
 *
 * @param {string} text
 * @returns {string}
 */
export const squeezedText = (text) => {
  if (isEchoOptionsOnly(text)) return ''
  return `${text}\n`.replace(SPACE_RUN, ' ').replace(/^ /, '').replace(/ $/, '')
}

/**
 * The lines of a question's PASS, PARTIAL and FAIL clauses, blank lines
 * dropped. A question with no rubric, or no question, gives `null` for
 * each clause; a clause that is not text gives its JSON.
 *
 * @param {object | undefined} question
 * @returns {string[]}
 */
export const rubricClauseLines = (question) => {
  const rubric = question?.rubric ?? null
  return [rubric?.PASS, rubric?.PARTIAL, rubric?.FAIL]
    .map((clause) => rawOutput(clause ?? null))
    .join('\n')
    .split('\n')
    .filter((line) => line.length > 0)
}

const WINDOW_LENGTH = 24
const WINDOW_STEP = 4

const windowsOf = (characters) => {
  const windows = []
  for (
    let start = 0;
    start + WINDOW_LENGTH <= characters.length;
    start += WINDOW_STEP
  ) {
    windows.push(characters.slice(start, start + WINDOW_LENGTH).join(''))
  }
  return windows
}

const overlapsClause = (candidate, clauseLine) => {
  const clause = squeezedText(clauseLine)
  if (clause.includes(candidate) || candidate.includes(clause)) return true
  return windowsOf([...clause]).some((window) => candidate.includes(window))
}

/**
 * Whether a scorer's quoted clause overlaps a line of the rubric. The
 * quote and each line are squeezed by {@link squeezedText}. A quote under
 * 12 characters never overlaps. Otherwise it overlaps a line that holds
 * it, a line it holds, or a line whose 24-character window, taken every
 * 4 characters, it holds.
 *
 * @param {string} rubricMatch
 * @param {string[]} clauseLines - From {@link rubricClauseLines}
 * @returns {boolean}
 */
export const rubricMatchOverlaps = (rubricMatch, clauseLines) => {
  const minimumQuoteLength = 12
  const candidate = squeezedText(rubricMatch)
  if ([...candidate].length < minimumQuoteLength) return false
  return clauseLines.some((line) => overlapsClause(candidate, line))
}
