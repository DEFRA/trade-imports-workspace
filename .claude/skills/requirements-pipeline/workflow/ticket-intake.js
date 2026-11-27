export const meta = {
  name: 'ticket-intake',
  description:
    'The requirements-pipeline TICKET intake, whole: read the work list from tim distil status and save the backlog as it stands → one reader reads the fetched ticket and the code it touches, writes an investigation, an intake record and the combined backlog, and gives the ticket a readiness verdict → check the backlog against the record → a different agent tries to refute every row, split, statement and question → the reader fixes once → check again → return the rows to build, the verdict, the questions and any escalation',
  whenToUse:
    'After tim backlog from-ticket has fetched a ticket into <workarea> and written its sources.json. Launch by scriptPath with args; every key is required and a missing one stops the run before any agent starts. To rerun with a ruling added, add the ruling to sources.json and launch again: only rows still to build are rewritten and every row id is kept. The run returns the rows to build, the readiness verdict and the questions, or an escalation reason and no rows when the ticket is not for this intake to build.',
  phases: [
    { title: 'Status' },
    { title: 'Read' },
    { title: 'Check' },
    { title: 'Refute' },
    { title: 'Fix' },
    { title: 'Check again' }
  ]
}

// >>> args-contract: byte-identical in every workflow script (.claude/workflows/*.js, .claude/skills/*/workflow/*.js), checked by tim/src/backlog/workflow-contract.test.js
const parseArgs = (workflowName, rawArgs) => {
  if (typeof rawArgs !== 'string') return rawArgs
  try {
    return JSON.parse(rawArgs)
  } catch (error) {
    throw new Error(`${workflowName}: args arrived as a string that is not JSON (${error.message})`)
  }
}

const missingKeys = (config, keys) =>
  keys.filter((key) => config === null || typeof config !== 'object' || Array.isArray(config) || config[key] === undefined)

const requireKeys = (workflowName, config, keys) => {
  const missing = missingKeys(config, keys)
  if (missing.length === 0) return
  const noun = missing.length === 1 ? 'key' : 'keys'
  throw new Error(`${workflowName}: args is missing required ${noun} ${missing.join(', ')}. Pass every one in args: this workflow has no defaults`)
}

const logResolvedConfig = (workflowName, config) => log(`${workflowName}: resolved configuration ${JSON.stringify(config)}`)
// <<< args-contract

const WORKFLOW_NAME = 'ticket-intake'
const REQUIRED_KEYS = ['workspace', 'workarea', 'tim', 'models']
const CFG = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, CFG, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, CFG)

const refuse = (message) => {
  throw new Error(`${WORKFLOW_NAME}: ${message}`)
}
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

if (!isText(CFG.workspace) || !CFG.workspace.startsWith('~/')) {
  refuse(
    `config.workspace must be the workspace root as a tilde path, such as "~/git/defra/trade-imports-workspace". A /Users/... path is denied in Bash. Got ${JSON.stringify(CFG.workspace)}`
  )
}
const TILDE = CFG.workspace.replace(/\/+$/, '')

const WORKAREA_PATTERN = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/
const WORKAREA = isText(CFG.workarea) ? CFG.workarea.trim().replace(/^\/+|\/+$/g, '') : ''
if (!WORKAREA_PATTERN.test(WORKAREA) || WORKAREA.split('/').includes('..')) {
  refuse(
    `config.workarea must be a folder under workareas/, such as "shared/<ticket-slug>". Got ${JSON.stringify(CFG.workarea)}`
  )
}

if (!isText(CFG.tim)) {
  refuse(`config.tim must be the command agents run tim with, normally "tim". Got ${JSON.stringify(CFG.tim)}`)
}
const TIM = CFG.tim.trim()

const MODEL_DEFAULTS = { think: 'opus', light: 'haiku' }

// >>> model-tiers: byte-identical in distil.js and ticket-intake.js, checked by tim/src/backlog/workflow-contract.test.js
const MODEL_TIERS = Object.keys(MODEL_DEFAULTS)
const KNOWN_MODEL_ALIASES = ['opus', 'sonnet', 'haiku']

const RAW_MODELS = CFG.models
if (!isPlainObject(RAW_MODELS)) {
  refuse(`config.models must be an object, {} for the default on every tier. Got ${JSON.stringify(RAW_MODELS)}`)
}
const unknownTiers = Object.keys(RAW_MODELS).filter((tier) => !MODEL_TIERS.includes(tier))
if (unknownTiers.length > 0) {
  refuse(`config.models has no tier named ${unknownTiers.join(', ')}. The tiers are ${MODEL_TIERS.join(', ')}`)
}
for (const tier of MODEL_TIERS) {
  const value = RAW_MODELS[tier]
  if (value === undefined || value === 'inherit' || KNOWN_MODEL_ALIASES.includes(value)) continue
  refuse(
    `config.models.${tier} must be one of ${KNOWN_MODEL_ALIASES.join(', ')}, or "inherit" for the session model. Got ${JSON.stringify(value)}`
  )
}

const RESOLVED_MODELS = Object.fromEntries(
  MODEL_TIERS.map((tier) => {
    const given = RAW_MODELS[tier] ?? MODEL_DEFAULTS[tier]
    return [tier, given === 'inherit' ? null : given]
  })
)

log(
  `${WORKFLOW_NAME}: models: ${MODEL_TIERS.map((tier) => `${tier} ${RESOLVED_MODELS[tier] ?? 'inherit (session model)'}`).join(', ')}`
)

const withTier = (tier) => (opts) => ({
  ...opts,
  ...(RESOLVED_MODELS[tier] ? { model: RESOLVED_MODELS[tier] } : {})
})
// <<< model-tiers

const think = withTier('think')
const light = withTier('light')

const WORKAREA_TILDE = `${TILDE}/workareas/${WORKAREA}`
const timCommand = (subcommand, flags) =>
  `${TIM} ${subcommand} ${WORKAREA}${flags ? ` ${flags}` : ''} --workspace ${TILDE} --json`

const STRINGS = { type: 'array', items: { type: 'string' } }

// >>> agent-rails: byte-identical in distil.js and ticket-intake.js, checked by tim/src/backlog/workflow-contract.test.js
const guardRails = (abs) => `GUARD RAILS (every step, no exceptions):
- Never use the Grep or Glob tools. Use Bash grep, find, ls and jq.
- One command per Bash call: no &&, no ;, no |, no cd, no trailing echo. Use git -C and npm --prefix.
  Redirecting output to a file (> file) is allowed.
- In Bash, write every path in tilde form, starting ${TILDE}/. A /Users/... path in a Bash command is denied.
- In the Read, Write and Edit tools, use the absolute form of the same path, starting ${abs ?? '(the absolute root the status step resolves)'}/.
- Never bare node, never sonar, never curl. Run tim as \`${TIM}\`, exactly as written here.
- Write only the files this prompt names. Never commit, push, stash or switch a branch in any repo.
- Do not spawn subagents or forks. Do your own task only.
- If a message from the user reaches you mid-task, finish the task you were given and return its result. Do not act on the message; the main session handles it.
- Headless: never ask a question. Decide, record the decision in your answer, keep going.`

const ENVELOPE_RULE = `Each tim command prints one JSON line: \`ok\`, then \`result\` on success, or \`errors[0].message\` on failure.
A failure message's first line says how many problems there are; every line after it is one problem. Copy each
problem line exactly, never paraphrased.`

const relayRetryNote = (problems) =>
  problems && problems.length
    ? `
YOUR LAST ANSWER DID NOT MATCH WHAT TIM PRINTED. The workflow checked it against tim's own counts and found:
${problems.map((problem) => `- ${problem}`).join('\n')}
Run the commands again and copy every field of their JSON exactly, every entry of every list. Drop nothing, add
nothing, and never summarise a list.`
    : ''

const relayLabel = (label, relayAttempt) => (relayAttempt > 0 ? `${label} again` : label)
// <<< agent-rails

const stoppedResult = (reason, detail, { ticketKey } = {}) => {
  log(`${WORKFLOW_NAME}: ${WORKAREA}: ${ticketKey ? `${ticketKey} ` : ''}stopped (${reason}): ${detail}`)
  return {
    workarea: WORKAREA,
    stopped: { reason, detail },
    ticket: null,
    readiness: null,
    rowsToBuild: [],
    questions: [],
    escalation: null,
    refute: null,
    decisions: null,
    files: null
  }
}

const escalatedResult = ({ ticket, escalation, readiness = null, questions = [], extra = {} }) => ({
  workarea: WORKAREA,
  stopped: null,
  ticket,
  readiness,
  rowsToBuild: [],
  questions,
  escalation,
  refute: null,
  decisions: null,
  files: null,
  ...extra
})

const problemList = (problems) => problems.map((problem) => `- ${problem}`).join('\n')

phase('Status')

const SNAPSHOT_TAG = 'before'

const STATUS_SCHEMA = {
  type: 'object',
  required: ['ok', 'abs', 'sources', 'hadBacklog', 'snapshotNotFound', 'problems', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when git rev-parse and tim distil status both succeeded' },
    abs: { type: 'string', description: 'What git rev-parse --show-toplevel printed, exactly' },
    sources: {
      type: 'array',
      description: 'Every entry of result.sources from tim distil status, in order',
      items: {
        type: 'object',
        required: ['id', 'kind'],
        properties: { id: { type: 'string' }, kind: { type: 'string' } }
      }
    },
    hadBacklog: { type: 'boolean', description: 'true when tim distil backlog-snapshot exited 0: a backlog already exists' },
    snapshotNotFound: { type: 'boolean', description: 'true when the snapshot failed with the code NOT_FOUND: there is no backlog yet' },
    problems: { ...STRINGS, description: 'On a failure, every problem line of the command that failed' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const status = await agent(
  `You are the STATUS step of the TICKET INTAKE workflow for the workarea ${WORKAREA}. Run three commands and report what they print.
${guardRails(null)}
1. \`git -C ${TILDE} rev-parse --show-toplevel\`. Report what it printed as \`abs\`, exactly.
2. \`${timCommand('distil status')}\`.
${ENVELOPE_RULE}
   On success: copy the id and kind of every entry of \`result.sources\` in order into sources.
   On failure: ok is false, and problems holds every problem line.
3. \`${timCommand('distil backlog-snapshot', `--save ${SNAPSHOT_TAG}`)}\`. Run it whatever step 2 printed.
   On success: hadBacklog is true.
   On failure with the error code NOT_FOUND: hadBacklog is false and snapshotNotFound is true. That means there is no backlog yet.
   On any other failure: hadBacklog is false, snapshotNotFound is false, and problems holds every problem line.
ok is true only when step 1 and step 2 succeeded. Change nothing. Return the structured output only.`,
  light({ label: 'status', phase: 'Status', schema: STATUS_SCHEMA })
)

if (!status || !status.ok) {
  return stoppedResult(
    'status-failed',
    status
      ? `tim distil status failed: ${status.problems.join(' ') || status.summary}`
      : 'the status agent returned nothing'
  )
}
if (!isText(status.abs) || !status.abs.startsWith('/')) {
  return stoppedResult('status-failed', `the status agent reported the workspace root as ${JSON.stringify(status.abs)}, which is not an absolute path`)
}
if (!status.hadBacklog && !status.snapshotNotFound) {
  return stoppedResult(
    'snapshot-failed',
    `tim distil backlog-snapshot could not save the backlog as it stands: ${status.problems.join(' ') || status.summary}`
  )
}

const ABS = status.abs.trim().replace(/\/+$/, '')
const RAILS = guardRails(ABS)
const WORKAREA_ABS = `${ABS}/workareas/${WORKAREA}`
const SKILL_ABS = `${ABS}/.claude/skills/requirements-pipeline`
const BRIEFS_ABS = `${SKILL_ABS}/workflow/intake/briefs`
const REFERENCES_ABS = `${SKILL_ABS}/references`
const HAD_BACKLOG = status.hadBacklog

const INTAKE_FILES = {
  investigation: `${WORKAREA_ABS}/investigation.md`,
  intake: `${WORKAREA_ABS}/intake.json`,
  backlog: `${WORKAREA_ABS}/backlog.json`
}

const ticketSources = status.sources.filter((source) => source.kind === 'ticket')
if (ticketSources.length !== 1) {
  return stoppedResult(
    'ticket-source',
    `${WORKAREA}/sources.json must hold exactly one ticket source. It holds ${ticketSources.length}: ${status.sources.map((source) => `${source.id} (${source.kind})`).join(', ') || 'no sources'}`
  )
}

const TICKET_SOURCE_ID = ticketSources[0].id
const TICKET_KEY = TICKET_SOURCE_ID.replace(/^ticket:/, '')
const TICKET_FILE_ABS = `${WORKAREA_ABS}/sources/ticket-${TICKET_KEY.toLowerCase()}.md`
const FETCH_RECORD_ABS = `${WORKAREA_ABS}/sources/ticket-${TICKET_KEY.toLowerCase()}.json`

const SOURCE_KINDS_THE_INTAKE_READS = ['ticket', 'repo', 'ruling']
const otherSources = status.sources.filter((source) => !SOURCE_KINDS_THE_INTAKE_READS.includes(source.kind))
if (otherSources.length > 0) {
  const escalation = {
    signals: ['another requirement source'],
    reason: `${TICKET_KEY} points at other requirement sources with their own criteria: ${otherSources.map((source) => `${source.id} (${source.kind})`).join(', ')}. DISTIL takes the ticket over.`
  }
  log(`${WORKFLOW_NAME}: ${WORKAREA}: ${TICKET_KEY} escalated (${escalation.signals.join(', ')}): ${escalation.reason}`)
  return escalatedResult({ ticket: TICKET_KEY, escalation })
}

phase('Read')

const DECISIONS_SCHEMA = {
  type: 'object',
  required: ['ok', 'decisions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim backlog check passes' },
    decisions: { ...STRINGS, description: 'Every judgement you made, one line each: why a row was combined, why a statement is not built, why a question stands' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const rerunNote = HAD_BACKLOG
  ? `
THIS IS A RERUN. ${INTAKE_FILES.backlog} and ${INTAKE_FILES.intake} already exist. Follow "On a rerun" in read.md: rewrite only rows still to build and keep every row id.`
  : ''

const filesYouWrite = `THE FILES YOU WRITE, and nothing else:
- ${INTAKE_FILES.investigation}
- ${INTAKE_FILES.intake}
- ${INTAKE_FILES.backlog}`

const readFirst = `READ FIRST, in full: ${BRIEFS_ABS}/read.md, ${REFERENCES_ABS}/backlog.schema.json, ${REFERENCES_ABS}/intake.schema.json and ${REFERENCES_ABS}/SHAPE.md.
THE TICKET: ${TICKET_FILE_ABS}, with the attachments beside it. The fetch record is ${FETCH_RECORD_ABS}: copy ticket, updated and branch from it.
THE SOURCES: ${WORKAREA_ABS}/sources.json.`

const readPrompt = `You are the READER of the TICKET INTAKE workflow for the workarea ${WORKAREA}, ticket ${TICKET_KEY}.
${RAILS}
${readFirst}
${filesYouWrite}${rerunNote}
CHECKS, both until they pass:
- \`${timCommand('backlog check')}\`
- \`${timCommand('backlog combine-candidates')}\`: merge what it lists unless a reason in read.md keeps the pair apart.
Return the structured output only.`

const read = await agent(readPrompt, think({ label: 'read', phase: 'Read', schema: DECISIONS_SCHEMA }))
if (!read) return stoppedResult('read-failed', 'the reader returned nothing', { ticketKey: TICKET_KEY })

const QUESTION_SCHEMA = {
  type: 'object',
  required: ['id', 'question', 'readings', 'default', 'holdsLaunch'],
  properties: {
    id: { type: 'string' },
    question: { type: 'string' },
    readings: STRINGS,
    default: { type: 'string' },
    holdsLaunch: { type: 'boolean' },
    cause: { type: 'string' }
  }
}

const INTAKE_SUMMARY_SCHEMA = {
  type: ['object', 'null'],
  description: 'result.intake from tim backlog check, exactly. null when the check failed or it has none',
  required: ['ticket', 'readiness', 'statementIds', 'statementCount', 'notBuiltStatementIds', 'questions', 'questionCount', 'escalation', 'rowsToBuild', 'rowsToBuildCount'],
  properties: {
    ticket: { type: 'string' },
    readiness: { type: 'string' },
    statementIds: STRINGS,
    statementCount: { type: 'integer', description: 'result.intake.statementCount' },
    notBuiltStatementIds: STRINGS,
    questions: { type: 'array', description: 'Every entry of result.intake.questions, exactly', items: QUESTION_SCHEMA },
    questionCount: { type: 'integer', description: 'result.intake.questionCount, copied as tim prints it' },
    escalation: {
      type: ['object', 'null'],
      description: 'result.intake.escalation, exactly. null when it is null',
      properties: { signals: STRINGS, reason: { type: 'string' } }
    },
    rowsToBuild: { ...STRINGS, description: 'result.intake.rowsToBuild, exactly' },
    rowsToBuildCount: { type: 'integer', description: 'result.intake.rowsToBuildCount' }
  }
}

const CHECK_SCHEMA = {
  type: 'object',
  required: ['checkOk', 'checkProblems', 'intake', 'candidatesOk', 'candidatesProblems', 'candidateCount', 'candidates', 'snapshotOk', 'snapshotProblems', 'removed', 'changed', 'investigationFound', 'summary'],
  properties: {
    checkOk: { type: 'boolean', description: 'true when tim backlog check exited 0' },
    checkProblems: { ...STRINGS, description: 'On a failed check, every problem line' },
    intake: INTAKE_SUMMARY_SCHEMA,
    candidatesOk: { type: 'boolean', description: 'true when tim backlog combine-candidates exited 0' },
    candidatesProblems: { ...STRINGS, description: 'On a failure, every problem line' },
    candidateCount: { type: 'integer', description: 'How many entries result.candidates has' },
    candidates: {
      type: 'array',
      description: 'Every entry of result.candidates from tim backlog combine-candidates, exactly',
      items: {
        type: 'object',
        required: ['rows', 'reason'],
        properties: { rows: STRINGS, reason: { type: 'string' } }
      }
    },
    snapshotOk: { type: 'boolean', description: 'true when the compare exited 0. true when there was no compare to run' },
    snapshotProblems: { ...STRINGS, description: 'On a failed compare, every problem line' },
    removed: { ...STRINGS, description: 'result.compared.removed from the compare, exactly. [] with no compare' },
    changed: { ...STRINGS, description: 'result.compared.changed from the compare, exactly. [] with no compare' },
    investigationFound: { type: 'boolean', description: 'true when investigation.md is listed in the workarea' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const compareStep = HAD_BACKLOG
  ? `
3. \`${timCommand('distil backlog-snapshot', `--compare-to ${SNAPSHOT_TAG}`)}\`
   On success: snapshotOk is true; copy result.compared.removed and result.compared.changed into removed and changed, exactly.
   On failure: snapshotOk is false, and snapshotProblems holds every problem line.`
  : `
3. There is no backlog from before this run to compare with: snapshotOk is true, and removed and changed are [].`

const checkPrompt = (relayProblems) => `You are a CHECK step of the TICKET INTAKE workflow for the workarea ${WORKAREA}. Run commands and report what they print.
Run every step, whatever an earlier one printed.
${RAILS}
1. \`${timCommand('backlog check')}\`
${ENVELOPE_RULE}
   On success: checkOk is true; copy result.intake into intake, exactly, every field and every entry of every list. Where result has no intake, intake is null.
   On failure: checkOk is false, intake is null, and checkProblems holds every problem line.
2. \`${timCommand('backlog combine-candidates')}\`
   On success: candidatesOk is true; copy result.candidates into candidates, exactly, every entry, and write how many it has as candidateCount.
   On failure: candidatesOk is false, candidates is [], and candidatesProblems holds every problem line.${compareStep}
4. \`ls ${WORKAREA_TILDE}\`. investigationFound is true when investigation.md is listed.${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`

const relayMismatchesOf = (relay) => {
  const found = relay.intake
  return [
    ...(found && found.statementIds.length !== found.statementCount
      ? [`the check relayed ${found.statementIds.length} statement ids, but counted ${found.statementCount}`]
      : []),
    ...(found && found.rowsToBuild.length !== found.rowsToBuildCount
      ? [`the check relayed ${found.rowsToBuild.length} rows to build, but counted ${found.rowsToBuildCount}`]
      : []),
    ...(found && found.questions.length !== found.questionCount
      ? [`the check relayed ${found.questions.length} questions, but counted ${found.questionCount}`]
      : []),
    ...(relay.candidates.length !== relay.candidateCount
      ? [`the check relayed ${relay.candidates.length} candidates, but counted ${relay.candidateCount}`]
      : [])
  ]
}

const NOTHING_BACK = {
  checkOk: false,
  checkProblems: ['the check agent returned nothing'],
  intake: null,
  candidatesOk: true,
  candidatesProblems: [],
  candidateCount: 0,
  candidates: [],
  snapshotOk: true,
  snapshotProblems: [],
  removed: [],
  changed: [],
  investigationFound: true,
  summary: 'nothing came back'
}

const askForCheck = async ({ label, phaseName, relayProblems }) =>
  (await agent(
    checkPrompt(relayProblems),
    light({ label: relayLabel(label, relayProblems ? 1 : 0), phase: phaseName, schema: CHECK_SCHEMA })
  )) ?? NOTHING_BACK

const runCheck = async ({ label, phaseName }) => {
  const first = await askForCheck({ label, phaseName, relayProblems: null })
  const mismatches = relayMismatchesOf(first)
  if (mismatches.length === 0) return first
  log(`${WORKFLOW_NAME}: ${label}: ${mismatches.join('; ')}. Asking again`)
  const again = await askForCheck({ label, phaseName, relayProblems: mismatches })
  const still = relayMismatchesOf(again)
  return still.length === 0 ? again : { ...again, relayMismatches: still }
}

const relayMismatchStop = (relay) =>
  stoppedResult('check-relay-mismatch', `${relay.relayMismatches.join('; ')}, even when asked again`, { ticketKey: TICKET_KEY })

const checkProblemsOf = (relay) => [
  ...(relay.checkOk ? [] : relay.checkProblems.length ? relay.checkProblems : ['tim backlog check did not pass']),
  ...(relay.checkOk && !relay.intake
    ? ['tim backlog check gave no intake summary, so the backlog envelope does not name the ticket']
    : []),
  ...(relay.candidatesOk ? [] : relay.candidatesProblems.length ? relay.candidatesProblems : ['tim backlog combine-candidates did not pass']),
  ...(relay.snapshotOk
    ? []
    : [`tim distil backlog-snapshot could not compare backlog.json with the rows from before: ${relay.snapshotProblems.join(' ') || 'it reported nothing'}`]),
  ...(relay.removed.length ? [`backlog.json no longer has ${relay.removed.join(', ')}. Keep every existing row id.`] : []),
  ...(relay.changed.length ? [`${relay.changed.join(', ')}: a row built or set aside (not todo or blocked) changed. Put each back exactly as it was.`] : []),
  ...(relay.investigationFound ? [] : [`${INTAKE_FILES.investigation} is missing`])
]

phase('Check')
const firstCheck = await runCheck({ label: 'check', phaseName: 'Check' })
if (firstCheck.relayMismatches) return relayMismatchStop(firstCheck)
const FIRST_PROBLEMS = checkProblemsOf(firstCheck)

const returnEscalation = (relay) => {
  const { escalation } = relay.intake
  log(`${WORKFLOW_NAME}: ${WORKAREA}: ${TICKET_KEY} escalated (${escalation.signals.join(', ')}): ${escalation.reason}`)
  return escalatedResult({
    ticket: relay.intake.ticket,
    escalation,
    readiness: relay.intake.readiness,
    questions: relay.intake.questions,
    extra: { files: INTAKE_FILES, decisions: { read: read.decisions, fix: [] } }
  })
}

if (FIRST_PROBLEMS.length === 0 && firstCheck.intake.escalation) return returnEscalation(firstCheck)

const ROW_VERDICTS = ['holds', 'wrong', 'missed']
const SPLIT_VERDICTS = ['holds', 'wrong']
const QUESTION_VERDICTS = ['stands', 'settled', 'drop']
const VERDICTS_BY_KIND = { row: ROW_VERDICTS, split: SPLIT_VERDICTS, statement: ROW_VERDICTS, question: QUESTION_VERDICTS }
const SATISFIED_VERDICTS = ['holds', 'stands']

const REFUTE_SCHEMA = {
  type: 'object',
  required: ['verdicts', 'missed', 'summary'],
  properties: {
    verdicts: {
      type: 'array',
      description: 'One entry for each id the prompt lists, and no other',
      items: {
        type: 'object',
        required: ['kind', 'id', 'verdict', 'finding'],
        properties: {
          kind: { type: 'string', enum: ['row', 'split', 'statement', 'question'] },
          id: { type: 'string' },
          verdict: { type: 'string', enum: [...ROW_VERDICTS, ...QUESTION_VERDICTS] },
          finding: { type: 'string', description: 'What is wrong and what the reader should do. "none" for holds and stands' }
        },
        additionalProperties: false
      }
    },
    missed: { ...STRINGS, description: 'Everything the ticket asks for that no statement or row carries, one plain sentence each. [] when nothing is missed' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const verdictKey = ({ kind, id }) => `${kind}:${id}`

const expectedVerdictsOf = (relay) => {
  const { intake } = relay
  const splitIds = intake.rowsToBuild.length > 1 ? intake.rowsToBuild : []
  return [
    ...intake.rowsToBuild.map((id) => ({ kind: 'row', id })),
    ...splitIds.map((id) => ({ kind: 'split', id })),
    ...intake.statementIds.map((id) => ({ kind: 'statement', id })),
    ...intake.questions.map((question) => ({ kind: 'question', id: question.id }))
  ]
}

const refutePrompt = ({ relay, expected, relayProblems }) => `You are the REFUTING agent of the TICKET INTAKE workflow for the workarea ${WORKAREA}, ticket ${TICKET_KEY}.
You did not write this backlog. A different agent read the ticket and wrote it. Try to refute it.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/refute.md and ${REFERENCES_ABS}/SHAPE.md.
READ: ${TICKET_FILE_ABS} with its attachments, ${WORKAREA_ABS}/sources.json, ${INTAKE_FILES.investigation}, ${INTAKE_FILES.intake} and ${INTAKE_FILES.backlog}, then the code they name.
THE CANDIDATES tim lists for combining, which the reader had to merge or keep apart with a reason:
${relay.candidates.map(({ rows, reason }) => `- ${rows.join(' and ')}: ${reason}`).join('\n') || '- none'}
GIVE ONE VERDICT FOR EACH OF THESE, and no other:
${expected.map(({ kind, id }) => `- ${kind} ${id}: ${VERDICTS_BY_KIND[kind].join(', ')}`).join('\n')}
Rows: a split verdict asks why that row cannot join another row. List anything the ticket asks for that nothing carries in "missed".
You write no file. Return the structured output only.${relayRetryNote(relayProblems)}`

const refuteProblemsOf = ({ refuted, expected }) => {
  if (!refuted) return ['the refuting agent returned nothing']
  const given = refuted.verdicts.map(verdictKey)
  const wanted = expected.map(verdictKey)
  return [
    ...wanted.filter((key) => !given.includes(key)).map((key) => `no verdict for ${key}`),
    ...given.filter((key) => !wanted.includes(key)).map((key) => `a verdict for ${key}, which was not asked for`),
    ...refuted.verdicts
      .filter((entry) => !VERDICTS_BY_KIND[entry.kind]?.includes(entry.verdict))
      .map((entry) => `${verdictKey(entry)} has the verdict ${entry.verdict}, which does not fit its kind`)
  ]
}

const askToRefute = (relay, expected, relayProblems) =>
  agent(
    refutePrompt({ relay, expected, relayProblems }),
    think({ label: relayLabel('refute', relayProblems ? 1 : 0), phase: 'Refute', schema: REFUTE_SCHEMA })
  )

const runRefute = async (relay) => {
  const expected = expectedVerdictsOf(relay)
  const refuted = await askToRefute(relay, expected, null)
  const problems = refuteProblemsOf({ refuted, expected })
  if (problems.length === 0) return { refuted, problems }
  log(`${WORKFLOW_NAME}: refute: ${problems.join('; ')}. Asking again`)
  const again = await askToRefute(relay, expected, problems)
  return { refuted: again, problems: refuteProblemsOf({ refuted: again, expected }) }
}

const countBy = (items, keyOf) =>
  items.reduce((counts, item) => ({ ...counts, [keyOf(item)]: (counts[keyOf(item)] ?? 0) + 1 }), {})

const verdictsToAnswer = (refuted) => [
  ...refuted.verdicts.filter((entry) => !SATISFIED_VERDICTS.includes(entry.verdict)),
  ...refuted.missed.map((finding, index) => ({ kind: 'missed', id: `m${index + 1}`, verdict: 'missed', finding }))
]

phase('Refute')
let REFUTED = null
if (firstCheck.intake) {
  const outcome = await runRefute(firstCheck)
  if (outcome.problems.length > 0) {
    return stoppedResult('refute-incomplete', `the refuting agent's verdicts were incomplete after being asked again: ${outcome.problems.join('; ')}`, { ticketKey: TICKET_KEY })
  }
  REFUTED = outcome.refuted
} else {
  log(`${WORKFLOW_NAME}: ${WORKAREA}: the check gave no intake summary, so there is nothing to refute yet. The fix takes the check's problems`)
}

const TO_ANSWER = REFUTED ? verdictsToAnswer(REFUTED) : []

const FIX_SCHEMA = {
  type: 'object',
  required: ['ok', 'answers', 'decisions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim backlog check passes' },
    answers: {
      type: 'array',
      description: 'One entry for each verdict the prompt lists, and no other',
      items: {
        type: 'object',
        required: ['kind', 'id', 'applied', 'answer'],
        properties: {
          kind: { type: 'string' },
          id: { type: 'string' },
          applied: { type: 'boolean', description: 'true when you changed the files for it, false when you answer why not' },
          answer: { type: 'string', description: 'What you changed, or why you did not' }
        },
        additionalProperties: false
      }
    },
    decisions: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const fixPrompt = () => `You are the FIXER of the TICKET INTAKE workflow for the workarea ${WORKAREA}, ticket ${TICKET_KEY}.
A refuting agent challenged the backlog you wrote, and the checks ran. Fix it once, by the reader's method.
${RAILS}
${readFirst}
Follow "Fixing" and "On a rerun" in read.md.
${filesYouWrite}
THE VERDICTS TO APPLY OR ANSWER, one answer for each:
${TO_ANSWER.map((entry) => `- ${verdictKey(entry)} (${entry.verdict}): ${entry.finding}`).join('\n') || '- none'}
THE CHECK PROBLEMS TO FIX:
${problemList(FIRST_PROBLEMS) || '- none'}
CHECKS, both until they pass:
- \`${timCommand('backlog check')}\`
- \`${timCommand('backlog combine-candidates')}\`
Return the structured output only.`

const unansweredOf = (fixed) => {
  const answered = fixed.answers.map(verdictKey)
  return TO_ANSWER.map(verdictKey).filter((key) => !answered.includes(key))
}

const SATISFIED_COUNT = REFUTED ? REFUTED.verdicts.length - TO_ANSWER.filter((entry) => entry.kind !== 'missed').length : 0

let fixed = null
let finalCheck = firstCheck
if (TO_ANSWER.length === 0 && FIRST_PROBLEMS.length === 0) {
  log(`${WORKFLOW_NAME}: ${WORKAREA}: every one of ${REFUTED.verdicts.length} verdicts holds and the check found no problem, so no fix ran`)
} else {
  phase('Fix')
  fixed = await agent(fixPrompt(), think({ label: 'fix', phase: 'Fix', schema: FIX_SCHEMA }))
  if (!fixed) return stoppedResult('fix-failed', 'the fixer returned nothing', { ticketKey: TICKET_KEY })
  const unanswered = unansweredOf(fixed)
  if (unanswered.length > 0) {
    return stoppedResult('fix-incomplete', `the fixer left these verdicts unanswered: ${unanswered.join(', ')}`, { ticketKey: TICKET_KEY })
  }
  phase('Check again')
  finalCheck = await runCheck({ label: 'check after fix', phaseName: 'Check again' })
  if (finalCheck.relayMismatches) return relayMismatchStop(finalCheck)
  const finalProblems = checkProblemsOf(finalCheck)
  if (finalProblems.length > 0) {
    return stoppedResult(
      'out-of-shape',
      `the backlog is still out of shape after one fix, with ${finalProblems.length} problems:\n${finalProblems.join('\n')}`,
      { ticketKey: TICKET_KEY }
    )
  }
  if (finalCheck.intake.escalation) return returnEscalation(finalCheck)
}

const { intake: FINAL } = finalCheck
return {
  workarea: WORKAREA,
  stopped: null,
  ticket: FINAL.ticket,
  readiness: FINAL.readiness,
  rowsToBuild: FINAL.rowsToBuild,
  questions: FINAL.questions.map((question) => ({
    id: question.id,
    question: question.question,
    default: question.default,
    holdsLaunch: question.holdsLaunch,
    cause: question.cause ?? null
  })),
  escalation: null,
  refute: {
    verdicts: REFUTED ? countBy(REFUTED.verdicts, (entry) => entry.verdict) : {},
    satisfied: SATISFIED_COUNT,
    answers: fixed ? fixed.answers : [],
    fixRan: fixed !== null
  },
  decisions: { read: read.decisions, fix: fixed ? fixed.decisions : [] },
  files: INTAKE_FILES
}
