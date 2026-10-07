export const meta = {
  name: 'distil',
  description:
    'The requirements-pipeline DISTIL phase, whole: read the work list from tim distil status → characterise each pending or stale source and cut it into parts → extract every part exhaustively, side by side, and merge them → verify its claims in ranges and merge the parts → reconcile every verified claim into requirements and conflicts → consolidate them into backlog.json → draft the report and return it',
  whenToUse:
    'After intake has written <workarea>/sources.json (goal, repos, reposWhy, precedence, sources). Launch by scriptPath with args; every key is required and a missing one stops the run before any agent starts. To fold in a new source or a ruling, edit sources.json and launch again: a source already verified with an unchanged scope is skipped, and reconcile and consolidate keep every existing id. To extract a source again with an unchanged scope, run tim distil reset first. The run returns the report as text for the main session to save.',
  phases: [
    { title: 'Status' },
    { title: 'Characterise' },
    { title: 'Extract' },
    { title: 'Verify' },
    { title: 'Reconcile' },
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
//                opus: characterise, reconcile, consolidate, report), code
//                (default opus: extract parts, verify), light (default haiku:
//                status, checks, merges, working set, coverage). A value is
//                opus, sonnet, haiku, or "inherit" for the session model
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
//   think (opus)   characterise, reconcile, consolidate, report: the calls
//                  that decide
//   code (opus)    extract parts, verify: reading every word of a slice of a
//                  source. Opus by default, because a thin extract caps
//                  everything downstream: a page or field never claimed never
//                  reaches a requirement
//   light (haiku)  status, the checks, merges, working set, coverage: run a
//                  command and report what it printed
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
const SEND_BACKS = 2
const REPORT_RETRIES = 1

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

const partitionCheckPrompt = (item) => `You are a PARTITION CHECK step of the DISTIL workflow for the source ${item.id}. Run one command and report what it prints.
${RAILS}
\`${timCommand('distil check', `--source ${item.id} --stage partition --clear-parts`)}\`
${ENVELOPE_RULE}
On success: ok is true. Copy every entry of \`result.sources[0].parts\` exactly (part, title, prefix and path), and
\`result.removedParts\` into removedParts. The command itself removed those old extract part files, so nothing from an
earlier run is merged.
On failure: ok is false, parts and removedParts are [], and problems holds every problem line.
Change nothing yourself. Return the structured output only.`

const nothingBack = (what) => ({ ok: false, problems: [`the ${what} agent returned nothing`], summary: '' })

const runPartitionCheck = async (item, attempt) =>
  (await agent(
    partitionCheckPrompt(item),
    light({ label: `${item.id} check partition${attempt > 0 ? ` ${attempt + 1}` : ''}`, phase: 'Characterise', schema: PARTITION_CHECK_SCHEMA })
  )) ?? nothingBack('partition check')

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
  let checked = await runPartitionCheck(item, 0)
  let problems = partitionShapeProblems(item, checked)
  for (let retry = 1; problems.length && retry <= CHARACTERISE_RETRIES; retry++) {
    characterised.push(
      await agent(characterisePrompt(item, problems), think({ label: `${item.id} characterise retry ${retry}`, phase: 'Characterise', schema: CHARACTERISE_SCHEMA }))
    )
    checked = await runPartitionCheck(item, retry)
    problems = partitionShapeProblems(item, checked)
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

const CHUNKS = {
  type: 'array',
  description: 'result.sources[0].chunks, exactly',
  items: {
    type: 'object',
    required: ['part', 'count', 'path'],
    properties: {
      part: { type: 'integer' },
      from: { type: ['string', 'null'] },
      to: { type: ['string', 'null'] },
      count: { type: 'integer' },
      path: { type: 'string' }
    },
    additionalProperties: false
  }
}

const MERGE_EXTRACT_SCHEMA = {
  type: 'object',
  required: ['ok', 'stage', 'problems', 'parts', 'chunks', 'removedParts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when both commands exited 0' },
    stage: { type: 'string', enum: ['merge', 'check', 'done'], description: 'merge or check: the command that failed. done: both passed' },
    problems: STRINGS,
    claims: { type: 'integer', description: 'result.sources[0].claims from the check' },
    parts: PART_RANGES,
    chunks: CHUNKS,
    removedParts: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const mergeExtractPrompt = (item) => `You are a MERGE EXTRACT step of the DISTIL workflow for the source ${item.id}. Run two commands and report what they print.
${RAILS}
1. \`${timCommand('distil merge-extract', `--source ${item.id}`)}\`
${ENVELOPE_RULE}
   On failure: ok is false, stage is "merge", parts, chunks and removedParts are [], problems holds every problem line,
   and you stop here.
2. \`${timCommand('distil check', `--source ${item.id} --stage extract --chunk ${VERIFY_CHUNK} --clear-parts`)}\`
   On success: ok is true, stage is "done". Copy \`result.sources[0].claims\`, every entry of
   \`result.sources[0].parts\` and of \`result.sources[0].chunks\` exactly, and \`result.removedParts\` into
   removedParts. The command itself removed those old verify part files, so nothing from an earlier run is merged.
   On failure: ok is false, stage is "check", parts, chunks and removedParts are [], problems holds every problem line.
Change nothing yourself. Return the structured output only.`

const runMergeExtract = async (item, attempt) =>
  (await agent(
    mergeExtractPrompt(item),
    light({ label: `${item.id} merge extract${attempt > 0 ? ` ${attempt + 1}` : ''}`, phase: 'Extract', schema: MERGE_EXTRACT_SCHEMA })
  )) ?? { ...nothingBack('merge extract'), stage: 'merge', parts: [], chunks: [], removedParts: [] }

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
// A source already extracted, whose next step is verify, only has its extract
// checked: its verify ranges and part ranges come from the same check.
// ---------------------------------------------------------------------------
const EXTRACT_CHECK_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems', 'parts', 'chunks', 'removedParts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim distil check exited 0' },
    problems: STRINGS,
    claims: { type: 'integer', description: 'result.sources[0].claims' },
    parts: PART_RANGES,
    chunks: CHUNKS,
    removedParts: STRINGS,
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const extractCheckPrompt = (item) => `You are an EXTRACT CHECK step of the DISTIL workflow for the source ${item.id}. Run one command and report what it prints.
${RAILS}
\`${timCommand('distil check', `--source ${item.id} --stage extract --chunk ${VERIFY_CHUNK} --clear-parts`)}\`
${ENVELOPE_RULE}
On success: ok is true. Copy \`result.sources[0].claims\`, every entry of \`result.sources[0].parts\` (or [] when it is
absent) and of \`result.sources[0].chunks\` exactly (part, from, to, count and path), and \`result.removedParts\` into
removedParts. The command itself removed those old verify part files, so nothing from an earlier run is merged.
On failure: ok is false, parts, chunks and removedParts are [], and problems holds every problem line.
Change nothing yourself. Return the structured output only.`

const runExtractCheck = async (item) =>
  (await agent(extractCheckPrompt(item), light({ label: `${item.id} check extract`, phase: 'Extract', schema: EXTRACT_CHECK_SCHEMA }))) ??
  { ...nothingBack('extract check'), parts: [], chunks: [], removedParts: [] }

// The chunks must be parts 1..n, each writing <slug>.part<n>.json, and add up
// to the claims: anything else is a check agent that copied them wrong.
const chunkProblems = (item, checked) => {
  const chunks = checked.chunks ?? []
  if (chunks.length === 0) return ['the extract check reported no verify ranges']
  const misnumbered = chunks.filter((chunk, index) => chunk.part !== index + 1 || !chunk.path.endsWith(`/${item.slug}.part${index + 1}.json`))
  const counted = chunks.reduce((total, chunk) => total + chunk.count, 0)
  const inParts = (checked.parts ?? []).reduce((total, part) => total + part.claims, 0)
  return [
    ...(misnumbered.length ? [`the extract check reported verify ranges out of order or with the wrong part files: ${JSON.stringify(misnumbered)}`] : []),
    ...(Number.isInteger(checked.claims) && counted !== checked.claims ? [`the verify ranges cover ${counted} claims, but the extract has ${checked.claims}`] : []),
    ...((checked.parts ?? []).length && Number.isInteger(checked.claims) && inParts !== checked.claims
      ? [`the extract parts hold ${inParts} claims, but the extract has ${checked.claims}`]
      : [])
  ]
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
  claims: checked.claims ?? null,
  parts: checked.parts ?? [],
  chunks: checked.chunks,
  decisions
})

const characteriseAndExtract = async (item) => {
  const partitioned = await characteriseStage(item)
  if (partitioned.problems) return failedSource(item, 'characterise', partitioned.problems)
  const { merged, answers } = await extractPartsStage(item, partitioned.parts)
  if (!merged.ok) return failedSource(item, 'extract', merged.problems)
  const shapeProblems = chunkProblems(item, merged)
  if (shapeProblems.length) return failedSource(item, 'extract', shapeProblems)
  return extractedSource(item, merged, [
    ...partitioned.decisions,
    ...answers.filter(Boolean).flatMap((answer) => (answer.decisions ?? []).map((decision) => `part ${answer.part}: ${decision}`))
  ])
}

const extractStage = async (item) => {
  if (!EXTRACT_KINDS.includes(item.kind)) {
    return failedSource(item, 'extract', [`kind "${item.kind}" has no extract brief. Kinds: ${EXTRACT_KINDS.join(', ')}`])
  }
  if (item.next === 'extract') return characteriseAndExtract(item)
  const checked = await runExtractCheck(item)
  if (!checked.ok) {
    log(`${item.id}: its extract no longer checks out (${checked.problems.join(' ')}), so it is characterised and extracted again`)
    return characteriseAndExtract(item)
  }
  const shapeProblems = chunkProblems(item, checked)
  if (shapeProblems.length) return failedSource(item, 'extract', shapeProblems)
  return extractedSource(item, checked, [])
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
  const start = (chunk.part - 1) * VERIFY_CHUNK
  const end = start + chunk.count
  const range =
    chunk.count > 0
      ? `claims ${chunk.from} to ${chunk.to}: ${chunk.count} claims, at indexes ${start} to ${end - 1} of the extract.
Read them with \`jq '.claims[${start}:${end}]' ${extractTilde(item.slug)}\`.`
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

const mergePrompt = (item) => `You are a MERGE step of the DISTIL workflow for the source ${item.id}. Run two commands and report what they print.
${RAILS}
1. \`${timCommand('distil merge-verify', `--source ${item.id}`)}\`
${ENVELOPE_RULE}
   On failure: ok is false, stage is "merge", problems holds every problem line, and you stop here.
2. \`${timCommand('distil check', `--source ${item.id} --stage verify`)}\`
   On success: ok is true, stage is "done", and copy claims and the counts in \`result.sources[0].verify\`: verdicts,
   held, refuted and missed.
   On failure: ok is false, stage is "check", problems holds every problem line.
Change nothing yourself. Return the structured output only.`

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
// Reconcile: the working set, then requirements and conflicts, checked by
// tim distil coverage and sent back with its problems.
// ---------------------------------------------------------------------------
phase('Reconcile')

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

const workingSet = await agent(
  `You are the WORKING SET step of the DISTIL workflow. Run commands and report what they print.
${RAILS}
1. \`${timCommand('distil working-set', '--write')}\`
${ENVELOPE_RULE}
   On success: ok is true. Copy result.path and result.total, each entry of result.sources (id, rank, held, refuted,
   missed), and the id of each entry of result.unavailable.
   On failure: ok is false, problems holds every problem line.
2. \`ls ${WORKAREA_TILDE} ${WORKAREA_TILDE}/distil\`. Report whether distil/requirements.json, distil/conflicts.json and
   backlog.json exist.
Change nothing yourself. Return the structured output only.`,
  light({ label: 'working set', phase: 'Reconcile', schema: WORKING_SET_SCHEMA })
)

if (!workingSet || !workingSet.ok) {
  return stoppedResult('working-set-failed', workingSet ? workingSet.problems.join(' ') || workingSet.summary : 'the working set agent returned nothing', {
    sources: SOURCES
  })
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
const BACKLOG_ABS = `${WORKAREA_ABS}/backlog.json`

// tim distil coverage checks the backlog too, once one exists, and scopes each
// problem: reconcile or backlog. On a re-distil the reconciler cannot fix a
// backlog problem, so those go to the consolidator.
const COVERAGE_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems', 'backlogProblems', 'summary'],
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
      ? 'copy result.rows into rowCount'
      : 'copy result.rows into rowCount, and result.compared.removed and result.compared.changed into removed and changed, exactly'
  return `${step}. \`${timCommand('distil backlog-snapshot', flag)}\`
   On success: snapshotOk is true; ${copy}.
   On failure: snapshotOk is false, and snapshotProblems holds every problem line.`
}

const coveragePrompt = ({ backlogCheck, snapshot }) => {
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
   precedence, question), every entry of result.questions (id, about, question, default, requirements), and, when
   result.backlog is not null, its increments and covered as backlogIncrements and backlogCovered.
   On failure: ok is false. errors[0].problems lists every problem with its scope. Copy the message of each one whose
   scope is reconcile into problems, and of each one whose scope is backlog into backlogProblems, exactly.${backlogStep}${snapshotLine}
Change nothing yourself. Return the structured output only.`
}

const runCoverage = async ({ label, phaseName, backlogCheck, snapshot }) =>
  (await agent(coveragePrompt({ backlogCheck, snapshot }), light({ label, phase: phaseName, schema: COVERAGE_SCHEMA }))) ??
  { ...nothingBack('coverage check'), backlogProblems: [] }

const RECONCILE_SCHEMA = {
  type: 'object',
  required: ['ok', 'requirements', 'conflicts', 'questions', 'decisions', 'goalConflicts', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when the check names no problem about requirements, conflicts or claims' },
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

const existingNote = (exists, file) =>
  exists ? `${file} already exists: this is a re-distil. Keep every existing id.` : `${file} does not exist yet.`

// A plain reading that one environment cannot meet is a question, never an
// adopted requirement. The same line goes to the reconciler every round.
const PLAIN_READING_RULE = `WHERE A SOURCE OR RULING CANNOT BE MET AS WRITTEN in some part of the target (an environment, a repo, a journey or
a stage), or two readings of it would build different things, make it a question with a default that says what each
part gets. Never adopt one plain reading for every part.`

const consolidatorSentBack = (problems) => `
THE CONSOLIDATOR SENT THESE BACK: it could not write an acceptance criterion that every environment its row names can
observe. Settle each one as a question with a default that says what each part gets, or reword the requirement:
${problemList(problems)}`

const coverageSentBack = (problems) => `
THIS IS A SEND-BACK. The coverage check found these problems. Fix every one:
${problemList(problems)}`

const reconcilePrompt = ({ problems, fromConsolidator }) => {
  const sendBack = problems ? (fromConsolidator ? consolidatorSentBack(problems) : coverageSentBack(problems)) : ''
  return `You are the RECONCILE step of the DISTIL workflow for the workarea ${WORKAREA}.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/reconcile.md, then ${REFERENCES_ABS}/requirements.schema.json and
${REFERENCES_ABS}/conflicts.schema.json.
READ: ${SOURCES_ABS}; the working set at ${workingSet.path} (${workingSet.total} claims, in pages if you need to).
${existingNote(workingSet.hasRequirements, `${WORKAREA_ABS}/distil/requirements.json`)}
${existingNote(workingSet.hasConflicts, `${WORKAREA_ABS}/distil/conflicts.json`)}
THE FILES YOU WRITE: ${WORKAREA_ABS}/distil/requirements.json and ${WORKAREA_ABS}/distil/conflicts.json. Nothing else.
${PLAIN_READING_RULE}
CHECK: \`${timCommand('distil coverage')}\`. Fix every problem it names about requirements, conflicts or claims, and
check again until it names none. A problem about backlog.json or an increment is the consolidator's: leave it.${sendBack}
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

// Every attempt reads the same rulings and goal, so a contradiction one
// attempt names still stands after a send-back that does not repeat it.
let GOAL_CONFLICTS = []

const runReconcile = async ({ round, sentBack }) => {
  let reconciled = null
  let check = null
  let problems = sentBack
  for (let attempt = 0; attempt <= SEND_BACKS; attempt++) {
    reconciled = await agent(
      reconcilePrompt({ problems, fromConsolidator: attempt === 0 && round > 1 }),
      think({
        label: roundLabel(attempt === 0 ? 'reconcile' : `reconcile send-back ${attempt}`, round),
        phase: 'Reconcile',
        schema: RECONCILE_SCHEMA
      })
    )
    GOAL_CONFLICTS = [...new Set([...GOAL_CONFLICTS, ...(reconciled?.goalConflicts ?? []).filter(isText)])]
    check = await runCoverage({
      label: roundLabel(`coverage after reconcile${attempt === 0 ? '' : ` ${attempt + 1}`}`, round),
      phaseName: 'Reconcile',
      backlogCheck: false,
      snapshot: round === 1 && HAD_BACKLOG ? 'save' : null
    })
    problems = reconcileProblemsOf(check)
    if (problems.length === 0) break
    log(`reconcile: ${problems.length} problem(s) after attempt ${attempt + 1}${round === 1 ? '' : `, round ${round}`}`)
  }
  return { reconciled, check, problems }
}

let { reconciled, check: reconcileCheck, problems: reconcileProblems } = await runReconcile({ round: 1, sentBack: null })
let RECONCILE_DECISIONS = reconciled?.decisions ?? []

if (reconcileProblems.length) {
  return stoppedResult('reconcile-failed', `tim distil coverage still names ${reconcileProblems.length} problem(s) after ${SEND_BACKS} send-backs: ${reconcileProblems.join(' ')}`, {
    sources: SOURCE_COUNTS
  })
}
if (HAD_BACKLOG && reconcileCheck.snapshotOk !== true) {
  return stoppedResult(
    'snapshot-failed',
    `backlog.json exists, but tim distil backlog-snapshot could not save its rows, so the consolidator could not be held to them: ${(reconcileCheck.snapshotProblems ?? []).join(' ') || reconcileCheck.summary}`,
    { sources: SOURCE_COUNTS }
  )
}

// ---------------------------------------------------------------------------
// Consolidate: backlog.json, checked by tim backlog check and tim distil
// coverage, with the rows built or set aside held fixed on a re-distil.
// ---------------------------------------------------------------------------
phase('Consolidate')

const CONSOLIDATE_SCHEMA = {
  type: 'object',
  required: ['ok', 'increments', 'decisions', 'reconcileProblems', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'true when tim backlog check and tim distil coverage both pass' },
    increments: { type: 'integer' },
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

const OBSERVABLE_RULE = `EVERY ACCEPTANCE CRITERION CAN BE OBSERVED in every environment its row names. Never write one that cannot. Put the
requirement in reconcileProblems instead: the workflow sends it back to the reconciler.`

const existingBacklogNote = (round) => {
  if (HAD_BACKLOG) {
    return `${BACKLOG_ABS} already exists: this is a re-distil. Keep every row id and remove no row. Rewrite todo and
blocked rows to the requirements as they stand now; a blocked row whose blocker a ruling removed becomes todo. Never
change a row with any other status. The workflow compares every such row before and after you. A changed or removed
row comes back to you as a problem to put right, and the run stops if it is still wrong after ${SEND_BACKS} send-backs.`
  }
  return round === 1 ? `${BACKLOG_ABS} does not exist yet.` : `${BACKLOG_ABS} is the first pass from this run. Rewrite any row in it.`
}

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
  return `You are the CONSOLIDATE step of the DISTIL workflow for the workarea ${WORKAREA}.
${RAILS}
READ FIRST, in full: ${BRIEFS_ABS}/consolidate.md, ${REFERENCES_ABS}/backlog.schema.json and ${REFERENCES_ABS}/SHAPE.md.
READ: ${SOURCES_ABS}, ${WORKAREA_ABS}/distil/requirements.json and ${WORKAREA_ABS}/distil/conflicts.json.
${existingBacklogNote(round)}
THE FILE YOU WRITE: ${BACKLOG_ABS}. Nothing else.
REPOS: ${repoKeysNote}
THEMES: when ${SOURCES_ABS} has a "themes" rule, give every row a theme and write the envelope's "themes", as the
brief's "Themes" section says. tim backlog check holds the themes to the rules in SHAPE.md.
${OBSERVABLE_RULE}
CHECKS, both until both pass:
- \`${timCommand('backlog check')}\`
- \`${timCommand('distil coverage')}\`${reconcilerAnswered(answered)}${sendBack}
Return the structured output only.`
}

const frozenProblems = (checked) => {
  if (!HAD_BACKLOG) return []
  if (checked.snapshotOk !== true || !checked.removed || !checked.changed) {
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
      : [])
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
        label: roundLabel(attempt === 0 ? 'consolidate' : `consolidate send-back ${attempt}`, round),
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

let { consolidated, check: finalCheck, problems: consolidateProblems, sentBack: SENT_BACK } = await runConsolidate({ round: 1, answered: [] })
if (consolidateProblems.length) return consolidateFailed(consolidateProblems, finalCheck)
let CONSOLIDATE_DECISIONS = consolidated?.decisions ?? []

// A requirement the consolidator cannot turn into an observable criterion goes
// back to the reconciler once. What is still open after that goes to the
// report as a step before building.
for (let round = 2; round <= RECONCILE_ROUNDS && SENT_BACK.length; round++) {
  log(`consolidate: sent ${SENT_BACK.length} requirement(s) back to the reconciler, round ${round}`)
  ;({ reconciled, check: reconcileCheck, problems: reconcileProblems } = await runReconcile({ round, sentBack: SENT_BACK }))
  RECONCILE_DECISIONS = [...RECONCILE_DECISIONS, ...(reconciled?.decisions ?? [])]
  if (reconcileProblems.length) {
    return stoppedResult(
      'reconcile-failed',
      `tim distil coverage still names ${reconcileProblems.length} problem(s) after ${SEND_BACKS} send-backs, round ${round}: ${reconcileProblems.join(' ')}`,
      { sources: SOURCE_COUNTS }
    )
  }
  ;({ consolidated, check: finalCheck, problems: consolidateProblems, sentBack: SENT_BACK } = await runConsolidate({ round, answered: SENT_BACK }))
  if (consolidateProblems.length) return consolidateFailed(consolidateProblems, finalCheck)
  CONSOLIDATE_DECISIONS = [...CONSOLIDATE_DECISIONS, ...(consolidated?.decisions ?? [])]
}
const OPEN_RECONCILE_PROBLEMS = SENT_BACK

const { requirements: REQUIREMENTS, conflicts: CONFLICTS, questions: QUESTIONS } = countsFrom(finalCheck)

const BACKLOG = {
  path: BACKLOG_ABS,
  total: finalCheck.backlogTotal ?? finalCheck.backlogIncrements ?? null,
  byStatus: finalCheck.backlogByStatus ?? null,
  covered: finalCheck.backlogCovered ?? null
}

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

const sourceCountsTable = SOURCE_COUNTS.map(
  (source) => `- ${source.id}: rank ${source.rank ?? '?'}, ${source.claims ?? '?'} claims, ${source.held ?? '?'} held, ${source.refuted ?? '?'} refuted, ${source.missed ?? '?'} missed`
).join('\n')

const reportPrompt = (attempt) => `You are the REPORT step of the DISTIL workflow for the workarea ${WORKAREA}. Draft the report and return it as text.
${RAILS}
Write no file at all: return the report as your structured output. The main session saves it to ${REPORT_PATH}.
READ FIRST, in full: ${REFERENCES_ABS}/REPORT.md, which gives the report's structure, a skeleton and the writing
rules. Follow it section by section, then run its checks before you return.
READ: ${SOURCES_ABS}, ${WORKAREA_ABS}/distil/requirements.json, ${WORKAREA_ABS}/distil/conflicts.json and ${BACKLOG_ABS}.
The report is for the programme's readers, never for whoever maintains this pipeline. Anything wrong with a file
or this step goes in issues, never in the report.${goalConflictsNote}${openReconcileNote}
THE COUNTS PER SOURCE, from tim distil working-set (claims = held + refuted; missed claims were added):
${sourceCountsTable}
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
  backlog: BACKLOG,
  decisions: {
    reconcile: RECONCILE_DECISIONS,
    consolidate: CONSOLIDATE_DECISIONS
  },
  goalConflicts: GOAL_CONFLICTS,
  reconcileProblems: OPEN_RECONCILE_PROBLEMS,
  report: REPORT_TEXT,
  reportIssues: REPORT_ISSUES,
  reportPath: REPORT_PATH
}
