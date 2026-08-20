import { execFileSync } from 'node:child_process'

export const INLINE_LIMIT = 6

// How many cited lines a card will show in full, behind a disclosure. It was
// 20, and above it sliceSnippet returned no lines at all: the card rendered a
// permalink with nothing under it, and the anchor check — which read the
// snippet — then searched an empty string and reported every anchor as drifted.
// 80 of the DR1 corpus's 534 citations were in that state and 12 of the 19
// reported range drifts were the artefact rather than a drift.
//
// 50 is where the corpus stops being ordinary: three quarters of the long
// citations are 50 lines or fewer, and the handful above it are whole-route
// blocks nobody reads line by line. Above the limit the snippet is truncated
// with an explicit row saying how many lines are not shown, because a snippet
// that says it is short is worth more than no snippet at all.
export const COLLAPSE_LIMIT = 50

export const TRUNCATED_HEAD = 30
export const TRUNCATED_TAIL = 15
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
 * Every range a citation carries, in the order the prose wrote them.
 *
 * `lines` holds a single range and is set only when the prose named one;
 * `ranges` holds them all. Reading `lines ?? ranges[0]` dropped every range
 * after the first from the permalink, the snippet and the anchor check, which
 * silently mis-scoped the 23 multi-range citations in the DR1 corpus.
 *
 * @param {object} citation
 * @returns {Array<{start: number, end: number}>}
 */
export const rangesOf = (citation) => {
  if (Array.isArray(citation?.ranges) && citation.ranges.length) {
    return citation.ranges
  }
  return citation?.lines ? [citation.lines] : []
}

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)

/** Context windows around each range, overlapping ones merged into one. */
const windowsFor = ({ lines, ranges, context }) => {
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged = []
  for (const range of sorted) {
    const from = clamp(range.start - context, 1, Math.max(lines.length, 1))
    const to = clamp(range.end + context, 1, Math.max(lines.length, 1))
    const last = merged.at(-1)
    if (last && from <= last.to + 1) {
      last.to = Math.max(last.to, to)
      continue
    }
    merged.push({ from, to })
  }
  return merged
}

const isFocus = (ranges, n) =>
  ranges.some((range) => n >= range.start && n <= range.end)

/** A row standing for lines the snippet does not show. */
const gapRow = (skipped) => ({
  n: '',
  text: `… ${skipped} ${skipped === 1 ? 'line' : 'lines'} not shown …`,
  focus: false,
  gap: true
})

const truncate = (rows) => {
  const shown = TRUNCATED_HEAD + TRUNCATED_TAIL
  if (rows.length <= shown) return { rows, omitted: 0 }
  const omitted = rows.length - shown
  return {
    rows: [
      ...rows.slice(0, TRUNCATED_HEAD),
      gapRow(omitted),
      ...rows.slice(-TRUNCATED_TAIL)
    ],
    omitted
  }
}

/**
 * Slice a snippet around one or more line ranges, with dimmed context either
 * side of each and a gap row wherever lines are skipped.
 *
 * @param {object} args
 * @param {string[]} args.lines - The whole file
 * @param {{start: number, end: number}} [args.range] - 1-indexed, inclusive
 * @param {Array<{start: number, end: number}>} [args.ranges] - Or several
 * @param {number} [args.context]
 * @returns {{state: string, lines: object[], span: number, truncated: boolean,
 *   omitted: number}}
 */
export const sliceSnippet = ({
  lines,
  range,
  ranges,
  context = CONTEXT_LINES
}) => {
  const cited = (ranges ?? (range ? [range] : [])).filter(Boolean)
  const span = cited.reduce((total, one) => total + one.end - one.start + 1, 0)
  if (cited.length === 0 || lines.length === 0) {
    return { state: 'inline', lines: [], span, truncated: false, omitted: 0 }
  }

  const rows = []
  for (const [index, window] of windowsFor({
    lines,
    ranges: cited,
    context
  }).entries()) {
    if (index > 0) rows.push(gapRow(window.from - rows.at(-1).n - 1))
    for (let n = window.from; n <= window.to; n += 1) {
      rows.push({ n, text: lines[n - 1] ?? '', focus: isFocus(cited, n) })
    }
  }

  const { rows: shown, omitted } = truncate(rows)
  return {
    state: span <= INLINE_LIMIT ? 'inline' : 'collapsed',
    lines: shown,
    span,
    truncated: omitted > 0,
    omitted
  }
}

/**
 * The exact text of the cited lines, with no context around them.
 *
 * This is what the anchor check reads. It is deliberately not the snippet: a
 * snippet is shortened for a card to be readable, and shortening what the check
 * searches turns a display decision into a false finding.
 *
 * @param {string[]} lines - The whole file
 * @param {Array<{start: number, end: number}>} ranges
 * @returns {string}
 */
export const citedText = (lines, ranges) =>
  ranges
    .map((range) =>
      lines.slice(Math.max(range.start - 1, 0), range.end).join('\n')
    )
    .join('\n')
