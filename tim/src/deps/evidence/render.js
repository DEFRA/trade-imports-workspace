import { evidenceRowsVerdict, hitsPhrase } from './row.js'

const OUTCOME_LABELS = {
  applied: 'Applied',
  'not-applicable': 'Not applicable',
  'needs-a-person': 'Needs a person'
}

const tableCell = (text) =>
  String(text).replaceAll('|', '\\|').replace(/\r?\n/g, ' ')

const codeSpan = (text) =>
  text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``

const hitsBeforeText = (count) =>
  count == null ? 'not counted' : hitsPhrase(count)

const hitsAfterText = (count) => (count == null ? 'not counted' : String(count))

const patternEvidence = ({ pattern, hitsBefore, hitsAfter }) =>
  `${codeSpan(pattern)}: ${hitsBeforeText(hitsBefore)} before, ${hitsAfterText(hitsAfter)} after.`

const acceptanceEvidence = ({ acceptedBy, acceptedOn }) =>
  `Accepted by ${acceptedBy} on ${acceptedOn}, with no code change.`

const evidenceCell = (row, { problem }) =>
  [
    row.pattern ? patternEvidence(row) : null,
    row.acceptedBy ? acceptanceEvidence(row) : null,
    row.reason.trim() || null,
    problem && row.outcome !== 'needs-a-person'
      ? `**Not clean:** ${problem}`
      : null
  ]
    .filter((part) => part !== null)
    .map(tableCell)
    .join('<br>') || '-'

const outcomeCell = ({ outcome }, { clean }) =>
  clean ? OUTCOME_LABELS[outcome] : `**${OUTCOME_LABELS[outcome]}**`

const tableLine = (row, verdict) =>
  `| ${tableCell(row.item)} | ${outcomeCell(row, verdict)} | ${evidenceCell(row, verdict)} |`

const summaryLine = (rowCount, notCleanCount) => {
  if (rowCount === 0) {
    return '**No changelog evidence is recorded, so a person needs to read the changelog.**'
  }
  if (notCleanCount === 0) return 'Every row is clean.'
  return `**${notCleanCount} of ${rowCount} rows are not clean.**`
}

/**
 * Whether every evidence row is clean, as plain text, with a line for each
 * row that is not saying why. No rows is not clean.
 *
 * @param {{allClean: boolean, rowCount: number, notCleanCount: number, rows: {item: string, clean: boolean, problem: string|null}[]}} verdict - From `evidenceRowsVerdict`
 * @param {string} subject - Whose rows they are, such as "for eslint in trade-imports-animals-frontend"
 * @returns {string}
 */
export const evidenceVerdictText = (
  { allClean, rowCount, notCleanCount, rows },
  subject
) => {
  if (rowCount === 0) {
    return `No evidence rows are recorded ${subject}, so a person needs to read the changelog.`
  }
  if (allClean) {
    return `Every evidence row ${subject} is clean (${rowCount} rows).`
  }
  return [
    `${notCleanCount} of ${rowCount} evidence rows ${subject} are not clean:`,
    ...rows
      .filter(({ clean }) => !clean)
      .map(({ item, problem }) => `- ${item}: ${problem}`)
  ].join('\n')
}

/**
 * The markdown evidence table for a pull request description, with columns
 * Changelog item, Outcome and Evidence, and a line saying whether every row
 * is clean. No rows is not clean: the changelog still needs reading.
 *
 * @param {object[]} rows - Valid evidence rows
 * @returns {{markdown: string, allClean: boolean, rowCount: number, notCleanCount: number}}
 */
export const renderEvidenceTable = (rows) => {
  const {
    allClean,
    rowCount,
    notCleanCount,
    rows: verdicts
  } = evidenceRowsVerdict(rows)
  const table =
    rowCount === 0
      ? []
      : [
          '| Changelog item | Outcome | Evidence |',
          '|---|---|---|',
          ...rows.map((row, index) => tableLine(row, verdicts[index])),
          ''
        ]
  return {
    markdown: [...table, summaryLine(rowCount, notCleanCount)].join('\n'),
    allClean,
    rowCount,
    notCleanCount
  }
}
