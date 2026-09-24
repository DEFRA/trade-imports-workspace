import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../errors.js'

export const FINDINGS_FILE = 'findings.json'
export const REPORT_FILE = 'report.md'
const RUNS_DIR = join('workareas', 'spec-catchup')
const RUN_DATE = /^\d{4}-\d{2}-\d{2}$/

export const VERDICTS = ['stale-link', 'spec-wrong', 'spec-gap', 'no-action']
export const DISPOSITIONS = ['accept', 'reject', 'edit', 'defer']

// A finding's status follows from its disposition, except that an accepted
// finding is only `applied` once the change is actually on disk — the walker
// sets that separately, so an interrupted walk cannot claim work it did not do.
const STATUS_FOR = {
  reject: 'rejected',
  defer: 'deferred',
  accept: 'accepted',
  edit: 'accepted'
}

const VERDICT_LABELS = {
  'stale-link': 'STALE LINK',
  'spec-wrong': 'SPEC WRONG',
  'spec-gap': 'SPEC GAP',
  'no-action': 'NO ACTION'
}

const findingSchema = z.object({
  id: z.string().regex(/^F-\d{3}$/, 'A finding id looks like F-001.'),
  verdict: z.enum(VERDICTS),
  capability: z.string().min(1),
  anchor: z.string().min(1).nullable().default(null),
  judgement: z.string().min(1, 'Every finding needs its one-sentence call.'),
  evidence: z
    .object({
      test: z.string().optional(),
      source: z.string().optional(),
      commit: z.string().optional()
    })
    .default({}),
  proposal: z
    .object({ file: z.string().min(1), diff: z.string().min(1) })
    .nullable()
    .default(null),
  disposition: z.enum(DISPOSITIONS).nullable().default(null),
  status: z
    .enum(['pending', 'accepted', 'applied', 'rejected', 'deferred'])
    .default('pending'),
  note: z.string().nullable().default(null)
})

export const findingsFileSchema = z.object({
  date: z.string().regex(RUN_DATE, 'A run date looks like 2026-09-24.'),
  baseline: z.object({
    verifiedAt: z.string().min(1),
    verifiedBy: z.string().min(1)
  }),
  findings: z.array(findingSchema),
  noActionBucket: z
    .object({
      capabilities: z.number().int().nonnegative(),
      disposition: z.enum(DISPOSITIONS).nullable().default(null),
      status: z
        .enum(['pending', 'accepted', 'rejected', 'deferred'])
        .default('pending')
    })
    .default({ capabilities: 0, disposition: null, status: 'pending' })
})

/**
 * The run to act on: the one named, or the most recent by date.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.run] - A run date, e.g. 2026-09-24
 * @returns {string} Absolute path to the run directory
 * @throws {TimError} NOT_FOUND when there is no such run, or none at all
 */
export const resolveRun = ({ workspaceRoot, run }) => {
  const runsDir = join(workspaceRoot, RUNS_DIR)
  if (run) {
    const named = join(runsDir, run)
    if (!existsSync(join(named, FINDINGS_FILE))) {
      throw new TimError(
        'NOT_FOUND',
        `Can't find ${FINDINGS_FILE} for run ${run}. Looked in ${named}.`
      )
    }
    return named
  }
  const dates = existsSync(runsDir)
    ? readdirSync(runsDir)
        .filter((entry) => RUN_DATE.test(entry))
        .filter((entry) => existsSync(join(runsDir, entry, FINDINGS_FILE)))
        .sort()
    : []
  if (dates.length === 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find a spec-catchup run with a ${FINDINGS_FILE}. Run spec-catchup first, or name a run with --run.`
    )
  }
  return join(runsDir, dates.at(-1))
}

/**
 * @param {string} runDir
 * @returns {object} The parsed, defaulted findings file
 * @throws {TimError} PARSE when the file is not valid JSON or not the expected shape
 */
export const loadFindings = (runDir) => {
  const path = join(runDir, FINDINGS_FILE)
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `Can't read ${path}: ${error.message}`, error)
  }
  const result = findingsFileSchema.safeParse(raw)
  if (!result.success) {
    const [issue] = result.error.issues
    throw new TimError(
      'PARSE',
      `${path} is not a findings file: ${issue.path.join('.')} ${issue.message}`
    )
  }
  const ids = result.data.findings.map((finding) => finding.id)
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
  if (duplicate) {
    throw new TimError('PARSE', `${path} uses the id ${duplicate} twice.`)
  }
  return result.data
}

const saveFindings = (runDir, data) =>
  writeFileSync(
    join(runDir, FINDINGS_FILE),
    `${JSON.stringify(data, null, 2)}\n`
  )

const findById = (data, id) => {
  const finding = data.findings.find((entry) => entry.id === id)
  if (!finding) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find finding ${id} in this run. Run "tim spec findings list" to see the ids.`
    )
  }
  return finding
}

/**
 * Record what a person decided about one finding. The walker calls this per
 * item; nothing else writes a disposition.
 *
 * @param {object} args
 * @param {string} args.runDir
 * @param {string} args.id
 * @param {string} args.disposition - One of DISPOSITIONS
 * @param {string} [args.note]
 * @returns {object} The updated finding
 */
export const ruleFinding = ({ runDir, id, disposition, note }) => {
  const data = loadFindings(runDir)
  const finding = findById(data, id)
  finding.disposition = disposition
  finding.status = STATUS_FOR[disposition]
  if (note !== undefined) finding.note = note
  saveFindings(runDir, data)
  return finding
}

/**
 * Mark an accepted finding as applied — the change is on disk. Refuses on a
 * finding nobody accepted, so "applied" always implies a person said yes.
 *
 * @param {object} args
 * @param {string} args.runDir
 * @param {string} args.id
 * @returns {object} The updated finding
 * @throws {TimError} USAGE when the finding was not accepted
 */
export const markApplied = ({ runDir, id }) => {
  const data = loadFindings(runDir)
  const finding = findById(data, id)
  if (finding.status !== 'accepted') {
    throw new TimError(
      'USAGE',
      `${id} is ${finding.status}, not accepted. Only an accepted finding can be applied.`
    )
  }
  finding.status = 'applied'
  saveFindings(runDir, data)
  return finding
}

/**
 * Record what a person decided about the NO ACTION bucket, which is ruled
 * once rather than per capability.
 *
 * @param {object} args
 * @param {string} args.runDir
 * @param {string} args.disposition - One of DISPOSITIONS
 * @returns {object} The updated bucket
 */
export const ruleBucket = ({ runDir, disposition }) => {
  const data = loadFindings(runDir)
  data.noActionBucket.disposition = disposition
  data.noActionBucket.status = STATUS_FOR[disposition]
  saveFindings(runDir, data)
  return data.noActionBucket
}

const isPending = (entry) => entry.status === 'pending'

// Two different questions, and conflating them would make the baseline gate
// wrong. "Pending" is never-looked-at. "Open" is not-settled, which includes
// deferred: deferring is a decision to postpone, not a decision, and the
// baseline means verified — so a deferred finding must still block the pin.
const isOpen = (entry) => isPending(entry) || entry.status === 'deferred'

/**
 * Counts the walker and the baseline gate both read.
 *
 * @param {object} data - A loaded findings file
 * @returns {{total: number, pending: number, open: number, byVerdict: object, byStatus: object, bucketOpen: boolean, allRuled: boolean}}
 */
export const countFindings = (data) => {
  const tally = (key) =>
    Object.fromEntries(
      data.findings.reduce((counts, finding) => {
        counts.set(finding[key], (counts.get(finding[key]) ?? 0) + 1)
        return counts
      }, new Map())
    )
  const open = data.findings.filter(isOpen).length
  const bucketOpen =
    data.noActionBucket.capabilities > 0 && isOpen(data.noActionBucket)
  return {
    total: data.findings.length,
    pending: data.findings.filter(isPending).length,
    open,
    byVerdict: tally('verdict'),
    byStatus: tally('status'),
    bucketOpen,
    allRuled: open === 0 && !bucketOpen
  }
}

/**
 * The findings to walk, in the order a person should see them: the
 * mechanical ones first, then the two that change the spec.
 *
 * @param {object} data - A loaded findings file
 * @param {boolean} [pendingOnly]
 * @returns {object[]}
 */
export const listFindings = (data, pendingOnly = false) => {
  const rank = (finding) => VERDICTS.indexOf(finding.verdict)
  return data.findings
    .filter((finding) => !pendingOnly || isPending(finding))
    .toSorted(
      (left, right) => rank(left) - rank(right) || (left.id < right.id ? -1 : 1)
    )
}

const dispositionLine = (entry) =>
  entry.disposition ? `${entry.disposition} — ${entry.status}` : 'not yet ruled'

const findingSection = (finding) =>
  [
    `### ${finding.capability}${finding.anchor ? ` — ${finding.anchor}` : ''}`,
    '',
    finding.judgement,
    '',
    `- **id** ${finding.id}`,
    `- **ruling** ${dispositionLine(finding)}`,
    ...(finding.note ? [`- **note** ${finding.note}`] : []),
    ...(finding.evidence.test ? [`- **test** ${finding.evidence.test}`] : []),
    ...(finding.evidence.source
      ? [`- **source** ${finding.evidence.source}`]
      : []),
    ...(finding.evidence.commit
      ? [`- **commit** ${finding.evidence.commit}`]
      : []),
    ...(finding.proposal
      ? [
          '',
          `Proposed for \`${finding.proposal.file}\`:`,
          '',
          '```diff',
          finding.proposal.diff.trimEnd(),
          '```'
        ]
      : []),
    ''
  ].join('\n')

const verdictBlock = (data, verdict) => {
  const matching = data.findings.filter(
    (finding) => finding.verdict === verdict
  )
  if (verdict === 'no-action') {
    return [
      `## ${VERDICT_LABELS[verdict]} (${data.noActionBucket.capabilities} capabilities)`,
      '',
      `Ruled as one batch: ${dispositionLine(data.noActionBucket)}.`,
      '',
      'Copy, layout or refactor only. Accepting this bucket accepts the judge',
      'wholesale for these capabilities — no one read them individually.',
      ''
    ].join('\n')
  }
  return [
    `## ${VERDICT_LABELS[verdict]} (${matching.length})`,
    '',
    ...(matching.length === 0 ? ['None.', ''] : matching.map(findingSection))
  ].join('\n')
}

/**
 * Renders report.md from findings.json, so the prose is never the state.
 *
 * @param {object} data - A loaded findings file
 * @returns {string}
 */
export const renderReport = (data) => {
  const counts = countFindings(data)
  return [
    `# Spec catch-up — ${data.date}`,
    '',
    `Baseline ${data.baseline.verifiedAt} (${data.baseline.verifiedBy}).`,
    `${counts.total} findings, ${counts.open} still open.`,
    '',
    'Generated from findings.json — edit the findings, not this file.',
    '',
    ...VERDICTS.map((verdict) => verdictBlock(data, verdict)),
    '## Next',
    '',
    counts.allRuled
      ? 'Every finding is ruled. The baseline can be advanced:\n\n```bash\ntim spec baseline --advance --require-ruled\n```'
      : `${counts.open} finding(s) still open${counts.bucketOpen ? ', and the NO ACTION bucket' : ''}. Walk them before advancing the baseline.`,
    ''
  ].join('\n')
}

/**
 * @param {string} runDir
 * @returns {string} The path written
 */
export const writeReport = (runDir) => {
  const path = join(runDir, REPORT_FILE)
  writeFileSync(path, renderReport(loadFindings(runDir)))
  return path
}
