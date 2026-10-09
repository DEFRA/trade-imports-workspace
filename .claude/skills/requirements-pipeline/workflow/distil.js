export const meta = {
  name: 'distil',
  description:
    'The requirements-pipeline DISTIL phase, whole: read the work list from tim distil status → characterise each pending or stale source and cut it into parts → extract every part exhaustively, side by side, and merge them → verify its claims in ranges and merge the parts → plan reconcile areas from every partition → reconcile each area in full, one agent an area, and merge them → reconcile across areas → challenge every question against precedence and the rulings → draft rows per area and combine them into backlog.json → draft the report and return it',
  whenToUse:
    'After intake has written <workarea>/sources.json (goal, repos, reposWhy, precedence, sources). Launch by scriptPath with args; every key is required and a missing one stops the run before any agent starts. To fold in a new source or a ruling, edit sources.json and launch again: a source already verified with an unchanged scope is skipped, and reconcile and consolidate keep every existing id. To extract a source again with an unchanged scope, run tim distil reset --source first; to reconcile from nothing after a method change, run tim distil reset --stage reconcile. The run returns the report as text for the main session to save.',
  phases: [
    { title: 'Status' },
    { title: 'Characterise' },
    { title: 'Extract' },
    { title: 'Verify' },
    { title: 'Areas' },
    { title: 'Reconcile' },
    { title: 'Challenge' },
    { title: 'Consolidate' },
    { title: 'Report' }
  ]
}

// ---------------------------------------------------------------------------
// Configuration comes only from args (an object, or a JSON string). There are
// no defaults: a missing key stops the run before any agent starts.
//   workspace    the workspace root as a tilde path, such as
//                "~/git/defra/trade-imports-workspace". A clone passes its own
//   workarea     the programme's folder under workareas/, such as
//                "shared/ins-performance-testing", holding sources.json
//   only         null to work every pending, stale or invalid source. Or a
//                list of source ids: only those are extracted and verified this
//                launch, and the run stops before reconcile if any other source
//                still needs work
//   tim          the command agents run tim with, normally "tim". A clone
//                passes its own, such as
//                "npm --prefix ~/<clone>/tim run --silent tim --"
//   models       {} for the default on every tier, or any of: think (default
//                opus: characterise, area plan, every area reconciler, the
//                cross-area pass, every challenger, every row drafter, the
//                combiner, report), code (default opus: extract parts,
//                verify), light (default haiku: status, checks, merges,
//                working sets, coverage). A value is opus, sonnet, haiku, or
//                "inherit" for the session model
//   verifyChunk  the most claims one verify agent takes, such as 60: few
//                enough that it can re-check every one against the source. A
//                longer extract is verified in ranges, one agent a range
// ---------------------------------------------------------------------------
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

const WORKFLOW_NAME = 'distil'
const REQUIRED_KEYS = ['workspace', 'workarea', 'only', 'tim', 'models', 'verifyChunk']
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
    `config.workarea must be a folder under workareas/, such as "shared/ins-performance-testing". Got ${JSON.stringify(CFG.workarea)}`
  )
}

const ONLY = CFG.only
const onlyIsList =
  Array.isArray(ONLY) && ONLY.length > 0 && ONLY.every(isText) && new Set(ONLY).size === ONLY.length
if (ONLY !== null && !onlyIsList) {
  refuse(
    `config.only must be null to work every source that needs it, or a non-empty list of distinct source ids. Got ${JSON.stringify(ONLY)}`
  )
}

if (!isText(CFG.tim)) {
  refuse(`config.tim must be the command agents run tim with, normally "tim". Got ${JSON.stringify(CFG.tim)}`)
}
const TIM = CFG.tim.trim()

const VERIFY_CHUNK = CFG.verifyChunk
if (!Number.isInteger(VERIFY_CHUNK) || VERIFY_CHUNK <= 0) {
  refuse(`config.verifyChunk must be a whole number above 0: the most claims one verify agent takes. Got ${JSON.stringify(VERIFY_CHUNK)}`)
}

// ---------------------------------------------------------------------------
// Models. Three tiers, each with a default matched to the work:
//   think (opus)   characterise, the area plan, each area's reconciler, the
//                  cross-area pass, each challenger and the apply step, each
//                  area's row drafter, the combiner, report: the calls that
//                  decide. Every one has a slice small enough to weigh in full
//   code (opus)    extract parts, verify: reading every word of a slice of a
//                  source. Opus by default, because a thin extract caps
//                  everything downstream: a page or field never claimed never
//                  reaches a requirement
//   light (haiku)  status, the checks, merges, working sets, coverage: run a
//                  command and report what it printed. The workflow never
//                  trusts a relay blindly: every count it acts on is checked
//                  against another (claims against ranges, parts against the
//                  partition, area ids against the plan), and a relay that
//                  disagrees is asked again once, then the step fails
// A tier left out takes its default; "inherit" uses the session model.
// ---------------------------------------------------------------------------
const MODEL_DEFAULTS = { think: 'opus', code: 'opus', light: 'haiku' }
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
  `${WORKFLOW_NAME}: models: think ${RESOLVED_MODELS.think ?? 'inherit (session model)'}, code ${RESOLVED_MODELS.code ?? 'inherit (session model)'}, light ${RESOLVED_MODELS.light ?? 'inherit (session model)'}`
)

const withTier = (tier) => (opts) => ({
  ...opts,
  ...(RESOLVED_MODELS[tier] ? { model: RESOLVED_MODELS[tier] } : {})
})
const think = withTier('think')
const code = withTier('code')
const light = withTier('light')

// How many times a failed step goes back to its agent with the problems.
const CHARACTERISE_RETRIES = 1
const EXTRACT_RETRIES = 1
const VERIFY_RETRIES = 1
const AREA_PLAN_RETRIES = 1
const AREA_RETRIES = 1
const CHALLENGE_RETRIES = 1
const SEND_BACKS = 2
const REPORT_RETRIES = 1

// The most think-tier agents one fan-out runs at once: the area reconcilers,
// the challengers and the row drafters each go in fixed batches of this many,
// in plan order. Well inside the workflow's own concurrency cap, and narrow
// enough that a deep run does not hit the account's session limit under a
// wide Opus fan-out. Fixed batches make the order of agent calls the same on
// every run, so a resumed run replays every agent that finished.
const THINK_FAN_OUT = 6

const inBatches = async (items, size, run) => {
  const results = []
  for (let start = 0; start < items.length; start += size) {
    const batch = items.slice(start, start + size)
    results.push(...(await parallel(batch.map((item, offset) => () => run(item, start + offset)))))
  }
  return results
}

const WORKAREA_TILDE = `${TILDE}/workareas/${WORKAREA}`
const timCommand = (subcommand, flags) =>
  `${TIM} ${subcommand} ${WORKAREA}${flags ? ` ${flags}` : ''} --workspace ${TILDE} --json`

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

// Every command's --json output is one envelope line: ok, then result, or
// errors[0].message whose lines after the first are the problems, one a line.
const ENVELOPE_RULE = `Each tim command prints one JSON line: \`ok\`, then \`result\` on success, or \`errors[0].message\` on failure.
A failure message's first line says how many problems there are; every line after it is one problem. Copy each
problem line exactly, never paraphrased.`

const STRINGS = { type: 'array', items: { type: 'string' } }

// A relay asked again because what it copied disagrees with tim's own
// counts: the workflow never builds on a list a model may have shortened.
const relayRetryNote = (problems) =>
  problems && problems.length
    ? `
YOUR LAST ANSWER DID NOT MATCH WHAT TIM PRINTED. The workflow checked it against tim's own counts and found:
${problems.map((problem) => `- ${problem}`).join('\n')}
Run the commands again and copy every field of their JSON exactly, every entry of every list. Drop nothing, add
nothing, and never summarise a list.`
    : ''

const relayLabel = (label, relayAttempt) => (relayAttempt > 0 ? `${label} again` : label)

// ---------------------------------------------------------------------------
// Status: the work list, and the workspace root in absolute form.
// ---------------------------------------------------------------------------
phase('Status')

const STATUS_SCHEMA = {
  type: 'object',
  required: ['ok', 'abs', 'sources', 'orphans', 'problems', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil status exited 0' },
    abs: { type: 'string', description: 'What git rev-parse --show-toplevel printed, exactly' },
    sources: {
      type: 'array',
      description: 'Every entry of result.sources, in order',
      items: {
        type: 'object',
        required: ['id', 'kind', 'slug', 'state', 'next', 'reason'],
        properties: {
          id: { type: 'string' },
          kind: { type: 'string' },
          slug: { type: 'string' },
          state: { type: 'string', enum: ['pending', 'extracted', 'verified', 'stale', 'invalid'] },
          next: { type: 'string', enum: ['extract', 'verify', 'none'], description: 'result.sources[].next, with null written as "none"' },
          reason: { type: 'string' },
          claims: { type: 'integer', description: 'extract.claims, when it is a number' }
        },
        additionalProperties: false
      }
    },
    orphans: { ...STRINGS, description: 'result.orphans, exactly' },
    problems: { ...STRINGS, description: 'On failure, every problem line of errors[0].message' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const status = await agent(
  `You are the STATUS step of the DISTIL workflow for the workarea ${WORKAREA}. Run two commands and report what they print.
${guardRails(null)}
1. \`git -C ${TILDE} rev-parse --show-toplevel\`. Report what it printed as \`abs\`, exactly.
2. \`${timCommand('distil status')}\`.
${ENVELOPE_RULE}
On success, copy every entry of \`result.sources\` in order: id, kind, slug, state, next (write null as "none"), reason,
and claims from \`extract.claims\` when it is a number. Copy \`result.orphans\` exactly. ok is true.
On failure, ok is false, sources and orphans are [], and problems holds every problem line.
Change nothing. Return the structured output only.`,
  light({ label: 'status', phase: 'Status', schema: STATUS_SCHEMA })
)

const stoppedResult = (reason, detail, extra) => ({
  workarea: WORKAREA,
  stopped: { reason, detail },
  sources: [],
  failed: [],
  requirements: null,
  conflicts: null,
  questions: [],
  backlog: null,
  report: null,
  reportPath: null,
  ...extra
})

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

const ABS = status.abs.trim().replace(/\/+$/, '')
const RAILS = guardRails(ABS)
const WORKAREA_ABS = `${ABS}/workareas/${WORKAREA}`
const SOURCES_ABS = `${WORKAREA_ABS}/sources.json`
const SKILL_ABS = `${ABS}/.claude/skills/requirements-pipeline`
const REFERENCES_ABS = `${SKILL_ABS}/references`
const BRIEFS_ABS = `${SKILL_ABS}/workflow/distil/briefs`
const REPORT_PATH = `${WORKAREA_ABS}/report.md`

const extractPath = (slug) => `${WORKAREA_ABS}/distil/extract/${slug}.json`
const extractTilde = (slug) => `${WORKAREA_TILDE}/distil/extract/${slug}.json`
const verifyPartTilde = (slug, part) => `${WORKAREA_TILDE}/distil/verify/${slug}.part${part}.json`

const partitionPath = (slug) => `${WORKAREA_ABS}/distil/extract/${slug}.partition.json`
const partitionTilde = (slug) => `${WORKAREA_TILDE}/distil/extract/${slug}.partition.json`
const extractPartPath = (slug, part) => `${WORKAREA_ABS}/distil/extract/${slug}.part${part}.json`
const workFolderAbs = (slug) => `${WORKAREA_ABS}/distil/extract/${slug}.work`
const workFolderTilde = (slug) => `${WORKAREA_TILDE}/distil/extract/${slug}.work`

// The trace CLI is stateful and extracts into its working directory. tim runs
// it in the source's own .work folder, or in a sub-folder of it named by
// --folder, so agents reading one trace source side by side never open over
// each other's trace, and no step needs a cd.
const traceCommand = (item, folder) =>
  `${TIM} distil trace ${WORKAREA} --source ${item.id}${folder ? ` --folder ${folder}` : ''} [--out <file name>] --workspace ${TILDE} --json -- <subcommand and its arguments>`
const traceNote = (item, folder) =>
  item.kind === 'trace'
    ? `
THE TRACE CLI: run every playwright trace subcommand as \`${traceCommand(item, folder)}\`.
tim runs it in ${workFolderTilde(item.slug)}/${folder ? `${folder}/` : ''}, so the trace you open there is yours. --out
writes the output to a file of that name in that folder, to Read with the Read tool; without it the output is in
\`result.stdout\`. Never run npx or playwright yourself.`
    : ''

if (status.orphans.length > 0) {
  log(`${status.orphans.length} files under distil/ belong to no source in sources.json, and are ignored: ${status.orphans.join(', ')}`)
}

// ---------------------------------------------------------------------------
// The work list: every source whose next step is extract or verify, narrowed
// to config.only when it is a list.
// ---------------------------------------------------------------------------
const knownIds = new Set(status.sources.map((source) => source.id))
const unknownOnly = ONLY ? ONLY.filter((id) => !knownIds.has(id)) : []
if (unknownOnly.length > 0) {
  return stoppedResult(
    'unknown-source',
    `config.only names ${unknownOnly.join(', ')}, which sources.json does not have. Its sources are ${[...knownIds].join(', ')}`
  )
}

const needsWork = status.sources.filter((source) => source.next !== 'none')
const work = ONLY ? needsWork.filter((source) => ONLY.includes(source.id)) : needsWork
const leftForLater = needsWork.filter((source) => !work.includes(source))
const alreadyVerified = status.sources.filter((source) => source.next === 'none')

if (ONLY) {
  const skippedOnly = ONLY.filter((id) => alreadyVerified.some((source) => source.id === id))
  if (skippedOnly.length > 0) {
    log(`${skippedOnly.join(', ')}: already verified with an unchanged scope, so skipped. To distil it again, change its scope in sources.json, or run tim distil reset ${WORKAREA} --source <id> first`)
  }
}
log(
  `${work.length} of ${status.sources.length} sources need work this launch: ${work.map((source) => `${source.id} (${source.next})`).join(', ') || 'none'}. ${alreadyVerified.length} already verified.${leftForLater.length ? ` Left for a later launch by config.only: ${leftForLater.map((source) => source.id).join(', ')}.` : ''}`
)

// ---------------------------------------------------------------------------
// Characterise, extract and verify, one pipeline over the work list. Every
// source is extracted the same way: characterised and cut into parts, one
// agent per part, the parts merged by tim. A small source is one part. An
// item moves on to verify as soon as its own extract checks out; it never
// waits for the others.
// ---------------------------------------------------------------------------
phase('Extract')

const EXTRACT_KINDS = ['repo', 'confluence', 'web', 'document', 'trace', 'ruling', 'image']

// A claim id prefix unique to the source, so ids never clash across extracts:
// requirements cite claims by id alone.
const claimPrefixOf = (slug) =>
  slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const hasExtractAlready = (item) => item.state !== 'pending'

// Each part's claim ids start with its own prefix, so parts written side by
// side never clash, and tim checks every id against it.
const partPrefixOf = (item, part) => `${claimPrefixOf(item.slug)}-p${part}`

const problemList = (problems) => problems.map((problem) => `- ${problem}`).join('\n')

const retryNote = (problems, what) =>
  problems
    ? `
THIS IS A RETRY. ${what} found these problems. Fix every one, then check again:
${problemList(problems)}`
    : ''

// ---------------------------------------------------------------------------
// Characterise: one think-tier agent reads the whole source and cuts it into
// parts, each small enough for one agent to read in full and claim
// exhaustively. tim checks the partition and clears part files left from an
// earlier run.
// ---------------------------------------------------------------------------
const CHARACTERISE_SCHEMA = {
  type: 'object',
  required: ['ok', 'parts', 'structure', 'decisions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when the partition check passed on your file' },
    parts: { type: 'integer', description: 'How many parts the partition has' },
    structure: { type: 'string', description: 'One line: the structure you found and how you cut it' },
    decisions: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const keepsRule = (item) =>
  hasExtractAlready(item)
    ? `An extract already exists for this source (state ${item.state}: ${item.reason}). List its claims with
\`jq -c '.claims[] | {id, ref}' ${extractTilde(item.slug)}\`, and give each old claim id to the one part whose slice
holds its ref, in that part's "keeps". The part keeps each id whose claim still says the same thing: a requirement may
already cite it. An old id whose ref no part holds goes in no part.`
    : 'This source has no extract yet, so no part has "keeps".'

const characterisePrompt = (item, problems) => {
  const prefix = claimPrefixOf(item.slug)
  return `You are the CHARACTERISE step of the DISTIL workflow for ONE source: ${item.id} (kind ${item.kind}).
You write no claims. You work out what the source is and how it is laid out, and cut it into parts that one extract
agent each can read in full and claim exhaustively. One agent per part extracts next, side by side.
${RAILS}
READ FIRST, in full:
1. ${BRIEFS_ABS}/characterise.md: how to cut a source of each kind into parts.
2. ${BRIEFS_ABS}/extract-${item.kind}.md: how a ${item.kind} source is read, so your parts suit the method.
3. ${REFERENCES_ABS}/partition.schema.json: the file's shape, field by field.
THE SOURCE: the entry whose id is "${item.id}" in ${SOURCES_ABS} (Read it). Its scope narrows what the parts cover.
The file's goal says what the programme is for.
THE FILE YOU WRITE: ${partitionPath(item.slug)}
YOUR WORKING FOLDER, for anything else you need to write: ${workFolderAbs(item.slug)}/
(in Bash: ${workFolderTilde(item.slug)}/). Nothing else in the workarea is yours to write.${traceNote(item, null)}
PREFIXES: part N's prefix is "${prefix}-p<N>": ${partPrefixOf(item, 1)}, ${partPrefixOf(item, 2)} and on.
KEEPS: ${keepsRule(item)}
CHECK, after every write of the file: \`${timCommand('distil check', `--source ${item.id} --stage partition`)}\`
It exits 1 and names every problem. Fix them and check again until it passes.${retryNote(problems, 'The partition check')}
Return the structured output only.`
}

const PARTITION_CHECK_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems', 'parts', 'removedParts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil check exited 0' },
    problems: STRINGS,
    parts: {
      type: 'array',
      description: 'result.sources[0].parts, exactly',
      items: {
        type: 'object',
        required: ['part', 'title', 'prefix', 'path'],
        properties: {
          part: { type: 'integer' },
          title: { type: 'string' },
          prefix: { type: 'string' },
          path: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    removedParts: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const partitionCheckPrompt = (item, relayProblems) => `You are a PARTITION CHECK step of the DISTIL workflow for the source ${item.id}. Run one command and report what it prints.
${RAILS}
\`${timCommand('distil check', `--source ${item.id} --stage partition --clear-parts`)}\`
${ENVELOPE_RULE}
On success: ok is true. Copy every entry of \`result.sources[0].parts\` exactly (part, title, prefix and path), and
\`result.removedParts\` into removedParts. The command itself removed those old extract part files, so nothing from an
earlier run is merged.
On failure: ok is false, parts and removedParts are [], and problems holds every problem line.${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`

const nothingBack = (what) => ({ ok: false, problems: [`the ${what} agent returned nothing`], summary: '' })

const runPartitionCheck = async (item, attempt, relayProblems) =>
  (await agent(
    partitionCheckPrompt(item, relayProblems),
    light({
      label: relayLabel(`${item.id} check partition${attempt > 0 ? ` ${attempt + 1}` : ''}`, relayProblems ? 1 : 0),
      phase: 'Characterise',
      schema: PARTITION_CHECK_SCHEMA
    })
  )) ?? nothingBack('partition check')

// The characterise agent says how many parts it wrote; a relay that copied
// fewer would leave a slice of the source unextracted without anyone seeing.
const partitionRelayProblems = (answer, checked) =>
  checked.ok && Number.isInteger(answer?.parts) && answer.parts !== (checked.parts ?? []).length
    ? [`the characterise agent wrote ${answer.parts} parts, but the partition check relayed ${(checked.parts ?? []).length}`]
    : []

const checkPartition = async (item, attempt, answer) => {
  const checked = await runPartitionCheck(item, attempt, null)
  const relayProblems = partitionRelayProblems(answer, checked)
  if (!relayProblems.length) return checked
  log(`${item.id}: ${relayProblems.join(' ')}. Asking the check again`)
  return runPartitionCheck(item, attempt, relayProblems)
}

// The parts must be 1..n, each with the prefix the workflow gave it and its
// own part file: anything else is a check agent that copied them wrong, or a
// partition that ignored its prefixes.
const partitionShapeProblems = (item, checked) => {
  if (!checked.ok) return checked.problems.length ? checked.problems : [`tim distil check --stage partition failed without naming a problem: ${checked.summary}`]
  const parts = checked.parts ?? []
  if (parts.length === 0) return ['the partition check reported no parts']
  return parts.flatMap((part, index) => {
    const number = index + 1
    return [
      ...(part.part === number && part.path.endsWith(`/${item.slug}.part${number}.json`)
        ? []
        : [`the partition check reported part ${JSON.stringify(part.part)} with the file ${part.path}, where part ${number} and ${item.slug}.part${number}.json belong`]),
      ...(part.prefix === partPrefixOf(item, number)
        ? []
        : [`part ${number} has the prefix ${part.prefix}. Give it ${partPrefixOf(item, number)}, the prefix the workflow names`])
    ]
  })
}

const characteriseStage = async (item) => {
  const characterised = [
    await agent(characterisePrompt(item, null), think({ label: `${item.id} characterise`, phase: 'Characterise', schema: CHARACTERISE_SCHEMA }))
  ]
  let checked = await checkPartition(item, 0, characterised[0])
  let problems = [...partitionShapeProblems(item, checked), ...partitionRelayProblems(characterised[0], checked)]
  for (let retry = 1; problems.length && retry <= CHARACTERISE_RETRIES; retry++) {
    characterised.push(
      await agent(characterisePrompt(item, problems), think({ label: `${item.id} characterise retry ${retry}`, phase: 'Characterise', schema: CHARACTERISE_SCHEMA }))
    )
    checked = await checkPartition(item, retry, characterised.at(-1))
    problems = [...partitionShapeProblems(item, checked), ...partitionRelayProblems(characterised.at(-1), checked)]
  }
  const decisions = characterised.filter(Boolean).flatMap((answer) => answer.decisions ?? [])
  return problems.length ? { problems, decisions } : { parts: checked.parts, decisions }
}

// ---------------------------------------------------------------------------
// Extract: one agent per part, side by side, each reading its slice in full.
// tim merges the parts into the one extract the rest of the pipeline reads.
// ---------------------------------------------------------------------------
const EXTRACT_PART_SCHEMA = {
  type: 'object',
  required: ['ok', 'part', 'claims', 'gaps', 'structure', 'decisions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when the check command passed on your part file' },
    part: { type: 'integer' },
    claims: { type: 'integer' },
    gaps: { type: 'integer', description: 'How many of your claims are gaps' },
    structure: { type: 'string', description: 'One line: what your part read and covered' },
    decisions: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const partPrompt = (item, part, partCount, problems) => {
  const index = part.part - 1
  return `You are an EXTRACT step of the DISTIL workflow: source ${item.id} (kind ${item.kind}), part ${part.part} of ${partCount}: ${part.title}.
You read this one part of the source in full and claim everything in it. Another agent extracts each other part.
${RAILS}
READ FIRST, in full:
1. ${BRIEFS_ABS}/extract.md: the rules every source shares, and what exhaustive means.
2. ${BRIEFS_ABS}/extract-${item.kind}.md: how to read a ${item.kind} source.
3. ${REFERENCES_ABS}/extract.schema.json: your file's shape. A part file has no scopeHash.
THE SOURCE: the entry whose id is "${item.id}" in ${SOURCES_ABS} (Read it). The file's goal says what the programme is for.
YOUR PART: \`jq '.parts[${index}]' ${partitionTilde(item.slug)}\`. Its scope is your slice; read every entry of its
"read" in full, and claim everything its "covers" names and anything else the slice shows. The whole source's
structure is \`jq -r .structure ${partitionTilde(item.slug)}\`: it tells you where your slice sits, never what to claim.
THE FILE YOU WRITE: ${part.path}
YOUR WORKING FOLDER, for anything else you need to write: ${workFolderAbs(item.slug)}/part${part.part}/
(in Bash: ${workFolderTilde(item.slug)}/part${part.part}/). Nothing else in the workarea is yours to write.${traceNote(item, `part${part.part}`)}
CLAIM IDS: new claims are ${part.prefix}-001, ${part.prefix}-002 and on. An id in your part's "keeps" is an earlier
extract's claim from your slice: keep it where your claim still says the same thing.
CHECK, after every write of the file: \`${timCommand('distil check', `--source ${item.id} --stage extract --part ${part.part}`)}\`
It exits 1 and names every problem. Fix them and check again until it passes. Never merge the parts, and never write
the source's extract file: the workflow merges every part once all of them are written.${retryNote(problems, 'Merging the parts')}
Return the structured output only.`
}

const PART_RANGES = {
  type: 'array',
  description: 'result.sources[0].parts, exactly, or [] when it is absent',
  items: {
    type: 'object',
    required: ['part', 'claims'],
    properties: {
      part: { type: 'integer' },
      title: { type: 'string' },
      claims: { type: 'integer' },
      from: { type: ['string', 'null'] },
      to: { type: ['string', 'null'] }
    },
    additionalProperties: false
  }
}

// The verify ranges come from the claim count alone: range N is the claims at
// indexes (N-1)*verifyChunk on, and writes <slug>.part<N>.json. The workflow
// works them out itself rather than have a relay retype tim's list, and checks
// the relay's count of ranges against them.
const verifyRangesOf = (item, claims) => {
  const count = claims > 0 ? Math.ceil(claims / VERIFY_CHUNK) : 1
  return Array.from({ length: count }, (_, index) => ({
    part: index + 1,
    start: index * VERIFY_CHUNK,
    count: Math.max(0, Math.min(VERIFY_CHUNK, claims - index * VERIFY_CHUNK)),
    path: `${WORKAREA_ABS}/distil/verify/${item.slug}.part${index + 1}.json`
  }))
}

const EXTRACT_COUNTS = {
  claims: { type: 'integer', description: 'result.sources[0].claims, exactly. 0 on failure' },
  ranges: { type: 'integer', description: 'How many entries result.sources[0].chunks has, counted exactly. 0 on failure' },
  parts: PART_RANGES
}

const MERGE_EXTRACT_SCHEMA = {
  type: 'object',
  required: ['ok', 'stage', 'problems', 'claims', 'ranges', 'parts', 'removedParts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when both commands exited 0' },
    stage: { type: 'string', enum: ['merge', 'check', 'done'], description: 'merge or check: the command that failed. done: both passed' },
    problems: STRINGS,
    ...EXTRACT_COUNTS,
    removedParts: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const COPY_EXTRACT_COUNTS = `Copy \`result.sources[0].claims\` into claims, count the entries of \`result.sources[0].chunks\` into
   ranges, copy every entry of \`result.sources[0].parts\` exactly (part, title, claims, from and to; [] when it is
   absent), and \`result.removedParts\` into removedParts`

const mergeExtractPrompt = (item) => `You are a MERGE EXTRACT step of the DISTIL workflow for the source ${item.id}. Run two commands and report what they print.
${RAILS}
1. \`${timCommand('distil merge-extract', `--source ${item.id}`)}\`
${ENVELOPE_RULE}
   On failure: ok is false, stage is "merge", claims and ranges are 0, parts and removedParts are [], problems holds
   every problem line, and you stop here.
2. \`${timCommand('distil check', `--source ${item.id} --stage extract --chunk ${VERIFY_CHUNK} --clear-parts`)}\`
   On success: ok is true, stage is "done". ${COPY_EXTRACT_COUNTS}. The command itself removed those old verify part
   files, so nothing from an earlier run is merged.
   On failure: ok is false, stage is "check", claims and ranges are 0, parts and removedParts are [], problems holds
   every problem line.
Change nothing yourself. Return the structured output only.`

const runMergeExtract = async (item, attempt) =>
  (await agent(
    mergeExtractPrompt(item),
    light({ label: `${item.id} merge extract${attempt > 0 ? ` ${attempt + 1}` : ''}`, phase: 'Extract', schema: MERGE_EXTRACT_SCHEMA })
  )) ?? { ...nothingBack('merge extract'), stage: 'merge', claims: 0, ranges: 0, parts: [], removedParts: [] }

// Which parts to run again. After a failed merge the parts are still on disk,
// so only the ones whose agent failed or that a problem names go again;
// failing that, or after a failed check, every one does.
const partsToRedo = (item, parts, answers, failed) => {
  if (failed.stage === 'check') return parts
  const named = parts.filter((part, index) => {
    const answer = answers[index]
    const partFile = `${item.slug}.part${part.part}.json`
    return !answer || !answer.ok || failed.problems.some((problem) => problem.includes(partFile))
  })
  return named.length ? named : parts
}

const replaceRedone = (parts, answers, redo, redone) =>
  parts.map((part, index) => {
    const redoneAt = redo.indexOf(part)
    return redoneAt === -1 ? answers[index] : redone[redoneAt]
  })

const runExtractPart = (item, part, partCount, problems, attempt) =>
  agent(
    partPrompt(item, part, partCount, problems),
    code({
      label: `${item.id} extract part ${part.part}/${partCount}${attempt > 0 ? ` retry ${attempt}` : ''}`,
      phase: 'Extract',
      schema: EXTRACT_PART_SCHEMA
    })
  )

const extractPartsStage = async (item, parts) => {
  let answers = await parallel(parts.map((part) => () => runExtractPart(item, part, parts.length, null, 0)))
  let merged = await runMergeExtract(item, 0)
  for (let retry = 1; !merged.ok && retry <= EXTRACT_RETRIES; retry++) {
    const redo = partsToRedo(item, parts, answers, merged)
    const redone = await parallel(redo.map((part) => () => runExtractPart(item, part, parts.length, merged.problems, retry)))
    answers = replaceRedone(parts, answers, redo, redone)
    merged = await runMergeExtract(item, retry)
  }
  return { merged, answers }
}

// ---------------------------------------------------------------------------
// The extract check: a source already extracted, whose next step is verify,
// only has its extract checked. It is also how a merge whose relay disagrees
// with itself is asked again: the check is safe to run twice, the merge is not
// needed again.
// ---------------------------------------------------------------------------
const EXTRACT_CHECK_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems', 'claims', 'ranges', 'parts', 'removedParts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil check exited 0' },
    problems: STRINGS,
    ...EXTRACT_COUNTS,
    removedParts: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const extractCheckPrompt = (item, relayProblems) => `You are an EXTRACT CHECK step of the DISTIL workflow for the source ${item.id}. Run one command and report what it prints.
${RAILS}
\`${timCommand('distil check', `--source ${item.id} --stage extract --chunk ${VERIFY_CHUNK} --clear-parts`)}\`
${ENVELOPE_RULE}
On success: ok is true. ${COPY_EXTRACT_COUNTS}. The command itself removed those old verify part files, so nothing
from an earlier run is merged.
On failure: ok is false, claims and ranges are 0, parts and removedParts are [], and problems holds every problem
line.${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`

const runExtractCheck = async (item, relayProblems) =>
  (await agent(
    extractCheckPrompt(item, relayProblems),
    light({ label: relayLabel(`${item.id} check extract`, relayProblems ? 1 : 0), phase: 'Extract', schema: EXTRACT_CHECK_SCHEMA })
  )) ?? { ...nothingBack('extract check'), claims: 0, ranges: 0, parts: [], removedParts: [] }

// Whether what a relay copied from the extract check holds together: the
// ranges are the claims cut into verifyChunk, and the parts add up to the
// claims. A relay that dropped the ranges, the parts or the count fails here,
// however tidy its answer looks.
const extractRelayProblems = (checked) => {
  if (!Number.isInteger(checked.claims) || checked.claims < 0) {
    return [`the extract check relayed ${JSON.stringify(checked.claims)} as the claim count`]
  }
  const expected = verifyRangesOf({ slug: '' }, checked.claims).length
  const inParts = (checked.parts ?? []).reduce((total, part) => total + (part.claims ?? 0), 0)
  return [
    ...(checked.ranges === expected
      ? []
      : [`the extract check relayed ${JSON.stringify(checked.ranges)} verify ranges, but ${checked.claims} claims in ranges of ${VERIFY_CHUNK} make ${expected}`]),
    ...((checked.parts ?? []).length && inParts !== checked.claims
      ? [`the extract check relayed parts holding ${inParts} claims, but the extract has ${checked.claims}`]
      : [])
  ]
}

// A passing check whose relay disagrees with itself is asked again once,
// with what was wrong. Twice wrong and the source fails: nothing is verified
// from ranges nobody can trust.
const trustedExtractCheck = async (item, checked) => {
  const problems = extractRelayProblems(checked)
  if (!problems.length) return { checked, problems }
  log(`${item.id}: ${problems.join(' ')}. Asking the extract check again`)
  const again = await runExtractCheck(item, problems)
  if (!again.ok) return { checked: again, problems: again.problems }
  return { checked: again, problems: extractRelayProblems(again) }
}

const failedSource = (item, failedAt, problems) => ({
  id: item.id,
  kind: item.kind,
  slug: item.slug,
  outcome: 'failed',
  failedAt,
  problems
})

const extractedSource = (item, checked, decisions) => ({
  id: item.id,
  outcome: 'extracted',
  claims: checked.claims,
  parts: checked.parts ?? [],
  chunks: verifyRangesOf(item, checked.claims),
  decisions
})

const characteriseAndExtract = async (item) => {
  const partitioned = await characteriseStage(item)
  if (partitioned.problems) return failedSource(item, 'characterise', partitioned.problems)
  const { merged, answers } = await extractPartsStage(item, partitioned.parts)
  if (!merged.ok) return failedSource(item, 'extract', merged.problems)
  const trusted = await trustedExtractCheck(item, merged)
  if (trusted.problems.length) return failedSource(item, 'extract', trusted.problems)
  return extractedSource(item, trusted.checked, [
    ...partitioned.decisions,
    ...answers.filter(Boolean).flatMap((answer) => (answer.decisions ?? []).map((decision) => `part ${answer.part}: ${decision}`))
  ])
}

const extractStage = async (item) => {
  if (!EXTRACT_KINDS.includes(item.kind)) {
    return failedSource(item, 'extract', [`kind "${item.kind}" has no extract brief. Kinds: ${EXTRACT_KINDS.join(', ')}`])
  }
  if (item.next === 'extract') return characteriseAndExtract(item)
  const checked = await runExtractCheck(item, null)
  if (!checked.ok) {
    log(`${item.id}: its extract no longer checks out (${checked.problems.join(' ')}), so it is characterised and extracted again`)
    return characteriseAndExtract(item)
  }
  const trusted = await trustedExtractCheck(item, checked)
  if (trusted.problems.length) return failedSource(item, 'extract', trusted.problems)
  return extractedSource(item, trusted.checked, [])
}

// ---------------------------------------------------------------------------
// Verify: one agent per range of claims, each told which parts of the
// partition its range came from, so it re-reads that slice of the source.
// ---------------------------------------------------------------------------
const VERIFY_SCHEMA = {
  type: 'object',
  required: ['ok', 'part', 'verdicts', 'held', 'refuted', 'missed', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when your part file is written with a verdict on every claim in your range' },
    part: { type: 'integer' },
    verdicts: { type: 'integer' },
    held: { type: 'integer' },
    refuted: { type: 'integer' },
    missed: { type: 'integer' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

// The extract parts a verify range overlaps, from each part's claim count:
// the claims run in part order, so part N holds a contiguous run of them.
const extractPartsOverlapping = (parts, start, end) => {
  const spans = parts.map((part, index) => {
    const from = parts.slice(0, index).reduce((total, earlier) => total + earlier.claims, 0)
    return { part: part.part, from, to: from + part.claims }
  })
  return spans.filter((span) => span.from < end && span.to > start && span.to > span.from).map((span) => span.part)
}

const sliceNote = (item, parts, start, end) => {
  const overlapping = extractPartsOverlapping(parts, start, end)
  if (!overlapping.length) return ''
  const indexes = overlapping.map((part) => part - 1).join(',')
  return `
YOUR SLICE OF THE SOURCE: your claims come from part${overlapping.length === 1 ? '' : 's'} ${overlapping.join(', ')} of the partition.
Read \`jq '.parts[${indexes}]' ${partitionTilde(item.slug)}\` for what each read and had to cover, then read that slice of
the source in full yourself: you check every claim against it, and add every claim it makes that the extract missed.`
}

const verifyPrompt = (item, chunk, chunkCount, parts, problems) => {
  const start = chunk.start
  const end = start + chunk.count
  const range =
    chunk.count > 0
      ? `${chunk.count} claims, at indexes ${start} to ${end - 1} of the extract.
Read them with \`jq '.claims[${start}:${end}]' ${extractTilde(item.slug)}\`: a verdict on every one of them.`
      : `none: the extract has no claims. Write verdicts [] and missed [], and say in your summary what the source holds
that the extract should have recorded.`
  const retry = problems
    ? `
THIS IS A RETRY. Merging or checking the parts found these problems. Write your part again so none of them is yours:
${problemList(problems)}`
    : ''
  return `You are a VERIFY step of the DISTIL workflow: source ${item.id} (kind ${item.kind}), part ${chunk.part} of ${chunkCount}.
You did not write this extract. Try to refute every claim in your range against the source itself.
${RAILS}
READ FIRST, in full:
1. ${BRIEFS_ABS}/verify.md: how to verify.
2. ${BRIEFS_ABS}/extract-${item.kind}.md: how to read a ${item.kind} source.
3. ${REFERENCES_ABS}/verify.schema.json: your file's shape.
THE SOURCE: the entry whose id is "${item.id}" in ${SOURCES_ABS} (Read it).
THE EXTRACT: ${extractPath(item.slug)}. Its structure: \`jq -r .structure ${extractTilde(item.slug)}\`.
YOUR RANGE: ${range}${chunk.count > 0 ? sliceNote(item, parts, start, end) : ''}
THE FILE YOU WRITE: ${chunk.path}, with "source": "${item.id}". In Bash it is ${verifyPartTilde(item.slug, chunk.part)}.
It is the only file you write. Never merge parts and never write the full verify file.${traceNote(item, `verify${chunk.part}`)}${retry}
Return the structured output only.`
}

const MERGE_SCHEMA = {
  type: 'object',
  required: ['ok', 'stage', 'problems', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when both commands exited 0' },
    stage: { type: 'string', enum: ['merge', 'check', 'done'], description: 'merge or check: the command that failed. done: both passed' },
    problems: STRINGS,
    claims: { type: 'integer' },
    verdicts: { type: 'integer' },
    held: { type: 'integer' },
    refuted: { type: 'integer' },
    missed: { type: 'integer' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const COPY_VERIFY_COUNTS = `copy \`result.sources[0].claims\` into claims and the counts in \`result.sources[0].verify\`:
   verdicts, held, refuted and missed`

const mergePrompt = (item) => `You are a MERGE step of the DISTIL workflow for the source ${item.id}. Run two commands and report what they print.
${RAILS}
1. \`${timCommand('distil merge-verify', `--source ${item.id}`)}\`
${ENVELOPE_RULE}
   On failure: ok is false, stage is "merge", problems holds every problem line, and you stop here.
2. \`${timCommand('distil check', `--source ${item.id} --stage verify`)}\`
   On success: ok is true, stage is "done", and ${COPY_VERIFY_COUNTS}.
   On failure: ok is false, stage is "check", problems holds every problem line.
Change nothing yourself. Return the structured output only.`

const verifyCheckPrompt = (item, relayProblems) => `You are a VERIFY CHECK step of the DISTIL workflow for the source ${item.id}. Run one command and report what it prints.
${RAILS}
\`${timCommand('distil check', `--source ${item.id} --stage verify`)}\`
${ENVELOPE_RULE}
On success: ok is true, stage is "done", and ${COPY_VERIFY_COUNTS}.
On failure: ok is false, stage is "check", problems holds every problem line.${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`

// Every claim has exactly one verdict, so a merge whose relayed counts say
// otherwise was copied wrong: the check runs again (the merge already removed
// the parts, so it cannot), and twice wrong fails the source.
const verifyRelayProblems = (merged, claims) => [
  ...(merged.verdicts === claims ? [] : [`the verify merge relayed ${JSON.stringify(merged.verdicts)} verdicts, but the extract has ${claims} claims`]),
  ...(merged.held + merged.refuted === merged.verdicts
    ? []
    : [`the verify merge relayed ${JSON.stringify(merged.held)} held and ${JSON.stringify(merged.refuted)} refuted, which do not add up to its ${JSON.stringify(merged.verdicts)} verdicts`])
]

const trustedVerifyCheck = async (item, merged, claims) => {
  const problems = verifyRelayProblems(merged, claims)
  if (!problems.length) return { merged, problems }
  log(`${item.id}: ${problems.join(' ')}. Asking the verify check again`)
  const again =
    (await agent(verifyCheckPrompt(item, problems), light({ label: `${item.id} check verify again`, phase: 'Verify', schema: MERGE_SCHEMA }))) ??
    { ...nothingBack('verify check'), stage: 'check' }
  if (!again.ok) return { merged: again, problems: again.problems }
  return { merged: again, problems: verifyRelayProblems(again, claims) }
}

const runVerifier = (item, chunk, chunkCount, parts, problems, attempt) =>
  agent(
    verifyPrompt(item, chunk, chunkCount, parts, problems),
    code({
      label: `${item.id} verify ${chunk.part}/${chunkCount}${attempt > 0 ? ` retry ${attempt}` : ''}`,
      phase: 'Verify',
      schema: VERIFY_SCHEMA
    })
  )

const runMerge = async (item, attempt) =>
  (await agent(mergePrompt(item), light({ label: `${item.id} merge${attempt > 0 ? ` ${attempt + 1}` : ''}`, phase: 'Verify', schema: MERGE_SCHEMA }))) ??
  { ...nothingBack('merge'), stage: 'merge' }

const verifyStage = async (extracted, item) => {
  if (!extracted || extracted.outcome !== 'extracted') return extracted ?? failedSource(item, 'extract', ['the extract stage stopped without a result'])
  const { chunks, parts } = extracted
  let verdicts = await parallel(chunks.map((chunk) => () => runVerifier(item, chunk, chunks.length, parts, null, 0)))
  let merged = await runMerge(item, 0)
  for (let retry = 1; !merged.ok && retry <= VERIFY_RETRIES; retry++) {
    const redo = partsToRedo(item, chunks, verdicts, merged)
    const redone = await parallel(redo.map((chunk) => () => runVerifier(item, chunk, chunks.length, parts, merged.problems, retry)))
    verdicts = replaceRedone(chunks, verdicts, redo, redone)
    merged = await runMerge(item, retry)
  }
  if (!merged.ok) return failedSource(item, 'verify', merged.problems)
  const trusted = await trustedVerifyCheck(item, merged, extracted.claims)
  if (trusted.problems.length) return failedSource(item, 'verify', trusted.problems)
  merged = trusted.merged
  return {
    id: item.id,
    kind: item.kind,
    slug: item.slug,
    outcome: 'verified',
    extractParts: parts.length,
    parts: chunks.length,
    claims: merged.claims ?? extracted.claims,
    held: merged.held ?? null,
    refuted: merged.refuted ?? null,
    missed: merged.missed ?? null,
    decisions: extracted.decisions
  }
}

const worked = work.length ? await pipeline(work, extractStage, verifyStage) : []

const outcomeOf = (source) => {
  const index = work.indexOf(source)
  if (index !== -1) {
    return worked[index] ?? failedSource(source, source.next, ['a workflow stage threw, so the source has no result'])
  }
  if (source.next === 'none') {
    return { id: source.id, kind: source.kind, slug: source.slug, outcome: 'unchanged', claims: source.claims ?? null }
  }
  return { id: source.id, kind: source.kind, slug: source.slug, outcome: 'not-run', state: source.state, reason: 'left for a later launch by config.only' }
}

const SOURCES = status.sources.map(outcomeOf)
const FAILED = SOURCES.filter((source) => source.outcome === 'failed')
const NOT_RUN = SOURCES.filter((source) => source.outcome === 'not-run')

for (const source of FAILED) {
  log(`${source.id}: FAILED at ${source.failedAt}. ${source.problems.join(' ')}`)
}

// Reconcile reads every source. A source that is not verified would leave its
// claims out of the requirements without anyone seeing it, so the run stops.
if (FAILED.length || NOT_RUN.length) {
  return stoppedResult(
    'sources-unverified',
    [
      ...(FAILED.length ? [`${FAILED.length} source(s) failed: ${FAILED.map((source) => `${source.id} at ${source.failedAt}`).join(', ')}`] : []),
      ...(NOT_RUN.length ? [`${NOT_RUN.length} source(s) left for a later launch: ${NOT_RUN.map((source) => source.id).join(', ')}`] : []),
      'Reconcile needs every source verified. Launch again: verified sources are skipped'
    ].join('. '),
    { sources: SOURCES, failed: FAILED.map((source) => source.id) }
  )
}

// ---------------------------------------------------------------------------
// Areas: the whole working set, then the plan that cuts reconcile into areas,
// then one working set per area. No agent reconciles the whole programme at
// once: an area is small enough for one reconciler to weigh every claim in it.
// ---------------------------------------------------------------------------
phase('Areas')

const WORKING_SET_SCHEMA = {
  type: 'object',
  required: ['ok', 'path', 'total', 'sources', 'unavailable', 'hasRequirements', 'hasConflicts', 'hasBacklog', 'problems', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    path: { type: 'string', description: 'result.path' },
    total: { type: 'integer' },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'rank', 'held', 'refuted', 'missed'],
        properties: {
          id: { type: 'string' },
          rank: { type: 'integer' },
          held: { type: 'integer' },
          refuted: { type: 'integer' },
          missed: { type: 'integer' }
        },
        additionalProperties: false
      }
    },
    unavailable: { ...STRINGS, description: 'The id of each entry in result.unavailable' },
    hasRequirements: { type: 'boolean' },
    hasConflicts: { type: 'boolean' },
    hasBacklog: { type: 'boolean' },
    problems: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const workingSetPrompt = (relayProblems) => `You are the WORKING SET step of the DISTIL workflow. Run commands and report what they print.
${RAILS}
1. \`${timCommand('distil working-set', '--write')}\`
${ENVELOPE_RULE}
   On success: ok is true. Copy result.path and result.total, every entry of result.sources (id, rank, held, refuted,
   missed), and the id of each entry of result.unavailable.
   On failure: ok is false, problems holds every problem line.
2. \`ls ${WORKAREA_TILDE} ${WORKAREA_TILDE}/distil\`. Report whether distil/requirements.json, distil/conflicts.json and
   backlog.json exist.${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`

const runWorkingSet = async (relayProblems) =>
  (await agent(workingSetPrompt(relayProblems), light({ label: relayLabel('working set', relayProblems ? 1 : 0), phase: 'Areas', schema: WORKING_SET_SCHEMA }))) ??
  { ...nothingBack('working set'), sources: [], unavailable: [] }

// Every verified source is in the working set, and its counts add up to the
// total: a relay that dropped a source would leave its claims unweighed.
const workingSetRelayProblems = (set) => {
  if (!set.ok) return []
  const listed = new Set([...set.sources.map((source) => source.id), ...set.unavailable])
  const missing = status.sources.map((source) => source.id).filter((id) => !listed.has(id))
  const counted = set.sources.reduce((total, source) => total + source.held + source.missed, 0)
  return [
    ...(missing.length ? [`the working set relayed no entry for ${missing.join(', ')}`] : []),
    ...(counted === set.total ? [] : [`the working set relayed sources holding ${counted} claims, but a total of ${set.total}`])
  ]
}

let workingSet = await runWorkingSet(null)
const workingSetProblems = workingSetRelayProblems(workingSet)
if (workingSetProblems.length) {
  log(`working set: ${workingSetProblems.join(' ')}. Asking again`)
  workingSet = await runWorkingSet(workingSetProblems)
}

if (!workingSet.ok) {
  return stoppedResult('working-set-failed', workingSet.problems.join(' ') || workingSet.summary, { sources: SOURCES })
}
if (workingSetRelayProblems(workingSet).length) {
  return stoppedResult('working-set-failed', `the working set was relayed wrong twice: ${workingSetRelayProblems(workingSet).join(' ')}`, { sources: SOURCES })
}
if (workingSet.unavailable.length) {
  return stoppedResult('sources-unverified', `tim distil working-set left out ${workingSet.unavailable.join(', ')}, which are not verified`, {
    sources: SOURCES
  })
}

const countsById = Object.fromEntries(workingSet.sources.map((source) => [source.id, source]))
const SOURCE_COUNTS = SOURCES.map((source) => {
  const counts = countsById[source.id]
  return counts
    ? { ...source, rank: counts.rank, claims: counts.held + counts.refuted, held: counts.held, refuted: counts.refuted, missed: counts.missed }
    : source
})
const HAD_BACKLOG = workingSet.hasBacklog
const HAD_REQUIREMENTS = workingSet.hasRequirements
const BACKLOG_ABS = `${WORKAREA_ABS}/backlog.json`
const AREAS_ABS = `${WORKAREA_ABS}/distil/areas.json`
const areaDirAbs = (areaId) => `${WORKAREA_ABS}/distil/areas/${areaId}`
const areaDirTilde = (areaId) => `${WORKAREA_TILDE}/distil/areas/${areaId}`

const AREA_LIST = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'title'],
    properties: { id: { type: 'string' }, title: { type: 'string' } },
    additionalProperties: false
  }
}

const AREA_PLAN_SCHEMA = {
  type: 'object',
  required: ['ok', 'areas', 'everyArea', 'decisions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil areas passed on your file' },
    areas: { ...AREA_LIST, description: 'Every area you wrote, in the order areas.json has them' },
    everyArea: { ...STRINGS, description: 'The source ids in everyArea' },
    decisions: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const areaPlanPrompt = (problems) => `You are the AREA PLAN step of the DISTIL workflow for the workarea ${WORKAREA}.
You write no requirement. You cut reconcile into areas, so that one reconciler per area weighs every claim about it in
full, from every source, today's included, rather than one reconciler skimming ${workingSet.total} claims.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/area-plan.md, then ${REFERENCES_ABS}/areas.schema.json.
READ: ${SOURCES_ABS}; every source's partition, \`${WORKAREA_TILDE}/distil/extract/<slug>.partition.json\` (each part's
title, scope and covers), listed with \`ls ${WORKAREA_TILDE}/distil/extract\`. The working set is at ${workingSet.path}
(${workingSet.total} claims), for claim id ranges where a part holds more than one area.
${HAD_REQUIREMENTS ? `${WORKAREA_ABS}/distil/requirements.json and conflicts.json already exist: this is a re-distil. Give every existing
requirement and conflict to exactly one area, the one its claims speak to.` : 'No requirements.json exists yet: every area owns no existing id.'}
THE FILE YOU WRITE: ${AREAS_ABS}. Nothing else.
CHECK, after every write: \`${timCommand('distil areas')}\`. It exits 1 and names every problem: a claim in no area, a
slice that names no part, an existing id in no area or in two. Fix each one and check again until it passes.${retryNote(problems, 'Writing the area working sets')}
Return the structured output only.`

const AREA_SETS_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems', 'areas', 'total', 'removed', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil areas --write exited 0' },
    problems: STRINGS,
    areas: {
      type: 'array',
      description: 'Every entry of result.areas: id and claims',
      items: {
        type: 'object',
        required: ['id', 'claims'],
        properties: { id: { type: 'string' }, claims: { type: 'integer' } },
        additionalProperties: false
      }
    },
    total: { type: 'integer', description: 'result.total' },
    removed: { ...STRINGS, description: 'result.removed, exactly' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const areaSetsPrompt = (relayProblems) => `You are the AREA WORKING SETS step of the DISTIL workflow. Run one command and report what it prints.
${RAILS}
\`${timCommand('distil areas', '--write')}\`
${ENVELOPE_RULE}
On success: ok is true. Copy the id and claims of every entry of result.areas, result.total, and result.removed. The
command itself wrote each area's working set and removed what an earlier reconcile left.
On failure: ok is false, areas and removed are [], total is 0, and problems holds every problem line.${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`

const runAreaSets = async (attempt, relayProblems) =>
  (await agent(
    areaSetsPrompt(relayProblems),
    light({ label: relayLabel(`area working sets${attempt > 0 ? ` ${attempt + 1}` : ''}`, relayProblems ? 1 : 0), phase: 'Areas', schema: AREA_SETS_SCHEMA })
  )) ?? { ...nothingBack('area working sets'), areas: [], total: 0, removed: [] }

// The relay must name exactly the areas the planner wrote, each with claims,
// adding up to its total. A dropped area would never be reconciled.
const areaSetsRelayProblems = (sets, planned) => {
  if (!sets.ok) return []
  const relayed = sets.areas.map((area) => area.id)
  const plannedIds = planned.map((area) => area.id)
  const counted = sets.areas.reduce((total, area) => total + area.claims, 0)
  return [
    ...(relayed.join(',') === plannedIds.join(',')
      ? []
      : [`the area working sets relayed the areas ${relayed.join(', ') || 'none'}, but the plan has ${plannedIds.join(', ')}`]),
    ...sets.areas.filter((area) => !(area.claims > 0)).map((area) => `the area working sets relayed ${area.claims} claims for ${area.id}`),
    ...(counted === sets.total ? [] : [`the area working sets relayed areas holding ${counted} claims, but a total of ${sets.total}`])
  ]
}

const planAreas = async () => {
  const decisions = []
  let problems = null
  for (let attempt = 0; attempt <= AREA_PLAN_RETRIES; attempt++) {
    const plan = await agent(
      areaPlanPrompt(problems),
      think({ label: attempt === 0 ? 'area plan' : `area plan retry ${attempt}`, phase: 'Areas', schema: AREA_PLAN_SCHEMA })
    )
    decisions.push(...(plan?.decisions ?? []))
    const planned = plan?.areas ?? []
    let sets = await runAreaSets(attempt, null)
    const relayProblems = areaSetsRelayProblems(sets, planned)
    if (relayProblems.length) {
      log(`area working sets: ${relayProblems.join(' ')}. Asking again`)
      sets = await runAreaSets(attempt, relayProblems)
    }
    problems = sets.ok
      ? areaSetsRelayProblems(sets, planned)
      : sets.problems.length
        ? sets.problems
        : [`tim distil areas --write failed without naming a problem: ${sets.summary}`]
    if (!problems.length && planned.length) return { areas: planned, sets, decisions }
    if (!planned.length && !problems.length) problems = ['the area plan agent returned no areas']
  }
  return { problems, decisions }
}

const AREA_PLAN = await planAreas()
if (AREA_PLAN.problems) {
  return stoppedResult('areas-failed', `distil/areas.json still has problems after ${AREA_PLAN_RETRIES} retry: ${AREA_PLAN.problems.join(' ')}`, {
    sources: SOURCE_COUNTS
  })
}
const AREAS = AREA_PLAN.areas
const claimsInArea = Object.fromEntries(AREA_PLAN.sets.areas.map((area) => [area.id, area.claims]))
log(`${AREAS.length} areas, reconciled ${THINK_FAN_OUT} at a time: ${AREAS.map((area) => `${area.id} (${claimsInArea[area.id]} claims)`).join(', ')}`)

// ---------------------------------------------------------------------------
// Reconcile: one think-tier agent per area, then tim merges the areas, then
// one cross-area pass merges duplicates and settles cross-area conflicts,
// checked by tim distil coverage and sent back with its problems.
// ---------------------------------------------------------------------------
phase('Reconcile')

const AREA_RECONCILE_SCHEMA = {
  type: 'object',
  required: ['ok', 'requirements', 'conflicts', 'questions', 'decisions', 'goalConflicts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil merge-reconcile --area passed on your file' },
    requirements: { type: 'integer' },
    conflicts: { type: 'integer' },
    questions: { type: 'integer' },
    decisions: STRINGS,
    goalConflicts: {
      ...STRINGS,
      description: "One line per ruling that contradicts sources.json's goal: the ruling, and what the goal should now say. [] when none does"
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

// A plain reading that one environment cannot meet is a question, never an
// adopted requirement. The same line goes to every reconciler.
const PLAIN_READING_RULE = `WHERE A SOURCE OR RULING CANNOT BE MET AS WRITTEN in some part of the target (an environment, a repo, a journey or
a stage), or two readings of it would build different things, make it a question with a default that says what each
part gets. Never adopt one plain reading for every part.`

// Questions are minimal by default: precedence and the rulings settle every
// difference they can, and a blocker outside the programme is never a
// question. The challenge step enforces it; every reconciler is told it.
const MINIMAL_QUESTIONS_RULE = `QUESTIONS ARE MINIMAL BY DEFAULT. Settle every difference precedence or a ruling settles, as precedence. A difference
that waits on somebody outside the programme (a platform change, access, a ticket) is never a question: adopt it with
blockedBy. Raise a question only where neither precedence nor any ruling settles it. A challenge step tries to settle
every question you raise.`

const WEIGH_TODAY_RULE = `WEIGH EVERY CLAIM FROM A TODAY SOURCE (the target repos, traces of the real services, the tests repo). Each delta
(new, change or exists) cites the claims that show today's behaviour. Keep copy, option, hint and error differences at
their real granularity: one requirement per difference a user can see, never a summary of them.`

let GOAL_CONFLICTS = []
const noteGoalConflicts = (answer) => {
  GOAL_CONFLICTS = [...new Set([...GOAL_CONFLICTS, ...(answer?.goalConflicts ?? []).filter(isText)])]
}

const areaReconcilePrompt = (area, problems) => `You are an AREA RECONCILE step of the DISTIL workflow for the workarea ${WORKAREA}: area ${area.id}, ${area.title}.
You weigh every claim in this area's working set, from every source, and write the area's requirements and conflicts.
Another reconciler does each other area; a cross-area pass joins them after you.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/reconcile.md, then ${REFERENCES_ABS}/reconcile-part.schema.json,
${REFERENCES_ABS}/requirements.schema.json and ${REFERENCES_ABS}/conflicts.schema.json.
READ: ${SOURCES_ABS}; your area in ${AREAS_ABS} (\`jq '.areas[] | select(.id == "${area.id}")' ${WORKAREA_TILDE}/distil/areas.json\`);
YOUR WORKING SET, every claim of it (${claimsInArea[area.id]} claims, in pages if you need to): ${areaDirAbs(area.id)}/working-set.json.
${HAD_REQUIREMENTS ? `This is a re-distil: the working set's "owns" lists the existing requirement and conflict ids this area keeps. Read
each in ${WORKAREA_ABS}/distil/requirements.json and conflicts.json, and keep every one of them, id unchanged.` : 'This is a first reconcile: your area owns no existing id.'}
NEW IDS: req-${area.id}-001, req-${area.id}-002 and on; c-${area.id}-001 and on. tim numbers them when it merges the areas.
THE FILE YOU WRITE: ${areaDirAbs(area.id)}/reconciled.json, with "area": "${area.id}". Nothing else.
${WEIGH_TODAY_RULE}
${MINIMAL_QUESTIONS_RULE}
${PLAIN_READING_RULE}
CHECK, after every write: \`${timCommand('distil merge-reconcile', `--area ${area.id}`)}\`. It exits 1 and names every
problem. Fix each one and check again until it passes.${retryNote(problems, 'Merging the areas')}
Return the structured output only.`

const runAreaReconcile = (area, problems, attempt) =>
  agent(
    areaReconcilePrompt(area, problems),
    think({ label: `reconcile ${area.id}${attempt > 0 ? ` retry ${attempt}` : ''}`, phase: 'Reconcile', schema: AREA_RECONCILE_SCHEMA })
  )

const MERGE_RECONCILE_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems', 'areas', 'requirements', 'conflicts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil merge-reconcile exited 0' },
    problems: STRINGS,
    areas: { ...STRINGS, description: 'The id of every entry of result.areas, in order' },
    requirements: { type: 'integer', description: 'result.requirements. 0 on failure' },
    conflicts: { type: 'integer', description: 'result.conflicts. 0 on failure' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const mergeReconcilePrompt = (relayProblems) => `You are the MERGE RECONCILE step of the DISTIL workflow. Run one command and report what it prints.
${RAILS}
\`${timCommand('distil merge-reconcile')}\`
${ENVELOPE_RULE}
On success: ok is true. Copy the id of every entry of result.areas, result.requirements and result.conflicts.
On failure: ok is false, areas is [], requirements and conflicts are 0, and problems holds every problem line.${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`

const runMergeReconcile = async (attempt, relayProblems) =>
  (await agent(
    mergeReconcilePrompt(relayProblems),
    light({ label: relayLabel(`merge areas${attempt > 0 ? ` ${attempt + 1}` : ''}`, relayProblems ? 1 : 0), phase: 'Reconcile', schema: MERGE_RECONCILE_SCHEMA })
  )) ?? { ...nothingBack('merge areas'), areas: [], requirements: 0, conflicts: 0 }

const mergeRelayProblems = (merged) =>
  merged.ok && merged.areas.join(',') !== AREAS.map((area) => area.id).join(',')
    ? [`the merge relayed the areas ${merged.areas.join(', ') || 'none'}, but the plan has ${AREAS.map((area) => area.id).join(', ')}`]
    : []

// Which areas to reconcile again: the ones whose agent failed or that a
// merge problem names; failing that, every one.
const areasToRedo = (answers, failed) => {
  const named = AREAS.filter(
    (area, index) => !answers[index]?.ok || failed.problems.some((problem) => problem.includes(`distil/areas/${area.id}/`))
  )
  return named.length ? named : AREAS
}

const mergeAreas = async (attempt) => {
  let merged = await runMergeReconcile(attempt, null)
  const relayProblems = mergeRelayProblems(merged)
  if (relayProblems.length) {
    log(`merge areas: ${relayProblems.join(' ')}. Asking again`)
    merged = await runMergeReconcile(attempt, relayProblems)
    const still = mergeRelayProblems(merged)
    if (still.length) return { ...merged, ok: false, problems: still }
  }
  return merged
}

const reconcileAreas = async () => {
  let answers = await inBatches(AREAS, THINK_FAN_OUT, (area) => runAreaReconcile(area, null, 0))
  let merged = await mergeAreas(0)
  for (let retry = 1; !merged.ok && retry <= AREA_RETRIES; retry++) {
    const redo = areasToRedo(answers, merged)
    log(`merge areas: ${merged.problems.length} problem(s); reconciling ${redo.map((area) => area.id).join(', ')} again`)
    const redone = await inBatches(redo, THINK_FAN_OUT, (area) => runAreaReconcile(area, merged.problems, retry))
    answers = AREAS.map((area, index) => {
      const at = redo.indexOf(area)
      return at === -1 ? answers[index] : redone[at]
    })
    merged = await mergeAreas(retry)
  }
  answers.forEach(noteGoalConflicts)
  return { merged, answers }
}

const AREA_RECONCILE = await reconcileAreas()
if (!AREA_RECONCILE.merged.ok) {
  return stoppedResult(
    'reconcile-failed',
    `tim distil merge-reconcile still names ${AREA_RECONCILE.merged.problems.length} problem(s) after ${AREA_RETRIES} retry: ${AREA_RECONCILE.merged.problems.join(' ')}`,
    { sources: SOURCE_COUNTS, goalConflicts: GOAL_CONFLICTS }
  )
}
let RECONCILE_DECISIONS = AREA_RECONCILE.answers.flatMap((answer, index) =>
  (answer?.decisions ?? []).map((decision) => `${AREAS[index].id}: ${decision}`)
)

// tim distil coverage checks the backlog too, once one exists, and scopes each
// problem: reconcile or backlog. On a re-distil the reconciler cannot fix a
// backlog problem, so those go to the consolidator.
const COVERAGE_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems', 'backlogProblems', 'questions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil coverage exited 0' },
    problems: { ...STRINGS, description: 'The message of every entry of errors[0].problems whose scope is reconcile' },
    backlogProblems: { ...STRINGS, description: 'The message of every entry of errors[0].problems whose scope is backlog' },
    requirements: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        adopted: { type: 'integer' },
        question: { type: 'integer' },
        outOfScope: { type: 'integer' },
        new: { type: 'integer' },
        change: { type: 'integer' },
        exists: { type: 'integer' }
      },
      additionalProperties: false
    },
    conflicts: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        precedence: { type: 'integer' },
        question: { type: 'integer' }
      },
      additionalProperties: false
    },
    questions: {
      type: 'array',
      description: 'Every entry of result.questions. [] on failure',
      items: {
        type: 'object',
        required: ['id', 'question', 'default'],
        properties: {
          id: { type: 'string' },
          about: { type: 'string' },
          question: { type: 'string' },
          default: { type: 'string' },
          requirements: STRINGS
        },
        additionalProperties: false
      }
    },
    blocked: {
      type: 'array',
      description: 'Every entry of result.blocked',
      items: {
        type: 'object',
        required: ['id', 'blockedBy'],
        properties: { id: { type: 'string' }, blockedBy: { type: 'string' } },
        additionalProperties: false
      }
    },
    sourceUsage: {
      type: 'array',
      description: 'Every entry of result.sources: id, claims and cited',
      items: {
        type: 'object',
        required: ['id', 'claims', 'cited'],
        properties: { id: { type: 'string' }, claims: { type: 'integer' }, cited: { type: 'integer' } },
        additionalProperties: false
      }
    },
    backlogIncrements: { type: 'integer' },
    backlogCovered: { type: 'integer' },
    backlogCheckOk: { type: 'boolean', description: 'true when tim backlog check exited 0' },
    backlogCheckProblems: STRINGS,
    backlogTotal: { type: 'integer' },
    backlogByStatus: { type: 'object', additionalProperties: { type: 'integer' } },
    snapshotOk: { type: 'boolean', description: 'true when tim distil backlog-snapshot exited 0' },
    snapshotProblems: { ...STRINGS, description: 'On a failed snapshot, every problem line' },
    rowCount: { type: 'integer', description: 'result.rows from the snapshot' },
    removed: { ...STRINGS, description: 'result.compared.removed from the snapshot, exactly' },
    changed: { ...STRINGS, description: 'result.compared.changed from the snapshot, exactly' },
    splitOffBefore: {
      type: 'array',
      description: 'Every entry of result.splitOff from the snapshot, exactly: the themes split off early',
      items: {
        type: 'object',
        required: ['theme', 'branch', 'requirements'],
        properties: {
          theme: { type: 'string' },
          branch: { type: 'string' },
          workarea: { type: 'string' },
          touches: STRINGS,
          requirements: STRINGS,
          pickUp: STRINGS
        },
        additionalProperties: false
      }
    },
    splitOffChanged: { ...STRINGS, description: 'result.compared.splitOffChanged from the snapshot, exactly' },
    backlogCoveredBySplitOff: { type: 'integer' },
    splitOff: {
      type: 'array',
      description: 'Every entry of result.backlog.splitOff from tim distil coverage, exactly. [] on failure or with none',
      items: {
        type: 'object',
        required: ['theme', 'branch', 'pickUp', 'changed', 'noLongerToBuild'],
        properties: {
          theme: { type: 'string' },
          branch: { type: 'string' },
          workarea: { type: 'string' },
          backlog: { type: 'string' },
          requirements: STRINGS,
          pickUp: STRINGS,
          changed: STRINGS,
          noLongerToBuild: STRINGS,
          nowInPlace: STRINGS,
          fingerprintsNow: { type: 'object', additionalProperties: { type: 'string' } }
        },
        additionalProperties: false
      }
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

// The backlog's rows, held by tim: --save before the consolidator runs,
// --compare-to after it, which names every row removed and every row built or
// set aside (any status but todo or blocked) that changed. No agent copies a hash.
const SNAPSHOT_TAG = 'before'
const snapshotStep = (step, mode) => {
  const flag = mode === 'save' ? `--save ${SNAPSHOT_TAG}` : `--compare-to ${SNAPSHOT_TAG}`
  const copy =
    mode === 'save'
      ? 'copy result.rows into rowCount, and every entry of result.splitOff into splitOffBefore, exactly'
      : 'copy result.rows into rowCount, and result.compared.removed, result.compared.changed and\n   result.compared.splitOffChanged into removed, changed and splitOffChanged, exactly'
  return `${step}. \`${timCommand('distil backlog-snapshot', flag)}\`
   On success: snapshotOk is true; ${copy}.
   On failure: snapshotOk is false, and snapshotProblems holds every problem line.`
}

const coveragePrompt = ({ backlogCheck, snapshot, relayProblems }) => {
  const backlogStep = backlogCheck
    ? `
2. \`${timCommand('backlog check')}\`
   On success: backlogCheckOk is true; copy result.total into backlogTotal and result.counts into backlogByStatus.
   On failure: backlogCheckOk is false, and backlogCheckProblems holds every problem line.`
    : ''
  const snapshotLine = snapshot ? `\n${snapshotStep(backlogCheck ? 3 : 2, snapshot)}` : ''
  return `You are a COVERAGE CHECK step of the DISTIL workflow. Run commands and report what they print. Run every step,
whatever an earlier one printed.
${RAILS}
1. \`${timCommand('distil coverage')}\`
${ENVELOPE_RULE}
   On success: ok is true, and problems and backlogProblems are []. Copy result.requirements (total; byStatus adopted,
   question and out-of-scope, the last as outOfScope; byDelta new, change and exists), result.conflicts (total,
   precedence, question), every entry of result.questions (id, about, question, default, requirements), every entry of
   result.blocked into blocked, every entry of result.sources into sourceUsage (id, claims, cited), and, when
   result.backlog is not null, its increments, covered and coveredBySplitOff as backlogIncrements, backlogCovered and
   backlogCoveredBySplitOff, and every entry of its splitOff into splitOff.
   On failure: ok is false and questions is []. errors[0].problems lists every problem with its scope. Copy the message
   of each one whose scope is reconcile into problems, and of each one whose scope is backlog into backlogProblems,
   exactly.${backlogStep}${snapshotLine}${relayRetryNote(relayProblems)}
Change nothing yourself. Return the structured output only.`
}

// On success the questions copied must be as many as coverage counted: the
// challenge step works through exactly that list.
const coverageRelayProblems = (checked) => {
  if (!checked.ok) return []
  const counted = checked.conflicts?.question
  return Number.isInteger(counted) && counted === (checked.questions ?? []).length
    ? []
    : [`the coverage check relayed ${(checked.questions ?? []).length} questions, but counted ${JSON.stringify(counted)} question conflicts`]
}

const runCoverage = async ({ label, phaseName, backlogCheck, snapshot }) => {
  const ask = async (relayProblems) =>
    (await agent(
      coveragePrompt({ backlogCheck, snapshot, relayProblems }),
      light({ label: relayLabel(label, relayProblems ? 1 : 0), phase: phaseName, schema: COVERAGE_SCHEMA })
    )) ?? { ...nothingBack('coverage check'), backlogProblems: [], questions: [] }
  const checked = await ask(null)
  const relayProblems = coverageRelayProblems(checked)
  if (!relayProblems.length) return checked
  log(`${label}: ${relayProblems.join(' ')}. Asking again`)
  const again = await ask(relayProblems)
  const still = coverageRelayProblems(again)
  return still.length ? { ...again, ok: false, problems: still, backlogProblems: [] } : again
}

const CROSS_AREA_SCHEMA = {
  type: 'object',
  required: ['ok', 'requirements', 'conflicts', 'questions', 'merged', 'decisions', 'goalConflicts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when the check names no problem about requirements, conflicts or claims' },
    requirements: { type: 'integer' },
    conflicts: { type: 'integer' },
    questions: { type: 'integer' },
    merged: { ...STRINGS, description: 'One line per duplicate merged across areas: the id kept and the ids folded into it' },
    decisions: STRINGS,
    goalConflicts: {
      ...STRINGS,
      description: "One line per ruling that contradicts sources.json's goal: the ruling, and what the goal should now say. [] when none does"
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const consolidatorSentBack = (problems) => `
THE CONSOLIDATOR SENT THESE BACK: it could not write an acceptance criterion that every environment its row names can
observe. Settle each one as a question with a default that says what each part gets, or reword the requirement:
${problemList(problems)}`

const coverageSentBack = (problems) => `
THIS IS A SEND-BACK. The coverage check found these problems. Fix every one:
${problemList(problems)}`

const crossAreaPrompt = ({ problems, fromConsolidator }) => {
  const sendBack = problems ? (fromConsolidator ? consolidatorSentBack(problems) : coverageSentBack(problems)) : ''
  return `You are the CROSS-AREA RECONCILE step of the DISTIL workflow for the workarea ${WORKAREA}.
${AREAS.length} area reconcilers each weighed their own area's claims in full, and tim merged their files. You work
across the areas: the duplicates two areas both wrote, the conflicts that span areas, and what coverage finds.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/reconcile.md (its "Across areas" section is your method), then
${REFERENCES_ABS}/requirements.schema.json and ${REFERENCES_ABS}/conflicts.schema.json.
READ: ${SOURCES_ABS}; ${AREAS_ABS}; ${WORKAREA_ABS}/distil/requirements.json and conflicts.json, which the merge wrote;
${WORKAREA_ABS}/distil/areas/id-map.json, which says which area each id came from. The whole working set is at
${workingSet.path} (${workingSet.total} claims), for any claim a cross-area requirement needs.
${HAD_REQUIREMENTS ? 'This is a re-distil: requirements and conflicts existed before this run. Keep every existing id.' : 'This is a first reconcile: every id is new this run.'}
THE FILES YOU WRITE: ${WORKAREA_ABS}/distil/requirements.json and ${WORKAREA_ABS}/distil/conflicts.json. Nothing else.
${WEIGH_TODAY_RULE}
${MINIMAL_QUESTIONS_RULE}
${PLAIN_READING_RULE}
CHECK: \`${timCommand('distil coverage')}\`. Fix every problem it names about requirements, conflicts, claims, sources or
challenge verdicts, and check again until it names none. A problem about backlog.json or an increment is the
consolidator's: leave it.${sendBack}
Return the structured output only.`
}

const reconcileProblemsOf = (checked) => {
  if (checked.ok) return []
  if (checked.problems.length) return checked.problems
  if ((checked.backlogProblems ?? []).length) return []
  return [`tim distil coverage failed without naming a problem: ${checked.summary}`]
}

// Round 1 is the first reconcile and consolidate. Round 2 runs only when the
// consolidator sends requirements back, and its labels say so.
const RECONCILE_ROUNDS = 2
const roundLabel = (label, round) => (round === 1 ? label : `${label}, round ${round}`)

// One think-tier step and its coverage check, sent back with the problems up
// to SEND_BACKS times. The cross-area pass and the challenge's apply step
// both run this way.
const runChecked = async ({ prompt, label, phaseName, schema, round, sentBack, snapshot }) => {
  let answer = null
  let check = null
  let problems = sentBack
  const answers = []
  for (let attempt = 0; attempt <= SEND_BACKS; attempt++) {
    answer = await agent(
      prompt({ problems, attempt }),
      think({ label: roundLabel(attempt === 0 ? label : `${label} send-back ${attempt}`, round), phase: phaseName, schema })
    )
    answers.push(answer)
    noteGoalConflicts(answer)
    check = await runCoverage({
      label: roundLabel(`coverage after ${label}${attempt === 0 ? '' : ` ${attempt + 1}`}`, round),
      phaseName,
      backlogCheck: false,
      snapshot
    })
    problems = reconcileProblemsOf(check)
    if (problems.length === 0) break
    log(`${label}: ${problems.length} problem(s) after attempt ${attempt + 1}${round === 1 ? '' : `, round ${round}`}`)
  }
  return { answer, answers, check, problems }
}

const runCrossArea = ({ round, sentBack }) =>
  runChecked({
    prompt: ({ problems, attempt }) => crossAreaPrompt({ problems, fromConsolidator: attempt === 0 && round > 1 }),
    label: 'reconcile across areas',
    phaseName: 'Reconcile',
    schema: CROSS_AREA_SCHEMA,
    round,
    sentBack,
    snapshot: round === 1 && HAD_BACKLOG ? 'save' : null
  })

// ---------------------------------------------------------------------------
// Challenge: one think-tier agent per question conflict tries to settle it
// from precedence and every ruling, and writes its verdict. One apply step
// rewrites the settled ones, and tim distil coverage checks each verdict was
// applied. Only the questions no rule settles survive to the report.
// ---------------------------------------------------------------------------
const CHALLENGE_VERDICT_SCHEMA = {
  type: 'object',
  required: ['ok', 'conflict', 'verdict', 'rule', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil challenge --conflict passed on your file' },
    conflict: { type: 'string' },
    verdict: { type: 'string', enum: ['precedence', 'blocked', 'question'] },
    rule: { type: 'string', description: 'The rule you applied, as your file says it' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const challengePrompt = (question, problems) => `You are a CHALLENGE step of the DISTIL workflow for the workarea ${WORKAREA}: conflict ${question.id}.
The reconcilers raised it as a question for a person. Questions are minimal by default: you try to settle it from
precedence and every ruling, and it stays a question only when nothing settles it.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/question-challenge.md, then ${REFERENCES_ABS}/challenge.schema.json.
READ: ${SOURCES_ABS} (its precedence, and every ruling source's role); the conflict and the requirements that cite it
(\`jq '.conflicts[] | select(.id == "${question.id}")' ${WORKAREA_TILDE}/distil/conflicts.json\`, then each of
${(question.requirements ?? []).join(', ') || 'the requirements citing it'} in ${WORKAREA_TILDE}/distil/requirements.json); every claim its positions rest on, and
every ruling source's claims, in the working set at ${workingSet.path}.
THE QUESTION: ${question.question}
ITS DEFAULT: ${question.default}
THE FILE YOU WRITE: ${WORKAREA_ABS}/distil/challenge/${question.id}.json. Nothing else: the apply step rewrites the
conflict and its requirements from your verdict.
CHECK, after every write: \`${timCommand('distil challenge', `--conflict ${question.id}`)}\`. It exits 1 and names every
problem. Fix each one and check again until it passes.${retryNote(problems, 'Checking your verdict')}
Return the structured output only.`

const runChallenger = async (question) => {
  let answer = await agent(challengePrompt(question, null), think({ label: `challenge ${question.id}`, phase: 'Challenge', schema: CHALLENGE_VERDICT_SCHEMA }))
  for (let retry = 1; !answer?.ok && retry <= CHALLENGE_RETRIES; retry++) {
    answer = await agent(
      challengePrompt(question, [answer ? `your verdict did not pass its check: ${answer.summary}` : 'the challenger returned nothing']),
      think({ label: `challenge ${question.id} retry ${retry}`, phase: 'Challenge', schema: CHALLENGE_VERDICT_SCHEMA })
    )
  }
  return answer?.ok ? { ...answer, conflict: question.id } : { conflict: question.id, verdict: 'question', rule: 'the challenge could not be completed', ok: false }
}

const APPLY_SCHEMA = {
  type: 'object',
  required: ['ok', 'applied', 'decisions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil coverage names no problem about requirements, conflicts or verdicts' },
    applied: { ...STRINGS, description: 'One line per verdict applied: the conflict id and what changed' },
    decisions: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const unfinishedNote = (unfinished) =>
  unfinished.length
    ? `
THESE CHALLENGES DID NOT FINISH: ${unfinished.map((verdict) => verdict.conflict).join(', ')}. Each stays a question. Where its
verdict file exists but does not pass \`${timCommand('distil challenge', '--conflict <id>')}\`, rewrite it as a "question"
verdict that passes, with "why" saying the challenge did not finish.`
    : ''

const applyPrompt = (verdicts, unfinished) => ({ problems }) => `You are the APPLY CHALLENGES step of the DISTIL workflow for the workarea ${WORKAREA}.
Challengers settled ${verdicts.length} question${verdicts.length === 1 ? '' : 's'} from precedence and the rulings. You
rewrite each settled conflict and the requirements that cite it to match its verdict.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/question-challenge.md (its "Applying the verdicts" section is your method), then
${REFERENCES_ABS}/challenge.schema.json, ${REFERENCES_ABS}/requirements.schema.json and ${REFERENCES_ABS}/conflicts.schema.json.
THE VERDICTS TO APPLY, each in ${WORKAREA_ABS}/distil/challenge/<conflict id>.json:
${verdicts.map((verdict) => `- ${verdict.conflict}: ${verdict.verdict}. ${verdict.rule}`).join('\n') || '- none'}${unfinishedNote(unfinished)}
THE FILES YOU WRITE: ${WORKAREA_ABS}/distil/requirements.json and ${WORKAREA_ABS}/distil/conflicts.json, and only the
unfinished verdict files named above. Nothing else.
CHECK: \`${timCommand('distil coverage')}\`. It checks every verdict was applied. Fix every problem it names about
requirements, conflicts, claims or verdicts, and check again until it names none.${problems ? coverageSentBack(problems) : ''}
Return the structured output only.`

const challengeQuestions = async ({ round, questions }) => {
  if (!questions.length) return { verdicts: [], check: null, problems: [], decisions: [] }
  log(`challenge${round === 1 ? '' : `, round ${round}`}: ${questions.length} question(s), ${THINK_FAN_OUT} at a time`)
  const verdicts = (await inBatches(questions, THINK_FAN_OUT, (question) => runChallenger(question))).map(
    (verdict, index) => verdict ?? { conflict: questions[index].id, verdict: 'question', rule: 'the challenger returned nothing', ok: false }
  )
  const settling = verdicts.filter((verdict) => verdict.ok && verdict.verdict !== 'question')
  const unfinished = verdicts.filter((verdict) => !verdict.ok)
  if (!settling.length && !unfinished.length) return { verdicts, check: null, problems: [], decisions: [] }
  const applied = await runChecked({
    prompt: applyPrompt(settling, unfinished),
    label: 'apply challenges',
    phaseName: 'Challenge',
    schema: APPLY_SCHEMA,
    round,
    sentBack: null,
    snapshot: null
  })
  return {
    verdicts,
    check: applied.check,
    problems: applied.problems,
    decisions: applied.answers.filter(Boolean).flatMap((answer) => [...(answer.applied ?? []), ...(answer.decisions ?? [])])
  }
}

const CHALLENGE_LOG = []

const reconcileRound = async ({ round, sentBack }) => {
  phase('Reconcile')
  const crossed = await runCrossArea({ round, sentBack })
  RECONCILE_DECISIONS = [
    ...RECONCILE_DECISIONS,
    ...crossed.answers.filter(Boolean).flatMap((answer) => [...(answer.merged ?? []).map((line) => `merged: ${line}`), ...(answer.decisions ?? [])])
  ]
  if (crossed.problems.length) return { failed: 'reconcile-failed', problems: crossed.problems, check: crossed.check }
  phase('Challenge')
  const stillStanding = new Set(CHALLENGE_LOG.filter((verdict) => verdict.verdict === 'question').map((verdict) => verdict.conflict))
  const challenged = await challengeQuestions({
    round,
    questions: (crossed.check.questions ?? []).filter((question) => !stillStanding.has(question.id))
  })
  CHALLENGE_LOG.push(...challenged.verdicts)
  RECONCILE_DECISIONS = [...RECONCILE_DECISIONS, ...challenged.decisions]
  if (challenged.problems.length) return { failed: 'challenge-failed', problems: challenged.problems, check: challenged.check }
  return { check: challenged.check ?? crossed.check, snapshotCheck: crossed.check }
}

const stopAfterRound = (outcome, round) =>
  stoppedResult(
    outcome.failed,
    `tim distil coverage still names ${outcome.problems.length} problem(s) after ${SEND_BACKS} send-backs${round === 1 ? '' : `, round ${round}`}: ${outcome.problems.join(' ')}`,
    { sources: SOURCE_COUNTS, goalConflicts: GOAL_CONFLICTS }
  )

let roundOutcome = await reconcileRound({ round: 1, sentBack: null })
if (roundOutcome.failed) return stopAfterRound(roundOutcome, 1)
let reconcileCheck = roundOutcome.check

// The cross-area pass's coverage checks save the backlog's rows; the
// challenge's own checks never touch the snapshot.
if (HAD_BACKLOG && roundOutcome.snapshotCheck.snapshotOk !== true) {
  return stoppedResult(
    'snapshot-failed',
    `backlog.json exists, but tim distil backlog-snapshot could not save its rows, so the consolidator could not be held to them: ${(roundOutcome.snapshotCheck.snapshotProblems ?? []).join(' ') || roundOutcome.snapshotCheck.summary}`,
    { sources: SOURCE_COUNTS }
  )
}

// The themes split off early, as the snapshot saved them before consolidate.
// Each lives only on its own branch: the consolidator carries its pointer over
// and drafts no row for anything it holds or that falls in its code.
const SPLIT_OFF = HAD_BACKLOG ? (roundOutcome.snapshotCheck.splitOffBefore ?? []) : []

// ---------------------------------------------------------------------------
// Consolidate: one think-tier agent per area drafts that area's rows, then
// one combiner orders and combines them into backlog.json and assigns themes,
// checked by tim backlog check and tim distil coverage, with the rows built or
// set aside held fixed on a re-distil.
// ---------------------------------------------------------------------------
phase('Consolidate')

const OBSERVABLE_RULE = `EVERY ACCEPTANCE CRITERION CAN BE OBSERVED in every environment its row names. Never write one that cannot. Put the
requirement in reconcileProblems instead: the workflow sends it back to the reconciler.`

const DRAFT_OBSERVABLE_RULE = `EVERY ACCEPTANCE CRITERION CAN BE OBSERVED in every environment its row names. Never write one that cannot: put the
requirement in the draft's "unobservable" list with the environment and why, and the combiner sends it back.`

const DRAFT_SCHEMA = {
  type: 'object',
  required: ['ok', 'rows', 'requirements', 'decisions', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when your rows file is written and covers every requirement your area has to build' },
    rows: { type: 'integer', description: 'How many draft rows you wrote' },
    requirements: { type: 'integer', description: 'How many requirements to build they cover' },
    decisions: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const splitOffList = SPLIT_OFF.map(
  (theme) =>
    `- ${theme.theme}, on ${theme.branch}: touches ${(theme.touches ?? []).join(', ') || 'the code its pointer names'}; holds ${[...(theme.requirements ?? []), ...(theme.pickUp ?? [])].join(', ') || 'no requirement'}`
).join('\n')

const draftSplitOffNote = SPLIT_OFF.length
  ? `
THEMES SPLIT OFF EARLY. These left backlog.json and build on their own branches:
${splitOffList}
Draft no row for a requirement one of them holds: result.areas[0].splitOff lists yours, and toBuild leaves them out.
A requirement in toBuild whose code falls in one of their touches is that branch's to build too: draft no row for it,
and list it in rows.json's "splitOff" as { "requirement", "theme", "why" }, as the brief's "Themes split off early"
section says.`
  : ''

const draftPrompt = (area) => `You are a ROW DRAFT step of the DISTIL workflow for the workarea ${WORKAREA}: area ${area.id}, ${area.title}.
You draft the backlog rows for this area's requirements, and the code each one touches. One combiner joins every
area's drafts into backlog.json after you.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/consolidate.md (its "Drafting an area's rows" section is your method),
${REFERENCES_ABS}/backlog.schema.json and ${REFERENCES_ABS}/SHAPE.md.
YOUR REQUIREMENTS: \`${timCommand('distil areas', `--area ${area.id}`)}\` gives result.areas[0].toBuild, the requirements
still to build that came from your area, and result.areas[0].reconciled, all of them. Read each in
${WORKAREA_ABS}/distil/requirements.json, with its conflicts in conflicts.json.
READ: ${SOURCES_ABS}; this area's working set at ${areaDirAbs(area.id)}/working-set.json, for the claims that show
which repo files and feature folders each requirement touches.${HAD_BACKLOG ? `
${BACKLOG_ABS} already exists: name the existing row each requirement already sits in, as the brief says.` : ''}${draftSplitOffNote}
THE FILE YOU WRITE: ${areaDirAbs(area.id)}/rows.json (in Bash: ${areaDirTilde(area.id)}/rows.json). Nothing else.
${DRAFT_OBSERVABLE_RULE}
Return the structured output only.`

const runDraft = (area) =>
  agent(draftPrompt(area), think({ label: `draft rows ${area.id}`, phase: 'Consolidate', schema: DRAFT_SCHEMA }))

const CONSOLIDATE_SCHEMA = {
  type: 'object',
  required: ['ok', 'increments', 'themes', 'decisions', 'reconcileProblems', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim backlog check and tim distil coverage both pass' },
    increments: { type: 'integer' },
    themes: { type: 'integer', description: 'How many themes the envelope has. 0 without a themes rule' },
    decisions: STRINGS,
    reconcileProblems: {
      ...STRINGS,
      description:
        'One line per requirement no acceptance criterion can meet in every environment its row names: the requirement id, the environment, and why. [] when there is none'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const repoKeysNote = `Check each repo's GitHub slug with \`git -C ${TILDE}/<path> remote get-url origin\`, one call per repo in sources.json.`

const existingBacklogNote = (round) => {
  if (HAD_BACKLOG) {
    return `${BACKLOG_ABS} already exists: this is a re-distil. Keep every row id and remove no row. Rewrite todo and
blocked rows to the requirements as they stand now; a blocked row whose blocker a ruling removed becomes todo. Never
change a row with any other status. The workflow compares every such row before and after you. A changed or removed
row comes back to you as a problem to put right, and the run stops if it is still wrong after ${SEND_BACKS} send-backs.`
  }
  return round === 1 ? `${BACKLOG_ABS} does not exist yet.` : `${BACKLOG_ABS} is the first pass from this run. Rewrite any row in it.`
}

const combineSplitOffNote = SPLIT_OFF.length
  ? `
THEMES SPLIT OFF EARLY. These left backlog.json and build on their own branches:
${splitOffList}
Carry backlog.json's "splitOff" over unchanged: never remove a pointer or change any of its fields but "pickUp". Never
put a split-off theme back in "themes", give a row its theme, or reuse the id of a row that moved with it. Draft no row
for a requirement a pointer holds in "requirements" or "pickUp". A new or changed requirement whose code falls in a
split-off theme's touches (each draft's "splitOff" lists the ones its drafter found) gets no row here: add its id to
that pointer's "pickUp", and the report hands it to that branch. The workflow compares every pointer before and after
you.`
  : ''

const reconcilerAnswered = (answered) =>
  answered.length
    ? `
THE RECONCILER HAS SETTLED THE REQUIREMENTS YOU SENT BACK. Rewrite the rows they touch to the requirements and
conflicts as they stand now:
${problemList(answered)}`
    : ''

const consolidatePrompt = ({ problems, round, answered }) => {
  const sendBack = problems
    ? `
THIS IS A SEND-BACK. The checks found these problems. Fix every one:
${problemList(problems)}`
    : ''
  return `You are the COMBINE step of the DISTIL workflow for the workarea ${WORKAREA}.
One drafter per area wrote that area's rows. You combine them into backlog.json: merge rows that repeat the same
set-up, order them, give every one its id, and draw the themes.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/consolidate.md, ${REFERENCES_ABS}/backlog.schema.json and ${REFERENCES_ABS}/SHAPE.md.
READ: ${SOURCES_ABS}, ${WORKAREA_ABS}/distil/requirements.json and ${WORKAREA_ABS}/distil/conflicts.json; every area's
draft, ${AREAS.map((area) => `${areaDirAbs(area.id)}/rows.json`).join(', ')}; and
\`${timCommand('distil areas', '--requirements')}\`, whose result.unassigned lists the requirements no area drafted (the
cross-area pass wrote them): draft their rows yourself.
${existingBacklogNote(round)}${combineSplitOffNote}
THE FILE YOU WRITE: ${BACKLOG_ABS}. Nothing else.
REPOS: ${repoKeysNote}
THEMES: when ${SOURCES_ABS} has a "themes" rule, give every row a theme and write the envelope's "themes", as the
brief's "Themes" section says: boundaries at feature-folder granularity from what each row touches, shared files in
a foundation theme in an early wave, and never one theme holding most of the rows. tim backlog check holds the themes
to the rules in SHAPE.md.
${OBSERVABLE_RULE} Every requirement a draft lists as "unobservable" goes there too, unless you can
write a criterion every environment observes.
CHECKS, both until both pass:
- \`${timCommand('backlog check')}\`
- \`${timCommand('distil coverage')}\`${reconcilerAnswered(answered)}${sendBack}
Return the structured output only.`
}

const splitOffPointerProblems = (checked) =>
  (checked.splitOffChanged ?? []).length
    ? [
        `${checked.splitOffChanged.join(', ')}: a theme split off early lost its pointer in "splitOff", or the pointer changed in a field other than "pickUp". Put each back exactly as it is in ${WORKAREA_ABS}/distil/backlog-snapshot.${SNAPSHOT_TAG}.json, adding only to "pickUp".`
      ]
    : []

const frozenProblems = (checked) => {
  if (!HAD_BACKLOG) return []
  if (
    checked.snapshotOk !== true ||
    !checked.removed ||
    !checked.changed ||
    (SPLIT_OFF.length > 0 && !checked.splitOffChanged)
  ) {
    return [
      `tim distil backlog-snapshot could not compare backlog.json with its rows before you, so nothing shows the rows built or set aside are unchanged: ${(checked.snapshotProblems ?? []).join(' ') || 'it reported nothing'}`
    ]
  }
  return [
    ...(checked.removed.length ? [`backlog.json no longer has ${checked.removed.join(', ')}. Keep every existing row.`] : []),
    ...(checked.changed.length
      ? [
          `${checked.changed.join(', ')}: a row built or set aside (not todo or blocked) changed. Put each back exactly as it is in ${WORKAREA_ABS}/distil/backlog-snapshot.${SNAPSHOT_TAG}.json.`
        ]
      : []),
    ...splitOffPointerProblems(checked)
  ]
}

const coverageProblemsOf = (checked) => {
  if (checked.ok) return []
  const all = [...checked.problems, ...(checked.backlogProblems ?? [])]
  return all.length ? all : [`tim distil coverage failed without naming a problem: ${checked.summary}`]
}

const consolidateProblemsOf = (checked) => [
  ...coverageProblemsOf(checked),
  ...(checked.backlogCheckOk === true ? [] : (checked.backlogCheckProblems ?? []).length ? checked.backlogCheckProblems : ['tim backlog check did not pass']),
  ...frozenProblems(checked)
]

const runConsolidate = async ({ round, answered }) => {
  let consolidated = null
  let check = null
  let problems = null
  for (let attempt = 0; attempt <= SEND_BACKS; attempt++) {
    consolidated = await agent(
      consolidatePrompt({ problems, round, answered: attempt === 0 ? answered : [] }),
      think({
        label: roundLabel(attempt === 0 ? 'combine rows' : `combine rows send-back ${attempt}`, round),
        phase: 'Consolidate',
        schema: CONSOLIDATE_SCHEMA
      })
    )
    check = await runCoverage({
      label: roundLabel(`check backlog${attempt === 0 ? '' : ` ${attempt + 1}`}`, round),
      phaseName: 'Consolidate',
      backlogCheck: true,
      snapshot: HAD_BACKLOG ? 'compare' : null
    })
    problems = consolidateProblemsOf(check)
    if (problems.length === 0) break
    log(`consolidate: ${problems.length} problem(s) after attempt ${attempt + 1}${round === 1 ? '' : `, round ${round}`}`)
  }
  return { consolidated, check, problems, sentBack: (consolidated?.reconcileProblems ?? []).filter(isText) }
}

const countsFrom = (check) => ({
  requirements: check.requirements ?? reconcileCheck.requirements ?? null,
  conflicts: check.conflicts ?? reconcileCheck.conflicts ?? null,
  questions: check.questions ?? reconcileCheck.questions ?? []
})

const consolidateFailed = (problems, check) => {
  const counts = countsFrom(check)
  return stoppedResult(
    'consolidate-failed',
    `backlog.json still has ${problems.length} problem(s) after ${SEND_BACKS} send-backs: ${problems.join(' ')}`,
    { sources: SOURCE_COUNTS, ...counts, goalConflicts: GOAL_CONFLICTS }
  )
}

const DRAFTS = await inBatches(AREAS, THINK_FAN_OUT, runDraft)
const unDrafted = AREAS.filter((area, index) => !DRAFTS[index]?.ok)
if (unDrafted.length) {
  log(`draft rows: ${unDrafted.map((area) => area.id).join(', ')} did not finish a draft; the combiner drafts their requirements itself`)
}
let CONSOLIDATE_DECISIONS = DRAFTS.flatMap((draft, index) => (draft?.decisions ?? []).map((decision) => `${AREAS[index].id}: ${decision}`))

let { consolidated, check: finalCheck, problems: consolidateProblems, sentBack: SENT_BACK } = await runConsolidate({ round: 1, answered: [] })
if (consolidateProblems.length) return consolidateFailed(consolidateProblems, finalCheck)
CONSOLIDATE_DECISIONS = [...CONSOLIDATE_DECISIONS, ...(consolidated?.decisions ?? [])]

// A requirement the combiner cannot turn into an observable criterion goes
// back to the cross-area reconciler once, and its questions are challenged
// again. What is still open after that goes to the report as a step before
// building.
for (let round = 2; round <= RECONCILE_ROUNDS && SENT_BACK.length; round++) {
  log(`consolidate: sent ${SENT_BACK.length} requirement(s) back to the reconciler, round ${round}`)
  roundOutcome = await reconcileRound({ round, sentBack: SENT_BACK })
  if (roundOutcome.failed) return stopAfterRound(roundOutcome, round)
  reconcileCheck = roundOutcome.check
  phase('Consolidate')
  ;({ consolidated, check: finalCheck, problems: consolidateProblems, sentBack: SENT_BACK } = await runConsolidate({ round, answered: SENT_BACK }))
  if (consolidateProblems.length) return consolidateFailed(consolidateProblems, finalCheck)
  CONSOLIDATE_DECISIONS = [...CONSOLIDATE_DECISIONS, ...(consolidated?.decisions ?? [])]
}
const OPEN_RECONCILE_PROBLEMS = SENT_BACK

const { requirements: REQUIREMENTS, conflicts: CONFLICTS, questions: QUESTIONS } = countsFrom(finalCheck)
const BLOCKED = finalCheck.blocked ?? reconcileCheck.blocked ?? []
const SOURCE_USAGE = finalCheck.sourceUsage ?? reconcileCheck.sourceUsage ?? []

const CHALLENGE = {
  challenged: CHALLENGE_LOG.length,
  settled: CHALLENGE_LOG.filter((verdict) => verdict.ok && verdict.verdict === 'precedence').map((verdict) => verdict.conflict),
  blocked: CHALLENGE_LOG.filter((verdict) => verdict.ok && verdict.verdict === 'blocked').map((verdict) => verdict.conflict),
  survived: QUESTIONS.map((question) => question.id)
}

const BACKLOG = {
  path: BACKLOG_ABS,
  total: finalCheck.backlogTotal ?? finalCheck.backlogIncrements ?? null,
  byStatus: finalCheck.backlogByStatus ?? null,
  covered: finalCheck.backlogCovered ?? null,
  coveredBySplitOff: finalCheck.backlogCoveredBySplitOff ?? null,
  themes: consolidated?.themes ?? null
}

// What a re-distil hands each theme split off early, from tim distil coverage:
// requirements to pick up, ones changed since the split, and ones no longer to
// build. The report lists them for each split branch.
const SPLIT_OFF_STANDING = finalCheck.splitOff ?? []
const hasHandover = (theme) =>
  [theme.pickUp, theme.changed, theme.noLongerToBuild].some((list) => (list ?? []).length > 0)
const SPLIT_OFF_HANDOVER = SPLIT_OFF_STANDING.filter(hasHandover)

// ---------------------------------------------------------------------------
// Report: drafted to REPORT.md from the files on disk, and returned as text.
// A subagent cannot write a report file, so the main session saves it.
// ---------------------------------------------------------------------------
phase('Report')

const REPORT_SCHEMA = {
  type: 'object',
  required: ['report', 'issues'],
  properties: {
    report: { type: 'string', description: 'The whole report as Markdown, starting with its # heading' },
    issues: {
      ...STRINGS,
      description:
        'Anything wrong with the inputs or this step, for whoever maintains the pipeline: a missing file, counts that disagree. [] when there is none. Never put these in the report'
    }
  },
  additionalProperties: false
}

const goalConflictsNote = GOAL_CONFLICTS.length
  ? `
THE GOAL IS OUT OF DATE. The reconcile step found rulings that contradict sources.json's goal:
${problemList(GOAL_CONFLICTS)}
State the goal as the rulings leave it, never as sources.json words it. Put "correct the goal in sources.json" in
the step-0 section, as REPORT.md says.`
  : ''

const openReconcileNote = OPEN_RECONCILE_PROBLEMS.length
  ? `
SOME ACCEPTANCE CRITERIA CANNOT BE OBSERVED everywhere their row says. The consolidator sent these back to the
reconciler and they are still open:
${problemList(OPEN_RECONCILE_PROBLEMS)}
Each one must be settled before building. Put each in the step-0 section and say so in the summary.`
  : ''

const describeHandover = (theme) =>
  [
    `- ${theme.theme}, on ${theme.branch} (${theme.workarea ?? 'its split workarea'}):`,
    `  to pick up, adopted since the split: ${(theme.pickUp ?? []).join(', ') || 'none'}`,
    `  changed since the split: ${(theme.changed ?? []).join(', ') || 'none'}`,
    `  no longer to build: ${(theme.noLongerToBuild ?? []).join(', ') || 'none'}`
  ].join('\n')

const splitOffReportNote = SPLIT_OFF_STANDING.length
  ? `
THEMES SPLIT OFF EARLY: ${SPLIT_OFF_STANDING.map((theme) => `${theme.theme} (${theme.branch})`).join(', ')}. Their rows live only on
their own branches, so none of this run's changes reached them.${
      SPLIT_OFF_HANDOVER.length
        ? ` Write the "For the split branches" section, as REPORT.md says, with
one part per theme below, naming its branch, and say in the summary that a split branch has work to pick up:
${SPLIT_OFF_HANDOVER.map(describeHandover).join('\n')}`
        : ' Nothing this run adopted or changed falls to them: leave the "For the split branches" section out.'
    }`
  : ''

const usageById = Object.fromEntries(SOURCE_USAGE.map((usage) => [usage.id, usage]))
const sourceCountsTable = SOURCE_COUNTS.map((source) => {
  const usage = usageById[source.id]
  const cited = usage ? `, ${usage.cited} of its ${usage.claims} working-set claims cited` : ''
  return `- ${source.id}: rank ${source.rank ?? '?'}, ${source.claims ?? '?'} claims, ${source.held ?? '?'} held, ${source.refuted ?? '?'} refuted, ${source.missed ?? '?'} missed${cited}`
}).join('\n')

const challengeNote = `
THE CHALLENGE: ${CHALLENGE.challenged} question(s) were challenged against precedence and the rulings. ${CHALLENGE.settled.length} settled by
precedence (${CHALLENGE.settled.join(', ') || 'none'}), ${CHALLENGE.blocked.length} found to wait on a blocker (${CHALLENGE.blocked.join(', ') || 'none'}),
${CHALLENGE.survived.length} survive (${CHALLENGE.survived.join(', ') || 'none'}). Only the survivors are questions in the report.
THE BLOCKED REQUIREMENTS, each to build in a blocked increment once somebody acts:
${BLOCKED.map((blocked) => `- ${blocked.id}: ${blocked.blockedBy}`).join('\n') || '- none'}`

const reportPrompt = (attempt) => `You are the REPORT step of the DISTIL workflow for the workarea ${WORKAREA}. Draft the report and return it as text.
${RAILS}
Write no file at all: return the report as your structured output. The main session saves it to ${REPORT_PATH}.
READ FIRST, in full: ${REFERENCES_ABS}/REPORT.md, which gives the report's structure, a skeleton and the writing
rules. Follow it section by section, then run its checks before you return.
READ: ${SOURCES_ABS}, ${WORKAREA_ABS}/distil/requirements.json, ${WORKAREA_ABS}/distil/conflicts.json and ${BACKLOG_ABS}.
The report is for the programme's readers, never for whoever maintains this pipeline. Anything wrong with a file
or this step goes in issues, never in the report.${goalConflictsNote}${openReconcileNote}${challengeNote}${splitOffReportNote}
THE COUNTS PER SOURCE, from tim distil working-set and tim distil coverage (claims = held + refuted; missed claims
were added; cited = the working-set claims a requirement or conflict cites):
${sourceCountsTable}
THE AREAS reconcile was cut into: ${AREAS.map((area) => `${area.id} (${area.title})`).join(', ')}.
THE TOTALS, from tim distil coverage and tim backlog check:
- requirements: ${JSON.stringify(REQUIREMENTS)}
- conflicts: ${JSON.stringify(CONFLICTS)}
- backlog: ${JSON.stringify(BACKLOG)}${
  attempt > 0
    ? `
THIS IS A RETRY: the first report step returned no report. Return the whole report in the report field.`
    : ''
}
Return the structured output only.`

let REPORT_TEXT = null
let REPORT_ISSUES = []
for (let attempt = 0; attempt <= REPORT_RETRIES && !REPORT_TEXT; attempt++) {
  const report = await agent(reportPrompt(attempt), think({ label: attempt === 0 ? 'report' : `report retry ${attempt}`, phase: 'Report', schema: REPORT_SCHEMA }))
  REPORT_TEXT = report && isText(report.report) ? report.report : null
  REPORT_ISSUES = report && Array.isArray(report.issues) ? report.issues.filter(isText) : []
}

return {
  workarea: WORKAREA,
  stopped: REPORT_TEXT
    ? null
    : {
        reason: 'report-failed',
        detail: `the report agent returned no report, twice. requirements.json, conflicts.json and backlog.json are written and checked. A launch runs reconcile and consolidate again over them, keeping every id and every row built or set aside, then drafts the report`
      },
  sources: SOURCE_COUNTS,
  failed: [],
  requirements: REQUIREMENTS,
  conflicts: CONFLICTS,
  questions: QUESTIONS,
  blocked: BLOCKED,
  challenge: CHALLENGE,
  areas: AREAS.map((area) => ({ ...area, claims: claimsInArea[area.id] ?? null })),
  sourceUsage: SOURCE_USAGE,
  backlog: BACKLOG,
  splitOff: SPLIT_OFF_STANDING,
  decisions: {
    areas: AREA_PLAN.decisions,
    reconcile: RECONCILE_DECISIONS,
    consolidate: CONSOLIDATE_DECISIONS
  },
  goalConflicts: GOAL_CONFLICTS,
  reconcileProblems: OPEN_RECONCILE_PROBLEMS,
  report: REPORT_TEXT,
  reportIssues: REPORT_ISSUES,
  reportPath: REPORT_PATH
}
