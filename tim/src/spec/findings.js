import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync
} from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../errors.js'

export const FINDINGS_FILE = 'findings.json'
export const REPORT_FILE = 'report.md'
const RUN_DATE = /^\d{4}-\d{2}-\d{2}$/

export const DISPOSITIONS = ['accept', 'reject', 'edit', 'defer']

/**
 * Per-skill run layout and verdict vocabulary. Catch-up writes the
 * Behaviour Spec; cover writes tests. Same walker machinery for both.
 */
export const SKILLS = {
  catchup: {
    id: 'catchup',
    runsDir: join('workareas', 'spec-catchup'),
    title: 'Spec catch-up',
    runFirstHint: 'Run spec-catchup first',
    verdicts: ['stale-link', 'spec-wrong', 'spec-gap', 'no-action'],
    verdictLabels: {
      'stale-link': 'STALE LINK',
      'spec-wrong': 'SPEC WRONG',
      'spec-gap': 'SPEC GAP',
      'no-action': 'NO ACTION'
    },
    hasNoActionBucket: true,
    advancesBaseline: true
  },
  cover: {
    id: 'cover',
    runsDir: join('workareas', 'spec-cover'),
    title: 'Spec cover',
    runFirstHint: 'Run spec-cover first',
    verdicts: ['write-test', 'strengthen', 'accept-gap'],
    verdictLabels: {
      'write-test': 'WRITE TEST',
      strengthen: 'STRENGTHEN',
      'accept-gap': 'ACCEPT GAP'
    },
    hasNoActionBucket: false,
    advancesBaseline: false
  }
}

export const DEFAULT_SKILL = 'catchup'

// Keep the catchup alias so existing imports of VERDICTS keep working.
export const VERDICTS = SKILLS.catchup.verdicts

const STATUS_FOR = {
  reject: 'rejected',
  defer: 'deferred',
  accept: 'accepted',
  edit: 'accepted'
}

/**
 * @param {string} [skillId]
 * @returns {typeof SKILLS.catchup}
 */
export const skillConfig = (skillId = DEFAULT_SKILL) => {
  const config = SKILLS[skillId]
  if (!config) {
    throw new TimError(
      'USAGE',
      `Unknown skill "${skillId}". Use one of: ${Object.keys(SKILLS).join(', ')}.`
    )
  }
  return config
}

const findingSchemaFor = (config) =>
  z.object({
    id: z.string().regex(/^F-\d{3}$/, 'A finding id looks like F-001.'),
    verdict: z.enum(config.verdicts),
    capability: z.string().min(1),
    anchor: z.string().min(1).nullable().default(null),
    judgement: z.string().min(1, 'Every finding needs its one-sentence call.'),
    evidence: z
      .object({
        test: z.string().optional(),
        source: z.string().optional(),
        commit: z.string().optional(),
        notes: z.string().optional()
      })
      .default({}),
    proposal: z
      .object({
        file: z.string().min(1),
        diff: z.string().min(1),
        repo: z.string().optional(),
        type: z.enum(['e2e', 'fit', 'unit']).optional(),
        coverageFile: z.string().optional(),
        coverageDiff: z.string().optional()
      })
      .nullable()
      .default(null),
    disposition: z.enum(DISPOSITIONS).nullable().default(null),
    status: z
      .enum(['pending', 'accepted', 'applied', 'rejected', 'deferred'])
      .default('pending'),
    note: z.string().nullable().default(null)
  })

const findingsFileSchemaFor = (config) =>
  z.object({
    skill: z.literal(config.id).default(config.id),
    date: z.string().regex(RUN_DATE, 'A run date looks like 2026-09-24.'),
    baseline: z.object({
      verifiedAt: z.string().min(1),
      verifiedBy: z.string().min(1)
    }),
    findings: z.array(findingSchemaFor(config)),
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
 * Absolute path to a skill's runs directory.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.skill]
 * @returns {string}
 */
export const runsDirFor = ({ workspaceRoot, skill = DEFAULT_SKILL }) =>
  join(workspaceRoot, skillConfig(skill).runsDir)

/**
 * The run to act on: the one named, or the most recent by date.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.skill]
 * @param {string} [args.run] - A run date, e.g. 2026-09-24
 * @returns {string} Absolute path to the run directory
 */
export const resolveRun = ({ workspaceRoot, skill = DEFAULT_SKILL, run }) => {
  const config = skillConfig(skill)
  const runsDir = join(workspaceRoot, config.runsDir)
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
      `Can't find a ${config.id} run with a ${FINDINGS_FILE}. ${config.runFirstHint}, or name a run with --run.`
    )
  }
  return join(runsDir, dates.at(-1))
}

/**
 * Create (or overwrite) a run directory with findings.json and report.md.
 * Refuses to overwrite a run that already has rulings, unless `force`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.skill]
 * @param {string} args.date - YYYY-MM-DD
 * @param {{verifiedAt: string, verifiedBy: string}} args.baseline
 * @param {object[]} args.findings
 * @param {{capabilities: number}} [args.noActionBucket]
 * @param {boolean} [args.force] - Overwrite even when the existing run has rulings
 * @returns {{runDir: string, data: object, reportPath: string}}
 */
export const createRun = ({
  workspaceRoot,
  skill = DEFAULT_SKILL,
  date,
  baseline,
  findings,
  noActionBucket,
  force = false
}) => {
  const config = skillConfig(skill)
  if (!RUN_DATE.test(date)) {
    throw new TimError('USAGE', 'A run date looks like 2026-09-24.')
  }
  const runDir = join(workspaceRoot, config.runsDir, date)
  const existingPath = join(runDir, FINDINGS_FILE)
  if (existsSync(existingPath) && !force) {
    const existing = loadFindings(runDir, skill)
    const hasRulings =
      existing.findings.some((finding) => finding.disposition !== null) ||
      existing.noActionBucket.disposition !== null
    if (hasRulings) {
      throw new TimError(
        'USAGE',
        `Run ${date} already has rulings. Pass --force to overwrite, or pick another --date.`
      )
    }
  }
  mkdirSync(runDir, { recursive: true })
  const raw = {
    skill: config.id,
    date,
    baseline,
    findings,
    noActionBucket: noActionBucket ?? {
      capabilities: 0,
      disposition: null,
      status: 'pending'
    }
  }
  const schema = findingsFileSchemaFor(config)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    throw new TimError(
      'USAGE',
      `Can't seed findings: ${issue.path.join('.')} ${issue.message}`
    )
  }
  const ids = parsed.data.findings.map((finding) => finding.id)
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
  if (duplicate) {
    throw new TimError('USAGE', `Finding id ${duplicate} is used twice.`)
  }
  saveFindings(runDir, parsed.data)
  const reportPath = writeReport(runDir, skill)
  return { runDir, data: parsed.data, reportPath }
}

/**
 * @param {string} runDir
 * @param {string} [skill]
 * @returns {object}
 */
export const loadFindings = (runDir, skill = DEFAULT_SKILL) => {
  const config = skillConfig(skill)
  const path = join(runDir, FINDINGS_FILE)
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `Can't read ${path}: ${error.message}`, error)
  }
  // Prefer the skill recorded in the file when present.
  const effective = raw.skill ? skillConfig(raw.skill) : config
  const result = findingsFileSchemaFor(effective).safeParse({
    ...raw,
    skill: effective.id
  })
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
 * @param {object} args
 * @param {string} args.runDir
 * @param {string} args.id
 * @param {string} args.disposition
 * @param {string} [args.note]
 * @param {string} [args.skill]
 * @returns {object}
 */
export const ruleFinding = ({
  runDir,
  id,
  disposition,
  note,
  skill = DEFAULT_SKILL
}) => {
  const data = loadFindings(runDir, skill)
  const finding = findById(data, id)
  finding.disposition = disposition
  finding.status = STATUS_FOR[disposition]
  if (note !== undefined) finding.note = note
  saveFindings(runDir, data)
  return finding
}

/**
 * @param {object} args
 * @param {string} args.runDir
 * @param {string} args.id
 * @param {string} [args.skill]
 * @returns {object}
 */
export const markApplied = ({ runDir, id, skill = DEFAULT_SKILL }) => {
  const data = loadFindings(runDir, skill)
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
 * @param {object} args
 * @param {string} args.runDir
 * @param {string} args.disposition
 * @param {string} [args.skill]
 * @returns {object}
 */
export const ruleBucket = ({
  runDir,
  disposition,
  skill = DEFAULT_SKILL
}) => {
  const data = loadFindings(runDir, skill)
  data.noActionBucket.disposition = disposition
  data.noActionBucket.status = STATUS_FOR[disposition]
  saveFindings(runDir, data)
  return data.noActionBucket
}

const isPending = (entry) => entry.status === 'pending'

// Two different questions, and conflating them would make the baseline gate
// wrong. "Pending" is never-looked-at. "Open" is not-settled, which includes
// deferred: deferring is a decision to postpone, not a decision that the
// baseline can treat as verified — so a deferred finding must still block.
const isOpen = (entry) => isPending(entry) || entry.status === 'deferred'

/**
 * @param {object} data
 * @returns {object}
 */
export const countFindings = (data) => {
  const config = skillConfig(data.skill ?? DEFAULT_SKILL)
  const tally = (key) =>
    Object.fromEntries(
      data.findings.reduce((counts, finding) => {
        counts.set(finding[key], (counts.get(finding[key]) ?? 0) + 1)
        return counts
      }, new Map())
    )
  const open = data.findings.filter(isOpen).length
  const bucketOpen =
    config.hasNoActionBucket &&
    data.noActionBucket.capabilities > 0 &&
    isOpen(data.noActionBucket)
  // Accepted-but-not-applied still blocks baseline advance for catch-up:
  // "ruled" means settled and applied where accept/edit said yes.
  const unapplied = data.findings.filter(
    (finding) => finding.status === 'accepted'
  ).length
  return {
    total: data.findings.length,
    pending: data.findings.filter(isPending).length,
    open,
    unapplied,
    byVerdict: tally('verdict'),
    byStatus: tally('status'),
    bucketOpen,
    allRuled: open === 0 && !bucketOpen && unapplied === 0
  }
}

/**
 * @param {object} data
 * @param {boolean} [pendingOnly]
 * @returns {object[]}
 */
export const listFindings = (data, pendingOnly = false) => {
  const config = skillConfig(data.skill ?? DEFAULT_SKILL)
  const rank = (finding) => config.verdicts.indexOf(finding.verdict)
  return data.findings
    .filter((finding) => !pendingOnly || isPending(finding))
    .toSorted(
      (left, right) => rank(left) - rank(right) || (left.id < right.id ? -1 : 1)
    )
}

/**
 * Whether the most recent catch-up run has every finding settled and
 * applied. Used by `tim spec baseline --advance --require-ruled`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.skill]
 * @param {string} [args.run]
 * @returns {{ok: true, runDir: string, counts: object} | never}
 */
export const assertRunRuled = ({
  workspaceRoot,
  skill = DEFAULT_SKILL,
  run
}) => {
  const config = skillConfig(skill)
  if (!config.advancesBaseline) {
    throw new TimError(
      'USAGE',
      `${config.id} does not advance the baseline — only catch-up does.`
    )
  }
  const runDir = resolveRun({ workspaceRoot, skill, run })
  const counts = countFindings(loadFindings(runDir, skill))
  if (!counts.allRuled) {
    const parts = []
    if (counts.open > 0) parts.push(`${counts.open} still open`)
    if (counts.unapplied > 0) {
      parts.push(`${counts.unapplied} accepted but not yet applied`)
    }
    if (counts.bucketOpen) parts.push('the NO ACTION bucket is not ruled')
    throw new TimError(
      'USAGE',
      `Can't advance the baseline yet: ${parts.join('; ')}. Walk the ${config.id} run first.`
    )
  }
  return { ok: true, runDir, counts }
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
    ...(finding.evidence.notes
      ? [`- **gap notes** ${finding.evidence.notes}`]
      : []),
    ...(finding.proposal
      ? [
          '',
          `Proposed for \`${finding.proposal.file}\`${finding.proposal.repo ? ` (${finding.proposal.repo})` : ''}:`,
          '',
          '```diff',
          finding.proposal.diff.trimEnd(),
          '```',
          ...(finding.proposal.coverageDiff
            ? [
                '',
                `Coverage for \`${finding.proposal.coverageFile ?? 'coverage.json'}\`:`,
                '',
                '```diff',
                finding.proposal.coverageDiff.trimEnd(),
                '```'
              ]
            : [])
        ]
      : []),
    ''
  ].join('\n')

const verdictBlock = (data, verdict, config) => {
  const matching = data.findings.filter(
    (finding) => finding.verdict === verdict
  )
  if (verdict === 'no-action' && config.hasNoActionBucket) {
    return [
      `## ${config.verdictLabels[verdict]} (${data.noActionBucket.capabilities} capabilities)`,
      '',
      `Ruled as one batch: ${dispositionLine(data.noActionBucket)}.`,
      '',
      'Copy, layout or refactor only. Accepting this bucket accepts the judge',
      'wholesale for these capabilities — no one read them individually.',
      ''
    ].join('\n')
  }
  return [
    `## ${config.verdictLabels[verdict]} (${matching.length})`,
    '',
    ...(matching.length === 0 ? ['None.', ''] : matching.map(findingSection))
  ].join('\n')
}

/**
 * @param {object} data
 * @returns {string}
 */
export const renderReport = (data) => {
  const config = skillConfig(data.skill ?? DEFAULT_SKILL)
  const counts = countFindings(data)
  const next = (() => {
    if (!counts.allRuled) {
      return `${counts.open} finding(s) still open${counts.unapplied ? `, ${counts.unapplied} accepted but not applied` : ''}${counts.bucketOpen ? ', and the NO ACTION bucket' : ''}. Walk them before finishing this run.`
    }
    if (config.advancesBaseline) {
      return 'Every finding is ruled and applied. The baseline can be advanced:\n\n```bash\ntim spec baseline --advance --require-ruled\n```'
    }
    return 'Every finding is ruled and applied. Coverage links updated — the baseline stays put (only catch-up advances it).'
  })()

  return [
    `# ${config.title} — ${data.date}`,
    '',
    `Baseline ${data.baseline.verifiedAt} (${data.baseline.verifiedBy}).`,
    `${counts.total} findings, ${counts.open} still open${counts.unapplied ? `, ${counts.unapplied} awaiting apply` : ''}.`,
    '',
    'Generated from findings.json — edit the findings, not this file.',
    '',
    ...config.verdicts.map((verdict) => verdictBlock(data, verdict, config)),
    '## Next',
    '',
    next,
    ''
  ].join('\n')
}

/**
 * @param {string} runDir
 * @param {string} [skill]
 * @returns {string}
 */
export const writeReport = (runDir, skill = DEFAULT_SKILL) => {
  const path = join(runDir, REPORT_FILE)
  writeFileSync(path, renderReport(loadFindings(runDir, skill)))
  return path
}
