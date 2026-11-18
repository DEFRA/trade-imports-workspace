const WHITESPACE = '[ \\t\\n\\v\\f\\r]'
const CODE = '(?:COMMON-|CORE-)?CAP-(?:H|\\d+)(?:\\.\\d+)*'

const rowAnchor = new RegExp(`(?<![^\\n])\\|(?=[ \\t]*${CODE})`, 'g')
const firstThreeCells = /^\|([^|]*)\|([^|]*)\|([^|]*)\|/
const leadingCode = new RegExp(`^(${CODE})`)
const codeOnly = new RegExp(`^${CODE}$`)
const statusLabel = /STATUS[ \t\n\v\f\r]*:/i
const externalLabel = /EXTERNAL/i
const labelledStatus = new RegExp(
  `^STATUS${WHITESPACE}*:${WHITESPACE}*([^\\n]+)$`,
  'i'
)
const boldRun = /\*\*([\s\S]+?)\*\*/g
const whitespaceRun = new RegExp(`${WHITESPACE}+`, 'g')
const leadingWhitespace = new RegExp(`^${WHITESPACE}+`)
const trailingWhitespace = new RegExp(`${WHITESPACE}+$`)
const spaceBeforePunctuation = new RegExp(`${WHITESPACE}+([:;,.])`, 'g')

const trim = (text) =>
  text.replace(leadingWhitespace, '').replace(trailingWhitespace, '')

const lineAt = (content, offset) =>
  1 + (content.slice(0, offset).match(/\n/g)?.length ?? 0)

/**
 * The display name a Capability cell gives: every bold run joined by a
 * space (or the whole cell when it has none), with whitespace squashed and
 * no space left before `:`, `;`, `,` or `.`.
 *
 * @param {string} cell
 * @returns {string}
 */
export const nameOfCell = (cell) => {
  const runs = [...cell.matchAll(boldRun)].map(([, run]) => run)
  const joined = runs.length > 0 ? runs.join(' ') : cell
  return trim(
    joined
      .replaceAll('**', '')
      .replace(whitespaceRun, ' ')
      .replace(spaceBeforePunctuation, '$1')
  )
}

const idCellProblems = (id) => {
  if (codeOnly.test(id)) return []
  const named = [
    ...(statusLabel.test(id) ? ['id-has-status'] : []),
    ...(externalLabel.test(id) ? ['id-has-external'] : [])
  ]
  return named.length > 0 ? named : ['id-not-clean']
}

const readStatusCell = (status) => {
  if (status === '') return { value: '', problems: [] }
  const labelled = status.match(labelledStatus)
  if (labelled) return { value: trim(labelled[1]), problems: [] }
  if (status.includes('**')) {
    return { value: '', problems: ['status-column-missing'] }
  }
  return { value: '', problems: ['status-cell-invalid'] }
}

const truncatedRow = (line) => ({
  violation: {
    line,
    code: '?',
    rule: 'row-truncated',
    detail: 'row has fewer than three cells'
  }
})

const readRow = (content, offset) => {
  const line = lineAt(content, offset)
  const cells = content.slice(offset).match(firstThreeCells)
  if (!cells) return truncatedRow(line)

  const [, idCell, statusCell, nameCell] = cells
  const id = trim(idCell)
  const code = id.match(leadingCode)?.[1] ?? '?'
  const status = readStatusCell(trim(statusCell))
  const name = nameOfCell(nameCell)
  const problems = [
    ...idCellProblems(id),
    ...status.problems,
    ...(name === '' ? ['name-empty'] : [])
  ]
  const verdict = problems.length > 0 ? problems.join(',') : 'ok'
  return {
    row: { code, status: status.value, name, verdict, line },
    violation:
      problems.length > 0
        ? { line, code, rule: verdict, detail: id }
        : undefined
  }
}

/**
 * Reads every capability row of the EUDP Import Notification Capability
 * Map. A row is any table line whose first cell starts with a capability
 * code (`CAP-0.4`, `CAP-H.3`, `COMMON-CAP-01.2`, `CORE-CAP-1.1`). A
 * canonical row's ID cell holds the code alone, its Status cell is empty
 * or `STATUS: <value>`, and its Capability cell gives a name.
 *
 * @param {string} content - The map's markdown
 * @returns {{
 *   rows: {code: string, status: string, name: string, verdict: string, line: number}[],
 *   violations: {line: number, code: string, rule: string, detail: string}[]
 * }} `rows` holds every row with at least three cells, its verdict `ok` or
 *   its broken rules joined by commas. `violations` holds each row that is
 *   not canonical, a row with fewer than three cells included.
 */
export const parseCapabilityMap = (content) => {
  const read = [...content.matchAll(rowAnchor)].map(({ index }) =>
    readRow(content, index)
  )
  return {
    rows: read.flatMap(({ row }) => (row ? [row] : [])),
    violations: read.flatMap(({ violation }) => (violation ? [violation] : []))
  }
}

const listLine = ({ code, name, status }) =>
  `${code} — ${name}${status === '' ? '' : ` [${status}]`}`

const tsvField = (value) => String(value).replace(/[\t\n]/g, ' ')

const tsvLine = ({ code, status, name, verdict, line }) =>
  [code, status, name, verdict, line].map(tsvField).join('\t')

const linesOrNothing = (lines) => (lines.length > 0 ? lines.join('\n') : null)

/**
 * @param {{rows: object[]}} parsed - From {@link parseCapabilityMap}
 * @returns {string|null} One `CODE — Name [STATUS]` line per row, or null
 *   when there is no row
 */
export const renderList = ({ rows }) => linesOrNothing(rows.map(listLine))

/**
 * @param {{rows: object[]}} parsed - From {@link parseCapabilityMap}
 * @returns {string|null} One `code, status, name, verdict, line` line per
 *   row, tab-separated, or null when there is no row
 */
export const renderTsv = ({ rows }) => linesOrNothing(rows.map(tsvLine))

const showsIdCell = (rule) => /^id-|status-column-missing/.test(rule)

const violationLines = ({ line, code, rule, detail }) => [
  `  line ${String(line).padEnd(5)} ${code.padEnd(18)} ${rule}`,
  ...(showsIdCell(rule) ? [`  ${''.padEnd(24)} ID cell reads: ${detail}`] : [])
]

/**
 * The refusal `list` format gives for a map that is not canonical.
 *
 * @param {{rows: object[], violations: object[]}} parsed - From {@link parseCapabilityMap}
 * @returns {string} The report, without its final newline
 */
export const renderRefusal = ({ rows, violations }) =>
  [
    'Capability map is not canonical - refusing to emit a partial list.',
    '',
    ...violations.flatMap(violationLines),
    '',
    `${violations.length} of ${rows.length} rows violate the canonical shape.`,
    'Run tim capabilities check for the full picture.'
  ].join('\n')
