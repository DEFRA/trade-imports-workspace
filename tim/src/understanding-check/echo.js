const ECHO_OPTIONS_ONLY = /^-[neE]+$/

/**
 * Whether bash's `echo` reads the text as options (`-n`, `-e`, `-E` or
 * a run of them) rather than printing it.
 *
 * @param {string} text
 * @returns {boolean}
 */
export const isEchoOptionsOnly = (text) => ECHO_OPTIONS_ONLY.test(text)

/**
 * The lines bash's `echo "$text"` prints: the text itself, one empty line
 * for options without `n`, or none for options with `n`.
 *
 * @param {string} text
 * @returns {string[]}
 */
export const echoedLines = (text) => {
  if (!isEchoOptionsOnly(text)) return [text]
  return text.includes('n') ? [] : ['']
}
