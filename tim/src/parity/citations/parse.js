// A citation in this corpus is a path followed by a line or a line range:
// `copy.en.js:6`, `layout.njk:41-53`, `routes.js:5410,5444`. 391 of the 516
// in-prose references are bare basenames, and 77 more are bare `:NN`
// continuations whose antecedent is the file named earlier in the sentence.
//
// The tokeniser's whole job is to find them and record where they sit. It
// resolves nothing: a regex that also decided which of the 21 files named
// copy.en.js a reference meant would produce confidently wrong links, which is
// worse than the inert <code> the current page renders.

import { sentences } from '../sentences.js'

const PATH_CHARS = '[A-Za-z0-9_@.\\-/]'
const LINE_SPEC = '\\d+(?:-\\d+)?(?:\\s*,\\s*\\d+(?:-\\d+)?)*'

const NAMED = new RegExp(
  `(${PATH_CHARS}*[A-Za-z0-9_\\-]\\.[A-Za-z0-9]{1,6}):(${LINE_SPEC})`,
  'g'
)

// A bare `:NN` that is not the tail of a named citation. Excludes a preceding
// path character so `a.js:5` is never also read as a continuation, and a
// preceding digit so `5410,5444` is not split.
const CONTINUATION = new RegExp(`(?<![A-Za-z0-9_@.\\-/]):(${LINE_SPEC})`, 'g')

/**
 * Parse one line spec into ranges. `5410-5428` is one range; `72, 85, 98` is
 * three. The report renders each range as its own permalink fragment.
 *
 * @param {string} spec
 * @returns {Array<{start: number, end: number}>}
 */
export const parseLineSpec = (spec) =>
  spec
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split('-').map((n) => Number(n))
      return { start, end: Number.isFinite(end) ? end : start }
    })

const sentenceAt = (list, offset) =>
  list.find((s) => offset >= s.start && offset <= s.end) ??
  list[list.length - 1]

// A sentence that tells somebody what to change, or that says a thing is
// absent, makes no claim about what the cited lines hold today. "Change the
// caption string to "Consignment parties" in copy.en.js:42" names the value the
// finding proposes, and "Nothing identifies the page as a GOV.UK service"
// names a string precisely because it is not there. Deriving an anchor from
// either asserts the opposite of what the prose says.
const IMPERATIVE =
  /^(add|align|bring|build|carry|change|check|correct|cut|delete|drop|extend|fold|give|group|hide|invert|keep|leave|lift|list|make|merge|mirror|move|narrow|populate|put|raise|reduce|remove|rename|render|reorder|replace|restore|restrict|retire|reverse|rework|rewrite|scope|settle|split|stop|store|swap|take|tighten|treat|turn|use|widen|wrap)\b/i

// "Save is a link" and "Show all is rendered at :44" are noun phrases, not
// instructions. A finite verb straight after the first word says so.
const COPULA_NEXT =
  /^\w+\s+(is|are|was|were|has|have|had|will|would|should|can|could|may|might|must|does|do|did)\b/i

const DENIAL = /^(nothing|none|neither|no\s)/i

const FALSIFIED = /^falsified by\b/i

/**
 * Does this sentence prescribe a change or deny a presence, rather than
 * describe what the code holds?
 *
 * @param {string} sentence
 * @returns {boolean}
 */
export const prescribesOrDenies = (sentence) => {
  const text = String(sentence ?? '').trim()
  if (FALSIFIED.test(text) || DENIAL.test(text)) return true
  return IMPERATIVE.test(text) && !COPULA_NEXT.test(text)
}

const COMPARISON = / vs\.? | against /

/**
 * Does a comparison sit between a continuation and the file it would otherwise
 * inherit?
 *
 * "copy.en.js:9-10 vs :17" is the corpus's own shorthand for two different
 * files: the whole point of the construction is that the second operand is the
 * OTHER side, and its name was elided because the previous sentence gave it.
 * Proximity therefore points at exactly the wrong file, so the citation is
 * queued rather than resolved.
 *
 * @param {string} between - The text from the antecedent to the continuation
 * @returns {boolean}
 */
export const alternatesSides = (between) => COMPARISON.test(between)

/**
 * Where a paragraph opens by naming a side — "Frontend: …" then "Prototype: …",
 * the shape five of the findings use — every citation from there until the next
 * label belongs to that side.
 *
 * This is the only side signal a detail paragraph carries, and it is worth
 * having: `routes.js` exists in both codebases, so without it the resolver picks
 * whichever repo it looked in first, which is a guess.
 *
 * @param {string} text
 * @param {Array<{id: string, labels: string[]}>} sideLabels
 * @returns {Array<{offset: number, side: string}>} In document order
 */
export const labelledParagraphs = (text, sideLabels) => {
  const found = []
  for (const side of sideLabels) {
    for (const label of side.labels) {
      const pattern = new RegExp(`(^|\\n)\\s*${label}\\s*:`, 'gi')
      for (const match of text.matchAll(pattern)) {
        found.push({ offset: match.index, side: side.id })
      }
    }
  }
  return found.sort((a, b) => a.offset - b.offset)
}

/**
 * Find every citation token in one field of one increment.
 *
 * @param {object} args
 * @param {string} args.text - The prose to scan
 * @param {string} args.field - Which field it came from, recorded on each token
 * @param {string|null} [args.sideHint] - The side this field is attributed to
 * @returns {Array<object>} Tokens in document order
 */
export const tokenise = ({ text, field, sideHint = null, sideLabels = [] }) => {
  if (typeof text !== 'string' || text.length === 0) return []
  const list = sentences(text)
  const labels = labelledParagraphs(text, sideLabels)
  const tokens = []
  const sideAt = (offset) =>
    sideHint ??
    labels.filter((label) => label.offset <= offset).pop()?.side ??
    null

  NAMED.lastIndex = 0
  let match
  while ((match = NAMED.exec(text)) !== null) {
    const [asWritten, path, lineSpec] = match
    tokens.push({
      field,
      asWritten,
      pathAsWritten: path,
      lines: parseLineSpec(lineSpec),
      offset: match.index,
      end: match.index + asWritten.length,
      form: 'named',
      sideHint: sideAt(match.index),
      sentence: sentenceAt(list, match.index).text
    })
  }

  CONTINUATION.lastIndex = 0
  while ((match = CONTINUATION.exec(text)) !== null) {
    const offset = match.index
    // Skip anything falling inside a named token already recorded.
    if (tokens.some((t) => offset >= t.offset && offset < t.end)) continue
    const sentence = sentenceAt(list, offset)
    const inSentence = tokens.filter(
      (t) =>
        t.form === 'named' &&
        t.offset >= sentence.start &&
        t.offset <= sentence.end
    )
    const antecedent = inSentence.filter((t) => t.offset < offset).pop()
    const between = antecedent ? text.slice(antecedent.end, offset) : ''
    tokens.push({
      field,
      asWritten: match[0],
      pathAsWritten: antecedent?.pathAsWritten ?? null,
      lines: parseLineSpec(match[1]),
      offset,
      end: offset + match[0].length,
      form: 'continuation',
      sideHint: sideAt(offset),
      sentence: sentence.text,
      antecedent: antecedent?.asWritten ?? null,
      // A comparison between the antecedent and here means the elided file is
      // the other side, not the nearest one. Resolve nothing and let a human
      // say which file it meant.
      needsHuman: !antecedent || alternatesSides(between)
    })
  }

  const ordered = tokens.sort((a, b) => a.offset - b.offset)

  // Which paragraph each token sits in. A finding's paragraphs are its unit of
  // subject: one is about the frontend, the next about the prototype. That is
  // what lets an ambiguous reference borrow the side of an unambiguous one
  // beside it rather than borrow the order of a JSON object.
  const breaks = [...text.matchAll(/\n{2,}/g)].map((m) => m.index)
  const paragraphOf = (offset) => breaks.filter((b) => b < offset).length
  for (const token of ordered) {
    token.paragraph = paragraphOf(token.offset)
    // Whether the sentence around this citation describes the code or proposes
    // a change to it. Only the first kind can supply an anchor. The judgement
    // is per sentence rather than per paragraph on purpose: a correction
    // paragraph routinely carries one descriptive sentence — "The validation
    // message "Select a consignor from the list" (copy.en.js:23) already uses
    // the shorter term" — and that sentence is a claim worth checking.
    token.claim = !prescribesOrDenies(sentenceAt(list, token.offset).text)
  }

  // The clause a citation sits in: from the end of the previous citation to
  // the start of the next, clipped to the sentence. This is the window the
  // anchor check reads, because attributing every identifier in a sentence to
  // every citation in it produces false anchor misses on any sentence naming
  // more than one file — and a false miss is worse than none, since a real one
  // is a finding about the finding.
  ordered.forEach((token, i) => {
    const sentence = sentenceAt(list, token.offset)
    const from =
      i > 0 ? Math.max(ordered[i - 1].end, sentence.start) : sentence.start
    const to =
      i < ordered.length - 1
        ? Math.min(ordered[i + 1].offset, sentence.end)
        : sentence.end
    token.window = text.slice(from, Math.max(to, token.end))
  })

  return ordered
}

/**
 * Split a semicolon-joined evidence value into its parts, keeping each part's
 * offset so tokens found inside it stay in document order.
 *
 * @param {string} value
 * @returns {Array<{text: string, offset: number}>}
 */
export const splitJoined = (value) => {
  const parts = []
  let offset = 0
  for (const part of value.split(';')) {
    parts.push({
      text: part.trim(),
      offset: offset + (part.length - part.trimStart().length)
    })
    offset += part.length + 1
  }
  return parts
}

/**
 * Fields scanned for citations, in the order their markers are numbered.
 * decision.note and notes[].note are included because a revalidation note
 * routinely corrects a citation, and a corrected pointer that the report does
 * not link is a pointer nobody checks.
 *
 * @param {object} increment
 * @returns {Array<{field: string, text: string, sideHint: string|null}>}
 */
export const citableFields = (increment) => {
  const fields = [{ field: 'detail', text: increment.detail, sideHint: null }]
  for (const [side, value] of Object.entries(increment.evidence ?? {})) {
    if (typeof value === 'string') {
      fields.push({ field: `evidence.${side}`, text: value, sideHint: side })
    }
  }
  ;(increment.notes ?? []).forEach((note, i) => {
    fields.push({ field: `notes[${i}]`, text: note.note, sideHint: null })
  })
  if (increment.decision?.note) {
    fields.push({
      field: 'decision',
      text: increment.decision.note,
      sideHint: null
    })
  }
  return fields
}

/**
 * Every citation token in one increment, in field order then document order.
 *
 * @param {object} increment
 * @param {Array<{id: string, labels: string[]}>} [sideLabels] - Paragraph
 *   labels that attribute a block of prose to one side
 * @returns {Array<object>}
 */
export const tokeniseIncrement = (increment, sideLabels = []) =>
  citableFields(increment).flatMap((field) =>
    tokenise({ ...field, sideLabels })
  )
