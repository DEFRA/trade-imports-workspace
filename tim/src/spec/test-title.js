const PLACEHOLDER = /%[sdifjop#%]|\$\{[^}]*\}|\$[A-Za-z_][\w.]*/g
const HAS_PLACEHOLDER = new RegExp(PLACEHOLDER.source)
const FEWEST_FIXED_WORDS = 2

/**
 * The text with every regular-expression character escaped, so it matches
 * itself.
 *
 * @param {string} text
 * @returns {string}
 */
export const escapedForRegex = (text) =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The title literal with its escapes resolved, as the test runner reads it.
 *
 * @param {string} literal - A title as it is written in the source.
 * @returns {string} The title as it is printed.
 */
export const unescapedTitle = (literal) => literal.replaceAll(/\\(.)/g, '$1')

/**
 * Whether a title literal stands for a family of titles rather than one: a
 * runner's placeholder (`%s`, `$language`, `${name}`) with enough fixed words
 * left around it to still name the test.
 *
 * @param {string} literal - A title as it is written in the source.
 * @returns {boolean}
 */
export const isTitlePattern = (literal) => {
  const fixedWords = literal.replaceAll(PLACEHOLDER, ' ').match(/[A-Za-z]+/g)
  return (
    HAS_PLACEHOLDER.test(literal) &&
    (fixedWords?.length ?? 0) >= FEWEST_FIXED_WORDS
  )
}

/**
 * The regular expression a title pattern matches its printed titles by.
 *
 * @param {string} literal - A title as it is written in the source.
 * @returns {RegExp}
 */
export const titlePatternOf = (literal) =>
  new RegExp(
    `^${literal
      .split(PLACEHOLDER)
      .map((part) => escapedForRegex(unescapedTitle(part)))
      .join('.+')}$`,
    's'
  )

/**
 * Whether a title written in the source names the title a coverage link
 * records. A `test.each` title holds a placeholder the runner fills in, so the
 * link records a title the source never spells out: `$language` in the source
 * is `English` in the link. Both the lint that checks coverage links and the
 * signed-off check that locates a linked test read titles through here, so a
 * test one can find is a test the other can find.
 *
 * @param {string} literal - A title as it is written in the source.
 * @param {string} title - A title as a coverage link records it.
 * @returns {boolean}
 */
export const titleNames = (literal, title) =>
  unescapedTitle(literal) === title ||
  (isTitlePattern(literal) && titlePatternOf(literal).test(title))
