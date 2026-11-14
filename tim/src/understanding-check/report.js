import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { echoedLines } from './echo.js'
import {
  alternative,
  elements,
  field,
  interpolated,
  jqLength,
  joined,
  optionalElements,
  rawOutput,
  uniqueSorted
} from './jq-values.js'
import { checkFilePaths, checkFolder } from './paths.js'
import { requireExisting } from './refusals.js'
import { FINDING_SECTIONS } from './analysis.js'

const isFile = (path) => existsSync(path) && statSync(path).isFile()

const fieldPath = (value, ...keys) =>
  keys.reduce((current, key) => field(current, key), value)

const isAnalysisFileName = (name) =>
  name.startsWith('analysis.') &&
  name.endsWith('.json') &&
  name.length >= 'analysis..json'.length

const analysesIn = (folder) =>
  readdirSync(folder)
    .filter(isAnalysisFileName)
    .sort()
    .map((name) => join(folder, name))
    .filter(isFile)
    .map(readJsonFile)

const lines = (...texts) => texts.map((text) => `${text}\n`).join('')

const sectionCountLines = (analysis) =>
  FINDING_SECTIONS.map(
    (section) => `- ${section}: ${jqLength(field(analysis, section))}`
  )

const analysisCountsBlock = (analysis) =>
  lines(
    `### ${rawOutput(field(analysis, 'repo'))}`,
    ...sectionCountLines(analysis),
    ''
  )

const questionBlock = (question) => {
  const rubric = field(question, 'rubric')
  return lines(
    `### ${interpolated(field(question, 'id'))} — [${interpolated(field(question, 'category'))}]\n\n` +
      `**Prompt:** ${interpolated(field(question, 'prompt'))}\n\n` +
      `**Anchor:** \`${interpolated(fieldPath(question, 'anchorEvidence', 'file'))}:${interpolated(fieldPath(question, 'anchorEvidence', 'lines'))}\`\n\n` +
      `**Expected concepts:** ${joined(field(question, 'expectedConcepts'), ', ', 'expectedConcepts')}\n\n` +
      '**Rubric**\n' +
      `- PASS: ${interpolated(field(rubric, 'PASS'))}\n` +
      `- PARTIAL: ${interpolated(field(rubric, 'PARTIAL'))}\n` +
      `- FAIL: ${interpolated(field(rubric, 'FAIL'))}\n`
  )
}

const summaryOf = (meta) => rawOutput(alternative(field(meta, 'summary'), ''))

const questionsOf = (questionSet) =>
  elements(field(questionSet, 'questions'), 'questions.json questions')

/**
 * The plan-gate preview: the ticket, a count of each analysis's findings
 * and every question with its rubric.
 *
 * @param {object} given
 * @param {string} given.workspaceRoot
 * @param {string} given.ticket
 * @returns {{preview: string}} The preview, ending in a newline
 * @throws {TimError} NOT_FOUND with no .interview-meta.json or questions.json
 */
export const renderPreview = ({ workspaceRoot, ticket }) => {
  const folder = checkFolder(workspaceRoot, ticket)
  const paths = checkFilePaths(folder)
  requireExisting(paths.meta)
  requireExisting(paths.questions, ' — generate questions first')
  const meta = readJsonFile(paths.meta)
  const questionSet = readJsonFile(paths.questions)
  const preview =
    lines(
      '# Understanding check — preview (plan gate)',
      '',
      `**Ticket:** ${ticket} — ${summaryOf(meta)}`,
      '',
      '## Per-repo analysis summary',
      ''
    ) +
    analysesIn(folder).map(analysisCountsBlock).join('') +
    lines(
      `## Question set (${jqLength(field(questionSet, 'questions'))} questions)`,
      ''
    ) +
    questionsOf(questionSet).map(questionBlock).join('')
  return { preview }
}

const commitPrefix = (commit) => {
  const shortCommitLength = 7
  if (commit === null) return null
  if (typeof commit === 'string') {
    return [...commit].slice(0, shortCommitLength).join('')
  }
  if (Array.isArray(commit)) return commit.slice(0, shortCommitLength)
  throw new TimError(
    'PARSE',
    `Error: .interview-meta.json has a commit that is not text: ${JSON.stringify(commit)}`
  )
}

const pullRequestLine = (pullRequest) =>
  `  - ${interpolated(field(pullRequest, 'repo'))}#${interpolated(field(pullRequest, 'pr'))} (${interpolated(field(pullRequest, 'state'))}, commit ${interpolated(commitPrefix(field(pullRequest, 'commit')))})`

const fileLines = (text) => {
  const split = text.split('\n')
  return split.at(-1) === '' ? split.slice(0, -1) : split
}

const descriptionLines = (ticketMarkdown) => {
  const maxLines = 20
  const kept = []
  let inDescription = false
  for (const line of fileLines(ticketMarkdown)) {
    if (line.startsWith('## Description')) {
      inDescription = true
    } else {
      if (line.startsWith('## ')) inDescription = false
      if (inDescription) kept.push(line)
    }
  }
  return kept.slice(0, maxLines)
}

const ticketSummaryLines = (folder, summary) => {
  const ticketPath = join(folder, 'ticket.md')
  return isFile(ticketPath)
    ? descriptionLines(readFileSync(ticketPath, 'utf8'))
    : echoedLines(summary)
}

const changeSummaryBlock = (analysis) =>
  lines(
    `### ${rawOutput(field(analysis, 'repo'))}`,
    '',
    `**What:** ${interpolated(alternative(field(analysis, 'changeSummary'), '(missing)'))}\n\n**Why:** ${interpolated(alternative(field(analysis, 'whyItChanged'), '(missing)'))}`,
    ''
  )

const questionKey = (id) =>
  typeof id === 'string' ? id : JSON.stringify(id ?? null)

const questionsById = (questions) =>
  new Map(
    questions.map((question) => [questionKey(field(question, 'id')), question])
  )

const questionFor = (byId, entry) => {
  const questionId = field(entry, 'question_id')
  if (typeof questionId !== 'string') {
    throw new TimError(
      'PARSE',
      `Error: transcript.json has a question_id that is not text: ${JSON.stringify(questionId)}`
    )
  }
  return byId.get(questionId) ?? null
}

const scoreField = (entry, key) => fieldPath(entry, 'score', key)

const tableCell = (value, label) => {
  if (typeof value !== 'string') {
    throw new TimError(
      'PARSE',
      `Error: transcript.json has a ${label} that is not text: ${JSON.stringify(value)}`
    )
  }
  return value.replaceAll('|', '\\\\|')
}

const tableRow = (byId, entry) => {
  const question = questionFor(byId, entry)
  const rubricMatch = alternative(scoreField(entry, 'rubric_match'), '')
  const missed = joined(
    alternative(scoreField(entry, 'missed_concepts'), []),
    ', ',
    'missed_concepts'
  )
  return `| ${interpolated(field(entry, 'question_id'))} | ${interpolated(field(question, 'category'))} | ${interpolated(alternative(scoreField(entry, 'verdict'), 'PENDING'))} | ${tableCell(rubricMatch, 'rubric_match')} | ${tableCell(missed, 'missed_concepts')} |`
}

const anchorOf = (question) =>
  `${interpolated(fieldPath(question, 'anchorEvidence', 'file'))}:${interpolated(fieldPath(question, 'anchorEvidence', 'lines'))}`

const transcriptBlock = (byId, entry) => {
  const question = questionFor(byId, entry)
  return lines(
    `### ${interpolated(field(entry, 'question_id'))} — [${interpolated(field(question, 'category'))}]\n\n` +
      `**Prompt:** ${interpolated(field(question, 'prompt'))}\n\n` +
      `**Anchor:** \`${anchorOf(question)}\`\n\n` +
      `**Developer answer:**\n\n\`\`\`\n${interpolated(field(entry, 'answer'))}\n\`\`\`\n\n` +
      `**Score:**\n\n\`\`\`json\n${JSON.stringify(field(entry, 'score'))}\n\`\`\`\n`
  )
}

const conceptsIn = (missed) => {
  if (typeof missed === 'object') return optionalElements(missed)
  throw new TimError(
    'PARSE',
    `Error: transcript.json has missed_concepts that are not a list: ${JSON.stringify(missed)}`
  )
}

const missedConceptsOf = (entries) =>
  uniqueSorted(
    entries
      .map((entry) => scoreField(entry, 'missed_concepts'))
      .filter((missed) => missed !== null && missed !== false)
      .flatMap(conceptsIn)
  )

const hasFollowUp = (entry) => {
  const followUp = scoreField(entry, 'follow_up')
  return followUp !== null && followUp !== ''
}

const followUpLine = (byId, entry) =>
  `- (${anchorOf(questionFor(byId, entry))}) ${interpolated(scoreField(entry, 'follow_up'))}`

const verdictCount = (entries, verdict) =>
  entries.filter((entry) => scoreField(entry, 'verdict') === verdict).length

const prCommentGapLines = (gaps) => {
  const gapText = joined(gaps, ', ', 'missed_concepts').replace(/\n+$/, '')
  return gapText === ''
    ? []
    : [`Author concept gaps to revisit: ${gapText}`, '']
}

const reportText = ({ ticket, folder, meta, questions, entries }) => {
  const byId = questionsById(questions)
  const verdict = rawOutput(
    alternative(field(meta, 'verdict'), '(not finalised)')
  )
  const verdictReason = rawOutput(
    alternative(field(meta, 'verdict_reason'), '')
  )
  const summary = summaryOf(meta)
  const gaps = missedConceptsOf(entries)
  const redaction = field(meta, 'redaction_summary')
  return (
    lines(
      `# Understanding check — ${ticket}`,
      '',
      '## 1. Header',
      '',
      `- **Ticket:** ${ticket} — ${summary}`,
      `- **Run started:** ${rawOutput(alternative(field(meta, 'created_at'), ''))}`,
      `- **Run finished:** ${rawOutput(alternative(field(meta, 'completed_at'), ''))}`,
      '- **PRs:**',
      ...elements(field(meta, 'prs'), '.interview-meta.json prs').map(
        pullRequestLine
      ),
      '',
      '## 2. Ticket summary',
      '',
      ...ticketSummaryLines(folder, summary),
      '',
      '## 3. Change summary',
      ''
    ) +
    analysesIn(folder).map(changeSummaryBlock).join('') +
    lines(
      '## 4. Merge recommendation',
      '',
      `- **Verdict:** \`${verdict}\``,
      `- **Exit code:** ${rawOutput(alternative(field(meta, 'exit_code'), '?'))}`,
      `- **Deciding rule:** ${verdictReason}`,
      '',
      '## 5. Per-question table',
      '',
      '| ID | Category | Verdict | Rubric clause | Gap |',
      '|---|---|---|---|---|',
      ...entries.map((entry) => tableRow(byId, entry)),
      '',
      '## 6. Full transcript',
      ''
    ) +
    entries.map((entry) => transcriptBlock(byId, entry)).join('') +
    lines(
      '',
      '## 7. Gaps in understanding',
      '',
      ...gaps.map((gap) => `- ${interpolated(gap)}`),
      '',
      '## 8. Suggested follow-up learning',
      '',
      ...entries.filter(hasFollowUp).map((entry) => followUpLine(byId, entry)),
      '',
      '## 9. Coverage gaps',
      '',
      `Redacted ${rawOutput(alternative(field(redaction, 'matches'), 0))} match(es) across ${rawOutput(alternative(field(redaction, 'files'), 0))} file(s) at prepare time (matched substrings never logged).`,
      '',
      ...optionalElements(field(meta, 'coverage_gaps')).map(
        (gap) => `- ${interpolated(gap)}`
      ),
      '',
      '## 10. Paste-ready PR comment',
      '',
      '```markdown',
      `**Understanding check — ${ticket}**`,
      '',
      `Verdict: \`${verdict}\` (${verdictReason})`,
      '',
      `Counts: PASS=${verdictCount(entries, 'PASS')}, PARTIAL=${verdictCount(entries, 'PARTIAL')}, FAIL=${verdictCount(entries, 'FAIL')}`,
      '',
      ...prCommentGapLines(gaps),
      '_This score is a coaching signal, not a gate. Reviewer judgement overrides._',
      '```'
    )
  )
}

/**
 * Writes the full report to the check's report.md, in ten sections.
 *
 * @param {object} given
 * @param {string} given.workspaceRoot
 * @param {string} given.ticket
 * @returns {{path: string}} Where the report was written
 * @throws {TimError} NOT_FOUND with no .interview-meta.json, transcript.json or questions.json; PARSE for a file shaped other than the skill writes it
 */
export const writeReport = ({ workspaceRoot, ticket }) => {
  const folder = checkFolder(workspaceRoot, ticket)
  const paths = checkFilePaths(folder)
  requireExisting(paths.meta)
  requireExisting(paths.transcript, ' — finish the interview first')
  requireExisting(paths.questions, ' — generate questions first')
  const text = reportText({
    ticket,
    folder,
    meta: readJsonFile(paths.meta),
    questions: questionsOf(readJsonFile(paths.questions)),
    entries: elements(
      field(readJsonFile(paths.transcript), 'entries'),
      'transcript.json entries'
    )
  })
  const path = join(folder, 'report.md')
  writeFileSync(path, text)
  return { path }
}

/**
 * @param {ReturnType<typeof writeReport>} written
 * @returns {string}
 */
export const writeReportText = ({ path }) => `Wrote: ${path}`
