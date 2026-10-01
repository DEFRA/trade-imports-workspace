// Jira renders wiki markup, not markdown: a bare [ opens a link, a bare { a
// macro, and markdown's backticks and ** show as literal characters.
const SUMMARY_LIMIT = 255
const CODE_SPAN = /`([^`]+)`/g

const escapeWiki = (text) => text.replace(/([[\]{])/g, '\\$1')

const monospace = (text) => `{{${String(text).replace(/([[\]{}])/g, '\\$1')}}}`

const plainToWiki = (text) =>
  escapeWiki(text).replace(/\*\*([^*]+)\*\*/g, '*$1*')

/**
 * One line of row text as Jira wiki markup: code spans become monospace, `**`
 * becomes `*`, and brackets and braces are escaped so they render as written.
 *
 * @param {string} text
 * @returns {string}
 */
export const wikiInline = (text) => {
  const source = String(text)
  const parts = []
  let last = 0
  for (const match of source.matchAll(CODE_SPAN)) {
    parts.push(
      plainToWiki(source.slice(last, match.index)),
      monospace(match[1])
    )
    last = match.index + match[0].length
  }
  parts.push(plainToWiki(source.slice(last)))
  return parts.join('')
}

const MARKDOWN_HEADING = /^#+\s+/
const MARKDOWN_BULLET = /^\s*[-*]\s+/

const wikiLine = (line) => {
  if (MARKDOWN_HEADING.test(line)) {
    return `*${wikiInline(line.replace(MARKDOWN_HEADING, ''))}*`
  }
  if (MARKDOWN_BULLET.test(line)) {
    return `* ${wikiInline(line.replace(MARKDOWN_BULLET, ''))}`
  }
  return wikiInline(line)
}

const wikiBlock = (text) => String(text).split('\n').map(wikiLine).join('\n')

const LEADING_BULLET = /^\s*[*-]+\s*/

const bullet = (text) =>
  `* ${wikiInline(String(text).replace(LEADING_BULLET, ''))}`

const describeSource = (source) => {
  if (typeof source === 'string') return wikiInline(source)
  if (source === null || typeof source !== 'object') {
    return monospace(JSON.stringify(source))
  }
  return Object.entries(source)
    .map(
      ([field, value]) =>
        `${field}: ${monospace(typeof value === 'string' ? value : JSON.stringify(value))}`
    )
    .join(', ')
}

/**
 * The Jira description for an increment's ticket, from its backlog row:
 * what it is, what and why, its acceptance criteria and its sources, in wiki
 * markup. The same row always gives the same text.
 *
 * @param {object} args
 * @param {string} args.workarea
 * @param {{id: string, title: string, detail: string, acceptanceCriteria: string[], sources?: unknown[]}} args.row
 * @returns {string}
 */
export const ticketDescription = ({ workarea, row }) => {
  const sources = Array.isArray(row.sources) ? row.sources : []
  return [
    'h2. Increment',
    '',
    `${monospace(row.id)} from the ${monospace(workarea)} backlog: ${wikiInline(row.title)}`,
    '',
    'h2. What and why',
    '',
    wikiBlock(row.detail),
    '',
    'h2. Acceptance criteria',
    '',
    ...(row.acceptanceCriteria ?? []).map(bullet),
    ...(sources.length
      ? [
          '',
          'h2. Sources',
          '',
          ...sources.map((source) => `* ${describeSource(source)}`)
        ]
      : []),
    '',
    'h2. Backlog',
    '',
    monospace(`workareas/${workarea}/backlog.json`),
    ''
  ].join('\n')
}

/**
 * The ticket's summary: the increment id and its title, cut to Jira's limit.
 *
 * @param {{id: string, title: string}} row
 * @returns {string}
 */
export const ticketSummary = ({ id, title }) => {
  const summary = `${id} — ${String(title).replace(/\s+/g, ' ').trim()}`
  return summary.length <= SUMMARY_LIMIT
    ? summary
    : `${summary.slice(0, SUMMARY_LIMIT - 1).trimEnd()}…`
}
