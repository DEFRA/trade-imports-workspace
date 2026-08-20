// Where one sentence of finding prose ends and the next begins. Two callers
// depend on this being the same answer: the citation tokeniser, which keeps a
// bare `:NN` continuation attached to the file named earlier in ITS sentence,
// and the report renderer, which puts each sentence on its own line.
//
// The rule is deliberately conservative. A missed boundary leaves two
// sentences sharing a line, which is what the page did before; a boundary that
// fires mid-sentence orphans a citation from its antecedent and breaks a line
// in the middle of a clause. So the pattern asks for a terminator, whitespace
// and a following capital, quote or bracket — or a citation, because 105
// sentences in the corpus open with the file they are about, and a lower-case
// `read.js:27-31` starts a sentence as plainly as a capital does. It then
// refuses four shapes the corpus is full of:
//
//   - a bare list number — "the six groups (1. About the consignment, 2. …)",
//     "sections stop at '6. Contact address'". A number preceded by a space or
//     an opening bracket is an item marker, not the end of a sentence. A number
//     reached through a colon or a hyphen — `layout.njk:17.`, `width-10.` — is
//     the tail of a citation or a class name and still ends its sentence.
//   - an initialism — "the GDS style guide bans e.g. (copy.en.js:6 …)".
//   - an elision inside a quoted expression — `govukRadios({ name: '…', ...
//     Commercial / Private })`.
//   - a terminator with a space in front of it, which in this corpus means
//     quoted code rather than prose: `showTemperatureQuestion ? (…) : null`.
const SENTENCE_BREAK =
  /(?<=\S[.!?])(?<!\.[.!?])(?<!(?:^|[\s('"`–—])\d{1,3}[.!?])(?<!\b[A-Za-z]\.[A-Za-z][.!?])\s+(?=[A-Z"'`(]|[a-z][A-Za-z0-9_@.\-/]*\.[A-Za-z]{1,6}:\d)|\n\n+/g

/**
 * Split text into sentences, keeping each sentence's offset in the original so
 * a token's position can be mapped back to the sentence containing it.
 *
 * @param {string} text
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export const sentences = (text) => {
  const out = []
  let cursor = 0
  SENTENCE_BREAK.lastIndex = 0
  let match
  while ((match = SENTENCE_BREAK.exec(text)) !== null) {
    const end = match.index
    out.push({ text: text.slice(cursor, end), start: cursor, end })
    cursor = match.index + match[0].length
  }
  out.push({ text: text.slice(cursor), start: cursor, end: text.length })
  return out
}
