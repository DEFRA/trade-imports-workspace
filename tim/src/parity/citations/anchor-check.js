import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Invariant I7, honestly stated.
 *
 * The old rule was "every identifier or quoted string the prose attributes to a
 * citation must appear in the text that citation resolves to", and it is only
 * true of prose that quotes source. Parity prose quotes rendered output on
 * purpose — that is what a parity finding compares — so the rule reported all
 * 53 of the DR1 corpus's anchors as drifted when every one of them was correct.
 *
 * An anchor now lands in one of six classes, and only two of them are warnings:
 *
 *   inRange       the cited lines contain it. Nothing to say.
 *   outOfRange    the file contains it, the cited lines do not. Widen the range.
 *   inSibling     another citation of the same finding contains it. The prose
 *                 routinely says so itself — "…([[c1]], copy at [[c2]])" — and
 *                 attributing a quote to whichever citation shares its sentence
 *                 is an artefact of a sentence-scoped extractor, not a drift.
 *   interpolated  the source builds the string at runtime. `You can add a
 *                 maximum of ${max} documents` never holds the rendered
 *                 sentence, and never will.
 *   rendered      the captured page holds it and no source file does. "Green
 *                 Valley Farm" against `{{ section.selectedAddress.name }}` is
 *                 the finding quoting the screen, which is the point.
 *   missing       nowhere. The finding's premise has moved: re-verify it.
 */

// The shortest literal run that is evidence of a shared string rather than a
// coincidence. Eight characters, because the runs that matter here are short —
// "Showing 1 " is what `Showing ${item} of ${total} Results` and the rendered
// "Showing 1 of 4 Results" have in common. The proportional floor below it does
// the work on longer anchors.
const MIN_SHARED_FRAGMENT = 8
const MAX_TEXT_SCANNED = 40000

const flatten = (text) => text.replace(/\s+/g, ' ').trim()

// Inline markup splits a sentence the prose quotes whole: the APHA sentence in
// cph-number.html really is there, with a <a class="govuk-link"> in the middle.
// Both spellings are tried because dropping a tag can either join two words
// that were never adjacent or separate two halves of one word.
const withoutTags = (text) => [
  text.replace(/<[^>]*>/g, ' '),
  text.replace(/<[^>]*>/g, '')
]

// A doc comment the prose quotes is wrapped by the formatter and every line
// after the first opens with an asterisk, so the flattened text reads "may be a
// * consignor" where the prose reads "may be a consignor". The leader is
// punctuation the reader never sees.
const withoutCommentLeaders = (text) =>
  text.replace(/^[ \t]*(\/\*+|\*+\/?|\/\/+|#)[ \t]?/gm, '')

/**
 * Does this text hold the anchor, allowing for wrapped whitespace, for markup
 * sitting inside a quoted sentence, and for the leaders of a wrapped comment?
 *
 * @param {string|null} text
 * @param {string} anchor
 * @returns {boolean}
 */
export const containsAnchor = (text, anchor) => {
  if (!text || !anchor) return false
  if (text.includes(anchor)) return true
  const wanted = flatten(anchor)
  if (!wanted) return false
  const spellings = [
    text,
    ...withoutTags(text),
    ...withoutTags(withoutCommentLeaders(text))
  ]
  return spellings.some((spelling) => flatten(spelling).includes(wanted))
}

const HOLE = /\$\{[^}]*\}|\{\{[^}]*\}\}|\{%[^%]*%\}/

const longestSharedFragment = (left, right) => {
  const a = left.slice(0, MAX_TEXT_SCANNED)
  const b = right
  let best = 0
  let bestEnd = 0
  let previous = new Uint32Array(b.length + 1)
  for (let i = 1; i <= a.length; i += 1) {
    const current = new Uint32Array(b.length + 1)
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] !== b[j - 1]) continue
      current[j] = previous[j - 1] + 1
      if (current[j] > best) {
        best = current[j]
        bestEnd = j
      }
    }
    previous = current
  }
  return b.slice(bestEnd - best, bestEnd)
}

/**
 * Is the anchor a rendering of this text rather than a string in it?
 *
 * The test is that the text interpolates at all, and that it shares a run of
 * literal characters with the anchor long enough not to be a coincidence. That
 * run is returned so the report can show what the two do have in common instead
 * of merely asserting the class.
 *
 * @param {string|null} text
 * @param {string} anchor
 * @returns {string|null} The shared literal run, or nothing
 */
export const interpolatedFrom = (text, anchor) => {
  if (!text || !HOLE.test(text)) return null
  const flat = flatten(withoutTags(text)[0])
  const wanted = flatten(anchor)
  const shared = longestSharedFragment(flat, wanted)
  const enough = Math.max(MIN_SHARED_FRAGMENT, Math.ceil(wanted.length * 0.4))
  return shared.length >= enough ? shared : null
}

/**
 * The text of the pages a finding points at, read once each.
 *
 * A screen with no capture on disk is not a screen whose page lacks the string,
 * so a missing file contributes nothing rather than a negative answer.
 *
 * @param {object[]} sides
 * @returns {(screens: string[]) => string[]}
 */
export const capturedPageReader = (sides) => {
  const cache = new Map()
  return (screens = []) =>
    sides.flatMap((side) =>
      screens
        .filter((screen) => screen.startsWith(side.screenPrefix ?? ''))
        .map((screen) => {
          const path = join(side.htmlDir ?? '', `${screen}.html`)
          if (!cache.has(path)) {
            cache.set(
              path,
              existsSync(path) ? readFileSync(path, 'utf8') : null
            )
          }
          return cache.get(path)
        })
        .filter(Boolean)
    )
}

const firstHolder = (sources, anchor) =>
  sources.find((source) => containsAnchor(source.text, anchor)) ?? null

/**
 * Sort one citation's anchors into the six classes.
 *
 * @param {object} args
 * @param {string[]} [args.anchors]
 * @param {{cited: string|null, file: string|null}} args.own
 * @param {Array<{ref: string, cited: string|null, file: string|null}>} [args.siblings]
 * @param {string[]} [args.pages] - Captured page HTML for this finding's screens
 * @returns {object}
 */
export const classifyAnchors = ({
  anchors,
  own,
  siblings = [],
  pages = []
}) => {
  const result = {
    ok: true,
    inRange: [],
    outOfRange: [],
    inSibling: [],
    interpolated: [],
    rendered: [],
    missingFromFile: []
  }

  for (const anchor of anchors ?? []) {
    if (containsAnchor(own.cited, anchor)) {
      result.inRange.push(anchor)
      continue
    }
    if (containsAnchor(own.file, anchor)) {
      result.outOfRange.push(anchor)
      continue
    }
    const sibling =
      firstHolder(
        siblings.map((entry) => ({ ...entry, text: entry.cited })),
        anchor
      ) ??
      firstHolder(
        siblings.map((entry) => ({ ...entry, text: entry.file })),
        anchor
      )
    if (sibling) {
      result.inSibling.push({ anchor, ref: sibling.ref })
      continue
    }
    const shared =
      interpolatedFrom(own.cited, anchor) ??
      siblings
        .map((entry) => interpolatedFrom(entry.cited, anchor))
        .find(Boolean) ??
      null
    if (shared) {
      result.interpolated.push({ anchor, shared })
      continue
    }
    if (pages.some((page) => containsAnchor(page, anchor))) {
      result.rendered.push(anchor)
      continue
    }
    result.missingFromFile.push(anchor)
  }

  result.ok =
    result.outOfRange.length === 0 && result.missingFromFile.length === 0
  return result
}
