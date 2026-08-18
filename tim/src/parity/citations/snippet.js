import { execFileSync } from 'node:child_process'

export const INLINE_LIMIT = 6
export const COLLAPSE_LIMIT = 20
export const CONTEXT_LINES = 2

/**
 * Read a file at a commit. Never from the working tree: repos/ checkouts are
 * routinely mid-spike, and a snippet must be of the code the citation points
 * at rather than of whatever is checked out tonight.
 *
 * @param {string} repoPath
 * @param {string} sha
 * @param {string} path
 * @returns {string[]|null} Lines, or null when the file is not there
 */
export const readAtCommit = (repoPath, sha, path) => {
  try {
    return execFileSync('git', ['-C', repoPath, 'show', `${sha}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024
    }).split('\n')
  } catch {
    return null
  }
}

/**
 * Slice a snippet around a line range, with dimmed context either side.
 *
 * @param {object} args
 * @param {string[]} args.lines - The whole file
 * @param {{start: number, end: number}} args.range - 1-indexed, inclusive
 * @param {number} [args.context]
 * @returns {{state: string, lines: Array<{n: number, text: string, focus: boolean}>, span: number}}
 */
export const sliceSnippet = ({ lines, range, context = CONTEXT_LINES }) => {
  const span = range.end - range.start + 1
  if (span > COLLAPSE_LIMIT) {
    return { state: 'too-long', lines: [], span }
  }
  const from = Math.max(1, range.start - context)
  const to = Math.min(lines.length, range.end + context)
  const out = []
  for (let n = from; n <= to; n += 1) {
    out.push({
      n,
      text: lines[n - 1] ?? '',
      focus: n >= range.start && n <= range.end
    })
  }
  return {
    state: span <= INLINE_LIMIT ? 'inline' : 'collapsed',
    lines: out,
    span
  }
}

/**
 * Invariant I7. Every identifier or quoted string the prose attributes to a
 * citation must appear in the text that citation resolves to.
 *
 * A miss is a finding about the finding — reported and rendered as a warning,
 * never patched by widening the range or picking a different file.
 *
 * @param {object} args
 * @param {string[]} args.anchors
 * @param {Array<{text: string}>} args.lines
 * @returns {{ok: boolean, missing: string[]}}
 */
export const checkAnchors = ({ anchors, lines }) => {
  const raw = lines.map((line) => line.text).join('\n')
  // Copy in a template is routinely wrapped across lines and indented, so a
  // literal match on the raw text would report a miss on a string that is
  // plainly there. Whitespace is collapsed on both sides; nothing else is.
  const flattened = raw.replace(/\s+/g, ' ')
  const missing = (anchors ?? []).filter((anchor) => {
    if (raw.includes(anchor)) return false
    return !flattened.includes(anchor.replace(/\s+/g, ' '))
  })
  return { ok: missing.length === 0, missing }
}
