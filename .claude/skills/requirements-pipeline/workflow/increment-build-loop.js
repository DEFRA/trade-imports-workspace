export const meta = {
  name: 'increment-build-loop',
  description:
    'Build backlog increments one at a time, each through a full ticket-to-merge lifecycle: raise the ticket → cut the branch → plan the decisions, homes and owners against the live tree → lint the plan for code text and review it before any code exists, stopping only on a structural finding → implement the plan and every detail finding the plan review left open and keep the Behaviour Spec current → style review + code review + consistency review → verify findings by kind (functional ones refuted by default, code-quality ones real by default) → judge → fix → style re-review of the fix → the plan\'s ladder → commit → PR → CI, with a style review of every CI fix → merge → close the ticket → once a theme\'s last row lands, check the spec under every prefix it touched and, on a branch run, review the whole theme',
  whenToUse:
    'Running any increment backlog under workareas/ in the one backlog shape (fields defined in .claude/skills/requirements-pipeline/references/backlog.schema.json): each row is a requirement, and the loop plans the how just in time. One invocation drains the backlog, deriving its own next increment and building each one with a full multi-agent quality pass, until stopAfter increments have landed or something stops it. Pass the configuration as args, an object or a JSON string. Every key this workflow needs is required, and a missing one stops the run before any agent starts. planOnly:true writes the plan and stops. lifecycle:"full" runs the ticket-to-merge lifecycle; lifecycle:"branch" builds straight onto an existing long-lived branch with no Jira and no merge, finding the open PRs rather than raising them.',
  phases: [
    { title: 'Start' },
    { title: 'Derive' },
    { title: 'Branch' },
    { title: 'Baseline' },
    { title: 'Plan' },
    { title: 'Implement' },
    { title: 'Review' },
    { title: 'Verify findings' },
    { title: 'Judge' },
    { title: 'Fix' },
    { title: 'Ladder' },
    { title: 'Land' },
    { title: 'Pull request' },
    { title: 'CI' },
    { title: 'Merge' },
    { title: 'Done' },
    { title: 'Theme review' },
  ],
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

const WORKFLOW_NAME = 'increment-build-loop'
const ALWAYS_REQUIRED = [
  'workarea',
  'branch',
  'lifecycle',
  'scope',
  'executor',
  'planOnly',
  'repos',
  'models',
  'increments',
  'stopAfter',
  'jiraProject',
  'epic',
  'jiraInDevStatus',
  'jiraDoneStatus',
  'jiraBoard',
  'ciFixAttempts',
  'ciWatchMinutes',
  'requireApproval',
  'approvalWaitMinutes'
]
const CFG = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, CFG, ALWAYS_REQUIRED)
logResolvedConfig(WORKFLOW_NAME, CFG)

if (typeof CFG.workarea !== 'string') {
  throw new Error(
    'increment-build-loop: config.workarea is required — a path relative to workareas/, e.g. "shared/plant-products-ched-pp"'
  )
}
const WORKAREA_REL = CFG.workarea.replace(/^\/+|\/+$/g, '')
const SCOPE = CFG.scope
if (typeof SCOPE !== 'string' || !SCOPE.trim()) {
  throw new Error(
    'increment-build-loop: config.scope is required — a non-empty conventional-commit scope, e.g. "plant-products"'
  )
}
const BASE_BRANCH = CFG.branch
const EXECUTOR = CFG.executor
const JIRA_PROJECT = CFG.jiraProject
const EPIC = CFG.epic
const STATUS_IN_DEV = CFG.jiraInDevStatus
const STATUS_DONE = CFG.jiraDoneStatus
const JIRA_BOARD = CFG.jiraBoard
const CI_FIX_ATTEMPTS = CFG.ciFixAttempts
const CI_WATCH_MINUTES = CFG.ciWatchMinutes
const REQUIRE_APPROVAL = CFG.requireApproval
const APPROVAL_WAIT_MINUTES = CFG.approvalWaitMinutes
const PLAN_ONLY = CFG.planOnly
const STOP_AFTER = CFG.stopAfter

const CI_WATCH_WINDOWS = Math.max(1, Math.ceil(CI_WATCH_MINUTES / 10))

const APPROVAL_POLLS = Math.max(1, Math.ceil(APPROVAL_WAIT_MINUTES / 2))

const AGENT_CAP = 1000
const BUDGETED_CI_FIX_ATTEMPTS = 3
const AGENTS_PER_INCREMENT_AT_BUDGETED_CI_FIXES = { claude: 56, codex: 64 }
const AGENTS_PER_CI_FIX_ATTEMPT = 4
const STARTUP_AGENTS = 4
const agentsPerIncrement = () =>
  AGENTS_PER_INCREMENT_AT_BUDGETED_CI_FIXES[EXECUTOR] +
  Math.max(0, CI_FIX_ATTEMPTS - BUDGETED_CI_FIX_ATTEMPTS) * AGENTS_PER_CI_FIX_ATTEMPT
const agentsThrough = (increments) => STARTUP_AGENTS + increments * agentsPerIncrement()

if (!WORKAREA_REL) {
  throw new Error(
    'increment-build-loop: config.workarea is required — a path relative to workareas/, e.g. "shared/plant-products-ched-pp"'
  )
}
if (!BASE_BRANCH) {
  throw new Error(
    `increment-build-loop: config.branch is required — the BASE branch increments of the "${WORKAREA_REL}" programme cut off and merge back into, normally "main"`
  )
}
if (EXECUTOR !== 'claude' && EXECUTOR !== 'codex') {
  throw new Error(`increment-build-loop: unknown executor "${EXECUTOR}" — expected "claude" or "codex"`)
}
const LIFECYCLE = CFG.lifecycle
const LIFECYCLES = ['full', 'branch']
if (!LIFECYCLES.includes(LIFECYCLE)) {
  throw new Error(
    `${WORKFLOW_NAME}: config.lifecycle must be "full" (ticket, own branch, PR, merge, ticket done) or "branch" (build onto an existing branch with no Jira and no merge) — got ${JSON.stringify(LIFECYCLE)}`
  )
}
const IS_BRANCH = LIFECYCLE === 'branch'

const UNUSED_ON_BRANCH_KEYS = [
  'jiraProject',
  'epic',
  'jiraInDevStatus',
  'jiraDoneStatus',
  'jiraBoard',
  'requireApproval',
  'approvalWaitMinutes'
]
const PROTECTED_BRANCHES = ['main', 'master']

if (IS_BRANCH) {
  const givenUnused = UNUSED_ON_BRANCH_KEYS.filter((key) => CFG[key] !== null)
  if (givenUnused.length > 0) {
    throw new Error(
      `${WORKFLOW_NAME}: lifecycle "branch" makes no Jira call and merges nothing, so ${givenUnused.join(', ')} must be null — got ${givenUnused.map((key) => `${key}=${JSON.stringify(CFG[key])}`).join(', ')}`
    )
  }
  if (PROTECTED_BRANCHES.includes(BASE_BRANCH)) {
    throw new Error(
      `${WORKFLOW_NAME}: lifecycle "branch" commits and pushes straight onto config.branch, so it refuses ${PROTECTED_BRANCHES.join(' and ')}. Name the long-lived working branch — got "${BASE_BRANCH}"`
    )
  }
}

if (!IS_BRANCH && (typeof EPIC !== 'string' || !/^[A-Z]+-\d+$/.test(EPIC))) {
  throw new Error(
    `increment-build-loop: config.epic is required — the parent epic every raised ticket hangs off, e.g. "${JIRA_PROJECT}-20628". Got "${EPIC}"`
  )
}
if (!IS_BRANCH && (typeof STATUS_IN_DEV !== 'string' || !STATUS_IN_DEV.trim() || typeof STATUS_DONE !== 'string' || !STATUS_DONE.trim())) {
  throw new Error(
    `increment-build-loop: config.jiraInDevStatus and config.jiraDoneStatus must both name a real status on the board. Confirm them with \`tim jira transition <ANY-KEY> --list\`. Got "${STATUS_IN_DEV}" and "${STATUS_DONE}"`
  )
}
if (!IS_BRANCH && !/^\d+$/.test(String(JIRA_BOARD))) {
  throw new Error(
    `increment-build-loop: config.jiraBoard is required — the numeric id of the board raised tickets are moved onto, e.g. 13780 for EUDPA. Without it every ticket is raised into the board's backlog and stays there, which no status change fixes. Got "${JIRA_BOARD}"`
  )
}
if (!Number.isInteger(CI_FIX_ATTEMPTS) || CI_FIX_ATTEMPTS < 0) {
  throw new Error(`increment-build-loop: config.ciFixAttempts must be a non-negative integer — got "${CI_FIX_ATTEMPTS}"`)
}
if (!Number.isInteger(CI_WATCH_MINUTES) || CI_WATCH_MINUTES <= 0) {
  throw new Error(`increment-build-loop: config.ciWatchMinutes must be a positive integer — got "${CI_WATCH_MINUTES}"`)
}
if (!IS_BRANCH && (!Number.isInteger(APPROVAL_WAIT_MINUTES) || APPROVAL_WAIT_MINUTES <= 0)) {
  throw new Error(`increment-build-loop: config.approvalWaitMinutes must be a positive integer — got "${APPROVAL_WAIT_MINUTES}"`)
}
if (typeof PLAN_ONLY !== 'boolean') {
  throw new Error(`${WORKFLOW_NAME}: config.planOnly must be a boolean — got "${PLAN_ONLY}"`)
}
if (!IS_BRANCH && typeof REQUIRE_APPROVAL !== 'boolean') {
  throw new Error(`increment-build-loop: config.requireApproval must be a boolean — got "${REQUIRE_APPROVAL}"`)
}
const EXPLICIT_IDS = CFG.increments
const idListOk =
  Array.isArray(EXPLICIT_IDS) && EXPLICIT_IDS.length > 0 && EXPLICIT_IDS.every((id) => typeof id === 'string' && id.trim())
if (EXPLICIT_IDS !== null && !idListOk) {
  throw new Error(
    `${WORKFLOW_NAME}: config.increments must be null to drain the backlog, or a non-empty list of increment ids — got ${JSON.stringify(EXPLICIT_IDS)}`
  )
}
if (STOP_AFTER !== 'all' && (!Number.isInteger(STOP_AFTER) || STOP_AFTER <= 0)) {
  throw new Error(
    `${WORKFLOW_NAME}: config.stopAfter must be a positive integer or "all" — it counts increments that LANDED. Got ${JSON.stringify(STOP_AFTER)}`
  )
}
if (PLAN_ONLY && EXPLICIT_IDS === null) {
  throw new Error(
    `${WORKFLOW_NAME}: config.planOnly needs an explicit config.increments list. A plan does not change what \`tim backlog next\` returns, so a planOnly drain would plan the same increment for ever`
  )
}

const REPOS = CFG.repos
const WORKSPACE_KEY = 'workspace'
const WORKSPACE_PATH = '.'
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const configuredKeys = isPlainObject(REPOS) ? Object.keys(REPOS) : []
const badRepoKeys = configuredKeys.filter((key) => !/^[a-z]+$/.test(key) || (IS_BRANCH && key === WORKSPACE_KEY))
if (configuredKeys.length === 0 || badRepoKeys.length > 0) {
  const keyRule = IS_BRANCH
    ? `a lower-case word other than "${WORKSPACE_KEY}", which lifecycle "branch" keeps for a row that names no repo`
    : `a lower-case word, "${WORKSPACE_KEY}" for the workspace repo itself`
  throw new Error(
    `${WORKFLOW_NAME}: config.repos must map at least one repo key to its "path" and "github", copied from the backlog envelope's repos. Each key is ${keyRule} — got ${JSON.stringify(REPOS)}`
  )
}

const REPO_KEYS = configuredKeys

const repoPathOk = (key, path) =>
  typeof path === 'string' && (key === WORKSPACE_KEY ? path === WORKSPACE_PATH : /^repos\/[^/]+$/.test(path))

for (const key of REPO_KEYS) {
  const entry = REPOS[key]
  const pathOk = repoPathOk(key, entry?.path)
  const githubOk = typeof entry?.github === 'string' && /^[^/\s]+\/[^/\s]+$/.test(entry.github)
  if (!pathOk || !githubOk) {
    throw new Error(
      `increment-build-loop: config.repos.${key} must give a workspace-relative "path" like "repos/trade-imports-animals-frontend" ("." for the "${WORKSPACE_KEY}" key alone) and a "github" owner/name slug like "DEFRA/trade-imports-animals-frontend" — got ${JSON.stringify(entry)}`
    )
  }
  const approval = entry.requireApproval
  if (approval !== undefined && typeof approval !== 'boolean') {
    throw new Error(
      `${WORKFLOW_NAME}: config.repos.${key}.requireApproval must be true or false, or left out — got ${JSON.stringify(approval)}`
    )
  }
  if (IS_BRANCH && approval === true) {
    throw new Error(
      `${WORKFLOW_NAME}: config.repos.${key}.requireApproval gates a merge, and lifecycle "branch" merges nothing. Leave it out`
    )
  }
}

const WORKSPACE_CONFIGURED = REPO_KEYS.includes(WORKSPACE_KEY)
const APPROVAL_REPO_KEYS = REPO_KEYS.filter((key) => REPOS[key].requireApproval === true)

const LEGACY_REPO_KEYS = ['frontend', 'backend', 'tests']
const IS_LEGACY_KEYS =
  REPO_KEYS.length === LEGACY_REPO_KEYS.length && LEGACY_REPO_KEYS.every((key) => REPO_KEYS.includes(key))

const FRONTEND_CHANGE_SETS = {
  'repos/trade-imports-animals-frontend': [
    { set: 'sets/live-animals', prefix: 'live-animals' },
    { set: 'sets/germinal-products', prefix: 'germinal-products' }
  ],
  'repos/trade-imports-plants-frontend': [{ set: 'sets/high-risk-plants', prefix: 'plants' }]
}
const FRONTEND_CHANGE_PATHS = Object.keys(FRONTEND_CHANGE_SETS)
const FRONTEND_CHANGE_KEYS = REPO_KEYS.filter((key) => FRONTEND_CHANGE_PATHS.includes(REPOS[key].path))

const TESTS_REPO_PATH = 'repos/trade-imports-ins-tests'
const TESTS_IMAGE_WORKFLOW = 'publish-branch.yml'
const TESTS_KEY = REPO_KEYS.find((key) => REPOS[key].path === TESTS_REPO_PATH)

const MODEL_DEFAULTS = { think: 'opus', code: 'sonnet', light: 'haiku' }
const MODEL_TIERS = Object.keys(MODEL_DEFAULTS)
const KNOWN_MODEL_ALIASES = ['opus', 'sonnet', 'haiku']

const RAW_MODELS = CFG.models
if (RAW_MODELS === null || typeof RAW_MODELS !== 'object' || Array.isArray(RAW_MODELS)) {
  throw new Error(`${WORKFLOW_NAME}: config.models must be an object, {} for the recommended default on every tier — got ${JSON.stringify(RAW_MODELS)}`)
}

const MODEL_KEYS = [...MODEL_TIERS, 'heavy']
const unknownModelKeys = Object.keys(RAW_MODELS).filter((key) => !MODEL_KEYS.includes(key))
if (unknownModelKeys.length > 0) {
  throw new Error(`${WORKFLOW_NAME}: config.models has no tier named ${unknownModelKeys.join(', ')} — the tiers are think, code, light, plus the deprecated alias heavy`)
}

for (const key of MODEL_KEYS) {
  const value = RAW_MODELS[key]
  if (value === undefined) continue
  if (value === 'inherit' || KNOWN_MODEL_ALIASES.includes(value)) continue
  throw new Error(`${WORKFLOW_NAME}: config.models.${key} must be one of ${KNOWN_MODEL_ALIASES.join(', ')}, or "inherit" for the session model — got ${JSON.stringify(value)}`)
}

const givenModel = (tier) => RAW_MODELS[tier] ?? (tier !== 'light' ? RAW_MODELS.heavy : undefined) ?? MODEL_DEFAULTS[tier]

const RESOLVED_MODELS = Object.fromEntries(
  MODEL_TIERS.map((tier) => {
    const given = givenModel(tier)
    return [tier, given === 'inherit' ? null : given]
  })
)

log(
  `${WORKFLOW_NAME}: models — think ${RESOLVED_MODELS.think ?? 'inherit (session model)'}, code ${RESOLVED_MODELS.code ?? 'inherit (session model)'}, light ${RESOLVED_MODELS.light ?? 'inherit (session model)'}`
)

const withTier = (tier) => (opts) => (RESOLVED_MODELS[tier] ? { ...opts, model: RESOLVED_MODELS[tier] } : opts)
const think = withTier('think')
const code = withTier('code')
const light = withTier('light')

const RUN_WITH_BASH = `- The Bash tool is loaded in every stage. Run each command your task names with it. Never report the result of a
  command you have not run, and never report Bash or any tool as missing without first calling it.`

const WORKSPACE_CANDIDATES = [
  '~/git/defra/trade-imports-workspace',
  '~/git/defra/trade-imports-animals-workspace',
  '~/git/defra/trade-imports-animals'
]

const STARTED_AT_FORMAT = /^\d{8}T\d{6}Z$/

const WORKSPACE_SCHEMA = {
  type: 'object',
  required: ['ok', 'abs', 'tilde', 'startedAt', 'machineConfig', 'workers', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    abs: { type: 'string', description: 'Absolute path of the workspace checkout, starting with /' },
    tilde: { type: 'string', description: 'The SAME root written with a leading ~/ — this one goes in Bash commands' },
    canonical: { type: 'boolean', description: 'true if the canonical -workspace path resolved' },
    startedAt: { type: 'string', description: 'Exactly what `date -u +%Y%m%dT%H%M%SZ` printed, such as 20261001T091500Z' },
    machineConfig: {
      type: ['string', 'null'],
      description: '`result.config` from `tim build workers --json`, exactly as printed: a path, or null'
    },
    workers: {
      type: 'object',
      additionalProperties: { type: 'integer' },
      description: '`result.workers` from `tim build workers --json`, copied key for key: {} when it printed {}'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const workspace = await agent(
  `Resolve THIS machine's workspace root and report it, with the time. That is your whole job.
Try each of these in order, ONE Bash call each, and stop at the first that exits zero:
${WORKSPACE_CANDIDATES.map((c, i) => `${i + 1}. \`git -C ${c} rev-parse --show-toplevel\``).join('\n')}
Report \`abs\` as exactly what that command printed, and \`tilde\` as the candidate path you used —
tilde MUST still begin with \`~/\`, because a literal /Users/... path in a Bash command is DENIED.
Set canonical:true only if candidate 1 worked; if it did not, say so in your summary, because CLAUDE.md
rule 1 wants ${WORKSPACE_CANDIDATES[0]} to resolve to the workspace and it is a symlink away.
Then run \`date -u +%Y%m%dT%H%M%SZ\` and report exactly what it printed as \`startedAt\`.
Then run \`tim build workers --workspace <the candidate path you used> --json\` and copy its \`result.config\` as
\`machineConfig\` and its \`result.workers\` as \`workers\`, every key and number exactly as printed. If it exits
non-zero, report ok:false and quote its error message in your summary.
If none of them works, report ok:false. Do NOT guess a path and do NOT invent a home directory.
No Grep/Glob tools. One command per Bash call.
${RUN_WITH_BASH}`,
  light({ label: 'workspace', phase: 'Baseline', schema: WORKSPACE_SCHEMA })
)

if (!workspace || !workspace.ok || !workspace.abs?.startsWith('/') || !workspace.tilde?.startsWith('~/')) {
  throw new Error(
    `increment-build-loop: could not resolve the workspace root. CLAUDE.md rule 1 wants ${WORKSPACE_CANDIDATES[0]} to resolve to the workspace checkout — symlink it if your clone is elsewhere. ${workspace ? workspace.summary : 'the resolver agent failed'}`
  )
}
if (!STARTED_AT_FORMAT.test(workspace.startedAt ?? '')) {
  throw new Error(
    `${WORKFLOW_NAME}: the workspace agent reported no start time in the form 20261001T091500Z — got ${JSON.stringify(workspace.startedAt)}. The run's id, which every stack lease names, comes from it`
  )
}

const ABS = workspace.abs.replace(/\/+$/, '')
const TILDE = workspace.tilde.replace(/\/+$/, '')
if (!workspace.canonical) {
  log(`workspace resolved at ${TILDE} — the canonical ${WORKSPACE_CANDIDATES[0]} symlink is missing (CLAUDE.md rule 1)`)
}

const RUNG_KEY = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/
const badWorkerEntries = Object.entries(workspace.workers ?? {}).filter(
  ([rung, count]) => !RUNG_KEY.test(rung) || !Number.isInteger(count) || count < 1
)
if (typeof workspace.workers !== 'object' || workspace.workers === null || badWorkerEntries.length > 0) {
  throw new Error(
    `${WORKFLOW_NAME}: the workspace agent relayed this machine's worker counts in the wrong shape — got ${JSON.stringify(workspace.workers)}. Run \`tim build workers --json\` by hand to see what it should have copied`
  )
}
const MACHINE_WORKERS = workspace.workers

const RUN_ID = `ibl-${workspace.startedAt}`
log(`${WORKFLOW_NAME}: run ${RUN_ID}`)
log(
  `${WORKFLOW_NAME}: this machine's worker counts, from ${workspace.machineConfig ?? 'no settings file'}: ${JSON.stringify(MACHINE_WORKERS)}`
)

const WORKAREA = `${ABS}/workareas/${WORKAREA_REL}`
const WORKAREA_TILDE = `${TILDE}/workareas/${WORKAREA_REL}`
const BACKLOG = `${WORKAREA}/backlog.json`
const BACKLOG_TILDE = `${WORKAREA_TILDE}/backlog.json`
const PLANS = `${WORKAREA}/plans`

const setRow = (id, flags) => `tim backlog set ${WORKAREA_REL} ${id} ${flags} --workspace ${TILDE} --json`
const SET_ROW_RULE = `WRITING TO THE BACKLOG: never Edit ${BACKLOG} by hand. Every write is one \`tim backlog set\` call, shown
where it is needed. It exits non-zero and says why if the write is refused — report that, do not work around it.`
const SKILLS = ABS + '/.claude/skills'
const BRIEFS = ABS + '/.claude/skills/requirements-pipeline/workflow/codex'
const BRIEFS_TILDE = TILDE + '/.claude/skills/requirements-pipeline/workflow/codex'
const jiraTransition = (key, statusOrList) => `tim jira transition ${key} ${statusOrList} --workspace ${TILDE} --json`

const REPO_PATH = Object.fromEntries(REPO_KEYS.map((key) => [key, REPOS[key].path]))
const GH_REPO = Object.fromEntries(REPO_KEYS.map((key) => [key, REPOS[key].github]))

const isWorkspaceRepo = (key) => REPO_PATH[key] === WORKSPACE_PATH
const repoTilde = (key) => (isWorkspaceRepo(key) ? TILDE : `${TILDE}/${REPO_PATH[key]}`)
const repoAbs = (key) => (isWorkspaceRepo(key) ? ABS : `${ABS}/${REPO_PATH[key]}`)

const repoTable = Object.entries(REPO_PATH)
  .map(([k, v]) => (isWorkspaceRepo(k) ? `${k}=${v} (the workspace root, \`${TILDE}\`)` : `${k}=${v}`))
  .join(', ')
const ghTable = Object.entries(GH_REPO)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ')

const LEGACY_ITS_REPOS = `ITS REPOS: the increment's \`repos\` list. Where it has none, an older backlog's \`repo\` field: \`both\` means backend,
frontend and tests; any other value means that repo plus tests. Where it has neither, all three: ${REPO_KEYS.join(', ')}.`

const KEYED_ITS_REPOS = `ITS REPOS: the increment's \`repos\` list, in the order it is written: that order is the increment's MERGE ORDER.
Where it has none, an older backlog's \`repo\` field: a configured key means that repo alone, and \`both\` means every
configured repo. Where it has neither, every configured repo, in this order: ${REPO_KEYS.join(', ')}.`

const FULL_REPO_RULE = `REPO PATHS: ${repoTable}. An increment is a full-stack slice: it is built, reviewed and proved in
every repo it touches at once, on the SAME branch name in each (CLAUDE.md rule 2, cross-repo branch parity).
${IS_LEGACY_KEYS ? LEGACY_ITS_REPOS : KEYED_ITS_REPOS}
Listing a repo the change leaves alone costs nothing — no change means no commit and no PR.`

const BRANCH_REPO_RULE = `REPO PATHS: ${repoTable}. This run builds straight onto \`${BASE_BRANCH}\`, which already exists in
every one of them with an open pull request. No stage creates a branch or a pull request.
ITS REPOS: the increment's \`repos\` list, exactly as written. \`[]\` means it changes no backlog repo: its output is in
the workspace repo itself (under workareas/), which is not a backlog repo and which the orchestrator commits. Where the
row has no \`repos\` at all, every configured repo: ${REPO_KEYS.join(', ')}.`

const REPO_RULE = IS_BRANCH ? BRANCH_REPO_RULE : FULL_REPO_RULE

let workspaceInIncrement = null
const buildsWorkspace = () => workspaceInIncrement !== null

const LOOP_SCRIPT = '.claude/skills/requirements-pipeline/workflow/increment-build-loop.js'

const workspaceCarriedFrom = (started) => {
  const named = started.preexistingDirty ?? []
  const summary = started.preexistingDirtySummary
  return {
    carried: named,
    outsideWorkareas: summary?.outsideWorkareas ?? named.length,
    underWorkareas: summary?.underWorkareas ?? 0,
    listedIn: summary?.listedIn ?? null
  }
}

const carriedNamedInFull = () => workspaceInIncrement.carried.length >= workspaceInIncrement.outsideWorkareas

const carriedListFile = () => `${TILDE}/${workspaceInIncrement.listedIn}`

const carriedList = (carried) => (carried.length > 0 ? carried.map((path) => `  - ${path}`).join('\n') : '  (none)')

const carriedRest = () => {
  const { carried, outsideWorkareas, underWorkareas, listedIn } = workspaceInIncrement
  const unnamed = outsideWorkareas - carried.length
  const lines = [
    unnamed > 0 ? `  - and ${unnamed} more outside \`workareas/\`` : null,
    underWorkareas > 0 ? `  - and ${underWorkareas} under \`workareas/\`, which the rule above already covers` : null
  ].filter(Boolean)
  if (lines.length === 0 || !listedIn) return ''
  return `\n${lines.join('\n')}\n  \`${carriedListFile()}\` lists every one of them. Read it with \`grep\` for the paths you mean to touch; never print it whole.`
}

const workspaceCleanLine = () =>
  carriedNamedInFull()
    ? `lists nothing outside \`workareas/\` and that list`
    : `lists nothing outside \`workareas/\`, that list and the file that lists the rest`

const workspaceRepoRule = () =>
  buildsWorkspace()
    ? `
THE WORKSPACE REPO is one of this increment's repos, under the key \`${WORKSPACE_KEY}\`. Its repo path is the workspace
root itself, \`${TILDE}\` (\`.\` in the repo table): \`git -C ${TILDE} ...\`, \`npm --prefix ${TILDE}/tim ...\`. It is on
\`${workspaceInIncrement.branch}\` like the others, but it is never clean, because it carries this run's own state and
somebody's work in progress across every branch switch. In the workspace repo:
- Never edit, stage, commit, stash, restore or delete anything under \`workareas/\` — this run's backlog, plans and logs
  live there — unless the increment's row names that exact path.
- Never edit, stage, commit, stash, restore or delete any of these files. They were uncommitted before the increment
  started and are not its work:
${carriedList(workspaceInIncrement.carried)}${carriedRest()}
- Its tree counts as clean when \`git -C ${TILDE} status --short\` ${workspaceCleanLine()}.
- Stage and commit only by explicit path: \`git -C ${TILDE} add -- <path>\` and \`git -C ${TILDE} commit -m "<message>" -- <paths>\`.
  Never \`add -A\`, \`add .\`, \`commit -a\` or a commit without a pathspec: the index may already hold somebody else's file.
- Never edit this loop's own script, \`${LOOP_SCRIPT}\`, unless the row names it. A running loop never re-reads it, so a
  change there takes effect from the next launch only: a planner says so under risks.
- A change to tim, gates.json or the stack scripts takes effect at once: every tim call and gate run for the rest of this
  increment uses the copy on this branch.`
    : ''

const ciFixerWorkspaceRule = () =>
  buildsWorkspace()
    ? ''
    : `
THE WORKSPACE REPO (\`${TILDE}\`) always carries uncommitted files that are not this increment's: this run's backlog, plans
and logs under \`workareas/\`, and often somebody's work in progress. If your fix must change it:
- Never edit, stage, commit, stash, restore or delete anything under \`workareas/\`, or any file that was already
  uncommitted before you started — \`git -C ${TILDE} status --short\` shows them; note them before you edit anything.
- Stage and commit only the files you changed, by explicit path: \`git -C ${TILDE} add -- <path>\` and
  \`git -C ${TILDE} commit -m "<message>" -- <paths>\`. Never \`add -A\`, \`add .\`, \`commit -a\` or a commit without a pathspec.
- Never edit this loop's own script, \`${LOOP_SCRIPT}\`.`

const repoStateLog = (id, stage) => `${WORKAREA_TILDE}/logs/${id}-${stage}-repo-state.json`

const repoStateCommand = (keys, { branch, logFile }) =>
  `tim workspace repo-state --repos ${keys.map((key) => `${key}:${REPO_PATH[key]}`).join(',')}${branch ? ` --branch ${branch}` : ''} --workspace ${TILDE} --json > ${logFile} 2> ${logFile.replace(/\.json$/, '.err')}`

const REPO_STATE_FIELDS = `It is one JSON line. \`result.repos[]\` gives each repo's \`key\`, \`path\`, \`branch\`, \`dirty\`, \`changed\` (each
path with its two \`git status\` letters), \`staged\` and \`merging\`, and with --branch \`onBranch\`, \`head\` and \`branchHead\`.
Decide from those fields. Never run \`git status\` or \`rev-parse\` to decide which repos changed or which branch one is on.`

const changedReposRule = (id, stage, branch) => {
  const keys = REPO_KEYS.filter((key) => key !== WORKSPACE_KEY || buildsWorkspace())
  const workspaceLine = buildsWorkspace()
    ? `\nIn the workspace repo, only changes THE WORKSPACE REPO rule leaves to this increment count.`
    : WORKSPACE_CONFIGURED
      ? `\nThe workspace repo is not one of this increment's repos: leave it alone, except as THE BEHAVIOUR SPEC says.`
      : ''
  return `WHICH REPOS: read every configured repo's state from tim, once:
\`${repoStateCommand(keys, { branch, logFile: repoStateLog(id, stage) })}\`
Read that file once. ${REPO_STATE_FIELDS}
Act on each repo whose \`dirty\` is true.${workspaceLine}`
}

const SPEC_RULE = `THE BEHAVIOUR SPEC: an increment may also change \`${TILDE}/openspec/\`, the workspace repo's own spec and
coverage, which every row's spec sync writes and leaves uncommitted. The workspace is not a configured repo and is never
branched: act on \`openspec/\` ONLY, on whatever branch the workspace is on, and never on anything else in the
workspace — not the backlog, not the plans, not the logs. See what it holds with
\`git -C ${TILDE} status --short -- openspec/\`.`

// >>> house-rules
const HOUSE_RULES = `**Comments**

- Write code that needs no comment. If a name or an extracted function can say it, rename or extract instead.
- A comment describes only the lines directly below it. Never describe callers, other modules, the backend, a library, the UI or a test. No counts: "the one row", "the only caller".
- Rationale goes in the repo's \`docs/\` or the behaviour spec, never in code.
- A comment that explains a name means the name is wrong. Rename, then delete the comment in the same change.
- When a comment is stale, delete it. Do not reword it.
- A marker that a test or tool reads is not a comment to delete.
- Doc comments (JSDoc, Javadoc) only state the contract of an exported public API. None on internal helpers.
- Bad: \`// Hapi validates the full payload before route handlers run, so the token is guaranteed present.\` Good: no comment. The route's \`validate.payload\` schema already says it.

**Ids and history**

- No ticket keys (\`EUDPA-565\`), backlog, ruling or acceptance-criteria ids (\`c-201\`, \`inc-010\`), release names ("Design Release 2.1") or session words ("the real service") in code, comments or test titles.
- No history. No before/after narration, no "renamed from", no \`REMOVED_*\` constants, no names like \`…WhenTheDocumentWasWrittenBeforeTheChange\`. Code states how things are now; git holds how they were.
- Prove a removal with an exact positive assertion. Bad: \`expect(page.getByText(REMOVED_INTERNAL_REFERENCE_LIMIT)).toHaveCount(0)\`. Good: \`expect(field).toHaveAccessibleDescription(copy.internalReference.hint)\`.

**Names**

- A name predicts what the code returns and what it changes. Read the body, then check the name told you both.
- A name's value word covers every value the code can return. Bad: \`countryNameOf(countries, code)\`, which can return a code. Good: \`countryLabelOf\`, the label shown: the name, else the code.
- Nothing (null or undefined) and an expected error, such as not found, are not part of a name. No suffix names them or a fallback: not \`…OrNull\`, \`…OrUndefined\`, \`…OrNotFound\` or \`…OrAddressBook\`. Bad: \`addressFieldTextOrNull\`, \`liveAddressOrNotFound\`. Good: \`addressFieldText\`, \`loadLiveAddress\`.
- Rename only when the name mispredicts. A name whose value word covers what the code returns, and that says what it changes, stays, even when another name would read better.
- Name a parameter or local for what it holds at that point. Bad: \`id\` and \`returnTo\` for an address id and a return that has passed its checks. Good: \`addressId\` and \`honouredReturn\`.
- Bad: \`// c-201: an amendment opens with no errors; Continue refused shows them.\` above \`const holdsSilently = readOnly || (isAmend && !refused)\`. Good: no comment, and a name that says the page hides answer errors for submitted, template and unrefused amend states.
- Bad: \`linesDroppedBy(lines, type)\` returning \`{ kept, removed }\`. Good: \`keepLinesAllowedBy(lines, type)\`.
- Bad: \`report()\` that also clears expired faults. Good: clear them where a name says so, and let \`report()\` only read.
- No metaphors. Bad: \`lightenRemote()\`. Good: \`excludeGhPagesFromFetch()\`.
- No positional boolean flags. Bad: \`saveActions(true, false)\`. Good: \`saveActions({ readOnly: true })\`.
- One concept, one name, from request header to repository and across twin repos. Bad: \`User-Id\`, \`userId\`, \`ownerId\` and "actor id" for one person.
- A rename covers the concept's whole vocabulary: keys, variables, copy keys, test titles. Search for the concept word, not only the old identifier.

**Structure**

- One rule, one owner: each display or business rule lives in one function, mirrored in each twin repo. Bad: three formatters for one port label.
- Extend the mechanism that exists. Do not add a second one beside it. When a new class or path mirrors one you are editing, extract the shared part in the same change.
- A pipeline whose callbacks branch or take several steps gets named helpers, so the top function reads as a few named steps.
- Build only what this change makes reachable.
- A literal value used by one function lives in that function. Module scope is for values the module shares, and for module set-up such as a logger, a template path or a value a test imports.
- A scope you are given limits which files you open, never which lines of an opened file you fix. Every file you touch meets these rules in full.

**Design**

- Build copy, layout and components as the design source sets them: the prototype, a design release or a ticket's acceptance criteria. Code that differs from its design source is a correctness finding.
- A review raises a \`design\` finding, the question for the designer and never a code fix, when a guide such as the GDS style guide disagrees with what the design source sets, when the design source sets two different things for one element (two labels for one field on two pages), or when the code had to choose copy, layout or a component for a case the design source does not show.
- Read the design source before you raise or judge a \`design\` finding. A backlog row's \`sources\` name it and the workarea's \`sources.json\` gives its location and the commit to read it at. "I could not confirm what the design source sets" never raises one and never refutes one: read it.
- A \`design\` finding carries everything the designer decides from: the design source quoted at file:line, as a permalink at the commit read when it is a public repo; the code quoted at file:line; the guide's rule with a link, when a guide disagrees; and the question with the options it leaves, such as "keep 'X', or change to 'Y'?".
- Bad: "The edit label may differ from the prototype. I could not confirm which label it sets." Good: "The prototype labels the name field 'Name or organisation' on the add page (\`consignment-manual-address-fields.html:9\`) and 'Name or organisation name' on the edit page (\`address-book-manual-address-fields.html:9\`), and the code copies both (\`copy.en.js:54\`, \`:36\`). For the designer: should both pages use one label, and which?"

**Tests**

- Set-up used by two tests goes in the shared test helper. Promoting a helper deletes the local copies.
- A test title states what its assertions prove. Bad: titled "flips status to submitted" while asserting \`SUBMITTED_ACTION_REQUIRED\`.
- A test must fail without the change it covers.
- Test behaviour through inputs and outputs. Mock only at the boundary the code does not own: the network, the database, the filesystem, the clock. Never mock your own modules. No spy assertions (\`toHaveBeenCalledWith\`) unless the call is itself the external side effect.
- Fix a flaky assertion. Never delete or loosen it, and never add a test only to raise coverage.

**Logging and errors**

- Every branch that changes an outcome (refusal, redirect, retry, fallback, state switch) logs once, with the ids support searches by. A user's own input error shown back on the form is not one: do not log it. Another service refusing what this one accepted is: log it at warn.
- Log the throwable (Java) or \`{ err }\` (pino), never only its message. Bad: \`log.warn("Retryable error, message left for retry: {}", classified.getMessage())\`. Good: \`log.warn("Retryable error, message {} left for retry", messageId, classified)\`.
- No request or response bodies at INFO.
- No empty catch. \`.catch(() => undefined)\` hides the failure it swallows.`
// <<< house-rules

const HOUSE_RULES_FILE = `${TILDE}/.claude/rules/code-quality.md`

const houseRulesFor = (duty) => `THE HOUSE RULES bind ${duty}. They win over any guide, exemplar, recipe, plan or neighbouring file
that says otherwise. A breach is a defect to fix in this change: "taste", "pre-existing", "out of scope" and "a nearby
file does it" are never reasons to keep one. The full rules and their detail: ${HOUSE_RULES_FILE} — read it in full.
${HOUSE_RULES}
`

const HOUSE_RULES_TO_WRITE = houseRulesFor('every line of code, comment, name, test title and log line you write')
const HOUSE_RULES_TO_PLAN = houseRulesFor(
  'the code this plan leads to: every decision, home and owner it records, and every test it asks for'
)
const HOUSE_RULES_TO_JUDGE = houseRulesFor('every line of code, comment, name, test title and log line you judge')
const HOUSE_RULES_TO_REPAIR = houseRulesFor(
  'every repair you make: every line of code, comment, name, test title and log line you write'
)

const SPEC_PREFIXES = ['live-animals', 'germinal-products', 'plants', 'ins', 'admin']

const SPEC_SET_NAMES = {
  'live-animals': 'animals',
  'germinal-products': 'germinal',
  plants: 'plants',
  ins: 'ins',
  admin: 'admin'
}

const SPEC_PREFIXES_BY_REPO_PATH = {
  'repos/trade-imports-animals-frontend': ['live-animals', 'germinal-products'],
  'repos/trade-imports-animals-backend': ['live-animals', 'germinal-products'],
  'repos/trade-imports-plants-frontend': ['plants'],
  'repos/trade-imports-plants-backend': ['plants'],
  'repos/trade-imports-ins-frontend': ['ins'],
  'repos/trade-imports-ins-backend': ['ins'],
  'repos/trade-imports-address-book': ['ins'],
  'repos/trade-imports-animals-admin': ['admin']
}

const SPEC_VALIDATE = `${TILDE}/tools/frontend-change/openspec-validate.sh`

const SPEC_WHOLE_CAPABILITY = `Validation and lint judge the WHOLE capability, not only your lines, so a failure in a
   capability this row writes is this row's to fix even where it predates the row: an over-long requirement, a scenario
   missing, a lint finding. Fix it in place by ${ABS}/openspec/config.yaml's rules, keeping the behaviour it states:
   tighten the wording, or move examples and edge cases into scenarios. Never delete or weaken a requirement to make it
   pass, and never report such a failure as pre-existing and leave it.`

const SPEC_PREFIX_TABLE = `WHICH PREFIX, by repo and set:
- \`trade-imports-animals-frontend\`: a change under \`sets/live-animals\` → \`live-animals/\`; under \`sets/germinal-products\`
  → \`germinal-products/\`. They are sibling sets: never spec germinal behaviour under \`live-animals/\`, or the reverse,
  even where a germinal page began as a copy.
- \`trade-imports-plants-frontend\` and \`trade-imports-plants-backend\` → \`plants/\`.
- \`trade-imports-ins-frontend\`, \`trade-imports-ins-backend\` and \`trade-imports-address-book\` → \`ins/\`.
- \`trade-imports-animals-admin\` → \`admin/\`.
- \`trade-imports-animals-backend\` → the prefix of the journey whose notification it changes (\`live-animals/\` or
  \`germinal-products/\`), or \`admin/\` for what an operator sees.
- Any other repo — reference data, the gateway, a stub, the schemas — → the prefix whose observable behaviour the change
  alters, or none. A tests-repo change adds or moves coverage links; it changes no spec text on its own.`

const SPEC_RECORDS = `WHAT THE SPEC RECORDS (${ABS}/openspec/config.yaml owns this): observable behaviour only — what a user, an
operator or another system sees. That is each page's exact title (its H1, from the \`title\` key in its copy files,
not its legend), the question it asks and the controls it offers, any wording a requirement or scenario quotes (a hint,
an error message, a caption, a button), which pages are offered and in what order (journey-flow), which questions apply
given earlier answers (journey-obligations), task-list rows and section captions, the browser page title, and the
dashboard, lifecycle, event and API behaviour a capability states. It never records selectors, routes, CSS classes,
files, modules or test names. So a WORDING change is spec'd wherever a title, a Purpose, a requirement or a scenario
states that wording; a CONTENT change is spec'd when it changes what a page shows or asks; a LAYOUT change is spec'd
when it changes page order, what a page offers or groups, or a caption — and pure styling (spacing, colour, a class)
that changes none of those is not.`

const SPEC_SYNC_LINE = `\`Spec sync: <capability path> (<n> scenarios), … — validate green, lint clean\`, naming
   every capability written and each one removed as \`deleted: <capability path>\`, or \`Spec sync: none — <reason>\``

const specSkillStep = () =>
  FRONTEND_CHANGE_KEYS.length
    ? `Where the change was made through ${SKILLS}/frontend-change/SKILL.md, its Step 5 is how the spec is written:
   follow it, as the line about that skill above says, then run step 3's lint as well. Otherwise do`
    : 'Do'

const specSyncDuty = () => `
THE BEHAVIOUR SPEC — EVERY ROW KEEPS IT CURRENT, whatever its repos. It lives in the workspace repo, \`${TILDE}/openspec/\`.
${SPEC_RECORDS}
${SPEC_PREFIX_TABLE}
1. Work out which observable behaviour this row changed, from the plan's section 8 and your own diff.
2. ${specSkillStep()} the work yourself: read ${ABS}/openspec/config.yaml and
   ${SKILLS}/frontend-change/references/SPEC_SYNC.md in full — the merge technique, the capability lookup and the file
   shapes — then find each capability under \`${TILDE}/openspec/specs/<prefix>/\` with \`grep -rln\` and merge into its
   \`spec.md\` and \`${TILDE}/openspec/coverage/<path>/coverage.json\`. A genuinely new capability gets its row in
   \`${TILDE}/openspec/coverage/AREAS.md\` first. Link only tests this row wrote or changed, read from their bodies.
3. Validate, in the FOREGROUND: \`${SPEC_VALIDATE} --root ${TILDE} <capability path> [<capability path> ...]\` once
   for every capability you wrote that still exists. A capability you deleted is not validated: confirm it is gone
   with \`ls ${TILDE}/openspec/specs/<capability path>\`, which must fail. Then run \`tim spec lint --capability <prefix> --workspace ${TILDE} --json\` once per
   prefix you wrote under. Either exiting non-zero means the row is NOT complete: fix the write, or report ok:false
   saying what failed. Never report ok:true over a red validation.
   ${SPEC_WHOLE_CAPABILITY}
4. Leave \`openspec/\` uncommitted: the land stage commits it.
5. Put one line in notes, on a line of its own: ${SPEC_SYNC_LINE} when the row changes no behaviour the spec records.
   The consistency reviewer checks that reason and the ladder validates the write again.`

const SPEC_SYNC_FIX_LINE = `THE BEHAVIOUR SPEC: a fix that changes observable behaviour keeps \`${TILDE}/openspec/\` in step, by the same
duty the implementor followed — update what it wrote, validate it again with \`${SPEC_VALIDATE} --root ${TILDE} <capability path>\`
and \`tim spec lint --capability <prefix> --workspace ${TILDE} --json\` (a capability it deletes is marked \`deleted:\` and
confirmed gone with \`ls\`, not validated), and put your own \`Spec sync:\` line in notes.
${SPEC_WHOLE_CAPABILITY}`

const specSyncPlanSection = () => `   8. Spec sync — every row has one, whatever its repos. Name the prefix each changed behaviour belongs to, by WHICH
      PREFIX below, then each capability under \`${TILDE}/openspec/specs/<prefix>/\` it touches and the requirement and
      scenario to add, change or delete there, by ID where one exists (find them with \`grep -rln\`), any new capability
      and the AREAS.md row it needs, and the coverage links the plan's tests will give it.${
        FRONTEND_CHANGE_KEYS.length ? ' For a row routed through\n      frontend-change, its Step 5 makes these writes: name what it will write.' : ''
      } Where the row changes no
      behaviour the spec records, write "none — <reason>": reviewers check that reason.
${SPEC_RECORDS}
${SPEC_PREFIX_TABLE}`

const SPEC_SYNC_PATTERN = /^[ \t>*_`+-]*(?:\d+[.)][ \t]+)?[*_`]*Spec sync[*_`]*:[*_`]*(.*)$/gim
const specSyncLinesIn = (text) =>
  [...String(text ?? '').matchAll(SPEC_SYNC_PATTERN)].map(([, rest]) => `Spec sync: ${rest.trim()}`.trimEnd())

const reportedSpecSync = (notes) => specSyncLinesIn(notes).join('\n   ') || '(none reported)'

const completionLinePattern = (label) =>
  new RegExp(`^[ \\t>*_\`+-]*(?:\\d+[.)][ \\t]+)?[*_\`]*${label}[*_\`]*:[*_\`]*(.*)$`, 'gim')

const completionLinesIn = (label, text) =>
  [...String(text ?? '').matchAll(completionLinePattern(label))].map(([, rest]) => `${label}: ${rest.trim()}`.trimEnd())

const reportedCompletionLine = (label, notes) =>
  completionLinesIn(label, notes).join('\n   ') || `${label}: (none reported)`

const COMPLETION_LABELS = ['Probes', 'Docs updated']

const COMPLETION_LINES_DUTY = `
PROBES AND DOCS — two more lines in notes, each on a line of its own, whatever the row's repos:
- \`Probes: <n> full links, <n> red then green\`, adding \`; partial: <ids and why>\` for any link left partial, or
  \`Probes: none — <reason>\` when this row writes or upgrades no coverage link to "full". A link is "full" only once
  you have inverted the production line its test depends on, seen the test fail, restored the line and seen it pass,
  by ${SKILLS}/frontend-change/references/SPEC_SYNC.md "The red probe". The leased stack holds each frontend's
  default port, so a FIT test runs as \`npm --prefix ${TILDE}/<repoPath> run test:fit:ci -- <spec file>\`, never
  \`test:fit\`, with this machine's \`--workers\` count from GUARD RAILS after the spec file.
- \`Docs updated: <paths>\`, or \`Docs updated: none — searched <terms> in <dirs>\`. Search the changed repos' \`docs/\`,
  the recipes, the JSDoc and Javadoc of every function you changed, comments within ten lines of every hunk, and
  convention test names, for the behaviour you changed. Every one that now states the old way is part of this change:
  edit it, or delete a stale comment.`

const COMPLETION_LINES_FIX = `PROBES AND DOCS: a fix that writes or upgrades a "full" coverage link, or makes a doc, recipe, JSDoc or
comment untrue, reports its own \`Probes:\` or \`Docs updated:\` line in notes, by the same duty the implementor followed.`

const completionReviewRule = (implementorNotes) => `PROBES AND DOCS are part of the change. The implementor reported:
   ${COMPLETION_LABELS.map((label) => reportedCompletionLine(label, implementorNotes)).join('\n   ')}
Each of these is a finding: a missing \`Probes:\` or \`Docs updated:\` line; a coverage link written "full" that the
\`Probes:\` line does not account for; a \`Docs updated: none\` whose search misses a doc, recipe, JSDoc, comment or
test name the change makes untrue, inside the diff or outside it. A stale comment's fix is to delete it.`

const ladderCompletionStep = (implementorNotes, fixerNotes) => `2b. PROBES AND DOCS. Every row reports a \`Probes:\` and a \`Docs updated:\` line. The implementor's:
   ${COMPLETION_LABELS.map((label) => reportedCompletionLine(label, implementorNotes)).join('\n   ')}
   The fixer's: ${
     fixerNotes === null
       ? '(no fix stage ran)'
       : COMPLETION_LABELS.map((label) => reportedCompletionLine(label, fixerNotes)).join('; ')
   }
   When NEITHER the implementor NOR the fixer reported one of these lines, that is a failure: put "no <label> line
   reported" in failures[], naming the label. A fixer with no line is normal when the implementor reported one.
   Run nothing more here: the consistency reviewer has judged what the lines claim.`

const specPrefixesIn = (text) => {
  const lines = specSyncLinesIn(text).join('\n')
  return SPEC_PREFIXES.filter((prefix) => new RegExp(`(^|[^a-z-])${prefix}/`).test(lines))
}

const inPrefixOrder = (prefixes) => SPEC_PREFIXES.filter((prefix) => prefixes.includes(prefix))

const specReviewRule = (implementorNotes) => `THE SPEC SYNC is part of the change. The implementor reported:
   ${reportedSpecSync(implementorNotes)}
See the write with \`git -C ${TILDE} status --short -- openspec/\` and \`git -C ${TILDE} diff HEAD -- openspec/\`, and Read
a new file under it in full. Judge it against the plan's section 8 and ${ABS}/openspec/config.yaml. Each of these is a
finding, its \`file\` written \`${WORKSPACE_KEY}:openspec/<path>\`: a behaviour change in the diff that no scenario records; a scenario the diff
does not implement; a coverage link to a test the change does not hold; a write under the wrong prefix (germinal
behaviour under \`live-animals/\`, or the reverse); a \`Spec sync: none\` whose reason does not hold against the plan's
behaviour changes, wording, content and layout included where the spec records them; and no \`Spec sync:\` line at all.`

const ladderSpecStep = (id, implementorNotes, fixerNotes) => `2a. THE SPEC SYNC. Every row reports a \`Spec sync:\` line. The implementor's:
   ${reportedSpecSync(implementorNotes)}
   The fixer's: ${fixerNotes === null ? '(no fix stage ran)' : reportedSpecSync(fixerNotes)}
   When NEITHER the implementor NOR the fixer reported a \`Spec sync:\` line, that is a failure: put "no spec sync
   reported" in failures[]. A fixer with no line is normal when the implementor reported one: a fixer reports a line
   only when its fix changed behaviour. For the capability paths the lines name that still exist, run
   \`${SPEC_VALIDATE} --root ${TILDE} <capability path> [...] > ${WORKAREA_TILDE}/logs/${id}-ladder-spec-validate.log 2>&1\`
   once. A path marked \`deleted:\` is not validated: confirm it is gone with \`ls ${TILDE}/openspec/specs/<capability path>\`,
   which must fail — one that still exists is a failure. Then \`tim spec lint --capability <prefix> --workspace ${TILDE} --json > ${WORKAREA_TILDE}/logs/${id}-ladder-spec-lint-<prefix>.log 2>&1\`
   once per prefix they write under, reading each log ONCE. Either exiting non-zero is a failure, which you repair like
   any other: the spec write is this increment's, and a row whose spec does not validate is not complete. A line that
   reads \`Spec sync: none — <reason>\` runs nothing here: the reviewers have judged the reason.
   ${SPEC_WHOLE_CAPABILITY}`

const SPEC_IN_WORKSPACE = `THE BEHAVIOUR SPEC: \`${TILDE}/openspec/\` is part of the workspace repo, one of this increment's
repos, so a change under it is this increment's like any other file there, under THE WORKSPACE REPO rule.`

const specLandStep = () => {
  if (buildsWorkspace()) return `4a. ${SPEC_IN_WORKSPACE} It goes in the workspace repo's commit, staged by explicit path.`
  if (WORKSPACE_CONFIGURED) {
    return `4a. ${SPEC_RULE} If it has changes, report landed:false naming them, and commit nothing anywhere: this programme
   builds the workspace as a repo of its own, so a spec change belongs to an increment that names \`${WORKSPACE_KEY}\`.`
  }
  return `4a. ${SPEC_RULE} If it has changes, they are part of this increment: commit them in the workspace with the same
   subject and trailer, and nothing else from the workspace. Two commands, the pathspec on both:
   \`git -C ${TILDE} add -- openspec/\` then \`git -C ${TILDE} commit -m "<message>" -- openspec/\`.
   The pathspec on the commit is load-bearing: anything else staged in the workspace stays out of it. Do NOT push
   the workspace. Name the spec commit in your summary, separately from the repo commits.`
}

const specPreserveStep = (id, branch) =>
  buildsWorkspace()
    ? `6a. ${SPEC_IN_WORKSPACE} It goes in the wip commit with the rest of the workspace repo's work.`
    : `6a. ${SPEC_RULE} If it has changes, they cannot go on \`${branch}\` — the workspace is not on it — so stash them:
   \`git -C ${TILDE} stash push -u -m "failed-${id}" -- openspec/\`, then confirm
   \`git -C ${TILDE} status --short -- openspec/\` is empty. Name the stash ref in the note below.`

const specBaselineLine = () =>
  buildsWorkspace()
    ? `   For the workspace repo, clean is as THE WORKSPACE REPO rule says, \`openspec/\` included.`
    : `   ${SPEC_RULE} It too must be clean before the increment starts: the land stage commits everything under it as
   this increment's, so anything already there would go in with it. If it is dirty, report ok:false naming the files.`

const GATE_PHASES = ['unit', 'fit', 'e2e']
const WHOLE_GATE = 'all'
const gateLogs = (id, stage) => `${WORKAREA_TILDE}/logs/${id}-${stage}`

const RUN_HOLDER = RUN_ID

const gateResultFile = (phase, logs) => `${logs}/gate-result-${phase}.json`
const gateCommand = (phase, logs) =>
  `tim build gate ${WORKAREA_REL} --phase ${phase} --workspace ${TILDE} --json --logs ${logs} --holder "${RUN_HOLDER}" --result ${gateResultFile(phase, logs)} --detach`
const MAX_GATE_WAITS = 20
const GATE_WAIT_RULE = `WAITING FOR THE GATE. Every gate command carries \`--detach\`: it starts the gate in its own background
  process and returns at once, printing \`result.detached\` true and the gate's \`pid\`. The gate is now running: never
  kill it and never run the command again. Wait for it with ONE FOREGROUND Bash call, \`timeout\` 600000:
  \`tim build gate-wait <the --result file of that command> --workspace ${TILDE} --json\`
  It prints the gate's own JSON line once the gate finishes, and exits as the gate did. If it prints
  \`GATE_STILL_RUNNING\` instead, make the same call again, up to ${MAX_GATE_WAITS} times. If it prints \`GATE_DIED\`, the
  gate's process stopped without a result: that gate is RED, reported as "the gate died", with the error's message
  copied word for word. A gate that has still written no result after the last wait is RED, reported as "the gate did
  not finish". Never use run_in_background, a trailing \`&\` or \`sleep\` for any of this: each wait returns by itself.`
const gateCommandList = (phases, logs) =>
  phases.map((phase, index) => `   ${index + 1}. \`${gateCommand(phase, logs)}\``).join('\n')

const owesWholeGate = (phases) => GATE_PHASES.every((phase) => phases.includes(phase))

const STACK_HELD_LINE = `return \`stackHeld\` with \`holder\` (null when it is null) and \`detail\`
  copied word for word. Never wait for it, retry, work round it, or take the stack down: the loop decides what happens next.`

const DUPLICATION_REPAIR = `A red \`duplication\` rung names test set-up copied into a changed test file. Repair it by
moving that set-up into the shared test helper and deleting every copy, never by rewording a copy until it no longer
matches.`

const GATE_RULE = `THE GATE owns every repo's own rungs. \`tim build gate\` runs the rungs
listed for each backlog repo in ${ABS}/.claude/skills/requirements-pipeline/references/gates.json — format check,
lint, typecheck, unit tests, \`mvn verify\`, the duplication check on changed test files, FIT and the local-stack E2E
suite — each to its own
\`gate-<repo>-<rung>.log\` under the --logs folder. Every gate command names this run's lease holder,
\`${RUN_HOLDER}\`: the workspace stack is already up under that lease, and the gate's E2E phase uses it as it is,
rebuilding only what changed. The gate refuses a stack leased to anybody else or up with no lease at all. So:
- Run every gate command exactly as written, character for character: never drop, add or reorder a flag.
- Never pick, add, drop or substitute a script for a repo's own rungs, and never run one by hand.
- Never start or stop the workspace stack, and never drive \`docker\` yourself. A stack that is up is not in your way:
  leave it as it is.
- Run each gate command in the FOREGROUND, then wait for it as below. The wait prints the gate's one JSON line:
  \`ok\`, then \`result.green\` and \`result.rungs[]\`, each with \`repo\`, \`name\`, \`phase\`, \`ok\`, \`log\` and \`reason\`.
  It exits 1 unless every rung passed. A phase whose \`result.rungs\` is empty has nothing to run for this backlog:
  it is neither green nor red, so say so and go on. A gate command or wait that errors before running any rung
  (\`ok\` false with an \`errors[]\` entry and no \`result\`) is RED: report its error verbatim.
- ${GATE_WAIT_RULE}
- A gate command whose \`result.stack.held\` is not null found the workspace stack in somebody else's hands. Stop
  there, run nothing more, and ${STACK_HELD_LINE}
- A red rung's evidence is its \`log\`: read that file once. For a Playwright failure read
  \`test-results/*/error-context.md\` in the tests repo as well. ${DUPLICATION_REPAIR}
- An e2e rung that went red, or passed only on a retry, also carries \`stackLogs\`: each stack container's own log,
  written before the stack could go. A 500 page, a dropped socket or a test timeout is explained there: read the log of
  the service the failure points at and name its cause. Never call a failure transient without it.`

const RUN_STACK_RULE = `THE WORKSPACE STACK is already up, leased to this run as \`${RUN_HOLDER}\` for every increment it builds. A
check that needs it up uses it as it is. Never acquire or release its lease, and never start, stop, restart or rebuild
it: the run took it before its first increment and gives it back after its last. If a check that needs it cannot reach
it, run \`tim docker lease status --workspace ${TILDE} --json\` once. Where \`result.lease\` is null or its \`holder\` is not
\`${RUN_HOLDER}\`, the stack is no longer this run's: run nothing more that needs it, and return \`stackHeld\` with
\`holder\` copied from \`result.lease.holder\` (null when there is no lease) and \`detail\` saying whether \`result.up\` is
true and who, if anybody, holds the lease. Never wait for it, retry, work round it, or take the stack down: the loop
decides what happens next. Where the lease is still this run's but \`result.up\` is false, the stack went down under
the run (Docker Desktop quit, say): run nothing more that needs it, and return \`stackDown\` with \`detail\` saying what
could not reach it. Never start it yourself: the loop takes the lease again and runs this stage once more. Where the
lease is still this run's and \`result.up\` is true, the check failed for a reason of its own: report it.`

const BUILDER_PHASES = ['unit', 'fit']

const builderGateRule = (id, stage, phases = BUILDER_PHASES) =>
  `${
    phases.length === 0
      ? `CHECKING YOUR OWN WORK: this row's gatePhases runs neither the gate's unit nor its FIT phase, so run no gate phase
yourself. Never run the gate's E2E phase, never start or stop the workspace stack, and never pick a script by hand for a
repo's own rungs.`
      : `CHECKING YOUR OWN WORK: a repo's own rungs belong to \`tim build gate\`. Run its ${phases.length === BUILDER_PHASES.length ? 'unit and\nFIT phases' : `${phases[0] === 'fit' ? 'FIT' : phases[0]} phase`} yourself, one Bash call each, in the FOREGROUND with the Bash tool's \`timeout\` set to 600000:
${gateCommandList(phases, gateLogs(id, stage))}
Each starts its gate and returns at once; the wait below prints the gate's one JSON line, and a red rung names its \`log\` —
read that file once.
${GATE_WAIT_RULE}
To repair a red format rung, run the
repo's \`format\` script, then the unit phase again. ${DUPLICATION_REPAIR} Never run the gate's E2E phase — the ladder does, after review —
never start or stop the workspace stack, and never pick a script by hand for a repo's own rungs. A gate command whose
\`result.stack.held\` is not null found the stack in somebody else's hands: ${STACK_HELD_LINE}`
  }
The plan's sections 5 and 6 checks are yours to run as the plan writes them.
${RUN_STACK_RULE}`

const codexGateUnit = (id, stage) =>
  `tim build gate ${WORKAREA_REL} --phase unit --workspace ${ABS} --json --logs ${WORKAREA}/logs/${id}-${stage} --holder "${RUN_HOLDER}"`

const CODEX_NO_GATE = 'none'
const codexGateBinding = (id, stage, phases) => (phases.includes('unit') ? codexGateUnit(id, stage) : CODEX_NO_GATE)

const GATE_RUNG_SCHEMA = {
  type: 'object',
  required: ['repo', 'name', 'phase', 'ok'],
  properties: {
    repo: { type: 'string' },
    name: { type: 'string' },
    phase: { type: 'string', enum: GATE_PHASES },
    ok: { type: 'boolean' },
    log: { type: 'string' },
    reason: { type: 'string' }
  },
  additionalProperties: false
}

const describeGateRung = ({ repo, name, phase, ok, log: rungLog, reason }) =>
  `   ${repo} ${name} (${phase}): ${ok ? 'green' : `RED — ${reason ?? 'no reason given'}`}${rungLog ? ` — ${rungLog}` : ''}`

const baselineRungList = (baseline) =>
  (baseline?.rungs ?? []).map(describeGateRung).join('\n') || '   (the baseline reported no rungs)'

const REVIEW_GROUP_CAP = 12
const DOCS_LANGUAGE = 'docs'
const LANGUAGE_BY_EXTENSION = {
  java: 'java',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'javascript',
  njk: 'nunjucks',
  html: 'nunjucks',
  scss: 'styles',
  css: 'styles',
  md: DOCS_LANGUAGE,
  json: DOCS_LANGUAGE,
  yaml: DOCS_LANGUAGE,
  yml: DOCS_LANGUAGE,
  txt: DOCS_LANGUAGE
}

const repoKeyOfPath = (repoPath) => REPO_KEYS.find((key) => REPO_PATH[key] === repoPath)

const FILE_REPO_KEYS = [...new Set([...REPO_KEYS, WORKSPACE_KEY])]

const repoOfFile = (file) => {
  const prefixed = /^([a-z]+):/.exec(file)
  if (prefixed && FILE_REPO_KEYS.includes(prefixed[1])) return prefixed[1]
  const underRepos = /^repos\/[^/]+/.exec(file)
  return (underRepos && repoKeyOfPath(underRepos[0])) ?? 'unknown'
}

const languageOfFile = (file) => {
  const extension = /\.([A-Za-z0-9]+)$/.exec(file)?.[1]?.toLowerCase()
  return LANGUAGE_BY_EXTENSION[extension] ?? 'other'
}

const splitIntoParts = (items, cap) => {
  const partCount = Math.ceil(items.length / cap)
  const partSize = Math.ceil(items.length / partCount)
  return Array.from({ length: partCount }, (_, index) => items.slice(index * partSize, (index + 1) * partSize))
}

const groupByReviewKey = (items, fileOf) => {
  const byKey = new Map()
  for (const item of items) {
    const key = `${repoOfFile(fileOf(item))}/${languageOfFile(fileOf(item))}`
    byKey.set(key, [...(byKey.get(key) ?? []), item])
  }
  return byKey
}

const partName = (repo, language, index, partCount) =>
  partCount > 1 ? `${repo}-${language}-${index + 1}` : `${repo}-${language}`

const reviewGroupsOf = (items, fileOf) =>
  [...groupByReviewKey(items, fileOf).entries()].flatMap(([key, groupItems]) => {
    const [repo, language] = key.split('/')
    const parts = splitIntoParts([...new Set(groupItems.map(fileOf))], REVIEW_GROUP_CAP)
    return parts.map((part, index) => ({
      repo,
      language,
      files: part,
      items: groupItems.filter((item) => part.includes(fileOf(item))),
      name: partName(repo, language, index, parts.length)
    }))
  })

const WHOLE_CHANGE = '(whole change)'
const findingFile = (finding) => finding.file || WHOLE_CHANGE

const groupFilesForReview = (fileList) => reviewGroupsOf(fileList, (file) => file)
const groupFindingsForVerification = (findings) => reviewGroupsOf(findings, findingFile)

const isWorkspaceGroup = (group) => group.repo === WORKSPACE_KEY && !buildsWorkspace()

const groupRepoPath = (group) => {
  if (isWorkspaceGroup(group)) return TILDE
  return REPO_PATH[group.repo] ? repoTilde(group.repo) : `${TILDE}/<repoPath>`
}
const groupFileList = (group) => group.files.map((file) => `- ${file}`).join('\n')

const groupDiffCommand = (group) =>
  isWorkspaceGroup(group)
    ? `\`git -C ${TILDE} diff HEAD -- <path>\` (a new, untracked file shows in no diff: Read it in full)`
    : `\`git -C ${groupRepoPath(group)} diff --staged -- <path>\``

const MERGE_RANK = { backend: 0, tests: 1, frontend: 2 }
const UNRANKED = Number.MAX_SAFE_INTEGER
const WORKSPACE_RANK = Number.POSITIVE_INFINITY
const rankInRow = (rowRepos, repo) => (rowRepos.includes(repo) ? rowRepos.indexOf(repo) : UNRANKED)
const mergeRankOf = (rowRepos, repo) => {
  if (repo === WORKSPACE_KEY) return WORKSPACE_RANK
  return IS_LEGACY_KEYS ? (MERGE_RANK[repo] ?? UNRANKED) : rankInRow(rowRepos, repo)
}
const sortForMerge = (list, rowRepos) =>
  [...list].sort((a, b) => mergeRankOf(rowRepos, a.repo) - mergeRankOf(rowRepos, b.repo))

const LEGACY_MERGE_ORDER = `MERGE ORDER for a cross-repo increment: BACKEND FIRST, THEN TESTS, THEN FRONTEND. The
backend is the provider and the frontend the consumer, so \`${BASE_BRANCH}\` is never left holding a frontend that
calls an endpoint which is not there yet; and CDP runs the tests repo's suite against the deployed frontend, so a
frontend merged ahead of its own test fixes is exercised by stale specs and CDP goes red.`

const KEYED_MERGE_ORDER = `MERGE ORDER for a cross-repo increment: the order the increment's \`repos\` list names them. The
backlog writes that list provider before consumer — a service before the frontend that calls it, a stub before the
service that calls it, and a tests or performance-tests repo after every service it exercises — so
\`${BASE_BRANCH}\` is never left holding a consumer of something that is not there yet. A pull request in a repo the list
does not name merges last.`

const WORKSPACE_MERGE_ORDER = WORKSPACE_CONFIGURED
  ? `
The workspace repo's pull request merges after every other one, wherever the list names it: it is the factory the next
increment runs on, never deployed, so it changes only once everything built alongside it is on \`${BASE_BRANCH}\`.`
  : ''

const MERGE_ORDER_RULE = `${IS_LEGACY_KEYS ? LEGACY_MERGE_ORDER : KEYED_MERGE_ORDER}${WORKSPACE_MERGE_ORDER}
EVERY PR of the increment must be GREEN — AND, where the approval gate is on, APPROVED — BEFORE ANY ONE OF THEM
MERGES. Half an increment on \`${BASE_BRANCH}\` is the failure this ordering exists to prevent, and nothing
auto-reverts it.`

const PLAN_MERGE_ORDER = IS_LEGACY_KEYS
  ? 'in merge order: backend, then tests, then frontend'
  : `in merge order: the order the increment's \`repos\` list gives them, which is the order the merge stage merges in.
That order must put a provider before its consumer — a service before a frontend that calls it, a stub before the
service that calls it, and a tests or performance-tests repo after every service it exercises. Where the row's
order does not, keep the row's order in repos and say so under risks, naming the order it should have${WORKSPACE_CONFIGURED ? `. Whatever the order, the workspace repo merges last, after every other` : ''}`

const hardStop = (r) => Boolean(r && r.blocked && r.blocked !== 'none')

const describeStackHolder = (holder) =>
  holder ? `"${holder}"` : 'nobody: no lease names it, so somebody released this run\'s lease or started the stack by hand'

const stackHeldDetail = (id, stage, held) =>
  `${id} ${stage}: the workspace stack is held by ${describeStackHolder(held.holder)}. ${held.detail}`

const RUN_LEASE_LOGS = `${WORKAREA_TILDE}/logs/${RUN_ID}-lease`

const RUN_LEASE_ACQUIRE_SCHEMA = {
  type: 'object',
  required: ['acquired', 'refused', 'holder', 'summary'],
  properties: {
    acquired: { type: 'boolean', description: "tim's `ok`: true when the lease is this run's" },
    refused: {
      type: 'boolean',
      description: "true only when tim refused the lease because somebody else has the stack (errors[0].code STACK_HELD)"
    },
    holder: {
      type: ['string', 'null'],
      description: "Who holds the workspace stack when refused, copied from tim's result.holder. null otherwise, or when nobody leases it"
    },
    summary: { type: 'string', description: "tim's errors[0].message word for word when ok is false; otherwise what it did" }
  },
  additionalProperties: false
}

const RUN_LEASE_RELEASE_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const acquireRunLease = () =>
  agent(
    `You are the LEASE TAKER for build run ${RUN_ID}. You take the workspace stack's lease for the whole run, before
its first increment. That is your whole job.
${leaseGuardrails('acquire')}
Run exactly one command, in the FOREGROUND with the Bash tool's \`timeout\` set to 600000:
\`tim docker lease acquire --holder "${RUN_HOLDER}" --mode dev --workspace ${TILDE} --json --logs ${RUN_LEASE_LOGS}\`
It prints one JSON line. Report acquired:true only when it exited 0 and printed ok:true, whether it started the stack
or found it already leased to \`${RUN_HOLDER}\`. When it printed ok:false, report acquired:false with \`errors[0].message\`
word for word as summary; set refused:true only when \`errors[0].code\` is STACK_HELD, and copy \`result.holder\` into
holder. A command that hits the Bash timeout or prints no JSON is acquired:false, refused:false, with what it printed.
Run nothing else, and never start or stop the stack any other way.
Return the structured output only.`,
    light({ label: 'run lease:acquire', phase: 'Baseline', schema: RUN_LEASE_ACQUIRE_SCHEMA })
  )

const releaseRunLease = () =>
  agent(
    `You are the LEASE RELEASER for build run ${RUN_ID}. The run has ended, and you give back the workspace stack's
lease it held as \`${RUN_HOLDER}\`. That is your whole job.
${leaseGuardrails('release')}
Run exactly one command, in the FOREGROUND with the Bash tool's \`timeout\` set to 600000:
\`tim docker lease release --holder "${RUN_HOLDER}" --workspace ${TILDE} --json --logs ${RUN_LEASE_LOGS}\`
It prints one JSON line. Report ok:true only when it exited 0 and printed ok:true — which it also does when there
was no lease to give back. Otherwise report ok:false with \`errors[0].message\` word for word. Run nothing else, and
never take the stack down any other way.
Return the structured output only.`,
    light({ label: 'run lease:release', phase: 'Done', schema: RUN_LEASE_RELEASE_SCHEMA })
  )

const FULL_PUSH_GUARD = `- Never \`git push --force\`. Never merge a PR that is not green.
- NEVER push to \`${BASE_BRANCH}\`. Nothing in this loop writes to the base branch except the merge stage, and it
  does it by merging an approved PR. Every other push in every other stage goes to a work branch, always with the
  fully-qualified refspec form given below. A push that updates \`${BASE_BRANCH}\` has bypassed CI, review and the
  approval gate at once.`

const BRANCH_PUSH_GUARD = `- Never \`git push --force\`. Never create, edit, retitle, un-draft, close or merge a pull request: every PR on
  \`${BASE_BRANCH}\` belongs to a human, and so does its title, its body and its draft state.
- NEVER push to ${PROTECTED_BRANCHES.map((name) => `\`${name}\``).join(' or ')}. Every push in every stage goes to \`${BASE_BRANCH}\`, the branch this run
  builds on, always with the fully-qualified refspec form given below. Never create a branch.
- A repo may be MID-MERGE by design (\`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet MERGE_HEAD\` prints a SHA). Never
  commit, continue, abort or reset that merge unless your own task below tells you to.`

const OTHER_COMPOSE_GUARD = `- A command that starts any other Docker Compose project — \`docker compose run\` also starts the services in its
  \`depends_on\` and leaves them running — is followed, before you return, by that repo's own script that takes the
  project down. Leave nothing running that you started.`

const STACK_GUARD = `- THE WORKSPACE STACK IS LEASED TO THIS RUN, with \`tim docker lease\`, as \`${RUN_HOLDER}\`. The run takes it
  once, before its first increment, and gives it back once, at the end. Never start, stop, restart or rebuild it — no
  \`tim docker up\`, \`dev\` or \`down\`, no \`tim docker lease acquire\` or \`release\`, no \`run-stack.sh\` or
  \`stop-stack.sh\`, no \`docker compose\` against it. The gate is the only thing that rebuilds it.
${OTHER_COMPOSE_GUARD}`

const leaseStackGuard = (verb) => `- THE WORKSPACE STACK: your task below is to ${verb === 'acquire' ? 'take' : 'give back'} its lease for this run, as
  \`${RUN_HOLDER}\`, with \`tim docker lease ${verb}\`. Run that command exactly as given: it is the one stack command
  you run. Never start, stop, restart or rebuild the stack any other way — no \`tim docker up\`, \`dev\` or \`down\`, no
  \`run-stack.sh\` or \`stop-stack.sh\`, no \`docker compose\` against it.
${OTHER_COMPOSE_GUARD}`

const SECTION_5_STACK_LINE = `A section 5 check that needs the workspace stack up runs against the
stack the run already holds, as THE WORKSPACE STACK below says.`

const CODEX_SECTION_5_STACK_LINE = `A section 5 check that needs the workspace stack up runs against
the stack as it is: it is already up, leased to this run as \`${RUN_HOLDER}\`. Never acquire or release that lease, and
never start, stop or rebuild the stack. Skip a check that launches a browser, or one that cannot reach the stack: the
gate's E2E phase proves it, after review. Its absence is not a finding.`

const DENIED_PROGRAMS = [
  'bash',
  'sh',
  'zsh',
  'nohup',
  'eval',
  'exec',
  'node',
  'python',
  'python3',
  'perl',
  'ruby',
  'osascript',
  'deno',
  'bun',
  'bunx',
  'tsx',
  'ts-node',
  'php',
  'curl',
  'wget',
  'chmod',
  'env',
  '/usr/bin/env'
]
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/

const firstWordOf = (command) => command.trim().replace(/^`+/, '').trim().split(/\s+/)[0] ?? ''

const FIT_ON_STACK_PORT = /\brun test:fit(?!:)/

const isDeniedCommand = (command) => {
  const firstWord = firstWordOf(command)
  return ENV_ASSIGNMENT.test(firstWord) || DENIED_PROGRAMS.includes(firstWord) || FIT_ON_STACK_PORT.test(command)
}

const DENIED_FORMS_LINE = `- DENIED, so never run them and never write them into a plan: ${DENIED_PROGRAMS.map((program) => `\`${program}\``).join(', ')}
  as a command, and any \`VAR=value\` prefix on one. That covers \`bash <script>\`, \`bash -n\`, \`sh <script>\`, bare \`node\` and
  \`node -e\`, and \`curl\` or \`wget\` against the stack. Wrap a script in an npm script. NEVER run \`sonar\` (not
  allowlisted; it is a milestone gate the human runs).`

const PLAN_CHECK_FORMS = `CHECK COMMANDS. Every check in sections 5 and 6 must be a command the workspace lets an agent run. A check
in a denied form cannot run, so the ladder stops the increment red with nothing broken. A check takes one of these forms:
  - the repo's own npm script: \`npm --prefix ${TILDE}/<repoPath> run <script>\` or \`npm --prefix ${TILDE}/<repoPath> test -- <file>\`;
  - \`mvn -f ${TILDE}/<repoPath>/pom.xml <goal>\`;
  - a \`tim\` command;
  - a k6 run through the repo's own npm script, which reads its endpoints itself;
  - \`git -C\`, \`jq\`, \`grep\`, \`ls\` or \`find\` over files.
The workspace stack is up for every check, and its frontends hold their own ports (3000 for animals, 3003 for plants
and so on), so a check that starts a frontend on its default port cannot run. A FIT check therefore runs the script
gates.json names for that repo's \`fit\` rung, which serves on a port clear of the stack, with the spec file after it:
\`npm --prefix ${TILDE}/<repoPath> run test:fit:ci -- <spec file>\`. Never \`test:fit\`. Write no worker count into
a plan: whoever runs the check adds this machine's \`--workers\` from GUARD RAILS.
A check never takes a form GUARD RAILS lists as DENIED: no \`curl\` or \`wget\`, no \`env\` or \`VAR=value\` prefix, no
\`bash <script>\`, \`bash -n\` or \`sh <script>\`, no bare \`node\` or \`node -e\`, no python.
Where a check must read a live endpoint on the stack, name the npm script or test that already makes that read. Where
none does, add a small test or npm script that makes it to the plan's own work (section 2 or 3, in that service's repo
or the performance-tests repo) and name that as the check. To prove a script runs, run the npm script that calls it.
To vary a script's behaviour, use an npm script or a flag the script takes, never a variable prefix.`

const workerCountLines = Object.entries(MACHINE_WORKERS).map(
  ([rung, count]) => `    ${rung.replace(/\/(\w+)$/, ' $1')}: \`--workers=${count}\``
)

const TEST_WORKERS_LINE =
  workerCountLines.length === 0
    ? ''
    : `- THIS MACHINE'S TEST WORKERS. Every FIT or E2E command you run yourself, outside \`tim build gate\` (a probe, a
  plan check, a reviewer's or fixer's check, a single spec), ends with this machine's worker count, after the spec
  files, so it drives the machine no harder than the gate does. The scripts' own default can start a browser per core
  and push this machine into swap. Per repo and rung:
${workerCountLines.join('\n')}
  So: \`npm --prefix ${TILDE}/repos/<repo> run test:fit:ci -- <spec file> --workers=<n>\` for FIT, and
  \`npm --prefix ${TILDE}/repos/trade-imports-ins-tests run test:docker-compose -- <spec file> --workers=<n>\` for E2E. A repo not listed keeps its
  script's own count. Run one FIT or E2E command at a time: never two repos' suites at once.
`

const baseGuardrails = (stackGuard) => `
GUARD RAILS (mandatory, every step):
${RUN_WITH_BASH}
${TEST_WORKERS_LINE}
- NEVER use the Grep or Glob TOOLS — they are not allowlisted and will prompt the user. Use Bash \`grep -rn\` / \`find\` / \`ls\` / \`jq\`.
- Bash hygiene: ONE command per Bash call. No \`&&\`, no \`;\`, no \`|\`, no \`cd\`, no trailing \`echo $?\`. Use \`git -C\`, \`npm --prefix\`, \`mvn -f\`. Output redirection (\`> file 2>&1\`) IS allowed.
- In Bash ALWAYS use tilde paths \`${TILDE}/...\` — a literal /Users/... path in Bash is DENIED.
- For the Read/Write/Edit TOOLS use absolute paths \`${ABS}/...\`.
${DENIED_FORMS_LINE}
- Tests go TO A FILE under \`${WORKAREA_TILDE}/logs/\` and you read that file ONCE. Never grep streaming output, never re-run a suite to see it again.
- For Playwright failures read \`test-results/*/error-context.md\`, do not grep the tail of the run.
- Rollback is ALWAYS \`git stash push -u\` — NEVER \`reset --hard\` or \`clean -fd\`.
- NEVER sleep-poll. Foreground \`sleep\` is denied. Wait on CI by BLOCKING on \`gh pr checks --watch\` or
  \`gh run watch --exit-status\`, with the Bash tool's \`timeout\` parameter set to 600000 (its ceiling).
  A watch that hits that timeout has NOT gone green — treat it as unresolved, never as a pass.
- NEVER background a command: no trailing \`&\`, no run_in_background. Every command is a foreground call that
  returns by itself — a backgrounded one is one whose result you never read.
${stackGuard}
${IS_BRANCH ? BRANCH_PUSH_GUARD : FULL_PUSH_GUARD}
- Headless: never ask a question. Decide, record the decision, keep going.
`

const BASE_GUARDRAILS = baseGuardrails(STACK_GUARD)

const guardrails = () => `${BASE_GUARDRAILS}${workspaceRepoRule()}`

const leaseGuardrails = (verb) => `${baseGuardrails(leaseStackGuard(verb))}${workspaceRepoRule()}`

const HEAD_BRANCH_CHECK = `\`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\``

const BRANCH_PUSH_RULE = `HOW TO PUSH — the exact form, every time, no variations:
\`git -C ${TILDE}/<repoPath> push origin refs/heads/${BASE_BRANCH}:refs/heads/${BASE_BRANCH}\`
Never \`--force\`. Never a bare \`git push\`. Never \`push origin ${BASE_BRANCH}\` — that leaves git to work out the
destination from the branch's upstream, and the fully qualified \`refs/heads/X:refs/heads/X\` can only ever update X.
A push rejected as non-fast-forward means somebody else pushed to \`${BASE_BRANCH}\`: stop and report it, never force.

BEFORE ANY COMMIT OR PUSH, prove you are on the branch you think you are:
${HEAD_BRANCH_CHECK}
If that prints anything other than \`${BASE_BRANCH}\` — ${PROTECTED_BRANCHES.map((name) => `\`${name}\``).join(' or ')} above all — STOP and report ok:false.
Do not commit "just this once" and sort the branch out afterwards.`

const PUSH_RULE = IS_BRANCH ? BRANCH_PUSH_RULE : `HOW TO PUSH — the exact form, every time, no variations:
\`git -C ${TILDE}/<repoPath> push -u origin refs/heads/<branch>:refs/heads/<branch>\`
Never \`--force\`. Never a bare \`git push\`. Never \`push origin <branch>\` — that leaves git to work out the
destination, and in a repo configured \`push.default=tracking\` (the animals tests and backend repos are) it resolves to the
branch's upstream, which is how a commit once landed on \`${BASE_BRANCH}\` with no PR behind it. The fully
qualified \`refs/heads/X:refs/heads/X\` can only ever update branch X.

BEFORE ANY COMMIT OR PUSH, prove you are on the branch you think you are:
${HEAD_BRANCH_CHECK}
If that prints anything other than the work branch — \`${BASE_BRANCH}\` above all — STOP and report ok:false.
Do not commit "just this once" and sort the branch out afterwards.`

const testsImageFirstRule = (id, branch) => {
  if (!TESTS_KEY) return ''
  const ghRepo = REPOS[TESTS_KEY].github
  return `
TESTS REPO FIRST. Every other repo's pull request runs its E2E with the tests image tagged for \`${branch}\` when one
is published, and with \`trade-imports-ins-tests:latest\` when not ("Tests image: latest (no branch tag)" in its log),
which runs the wrong specs. The tests repo publishes that image from its own pull request, in its
\`${TESTS_IMAGE_WORKFLOW}\` run. So whenever you push ${TESTS_KEY} and any other repo:
a. Push ${TESTS_KEY} before every other repo, whatever order a list gives. The publish runs only for an open pull
   request on \`${branch}\`, so where your task registers ${TESTS_KEY}'s pull request, do that before step b too.
b. Its pushed commit: \`git -C ${TILDE}/${TESTS_REPO_PATH} rev-parse HEAD\`.
c. \`gh run list --repo ${ghRepo} --workflow ${TESTS_IMAGE_WORKFLOW} --commit <sha> --json databaseId,status,conclusion --limit 5\`
   An empty list means GitHub has not started it yet: run the same list again, at most 5 times in all.
d. BLOCK on that run, with the Bash tool's \`timeout\` set to 600000, at most ${CI_WATCH_WINDOWS} times:
   \`gh run watch <run-id> --repo ${ghRepo} --exit-status > ${WORKAREA_TILDE}/logs/${id}-tests-image.log 2>&1\`
e. Only then push the other repos. A publish that failed, never started or never finished does not stop you: push the
   others and name it in your summary. The tests pull request's own checks show it, and the CI stage deals with it.
None of this applies when you push ${TESTS_KEY} alone, or do not push it.`
}

const preserveWork = (id, branch, reason, evidence) =>
  `Attempt at increment ${id} failed: ${reason}. PRESERVE THE WORK so it survives this machine.
${guardrails()}
${REPO_RULE}
${PUSH_RULE}
EVIDENCE: ${evidence}
TASK — the work goes onto its own branch, not into a stash. A stash ref does not travel; a pushed branch does.
1. ${changedReposRule(id, 'preserve', branch)} A repo whose \`dirty\` is true and whose \`onBranch\` is false is a stop:
   report ok:false naming it, and change nothing in it.
2. For EACH repo with changes, stage what the increment produced — but NOTHING under logs/, no coverage output, no
   test-results/, no Playwright artefacts.
3. Commit it on \`${branch}\`, marked as failing: subject \`wip(${SCOPE}): <increment title> — ${reason}\`,
   body naming exactly what went red, and the usual trailer.
4. \`git -C ${TILDE}/<repoPath> push -u origin refs/heads/${branch}:refs/heads/${branch}\` — never \`--force\`.
   That is what lets another engineer fetch the attempt and see what was tried.
5. Do NOT open a pull request. This work does not pass its ladder and must not look reviewable.
6. Confirm each tree is clean: \`git -C ${TILDE}/<repoPath> status --short\`.
${specPreserveStep(id, branch)}
7. Record it: \`${setRow(id, "--note 'ATTEMPT FAILED: <what went red>; branch <branch>; wip <sha>'")}\`.
   Write the text inside those single quotes, and write any ' in it as \`'\\''\` — backticks and $ are then safe.
   Do NOT record a commit — the increment is not built, and a recorded commit would make the next attempt skip
   the build.
The next attempt branches from here and builds on top; the squash merge collapses the wip commit.
NEVER \`reset --hard\`, NEVER \`clean -fd\`.
Report the branch name and the wip SHA.
Return the structured output only.`

const preserveWorkOnBranch = (id, branch, reason, evidence) =>
  `Attempt at increment ${id} failed: ${reason}. PRESERVE THE WORK WITHOUT COMMITTING ANY OF IT.
${guardrails()}
${REPO_RULE}
EVIDENCE: ${evidence}
\`${branch}\` is a shared branch with open pull requests. NOTHING from a failed attempt may be committed or pushed to
it. Your own task below is the one place you ARE told to abort a merge, and to move \`${branch}\` back with
\`reset --soft\`.
TASK:
0. COMMITS A STAGE MADE. No stage commits: only landing does, and it pushes at once. So a configured repo on \`${branch}\`
   whose \`git -C ${TILDE}/<repoPath> rev-list --count origin/${branch}..HEAD\` prints more than 0 holds this attempt's
   work in local commits (overview and review inc-107 left one, and the next run's baseline went red on it). Check
   EVERY configured repo — ${REPO_KEYS.filter((key) => key !== WORKSPACE_KEY).map((key) => `\`${repoTilde(key)}\``).join(', ')} — even one whose status is clean. For each with a count above 0:
   \`git -C ${TILDE}/<repoPath> log --oneline origin/${branch}..HEAD > ${WORKAREA_TILDE}/logs/${id}-preserve-<repoKey>.commits.txt\`
   \`git -C ${TILDE}/<repoPath> format-patch --stdout --binary origin/${branch}..HEAD > ${WORKAREA_TILDE}/logs/${id}-preserve-<repoKey>.commits.patch\`
   then \`git -C ${TILDE}/<repoPath> reset --soft origin/${branch}\`, which leaves those commits' changes staged for the steps
   below to save and stash. Name the commits' SHAs in your note. Never \`reset --hard\`, and never push.
1. ${changedReposRule(id, 'preserve', branch)} Also act on every repo whose \`merging\` is true, even where \`dirty\` is false.
   A repo whose \`dirty\` or \`merging\` is true and whose \`onBranch\` is false is a stop: report ok:false naming it, and
   change nothing in it.
2. For EACH such repo, save the attempt under ${WORKAREA_TILDE}/logs/, one Bash call each, output redirected:
   \`git -C ${TILDE}/<repoPath> diff --staged --binary > ${WORKAREA_TILDE}/logs/${id}-preserve-<repoKey>.staged.patch\`
   \`git -C ${TILDE}/<repoPath> diff --binary > ${WORKAREA_TILDE}/logs/${id}-preserve-<repoKey>.unstaged.patch\`
   \`git -C ${TILDE}/<repoPath> diff --name-only --diff-filter=U > ${WORKAREA_TILDE}/logs/${id}-preserve-<repoKey>.unresolved.txt\`
   \`git -C ${TILDE}/<repoPath> status --short > ${WORKAREA_TILDE}/logs/${id}-preserve-<repoKey>.status.txt\`
3. MID-MERGE repos only: note the ref being merged (\`git -C ${TILDE}/<repoPath> rev-parse MERGE_HEAD\`), then
   \`git -C ${TILDE}/<repoPath> merge --abort\`. Never \`git commit\`, never \`merge --continue\`: a commit now would
   put a half-resolved merge on \`${branch}\`.
4. If a repo is still not clean (\`git -C ${TILDE}/<repoPath> status --short\` prints anything — work outside a merge,
   or untracked files a merge left behind), \`git -C ${TILDE}/<repoPath> stash push -u -m "failed-${id}"\` and note the
   stash ref. Never \`reset --hard\`, never \`clean -fd\`.
5. Confirm each tree is clean and no merge is in progress: \`git -C ${TILDE}/<repoPath> status --short\` prints nothing and
   \`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet MERGE_HEAD\` prints nothing.
5a. ${SPEC_RULE} If it has changes, stash them:
   \`git -C ${TILDE} stash push -u -m "failed-${id}" -- openspec/\`, then confirm
   \`git -C ${TILDE} status --short -- openspec/\` is empty. Name the stash ref in the note below.
6. Record it: \`${setRow(id, "--note 'ATTEMPT FAILED: <what went red>; merge of <ref> aborted in <repo>; local commits <SHAs or none> moved back from <repo>; patches and unresolved paths at <the logs files>; stash <ref or none>'")}\`.
   Write the text inside those single quotes, and write any ' in it as \`'\\''\` — backticks and $ are then safe.
   Do NOT record a commit — the increment is not built.
Do NOT commit, do NOT push, do NOT open or edit a pull request.
Report the patch files, the stash refs and which merges you aborted.
Return the structured output only.`

const preserveAttempt = async ({ id, ticket, workBranch, phaseName, reason, evidence, outcome, detail }) => {
  log(`${id}: ${outcome.toUpperCase()} — preserving the attempt. ${detail}`)
  const kept = await agent(
    (IS_BRANCH ? preserveWorkOnBranch : preserveWork)(id, workBranch, reason, evidence),
    light({ label: `${id} preserve`, phase: phaseName, schema: incrementSchema })
  )
  return {
    id,
    ticket: ticket?.key,
    branch: workBranch,
    outcome,
    detail,
    preserved: kept?.summary
  }
}

const guardedRepoKeys = (branchedRepos) =>
  branchedRepos
    ? REPO_KEYS.filter((key) => branchedRepos.includes(key) || key !== WORKSPACE_KEY)
    : REPO_KEYS

const outsideRepoRule = (branchedRepos) => {
  const outsideRepos = REPO_KEYS.filter((key) => key !== WORKSPACE_KEY && !branchedRepos.includes(key))
  if (outsideRepos.length === 0) return ''
  return `
- The repos outside the increment: ${outsideRepos.join(', ')}. One of them is a repo to check only when its \`dirty\` is
  true. A clean repo outside the increment is fine on ANY branch. Do not check its branch, and leave it out of your
  summary and your ok decision.`
}

const reposToCheckRule = (branchedRepos) =>
  branchedRepos
    ? `WORK OUT THE REPOS TO CHECK from that file, before you look at any branch:
- The increment's repos: ${branchedRepos.join(', ')}. Every one is a repo to check.${outsideRepoRule(branchedRepos)}
THEN check the branch of each repo to check, and of no other repo.`
    : `CHECK every configured repo in that file.`

const BRANCH_GUARD_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    repoState: { type: 'string', description: 'The repo-state file from your last tim run, word for word' }
  },
  additionalProperties: false
}

const branchGuardPrompt = (id, stageName, branch, branchedRepos) => {
  const command = repoStateCommand(guardedRepoKeys(branchedRepos), { branch, logFile: repoStateLog(id, `branch-guard-${stageName}`) })
  return `You are the BRANCH GUARD for increment ${id}, run after the ${stageName} stage. Every repo this increment works
in must be on \`${branch}\`. A stage that switched a repo to another branch, or cut a new one, leaves the work where
the land stage refuses it. You check, move a repo back where that is safe, and change nothing else.
${guardrails()}
FIRST, read every repo's state from tim:
\`${command}\`
Read that file once. ${REPO_STATE_FIELDS}
${reposToCheckRule(branchedRepos)}
For EACH repo to check:
1. \`onBranch\` is true → that repo is fine; go to the next.
2. \`onBranch\` is false → compare its \`head\` with its \`branchHead\`.
   - The same SHA → \`git -C <path> checkout ${branch}\`. The staged and unstaged work travels with it, because the two
     branches point at the same commit. Say in your summary which repo you moved and from which branch. Leave that
     other branch where it is: do not delete it.
   - A different SHA, \`branchHead\` null, or a checkout that refuses → STOP: report ok:false naming the repo, its
     \`branch\` and both SHAs, and change nothing in it.
Never create a branch, and never commit, stash, reset or clean. You only ever move a repo back onto \`${branch}\`.${
    IS_BRANCH
      ? `
A repo whose \`merging\` is true is in that state by design: a later stage commits the merge. Never \`merge --abort\`,
\`merge --continue\` or check out in it. If \`onBranch\` is true it is fine; if not, STOP and report ok:false naming it.`
      : ''
  }
If you moved any repo, run the same tim command again and read the file again.
Report ok:true only when every repo you checked has \`onBranch\` true in the last file you read, and put that file's
contents, word for word, in \`repoState\`.
Return the structured output only.`
}

const repoStatesIn = (text) => {
  const line = lastJsonLine(text)
  try {
    const repos = line ? JSON.parse(line)?.result?.repos : null
    return Array.isArray(repos) ? repos : null
  } catch {
    return null
  }
}

const strayRepos = (states, branchedRepos) =>
  states.filter(
    (state) => (branchedRepos === null || branchedRepos.includes(state.key) || state.dirty === true) && state.onBranch !== true
  )

const describeStray = (state) => `${state.key} is on ${state.branch ?? 'no branch'}`

const guardVerdict = (guard, branchedRepos) => {
  const states = repoStatesIn(guard?.repoState)
  if (!guard || states === null) return guard
  const stray = strayRepos(states, branchedRepos)
  if (stray.length === 0) return { ...guard, ok: true }
  return { ...guard, ok: false, summary: `${stray.map(describeStray).join('; ')}, by tim workspace repo-state. ${guard.summary}` }
}

const branchGuard = async (id, stageName, phaseName, branch, branchedRepos) =>
  guardVerdict(
    await agent(
      branchGuardPrompt(id, stageName, branch, branchedRepos),
      light({ label: `${id} branch-guard:${stageName}`, phase: phaseName, schema: BRANCH_GUARD_SCHEMA })
    ),
    branchedRepos
  )

const incrementSchema = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' }
  },
  additionalProperties: false
}

const STACK_HELD_PROPERTY = {
  type: 'object',
  required: ['holder', 'detail'],
  properties: {
    holder: {
      type: ['string', 'null'],
      description: 'Who holds the workspace stack, copied from tim. null when tim said nobody leases it'
    },
    detail: { type: 'string', description: "tim's refusal, word for word" }
  },
  additionalProperties: false,
  description: 'ONLY when tim showed the workspace stack in somebody else\'s hands, not this run\'s. Leave it out otherwise'
}

const STACK_DOWN_PROPERTY = {
  type: 'object',
  required: ['detail'],
  properties: {
    detail: { type: 'string', description: 'What could not reach the stack, and what tim said' }
  },
  additionalProperties: false,
  description: "ONLY when the lease is still this run's but tim's result.up is false: the stack went down under the run. Leave it out otherwise"
}

const withStackHeld = (schema) => ({
  ...schema,
  properties: { ...schema.properties, stackHeld: STACK_HELD_PROPERTY, stackDown: STACK_DOWN_PROPERTY }
})

const LEASE_OWNER_SCHEMA = {
  type: 'object',
  required: ['ok', 'holder', 'summary'],
  properties: {
    ok: { type: 'boolean', description: "tim's `ok`" },
    holder: { type: ['string', 'null'], description: "result.lease.holder, copied; null when result.lease is null" },
    summary: { type: 'string' }
  }
}

const readLeaseOwner = (id, stage) =>
  agent(
    `Report who holds the workspace stack's lease. Run exactly one command and read it:
\`tim docker lease status --workspace ${TILDE} --json\`
Return ok as tim's \`ok\`, holder as \`result.lease.holder\` (null when \`result.lease\` is null), and a one-line summary.
${RUN_WITH_BASH}
Do not do anything else. One Bash call, no Grep/Glob tools, tilde paths only.`,
    light({ label: `${id} ${stage} lease check`, phase: 'Baseline', schema: LEASE_OWNER_SCHEMA })
  )

const checkStackHeld = async (id, stage, result) => {
  if (!result?.stackHeld) return { result, leaseGone: false }
  const owner = await readLeaseOwner(id, stage)
  if (owner?.ok && owner.holder === RUN_HOLDER) {
    log(`${id}: the ${stage} stage reported the stack held (${result.stackHeld.detail}), but the lease is still this run's — ignoring that report`)
    return { result: { ...result, stackHeld: undefined }, leaseGone: false }
  }
  return { result, leaseGone: owner?.ok === true && owner.holder === null }
}

const whyRetakeRunLease = (stage, { result, leaseGone }) => {
  if (result?.stackDown) return `the workspace stack went down under the run at ${stage} — ${result.stackDown.detail}`
  if (leaseGone) return `the run's lease on the workspace stack was gone at ${stage}, and nobody else holds it — ${result.stackHeld.detail}`
  return null
}

const recoverRunStack = async (id, stage, runStage) => {
  const first = await checkStackHeld(id, stage, await runStage())
  const why = whyRetakeRunLease(stage, first)
  if (!why) return first.result
  log(`${id}: ${why}. Taking the lease again and running ${stage} once more`)
  const retaken = await acquireRunLease()
  if (!retaken?.acquired) {
    const refusal = (retaken?.summary ?? 'the lease agent died').replace(/\.$/, '')
    log(`${id}: could not take the lease again — ${refusal}`)
    return first.result
  }
  return (await checkStackHeld(id, stage, await runStage())).result
}

const CI_FIX_COMMITS_PROPERTY = {
  type: 'array',
  description: 'Every commit you made and pushed, one entry each. Empty when you pushed none',
  items: {
    type: 'object',
    required: ['repo', 'sha'],
    properties: {
      repo: { type: 'string', description: 'The repo key' },
      sha: { type: 'string' }
    },
    additionalProperties: false
  }
}

const CI_FIX_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
    commits: CI_FIX_COMMITS_PROPERTY,
    newPrs: {
      type: 'array',
      description:
        'Every PR you opened in a repo that had none for this branch. Empty if you only pushed to branches that already had one.',
      items: {
        type: 'object',
        required: ['repo', 'url'],
        properties: {
          repo: { type: 'string' },
          url: { type: 'string' },
          number: { type: 'number' }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
}

const FUNCTIONAL_CATEGORIES = ['correctness', 'security', 'error-handling', 'coverage-gap']
const CODE_QUALITY_CATEGORIES = ['naming', 'comments', 'structure', 'duplication', 'logging', 'test-readability', 'history']
const DESIGN_CATEGORIES = ['design']
const FINDING_CATEGORIES = [...FUNCTIONAL_CATEGORIES, ...CODE_QUALITY_CATEGORIES, ...DESIGN_CATEGORIES]

const isCodeQuality = (finding) => CODE_QUALITY_CATEGORIES.includes(finding.category)
const isDesign = (finding) => DESIGN_CATEGORIES.includes(finding.category)
const kindOf = (finding) => {
  if (isCodeQuality(finding)) return 'code quality'
  if (isDesign(finding)) return 'design'
  return 'functional'
}
const quotedList = (words) => words.map((word) => `\`${word}\``).join(', ')

const CATEGORY_RULE = `CATEGORY. Give every finding exactly one \`category\`:
- functional: ${quotedList(FUNCTIONAL_CATEGORIES)}. Behaviour, a performance or scope defect and a broken contract
  between repos are \`correctness\`; how an error is handled is \`error-handling\`; a behaviour no test proves is
  \`coverage-gap\`.
- code quality: ${quotedList(CODE_QUALITY_CATEGORIES)}. Formatting, idiom, convention and the wrong layer are
  \`structure\`; a test title that claims more than its assertions prove is \`test-readability\`; an id, ticket key or
  before-and-after narration in code is \`history\`.
- design: ${quotedList(DESIGN_CATEGORIES)}. Copy, layout or a component where the design source (the prototype, a design
  release, the acceptanceCriteria) is disagreed with by a guide such as the GDS style guide, sets two different things
  for one element, or does not show the case the code had to handle. Read the design source first: the row's
  \`sources\` name it, and the workarea's \`sources.json\` gives its location and commit. In \`why\`, quote the design
  source at file:line (a permalink at that commit for a public repo), the code at file:line, and the guide's rule with
  a link when a guide disagrees. In \`fix\`, write the question for the designer with the options it leaves. Code that
  differs from its design source is \`correctness\`, not \`design\`.
`

const CODE_REVIEW_LENS = `- NAMING, predict then compare: for each function, method, parameter, variable and test the change adds or alters, read its
  name, predict the value it returns and what it changes, then read its body. A value its value word does not cover (a
  name that can return a code) or a change it hides is a \`naming\` finding. Nothing (null or undefined) and an expected
  error such as not found are not mismatches, and a suffix that names them or a fallback (…OrNull, …OrNotFound) is
  itself a \`naming\` finding. A name that predicts the value and the change is not a finding, even when another name
  would read better.
- OPERABILITY: a branch that changes an outcome (a refusal, a redirect, a retry, a fallback, a state switch) with no
  log, or with a log support cannot search by: no ids, no cause, only an error's message. "Support cannot tell
  <what> during an incident" is a full failure scenario for a \`logging\` finding.
- DUPLICATION: a second copy of a rule or of test set-up, and a second mechanism beside one the repo already has.
  Name both places.
- TEST TRUTH: a test whose title claims more than its assertions check, and a test that cannot fail because it still
  passes with the production line it covers removed. Strengthen the assertion or delete the test.
`

const CHANGE_MAKES_FALSE_RULE = `WHAT THE CHANGE MAKES FALSE is in scope. A comment, doc comment or recipe line anywhere in a changed file that the
change makes false is a \`comments\` finding, whether or not the diff touches its line. Its fix is to delete it.
`

const OUTSIDE_THE_DIFF = `a rule the change alters that a doc, recipe, JSDoc or test name OUTSIDE the diff still states the old way. Grep the
changed repos for the behaviour's own words, not only its identifiers. Each one is in scope: report it at its file:line,
and its fix is to update it or delete it`

const REPO_DOCS_STEP = `THE REPO'S DOCS AND RECIPES. Run \`tim backlog standards --files <repoKey>:<path> --workspace ${TILDE} --json\` once,
with --files repeated for every changed file, and read in full every repoDocs file it lists:
the repo's architecture docs and its add-a-* recipes.
`

const findingsSchemaOf = (categories) => ({
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'category', 'what', 'why', 'fix'],
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
          category: { type: 'string', enum: categories },
          what: { type: 'string', description: 'The defect, one sentence' },
          why: { type: 'string', description: 'Concrete failure scenario or rule broken' },
          fix: { type: 'string', description: 'The specific change to make' }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
})

const FINDINGS_SCHEMA = findingsSchemaOf(FINDING_CATEGORIES)
const CODE_QUALITY_FINDINGS_SCHEMA = findingsSchemaOf(CODE_QUALITY_CATEGORIES)

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      description: 'One entry per finding you were given, same numbering. Omit none.',
      items: {
        type: 'object',
        required: ['n', 'real', 'reasoning'],
        properties: {
          n: { type: 'number', description: 'The finding number exactly as numbered in the list you were given' },
          real: { type: 'boolean' },
          reasoning: { type: 'string', description: 'Evidence for or against, citing file:line' },
          quote: {
            type: 'string',
            description:
              'A refuted code-quality finding only: the code, quoted with its file:line, that shows the finding is factually wrong'
          }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
}

const VERIFY_BY_KIND = `Each finding names its category and its kind, and the kind sets your default.
FUNCTIONAL (${quotedList(FUNCTIONAL_CATEGORIES)}): your job is to REFUTE it. Default to refuted unless the evidence is
clear — a wrong functional finding that survives costs more than a real one that is missed, because it drives a
pointless edit to working code. real:false if it is wrong, already handled elsewhere, out of the increment's scope, or
a matter of taste dressed as a defect. Check it against the conventions the repo actually follows: find a comparable
file and compare, because "unconventional" is only a finding if the convention really exists here.
CODE QUALITY (${quotedList(CODE_QUALITY_CATEGORIES)}): default to real. real:false ONLY when the code shows the finding
is factually wrong: the copies differ, the name does predict what the code returns and what it changes, the comment is
accurate and describes only the lines below it, the branch does log once with the ids support searches by. Put that
code in \`quote\`, with its file:line. A refutation with no quote leaves the finding standing. "Taste", "pre-existing",
"out of the increment's scope", "a comparable file does it", "feature folders are independent" and the like are never
grounds to refute one. A tool call that failed is not evidence: when you could not read the code, the finding is real.
A house-rule breach is never taste and never out of scope, whatever its kind.
DESIGN (${quotedList(DESIGN_CATEGORIES)}): read the design source the finding cites, and the row's \`sources\` and the
workarea's \`sources.json\` when it cites none. The finding is real when the source does set what it says and a guide
rule does disagree, when the source sets two different things for one element, or when the source does not show the
case the code handles. Quote the source at file:line in \`reasoning\`. A source you did not read, or a finding that did
not read it, is never grounds to refute: read it. A real finding that lacks its evidence (the source and code at
file:line, the guide rule, the question and its options) is real: add the missing evidence in \`reasoning\`.`

const describeFindingKind = (finding) => `[${finding.category ?? 'no category'}, ${kindOf(finding)}]`

const UNQUOTED_REFUTATION = 'REFUTED WITH NO CODE QUOTED, so this code-quality finding stands'

const checkedFinding = (finding, verdict) => {
  if (!verdict) return { ...finding, verdict: 'NO VERDICT RETURNED — unrefuted, treat with caution' }
  if (verdict.real) return { ...finding, verdict: verdict.reasoning }
  if (isCodeQuality(finding) && !verdict.quote?.trim()) {
    return { ...finding, verdict: `${UNQUOTED_REFUTATION}: ${verdict.reasoning}` }
  }
  return { ...finding, refutedBecause: verdict.reasoning, refutingQuote: verdict.quote }
}

const refutedRecordOf = (id, { file, line, category, severity, what, refutedBecause, refutingQuote }) => ({
  id,
  file,
  ...(line === undefined ? {} : { line }),
  category: category ?? null,
  severity,
  what,
  reason: refutedBecause,
  ...(refutingQuote ? { quote: refutingQuote } : {})
})

const describeRefuted = (record) =>
  `${record.file}${record.line ? `:${record.line}` : ''} [${record.category ?? 'no category'}] ${record.what} — refuted: ${record.reason}`

const themeRefutedCheck = (id, theme, refuted, where = 'across its rows') => ({
  id,
  check: `Theme ${theme} is built. Review dropped ${refuted.length} finding(s) as refuted ${where}: read each one and confirm none was real.`,
  refuted
})

const TWIN_RULE_INTRO = `TWINS. A code-quality fix reaches every twin of the file, not only the repo the finding names. The
frontends trade-imports-animals-frontend, trade-imports-plants-frontend and trade-imports-ins-frontend each keep their own
copy of the server set-up, clients and feature folders, and the animals and plants frontends also share the journey
folders (model, bridge, engine, flow, sets). trade-imports-animals-backend and trade-imports-plants-backend are built on
one pattern. For each code-quality finding, Read the same path, or the file doing the same job, in each twin under
${TILDE}/repos/. Where the twin holds the same defect:`

const twinRule = (id, repoKeys) => `${TWIN_RULE_INTRO}
- in a repo this increment builds in (${repoKeys.length > 0 ? repoKeys.map((key) => `${key} = ${REPO_PATH[key]}`).join(', ') : 'none'}), the
  fixNow instruction names the same change in the twin too;
- in any other repo, record it so it is not lost, quoted as for a deferral: \`${setRow(id, "--open-question 'Twin fix: <twin repo and path> needs <the change>, as <the finding>'")}\`.`

const FIX_SCHEMA = {
  ...incrementSchema,
  properties: {
    ...incrementSchema.properties,
    treesBeforeFix: {
      type: 'array',
      description: 'One entry per repo you edited: the hash `git write-tree` printed before your first edit there',
      items: {
        type: 'object',
        required: ['repo', 'tree'],
        properties: {
          repo: { type: 'string', description: 'The repo key' },
          tree: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  }
}

const TREES_BEFORE_FIX_DUTY = `BEFORE YOUR FIRST EDIT in each repo, run \`git -C <repoPath> write-tree\` there once, and report what it
printed in treesBeforeFix as { repo: <repoKey>, tree: <the hash> }. It records what was staged before you, so a
reviewer can read your own hunks apart from the implementor's.
`

const repoTildeOfKey = (key) => {
  if (key === WORKSPACE_KEY) return TILDE
  return REPO_PATH[key] ? repoTilde(key) : null
}

const pathInRepoOf = (file) => file.replace(/^[a-z]+:/, '')

const stagedDiffCommand = (file) => {
  const repoPath = repoTildeOfKey(repoOfFile(file)) ?? `${TILDE}/<repoPath>`
  return `- \`git -C ${repoPath} diff --staged -- ${pathInRepoOf(file)}\``
}

const NO_FIXER_FILES =
  "- (the fixer reported no changed file: read `git -C <repoPath> diff --staged` for each file the ruled fixes name)"

const fixHunkCommands = (fix) => {
  const trees = (fix.treesBeforeFix ?? []).filter(({ repo }) => repoTildeOfKey(repo) !== null)
  if (trees.length > 0) {
    return trees.map(({ repo, tree }) => `- \`git -C ${repoTildeOfKey(repo)} diff-index --cached -p ${tree}\``).join('\n')
  }
  const fileCommands = (fix.changedFiles ?? []).map(stagedDiffCommand).join('\n')
  return `The fixer recorded no staged tree, so these diffs also hold the implementor's lines. Judge only the lines the
ruled fixes describe:
${fileCommands || NO_FIXER_FILES}`
}

const fixesForReviewFindings = (findings, proof = "Prove it with the gate's unit phase.") =>
  findings
    .map(
      (finding, index) =>
        `${index + 1}. ${finding.file}${finding.line ? `:${finding.line}` : ''} [${finding.category}] ${finding.what} Fix: ${finding.fix} Delete, rename or extract; never reword. ${proof}`
    )
    .join('\n')

const withSecondFix = (first, second) => ({
  ...first,
  summary: `${first.summary} Then, after the style re-review of its hunks: ${second?.summary ?? 'the second fix returned no result'}`,
  notes: [first.notes, second?.notes].filter(Boolean).join('\n'),
  changedFiles: [...new Set([...(first.changedFiles ?? []), ...(second?.changedFiles ?? [])])]
})

const findingToVerify = (finding) =>
  `${finding.n}. [${finding.severity}] ${describeFindingKind(finding)} ${finding.file}${finding.line ? ' line ' + finding.line : ''}\n   WHAT: ${finding.what}\n   WHY: ${finding.why}\n   PROPOSED FIX: ${finding.fix}`

const verifierPrompt = ({ subject, group, diffCommand, criteria, mergeNote = '' }) => `You are the VERIFIER of review findings for ${subject}. You are given ${group.items.length} finding(s) against
${group.files.length} file(s) in the ${group.repo} repo (${groupRepoPath(group)}), language ${group.language}:
${group.files.join(', ')}. Test each one against the code.
${VERIFY_BY_KIND}
${guardrails()}
${HOUSE_RULES_TO_JUDGE}
Judge each finding INDEPENDENTLY and on its own evidence. They do not stand or fall together, and the number of
them tells you nothing about whether any one is real.${mergeNote}

THE FINDINGS:
${group.items.map(findingToVerify).join('\n')}

CHECK THEM against the ACTUAL code (${diffCommand} for each file named,
where the \`<repoKey>:\` prefix is dropped to get <path>, and Read each file in full — the diff alone can mislead),
and against ${criteria}. Read those sources ONCE and reuse them across all
${group.items.length} findings.
For each, set real by the default its kind sets. Cite file:line in every reasoning.
Return one verdict per finding, using the SAME numbers as above. Return the structured output only.`

const VERIFIER_FAILED = 'VERIFIER FAILED — unrefuted, treat with caution'

const findingsCheckedBy = (items, verdict) => {
  if (!verdict) return items.map((finding) => ({ ...finding, verdict: VERIFIER_FAILED }))
  const byNumber = new Map((verdict.verdicts ?? []).map((entry) => [entry.n, entry]))
  return items.map((finding) => checkedFinding(finding, byNumber.get(finding.n)))
}

const verifyFindingGroups = async (id, groups, { phaseName, labelOf, promptOf }) => {
  const checkedGroups = await parallel(
    groups.map((group) => () =>
      agent(promptOf(group), code({ label: labelOf(group), phase: phaseName, schema: VERDICT_SCHEMA })).then((verdict) =>
        findingsCheckedBy(group.items, verdict)
      )
    )
  )
  const checked = checkedGroups.filter(Boolean).flat()
  return {
    confirmed: checked.filter((finding) => finding.refutedBecause === undefined),
    refuted: checked.filter((finding) => finding.refutedBecause !== undefined).map((finding) => refutedRecordOf(id, finding))
  }
}

const confirmedFindingLine = (finding, index) =>
  `${index + 1}. [${finding.severity}] ${describeFindingKind(finding)} ${finding.file}${finding.line ? ':' + finding.line : ''} — ${finding.what}\n   WHY: ${finding.why}\n   PROPOSED FIX: ${finding.fix}\n   SURVIVED VERIFICATION BECAUSE: ${finding.verdict}`

const judgePrompt = ({ id, subject, scope = 'increment', context, confirmed, repoKeys }) => `You are the JUDGE for ${subject}. You replace the interactive triage step a human would normally do —
read ${SKILLS}/review/references/WALKER.md to understand the triage this substitutes for, then make every call
YOURSELF. Do not defer to a human and do not ask anything.
${guardrails()}
${HOUSE_RULES_TO_JUDGE}
${context}
CONFIRMED FINDINGS (each survived verification by the default its kind sets: a functional finding was tried for
refutation, a code-quality finding stood unless code showed it factually wrong):
${confirmed.map(confirmedFindingLine).join('\n')}

FOR EACH finding decide exactly one of:
- **fix-now** — the fix is clear. Anything that breaks an acceptance criterion, a security or correctness defect, a
  test that does not pin what it claims, or a house-rule violation is fix-now regardless of severity label. Every
  code-quality finding is fix-now.
- **defer-to-open-question** — a functional finding that is real, but genuinely outside this ${scope}'s scope, or
  that needs a product/design decision code cannot settle. Never a code-quality finding. You MUST then record it, so
  it is never silently dropped:
  \`${setRow(id, "--open-question '<the question, and the finding that raised it>'")}\`.
  Write the text inside those single quotes, and write any ' in it as \`'\\''\` — backticks and $ are then safe.
  Every design finding is defer-to-open-question, never fix-now: the code keeps what the design source sets. Start
  its question with "For the designer:", ask it with the options it leaves, and carry the evidence into it: the design
  source and the code at file:line (permalinks where the verifier gave them) and the guide rule's link.
- **reject** — a functional finding you disagree with even after verification. Say why, with evidence. A
  code-quality finding is rejected only by quoting the code that shows it is factually wrong: "taste",
  "pre-existing", "out of scope", "a comparable file does it" and "feature folders are independent" never reject one.

CODE-QUALITY FIXES are delete, rename or extract, never reword. Delete a stale comment, or one that describes other
code. Where a comment explains a name, rename and delete the comment. Where code is copied, extract the shared part and
delete the copies. A rename covers the concept's whole vocabulary: keys, variables, copy keys and test titles.
${twinRule(id, repoKeys)}

BIAS, for functional findings only: prefer fix-now for anything cheap and clearly right. Prefer defer for anything
that would expand the ${scope}'s blast radius. Reject a functional finding that is taste rather than defect: this
loop values a small correct increment over a large polished one. Code-quality findings are never weighed this way,
and a house-rule breach is never taste.
For every fix-now item, write a COMPLETE instruction in fixNow[]: the file, exactly what to change, and how to
prove it (the test or assertion that should now pass). A fixer with no other context must be able to execute it.
Return the structured output only.`

const FIX_RULES = `RULES: apply each fix and prove it with the test or assertion the instruction names. Do NOT re-open anything the
judge rejected or deferred. Do NOT expand scope. If a fix turns out to be wrong or impossible, say so in your
summary rather than forcing it — a fix that requires weakening a test is not a fix. Leave everything STAGED, do
not commit.`

const fixHunksReviewPrompt = ({ subject, ruledFixes, fix, mergeNote = '' }) => `You are the STYLE RE-REVIEWER for ${subject}. The fixer has just staged the ruled fixes. You review ONLY the
lines it added or changed, for code quality, so that no fix lands a defect of its own.
${guardrails()}
${HOUSE_RULES_TO_JUDGE}
THE RULED FIXES it applied:
${ruledFixes}

THE FIXER'S HUNKS — read them with:
${fixHunkCommands(fix)}
Read a changed file in full where a hunk alone could mislead.${mergeNote}

Report a finding only on a line the fixer added or changed, and only in a code-quality category:
${quotedList(CODE_QUALITY_CATEGORIES)}. Correctness is not yours: the ladder runs next. A comment reworded where the
fix said to delete it, a name kept where it said to rename, and a copy left where it said to extract are findings.
Give each finding a concrete fix: delete, rename or extract. Write its \`file\` as \`<repoKey>:<repo-relative path>\`.
If the hunks are clean, return an empty findings array.
Return the structured output only.`

const BRANCH_CI_FIX_SCHEMA = {
  ...incrementSchema,
  properties: { ...incrementSchema.properties, commits: CI_FIX_COMMITS_PROPERTY }
}

const ciFixStandards = (plan) => `THE STANDARDS. Before you edit a file, run \`tim backlog standards --files <repoKey>:<path> --workspace ${TILDE} --json\`
for it and read in full every rules, bestPractice and repoDocs file it lists.${planStandardsLine(plan)}
A change that only silences a check is not a fix: no dead or empty catch, no spin-wait or sleep in a test, no rename
that only quiets a rule, no loosened assertion. Fix the code the check points at.
REPORT YOUR COMMITS: every commit you make and push goes in commits[] as { repo: <repoKey>, sha }. A style reviewer
reads each one before the watcher looks again.`

const ciFixCommitCommand = ({ repo, sha }) =>
  `- \`git -C ${repoTildeOfKey(repo) ?? `${TILDE}/<the path of repo ${repo}>`} show ${sha}\``

const ciFixReviewPrompt = (id, attempt, commits) => `You are the STYLE REVIEWER of the CI fixer's commits for increment ${id}, attempt ${attempt}. The CI fixer
works after every other reviewer, so nobody else reads its lines. You review ONLY the lines its commits added or
changed, for code quality.
${guardrails()}
${HOUSE_RULES_TO_JUDGE}
THE CI FIXER'S COMMITS — read each with:
${commits.map(ciFixCommitCommand).join('\n')}
Read a changed file in full where a hunk alone could mislead.

Report a finding only on a line those commits added or changed, and only in a code-quality category:
${quotedList(CODE_QUALITY_CATEGORIES)}. A change that only silences a check is a finding: a dead or empty catch, a
spin-wait or sleep in a test, a rename that only quiets a rule, a loosened assertion. Give each finding a concrete fix:
delete, rename or extract. Write its \`file\` as \`<repoKey>:<repo-relative path>\`.
If the lines are clean, return an empty findings array.
Return the structured output only.`

const ciStyleFixPrompt = ({ id, attempt, findings, branch, commitNames, workspaceRule }) => `You are the CI STYLE FIXER for increment ${id}, attempt ${attempt}. A style reviewer read the CI fixer's commits and
found the code-quality defects below. Fix exactly these, commit and push. You merge nothing, and you never create,
edit or close a pull request.
${guardrails()}${workspaceRule}
${HOUSE_RULES_TO_WRITE}
${PUSH_RULE}
THE FINDINGS TO FIX:
${fixesForReviewFindings(findings, 'Prove it with the narrowest suite that covers the file.')}

TASK:
1. In each repo you edit, ${HEAD_BRANCH_CHECK} must print \`${branch}\`. Anything else: report ok:false naming the repo,
   and change nothing in it.
2. Fix each finding. Never weaken, skip or delete a test, and never disable a check. A finding that is wrong, or that
   cannot be fixed without weakening a test, goes in your summary instead.
3. Prove it with the narrowest suite that covers the files, to a log under ${WORKAREA_TILDE}/logs/, read once.
4. Commit on \`${branch}\` with a conventional message naming ${commitNames}, then push it by HOW TO PUSH above.
5. Report every commit in commits[].
Return the structured output only.`

const reviewThenStyleFixCiCommits = async ({ id, attempt, fix, branch, commitNames, workspaceRule = '' }) => {
  const commits = (fix?.commits ?? []).filter((commit) => commit?.sha)
  if (commits.length === 0) return null
  const review = await agent(
    ciFixReviewPrompt(id, attempt, commits),
    code({ label: `${id} ci fix ${attempt} review`, phase: 'CI', schema: CODE_QUALITY_FINDINGS_SCHEMA })
  )
  if (!review) {
    log(`${id}: the style review of CI fix ${attempt} returned no result — the watcher looks again`)
    return null
  }
  const findings = (review.findings ?? []).filter(isCodeQuality)
  if (findings.length === 0) return null
  log(`${id}: the style review of CI fix ${attempt} found ${findings.length} code-quality finding(s) — sending them to a style fix once`)
  return agent(
    ciStyleFixPrompt({ id, attempt, findings, branch, commitNames, workspaceRule }),
    code({ label: `${id} ci fix ${attempt} style`, phase: 'CI', schema: CI_FIX_SCHEMA })
  )
}

const JUDGEMENT_SCHEMA = {
  type: 'object',
  required: ['decisions', 'fixNow', 'summary'],
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['what', 'call', 'reasoning'],
        properties: {
          what: { type: 'string' },
          call: { type: 'string', enum: ['fix-now', 'defer-to-open-question', 'reject'] },
          reasoning: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    fixNow: { type: 'array', items: { type: 'string' }, description: 'Full fix instructions for the fixer, one per item' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const LADDER_SCHEMA = {
  type: 'object',
  required: ['green', 'ran', 'summary'],
  properties: {
    green: { type: 'boolean' },
    ran: { type: 'array', items: { type: 'string' } },
    failures: { type: 'array', items: { type: 'string' } },
    repairsAttempted: { type: 'number' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const BASELINE_SCHEMA = {
  type: 'object',
  required: ['ok', 'green', 'rungs', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'Every repo is on the right branch with a clean tree' },
    green: { type: 'boolean', description: 'Every gate phase that had rungs came back green' },
    rungs: {
      type: 'array',
      items: GATE_RUNG_SCHEMA,
      description: 'Every rung from every gate phase, copied from the JSON tim printed'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary', 'repos', 'behaviourChanges', 'decisions', 'checks'],
  properties: {
    ok: { type: 'boolean', description: 'false only when the increment cannot be carried out as written' },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['section', 'command'],
        properties: {
          section: { type: 'integer', enum: [5, 6] },
          command: { type: 'string', description: 'The exact command, as the plan writes it' }
        },
        additionalProperties: false
      },
      description: 'Every check in sections 5 and 6, one entry per command. Empty when both sections say "None"'
    },
    summary: { type: 'string' },
    repos: {
      type: 'array',
      items: { type: 'string', enum: REPO_KEYS },
      description: 'The repos the plan changes, in merge order'
    },
    behaviourChanges: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every behaviour a user, operator or other system will see change, one line each. Empty when the change is pure structure'
    },
    decisions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every choice the increment left open, how you settled it, and the alternative you rejected'
    },
    risks: { type: 'array', items: { type: 'string' } },
    specPrefixes: {
      type: 'array',
      items: { type: 'string', enum: SPEC_PREFIXES },
      description: 'The Behaviour Spec prefixes section 8 writes under. Empty when it says none'
    },
    docsMadeUntrue: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Section 12, one entry per doc, recipe, JSDoc or test name the change makes untrue, each with what must change. One entry "None (grep: <command>)" when the grep found none'
    },
    departures: {
      type: 'array',
      items: { type: 'string' },
      description: 'Section 14, one entry per departure: the rule quoted, its path, and the reason. Empty when there is none'
    },
    standards: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Section 16: every rules, bestPractice and repoDocs path tim backlog standards listed for the files the plan changes, once each'
    },
    followUps: {
      type: 'array',
      items: { type: 'string' },
      description:
        "Section 7's follow-ups: each wider clean-up outside the row's footprint, one line a backlog row could be written from. Empty when there is none"
    }
  },
  additionalProperties: false
}

const PLAN_FINDING_KINDS = ['structural', 'detail']

const PLAN_REVIEW_SCHEMA = {
  type: 'object',
  required: ['approved', 'findings', 'summary'],
  properties: {
    approved: { type: 'boolean', description: 'true only when findings is empty' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['kind', 'section', 'what', 'rule', 'mustBecomeTrue'],
        properties: {
          kind: {
            type: 'string',
            enum: PLAN_FINDING_KINDS,
            description:
              'structural: a layer, owner, mechanism, unstated departure, scope or test strategy that is wrong. detail: a line-level gap the implementor can close without changing any decision, home or owner'
          },
          section: { type: 'string', description: 'The plan section the finding is in, by number and name' },
          what: { type: 'string', description: 'What the plan does wrong, against the code as it is' },
          rule: {
            type: 'string',
            description: 'The doc, rule or code it breaks: its path and line, and the words quoted'
          },
          mustBecomeTrue: { type: 'string', description: 'What must be true of the plan once it is fixed. Never the wording' }
        },
        additionalProperties: false
      }
    },
    followUps: {
      type: 'array',
      items: { type: 'string' },
      description:
        "Wider clean-up outside the row's footprint that section 7 does not list, one line a backlog row could be written from. Empty when there is none"
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const PLAN_REVIEW_RECORD_SCHEMA = {
  type: 'object',
  required: ['written', 'summary'],
  properties: {
    written: { type: 'boolean', description: 'true only when the plan file ends with the section, word for word' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const LAND_SCHEMA = {
  type: 'object',
  required: ['landed', 'summary'],
  properties: {
    landed: { type: 'boolean' },
    commit: { type: 'string' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const withoutWorkspacePrefix = (file) => file.replace(new RegExp(`^${WORKSPACE_KEY}:`), '').replace(/^\.\//, '')

const COMMAND_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['exitCode', 'stdout'],
  properties: {
    exitCode: { type: 'number', description: 'The exit code the command finished with' },
    stdout: { type: 'string', description: 'Everything the command printed, word for word' }
  },
  additionalProperties: false
}

const readWorkspaceCommit = (id) =>
  agent(
    `You are the WORKSPACE COMMIT READER for increment ${id}. Run exactly one command and report what it printed. That is
your whole job.
${BASE_GUARDRAILS}
\`git -C ${TILDE} log --name-only --format= origin/${BASE_BRANCH}..HEAD\`
Report its exit code, and in \`stdout\` everything it printed, word for word, every line. Never summarise, sort, filter or
correct it, and run nothing else. The loop reads the list itself.`,
    light({ label: `${id} workspace commit`, phase: 'Land', schema: COMMAND_OUTPUT_SCHEMA })
  )

const committedPathsOf = (stdout) =>
  [
    ...new Set(
      String(stdout ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    )
  ]

const isRunState = (path) => path.startsWith('workareas/')

const workspaceLeaks = (committed, changedFiles) => {
  const reported = changedFiles.map(withoutWorkspacePrefix)
  const carried = workspaceInIncrement?.carried ?? []
  const paths = committed.map(withoutWorkspacePrefix)
  const leaked = paths.filter((path) => carried.includes(path) || (isRunState(path) && !reported.includes(path)))
  const mayBeCarried = (path) =>
    isRunState(path) ? workspaceInIncrement.underWorkareas > 0 : !carriedNamedInFull()
  const toLookUp = paths.filter((path) => !leaked.includes(path) && mayBeCarried(path))
  return { leaked, toLookUp }
}

const shellQuoted = (text) => `'${String(text).replaceAll("'", `'\\''`)}'`

const carriedLookupCommand = (paths) =>
  `grep -Fx ${paths.map((path) => `-e ${shellQuoted(path)}`).join(' ')} ${carriedListFile()}`

const GREP_FOUND_NONE = 1

const lookUpCarried = (id, paths) =>
  agent(
    `You are the CARRIED FILE LOOKUP for increment ${id}. Run exactly one command and report what it printed. That is your
whole job.
${BASE_GUARDRAILS}
\`${carriedLookupCommand(paths)}\`
Report its exit code, and in \`stdout\` everything it printed, word for word, every line. An exit code of 1 with nothing
printed is an ordinary answer: report it as it is. Never summarise, sort, filter or correct it, and run nothing else.`,
    light({ label: `${id} carried lookup`, phase: 'Land', schema: COMMAND_OUTPUT_SCHEMA })
  )

const carriedAmong = async (id, paths) => {
  if (paths.length === 0) return []
  if (!workspaceInIncrement.listedIn) return null
  const answer = await lookUpCarried(id, paths)
  if (!answer) return null
  if (answer.exitCode === GREP_FOUND_NONE) return []
  if (answer.exitCode !== 0) return null
  return committedPathsOf(answer.stdout).filter((path) => paths.includes(path))
}

const workspaceChangedList = (changedFiles) =>
  changedFiles.length > 0
    ? changedFiles.map((file) => `     - ${withoutWorkspacePrefix(file)}`).join('\n')
    : `     (the implementor and fixer reported none: look for them with \`git -C ${TILDE} status --short\`)`

const workspaceLandStep = (changedFiles) =>
  buildsWorkspace()
    ? `
4b. THE WORKSPACE REPO'S COMMIT. Stage by explicit path only, one \`git -C ${TILDE} add -- <path>\` per path: the files
   the increment created or changed there, as the implementor and fixer reported them —
${workspaceChangedList(changedFiles)}
   — and anything else \`git -C ${TILDE} status --short\` shows that this increment produced. NEVER a file THE WORKSPACE
   REPO rule names as carried or whose carried-files list holds it, and nothing under \`workareas/\` unless the increment's row names that exact path. Then
   \`git -C ${TILDE} commit -m "<message>" -- <every path you staged>\`, with the same subject as the other repos. The
   pathspec keeps out anything somebody else had staged. The loop reads back from git what the commit holds.`
    : ''

const PR_SCHEMA = {
  type: 'object',
  required: ['ok', 'prs', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    prs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'url'],
        properties: {
          repo: { type: 'string' },
          url: { type: 'string' },
          number: { type: 'number' },
          raised: { type: 'boolean', description: 'true if this run opened it, false if you reused an open one' }
        },
        additionalProperties: false
      }
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const CI_SCHEMA = {
  type: 'object',
  required: ['green', 'summary'],
  properties: {
    green: { type: 'boolean', description: 'Everything you were asked to watch actually resolved green. An unresolved watch is NOT green' },
    prs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'url', 'state'],
        properties: {
          repo: { type: 'string' },
          url: { type: 'string' },
          state: { type: 'string', description: 'green | red | unresolved | merged' }
        },
        additionalProperties: false
      }
    },
    merged: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'sha'],
        properties: {
          repo: { type: 'string' },
          sha: { type: 'string', description: 'The merge commit on the base branch' }
        },
        additionalProperties: false
      }
    },
    failures: { type: 'array', items: { type: 'string' }, description: 'One line per failing job, naming the check and what it said' },
    blocked: { type: 'string', description: '"none", or one line naming the stop condition that fired' },
    stopReason: {
      type: 'string',
      enum: ['none', 'pr-conflict', 'awaiting-approval', 'changes-requested', 'not-mergeable', 'pr-red', 'base-branch-red', 'base-branch-unverified', 'pr-left-open'],
      description:
        'WHICH stop condition fired, as a fixed value the caller branches on. `blocked` is prose for a human; this is the machine answer and the two must agree. "none" when green. Set "awaiting-approval" ONLY when the PR is green and simply has no approving review yet — never for anything that is actually wrong, because the caller reports that one as a healthy pause rather than a failure'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const PR_CONFLICT = 'pr-conflict'

const PR_CONFLICT_STEP = `MERGEABILITY FIRST, for EVERY pr before you watch any. GitHub runs NO checks on a PR that conflicts with its
base, so watching its checks waits for nothing, and the other repos' E2E would run against the base's old image.
For each pr: \`gh pr view <url> --json mergeable,mergeStateStatus\`
- \`mergeable\` UNKNOWN → GitHub has not worked it out yet. Run the same command again, up to 10 times in all.
- \`mergeable\` CONFLICTING, or \`mergeStateStatus\` DIRTY → STOP before you watch any checks. Report green:false, that pr's
  state "red", stopReason "${PR_CONFLICT}", blocked "<repo> PR <url> conflicts with its base", and the same line in
  failures[]. No code fix in this row clears it: the base must be merged into the branch.
- anything else → that pr can be watched.`

const conflictStopDetail = (id, ci, branch) =>
  `${id}: ${ci.blocked}. GitHub runs no checks on it. Merge ${IS_BRANCH ? 'its base branch' : `origin/${BASE_BRANCH}`} into ${branch} in that repo, push, then run again`

const conflictStop = (id, ci, branch, entry) => {
  const detail = conflictStopDetail(id, ci, branch)
  log(`${id}: PR CONFLICTS WITH ITS BASE — ${detail}`)
  return {
    result: { id, ...entry, branch, outcome: PR_CONFLICT, stopReason: PR_CONFLICT, detail },
    stopped: { reason: PR_CONFLICT, detail }
  }
}

const MERGE_SCHEMA = {
  ...CI_SCHEMA,
  properties: {
    ...CI_SCHEMA.properties,
    untriggered: {
      type: 'array',
      description: 'Every merge commit that started no workflow on the base branch, so had no run to watch. Empty when every merge started one',
      items: {
        type: 'object',
        required: ['repo', 'sha', 'why'],
        properties: {
          repo: { type: 'string' },
          sha: { type: 'string' },
          why: { type: 'string', description: "Each workflow's reason from tim build push-workflows" }
        },
        additionalProperties: false
      }
    },
    jobsGreen: {
      type: 'array',
      description:
        'Every base-branch run whose own status stayed unresolved after the watches but whose jobs had all passed, by tim build run-jobs. Empty when every run resolved on its own',
      items: {
        type: 'object',
        required: ['repo', 'runId', 'workflow', 'jobs'],
        properties: {
          repo: { type: 'string' },
          runId: { type: 'string' },
          workflow: { type: 'string' },
          jobs: { type: 'array', items: { type: 'string' }, description: "tim's result.jobs, word for word" }
        },
        additionalProperties: false
      }
    }
  }
}

const readIncrement = (id) => `
THE INCREMENT — read it in full before anything else:
\`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\` — the requirement, and
\`jq 'del(.increments)' ${BACKLOG_TILDE}\` — the programme's header, whose invariants every increment keeps.
The row is a REQUIREMENT: title, detail (what and why), acceptanceCriteria (what must be observably true
afterwards), sources (where it came from), openQuestions and notes. It never says how. How is worked out
against the live tree, just in time, and written to the plan at ${PLANS}/${id}.md.
An older backlog's row may still carry filesToTouch, verification or recipe. Treat them as hints about where to
look, never as the script: the code as it is now wins.
What IS worth reporting as a defect is a claim that does not hold — a behaviour the application does not have,
a source that says something else, two criteria that contradict each other. Thin is fine; wrong is not.
`

const readPlan = (id) => `THE PLAN is at ${PLANS}/${id}.md. Read it in full.`

const PLAN_CONTRACT_FOR_IMPLEMENTOR = `Follow its decisions, homes and rule owners: they settle where each piece of the
change lives, which mechanism it goes through and which function owns each rule. Names and code shape are yours to get
right. The plan does not write them; where it seems to, treat that as a proposal. Rename anything whose name does not
say what the code returns and what it changes. Where the plan names an exemplar, copy its structure, never its
comments or names. Where it follows a repo's recipe, read the recipe it cites and follow it exactly. Where a decision
would break a house rule or a written repo rule, follow the rule and say why in notes. Where the plan is wrong about
the tree, do the smallest thing that meets the increment's acceptance criteria and say what you changed in notes.`

const planListOrNone = (entries) =>
  (entries ?? []).length > 0 ? entries.map((entry) => `   - ${entry}`).join('\n') : '   (the plan returned none)'

const planFindingKindOf = (finding) => (finding.kind === 'detail' ? 'detail' : 'structural')

const planReviewFindingText = (finding, index) =>
  `${index + 1}. [${planFindingKindOf(finding)}] ${finding.section}: ${finding.what} Rule: ${finding.rule} Must become true: ${finding.mustBecomeTrue}`

const planReviewFindingLine = (finding, index) => `  ${planReviewFindingText(finding, index)}`

const planReviewFindingLines = (findings) => findings.map(planReviewFindingLine).join('\n')

const mustAddressOf = (plan) => plan?.planReviewMustAddress ?? []

const mustAddressForImplementor = (plan) =>
  mustAddressOf(plan).length > 0
    ? `
PLAN REVIEW: MUST ADDRESS. The plan review left these findings open on the revised plan. Each is required work in
this increment, as binding as the plan's decisions. Address every one, and say in notes how you addressed each, by its
number:
${planReviewFindingLines(mustAddressOf(plan))}`
    : ''

const mustAddressForReview = (plan) =>
  mustAddressOf(plan).length > 0
    ? `
THE PLAN REVIEW LEFT THESE FINDINGS OPEN, and the implementor was given each as required work:
${planReviewFindingLines(mustAddressOf(plan))}
Check each against the change. Each one the change does not address is a finding: give it the code-quality category
that fits it, \`structure\` when none fits better, and name the plan review finding by its number.`
    : ''

const planDecisionReviewRule = (plan) => `THE PLAN IS NOT A DEFENCE. A plan decision is a finding when the code it produced cannot be
explained from the code alone, or when it departs from a written repo rule. A name, comment, structure or test the house
rules or the repo's docs would reject is a finding, whoever chose it. The plan lists these departures from written rules:
${planListOrNone(plan?.departures)}
A departure it does not list, or one with no rule quoted or no reason, is a finding. It lists these docs the change makes
untrue, each with what must change:
${planListOrNone(plan?.docsMadeUntrue)}
Each one the change still leaves untrue is a finding.${mustAddressForReview(plan)}`

const implementorNotesForReview = (implementorNotes) => `THE IMPLEMENTOR'S NOTES — what it says it decided, changed from
the plan, left alone or found wrong. Judge each claim against the code; a deviation from the plan with no sound reason, or
a thing it left alone that this change makes untrue, is a finding:
${implementorNotes || '(none)'}`

const planStandardsLine = (plan) =>
  (plan?.standards ?? []).length > 0
    ? `\nTHE STANDARDS THE PLAN LISTS. Read each one in full before you write: ${plan.standards.map((path) => `\`${path}\``).join(', ')}.`
    : ''

const CODEX = {
  implement: {
    brief: 'implement.md',
    schemaFile: 'increment.json',
    relay: 'The two shapes match field for field — copy it across unchanged.'
  },
  review: {
    brief: 'review.md',
    schemaFile: 'findings.json',
    relay:
      'Codex returns fields yours has no room for: fold each finding\'s "confidence" into its "why" as " (confidence: <value>)", drop the top-level "summary", and omit "line" where Codex returned null. Every other field copies across unchanged.'
  },
  fix: {
    brief: 'fix.md',
    schemaFile: 'fix.json',
    relay: 'The two shapes match field for field — copy it across unchanged.'
  }
}

const codexPaths = (id, slug) => ({
  promptFile: `${WORKAREA}/logs/${id}-${slug}.prompt.md`,
  promptFileTilde: `${WORKAREA_TILDE}/logs/${id}-${slug}.prompt.md`,
  lastMessage: `${WORKAREA}/logs/${id}-${slug}.lastmsg.txt`,
  lastMessageTilde: `${WORKAREA_TILDE}/logs/${id}-${slug}.lastmsg.txt`,
  runLog: `${WORKAREA_TILDE}/logs/${id}-${slug}.log`
})

const CODEX_REPOS = REPO_KEYS.map((key) => `${key}=${repoAbs(key)}`).join(', ')

const bindingLines = (bindings) =>
  Object.entries(bindings)
    .map(([name, value]) => `  <${name}> = ${value}`)
    .join('\n')

const codexRun = (id, stage, { phaseName, instructions, workingBranch, slug = stage, bindings = {} }) => {
  const { brief, schemaFile } = CODEX[stage]
  const { promptFile, promptFileTilde, lastMessageTilde, runLog } = codexPaths(id, slug)

  return agent(
    `You are the CODEX SHELL for the ${slug} stage of increment ${id}. Codex does the work; you start it, wait
for it, and report ONLY whether it RAN. You do not do the stage yourself, you do not edit anything Codex
owns, and you do not read or judge what Codex concluded — a separate relay agent does that.
${guardrails()}
STEP 1 — with the Write tool, write EXACTLY the text between the markers (markers excluded) to
${promptFile}:
---8<---
Read ${BRIEFS}/${brief} and follow it in full.

PLACEHOLDER BINDINGS — the brief is written with placeholders. Resolve every one as:
  <workspace>    = ${ABS}
  <workarea>     = ${WORKAREA}
  <backlog>      = ${BACKLOG}
  <logs>         = ${WORKAREA}/logs
  <skills>       = ${SKILLS}
  <branch>       = ${workingBranch ?? BASE_BRANCH}
  <baseBranch>   = ${BASE_BRANCH}
  <INCREMENT_ID> = ${id}
  <plan>         = ${PLANS}/${id}.md
  <repos>        = ${CODEX_REPOS}
${bindingLines(bindings)}

${instructions}
---8<---
STEP 2 — run Codex IN SLICES. Read this whole step before your first call.

**Never use run_in_background for any of it.** You cannot wait for a background job: the moment you stop
making tool calls you are forced to finalise, and Codex dies with you mid-work. That reports a healthy
run as a failure and throws away everything it did. It is the single most common way this stage breaks,
and no amount of patience or polling fixes it — a poll costs a turn, and you do not have enough turns.
Every call below is a FOREGROUND call that returns by itself, so you never wait for anything.

Codex often needs longer than one Bash call allows. That is fine: its session is on disk and a killed run
resumes exactly where it stopped. So you run it in slices, each slice one foreground call.

2a. FOREGROUND Bash, timeout 570000:
\`codex exec -C ${TILDE} --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema ${BRIEFS_TILDE}/schemas/${schemaFile} -o ${lastMessageTilde} "Read ${promptFileTilde} and follow it in full." > ${runLog} 2>&1\`
- Returns normally → go to STEP 3.
- The tool reports it exceeded the timeout and was MOVED TO THE BACKGROUND → Codex is still running and
  must not be left there. Go to 2b.

2b. FOREGROUND Bash, fast — end the slice and find the session:
\`pkill -f "codex [e]xec.*${id}-${slug}\\.lastmsg" ; grep -m1 "session id:" ${runLog}\`
The bracket in \`[e]xec\` is deliberate: it stops the pattern matching your own shell. Nothing is lost —
Codex writes its session to disk as it goes.

2c. FOREGROUND Bash, timeout 570000 — resume that session:
\`codex exec -C ${TILDE} --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema ${BRIEFS_TILDE}/schemas/${schemaFile} -o ${lastMessageTilde} resume <SESSION_ID> "Continue where you left off and finish the task. Write your final result." >> ${runLog} 2>&1\`
**Every flag comes BEFORE \`resume\`** — \`codex exec resume -C ...\` is rejected outright.
- Returns normally → STEP 3.
- Backgrounded again → repeat 2b, then 2c, reusing the SAME session id.

At most FIVE slices. If Codex has written no result after that, it has genuinely failed — report that.

STEP 3 — check that it produced a result. One Bash call: \`jq empty ${lastMessageTilde}\`
STEP 4 — report TRANSPORT and nothing else:
- ok:true ONLY if the LAST slice you ran exited ZERO and \`jq empty\` accepted ${lastMessageTilde}. Put
  Codex's \`tokens used\` line from the tail of ${runLog} in your summary, and say how many slices it took.
- ok:false in EVERY other case — the last slice exited non-zero, ${lastMessageTilde} missing, or jq
  rejecting it. Quote the tail of ${runLog} in your summary so the failure is diagnosable.
A slice that was backgrounded and then killed at 2b is NOT a failure — it is the normal way a long run is
cut into pieces, and only the final slice's exit code counts.
ok here is about the RUN, NEVER about what Codex concluded: a Codex run that finished and reported a problem,
a red suite or an unapplied fix is still ok:true to you. NEVER write ${lastMessageTilde} yourself and never
invent a result.
Return the structured output only.`,
    light({ label: `${id} codex:${slug}`, phase: phaseName, schema: incrementSchema })
  )
}

const codexRelay = (id, stage, { phaseName, schema, slug = stage }) => {
  const { schemaFile, relay } = CODEX[stage]
  const { lastMessage } = codexPaths(id, slug)

  return agent(
    `You are the RELAY for the ${slug} stage of increment ${id}. Codex has already run and written its final
message to ${lastMessage}. Re-emitting that file as your structured output is your ENTIRE job.
${guardrails()}
Read ${lastMessage} once with the Read tool. It conforms to ${BRIEFS}/schemas/${schemaFile}.
${relay}
Add nothing of your own — no findings, no opinions, no work. Run no suite. Edit no file.
Return the structured output only.`,
    light({ label: `${id} relay:${slug}`, phase: phaseName, schema })
  )
}

const codexStage = async (id, stage, options) => {
  const slug = options.slug ?? stage
  const run = await codexRun(id, stage, options)
  if (!run || !run.ok) {
    log(`${id}: codex ${slug} DID NOT RUN — ${run ? run.summary : 'the codex shell agent died'}`)
    return null
  }
  const relayed = await codexRelay(id, stage, options)
  if (!relayed) log(`${id}: codex ${slug} ran but its relay agent died`)
  return relayed
}

const codexNoResult = (id, slug) =>
  `the codex ${slug} stage produced no result — the run or its relay failed. See ${WORKAREA}/logs/${id}-${slug}.log`

const standardsKeys = REPO_KEYS.filter((key) => key !== WORKSPACE_KEY)
  .map((key) => `${key} → \`${REPO_PATH[key].replace(/^repos\//, '')}\``)
  .join(', ')

const frontendChangeRepos = FRONTEND_CHANGE_KEYS.map((key) => `${key} (\`${REPO_PATH[key]}\`)`).join(' or ')

const frontendChangeTarget = () => {
  if (FRONTEND_CHANGE_KEYS.length === 1) return `\`${TILDE}/${REPO_PATH[FRONTEND_CHANGE_KEYS[0]]}\``
  return `whichever of ${FRONTEND_CHANGE_KEYS.map((key) => `\`${TILDE}/${REPO_PATH[key]}\``).join(' and ')} the plan names for the journey change`
}

const frontendChangeSetList = (key) =>
  FRONTEND_CHANGE_SETS[REPO_PATH[key]].map(({ set, prefix }) => `\`${set}\` → spec namespace \`${prefix}/\``).join(', ')

const FRONTEND_CHANGE_SET_TABLE = FRONTEND_CHANGE_KEYS.map(
  (key) => `       - ${key} (\`${REPO_PATH[key]}\`): ${frontendChangeSetList(key)}`
).join('\n')

const FRONTEND_CHANGE_IMPLEMENT_LINE = FRONTEND_CHANGE_KEYS.length
  ? `
Where the plan follows ${SKILLS}/frontend-change/SKILL.md, substitute this programme's repo only for TARGET REPO
paths and npm --prefix. **Paths under the WORKSPACE root \`${TILDE}\` are LITERAL — never substitute them.** The
skill's Step 5 writes the workspace's own behaviour spec (\`${TILDE}/openspec/specs\`, \`${TILDE}/openspec/coverage\`)
and calls \`${TILDE}/tools/frontend-change/openspec-validate.sh\`; those live in the workspace repo, and rewriting them
at the target repo would write the spec into the wrong tree. For Step 5's two roots: the TARGET REPO is
${frontendChangeTarget()}; the SPEC ROOT is \`${TILDE}\` (the skill's default — do NOT pass one). The SET, and so
the spec namespace, is the one the plan names, read from where the change lives — never assumed from the repo:
${FRONTEND_CHANGE_SET_TABLE}
Leave the
\`openspec/\` write uncommitted — the land stage commits it — and name every file the skill's completion output lists
in your notes. If the skill HALTS at spec sync, the increment is NOT complete: report the halt, do not paper over it.`
  : ''

const FRONTEND_CHANGE_PLAN_LINE = FRONTEND_CHANGE_KEYS.length
  ? `
   - where the change adds a field, page, section or collection to a frontend journey, or changes an obligation or
     the journey flow, ${SKILLS}/frontend-change/SKILL.md, then the repo's own recipe it routes to. Plan by that
     recipe, substituting this programme's repo path and set. A recipe is the repo's own how-knowledge: follow it
     rather than improvising.${IS_LEGACY_KEYS ? '' : ` It covers ${frontendChangeRepos} only: never route another repo's change through it.`}
     Name the set in the plan, read from the path the change lives under — two sets share the animals repo — and
     the spec namespace it writes:
${FRONTEND_CHANGE_SET_TABLE}
     A change frontend-change does not route — wording, content or layout alone, say — still has section 8.`
  : ''

const rowReposPlanLine = (rowRepos) => {
  if (!rowRepos) return ''
  if (rowRepos.length === 0) {
    return `THE ROW'S REPOS: none. This row changes no backlog repo. Plan edits only in the workspace repo, under
${WORKAREA_TILDE}/ or wherever the row names in the workspace, and return repos as []. The implementor leaves them
uncommitted for the orchestrator.\n`
  }
  return `THE ROW'S REPOS: ${rowRepos.join(', ')}. Plan only within them, and if the slice genuinely needs another repo,
return ok:false naming it.\n`
}

const branchPlanRule = (rowRepos) => `${rowReposPlanLine(rowRepos)}MERGE ROWS: a row whose \`merge\` field maps a repo key to a ref, such as \`{"tests": "origin/main"}\`, asks for that ref to
be merged into that repo on \`${BASE_BRANCH}\`. The loop runs the merge itself, \`git merge --no-ff --no-commit <ref>\` after a
fetch, before the implementor starts, and commits it as a two-parent merge commit after review. You plan what the loop
cannot: how every conflict is resolved, and every file that merges cleanly but is wrong. Preview the merge without
touching the tree: \`git -C ${TILDE}/<repoPath> fetch origin\`, then
\`git -C ${TILDE}/<repoPath> merge-tree --write-tree --name-only --no-messages HEAD <ref>\`. Its first line is a tree id and
every further line a conflicted path. Where the row's notes point at a resolutions file (resolutions.json beside the
backlog, say), read it in full and plan each resolution exactly as it records. Never re-decide one; where the live tree
disagrees with it, return ok:false saying where. Plan no git mechanics: no merge, commit, abort or push commands.
GATE PHASES: the row's \`gatePhases\`, when present, is the subset of unit, fit and e2e the loop's gate runs for it. Where it
leaves out e2e, the end-to-end proof belongs to another row: say so in section 4 rather than planning one.
`

const branchedWorkspaceLine = (branchedRepos) =>
  WORKSPACE_CONFIGURED && !branchedRepos.includes(WORKSPACE_KEY)
    ? ` The workspace repo is not among them: a plan
that changes anything in it, \`openspec/\` included, needs it, so return ok:false naming \`${WORKSPACE_KEY}\`.`
    : ''

const deniedChecksNote = (id, deniedChecks) =>
  deniedChecks.length
    ? `YOUR LAST PLAN NAMED CHECKS THE WORKSPACE DENIES, so the ladder could not run them:
${deniedChecks.map((command) => `  - \`${command}\``).join('\n')}
Rewrite ${PLANS}/${id}.md so every check in sections 5 and 6 takes a CHECK COMMANDS form below, adding to the plan's own
work any test or npm script a rewritten check needs. Keep the rest of the plan unless that change needs it.
`
    : ''

const codeTextLine = (entry) => `plan line ${entry.lineNumber} (${entry.kind}): ${entry.text}`

const codeTextNote = (id, codeText) =>
  codeText.length
    ? `YOUR LAST PLAN WRITES CODE TEXT, which is the implementor's to write:
${codeText.map((entry) => `  - ${codeTextLine(entry)}`).join('\n')}
Rewrite each of these in ${PLANS}/${id}.md as the decision, home or owner behind it, or as the behaviour a test must
prove, or delete it. Cite existing code, a comment or a test by file:line rather than quoting it. Keep the rest of the
plan unless that change needs it.
`
    : ''

const planReviewNote = (id, findings) =>
  findings.length
    ? `THE PLAN REVIEW SENT YOUR PLAN BACK. Rewrite ${PLANS}/${id}.md so each of these is true, and keep the rest of the plan
unless a finding needs it. A structural finding still open on the revised plan stops the increment; a detail finding
still open becomes required work for the implementor:
${planReviewFindingLines(findings)}
`
    : ''

const IDS_TO_BEHAVIOUR = `IDS BECOME BEHAVIOUR. The row's requirements, notes and sources carry ids: c-NNN, inc-NNN, ruling ids, ticket
keys. Turn each one into the behaviour it names. Never copy an id into the plan's code-facing content: sections 2, 3, 4,
9, 10, 11 and 13. Decisions may cite one as provenance.`

const BOUNDED_TIDY_UP = `BOUNDED TIDY-UP. A plan fixes every house-rule breach in the files it edits for the row's own behaviour, and in
the lines and functions the change touches anywhere else. It never widens the row's footprint for clean-up alone: no
new file, no new call site, no signature change across callers, and no file edited only to clean it. A structural
decision the row genuinely needs, such as logging a rule at its one owner, may still change callers, and the plan says
why under Decisions. A file touched only to follow such a decision, a caller passing a new argument say, gets the
touched lines and function fixed and no more. Wider clean-up goes in section 7 as a follow-up for the backlog, never
into this increment.`

const PLAN_STANDARDS_STEP = `the standards for those files. Run \`tim backlog standards --files <repoKey>:<path> --workspace ${TILDE} --json\`
     (repeat --files for each file; the repo keys are ${standardsKeys}, and \`workspace\` for this repo) and read
     every rules, bestPractice and repoDocs file it lists`

const planIncrement = (id, branchedRepos = null, { label = `${id} plan`, deniedChecks = [], codeText = [], reviewFindings = [] } = {}) =>
  agent(
    `You are the PLANNER for increment ${id}. You write the plan; you change no source file and you commit nothing.
${deniedChecksNote(id, deniedChecks)}${codeTextNote(id, codeText)}${planReviewNote(id, reviewFindings)}${guardrails()}
${HOUSE_RULES_TO_PLAN}
${readIncrement(id)}
${REPO_RULE}
${IS_BRANCH ? branchPlanRule(branchedRepos) : branchedRepos ? `BRANCHED REPOS: the repos branched for this increment are ${branchedRepos.join(', ')}. Plan only
within them, and if the slice genuinely needs another repo, return ok:false naming it.${branchedWorkspaceLine(branchedRepos)}\n` : ''}
WHAT A PLAN IS: the decisions, homes and owners the change needs. The increment says what must be true afterwards
and why. Against the code as it is now, you decide where each piece of the change lives, which existing mechanism it
goes through, which one function owns each rule, and what each test must prove. You never write code text: no names
for new things, no comment or doc comment text, no test titles or bodies, no log wording, no code bodies. Names and
code shape are the implementor's to get right. A plan review checks your plan before any code exists.
${IDS_TO_BEHAVIOUR}
${BOUNDED_TIDY_UP}

1. PIN THE TREE. For each of the increment's repos, record its branch and HEAD in the plan:
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\` and \`git -C ${TILDE}/<repoPath> rev-parse --short HEAD\`.
2. READ, IN FULL, with the Read tool:
   - the files the change will touch, and the nearest existing feature that already does something similar — the
     exemplar whose structure the implementor will follow;
   - the existing mechanism each new piece will go through, and what its comments, doc comments and the repo's docs
     say about its design;
   - each changed repo's own docs (\`docs/\`, and \`src/server/app/docs/\` where it exists), the layer rules above all;
   - ${PLAN_STANDARDS_STEP};${FRONTEND_CHANGE_PLAN_LINE}
3. CHECK THE CLAIMS. Test each thing the increment asserts about the application against the live tree. Where one
   is wrong, record it under Decisions and plan against reality. If the increment cannot be carried out at all,
   return ok:false saying exactly why.
4. WRITE ${PLANS}/${id}.md with the Write tool. Open with a table of the repos: path, branch, HEAD. Then:
   0. Decisions — every choice the increment left open, how you settled it, and the alternative you rejected.
   1. Moves — every file that moves or is deleted, from → to. "None" is an answer.
   2. Edits — for each file that changes, what must change in it and why, as behaviour, homes and owners. Name an
      exemplar where its structure helps. Never the code.
   3. New files — what each one owns, why it is not part of an existing file, and the file whose structure to follow.
   4. Tests — each test that changes or is new, stated as the behaviour it must prove and the production line
      (file:line, or the edit in section 2 or 3) whose removal turns it red. Never a title or a body. Prove a removal
      with an exact positive assertion of what shows now, never by absence. Where the slice changes anything a user
      or another system can see, include the INTEGRATION PROOF: an E2E or contract test in the tests repo that
      exercises the slice through the real stack.
   5. Invariants to prove — one runnable check per acceptance criterion where practical, with its expected result,
      plus any programme invariant this change could break. Other stages run these checks. Mark a check that needs
      the workspace stack up "needs the workspace stack": the run holds the stack's lease and keeps it up for every
      increment, and the stage that runs the check uses it as it is, so never write how to start or stop the stack
      here — no \`tim docker up\`, \`dev\` or \`down\`, no \`tim docker lease\`, no \`run-stack.sh\` or \`stop-stack.sh\`.
      The integration proof is still the gate's E2E phase: for a criterion only the whole slice running end to end can prove, name the E2E rung from
      gates.json that carries it, as the check.
   6. Increment-specific checks beyond the gate. \`tim build gate\` already runs every repo's own rungs from
      gates.json — format check, lint, typecheck, unit tests, \`mvn verify\`, the duplication check on changed test
      files, FIT and the tests repo's local-stack E2E suite, which carries the integration proof — so never list
      those here. List only what this increment
      needs proved on top of them and section 5, one command each in a CHECK COMMANDS form below, with tilde
      paths, and what each proves. One that needs the workspace stack up is marked "needs the
      workspace stack", as in section 5, and runs under the run's lease; the slice's integration proof still
      belongs in the tests repo's E2E suite, which the gate runs. A check that starts a
      Docker Compose project of its own (\`docker compose run\` starts its \`depends_on\` services) is followed by the
      repo's script that takes that project down, as a check of its own. "None" is an answer.
      Sections 5 and 6 check behaviour: what a page, a test or the spec does. Never a check that a file stays
      untouched or unchanged: scope is a decision (section 0 or 7), not a test, and a later stage may depart from it
      for a stated reason.
   7. Out of scope — what the implementor must leave alone, including neighbouring open questions. Then
      "Follow-ups:", each wider clean-up you noticed outside the row's footprint as one line a backlog row could be
      written from. "None" is an answer.
${specSyncPlanSection()}
   9. Homes — every new constant, registry entry, argument, field or helper: the existing mechanism it goes
      through, as file:line. Where you depart from that code's stated design (a comment, a doc comment, a repo
      doc), quote it and say why. A second mechanism beside one that exists is not a home.
   10. Rule owners — every display or business rule the change adds or alters: the one function that owns it, as
      file:line or the new file, in each twin repo the row builds. One rule, one owner.
   11. Test support — the shared helper each new test's set-up extends (\`engine/test-support.js\`,
      \`fit/<set>-journey.js\`, \`flows/<domain>/journey.ts\`, a Java IT base class), and what it gains. Set-up used by
      two tests goes there. Name any local helper to promote, and the copies that promoting it deletes.
   12. Docs this makes untrue — the behaviour grep you ran over the changed repos' docs, recipes, JSDoc and Javadoc,
      and invariant and convention test names, written as the command. Then each hit the change makes untrue, by
      file:line, with what must change: a stale comment is deleted, and a doc, recipe or doc comment names the fact
      it must state now, never its new wording. "None (grep: <command>)" is an answer.
   13. Operability — every branch the change adds or alters that changes an outcome (a refusal, a redirect, a
      retry, a fallback, a state switch): the log it needs, and what that line must let support find — which ids,
      which cause. Never its wording. "None — <why no branch changes an outcome>" is an answer.
   14. Departures from written rules — each place the plan departs from a house rule, a best-practice guide, a
      recipe or a repo doc: the rule quoted, its path, and the reason. "None" is an answer.
   15. Reachability — build only what is reachable once this increment lands. For anything that is not yet (a branch
      for a state that cannot occur, an option nothing passes), name the backlog row that reaches it, or leave it out.
   16. Standards — every rules, bestPractice and repoDocs path \`tim backlog standards\` listed for the files the plan
      changes. The implementor reads each in full.
   The plan never covers lifecycle: no commit messages, branches, pushes or pull requests. Later stages own those.
   The increment is one full-stack slice. Plan every repo it needs in this one plan; never leave "the tests half"
   or "the backend half" for another increment.
${PLAN_CHECK_FORMS}
Return ok, summary, repos (the repos the plan changes${IS_BRANCH ? '' : `, ${PLAN_MERGE_ORDER}`}), behaviourChanges, decisions, risks,
followUps (section 7's follow-ups, [] for none), specPrefixes (the prefixes section 8 writes under, [] for none),
docsMadeUntrue (section 12), departures (section 14), standards (section 16) and checks: every command in sections 5
and 6, exactly as the plan writes it. The loop reads
checks[] and sends back a plan that names a denied form. It also reads the plan file for code text, and sends back a
plan that writes some.
Return the structured output only.`,
    think({ label, phase: 'Plan', schema: PLAN_SCHEMA })
  )

const deniedChecksOf = (plan) =>
  (plan?.checks ?? []).map((check) => check.command).filter(isDeniedCommand)

const PLAN_LINT_PREFILTER = 'comment|jsdoc|javadoc|docblock|arrange|title|test name|should |log|warn|describe\\(|it\\(|test\\('

const COMMENT_WORDS = '(comments?|jsdoc|javadoc|doc comments?|docblocks?)'

const NOT_IN_A_RELATIVE_CLAUSE = '(?<!\\b(what|which|whatever|how|why|where|who|whose)( [^ .;:]+){0,2} )'

const OPEN_QUOTE = `["“\`']`

const QUOTED_TEXT = '(["“][A-Za-z]+ [A-Za-z][^"”]*["”]|`[A-Za-z]+ [A-Za-z][^`]*`|(?<![A-Za-z`])\'[A-Za-z]+ [A-Za-z][^\']*\')'

const SOURCE_REFERENCE =
  '(\\S+\\.(md|js|mjs|ts|java|njk|json|ya?ml)(:\\d+(-\\d+)?)?`?|§ ?\\d+\\w*`?|\\b(house rules?|rules?|guides?|standards?|best[- ]practices?)\\b)'

const CITED_QUOTE = new RegExp(
  `${SOURCE_REFERENCE}([^"“”.;]{0,40}?([:(—–]|\\b(says|states|exempts|reads))\\s*|\\s+)["“][^"”]*["”]`,
  'gi'
)

const CHECK_COMMAND_SPAN =
  /`(\$ )?(grep|rg|jq|tim|npm|npx|node|git|mvn|\.\/mvnw|sed|awk|curl|find|bash|docker|make|wc|head|tail|cat)\b[^`]*`/g

const CHECK_COMMAND_LINE = /^([-*]|\d+\.|\|)?\s*(\$\s*)?(grep|rg|jq|tim|npm|npx|node|git|mvn|curl|docker|bash)\s/

const EXISTING_TEST_REFERENCE =
  /\b(existing|already|current|currently|today|they name)\b|\bon this branch\b|\b(is|are|was|were)( still| now)? (titled|named|called)\b|\b(test|spec)s? at (line )?\d+|\.(test|spec|fit\.spec)\.[a-z]+:\d+|\bcoverage\b|`(partial|full|none)`/i

const DICTATED_TITLE = new RegExp(
  `\\b(rename|renames|renamed|renaming|retitle|retitles|retitled|retitling)\\b[^.;"“]{0,80}?\\s*:?\\s*${OPEN_QUOTE}|\\b(new|added)\\b[^.;"“]{0,40}?\\b(titled|named|called)\\b|\\b(should|must|will|to) be (titled|named|called)\\b`,
  'i'
)

const SENTENCE_BREAK = /(?<=[.;!?])\s+/

const describesAnExistingTest = (sentence) =>
  EXISTING_TEST_REFERENCE.test(sentence) && !DICTATED_TITLE.test(sentence)

const CODE_TEXT_DIRECTIVES = [
  {
    kind: 'a comment or doc comment to add, keep, copy or reword',
    pattern: new RegExp(
      `\\b(add|adds|adding|write|writes|insert|inserts|put|keep|keeps|carry|carries|copy|copies|mirror|mirrors|rewrite|rewrites|reword|rewords)( [^ .;:]+){0,4} ${NOT_IN_A_RELATIVE_CLAUSE}${COMMENT_WORDS}\\b|\\bwith (a|an|one) ([^ .;:]+ )?${COMMENT_WORDS}\\b`,
      'i'
    )
  },
  {
    kind: 'dictated comment or doc comment text',
    pattern: new RegExp(
      `\\b(update|updates|change|changes|edit|edits|correct|corrects|amend|amends|fix|fixes|extend|extends|expand|expands)\\b[^;]{0,60}?\\b${NOT_IN_A_RELATIVE_CLAUSE}${COMMENT_WORDS}\\b[^;]{0,80}?\\b(to say|saying|to read|to explain|explaining|to state|stating|to note|noting|to mention|mentioning|to describe|describing)\\b`,
      'i'
    )
  },
  { kind: 'Arrange/Act/Assert comments or a dictated test body', pattern: /\barrange[ ,/&-]+act[ ,/&-]+assert\b/i },
  {
    kind: 'a prescribed test title',
    pattern: new RegExp(
      `\\b(it|test|describe)\\(\\s*${OPEN_QUOTE}|\\b(tests?|specs?|scenarios?|cases?)\\b[^.;"“]{0,20}?\\b(titled|named|called|retitled|renamed)( to)?\\s*:?\\s*${OPEN_QUOTE}|\\b(retitle|retitles)\\b[^.;"“]{0,60}?\\bto\\s*:?\\s*${OPEN_QUOTE}|\\b(rename|renames)\\b[^.;"“]{0,60}?\\b(tests?|specs?|scenarios?|cases?|titles?)\\b[^.;"“]{0,40}?\\bto\\s*:?\\s*${OPEN_QUOTE}|\\b(tests?|specs?|scenarios?|cases?)\\b[^.;"“]{0,40}?\\b(rename|renames)\\b[^.;"“]{0,20}?\\bto\\s*:?\\s*${OPEN_QUOTE}|\\b(test title|test name)\\s*:?\\s*${OPEN_QUOTE}|\\b(add|adds|adding|write|writes|writing|new|rename|renames|retitle|retitles|titled|named|called)\\b[^.;"“]{0,40}?${OPEN_QUOTE}should [a-z]+ [a-z]+`,
      'i'
    ),
    excusedIn: describesAnExistingTest
  },
  {
    kind: 'a quoted log message',
    pattern: new RegExp(
      `(\\blogger\\.\\w+\\([^"“\`')]{0,60}?|\\b(log|logs|logged|warn|warns)\\b[^"“\`'.;:()]{0,30}?\\s*(:|saying|reading|that (reads|says)|with (the )?(message|text|wording)|as)?\\s*)${QUOTED_TEXT}`,
      'i'
    )
  }
]

const DELETION_DIRECTIVE =
  /\b(delete|deletes|deleting|deleted|remove|removes|removing|removed|drop|drops|strip|strips|never|without)\b|\bno (comments?|jsdoc|javadoc|doc comments?)\b/i

const NEGATED_COMMENT_WORDS = new RegExp(
  `\\b(none|no|not|nothing|nor|don't|doesn't|do not|does not)\\b( [^ .;:]+){0,5} ${COMMENT_WORDS}\\b`,
  'i'
)

const isInstructionNotToWrite = (text) => DELETION_DIRECTIVE.test(text) || NEGATED_COMMENT_WORDS.test(text)

const withoutCheckCommands = (text, checkCommands) =>
  checkCommands
    .filter(Boolean)
    .reduce((remaining, command) => remaining.replaceAll(command, ' '), text)
    .replace(CHECK_COMMAND_SPAN, ' ')

const withoutCitedQuotes = (text) => text.replace(CITED_QUOTE, (cited) => cited.replace(/["“][^"”]*["”]$/, '"…"'))

const proseOf = (text, checkCommands) => withoutCitedQuotes(withoutCheckCommands(text, checkCommands))

const writesCodeText = ({ pattern, excusedIn }, prose) =>
  excusedIn
    ? prose.split(SENTENCE_BREAK).some((sentence) => pattern.test(sentence) && !excusedIn(sentence))
    : pattern.test(prose)

const codeTextDirectiveOf = (grepLine, checkCommands) => {
  const [, lineNumber, text] = grepLine.match(/^(\d+):(.*)$/) ?? [null, '?', grepLine]
  if (CHECK_COMMAND_LINE.test(text.trim())) return null
  const prose = proseOf(text, checkCommands)
  if (isInstructionNotToWrite(prose)) return null
  const directive = CODE_TEXT_DIRECTIVES.find((candidate) => writesCodeText(candidate, prose))
  return directive ? { lineNumber, kind: directive.kind, text: text.trim() } : null
}

const codeTextDirectivesIn = (stdout, checkCommands = []) =>
  String(stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => codeTextDirectiveOf(line, checkCommands))
    .filter(Boolean)

const planLintCommand = (id) => `grep -n -i -E ${shellQuoted(PLAN_LINT_PREFILTER)} ${WORKAREA_TILDE}/plans/${id}.md`

const readPlanLintLines = (id, label) =>
  agent(
    `You are the PLAN LINT READER for increment ${id}. Run exactly one command and report what it printed. That is your
whole job.
${BASE_GUARDRAILS}
\`${planLintCommand(id)}\`
Report its exit code, and in \`stdout\` everything it printed, word for word, every line. An exit code of 1 with nothing
printed is an ordinary answer: report it as it is. Never summarise, sort, filter or correct it, and run nothing else.
The loop reads the lines itself.`,
    light({ label, phase: 'Plan', schema: COMMAND_OUTPUT_SCHEMA })
  )

const codeTextOf = async (id, label, plan) => {
  const answer = await readPlanLintLines(id, label)
  if (!answer) return null
  if (answer.exitCode === GREP_FOUND_NONE) return []
  if (answer.exitCode !== 0) return null
  return codeTextDirectivesIn(
    answer.stdout,
    (plan?.checks ?? []).map((check) => check.command)
  )
}

const planProblemsOf = async (id, plan, lintLabel) => ({
  deniedChecks: deniedChecksOf(plan),
  codeText: await codeTextOf(id, lintLabel, plan)
})

const hasPlanProblems = ({ deniedChecks, codeText }) => deniedChecks.length > 0 || codeText.length > 0

const planProblemList = ({ deniedChecks, codeText }, still) =>
  [
    deniedChecks.length
      ? `${still ? "the plan's checks still use" : 'the plan names checks in'} command forms the workspace denies, so the ladder could not run them: ${deniedChecks.join('; ')}`
      : null,
    codeText.length
      ? `${still ? 'the plan still writes' : 'the plan writes'} code text the implementor owns: ${codeText.map(codeTextLine).join('; ')}`
      : null
  ]
    .filter(Boolean)
    .join('; and ')

const unreadablePlan = (id, plan) => ({
  ...plan,
  ok: false,
  summary: `the plan lint could not read ${PLANS}/${id}.md, so the plan could not be checked for code text`
})

const refusedUnlessClean = async (id, plan, lintLabel) => {
  if (!plan?.ok) return plan
  const problems = await planProblemsOf(id, plan, lintLabel)
  if (problems.codeText === null) return unreadablePlan(id, plan)
  if (!hasPlanProblems(problems)) return plan
  return { ...plan, ok: false, summary: planProblemList(problems, true) }
}

const planPassingLint = async (id, branchedRepos = null) => {
  const plan = await planIncrement(id, branchedRepos, { label: `${id} plan` })
  if (!plan?.ok) return plan
  const problems = await planProblemsOf(id, plan, `${id} plan lint`)
  if (problems.codeText === null) return unreadablePlan(id, plan)
  if (!hasPlanProblems(problems)) return plan
  log(`${id}: ${planProblemList(problems, false)}. Sending the planner back once.`)
  const replan = await planIncrement(id, branchedRepos, { label: `${id} replan`, ...problems })
  return refusedUnlessClean(id, replan, `${id} replan lint`)
}

const HOUSE_RULES_TO_REVIEW_PLAN = houseRulesFor(
  'the plan you review: every decision, home, owner and test it records, and the code it leads to'
)

const earlierPlanReviewNote = (earlierFindings) =>
  earlierFindings.length
    ? `
YOU SENT THIS PLAN BACK ONCE, with these findings:
${planReviewFindingLines(earlierFindings)}
Check that each one is now true, then review the whole plan again. There is no third plan. A structural finding still
open, or a new one, stops the increment. A detail finding still open, or a new one, goes to the implementor as
required work and to the consistency reviewer to check.`
    : ''

const PLAN_FINDING_KIND_RULE = `GIVE EACH FINDING A KIND. Report every finding you find, whatever its kind: the kind decides what happens to
   it, not whether it counts.
   - structural: the plan is built wrong. A piece in the wrong layer or with the wrong owner; a second mechanism
     beside one that exists; a decision that contradicts a written repo rule, house rule or guide with no departure
     stated in section 14; scope that falls short of the row's acceptance criteria or goes beyond them; a test
     strategy that cannot prove the criteria.
   - detail: a line-level gap the implementor can close without changing any decision, home or owner. A specific
     comment or doc comment to delete, a local copy of a shared helper at a file:line, a doc, recipe or reference to
     update, a grep hit a section misses, an entry a section leaves out.
   A structural finding still open on the revised plan stops the increment. A detail finding still open then is not
   dropped: it is written into the plan under "Plan review: must address", goes to the implementor as required work,
   and the consistency reviewer reports any the change does not address.`

const reviewPlan = (id, { label, earlierFindings = [] }) =>
  agent(
    `You are the PLAN REVIEWER for increment ${id}. No code exists yet: you review the plan before the implementor
starts. You change no file and you commit nothing.
${guardrails()}
${HOUSE_RULES_TO_REVIEW_PLAN}
${readIncrement(id)}
${REPO_RULE}
${readPlan(id)}${earlierPlanReviewNote(earlierFindings)}
WHAT A PLAN IS: decisions, homes and owners. It records where each piece of the change lives, which existing
mechanism it goes through, which one function owns each rule, and what each test must prove. It never writes code
text: names, comment or doc comment text, test titles or bodies, log wording or code bodies. The implementor writes
those.
${BOUNDED_TIDY_UP}

1. READ, IN FULL, with the Read tool:
   - each changed repo's own docs: \`ls\` its \`docs/\` and \`src/server/app/docs/\` where they exist, and read the ones
     on its layers and on the areas the plan touches. The layer rules above all: the architecture doc, and the
     dependency-cruiser config where there is one;
   - the recipes the plan cites, and any recipe in those docs or in ${SKILLS}/frontend-change/ that covers the kind of
     change it makes;
   - ${PLAN_STANDARDS_STEP.replace('those files', 'every file the plan changes')};
   - the sibling code: each file:line the plan's Homes and Rule owners name, the code around it, and the nearest
     existing feature that does something similar.
2. CHECK THE PLAN against them. Each of these is a finding:
   - a section from 0 to 16 missing, or empty with no "None" and reason;
   - Homes: a new constant, registry entry, argument, field or helper with no existing mechanism named, or named
     without file:line; a second mechanism beside one that exists; a departure from that code's stated design that
     is not quoted;
   - Rule owners: a display or business rule with more than one owner, or not mirrored in a twin repo the row builds;
   - Layers: a piece placed where the repo's docs or layer rules keep it out — a set's codes or names in the
     platform layer, display logic in obligations or the model, an HTTP client in another concern's folder;
   - Test support: set-up two tests need that is not in the shared helper; a shared helper that exists and is not
     named; a local copy of a shared helper's body;
   - Tests: a test given as a title or a body rather than the behaviour it proves; one with no production line whose
     removal turns it red; a removal proved by absence; an acceptance criterion nothing proves;
   - Operability: a branch that changes an outcome with no log, or a log that would not let support find the ids
     and the cause;
   - Docs this makes untrue: no grep given, or a doc, recipe, JSDoc or test name the change makes untrue that the
     section misses. Run its grep yourself, and one of your own for the behaviour the change alters;
   - Departures: a departure from a written rule that is not listed, or one listed with no rule quoted or no reason;
   - Reachability: something built that nothing reaches once this increment lands, with no consumer row named;
   - Code text: a name, comment or doc comment text, test title or body, log wording or code body; an id from the
     row (c-NNN, inc-NNN, a ruling id, a ticket key) in sections 2, 3, 4, 9, 10, 11 or 13;
   - Standards: a rules, bestPractice or repoDocs path tim lists for a changed file that section 16 leaves out;
   - Scope: a footprint widened for clean-up alone, against BOUNDED TIDY-UP above, or callers changed for a
     structural decision with no reason under Decisions;
   - House rules in the footprint: a breach BOUNDED TIDY-UP says the plan fixes, left unfixed. A breach outside the
     footprint is not a finding against this plan: put it in followUps, unless section 7 already lists it;
   - any decision that breaks a house rule, a best-practice guide or a repo doc.
3. ${PLAN_FINDING_KIND_RULE}
4. REPORT. approved: true only when you have no finding. Give each finding its kind, its section, what is wrong, the
   rule it breaks (path, line and the words quoted) and what must become true. Say what must become true, never the
   wording: the planner rewrites the plan.
Your review narrows nothing later. Every reviewer after you judges the code in full, whatever you approved.
Return the structured output only.`,
    think({ label, phase: 'Plan', schema: PLAN_REVIEW_SCHEMA })
  )

const sendsPlanBack = (review) => !review.approved || (review.findings ?? []).length > 0

const isStructural = (finding) => planFindingKindOf(finding) === 'structural'

const noPlanReview = (plan) => ({
  ...plan,
  ok: false,
  summary: 'the plan reviewer returned no result, and an unreviewed plan is never built'
})

const withFollowUps = (plan, reviews) => ({
  ...plan,
  followUps: [...new Set([...(plan.followUps ?? []), ...reviews.flatMap((review) => review.followUps ?? [])])]
})

const planFindingSummary = (finding) => `${finding.section}: ${finding.what}`

const refusedAfterSecondReview = (plan, second) => {
  const structural = (second.findings ?? []).filter(isStructural)
  return {
    ...plan,
    ok: false,
    summary: structural.length
      ? `the plan review sent the plan back twice with structural findings still open: ${structural.map(planFindingSummary).join(' | ')}`
      : `the plan review sent the plan back twice. Still open: ${second.summary}`
  }
}

const mustAddressSection = (findings) => `## Plan review: must address

The plan review left these findings open on the revised plan. Each is required work for the implementor, and the
consistency reviewer reports any the change does not address.

${findings.map(planReviewFindingText).join('\n')}`

const recordMustAddress = (id, findings) =>
  agent(
    `You are the PLAN REVIEW RECORDER for increment ${id}. You add one section to the end of the plan and change nothing
else. That is your whole job.
${BASE_GUARDRAILS}
1. Read ${PLANS}/${id}.md in full with the Read tool.
2. With the Edit tool, append the section below after the file's last line: old_string is the file's last few lines,
   enough to be unique, and new_string is those same lines, one blank line, then the section, word for word.
3. Read the file again.
Report written: true only when the file now ends with the section, word for word, and everything above it is
unchanged. Never reword, sort or shorten the section.

${mustAddressSection(findings)}`,
    light({ label: `${id} plan review record`, phase: 'Plan', schema: PLAN_REVIEW_RECORD_SCHEMA })
  )

const withMustAddress = async (id, plan, findings) => {
  log(`${id}: the revised plan has ${findings.length} detail finding(s) still open. Building it, with each as required work.`)
  const record = await recordMustAddress(id, findings)
  if (!record?.written) {
    log(
      `${id}: the "Plan review: must address" section was not written to the plan — ${record?.summary ?? 'the recorder died'}. The implementor and the consistency reviewer still get each finding.`
    )
  }
  return { ...plan, planReviewMustAddress: findings }
}

const reviewedPlan = async (id, branchedRepos = null) => {
  const plan = await planPassingLint(id, branchedRepos)
  if (!plan?.ok) return plan
  const review = await reviewPlan(id, { label: `${id} plan review` })
  if (!review) return noPlanReview(plan)
  if (!sendsPlanBack(review)) return withFollowUps(plan, [review])
  const findings = review.findings ?? []
  log(`${id}: the plan review sent the plan back with ${findings.length} finding(s). Sending the planner back once.`)
  const revised = await refusedUnlessClean(
    id,
    await planIncrement(id, branchedRepos, { label: `${id} revise plan`, reviewFindings: findings }),
    `${id} revise plan lint`
  )
  if (!revised?.ok) return revised
  const second = await reviewPlan(id, { label: `${id} plan review 2`, earlierFindings: findings })
  if (!second) return noPlanReview(revised)
  const reviewed = withFollowUps(revised, [review, second])
  if (!sendsPlanBack(second)) return reviewed
  const stillOpen = second.findings ?? []
  if (stillOpen.length === 0 || stillOpen.some(isStructural)) return refusedAfterSecondReview(reviewed, second)
  return withMustAddress(id, reviewed, stillOpen)
}

const ENVELOPE_REPO_SCHEMA = {
  type: 'object',
  required: ['key', 'path', 'github'],
  properties: {
    key: { type: 'string' },
    path: { type: ['string', 'null'] },
    github: { type: ['string', 'null'] },
    requireApproval: { type: 'boolean' }
  },
  additionalProperties: false
}

const PREFLIGHT_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary', 'envelopeRepos'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    envelopeRepos: {
      type: ['array', 'null'],
      items: ENVELOPE_REPO_SCHEMA,
      description: "The backlog envelope's repos exactly as the second command printed them, or null when it printed null"
    },
    branchWithoutPr: {
      type: 'array',
      items: { type: 'string' },
      description: `Branch lifecycle only: every repo checked out on ${BASE_BRANCH} with no open pull request for it`
    }
  },
  additionalProperties: false
}

const BRANCH_PR_STEP = IS_BRANCH
  ? `
3. \`tim workspace status --workspace ${TILDE} --json\`. For every entry of \`result\` whose \`branch\` is
   \`${BASE_BRANCH}\`, run \`gh pr list --repo DEFRA/<repo> --head ${BASE_BRANCH} --state open --json number\`, with
   <repo> the entry's \`repo\`. Put every repo whose list prints \`[]\` in branchWithoutPr, and [] when there is none.`
  : ''

const preflight = await agent(
  `Report whether this run's backlog exists and is readable, and which repos its envelope names. Run exactly these
commands, one Bash call each, and read their output:
1. \`jq -e '.increments | length' ${BACKLOG_TILDE}\`
2. \`jq -c '.repos | if . == null then null else to_entries | map({key, path: .value.path, github: .value.github, requireApproval: (.value.requireApproval // false)}) end' ${BACKLOG_TILDE}\`${BRANCH_PR_STEP}
If the first prints a number, return ok:true with that number in summary. If the file is missing or is not valid
JSON, return ok:false quoting the error. Copy the second command's output into envelopeRepos exactly as printed:
the list, every entry and field as it is, or null when it printed null. Do not compare it with anything. Do nothing
else. No Grep/Glob tools, tilde paths only.
${RUN_WITH_BASH}`,
  light({ label: 'preflight', phase: 'Baseline', schema: PREFLIGHT_SCHEMA })
)

if (!preflight || !preflight.ok) {
  throw new Error(
    `increment-build-loop: no readable backlog at ${BACKLOG} (workarea "${WORKAREA_REL}") — ${preflight ? preflight.summary : 'preflight agent failed'}`
  )
}

const envelopeRepoProblems = (envelopeRepos) => {
  const envelopeKeys = envelopeRepos.map((entry) => entry.key)
  const shared = envelopeRepos.filter((entry) => REPO_KEYS.includes(entry.key))
  return [
    ...REPO_KEYS.filter((key) => !envelopeKeys.includes(key)).map((key) => `args name "${key}", which the envelope does not`),
    ...envelopeKeys.filter((key) => !REPO_KEYS.includes(key)).map((key) => `the envelope names "${key}", which the args do not`),
    ...shared
      .filter((entry) => entry.path !== REPO_PATH[entry.key])
      .map((entry) => `"${entry.key}" is at ${JSON.stringify(entry.path)} in the envelope and "${REPO_PATH[entry.key]}" in the args`),
    ...shared
      .filter((entry) => entry.github && entry.github !== REPOS[entry.key].github)
      .map((entry) => `"${entry.key}" is ${entry.github} on GitHub in the envelope and ${REPOS[entry.key].github} in the args`),
    ...shared
      .filter((entry) => typeof entry.requireApproval === 'boolean')
      .filter((entry) => entry.requireApproval !== (REPOS[entry.key].requireApproval ?? false))
      .map(
        (entry) =>
          `"${entry.key}" ${entry.requireApproval ? 'needs' : 'does not need'} approval in the envelope and ${REPOS[entry.key].requireApproval ? 'needs' : 'does not need'} it in the args`
      )
  ]
}

const branchWithoutPr = IS_BRANCH ? (preflight.branchWithoutPr ?? []) : []
if (branchWithoutPr.length > 0) {
  throw new Error(
    `${WORKFLOW_NAME}: ${branchWithoutPr.join(', ')} ${branchWithoutPr.length === 1 ? 'is' : 'are'} on ${BASE_BRANCH} with no open pull request, so CI publishes no branch image there and its E2E runs that repo's :latest instead. Open a draft pull request for ${BASE_BRANCH} in each, then launch again`
  )
}

const ENVELOPE_REPOS = preflight.envelopeRepos ?? null
if (ENVELOPE_REPOS === null) {
  log(`${WORKFLOW_NAME}: the backlog envelope names no repos, so the args' repos cannot be checked against it. The gate needs them there`)
} else {
  const problems = envelopeRepoProblems(ENVELOPE_REPOS)
  if (problems.length > 0) {
    throw new Error(
      `${WORKFLOW_NAME}: config.repos does not match the repos the backlog envelope at ${BACKLOG} names — ${problems.join('; ')}. Copy the envelope's repos into args in full`
    )
  }
}

const NEXT_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    next: { type: 'string', description: 'The increment id tim returned. Leave it out when result.next was null' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const deriveNext = () =>
  agent(
    `Report the next buildable increment in this backlog. Run exactly one command and read its output:
\`tim backlog next ${WORKAREA_REL} --workspace ${TILDE} --json\`
It prints one JSON line shaped \`{ok, schema_version, tim_version, result: {path, next}, errors, metadata}\`.
Read \`result.next\` and nothing else:
- a string → that is the id. Return ok:true with it VERBATIM in \`next\`.
- \`null\` → nothing is buildable. Return ok:true, leave \`next\` out, and say so in summary.
If the command exits non-zero or prints no JSON, return ok:false quoting exactly what it said. Do NOT choose an
increment yourself, do NOT read the backlog, and do NOT judge whether the one tim named looks ready: buildability
is status and dependencies, which tim has already applied.
One Bash call, no Grep/Glob tools, tilde paths only.
${RUN_WITH_BASH}`,
    light({ label: 'derive next', phase: 'Derive', schema: NEXT_SCHEMA })
  )

const START_SCHEMA = {
  type: 'object',
  required: ['exitCode', 'stdout'],
  properties: {
    exitCode: { type: 'number', description: 'The exit code the command finished with' },
    stdout: { type: 'string', description: 'Everything the command printed, word for word: one JSON line' }
  },
  additionalProperties: false
}

const startCommand = (explicitId, lastId) =>
  [
    `tim build start ${WORKAREA_REL}`,
    explicitId ? `--id ${explicitId}` : null,
    lastId ? `--last ${lastId}` : null,
    `--base ${BASE_BRANCH}`,
    `--jira-project ${JIRA_PROJECT}`,
    `--epic ${EPIC}`,
    `--in-dev-status "${STATUS_IN_DEV}"`,
    `--done-status "${STATUS_DONE}"`,
    `--board ${JIRA_BOARD}`,
    `--repos ${REPO_KEYS.join(',')}`,
    `--workspace ${TILDE}`,
    '--json'
  ]
    .filter(Boolean)
    .join(' ')

const startIncrement = (explicitId, lastId) =>
  agent(
    `You are the START STAGE${explicitId ? ` for increment ${explicitId}` : ''}. Run exactly one command and report what it
printed. That is your whole job.
${guardrails()}
Run it ONCE, in the FOREGROUND with the Bash tool's \`timeout\` set to 600000:
\`${startCommand(explicitId, lastId)}\`
Report its exit code, and in \`stdout\` everything it printed, word for word: one JSON line. Never summarise it, correct
it, read anything into it or run it again, whatever it says, and run nothing else. The loop reads the JSON itself.`,
    light({ label: explicitId ? `${explicitId} start` : 'start next', phase: 'Start', schema: START_SCHEMA })
  )

const lastJsonLine = (text) =>
  String(text ?? '')
    .trim()
    .split('\n')
    .reverse()
    .find((line) => line.trim().startsWith('{'))

const startReport = (answer) => {
  if (!answer) return { failedStep: 'derive', reason: 'the start agent died' }
  const line = lastJsonLine(answer.stdout)
  let envelope = null
  try {
    envelope = line ? JSON.parse(line) : null
  } catch {
    envelope = null
  }
  if (!envelope) {
    return {
      failedStep: 'derive',
      reason: `tim build start printed no JSON (exit ${answer.exitCode}): ${String(answer.stdout ?? '').slice(0, 500)}`
    }
  }
  if (!envelope.result) {
    return { failedStep: 'derive', reason: envelope.errors?.[0]?.message ?? 'tim build start printed no result' }
  }
  return envelope.result
}

const repoPathList = (keys) => keys.map((key) => `${key} \`${repoTilde(key)}\``).join(', ')
const protectedBranchNames = PROTECTED_BRANCHES.map((name) => `\`${name}\``).join(' or ')
const MERGE_HEAD_CHECK = `\`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet MERGE_HEAD\``
const UNRESOLVED_CHECK = `\`git -C ${TILDE}/<repoPath> diff --name-only --diff-filter=U\``

const BRANCH_ROW_SCHEMA = {
  type: 'object',
  required: ['ok', 'repos', 'merge', 'resumeAt', 'summary'],
  properties: {
    ok: {
      type: 'boolean',
      description: 'The envelope names exactly the configured repos, and every one is on the branch, clean, not mid-merge and fast-forwarded to its origin'
    },
    repos: {
      type: 'array',
      items: { type: 'string' },
      description: "The row's repos exactly as written, [] included. Every configured repo only when the row has no repos field"
    },
    merge: {
      type: 'array',
      description: "The row's merge field, one entry per key in the order written. [] when it is null or absent",
      items: {
        type: 'object',
        required: ['repo', 'ref'],
        properties: { repo: { type: 'string' }, ref: { type: 'string' } },
        additionalProperties: false
      }
    },
    gatePhases: {
      type: 'array',
      items: { type: 'string' },
      description: "The row's gatePhases verbatim. Leave it out when the row's is null or absent"
    },
    awaitCi: { type: 'boolean', description: "The row's awaitCi verbatim. Leave it out when the row's is null or absent" },
    heads: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'head'],
        properties: { repo: { type: 'string' }, head: { type: 'string' } },
        additionalProperties: false
      }
    },
    resumeAt: { type: 'string', enum: ['build', 'pr', 'ci'] },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const assertBranch = (id) =>
  agent(
    `You are the BRANCH STAGE for increment ${id}. This run builds straight onto \`${BASE_BRANCH}\`, which already exists in
every backlog repo. You CREATE NOTHING: no branch, no commit, no pull request. You check, fast-forward and report.
${guardrails()}
${REPO_RULE}
STEP 1 — THE ROW AND THE ENVELOPE. Two Bash calls:
\`jq -c '.increments[] | select(.id=="${id}") | {repos, merge, gatePhases, awaitCi, commit, prs}' ${BACKLOG_TILDE}\`
\`jq -c '.repos | keys' ${BACKLOG_TILDE}\`
The envelope's keys must be exactly ${[...REPO_KEYS].sort().join(', ')}: the repos this run was configured with. Any
difference is ok:false naming it, because the gate reads the envelope and this run reads its args.

STEP 2 — EVERY CONFIGURED REPO, not only the row's: the gate and the end-to-end rung build from all of them.
For EACH of ${repoPathList(REPO_KEYS)}:
1. ${HEAD_BRANCH_CHECK} must print \`${BASE_BRANCH}\`. Anything else, ${protectedBranchNames} above all, is ok:false naming the
   repo and the branch it is on. Never check out, never create a branch.
2. \`git -C ${TILDE}/<repoPath> status --short\` must print nothing, and ${MERGE_HEAD_CHECK} must print
   nothing. A dirty tree or a merge left in progress belongs to an earlier attempt: ok:false naming the repo and what you
   saw. Never stash, reset, abort or clean it.
3. \`git -C ${TILDE}/<repoPath> fetch origin\`
4. \`git -C ${TILDE}/<repoPath> merge --ff-only origin/${BASE_BRANCH}\` brings in anything already pushed. "Already up to
   date" is fine, and so is a local branch AHEAD of its origin: that is a push that failed, and the pull request stage
   pushes it. A refusal means the branch has diverged from its origin: ok:false naming the repo, because it needs a human.
5. \`git -C ${TILDE}/<repoPath> rev-parse --short HEAD\` into heads[].

STEP 3 — REPORT THE ROW'S FIELDS, copied from STEP 1, never interpreted:
- repos: the row's \`repos\` exactly as written, [] included. Only where the row has no \`repos\` (null or absent), every
  configured repo: ${REPO_KEYS.join(', ')}.
- merge: one {repo, ref} for each key of the row's \`merge\` object, in the order written. [] when it is null or absent.
- gatePhases: verbatim when it is a list, [] included. Leave it out when it is null or absent.
- awaitCi: verbatim when it is true or false. Leave it out when it is null or absent.
- resumeAt, from \`commit\` and \`prs\` alone. \`prs\` non-empty → "ci". Otherwise \`commit\` set → "pr". Otherwise "build".
Report ok:true only when STEP 1's keys matched and every repo passed STEP 2.
Return the structured output only.`,
    light({ label: `${id} branch`, phase: 'Branch', schema: BRANCH_ROW_SCHEMA })
  )

const duplicatesIn = (list) => list.filter((item, index) => list.indexOf(item) !== index)

const rowFieldProblems = ({ repos: rowRepos, merge = [], gatePhases }) => {
  const mergeRepos = merge.map((entry) => entry.repo)
  return [
    ...rowRepos.filter((key) => !REPO_KEYS.includes(key)).map((key) => `repos names "${key}", which is not a configured repo`),
    ...duplicatesIn(rowRepos).map((key) => `repos names "${key}" twice`),
    ...mergeRepos.filter((key) => !rowRepos.includes(key)).map((key) => `merge names "${key}", which is not in the row's repos`),
    ...merge.filter((entry) => !entry.ref?.trim()).map((entry) => `merge gives "${entry.repo}" no ref`),
    ...(gatePhases ?? []).filter((name) => !GATE_PHASES.includes(name)).map((name) => `gatePhases names "${name}"; use unit, fit and e2e`),
    ...duplicatesIn(gatePhases ?? []).map((name) => `gatePhases names "${name}" twice`)
  ]
}

const MERGE_START_SCHEMA = {
  type: 'object',
  required: ['ok', 'merges', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'Every merge started, or the ref was already in the branch' },
    merges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'ref', 'alreadyMerged', 'conflicted'],
        properties: {
          repo: { type: 'string' },
          ref: { type: 'string' },
          mergeHead: { type: 'string', description: 'What MERGE_HEAD points at. Left out when alreadyMerged' },
          alreadyMerged: { type: 'boolean', description: 'true when git said "Already up to date" and started no merge' },
          conflicted: { type: 'array', items: { type: 'string' }, description: 'Every path git left unmerged' }
        },
        additionalProperties: false
      }
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const startMerges = (id, merges) =>
  agent(
    `You are the MERGE STAGE for increment ${id}. You START the merges the row asks for, and stop there: the implementor
resolves them and the land stage commits them. You resolve nothing and commit nothing.
${guardrails()}
THE MERGES, each into \`${BASE_BRANCH}\`:
${merges.map((entry) => `- ${entry.repo} (\`${TILDE}/${REPO_PATH[entry.repo]}\`): merge \`${entry.ref}\``).join('\n')}
For EACH, in that order:
1. ${HEAD_BRANCH_CHECK} must print \`${BASE_BRANCH}\`, and \`git -C ${TILDE}/<repoPath> status --short\` must print
   nothing. Otherwise ok:false naming the repo, and start nothing in it.
2. \`git -C ${TILDE}/<repoPath> fetch origin\`
3. \`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet <ref>\` must print a SHA. Otherwise ok:false naming the ref.
4. \`git -C ${TILDE}/<repoPath> merge --no-ff --no-commit <ref>\`
   - It exits 1 and names conflicts → expected. The merge is in progress; carry on.
   - It says "Already up to date" → the ref is already in the branch and no merge started. Set alreadyMerged:true.
   - Anything else (it refuses to start, unrelated histories) → ok:false quoting what it said.
   Never add --squash, never add --ff-only, and never let it commit.
5. Unless alreadyMerged: ${MERGE_HEAD_CHECK} must print a SHA; put it in mergeHead.
6. ${UNRESOLVED_CHECK} into conflicted[]. [] is a clean merge.
Never resolve a conflict, never \`git add\`, never commit, never \`merge --abort\`, \`--continue\` or \`reset\`. If a merge
went wrong, report it: the loop's preserve step saves the attempt and aborts the merge.
Return the structured output only.`,
    light({ label: `${id} merge start`, phase: 'Implement', schema: MERGE_START_SCHEMA })
  )

const mergeNoteOf = (started) =>
  started.length === 0
    ? ''
    : `
A MERGE IS IN PROGRESS, by design. The loop started it; the land stage commits it as a two-parent merge commit:
${started
  .map(
    (entry) =>
      `- ${entry.repo} (\`${TILDE}/${REPO_PATH[entry.repo]}\`): \`${entry.ref}\` into \`${BASE_BRANCH}\`, ${entry.conflicted.length} conflicted path(s) when it started`
  )
  .join('\n')}
\`git -C <repoPath> diff --staged\` shows the merge result against the PRE-MERGE HEAD, so it carries every change the
merged ref brings as well as each resolution. \`git -C <repoPath> diff --staged <ref> -- <path>\` shows what the result
keeps over the merged ref. \`git -C <repoPath> diff --name-only --diff-filter=U\` lists the paths still unresolved.
The changes the merged ref brings were reviewed where they were written. What this increment owns is each RESOLUTION:
how a conflicted or clean-but-wrong file combines the two sides, judged against the plan and any resolutions file the
row's notes name. Never commit the merge, never \`git merge --abort\` or \`--continue\`, never \`reset\`.`

const implementMergeTask = (started, skipped) => {
  const skippedLine = skipped.length
    ? `\nALREADY MERGED, so no merge started: ${skipped.map((entry) => `${entry.repo} (${entry.ref})`).join(', ')}. Say so in notes.`
    : ''
  if (started.length === 0) return skippedLine
  return `${mergeNoteOf(started)}
THE MERGE IS YOURS TO RESOLVE. Resolve every conflicted path, and every file that merged cleanly but is wrong, exactly as
the plan says, then \`git -C <repoPath> add\` each one. Before you report, ${UNRESOLVED_CHECK} must print nothing in
every merging repo. List every path you resolved or edited in changedFiles.${skippedLine}`
}

const WORKSPACE_ONLY_TASK = `
THIS ROW CHANGES NO BACKLOG REPO. Its output is in the workspace repo, \`${TILDE}\`, where the plan puts it. Leave every
edit there in the working tree: never \`git add\`, commit or stash anything in the workspace. The orchestrator commits it.
Report each file as \`${WORKSPACE_KEY}:<path relative to the workspace root>\`.`

const WORKSPACE_REVIEW_LINE = `
This row changes no backlog repo: the whole change is in the workspace repo, left unstaged. See it with
\`git -C ${TILDE} diff HEAD -- <path>\` for each changed file, and Read any new, untracked file in full.`

const NO_GATE_STEP = "   None: this row's gatePhases is [], so the gate runs nothing for it. Report green:true with no rungs."

const baselineGateStep = (phases, logs) => {
  if (phases.length === 0) return `3. THE GATE, for the phases this row owes.\n${NO_GATE_STEP}`
  if (owesWholeGate(phases)) {
    return `3. THE GATE, for the phases this row owes — every one, so it is ONE command, which runs unit, FIT and E2E
   side by side. Run it, and nothing else:
${gateCommandList([WHOLE_GATE], logs)}
   Its \`result.rungs[]\` holds every rung of every phase.`
  }
  return `3. THE GATE, for the phases this row owes. Run these, in this order, one Bash call each, and nothing else:
${gateCommandList(phases, logs)}
   Stop after the first one that comes back red: nothing is built on a red baseline, so a later phase proves nothing.`
}

const ladderGateStep = (phases, logs) => {
  if (phases.length === 0) return `1. THE GATE.\n${NO_GATE_STEP}`
  if (owesWholeGate(phases)) {
    return `1. THE GATE. ONE command — the same one the baseline ran, into its own folder — which runs unit, FIT and E2E
   side by side:
${gateCommandList([WHOLE_GATE], logs)}
   Its \`result.rungs[]\` holds every rung of every phase, red or green: you have the whole picture before you repair
   anything.`
  }
  return `1. THE GATE. These, in this order, one Bash call each — the same commands the baseline ran, into their own folder:
${gateCommandList(phases, logs)}
   Run every one, even after a red one, so you have the whole picture before you repair anything.`
}

const branchBaselinePrompt = (id, phases) => `You are the BASELINE GUARD for increment ${id}. Establish that the tree is clean, on the right branch and
green BEFORE any edit, so a failure later in this increment is unambiguously ours. You run fixed commands and
report what they printed. You choose no test, script or suite: \`tim build gate\` does that.
${guardrails()}
${REPO_RULE}
${GATE_RULE}
TASK:
1. THE BRANCH. Every configured repo, ${repoPathList(REPO_KEYS)}, must be on \`${BASE_BRANCH}\`:
   ${HEAD_BRANCH_CHECK}. Anything else, ${protectedBranchNames} above all, is ok:false naming the repo. Do not switch
   branches.
2. CLEAN TREES. For each of them, \`git -C ${TILDE}/<repoPath> status --short\` must print nothing and ${MERGE_HEAD_CHECK}
   must print nothing. If any is dirty or mid-merge, stop and report ok:false.
   ${SPEC_RULE} It too must be clean before the increment starts: the land stage commits everything under it as
   this increment's, so anything already there would go in with it. If it is dirty, report ok:false naming the files.
${baselineGateStep(phases, gateLogs(id, 'baseline'))}
4. REPORT what tim printed, not your reading of it. rungs[]: every rung from every phase, each with the \`repo\`,
   \`name\`, \`phase\`, \`ok\`, \`log\` and \`reason\` tim gave it. green:true only if every phase that had rungs came back
   green. ok:true only if steps 1 and 2 passed. Put each red rung's reason in your summary, word for word.
Return the structured output only.`

const BRANCH_LAND_SCHEMA = {
  type: 'object',
  required: ['landed', 'pushed', 'summary'],
  properties: {
    landed: { type: 'boolean', description: 'Every repo with changes is committed, or no backlog repo had any' },
    pushed: { type: 'boolean', description: 'Every commit you made is pushed to the branch. true when you made none' },
    commit: { type: 'string', description: 'The SHA of each commit you made, space separated in the order of the configured repos' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const branchLandPrompt = (id, behaviourChanges, started) => `Increment ${id} is implemented, reviewed, judged and verified green on \`${BASE_BRANCH}\`. COMMIT IT AND PUSH IT.
${guardrails()}
${REPO_RULE}
${PUSH_RULE}
${SET_ROW_RULE}${mergeNoteOf(started)}
TASK:
1. ${changedReposRule(id, 'land', BASE_BRANCH)} Also act on every repo whose \`merging\` is true, even where \`dirty\` is
   false. The increment's title, for the commit subject:
   \`jq -r '.increments[] | select(.id=="${id}") | .title' ${BACKLOG_TILDE}\`.
2. Every repo you are about to commit in must have \`onBranch\` true in that file. Where it is false, stop:
   landed:false naming the repo and its \`branch\`, and change nothing in it.
3. In a repo whose \`merging\` is true, \`unresolved\` must be empty. Otherwise landed:false naming the paths: a merge is
   never committed with a path unresolved.
4. What is staged and untracked is that repo's \`changed\` list. Stage anything the increment produced that is still
   untracked (\`??\`), but NOTHING under logs/, no coverage output, no test-results/, no .playwright artefacts.
5. Commit, one commit per repo, each with the same message: \`<type>(${SCOPE}): <increment title>\`, where the type is
   \`feat\` or \`fix\` when the behaviour changes below are not empty, otherwise the type the increment's \`kind\`
   implies; and a body saying what changed and naming the increment id (this run has no ticket). No trailer.
   Behaviour changes, from the plan: ${behaviourChanges?.length ? behaviourChanges.map((change) => `\n   - ${change}`).join('') : 'none'}
   In a repo MID-MERGE that same \`git commit\` concludes the merge, and git records the merged ref as the second parent.
   Never \`--squash\`, never \`merge --continue\`, never a commit that drops the second parent. Confirm it with
   \`git -C ${TILDE}/<repoPath> rev-list --parents -n 1 HEAD\`: it must print three SHAs, the merge and its two parents.
5a. ${SPEC_RULE} If it has changes, they are part of this increment: commit them in the workspace with the same
   subject and trailer, and nothing else from the workspace. Two commands, the pathspec on both:
   \`git -C ${TILDE} add -- openspec/\` then \`git -C ${TILDE} commit -m "<message>" -- openspec/\`.
   Do NOT push the workspace. Name the spec commit in your summary, separately from the repo commits.
   Anything else changed in the workspace, under workareas/ above all, is the orchestrator's to commit: leave it exactly
   as it is.
6. Record the commit BEFORE you push: \`${setRow(id, '--commit "<sha, or several in the order of the configured repos, space separated>"')}\`.
   Leave the status alone.
7. Push every repo you committed in, by HOW TO PUSH above:
   \`git -C ${TILDE}/<repoPath> push origin refs/heads/${BASE_BRANCH}:refs/heads/${BASE_BRANCH}\`. A rejected push is
   pushed:false, saying which repo and what git said. Never \`--force\`.${testsImageFirstRule(id, BASE_BRANCH)}
8. When no backlog repo had changes and none was mid-merge, commit nothing and push nothing: landed:true, pushed:true,
   no commit, and say so in your summary.
Report landed, pushed, the commit SHA or SHAs, and a summary.
Return the structured output only.`

const BRANCH_PR_SCHEMA = {
  type: 'object',
  required: ['ok', 'prs', 'missing', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    prs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'url'],
        properties: { repo: { type: 'string' }, url: { type: 'string' }, number: { type: 'number' } },
        additionalProperties: false
      }
    },
    missing: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every repo with no open pull request for the branch'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const findPrsPrompt = (id, rowRepos) => `You are the PULL REQUEST STAGE for increment ${id} on \`${BASE_BRANCH}\`. You FIND the open pull request for the
branch in each repo; you never create, edit, retitle, un-draft, close, approve or merge one. Their titles, bodies and
draft state are a human's.
${guardrails()}
${PUSH_RULE}
REPOS: ${repoPathList(rowRepos)}. GitHub repos: ${rowRepos.map((key) => `${key}=${GH_REPO[key]}`).join(', ')}.
For EACH repo:
1. ${HEAD_BRANCH_CHECK} must print \`${BASE_BRANCH}\`. Otherwise ok:false naming the repo.
2. \`git -C ${TILDE}/<repoPath> fetch origin\`, then \`git -C ${TILDE}/<repoPath> rev-list --count origin/${BASE_BRANCH}..HEAD\`.
   Anything above 0 is a commit a stopped run never pushed: push it by HOW TO PUSH above. A rejected push is ok:false.
3. \`gh pr list --repo <ghRepo> --head ${BASE_BRANCH} --state open --json number,url,isDraft,title\`
   - exactly one → that is the repo's PR. Persist it at once: \`${setRow(id, `--pr '{"repo":"<repo>","url":"<url>","number":<n>}'`)}\`.
   - none → put the repo in missing[] and ok:false. Do NOT create one.
   - more than one → ok:false naming them all.
Report prs[] in the same order. ok:true only when every repo has exactly one open PR.
Return the structured output only.`

const BRANCH_CI_SCHEMA = {
  ...CI_SCHEMA,
  properties: {
    ...CI_SCHEMA.properties,
    stopReason: {
      type: 'string',
      enum: ['none', 'pr-red', 'pr-conflict', 'mergeability-unknown', 'no-checks'],
      description: 'WHICH stop condition fired, as a fixed value the caller branches on. "none" when every PR is green'
    }
  }
}

const branchWatchPrompt = (id, prList) => `You are the CI WATCHER for increment ${id} on \`${BASE_BRANCH}\`. WAIT for the checks on every PR below to
resolve, and report what they did. You change no code, you merge nothing, and you edit no PR.
${guardrails()}
THE PULL REQUESTS:
${prList}

${PR_CONFLICT_STEP} A PR whose \`mergeable\` stays UNKNOWN after 10 reads: state "unresolved", a line in
failures[], stopReason "mergeability-unknown", and do not watch its checks.

Then, for EACH pr, in the order listed:
1. BLOCK on its checks. One Bash call, with the tool's \`timeout\` parameter set to 600000:
   \`${TILDE}/tools/github-actions/wait-for-pr-checks.sh <owner/name> <number> 570 > ${WORKAREA_TILDE}/logs/${id}-ci-<repo>.log 2>&1\`
   Read that log ONCE. Exit 0 → green. Exit 1 → RED: one line per failing check in failures[], naming the check and
   what it said. Exit 2 → not resolved yet: run it again, at most ${CI_WATCH_WINDOWS} times per PR in all, then state
   "unresolved", which counts as RED. Exit 4 → no checks at all: state "unresolved", blocked "no checks on <repo>",
   stopReason "no-checks". An absence of evidence is not green.
2. For a RED check, name the failing job precisely enough for a fixer to act. Get the detail with
   \`gh run view <run-id> --repo <ghRepo> --log-failed\`, redirected to a log you read once. Where the failing
   job is Playwright, say so: its real evidence is \`test-results/*/error-context.md\`, not the run output.

\`blocked\` is ONLY for something a code fix in this row cannot address: a conflict with the base, no checks, \`gh\`
refused, the PR is gone. Setting it stops the run outright. A failing test is NOT blocked: it is a red check, and a
fixer gets it. green:true ONLY if EVERY pr resolved green. stopReason "pr-red" for an ordinary red.
Return the structured output only.`

const branchCiFixPrompt = (id, attempt, prList, seen, plan) => `You are the CI FIXER for increment ${id}, attempt ${attempt} of ${CI_FIX_ATTEMPTS}.
CI is red on \`${BASE_BRANCH}\`. Fix the CODE, commit onto \`${BASE_BRANCH}\` and push. You do not merge, and you
never create, edit or un-draft a pull request.
${guardrails()}
${HOUSE_RULES_TO_WRITE}
${ciFixStandards(plan)}
${PUSH_RULE}${testsImageFirstRule(id, BASE_BRANCH)}
${readIncrement(id)}
THE PULL REQUESTS:
${prList}
WHAT THE WATCHER SAW:
${seen}

TASK:
1. READ THE ACTUAL FAILURE, not a summary of it. \`gh pr checks <url> --repo <ghRepo>\` names the failing run;
   \`gh run view <run-id> --repo <ghRepo> --log-failed > ${WORKAREA_TILDE}/logs/${id}-ci-fail-${attempt}.log 2>&1\`
   gives you the log. Read that file ONCE.
   **For a Playwright failure the evidence is \`test-results/*/error-context.md\` in the repo, NOT the tail of the
   run log.** Go and read those files.
2. KNOW WHAT A RE-RUN CAN AND CANNOT DO. Re-running a workflow does not refresh a check that another job posted: only a
   push that republishes it does. A \`workflow_run\` job runs the copy of its workflow on the default branch (main),
   never the branch's, so a fix to that workflow file on \`${BASE_BRANCH}\` changes nothing until it reaches main.
3. Fix the code. Never weaken, skip or delete a test to get green. Never disable a check. If the failure is a
   known-flaky journey spec with a transient 500 in beforeEach, say so explicitly and re-run rather than editing.
4. Prove it locally with the narrowest suite that covers the failure, to a log under ${WORKAREA_TILDE}/logs/,
   read once.
5. Commit on \`${BASE_BRANCH}\` with a conventional message naming increment ${id}, then push by HOW TO PUSH above.
   ${HEAD_BRANCH_CHECK} must print \`${BASE_BRANCH}\` first. Never check out another branch, never create one.
6. A fix that belongs in a repo with no PR in the list above is outside what this run may do: report ok:false naming
   the repo. Never open a pull request.
7. If you cannot work out what is failing, or the fix would need work outside this increment's scope, report
   ok:false saying exactly that. An honest refusal is worth more than a speculative push.
Return the structured output only.`

const markDoneOnBranch = (id, commit) =>
  agent(
    `Increment ${id} is built on \`${BASE_BRANCH}\` and pushed. Mark it done in the backlog. That is your whole job: this
run has no ticket, and nothing is merged.
${guardrails()}
${SET_ROW_RULE}
Run exactly one command: \`${setRow(id, commit ? `--status done --commit "${commit}"` : '--status done')}\`
It leaves \`branch\`, \`commit\` and \`prs\` in place: they are the record of how it got there.
Report ok:true only when tim exited 0 and its JSON reports ok:true.
Return the structured output only.`,
    light({ label: `${id} done`, phase: 'Done', schema: incrementSchema })
  )

const WORKSPACE_RETURN_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'The workspace repo is on the base branch, at origin\'s tip' },
    head: { type: 'string', description: 'What `rev-parse --short HEAD` printed at the end' },
    summary: { type: 'string', description: "git's refusal word for word when ok is false; otherwise what you did" }
  },
  additionalProperties: false
}

const workspaceStaysNote = (branch) =>
  `The workspace repo stays on ${branch}, carrying this run's uncommitted programme files: put it back with \`git -C ${TILDE} switch ${BASE_BRANCH}\` once the increment is settled`

const returnWorkspaceToBase = async (id, branch) => {
  const back = await agent(
    `Increment ${id} is merged. Put the workspace repo back on \`${BASE_BRANCH}\` and bring it up to date, so the next
increment runs on the merged factory: tim, gates.json and the stack scripts. That is your whole job.
${BASE_GUARDRAILS}
The workspace repo carries uncommitted files across the switch — this run's backlog, plans and logs, and somebody's work
in progress. They travel with it. Never stash, reset, restore, clean, add or commit anything, and never delete
\`${branch}\`. Run exactly these, one Bash call each, in order, and stop at the first that fails:
1. \`git -C ${TILDE} switch ${BASE_BRANCH}\`
2. \`git -C ${TILDE} pull --ff-only origin ${BASE_BRANCH}\` — "Already up to date" is fine.
3. \`git -C ${TILDE} rev-parse --abbrev-ref HEAD\` must print \`${BASE_BRANCH}\`.
4. \`git -C ${TILDE} rev-parse --short HEAD\` into head.
A step that fails — git refusing because a carried file would be overwritten, say — is ok:false with git's message word
for word as summary. Change nothing to work round it: a person decides.
Return the structured output only.`,
    light({ label: `${id} workspace to base`, phase: 'Done', schema: WORKSPACE_RETURN_SCHEMA })
  )
  if (back?.ok) {
    workspaceLeftOn = null
    log(`${id}: the workspace repo is back on ${BASE_BRANCH} at ${back.head ?? 'its tip'}; the next increment runs on the merged factory`)
    return { ok: true }
  }
  const detail = `${id}: the workspace repo did not go back to ${BASE_BRANCH} — ${back?.summary ?? 'the agent died'}`
  log(detail)
  return { ok: false, detail }
}

const themeFilter = (id, builtIds) =>
  `(.theme // null) as $split | ([.increments[] | select(.id=="${id}") | (.theme // $split)] | first) as $theme | ${JSON.stringify(builtIds)} as $built | ${JSON.stringify(REPO_KEYS)} as $all | [.increments[] | select($theme != null and (.theme // $split) == $theme)] as $rows | {theme: $theme, rows: ($rows | length), todo: ([$rows[] | select(.status == "todo")] | length), built: [$rows[] | .id | select(IN($built[]))], otherRepos: ([$rows[] | select((.id | IN($built[])) | not) | (.repos // $all)[]] | unique)}`

const readTheme = (id, builtIds) =>
  agent(
    `You are the THEME READER for increment ${id}. Run exactly one command and report what it printed. That is your
whole job.
${BASE_GUARDRAILS}
\`jq -c '${themeFilter(id, builtIds)}' ${BACKLOG_TILDE}\`
Report its exit code, and in \`stdout\` everything it printed, word for word: one short JSON line. Never summarise or
correct it, and run nothing else. The loop reads the JSON itself.`,
    light({ label: `${id} theme`, phase: 'Done', schema: COMMAND_OUTPUT_SCHEMA })
  )

const isThemeSummary = (parsed) =>
  parsed.theme === null ||
  (typeof parsed.todo === 'number' && Array.isArray(parsed.built) && Array.isArray(parsed.otherRepos))

const themeStatusOf = (answer) => {
  const line = lastJsonLine(answer?.stdout)
  try {
    const parsed = line ? JSON.parse(line) : null
    return parsed && 'theme' in parsed && isThemeSummary(parsed) ? parsed : null
  } catch {
    return null
  }
}

const readThemeStatus = async (id, builtIds) =>
  themeStatusOf(await readTheme(id, builtIds)) ?? themeStatusOf(await readTheme(id, builtIds))

const repoSpecPrefixes = (key) => SPEC_PREFIXES_BY_REPO_PATH[REPO_PATH[key]] ?? []

const SPEC_CHECK_SCHEMA = {
  type: 'object',
  required: ['prefixes', 'summary'],
  properties: {
    prefixes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['prefix', 'present'],
        properties: {
          prefix: { type: 'string' },
          present: { type: 'boolean', description: 'openspec/specs/<prefix> exists' },
          lintOk: { type: 'boolean', description: 'tim spec lint exited 0 with no findings' },
          lintFindings: { type: 'number' },
          noneCount: { type: 'number', description: "tim spec gaps' result.noneCount" },
          partialCount: { type: 'number', description: "tim spec gaps' result.partialCount" },
          noneScenarios: { type: 'array', items: { type: 'string' }, description: 'The id of every row tim spec gaps --none printed' },
          lintLog: { type: 'string' },
          gapsLog: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const specCheckLog = (theme, prefix, kind) =>
  `${WORKAREA_TILDE}/logs/spec-check-${theme.replace(/[^A-Za-z0-9-]/g, '-')}-${prefix}-${kind}.json`

const checkThemeSpec = (id, theme, prefixes) =>
  agent(
    `You are the SPEC CHECK for theme \`${theme}\`: its last row to build, ${id}, has landed. You run fixed commands and
report what they printed. You change nothing: no spec, no test, no commit.
${BASE_GUARDRAILS}
For EACH of these prefixes, in this order — ${prefixes.map((prefix) => `\`${prefix}\``).join(', ')} — one Bash call per command:
1. \`ls ${TILDE}/openspec/specs/<prefix>\`. When it fails, the prefix has no spec yet: report present:false and go on to
   the next prefix. tim refuses a prefix with no spec, so run nothing more for it.
2. \`tim spec lint --capability <prefix> --workspace ${TILDE} --json > ${specCheckLog(theme, '<prefix>', 'lint')} 2>&1\`.
   Read that file once. lintOk:true only when the command exited 0 and \`result.findings\` is empty; lintFindings is the
   length of \`result.findings\`. A non-zero exit with findings is an ordinary answer: report it as it is.
3. \`tim spec gaps --none --capability <prefix> --workspace ${TILDE} --json > ${specCheckLog(theme, '<prefix>', 'gaps')} 2>&1\`.
   Read it once: noneCount and partialCount from \`result\`, and noneScenarios as the \`id\` of every row in \`result.rows\`.
Report one entry per prefix, with lintLog and gapsLog the two files you wrote. Never fix a finding, write a test or edit
\`openspec/\`: the loop decides what happens next.
Return the structured output only.`,
    light({ label: `spec check:${theme}`, phase: 'Done', schema: SPEC_CHECK_SCHEMA })
  )

const missingSpecProblem = (entry, written) =>
  written.includes(entry.prefix)
    ? [`a row reported writing the spec under ${entry.prefix}/, but openspec/specs/${entry.prefix} does not exist`]
    : []

const lintProblem = (entry) =>
  entry.lintOk === true
    ? []
    : [`tim spec lint found ${entry.lintFindings ?? 'an unreported number of'} finding(s) under ${entry.prefix}/ (${entry.lintLog ?? 'no log named'})`]

const gapsProblem = (entry) => {
  if (typeof entry.noneCount !== 'number') return [`no gap count came back for ${entry.prefix}/`]
  if (entry.noneCount === 0) return []
  const ids = (entry.noneScenarios ?? []).join(', ') || 'ids not reported'
  return [`${entry.noneCount} scenario(s) under ${entry.prefix}/ that no test proves: ${ids} (${entry.gapsLog ?? 'no log named'})`]
}

const prefixProblems = (entry, written) =>
  entry.present ? [...lintProblem(entry), ...gapsProblem(entry)] : missingSpecProblem(entry, written)

const specCheckProblems = (answer, prefixes, written) => {
  if (!answer) return ['the spec check agent died, so nothing checked the spec']
  const checked = (answer.prefixes ?? []).filter((entry) => prefixes.includes(entry.prefix))
  const unchecked = prefixes
    .filter((prefix) => !checked.some((entry) => entry.prefix === prefix))
    .map((prefix) => `${prefix}/ was not checked`)
  return [...unchecked, ...checked.flatMap((entry) => prefixProblems(entry, written))]
}

const describeSpecPrefix = (entry) =>
  entry.present
    ? `${entry.prefix}/ lint clean, ${entry.noneCount} unproven, ${entry.partialCount ?? 'unreported'} partly proven`
    : `${entry.prefix}/ has no spec yet`

const catchUpAdvice = (prefixes) => prefixes.map((prefix) => `"catch-up and cover ${SPEC_SET_NAMES[prefix]}"`).join(', ')

const landedSpecPrefixes = new Map()

const PREFIX_SOURCES = ['planned', 'written', 'repo reach']

const prefixesBySource = (status) => {
  const ofBuiltRows = (kind) => status.built.flatMap((rowId) => landedSpecPrefixes.get(rowId)?.[kind] ?? [])
  return {
    planned: ofBuiltRows('planned'),
    written: ofBuiltRows('written'),
    'repo reach': status.otherRepos.flatMap(repoSpecPrefixes)
  }
}

const themePrefixSources = (status) => {
  const bySource = prefixesBySource(status)
  const prefixes = inPrefixOrder(PREFIX_SOURCES.flatMap((source) => bySource[source]))
  return Object.fromEntries(
    prefixes.map((prefix) => [prefix, PREFIX_SOURCES.filter((source) => bySource[source].includes(prefix))])
  )
}

const themeSpecCheck = async (id) => {
  const status = await readThemeStatus(id, [...landedSpecPrefixes.keys()])
  if (!status) {
    const detail = `${id}: theme unread — the theme reader's line could not be read twice, so no spec check ran and the run cannot tell whether this was its theme's last row. Read the theme with \`jq\` by hand; if it has no row left to build, run "catch-up and cover" for its prefixes, then launch again`
    log(`${id}: THEME UNREAD — ${detail}`)
    return { record: { after: id, theme: null, outcome: 'theme-unread', detail }, stop: { reason: 'spec-check-red', detail } }
  }
  if (status.theme === null) return null
  if (status.todo > 0) {
    log(`${id}: theme ${status.theme} has ${status.todo} row(s) left to build — its spec check waits for the last`)
    return null
  }
  const { theme } = status
  const themeRefuted = refutedFindings.filter((record) => status.built.includes(record.id))
  const sources = themePrefixSources(status)
  const prefixes = Object.keys(sources)
  if (prefixes.length === 0) {
    log(`${id}: theme ${theme} is built; it touched no Behaviour Spec prefix, so there is no spec to check`)
    return { record: { after: id, theme, outcome: 'no-spec-prefix', prefixes: [], sources, problems: [] }, themeRefuted }
  }
  const written = prefixes.filter((prefix) => sources[prefix].includes('written'))
  const answer = await checkThemeSpec(id, theme, prefixes)
  const problems = specCheckProblems(answer, prefixes, written)
  const checked = (answer?.prefixes ?? []).filter((entry) => prefixes.includes(entry.prefix))
  const record = {
    after: id,
    theme,
    outcome: problems.length > 0 ? 'spec-check-red' : 'spec-checked',
    prefixes: checked.map(({ prefix, present, lintOk, noneCount, partialCount }) => ({ prefix, present, lintOk, noneCount, partialCount })),
    sources,
    problems
  }
  if (problems.length === 0) {
    log(`${id}: theme ${theme} is built; spec check clean — ${checked.map(describeSpecPrefix).join('; ')}`)
    return { record, themeRefuted }
  }
  const redPrefixes = prefixes.filter((prefix) => problems.some((problem) => problem.includes(`${prefix}/`)))
  const detail = `theme ${theme}, after ${id}: ${problems.join('; ')}. Every row of the theme is built, so nothing re-runs this check: run ${catchUpAdvice(redPrefixes.length > 0 ? redPrefixes : prefixes)} (spec-catchup, then spec-cover), then launch again`
  log(`${id}: SPEC CHECK RED — ${detail}`)
  return { record, themeRefuted, stop: { reason: 'spec-check-red', detail } }
}

const THEME_DIFF_BASE = 'origin/main'
const THEME_REVIEW_PHASE = 'Theme review'
const THEME_REVIEW_AGENTS = 2 * REPO_KEYS.length + 9

const themeRowsCommand = (theme) =>
  `\`jq -c '(.theme // null) as $split | [.increments[] | select((.theme // $split) == "${theme}") | {id, title, detail, acceptanceCriteria}]' ${BACKLOG_TILDE}\``

const themeRowsContext = (theme) => `
THE THEME — read its rows in full before anything else:
${themeRowsCommand(theme)}
— their acceptanceCriteria are what the theme's code must do — and
\`jq 'del(.increments)' ${BACKLOG_TILDE}\` — the programme's header, whose invariants every row keeps.
`

const themeDiffCommand = (key) => `\`git -C ${repoTilde(key)} diff ${THEME_DIFF_BASE}...HEAD -- <path>\``

const themeReviewPrompt = (id, theme, key) => `You are the THEME ENGINEERING REVIEWER for theme \`${theme}\` in the ${key} repo (\`${repoTilde(key)}\`). Every
row of the theme is now built on \`${BASE_BRANCH}\`, and ${id} was its last. Each row was reviewed on its own as it was
built. You read the theme's whole change in this repo at once, for what a row-by-row review cannot see. You are a
safety net behind that review, never a replacement for it: report every real finding.
${guardrails()}
${HOUSE_RULES_TO_JUDGE}${themeRowsContext(theme)}
THE CHANGE: run \`git -C ${repoTilde(key)} fetch origin\`, then \`git -C ${repoTilde(key)} diff --stat ${THEME_DIFF_BASE}...HEAD\` for
the files the theme changed, then ${themeDiffCommand(key)} for each. Read each changed file in full.
${REPO_DOCS_STEP}LOOK FOR, across every row of the theme:
- PATTERNS: one rule written in more than one place; a second mechanism beside one that exists; a piece in a layer
  the repo's docs keep it out of; a pattern extended where its recipe or a sibling was left behind; one concept with
  two names across rows.
- TESTS: set-up repeated across test files instead of in the shared helper; a local copy of a shared helper's body;
  a removal proved by absence rather than by what shows now.
${CODE_REVIEW_LENS}- ${OUTSIDE_THE_DIFF}.
${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Write each finding's \`file\` as \`${key}:<repo-relative path>\`, and report findings in this repo only. Give each
one a fix, and a concrete failure scenario or, for a code-quality finding, the house rule it breaks. If the theme changed nothing here, or its change is clean, return an empty
findings array.
Return the structured output only.`

const groupThemeFindings = (findings) =>
  [...new Set(findings.map((finding) => repoOfFile(findingFile(finding))))].map((repo) => {
    const items = findings.filter((finding) => repoOfFile(findingFile(finding)) === repo)
    return { repo, language: 'mixed', files: [...new Set(items.map(findingFile))], items, name: repo }
  })

const THEME_FIX_SPEC_LINE = `Never change \`${TILDE}/openspec/\`: a fix that would change what the behaviour spec records is not this
review's. Say so in your summary instead.`

const themeFixPrompt = (id, theme, ruledFixes, treeDuty) => `You are the FIXER for the engineering review of theme \`${theme}\`, run after its last row, ${id}, landed on
\`${BASE_BRANCH}\`. Apply EXACTLY the ruled fixes below — no more, no less.
${guardrails()}
${HOUSE_RULES_TO_WRITE}
YOUR PERSONA — read ${SKILLS}/review/references/REVIEW_ITEM_FIXER.md IN FULL and follow it. For any fix that is
purely stylistic also read ${SKILLS}/code-style/references/STYLE_IMPLEMENTOR.md.
${REPO_RULE}
THE RULED FIXES:
${ruledFixes}

${treeDuty}${FIX_RULES}
${THEME_FIX_SPEC_LINE}
${builderGateRule(id, 'theme-fix')}
Return the structured output only.`

const themeLadderPrompt = (id, theme, phases, fix) => `You are the VERIFIER for the engineering review of theme \`${theme}\`. Its fixer has staged the ruled fixes on
\`${BASE_BRANCH}\`. Run the gate and report honestly.
${guardrails()}
${HOUSE_RULES_TO_REPAIR}
FIXER — ${fix.summary}
  notes: ${fix.notes || '(none)'}

${GATE_RULE}

Every rung was green at the ladder of ${id}, the theme's last row, just before this review, so a rung red now is these
fixes' to repair.
TASK:
${ladderGateStep(phases, gateLogs(id, 'theme-ladder'))}
- REPAIRS. You get at most 3. A repair fixes the code: never weaken, skip or delete a test to get green, and never mark a
  rung green that was not. A red format rung is repaired by running the repo's \`format\` script. After a repair, re-run
  the gate phase that was red, and the unit phase as well when the red phase was not unit.
${RUN_STACK_RULE}
In ran[], list every gate rung as \`<repo> <name>\`. In failures[], one line per red rung, with its reason and its log.
Report green:true ONLY if every rung actually ran and actually passed, with no repair after it.
Return the structured output only.`

const themeLandPrompt = (id, theme, ruledFixes) => `The engineering review of theme \`${theme}\` is fixed, re-reviewed and verified green on \`${BASE_BRANCH}\`.
COMMIT IT AND PUSH IT.
${guardrails()}
${REPO_RULE}
${PUSH_RULE}
TASK:
1. ${changedReposRule(id, 'theme-land', BASE_BRANCH)}
2. Every repo you are about to commit in must have \`onBranch\` true in that file. Where it is false, stop:
   landed:false naming the repo and its \`branch\`, and change nothing in it.
3. What is staged and untracked is that repo's \`changed\` list. Stage anything the fixes produced that is still
   untracked (\`??\`), but NOTHING under logs/, no coverage output, no test-results/, no .playwright artefacts.
4. Commit, one commit per repo, each with the same subject: \`refactor(${SCOPE}): apply the engineering review of the ${theme} theme\`,
   and a body listing the fixes below that touched that repo and naming the theme's last row, ${id}. No trailer.
   THE FIXES:
${ruledFixes}
5. ${SPEC_RULE} It must have no changes: these fixes never touch the spec. If it has any, report landed:false naming them.
6. Push every repo you committed in, by HOW TO PUSH above. A rejected push is pushed:false, saying which repo and what
   git said.${testsImageFirstRule(id, BASE_BRANCH)}
Report landed, pushed, the commit SHA or SHAs in the order of the configured repos, and a summary.
Return the structured output only.`

const themeReviewStop = async (id, { reason, outcome = reason, why, evidence, preserve = true }) => {
  const kept = preserve
    ? await preserveAttempt({
        id,
        ticket: null,
        workBranch: BASE_BRANCH,
        phaseName: THEME_REVIEW_PHASE,
        reason: why,
        evidence,
        outcome,
        detail: evidence
      })
    : null
  const detail = `${id}: the theme's engineering review stopped: ${why}. ${evidence}${kept ? `. Preserved: ${kept.preserved ?? 'the preserve step returned nothing'}` : ''}`
  log(`${id}: THEME REVIEW STOPPED (${reason}) — ${detail}`)
  return { stop: { reason, detail } }
}

const heldDuringThemeReview = async (id, stage, result) => {
  const held = result?.stackHeld
  if (!held) return null
  return themeReviewStop(id, { reason: 'stack-held', why: `the workspace stack was held at the ${stage} stage`, evidence: stackHeldDetail(id, stage, held) })
}

const applyAndReReviewThemeFixes = async (id, theme, ruledFixes) => {
  const first = await recoverRunStack(id, 'theme fix', () =>
    agent(
      themeFixPrompt(id, theme, ruledFixes, TREES_BEFORE_FIX_DUTY),
      code({ label: `${id} theme fix`, phase: THEME_REVIEW_PHASE, schema: withStackHeld(FIX_SCHEMA) })
    )
  )
  const firstHeld = await heldDuringThemeReview(id, 'theme fix', first)
  if (firstHeld) return firstHeld
  if (!first) return themeReviewStop(id, { reason: 'theme-review-red', why: 'the fixer died', evidence: 'the theme fix agent returned no result' })
  const review = await agent(
    fixHunksReviewPrompt({ subject: `the engineering review of theme \`${theme}\``, ruledFixes, fix: first }),
    code({ label: `${id} theme fix review`, phase: THEME_REVIEW_PHASE, schema: CODE_QUALITY_FINDINGS_SCHEMA })
  )
  const findings = (review?.findings ?? []).filter(isCodeQuality)
  if (findings.length === 0) return { fix: first }
  log(`${id}: the style re-review of the theme fix found ${findings.length} code-quality finding(s) — sending them back once`)
  const second = await recoverRunStack(id, 'theme fix 2', () =>
    agent(
      themeFixPrompt(id, theme, fixesForReviewFindings(findings), ''),
      code({ label: `${id} theme fix 2`, phase: THEME_REVIEW_PHASE, schema: withStackHeld(FIX_SCHEMA) })
    )
  )
  const secondHeld = await heldDuringThemeReview(id, 'theme fix 2', second)
  if (secondHeld) return secondHeld
  return { fix: withSecondFix(first, second) }
}

const gateAndLandThemeFixes = async (id, theme, ruledFixes, phases, fix) => {
  const ladder = await recoverRunStack(id, 'theme ladder', () =>
    agent(
      themeLadderPrompt(id, theme, phases, fix),
      code({ label: `${id} theme ladder`, phase: THEME_REVIEW_PHASE, schema: withStackHeld(LADDER_SCHEMA) })
    )
  )
  const ladderHeld = await heldDuringThemeReview(id, 'theme ladder', ladder)
  if (ladderHeld) return ladderHeld
  if (!ladder?.green) {
    return themeReviewStop(id, {
      reason: 'theme-review-red',
      why: 'its ladder went red',
      evidence: ladder ? (ladder.failures ?? []).join(' | ') || ladder.summary : 'the theme ladder agent died'
    })
  }
  const land = await agent(
    themeLandPrompt(id, theme, ruledFixes),
    light({ label: `${id} theme land`, phase: THEME_REVIEW_PHASE, schema: BRANCH_LAND_SCHEMA })
  )
  if (!land?.landed) {
    return themeReviewStop(id, { reason: 'land-failed', why: 'its fixes could not be committed', evidence: land?.summary ?? 'the theme land agent died' })
  }
  if (!land.pushed) {
    return themeReviewStop(id, { reason: 'push-failed', why: 'its commit could not be pushed', evidence: land.summary, preserve: false })
  }
  return { commit: land.commit }
}

const reposChangedBy = (fix) => {
  const changed = new Set((fix.changedFiles ?? []).map(repoOfFile))
  const keys = REPO_KEYS.filter((key) => changed.has(key))
  return keys.length > 0 ? keys : REPO_KEYS
}

const watchThemeFixes = async (id, repoKeys) => {
  const found = await agent(findPrsPrompt(id, repoKeys), light({ label: `${id} theme pr`, phase: THEME_REVIEW_PHASE, schema: BRANCH_PR_SCHEMA }))
  if (!found?.ok || (found.prs ?? []).length === 0) {
    const reason = (found?.missing ?? []).length > 0 ? 'no-open-pr' : 'pr-failed'
    return themeReviewStop(id, { reason, why: 'it found no open pull request to watch', evidence: found?.summary ?? 'the theme pr agent died', preserve: false })
  }
  const prList = found.prs.map((pr) => `${pr.repo}: ${pr.url}`).join('\n')
  const ci = await agent(branchWatchPrompt(id, prList), light({ label: `${id} theme ci watch`, phase: THEME_REVIEW_PHASE, schema: BRANCH_CI_SCHEMA }))
  if (ci?.green) return {}
  const evidence = ci ? [ci.blocked, ...(ci.failures ?? [])].filter((line) => line && line !== 'none').join(' | ') || ci.summary : 'the theme ci watch agent died'
  return themeReviewStop(id, { reason: 'ci-red', why: 'CI went red on its commit', evidence: `${evidence}. PRs untouched: ${found.prs.map((pr) => pr.url).join(' ')}`, preserve: false })
}

const reviewThemeRepos = (id, theme) =>
  parallel(
    REPO_KEYS.map((key) => () =>
      agent(
        themeReviewPrompt(id, theme, key),
        think({ label: `${id} theme review:${key}`, phase: THEME_REVIEW_PHASE, schema: FINDINGS_SCHEMA })
      ).then((result) => ({ key, result }))
    )
  )

const unreviewedCheck = (id, theme, keys) => ({
  id,
  check: `Theme ${theme}'s engineering review returned nothing for ${keys.join(', ')}. Review the theme's change there by hand.`
})

const engineeringReviewOfTheme = async (id, theme, phases) => {
  phase(THEME_REVIEW_PHASE)
  const reviews = await reviewThemeRepos(id, theme)
  const unreviewed = reviews.filter(({ result }) => !result).map(({ key }) => key)
  const checks = unreviewed.length > 0 ? [unreviewedCheck(id, theme, unreviewed)] : []
  const raw = reviews.flatMap(({ result }) => result?.findings ?? []).map((finding, index) => ({ ...finding, n: index + 1 }))
  log(`${id}: theme ${theme}'s engineering review found ${raw.length} finding(s)`)
  if (raw.length === 0) return { checks }

  const { confirmed, refuted } = await verifyFindingGroups(id, groupThemeFindings(raw), {
    phaseName: THEME_REVIEW_PHASE,
    labelOf: (group) => `${id} theme verify:${group.name}`,
    promptOf: (group) =>
      verifierPrompt({
        subject: `the engineering review of theme \`${theme}\``,
        group,
        diffCommand: themeDiffCommand(group.repo),
        criteria: `the theme's acceptanceCriteria\n(${themeRowsCommand(theme)})`
      })
  })
  refutedFindings.push(...refuted)
  for (const record of refuted) log(`${id}: THEME REVIEW REFUTED ${describeRefuted(record)}`)
  if (refuted.length > 0) checks.push(themeRefutedCheck(id, theme, refuted, 'in its engineering review'))
  if (confirmed.length === 0) return { checks }

  const judgement = await agent(
    judgePrompt({
      id,
      subject: `the engineering review of theme \`${theme}\``,
      scope: 'theme',
      context: themeRowsContext(theme),
      confirmed,
      repoKeys: REPO_KEYS
    }),
    think({ label: `${id} theme judge`, phase: THEME_REVIEW_PHASE, schema: JUDGEMENT_SCHEMA })
  )
  if (!judgement) {
    checks.push({ id, check: `Theme ${theme}'s engineering review confirmed ${confirmed.length} finding(s), and its judge returned nothing: ${confirmed.map((finding) => `${finding.file} ${finding.what}`).join(' | ')}` })
    return { checks }
  }
  if (judgement.fixNow.length === 0) return { checks }

  const ruledFixes = judgement.fixNow.map((fix, index) => `${index + 1}. ${fix}`).join('\n')
  const fixed = await applyAndReReviewThemeFixes(id, theme, ruledFixes)
  if (fixed.stop) return { ...fixed, checks }
  const landed = await gateAndLandThemeFixes(id, theme, ruledFixes, phases, fixed.fix)
  if (landed.stop) return { ...landed, checks }
  const watched = await watchThemeFixes(id, reposChangedBy(fixed.fix))
  const fixedCheck = {
    id,
    check: `Theme ${theme}'s engineering review fixed ${judgement.fixNow.length} finding(s) in ${landed.commit ?? 'a commit the land stage did not name'}. Read that commit with the rest of the theme.`
  }
  log(`${id}: theme ${theme}'s engineering review landed ${judgement.fixNow.length} fix(es) in ${landed.commit ?? 'an unnamed commit'}`)
  return { ...watched, checks: [...checks, fixedCheck] }
}

const LAND_ORDER = IS_LEGACY_KEYS ? 'backend first' : "in the order of the increment's repos"

const queue = EXPLICIT_IDS === null ? null : [...EXPLICIT_IDS]
const plannedWork = queue ? `${queue.length} increment(s)` : 'draining the backlog'
const stopAfterText = STOP_AFTER === 'all' ? 'every one it can' : `${STOP_AFTER} landed`
log(
  IS_BRANCH
    ? `${WORKAREA_REL}: ${plannedWork} onto ${BASE_BRANCH} (branch lifecycle: no Jira, no merge), executor ${EXECUTOR}, stopping after ${stopAfterText}`
    : `${WORKAREA_REL}: ${plannedWork} off ${BASE_BRANCH}, executor ${EXECUTOR}, stopping after ${stopAfterText}`
)

const results = []
const specChecks = []
const reviewChecks = []
const refutedFindings = []
let built = 0
let lastId = null
let stopped = null
let themeReviewsRun = 0
const themeReviewAgents = () => (IS_BRANCH ? (themeReviewsRun + 1) * THEME_REVIEW_AGENTS : 0)
let workspaceLeftOn = null

const runLease = PLAN_ONLY ? null : await acquireRunLease()

if (!PLAN_ONLY && !runLease?.acquired) {
  if (runLease?.refused) {
    stopped = {
      reason: 'stack-held',
      detail: `the workspace stack is held by ${describeStackHolder(runLease.holder)}, so the run built nothing. ${runLease.summary}`
    }
  } else {
    stopped = {
      reason: 'stack-failed',
      detail: `the run could not take the workspace stack, so it built nothing. ${runLease?.summary ?? 'the lease agent died'}`
    }
  }
  log(`${WORKFLOW_NAME}: ${stopped.reason.toUpperCase()} before any increment — ${stopped.detail}`)
}

const runMayHoldLease = !PLAN_ONLY && !runLease?.refused

try {
while (stopped === null) {
  if (STOP_AFTER !== 'all' && built >= STOP_AFTER) {
    stopped = { reason: 'count-reached', detail: `${built} increment(s) landed, which is what stopAfter asked for` }
    break
  }

  if (agentsThrough(built + 1) + themeReviewAgents() > AGENT_CAP) {
    stopped = {
      reason: 'agent-budget',
      detail: `${built} increment(s) landed. Another would take this run past the Workflow tool's ${AGENT_CAP}-agent cap at up to ${agentsPerIncrement()} agents per increment on ${EXECUTOR}${IS_BRANCH ? `, keeping ${THEME_REVIEW_AGENTS} for a theme's engineering review` : ''}. Launch the workflow again with the same args to carry on`
    }
    break
  }

  let id = null
  let started = null

  if (queue) {
    id = queue.shift()
    if (!id) {
      stopped = { reason: 'no-buildable', detail: 'the increments list is built out' }
      break
    }
  }

  if (!PLAN_ONLY && !IS_BRANCH) {
    phase('Start')
    started = startReport(await startIncrement(id, lastId))
    if (started.failedStep === 'derive') {
      stopped = { reason: 'derive-failed', detail: started.reason }
      log(`${WORKAREA_REL}: COULD NOT DERIVE THE NEXT INCREMENT — ${started.reason}`)
      break
    }
    if (!started.id) {
      stopped = { reason: 'no-buildable', detail: 'tim build start found nothing buildable in the backlog' }
      break
    }
    id = started.id
    log(`${WORKAREA_REL}: ${queue ? 'starting' : 'next is'} ${id}`)
  } else if (!queue) {
    phase('Derive')
    const derived = await deriveNext()
    if (!derived || !derived.ok) {
      stopped = { reason: 'derive-failed', detail: derived?.summary ?? 'the derive agent failed' }
      log(`${WORKAREA_REL}: COULD NOT DERIVE THE NEXT INCREMENT — ${stopped.detail}`)
      break
    }
    if (!derived.next) {
      stopped = { reason: 'no-buildable', detail: derived.summary }
      break
    }
    id = derived.next
    log(`${WORKAREA_REL}: next is ${id}`)
  }

  if (id === lastId) {
    stopped = {
      reason: 'not-landed',
      detail: `${id} came back a second time, so the previous attempt at it did not land. Read its row in the backlog before running again`
    }
    log(`${id}: DERIVED TWICE — the last attempt did not land. Stopping.`)
    break
  }
  lastId = id

  if (PLAN_ONLY) {
    phase('Plan')
    const plan = await reviewedPlan(id)
    results.push({
      id,
      outcome: plan?.ok ? 'planned' : 'plan-refused',
      plan: `${PLANS}/${id}.md`,
      detail: plan?.summary ?? 'the planner died',
      repos: plan?.repos,
      behaviourChanges: plan?.behaviourChanges,
      decisions: plan?.decisions,
      risks: plan?.risks,
      planReviewMustAddress: plan?.planReviewMustAddress,
      followUps: plan?.followUps
    })
    log(`${id}: ${plan?.ok ? 'PLANNED' : 'PLAN REFUSED'} — ${plan?.summary ?? 'the planner died'}`)
    continue
  }

  let ticket = null
  let workBranch = BASE_BRANCH
  let repos = null
  let resumeAt = 'build'
  let approvalRepos = []
  workspaceInIncrement = null
  let rowMerges = []
  let rowGatePhases = GATE_PHASES
  let rowAwaitsCi = true

  ticketAndBranch: {
    if (IS_BRANCH) {
      phase('Branch')
      const row = await assertBranch(id)
      if (!row || !row.ok) {
        log(`${id}: BRANCH STAGE FAILED — ${row ? row.summary : 'agent failed'}`)
        results.push({ id, outcome: 'branch-failed', detail: row?.summary ?? 'agent failed' })
        stopped = { reason: 'branch-failed', detail: `${id}: ${row?.summary ?? 'agent failed'}` }
        break
      }
      const problems = rowFieldProblems(row)
      if (problems.length > 0) {
        log(`${id}: ROW INVALID — ${problems.join('; ')}`)
        results.push({ id, outcome: 'row-invalid', detail: problems.join('; ') })
        stopped = { reason: 'row-invalid', detail: `${id}: ${problems.join('; ')}` }
        break
      }
      repos = row.repos
      resumeAt = row.resumeAt
      rowMerges = row.merge ?? []
      rowGatePhases = row.gatePhases === undefined ? GATE_PHASES : GATE_PHASES.filter((name) => row.gatePhases.includes(name))
      rowAwaitsCi = row.awaitCi !== false
      log(
        `${id}: on ${workBranch} in every repo; row repos ${repos.join(', ') || 'none'}; merges ${rowMerges.map((entry) => `${entry.repo}<-${entry.ref}`).join(', ') || 'none'}; gate ${rowGatePhases.join(', ') || 'none'}; CI ${rowAwaitsCi ? 'awaited' : 'not awaited'}; resuming at ${resumeAt}`
      )
      break ticketAndBranch
    }

    if (started.failedStep === 'ticket') {
      log(`${id}: TICKET STEP FAILED — ${started.reason}`)
      results.push({ id, outcome: 'ticket-failed', detail: started.reason })
      stopped = { reason: 'ticket-failed', detail: `${id}: ${started.reason}` }
      break
    }
    if (!started.ticket?.key || started.ticket.movedToBoard !== true) {
      const key = started.ticket?.key ?? 'its ticket'
      const detail = `${key} is not on board ${JIRA_BOARD}: tim build start did not report it moved there`
      log(`${id}: TICKET STEP FAILED — ${detail}`)
      results.push({ id, ticket: started.ticket?.key, outcome: 'ticket-failed', detail })
      stopped = { reason: 'ticket-failed', detail: `${id}: ${detail}` }
      break
    }
    ticket = started.ticket
    for (const warning of started.warnings ?? []) log(`${id}: ${warning}`)

    const unknownRepos = (started.repos ?? []).filter((key) => !REPO_KEYS.includes(key))
    const branchProblem =
      started.failedStep === 'branch'
        ? started.reason
        : unknownRepos.length > 0
          ? `tim build start branched ${unknownRepos.join(', ')}, which the args do not configure`
          : null
    if (branchProblem) {
      if ((started.branched ?? []).some((entry) => entry.repo === WORKSPACE_KEY)) workspaceLeftOn = started.branch
      log(`${id}: BRANCH STEP FAILED — ${branchProblem}`)
      results.push({ id, ticket: ticket.key, outcome: 'branch-failed', detail: branchProblem })
      stopped = { reason: 'branch-failed', detail: `${id}: ${branchProblem}` }
      break
    }

    workBranch = started.branch
    repos = started.repos
    resumeAt = started.resumeAt ?? 'build'
    approvalRepos = REQUIRE_APPROVAL ? REPO_KEYS : [...new Set([...APPROVAL_REPO_KEYS, ...(started.requireApproval ?? [])])]
    if (repos.includes(WORKSPACE_KEY)) {
      workspaceInIncrement = { branch: workBranch, ...workspaceCarriedFrom(started) }
      workspaceLeftOn = workBranch
      const workspaceMerge = (started.branched ?? []).find((entry) => entry.repo === WORKSPACE_KEY && entry.mergedBase)
      if (workspaceMerge) {
        log(`${id}: merged ${workspaceMerge.mergedBase} into ${workBranch} in the workspace repo before any stage runs tim, so the tim it runs is current`)
      }
    }
    log(
      `${id}: ${ticket.key} (${ticket.created ? 'raised' : 'reused'}, ${ticket.status}) on board ${JIRA_BOARD}, branch ${workBranch} in ${repos.join(', ')}, resuming at ${resumeAt}`
    )
    if (buildsWorkspace()) {
      const { outsideWorkareas, underWorkareas, listedIn } = workspaceInIncrement
      log(
        `${id}: the workspace repo carried ${outsideWorkareas + underWorkareas} uncommitted file(s) onto ${workBranch}, ${underWorkareas} of them under workareas/${listedIn ? `, listed in ${listedIn}` : ''}; none of them is this increment's`
      )
    }
  }

  let plan = null
  let rawFindings = []
  let confirmed = []
  let refuted = []
  let fixReviewFindings = []
  let judgement = { decisions: [], fixNow: [], summary: 'No findings to judge.' }
  let land = null
  let mergesInProgress = []
  let workspaceEdits = []
  let specPrefixesOfRow = { planned: [], written: [] }
  const findingCounts = () => ({
    raw: rawFindings.length,
    confirmed: confirmed.length,
    refuted: refuted.length,
    fixed: judgement.fixNow.length,
    foundInFix: fixReviewFindings.length
  })

  build: {
    if (resumeAt !== 'build') {
      log(`${id}: already built on ${workBranch} — skipping to ${resumeAt}`)
      break build
    }

  phase('Baseline')

  const baseline = await recoverRunStack(id, 'baseline', () => agent(
    IS_BRANCH ? branchBaselinePrompt(id, rowGatePhases) : `You are the BASELINE GUARD for increment ${id}. Establish that the tree is clean, on the right branch and
green BEFORE any edit, so a failure later in this increment is unambiguously ours. You run fixed commands and
report what they printed. You choose no test, script or suite: \`tim build gate\` does that.
${guardrails()}
${REPO_RULE}
${GATE_RULE}
TASK:
1. THE BRANCH. The branch stage has already put the increment's repos on their branch, cut from a fresh
   \`${BASE_BRANCH}\`. Do not switch branches. Record which branch each repo is on
   (\`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`) in your summary.
   Check the increment's repos only${repos ? ` — ${repos.join(', ')}` : ', by the ITS REPOS rule'}; another configured repo staying on
   \`${BASE_BRANCH}\` is correct. One assertion only: if ANY of the increment's repos is on \`${BASE_BRANCH}\`, stop and report ok:false naming it. You are not
   checking that it is on the *right* branch; you are refusing to let an increment start editing a repo that is
   on the base branch, because every later stage then commits and pushes there. This is the last cheap place to
   catch a repo the branch stage did not cover.
2. CLEAN TREES. Determine the increment's repos by the ITS REPOS rule${repos ? ` (the start stage settled them: ${repos.join(', ')})` : ''}
   (\`jq '.increments[] | select(.id=="${id}") | {repos, repo}' ${BACKLOG_TILDE}\`) and confirm each one is clean:
   \`git -C ${TILDE}/<repoPath> status --short\`.
   If any is DIRTY, stop and report ok:false — an unclean tree makes commit-or-rollback unsafe.
${specBaselineLine()}
${baselineGateStep(GATE_PHASES, gateLogs(id, 'baseline'))}
4. REPORT what tim printed, not your reading of it. rungs[]: every rung from every phase, each with the \`repo\`,
   \`name\`, \`phase\`, \`ok\`, \`log\` and \`reason\` tim gave it. green:true only if every phase that had rungs came back
   green. ok:true only if steps 1 and 2 passed. Put each red rung's reason in your summary, word for word.
Return the structured output only.`,
    light({ label: `${id} baseline`, phase: 'Baseline', schema: withStackHeld(BASELINE_SCHEMA) })
  ))

  const baselineHeld = baseline?.stackHeld
  if (baselineHeld) {
    const detail = stackHeldDetail(id, 'baseline', baselineHeld)
    log(`${id}: STACK HELD at the baseline — ${detail}`)
    results.push({ id, ticket: ticket?.key, outcome: 'stack-held', holder: baselineHeld.holder, detail })
    stopped = { reason: 'stack-held', detail }
    break
  }

  if (!baseline || !baseline.ok || !baseline.green) {
    log(`${id}: BASELINE RED — stopping the run. ${baseline ? baseline.summary : 'agent failed'}`)
    results.push({ id, outcome: 'baseline-red', detail: baseline?.summary ?? 'agent failed' })
    stopped = { reason: 'baseline-red', detail: `${id}: ${baseline?.summary ?? 'agent failed'}` }
    break
  }

  const baselineEvidence = `THE BASELINE GATE, run before any edit — every rung below was green then, so a rung red now
is this increment's to fix, even when the failing test's own file is unchanged. Its logs are in
${gateLogs(id, 'baseline')}/, named \`gate-<repo>-<rung>.log\`:
${baselineRungList(baseline)}`

  phase('Plan')

  plan = await reviewedPlan(id, repos)

  if (!plan || !plan.ok) {
    log(`${id}: PLAN REFUSED — ${plan ? plan.summary : 'the planner died'}`)
    results.push({ id, ticket: ticket?.key, outcome: 'plan-refused', plan: `${PLANS}/${id}.md`, detail: plan?.summary ?? 'the planner died' })
    stopped = { reason: 'plan-refused', detail: `${id}: ${plan?.summary ?? 'the planner died'}` }
    break
  }

  const planOutsideBranched = repos && plan.repos.filter((r) => !repos.includes(r))
  if (planOutsideBranched && planOutsideBranched.length) {
    log(`${id}: PLAN OUTSIDE BRANCHED REPOS — ${planOutsideBranched.join(', ')}`)
    results.push({ id, ticket: ticket?.key, outcome: 'plan-outside-branched-repos', detail: `plan touches ${planOutsideBranched.join(', ')}, branched only ${repos.join(', ')}` })
    stopped = {
      reason: 'plan-outside-branched-repos',
      detail: `${id}: the plan touches ${planOutsideBranched.join(', ')}, branched only ${repos.join(', ')}`
    }
    break
  }
  log(`${id}: planned — ${plan.repos.join(', ')}; ${plan.behaviourChanges.length} behaviour changes`)

  phase('Implement')

  let mergesAlreadyIn = []
  if (IS_BRANCH && rowMerges.length > 0) {
    const started = await startMerges(id, rowMerges)
    if (!started || !started.ok) {
      results.push(
        await preserveAttempt({
          id,
          ticket,
          workBranch,
          phaseName: 'Implement',
          reason: 'a merge the row asks for could not start',
          evidence: started?.summary ?? 'the merge stage agent died',
          outcome: 'merge-failed',
          detail: started?.summary ?? 'agent failed'
        })
      )
      stopped = { reason: 'merge-failed', detail: `${id}: ${started?.summary ?? 'agent failed'}` }
      break
    }
    mergesInProgress = started.merges.filter((entry) => !entry.alreadyMerged)
    mergesAlreadyIn = started.merges.filter((entry) => entry.alreadyMerged)
    log(
      `${id}: merges started — ${started.merges.map((entry) => `${entry.repo}<-${entry.ref} ${entry.alreadyMerged ? 'already in' : `${entry.conflicted.length} conflicted`}`).join(', ')}`
    )
  }
  const mergeNote = mergeNoteOf(mergesInProgress)
  const builderPhases = BUILDER_PHASES.filter((name) => rowGatePhases.includes(name))

  const impl = EXECUTOR === 'codex'
    ? await codexStage(id, 'implement', {
        phaseName: 'Implement',
        schema: incrementSchema,
        instructions: `You are implementing increment ${id}. Build the change the plan at ${PLANS}/${id}.md decides.
${PLAN_CONTRACT_FOR_IMPLEMENTOR}${planStandardsLine(plan)}${mustAddressForImplementor(plan)}
${HOUSE_RULES_TO_WRITE}${IS_BRANCH ? implementMergeTask(mergesInProgress, mergesAlreadyIn) : ''}${IS_BRANCH && repos.length === 0 ? WORKSPACE_ONLY_TASK : ''}${FRONTEND_CHANGE_IMPLEMENT_LINE}${specSyncDuty()}${COMPLETION_LINES_DUTY}${workspaceRepoRule()}`,
        workingBranch: workBranch,
        bindings: { gateUnit: codexGateBinding(id, 'implement', builderPhases) }
      })
    : await recoverRunStack(id, 'implement', () => agent(
    `You are the IMPLEMENTOR for increment ${id}. You build the change the plan decides — you do not review it,
and you do not commit it.
${guardrails()}
${HOUSE_RULES_TO_WRITE}
${readIncrement(id)}
${REPO_RULE}${IS_BRANCH ? implementMergeTask(mergesInProgress, mergesAlreadyIn) : ''}${IS_BRANCH && repos.length === 0 ? WORKSPACE_ONLY_TASK : ''}
${readPlan(id)} ${PLAN_CONTRACT_FOR_IMPLEMENTOR}${planStandardsLine(plan)}${mustAddressForImplementor(plan)}
Before you write to a file, read the rules, best-practice and repo docs the plan's section 16 lists for it. Where the
plan lists none for a file you will touch, run \`tim backlog standards --files <repoKey>:<path> --workspace ${TILDE} --json\`
(repeat --files for each file; the repo keys are ${standardsKeys}, and \`workspace\` for this repo) and read every
rules, bestPractice and repoDocs file it lists. Read each one IN FULL with the Read tool: no offset or limit, and never
\`head\`, \`tail\` or \`sed\` over it.${FRONTEND_CHANGE_IMPLEMENT_LINE}
${specSyncDuty()}
${COMPLETION_LINES_DUTY}

RULES:
- Build the plan's scope: its decisions, homes, rule owners and tests. Do not fix adjacent things you notice — report
  them in notes instead, which the consistency reviewer reads. Extending a shared test helper, the one
  the plan names or one a new test's set-up needs, is in scope. Never write a local copy of a shared helper's body:
  give the helper an option instead.
- **A page added to a journey breaks the preceding page's E2E spec — fix it in THIS increment.** When your
  change inserts or reorders a page, the tests-repo spec covering the page BEFORE yours still expects the old
  next page. It will pass locally, pass its own repo's checks, and go red in CI or, worse, after merge. On this
  programme that has caught out EVERY add-page increment so far. Update that spec yourself, in the tests repo,
  on the SAME branch name — cross-repo branch parity means the stack serves your branch frontend to your branch
  specs, so your own ladder catches the mismatch in seconds rather than a CI round trip finding it in half an
  hour. An increment that ships a page and leaves a stale spec behind is not finished.
- **Work that belongs to THIS increment gets DONE, never deferred.** The scope fence stops you wandering into
  other people's increments; it is not a licence to leave your own half-finished. If something is in scope and
  you are unsure whether to do it, DO IT — an increment that lands incomplete is worse than one that lands wide.
  Where you genuinely leave something out, say so in notes as \`DEFERRED: <what>\`, on its own line, so the
  orchestrator can find it and check it is tracked. Deferred work that exists only in prose gets lost.
- In a frontend with copy files, every user-facing string goes in copy.en.js AND copy.cy.js with identical
  structure. NO display logic in obligations or the model.
- Write the tests the plan asks for, the integration proof included — they are part of the increment, not optional
  extras. Each proves the behaviour the plan states and fails without the production line it names. Their titles and
  bodies are yours: a title states what its assertions prove.
- STAGE your work (\`git -C ... add\`) but DO NOT COMMIT. Landing is a later step that runs after review.
- If you get stuck on a red step, you get at most 3 self-repair attempts. If still red, stop and report ok:false
  with exactly what is red and what you tried — do NOT thrash, and do NOT weaken a test to make it pass.
${builderGateRule(id, 'implement', builderPhases)}

Return ok, a summary, changedFiles, and notes (anything the reviewers, the judge or the ladder should know,
including anything the increment got wrong and any diagnosis of a red suite you made).
changedFiles: every file you created or edited, each written \`<repoKey>:<repo-relative path>\` with the repo keys
${REPO_KEYS.join(', ')}${IS_BRANCH ? ` (and \`${WORKSPACE_KEY}\` for a file in the workspace repo itself)` : ''} — e.g. \`${REPO_KEYS[0]}:src/server/app/index.js\`. Review is grouped by repo and language from it.`,
    code({ label: `${id} implement`, phase: 'Implement', schema: withStackHeld(incrementSchema) })
  ))

  const attempt = { id, ticket, workBranch }

  const stopForHeldStack = async (stage, phaseName, held) => {
    const detail = stackHeldDetail(id, stage, held)
    log(`${id}: STACK HELD at ${stage} — ${detail}`)
    const preserved = await preserveAttempt({
      ...attempt,
      phaseName,
      reason: `the workspace stack was held by somebody else at the ${stage} stage`,
      evidence: detail,
      outcome: 'stack-held',
      detail
    })
    results.push({ ...preserved, holder: held.holder })
    stopped = { reason: 'stack-held', detail }
  }

  const implHeld = impl?.stackHeld
  if (implHeld) {
    await stopForHeldStack('implement', 'Implement', implHeld)
    break
  }

  if (!impl || !impl.ok) {
    results.push(
      await preserveAttempt({
        ...attempt,
        phaseName: 'Implement',
        reason: 'the implementor could not finish it',
        evidence: impl?.summary ?? 'the implementor agent died',
        outcome: 'implement-failed',
        detail: impl?.summary ?? 'agent failed'
      })
    )
    stopped = { reason: 'implement-failed', detail: `${id}: ${impl?.summary ?? 'agent failed'}` }
    break
  }

  const offBranch = async (stageName, phaseName) => {
    const guard = await branchGuard(id, stageName, phaseName, workBranch, IS_BRANCH ? null : repos)
    if (guard?.ok) return null
    return preserveAttempt({
      ...attempt,
      phaseName,
      reason: `a repo left \`${workBranch}\` by the end of the ${stageName} stage`,
      evidence: guard?.summary ?? 'the branch guard died',
      outcome: 'off-branch',
      detail: guard?.summary ?? 'the branch guard died'
    })
  }

  if (EXECUTOR === 'codex') {
    const stray = await offBranch('implement', 'Implement')
    if (stray) {
      results.push(stray)
      stopped = { reason: 'off-branch', detail: `${id} after implement: ${stray.detail}` }
      break
    }
  }

  const files = (impl.changedFiles ?? []).filter((f) => !f.endsWith('.log'))
  log(`${id}: implemented, ${files.length} files changed — reviewing`)

  phase('Review')

  const reviewTargets = files.length > 0 ? files : ['(no files reported — review the staged diff)']
  const reviewGroups = groupFilesForReview(reviewTargets)
  const styleGroups = reviewGroups.filter((group) => group.language !== DOCS_LANGUAGE)
  log(`${id}: ${reviewGroups.length} review group(s) — ${reviewGroups.map((group) => `${group.name} (${group.files.length})`).join(', ')}`)

  const groupHeader = (group) => `${group.files.length} file(s) in the ${group.repo} repo (${groupRepoPath(group)}), language
${group.language}. Review EVERY one of them — each file on its own merits, read in full:
${groupFileList(group)}
The \`<repoKey>:\` prefix names the repo; the rest is the path inside it. Report each finding's \`file\` exactly as it
is written in that list, so it can be routed back to this group.`

  const styleReviews = styleGroups.map((group) => () =>
    agent(
      `You are a STYLE REVIEWER for increment ${id}, reviewing ${groupHeader(group)}
${guardrails()}
YOUR PERSONA — read ${SKILLS}/code-style/references/STYLE_FILE_REVIEWER.md IN FULL and follow it. It defines what
you look for and the bundle to judge against. Also read ${SKILLS}/code-style/SKILL.md for the language routing
(Java → modern-java + Javadoc; GDS/Nunjucks → components/styles/patterns; Playwright → playwright; Node → the
16-rule style guide + JSDoc). The persona is written per file: apply it to each file in the list in turn, and load
the bundle once for the group.
CONTEXT: the increment is at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`, and the plan it was
built from at ${PLANS}/${id}.md. See the change with ${groupDiffCommand(group)} for
each file, and compare it with the exemplar the plan names for that file.${mergeNote}
SCOPE: style only — formatting, naming, conventions, idiom, comment discipline, copy structure. Correctness and
security belong to a different reviewer; do not duplicate them.
${HOUSE_RULES_TO_JUDGE}${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Report ONLY real findings, each with a concrete fix. No praise, no summary of what a file does. If every file is
clean, return an empty findings array.
Return the structured output only.`,
      code({ label: `${id} style:${group.name}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )
  )

  const codeReviews = reviewGroups.map((group) => () =>
    agent(
      `You are a CODE REVIEWER for increment ${id}, reviewing ${groupHeader(group)}
${guardrails()}
${HOUSE_RULES_TO_JUDGE}YOUR PERSONA — read ${SKILLS}/review/references/FILE_REVIEWER.md IN FULL and follow it. Also read
${SKILLS}/review/SKILL.md for the review dimensions. The persona is written per file: apply it to each file in the
list in turn.
CONTEXT: the increment is at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\` — its
acceptanceCriteria are what this code is supposed to do, and the header's invariants
(\`jq 'del(.increments)' ${BACKLOG_TILDE}\`) are what it must not break. The plan is at ${PLANS}/${id}.md. See the
change with ${groupDiffCommand(group)} for each file.${mergeNote}
SCOPE: correctness, security, error handling, performance, naming, operability, duplication and TEST QUALITY.
Specifically hunt for:
- behaviour that does not match the increment's acceptanceCriteria, or a behaviour change the plan did not declare
- tests that assert implementation rather than behaviour (toHaveBeenCalledWith on a collaborator is the tell);
  mocks at the module boundary rather than the network boundary
- missing negative/edge cases the acceptance criteria imply
${CODE_REVIEW_LENS}- the traps the plan's risks name, and the programme-specific ones — for example, in a multi-set frontend:
  route-shape vs link-builder confusion (route tables must use the PREFIX-FREE builders; rendered links, redirects
  and form actions must use the PREFIX-BEARING ones), display logic leaking into obligations or the model, and any
  platform-layer file that has learned a set's vocabulary.
${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Report ONLY real findings, each with a concrete failure scenario or, for a code-quality finding, the house rule
it breaks. Formatting nits belong to a different reviewer — skip them.
Return the structured output only.`,
      code({ label: `${id} review:${group.name}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )
  )

  const consistencyReview = () =>
    recoverRunStack(id, 'consistency', () => agent(
      `You are the CONSISTENCY REVIEWER for increment ${id} — you look ACROSS the whole change, not at one file.
${guardrails()}
${HOUSE_RULES_TO_JUDGE}YOUR PERSONA — read ${SKILLS}/review/references/CONSISTENCY_REVIEWER.md IN FULL and follow it.
CONTEXT: increment at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`; plan at ${PLANS}/${id}.md;
the whole change via \`git -C ${TILDE}/<repoPath> diff --staged\` in EVERY repo the plan names.${mergeNote}${IS_BRANCH && repos.length === 0 ? WORKSPACE_REVIEW_LINE : ''}
${REPO_DOCS_STEP}LOOK FOR: ${OUTSIDE_THE_DIFF}; the same concept named two ways across files; a pattern the repo already has, reimplemented instead of
reused (compare with the exemplar the plan names); registration that exists in one place but not its twin (a page
in dispatch but not in the contract table, a feature in features/index.js but not evaluation.js, copy.en.js
without the matching copy.cy.js key); an obligation with no schema field behind it or a schema field nothing
writes; a move or new file the plan listed that did not happen; THE CONTRACT BETWEEN REPOS — what each consumer (a
frontend, say) sends and expects matches what its provider (a backend or a stub) accepts and returns, and the tests
or performance-tests repo exercises the slice through it;
an acceptance criterion nothing in the change proves; and the plan's section 5 — run each check it names and
report any that fails as a finding. A check in a form GUARD RAILS lists as DENIED is not run: report it as a finding
naming the plan. ${SECTION_5_STACK_LINE}
${planDecisionReviewRule(plan)}
${implementorNotesForReview(impl.notes)}
${specReviewRule(impl.notes)}
${completionReviewRule(impl.notes)}
${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Write each finding's \`file\` as \`<repoKey>:<repo-relative path>\` (repo keys ${REPO_KEYS.join(', ')}), so it can be
routed to the right verifier.
${RUN_STACK_RULE}
Return the structured output only.`,
      think({ label: `${id} consistency`, phase: 'Review', schema: withStackHeld(FINDINGS_SCHEMA) })
    ))

  const STYLE_PERSONA = `${SKILLS}/code-style/references/STYLE_FILE_REVIEWER.md`
  const CODE_PERSONA = `${SKILLS}/review/references/FILE_REVIEWER.md`
  const CONSISTENCY_PERSONA = `${SKILLS}/review/references/CONSISTENCY_REVIEWER.md`
  const personasOf = (group) => (group.language === DOCS_LANGUAGE ? [CODE_PERSONA] : [STYLE_PERSONA, CODE_PERSONA])

  const codexReview = (slug, personas, reviewFiles, instructions) => () =>
    codexStage(id, 'review', {
      phaseName: 'Review',
      schema: FINDINGS_SCHEMA,
      slug,
      instructions,
      workingBranch: workBranch,
      bindings: { personas: personas.join(', '), reviewFiles }
    }).then((result) => ({ slug, result }))

  const codexGroupReviews = reviewGroups.map((group) =>
    codexReview(
      `review-${group.name}`,
      personasOf(group),
      group.files.join(', '),
      `Review ONE GROUP of the staged, uncommitted change for increment ${id}: ${groupHeader(group)}
${HOUSE_RULES_TO_JUDGE}${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Apply every persona bound to <personas>, and no other. Another Codex run reviews each other group, and a consistency
run looks across the whole change, so report findings on this group's files only. Beside what the code persona names,
hunt for:
${CODE_REVIEW_LENS}${mergeNote}${IS_BRANCH && isWorkspaceGroup(group) ? WORKSPACE_REVIEW_LINE : ''}${workspaceRepoRule()}`
    )
  )

  const codexConsistencyReview = codexReview(
    'review-consistency',
    [CONSISTENCY_PERSONA],
    `${WHOLE_CHANGE} — every file staged or committed on ${workBranch} in every repo`,
    `${HOUSE_RULES_TO_JUDGE}${CHANGE_MAKES_FALSE_RULE}${CATEGORY_RULE}Review the WHOLE staged, uncommitted change for increment ${id} ACROSS files and repos. Apply the persona bound to
<personas>, and no other: other Codex runs review each (repo, language) group file by file.
${REPO_DOCS_STEP}Hunt for ${OUTSIDE_THE_DIFF}; the same concept
named two ways, a pattern the repo already has reimplemented, registration in one place but not its twin, the contract
between repos, an acceptance criterion nothing in the change proves, and run each check the plan's section 5 names,
reporting any that fails as a finding. ${CODEX_SECTION_5_STACK_LINE}
${planDecisionReviewRule(plan)}
${implementorNotesForReview(impl.notes)}
${specReviewRule(impl.notes)}
${completionReviewRule(impl.notes)}${mergeNote}${IS_BRANCH && repos.length === 0 ? WORKSPACE_REVIEW_LINE : ''}${workspaceRepoRule()}`
  )

  const codexReviewResults = async () => {
    const runs = await parallel([...codexGroupReviews, codexConsistencyReview])
    const failed = runs.filter((run) => !run.result).map((run) => run.slug)
    return { results: runs.map((run) => run.result), failed }
  }

  const reviewed = EXECUTOR === 'codex'
    ? await codexReviewResults()
    : { results: await parallel([...styleReviews, ...codeReviews, consistencyReview]), failed: [] }

  if (reviewed.failed.length > 0) {
    results.push(
      await preserveAttempt({
        ...attempt,
        phaseName: 'Review',
        reason: 'a review stage produced no result',
        evidence: reviewed.failed.map((slug) => codexNoResult(id, slug)).join(' | '),
        outcome: 'review-failed',
        detail: `no result from ${reviewed.failed.join(', ')}`
      })
    )
    stopped = { reason: 'review-failed', detail: `${id}: no result from ${reviewed.failed.join(', ')}` }
    break
  }

  const reviewHeld = reviewed.results.find((result) => result?.stackHeld)?.stackHeld
  if (reviewHeld) {
    await stopForHeldStack('consistency', 'Review', reviewHeld)
    break
  }

  if (EXECUTOR === 'codex') {
    const stray = await offBranch('review', 'Review')
    if (stray) {
      results.push(stray)
      stopped = { reason: 'off-branch', detail: `${id} after review: ${stray.detail}` }
      break
    }
  }

  rawFindings = reviewed.results.filter(Boolean).flatMap((r) => r.findings ?? [])
  log(`${id}: ${rawFindings.length} raw findings — verifying adversarially`)

  if (rawFindings.length > 0) {
    phase('Verify findings')
    const numbered = rawFindings.map((finding, index) => ({ ...finding, n: index + 1 }))
    const verified = await verifyFindingGroups(id, groupFindingsForVerification(numbered), {
      phaseName: 'Verify findings',
      labelOf: (group) => `${id} verify:${group.name}`,
      promptOf: (group) =>
        verifierPrompt({
          subject: `increment ${id}`,
          group,
          diffCommand: groupDiffCommand(group),
          criteria: `the increment's acceptanceCriteria\n(\`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`)`,
          mergeNote
        })
    })
    confirmed = verified.confirmed
    refuted = verified.refuted
    refutedFindings.push(...refuted)
    log(`${id}: ${confirmed.length}/${rawFindings.length} findings survived verification`)
    for (const record of refuted) log(`${id}: REFUTED ${describeRefuted(record)}`)
  }

  if (confirmed.length > 0) {
    phase('Judge')
    judgement =
      (await agent(
        judgePrompt({ id, subject: `increment ${id}`, context: readIncrement(id), confirmed, repoKeys: repos ?? [] }),
        think({ label: `${id} judge`, phase: 'Judge', schema: JUDGEMENT_SCHEMA })
      )) ?? judgement
  }

  let fixResult = null

  const codexFix = async ({ stage, ruledFixes, treeDuty }) => {
    const result = await codexStage(id, 'fix', {
      phaseName: 'Fix',
      schema: FIX_SCHEMA,
      slug: stage,
      instructions: `THE RULED FIXES for increment ${id} — apply exactly these, in order:\n${ruledFixes}

${treeDuty}${HOUSE_RULES_TO_WRITE}
${baselineEvidence}

THE IMPLEMENTOR'S NOTES — a diagnosis it already made is yours to use:
${impl.notes || '(none)'}

${SPEC_SYNC_FIX_LINE}
${COMPLETION_LINES_FIX}${mergeNote}${workspaceRepoRule()}`,
      workingBranch: workBranch,
      bindings: { gateUnit: codexGateBinding(id, stage, builderPhases) }
    })
    if (!result) {
      results.push(
        await preserveAttempt({
          ...attempt,
          phaseName: 'Fix',
          reason: 'the fix stage produced no result',
          evidence: codexNoResult(id, stage),
          outcome: 'fix-failed',
          detail: codexNoResult(id, stage)
        })
      )
      stopped = { reason: 'fix-failed', detail: `${id}: ${codexNoResult(id, stage)}` }
      return { stopped: true }
    }
    const stray = await offBranch(stage, 'Fix')
    if (stray) {
      results.push(stray)
      stopped = { reason: 'off-branch', detail: `${id} after ${stage}: ${stray.detail}` }
      return { stopped: true }
    }
    return { result }
  }

  const claudeFix = async ({ stage, label, ruledFixes, treeDuty }) => {
    const result = await recoverRunStack(id, stage, () => agent(
      `You are the FIXER for increment ${id}. Apply EXACTLY the ruled fixes below — no more, no less.
${guardrails()}
${HOUSE_RULES_TO_WRITE}
YOUR PERSONA — read ${SKILLS}/review/references/REVIEW_ITEM_FIXER.md IN FULL and follow it. For any fix that is
purely stylistic also read ${SKILLS}/code-style/references/STYLE_IMPLEMENTOR.md.
${readIncrement(id)}${mergeNote ? `${mergeNote}\n` : ''}
THE RULED FIXES:
${ruledFixes}

${treeDuty}${FIX_RULES}
${SPEC_SYNC_FIX_LINE}
${COMPLETION_LINES_FIX}
${builderGateRule(id, stage, builderPhases)}
${baselineEvidence}
If a rung goes red for a reason that is not your fix — a port held, an environment variable — write the diagnosis
and whatever got it green in notes. The ladder runs after you and is given your notes.
Return the structured output only.`,
      code({ label, phase: 'Fix', schema: withStackHeld(FIX_SCHEMA) })
    ))
    const held = result?.stackHeld
    if (held) {
      await stopForHeldStack(stage, 'Fix', held)
      return { stopped: true }
    }
    return { result }
  }

  const applyFixes = (fix) => (EXECUTOR === 'codex' ? codexFix(fix) : claudeFix(fix))

  const reviewFixHunks = (ruledFixes, fix) =>
    agent(
      fixHunksReviewPrompt({ subject: `increment ${id}`, ruledFixes, fix, mergeNote }),
      code({ label: `${id} fix review`, phase: 'Fix', schema: CODE_QUALITY_FINDINGS_SCHEMA })
    )

  if (judgement.fixNow.length > 0) {
    phase('Fix')
    log(`${id}: judge ruled ${judgement.fixNow.length} fixes`)
    const ruledFixes = judgement.fixNow.map((f, i) => `${i + 1}. ${f}`).join('\n')
    const firstFix = await applyFixes({ stage: 'fix', label: `${id} fix`, ruledFixes, treeDuty: TREES_BEFORE_FIX_DUTY })
    if (firstFix.stopped) break
    fixResult = firstFix.result

    if (fixResult) {
      const fixReview = await reviewFixHunks(ruledFixes, fixResult)
      if (!fixReview) log(`${id}: the style re-review of the fixer's hunks returned no result — going on to the ladder`)
      fixReviewFindings = (fixReview?.findings ?? []).filter(isCodeQuality)
      if (fixReviewFindings.length > 0) {
        log(`${id}: the style re-review found ${fixReviewFindings.length} code-quality finding(s) in the fixer's hunks — sending them back once`)
        const secondFix = await applyFixes({
          stage: 'fix-2',
          label: `${id} fix 2`,
          ruledFixes: fixesForReviewFindings(fixReviewFindings),
          treeDuty: ''
        })
        if (secondFix.stopped) break
        fixResult = withSecondFix(fixResult, secondFix.result)
      }
    }
  }

  const fixerReport = () => {
    if (fixResult) return `${fixResult.summary}\n  notes: ${fixResult.notes || '(none)'}`
    if (judgement.fixNow.length > 0) return 'the fix stage returned no result'
    return 'no fix stage ran: the judge ruled nothing fix-now'
  }

  const earlierFindings = `WHAT EARLIER STAGES ALREADY FOUND — read it before your first rung. A diagnosis already made is yours to use,
not to make again; where it says what got a rung green, start from that.
IMPLEMENTOR — ${impl.summary}
  notes: ${impl.notes || '(none)'}
FIXER — ${fixerReport()}`

  phase('Ladder')

  const ladder = await recoverRunStack(id, 'ladder', () => agent(
    `You are the VERIFIER for increment ${id}. Run its ladder and report honestly.
${guardrails()}
${HOUSE_RULES_TO_REPAIR}
${readIncrement(id)}
${readPlan(id)}
${earlierFindings}${mergeNote ? `${mergeNote}\nA path still unresolved (${UNRESOLVED_CHECK} prints it) is a failure, never a skip.` : ''}

${GATE_RULE}

${baselineEvidence}

TASK — the ladder, IN ORDER. Every rung runs here, after the fix stage, even one the implementor or fixer already
ran green: their runs are evidence, not proof.
${ladderGateStep(rowGatePhases, gateLogs(id, 'ladder'))}
2. THE INCREMENT'S OWN CHECKS. The plan's section 5, "Invariants to prove", then its section 6, "Increment-specific
   checks beyond the gate", as the plan writes them, each to its own log under ${WORKAREA_TILDE}/logs/ named
   \`${id}-ladder-<step>.log\`, reading each log ONCE. These are the only commands you choose to run. One that needs
   the workspace stack up runs against the stack the run holds, as THE WORKSPACE STACK below says, after the gate.
   A check in a form GUARD RAILS lists as DENIED is a plan defect: never rewrite it into another form to get round
   the deny list. Put "denied form: <command>" in failures[] and go on to the next check.
   The plan states decisions, not a script. A plan check that only fails because the implementor or fixer departed
   from the plan for a stated reason (a review finding, a red rung) — a file the plan said stays untouched, a home
   it moved — is a note, not a failure: say so in your summary, with the departure and its reason, and leave it out
   of failures[]. A check of behaviour (the page does X, the spec says Y) stays pass or fail.
${ladderSpecStep(id, impl.notes, fixResult ? fixResult.notes : null)}
${ladderCompletionStep(impl.notes, fixResult ? fixResult.notes : null)}
3. COMPARE EVERY RED RUNG WITH THE BASELINE by its repo and name. A rung green at baseline and red now is this
   increment's to fix — repair it, or diagnose it and name the cause in failures[]. "Pre-existing" is not available
   for a gate rung: every one was green at baseline. A plan check has no baseline, and the same holds for it.
4. COVERAGE. For every repo with staged changes (\`git -C ${TILDE}/<repoPath> diff --staged --stat\`), the gate must
   have run at least one rung. A changed repo with none is a failure — "not gated: <repo>" — not a skip. ${
     rowGatePhases.includes('e2e')
       ? `Where the
   slice changes anything a user or another system can see, its integration proof (the plan's section 4) must be a
   spec in the tests repo that the gate's E2E rung ran; if the plan has none, that is a failure, not a skip.`
       : `This row's
   gatePhases leave out e2e: its end-to-end proof belongs to another row, so do not fail it for want of one.`
   }
- REPAIRS. You get at most 3 across the whole ladder. A repair normally fixes the CODE — never weaken, skip or delete
  a test to get green, and never mark a rung green that was not. A red format rung is repaired by running the repo's
  \`format\` script, never by editing the check. After a repair, re-run the gate phase that was red, and the unit
  phase as well when the red phase was not unit — a repair edits source, and unit carries format and lint — then the
  plan's checks again. Green means the latest run of every phase and every check passed, with no
  repair after it.
- **The one exception: an assertion that is wrong about the framework, not about the application.** A test can
  itself be the defect — most often an exact-text assertion against a component that renders more than the text
  it was given, such as a GDS macro that prepends visually-hidden fallback text. Correcting such an assertion is
  NOT weakening it, and you may do it, but ONLY when all four hold: the application renders the right thing and
  you can cite the evidence (the accessible-tree snapshot in \`test-results/*/error-context.md\`, or the rendered
  markup); the assertion could never have passed against correct output; other consumers of the same component
  in this repo do not assert it that way either; and the corrected assertion still pins the same behaviour, in
  the same place, as tightly. Then say plainly in your summary which assertion you corrected and why it was
  unpassable. If any of the four does not hold, the test is catching a real defect — fix the code instead.
  This matters because a browser suite is run by nobody else: the implementor cannot run it, so an assertion
  authored wrongly against a browser-only component reaches you and stops here unless you can correct it.
- Where the plan's checks name more than one leg — a platform change that must leave every consumer still working —
  run every leg, not just the one your increment was aimed at.
- For a red E2E rung, read \`test-results/*/error-context.md\` in the tests repo rather than grepping the rung's log.
  Journey E2E specs on a fresh stack are known to be flaky with transient 500s in beforeEach that recover on retry —
  a green rung whose only retries are those IS a pass, but say so explicitly. That exception covers nothing else. A
  spec that hit "Test timeout of …ms exceeded", even once and even if its retry passed, is a failure you repair: the
  journey it drives no longer fits its time budget, and every row that lengthens the journey makes it worse until a
  later baseline goes red. Read the trace's request timings first. If this increment made a request slow, fix the
  code. If the spec simply drives more of the journey than its budget holds, give it \`test.slow()\` as the tests
  repo's other full-journey specs do, and never cut a step or an assertion to make it fit.
- A rung that cannot run fails with its reason — a held port names its holder. Never kill that holder and never
  start or stop the stack to clear it: record the reason in failures[] and set green:false. Where the gate's
  \`result.stack.held\` names the workspace stack as that holder, return \`stackHeld\` as THE GATE rule says.
${RUN_STACK_RULE}
In ran[], list every gate rung as \`<repo> <name>\`, every plan check and every spec check you ran. In failures[], one
line per red rung or check, with its reason and its log.
Report green:true ONLY if every rung and every check actually ran and actually passed, with no repair after it. A
plan check noted as a stated departure counts as passed: it never by itself turns a green gate red.
Return the structured output only.`,
    code({ label: `${id} ladder`, phase: 'Ladder', schema: withStackHeld(LADDER_SCHEMA) })
  ))

  phase('Land')

  const ladderHeld = ladder?.stackHeld
  if (ladderHeld) {
    await stopForHeldStack('ladder', 'Ladder', ladderHeld)
    break
  }

  if (!ladder || !ladder.green) {
    results.push(
      await preserveAttempt({
        ...attempt,
        phaseName: 'Land',
        reason: 'red verification ladder',
        evidence: ladder ? (ladder.failures ?? []).join(' | ') : 'verifier agent failed',
        outcome: 'ladder-red',
        detail: ladder?.summary ?? 'verifier failed'
      })
    )
    log(`${id}: attempt preserved — stopping the run so the failure is not built on top of`)
    stopped = { reason: 'ladder-red', detail: `${id}: ${ladder?.summary ?? 'verifier failed'}` }
    break
  }

  const strayBeforeLand = await offBranch('land', 'Land')
  if (strayBeforeLand) {
    results.push(strayBeforeLand)
    stopped = { reason: 'off-branch', detail: `${id} before land: ${strayBeforeLand.detail}` }
    break
  }

  const workspaceFiles = [...(impl.changedFiles ?? []), ...(fixResult?.changedFiles ?? [])].filter((file) =>
    file.startsWith(`${WORKSPACE_KEY}:`)
  )
  workspaceEdits = IS_BRANCH
    ? workspaceFiles.filter((file) => !withoutWorkspacePrefix(file).startsWith('openspec/'))
    : []

  land = IS_BRANCH
    ? await agent(
        branchLandPrompt(id, plan?.behaviourChanges, mergesInProgress),
        light({ label: `${id} land`, phase: 'Land', schema: BRANCH_LAND_SCHEMA })
      )
    : await agent(
    `Increment ${id} is implemented, reviewed, judged and verified green. COMMIT IT.
${guardrails()}
${REPO_RULE}
${SET_ROW_RULE}
TASK:
1. ${changedReposRule(id, 'land', workBranch)} The increment's title, for the commit subject:
   \`jq -r '.increments[] | select(.id=="${id}") | .title' ${BACKLOG_TILDE}\`.
2. Every repo you are about to commit in must have \`onBranch\` true in that file. Where it is false, STOP and report
   landed:false naming the repo and its \`branch\`, and change nothing in it. Do not commit and do not "fix it up
   after": a commit made on the base branch is one \`git push\` away from being on the base branch for good, with no
   PR, no CI and no review behind it. That has happened here once already.
3. What is staged and untracked is that repo's \`changed\` list. Stage anything the increment produced that is still
   untracked (\`??\`), but NOTHING under logs/, no coverage output, no test-results/, no .playwright artefacts.
4. Commit with a conventional message: \`<type>(${SCOPE}): <increment title>\` — \`feat\` or \`fix\` when the
   behaviour changes below are not empty, otherwise the type the increment's \`kind\` implies — a body saying what
   changed and naming the increment id and its ticket \`${ticket?.key}\`. No trailer.
   Behaviour changes, from the plan: ${plan?.behaviourChanges?.length ? plan.behaviourChanges.map((b) => `\n   - ${b}`).join('') : 'none'}
   A slice across several repos gets ONE commit per repo, each with the same subject.
${specLandStep()}${workspaceLandStep(workspaceFiles)}
5. Do NOT push. A later stage owns that.
6. Record it: \`${setRow(id, `--commit "<sha, or several ${LAND_ORDER}, space separated>"`)}\`. Leave the status alone — this increment is not done until its PRs are merged.
Report the commit SHA. For several repos report each, ${LAND_ORDER}, space separated.
Return the structured output only.`,
    light({ label: `${id} land`, phase: 'Land', schema: LAND_SCHEMA })
  )

  if (land?.landed && buildsWorkspace()) {
    const read = await readWorkspaceCommit(id)
    const readable = read && read.exitCode === 0
    const settled = readable ? workspaceLeaks(committedPathsOf(read.stdout), workspaceFiles) : { leaked: [], toLookUp: [] }
    const lookedUp = readable ? await carriedAmong(id, settled.toLookUp) : []
    const leaked = [...settled.leaked, ...(lookedUp ?? [])]
    if (!readable || lookedUp === null || leaked.length > 0) {
      const detail = !readable
        ? `${id}: could not read what the workspace repo's commit holds (${read ? `git exited ${read.exitCode}: ${String(read.stdout ?? '').slice(0, 300)}` : 'the reader agent died'}), so nothing is pushed. Check the commit on ${workBranch} by hand, then run again`
        : lookedUp === null
          ? `${id}: could not tell whether the workspace carried ${settled.toLookUp.join(', ')} from before the increment, because ${workspaceInIncrement.listedIn ? `${carriedListFile()} could not be read` : 'tim build start named no file listing what it carried'}. Nothing is pushed. Check the commit on ${workBranch} by hand, then run again`
          : `${id}: the workspace repo's commit holds ${leaked.join(', ')}, which ${leaked.length === 1 ? 'is' : 'are'} not this increment's. Nothing is pushed: take ${leaked.length === 1 ? 'it' : 'them'} out of the commit on ${workBranch} by hand, then run again`
      log(`${id}: LAND LEAKED — ${detail}`)
      results.push({ id, ticket: ticket?.key, branch: workBranch, outcome: 'land-leaked', commit: land.commit, detail, findings: findingCounts() })
      stopped = { reason: 'land-leaked', detail }
      break
    }
  }

  if (!land || !land.landed) {
    results.push({
      ...(await preserveAttempt({
        ...attempt,
        phaseName: 'Land',
        reason: 'the land stage could not commit it',
        evidence: land?.summary ?? 'the land agent died',
        outcome: 'land-failed',
        detail: land?.summary ?? 'agent failed'
      })),
      findings: findingCounts()
    })
    stopped = { reason: 'land-failed', detail: `${id}: ${land?.summary ?? 'agent failed'}` }
    break
  }

  if (IS_BRANCH && !land.pushed) {
    log(`${id}: PUSH FAILED — ${land.summary}`)
    results.push({ id, branch: workBranch, outcome: 'push-failed', commit: land.commit, detail: land.summary, findings: findingCounts() })
    stopped = { reason: 'push-failed', detail: `${id}: ${land.summary}` }
    break
  }

  specPrefixesOfRow = {
    planned: plan.specPrefixes ?? [],
    written: inPrefixOrder([...specPrefixesIn(impl.notes), ...specPrefixesIn(fixResult?.notes)])
  }
  }

  const findings = findingCounts()
  const judgementCalls = judgement.decisions.map((d) => `${d.call}: ${d.what}`)

  const prList = (list) => list.map((p) => `${p.repo}: ${p.url}`).join('\n')

  let prs = []
  let mainRunsGreenByJobs = []

  finish: {
    if (IS_BRANCH) {
      let ci = null
      let ciAttempt = 0

      if (repos.length > 0) {
        phase('Pull request')
        const found = await agent(
          findPrsPrompt(id, repos),
          light({ label: `${id} pr`, phase: 'Pull request', schema: BRANCH_PR_SCHEMA })
        )
        if (!found || !found.ok || (found.prs ?? []).length === 0) {
          const missing = found?.missing ?? []
          const reason = missing.length > 0 ? 'no-open-pr' : 'pr-failed'
          const detail =
            missing.length > 0
              ? `no open pull request for ${workBranch} in ${missing.join(', ')}, and this lifecycle never raises one. ${found.summary}`
              : found?.summary ?? 'agent failed'
          log(`${id}: PR STAGE FAILED (${reason}) — ${detail}`)
          results.push({ id, branch: workBranch, outcome: reason, detail, findings })
          stopped = { reason, detail: `${id}: ${detail}` }
          break
        }
        prs = found.prs
        log(`${id}: found ${prs.length} open PR(s) on ${workBranch} — ${prs.map((p) => p.url).join(' ')}`)

        if (rowAwaitsCi) {
          phase('CI')
          const watchOnBranch = () =>
            agent(
              branchWatchPrompt(id, prList(prs)),
              light({ label: `${id} ci watch`, phase: 'CI', schema: BRANCH_CI_SCHEMA })
            )

          ci = await watchOnBranch()
          while ((!ci || !ci.green) && !hardStop(ci) && ciAttempt < CI_FIX_ATTEMPTS) {
            ciAttempt += 1
            log(`${id}: CI RED — fix attempt ${ciAttempt} of ${CI_FIX_ATTEMPTS}`)
            const seen = ci
              ? (ci.failures ?? []).map((failure, index) => `${index + 1}. ${failure}`).join('\n') || ci.summary
              : 'the watcher agent died — go and read the checks yourself'
            const fix = await agent(
              branchCiFixPrompt(id, ciAttempt, prList(prs), seen, plan),
              code({ label: `${id} ci fix ${ciAttempt}`, phase: 'CI', schema: BRANCH_CI_FIX_SCHEMA })
            )
            await reviewThenStyleFixCiCommits({ id, attempt: ciAttempt, fix, branch: BASE_BRANCH, commitNames: `increment ${id}` })
            ci = await watchOnBranch()
          }

          if (ci?.stopReason === PR_CONFLICT) {
            const conflict = conflictStop(id, ci, workBranch, { prs: prs.map((p) => p.url), ciFixAttempts: ciAttempt, findings })
            results.push(conflict.result)
            stopped = conflict.stopped
            break
          }

          if (!ci || !ci.green) {
            const detail = ci
              ? [ci.blocked, ...(ci.failures ?? [])].filter((line) => line && line !== 'none').join(' | ')
              : 'ci watcher agent died'
            log(`${id}: CI STILL RED after ${ciAttempt} fix attempt(s) — stopping. PRs untouched: ${prs.map((p) => p.url).join(' ')}`)
            results.push({
              id,
              branch: workBranch,
              outcome: 'ci-red',
              stopReason: ci?.stopReason ?? 'not-set',
              prs: prs.map((p) => p.url),
              ciFixAttempts: ciAttempt,
              detail: detail || 'ci did not go green',
              findings
            })
            stopped = { reason: 'ci-red', detail: `${id}: ${detail || 'ci did not go green'}. PRs untouched: ${prs.map((p) => p.url).join(' ')}` }
            break
          }
        }
      }

      phase('Done')
      const doneOnBranch = await markDoneOnBranch(id, land?.commit)
      if (!doneOnBranch || !doneOnBranch.ok) {
        log(`${id}: NOT MARKED DONE — ${doneOnBranch ? doneOnBranch.summary : 'agent failed'}. The push stands.`)
        results.push({ id, branch: workBranch, outcome: 'done-failed', prs: prs.map((p) => p.url), detail: doneOnBranch?.summary ?? 'agent failed', findings })
        stopped = { reason: 'done-failed', detail: `${id}: ${doneOnBranch?.summary ?? 'agent failed'}. The push stands` }
        break
      }

      const ciOutcome = () => {
        if (repos.length === 0) return 'none: the row changes no backlog repo'
        if (!rowAwaitsCi) return 'not awaited: the row sets awaitCi false'
        return 'green'
      }

      built += 1
      results.push({
        id,
        branch: workBranch,
        outcome: 'landed',
        commit: land?.commit,
        prs: prs.map((p) => p.url),
        ci: ciOutcome(),
        leftUncommitted: workspaceEdits,
        findings,
        judgement: judgementCalls,
        followUps: plan?.followUps
      })
      log(
        `${id}: LANDED on ${workBranch}, CI ${ciOutcome()} — ${rawFindings.length} findings, ${confirmed.length} confirmed, ${judgement.fixNow.length} fixed${workspaceEdits.length ? `. Left uncommitted for the orchestrator: ${workspaceEdits.join(', ')}` : ''}`
      )
      break finish
    }

  if (resumeAt !== 'done') {
    phase('Pull request')

    const pr = await agent(
      `You are the PULL REQUEST STAGE for increment ${id} (${ticket.key}) on branch \`${workBranch}\`.
YOU RAISE AT MOST ONE PR PER REPO, AND ONLY IF THERE IS NOT ALREADY ONE FOR THIS BRANCH.
${guardrails()}
${PUSH_RULE}
${MERGE_ORDER_RULE}
REPOS, in order: ${repos.join(', ')}. These are the increment's repos and the ONLY ones this stage touches. Another
configured repo is not this increment's: leave it on whatever branch it is on, and never push it or raise a PR in it.
GitHub repos: ${repos.map((key) => `${key}=${GH_REPO[key]}`).join(', ')}. Repo paths: ${repos.map((key) => `${key}=${REPO_PATH[key]}`).join(', ')}.
<repo> below is the repo's key from that list, never its GitHub name.
${repos.includes(TESTS_KEY) ? testsImageFirstRule(id, workBranch) : ''}

For EACH of those repos, in that order${repos.includes(TESTS_KEY) ? ` — except that ${TESTS_KEY}, when it has commits, goes through every step first and then waits for its image by TESTS REPO FIRST above` : ''}:
1. Prove the repo is on the work branch before you push a thing:
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\` MUST print \`${workBranch}\`. If it prints
   \`${BASE_BRANCH}\`, report ok:false naming the repo — the branch stage did not cover this repo and pushing
   from here would put the increment's commits on the base branch.
2. HAS THIS REPO ANYTHING TO SAY? \`git -C ${TILDE}/<repoPath> rev-list --count origin/${BASE_BRANCH}..HEAD\`
   - \`0\` → the increment branched this repo but changed nothing in it. SKIP IT: no push, no PR, no backlog
     entry. Say so in your summary and move to the next repo. This is normal and is not a failure — repos are
     listed generously so they get branched, because a repo left on \`${BASE_BRANCH}\` is the dangerous one.
   - anything else → carry on.
3. \`git -C ${TILDE}/<repoPath> push -u origin refs/heads/${workBranch}:refs/heads/${workBranch}\` — never
   \`--force\`, and never the short \`push origin ${workBranch}\` form. If the push is rejected as
   non-fast-forward, report ok:false naming the repo; a diverged branch needs a human.
4. LOOK FOR AN EXISTING PR FIRST. One command:
   \`gh pr list --repo <ghRepo> --head ${workBranch} --state all --json number,url,state,title\`
   - It returns an OPEN pr → REUSE IT. Do not create anything. raised:false.
   - It returns only a MERGED or CLOSED pr → report ok:false. A merged branch being re-pushed means the
     lifecycle is out of step and a new PR would hide that.
   - It returns nothing → create one:
     a. Write the body with the Write tool to ${WORKAREA}/logs/${id}-pr-<repo>.md. It says what changed, names
        the increment id and the ticket, and for an increment across several repos names the sibling repos and
        states the merge order and why. Plain GitHub markdown here — a PR body is markdown, unlike the Jira ticket.
     b. \`gh pr create --repo <ghRepo> --base ${BASE_BRANCH} --head ${workBranch} --title "${ticket.key} <the increment title>" --body-file ${WORKAREA_TILDE}/logs/${id}-pr-<repo>.md\`
     raised:true.
5. **IMMEDIATELY** persist it: \`${setRow(id, `--pr '{"repo":"<repo>","url":"<url>","number":<n>}'`)}\`.
   It adds the PR, or merges these fields into the entry already recorded with that url. Do this after EACH
   repo, not once at the end: a run that dies between two PRs must not lose the first.

Report every PR in prs\[\], in the same order. Report ok:true only when every repo that had commits ahead of
\`${BASE_BRANCH}\` has exactly one open PR, and every repo you skipped at step 2 genuinely had none. At least one
PR must exist — a run where EVERY repo was empty means nothing was built, and that is ok:false.
Return the structured output only.`,
      light({ label: `${id} pr`, phase: 'Pull request', schema: PR_SCHEMA })
    )

    if (!pr || !pr.ok || (pr.prs ?? []).length === 0) {
      log(`${id}: PR STAGE FAILED — ${pr ? pr.summary : 'agent failed'}`)
      results.push({ id, ticket: ticket.key, outcome: 'pr-failed', detail: pr?.summary ?? 'agent failed', findings })
      stopped = { reason: 'pr-failed', detail: `${id}: ${pr?.summary ?? 'agent failed'}` }
      break
    }

    prs = [...pr.prs]
    log(`${id}: ${prs.length} PR(s) — ${prs.map((p) => p.url).join(' ')}`)

    phase('CI')

    const watch = () =>
      agent(
        `You are the CI WATCHER for increment ${id} (${ticket.key}). WAIT for the checks on every PR below to
resolve, and report what they did. You change no code and you merge nothing.
${guardrails()}
THE PULL REQUESTS:
${prList(prs)}

${PR_CONFLICT_STEP} A PR whose \`mergeable\` stays UNKNOWN after 10 reads: go on and watch its checks.

Then, for EACH pr, in the order listed:
1. BLOCK on it. One Bash call, with the tool's \`timeout\` parameter set to 600000:
   \`gh pr checks <url> --watch --fail-fast --interval 30 > ${WORKAREA_TILDE}/logs/${id}-ci-<repo>.log 2>&1\`
2. Read that log ONCE.
   - The command exited zero and the log shows every check passing → that PR is green.
   - It exited non-zero → that PR is RED. Put one line per failing check in failures\[\], naming the check and
     what it actually said.
   - The Bash call hit its timeout → the run has NOT resolved. Repeat step 1. You may do this at most
     ${CI_WATCH_WINDOWS} times per PR in total. Still unresolved after that → state "unresolved", and it counts
     as RED, never as green.
   - \`gh\` reports that the PR has NO checks configured → state "unresolved", green:false, and put
     "no checks configured on <repo>" in blocked. Merging on an absence of evidence is not merging on green.
3. For a RED check, name the failing job precisely enough for a fixer to act. Get the detail with
   \`gh run view <run-id> --repo <ghRepo> --log-failed\`, redirected to a log you read once. Where the failing
   job is Playwright, say so — its real evidence is \`test-results/*/error-context.md\`, not the run output.

\`blocked\` is ONLY for something a code fix cannot address — a conflict with the base, no checks configured, \`gh\`
refused, the PR is gone. Setting it stops the run outright. A failing test is NOT blocked: it is a red check, and a fixer gets it.
green:true ONLY if EVERY pr resolved green. Report each pr's state as green, red or unresolved.
Return the structured output only.`,
        light({ label: `${id} ci watch`, phase: 'CI', schema: CI_SCHEMA })
      )

    let ci = await watch()

    let ciAttempt = 0
    while ((!ci || !ci.green) && !hardStop(ci) && ciAttempt < CI_FIX_ATTEMPTS) {
      ciAttempt += 1
      log(`${id}: CI RED — fix attempt ${ciAttempt} of ${CI_FIX_ATTEMPTS}`)

      const fix = await agent(
        `You are the CI FIXER for increment ${id} (${ticket.key}), attempt ${ciAttempt} of ${CI_FIX_ATTEMPTS}.
CI is red on \`${workBranch}\`. Fix the CODE and push. You do not merge and you do not close anything.
${guardrails()}${ciFixerWorkspaceRule()}
${HOUSE_RULES_TO_WRITE}
${ciFixStandards(plan)}
${PUSH_RULE}${testsImageFirstRule(id, workBranch)}
${readIncrement(id)}
THE PULL REQUESTS:
${prList(prs)}
WHAT THE WATCHER SAW:
${ci ? (ci.failures ?? []).map((f, i) => `${i + 1}. ${f}`).join('\n') || ci.summary : 'the watcher agent died — go and read the checks yourself'}

TASK:
1. READ THE ACTUAL FAILURE, not a summary of it. \`gh pr checks <url> --repo <ghRepo>\` names the failing run;
   \`gh run view <run-id> --repo <ghRepo> --log-failed > ${WORKAREA_TILDE}/logs/${id}-ci-fail-${ciAttempt}.log 2>&1\`
   gives you the log. Read that file ONCE.
   **For a Playwright failure the evidence is \`test-results/*/error-context.md\` in the repo, NOT the tail of the
   run log.** Go and read those files.
2. Fix the code. Never weaken, skip or delete a test to get green. Never disable a check. If the failure is a
   known-flaky journey spec with a transient 500 in beforeEach, say so explicitly and re-run rather than editing.
3. Prove it locally with the narrowest suite that covers the failure, to a log under ${WORKAREA_TILDE}/logs/,
   read once.
4. PUT THE REPO ON THE BRANCH BEFORE YOU COMMIT — and read this even if you are sure it already is.
   The repo you are fixing may be one the BRANCH STAGE never touched: it only branched the repos the increment
   declared, and a fix that lands somewhere else arrives here with that repo still sitting on \`${BASE_BRANCH}\`.
   Committing there and pushing is how this loop once put an unreviewed commit on the tests repo's main.
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`
   - It prints \`${workBranch}\` → good, carry on.
   - It prints anything else → your changes are uncommitted in the working tree and travel with a checkout, so:
     \`git -C ${TILDE}/<repoPath> fetch origin\`, then does the branch exist?
     \`git -C ${TILDE}/<repoPath> ls-remote --heads origin ${workBranch}\`
     - Remote has it → \`git -C ${TILDE}/<repoPath> checkout -b ${workBranch} --track origin/${workBranch}\`
     - It does not → \`git -C ${TILDE}/<repoPath> checkout -b ${workBranch} --no-track origin/${BASE_BRANCH}\`
       \`--no-track\` is mandatory — see HOW TO PUSH above for what it prevents.
     Then re-run \`rev-parse --abbrev-ref HEAD\` and confirm it now prints \`${workBranch}\` before going on.
5. Commit on \`${workBranch}\` with a conventional message naming ${ticket.key}, then
   \`git -C ${TILDE}/<repoPath> push -u origin refs/heads/${workBranch}:refs/heads/${workBranch}\` — never
   \`--force\`, and never the short \`push origin ${workBranch}\` form.
6. **IF YOUR FIX TOUCHED A REPO THAT IS NOT IN THE PULL REQUESTS ABOVE, IT NEEDS A PR OF ITS OWN, AND YOU MUST
   REGISTER IT.** A frontend change whose fix lands in the tests repo is the ordinary case, not an exception.
   An unregistered PR is invisible to the watcher and to the merge stage, so the increment merges one repo,
   calls itself done, and silently leaves the other open — which has happened. Worse has happened: the same repo,
   left on \`${BASE_BRANCH}\` because it was never branched, took the commit directly onto the base branch and
   there was no PR to leave open. Step 4 is what stops that; do not skip it for a repo you are adding here.
   Use the SAME branch name \`${workBranch}\` (CLAUDE.md rule 2, cross-repo branch parity). Repo paths:
   ${repoTable}. GitHub repos: ${ghTable}. For each such repo:
   a. Confirm it is on \`${workBranch}\` — \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\` — and if it
      is not, put it there by step 4's method before anything else. Then
      \`git -C ${TILDE}/<repoPath> push -u origin refs/heads/${workBranch}:refs/heads/${workBranch}\` — never
      \`--force\`, never the short form.
   b. Look for an existing PR first:
      \`gh pr list --repo <ghRepo> --head ${workBranch} --state all --json number,url,state\`
      An OPEN one → reuse it, do not create a second. A MERGED or CLOSED one → report ok:false; the lifecycle
      is out of step and a new PR would hide that.
   c. Nothing there → write the body to ${WORKAREA_TILDE}/logs/${id}-pr-<repo>.md saying what broke, what you
      changed and which increment and ticket it belongs to, then
      \`gh pr create --repo <ghRepo> --base ${BASE_BRANCH} --head ${workBranch} --title "${ticket.key} <what you fixed>" --body-file ${WORKAREA_TILDE}/logs/${id}-pr-<repo>.md\`
   d. **IMMEDIATELY** persist it: \`${setRow(id, `--pr '{"repo":"<repo>","url":"<url>","number":<n>}'`)}\`.
      Do this per repo, not once at the end.
   e. Report it in \`newPrs\[\]\`. Both matter: the backlog is what a resume reads, \`newPrs\` is what the rest of
      THIS run reads. Skipping either one is how a PR gets left behind.
7. If you cannot work out what is failing, or the fix would need work outside this increment's scope, report
   ok:false saying exactly that. An honest refusal is worth more than a speculative push.
Return the structured output only.`,
        code({ label: `${id} ci fix ${ciAttempt}`, phase: 'CI', schema: CI_FIX_SCHEMA })
      )
      const styleFix = await reviewThenStyleFixCiCommits({
        id,
        attempt: ciAttempt,
        fix,
        branch: workBranch,
        commitNames: ticket.key,
        workspaceRule: ciFixerWorkspaceRule()
      })

      for (const p of [...(fix?.newPrs ?? []), ...(styleFix?.newPrs ?? [])]) {
        if (p?.url && !prs.some((existing) => existing.url === p.url)) {
          prs.push(p)
          log(`${id}: CI fixer opened ${p.repo} ${p.url} — added to this increment's PRs`)
        }
      }

      ci = await watch()
    }

    if (ci?.stopReason === PR_CONFLICT) {
      const conflict = conflictStop(id, ci, workBranch, { ticket: ticket.key, prs: prs.map((p) => p.url), ciFixAttempts: ciAttempt, findings })
      results.push(conflict.result)
      stopped = conflict.stopped
      break
    }

    if (!ci || !ci.green) {
      const detail = ci ? [ci.blocked, ...(ci.failures ?? [])].filter((x) => x && x !== 'none').join(' | ') : 'ci watcher agent died'
      log(`${id}: CI STILL RED after ${ciAttempt} fix attempt(s) — stopping. PRs left open: ${prs.map((p) => p.url).join(' ')}`)
      results.push({
        id,
        ticket: ticket.key,
        outcome: 'ci-red',
        prs: prs.map((p) => p.url),
        ciFixAttempts: ciAttempt,
        detail: detail || 'ci did not go green',
        findings
      })
      stopped = { reason: 'ci-red', detail: `${id}: ${detail || 'ci did not go green'}. PRs left open: ${prs.map((p) => p.url).join(' ')}` }
      break
    }

    phase('Merge')

    const mergeOrder = sortForMerge(prs, repos)
    log(`${id}: merge order ${mergeOrder.map((p) => p.repo).join(' → ')}`)

    const gatedPrs = mergeOrder.filter((pr) => REQUIRE_APPROVAL || approvalRepos.includes(pr.repo))
    const approvalGate = gatedPrs.length > 0
    const everyPrGated = gatedPrs.length === mergeOrder.length
    const gatedPrsNoun = everyPrGated ? 'pr above' : 'pr under NEEDS APPROVAL'
    if (approvalGate && !everyPrGated) log(`${id}: approval needed before any merge from ${gatedPrs.map((p) => p.repo).join(', ')}`)

    const merge = await agent(
      `You are the MERGE STAGE for increment ${id} (${ticket.key}). Every PR below is green${approvalGate ? `, which is
necessary but NOT sufficient — ${everyPrGated ? 'every one of them' : `the ${gatedPrs.map((p) => p.repo).join(', ')} PR${gatedPrs.length === 1 ? '' : 's'}`} also needs an approving review on GitHub, and you collect ALL of
those BEFORE you merge ANYTHING` : ''}.
Merge them and prove \`${BASE_BRANCH}\` survived it.
${guardrails()}
${MERGE_ORDER_RULE}
THE PULL REQUESTS, in merge order:
${prList(mergeOrder)}${
  approvalGate && !everyPrGated
    ? `
NEEDS APPROVAL — a person must approve each of these before ANY pr above merges, the others included. The others need
no approval of their own, but they wait for these:
${prList(gatedPrs)}`
    : ''
}
${
  approvalGate
    ? `
STEP A — THE APPROVAL SWEEP. Do this for EVERY ${gatedPrsNoun} BEFORE you merge a single pr.
**This is a whole-increment gate, not a per-PR one.** It runs first because it used to run per-PR inside the merge
loop, and that merged an approved frontend while its sibling tests PR was still waiting on a reviewer — half an
increment on \`${BASE_BRANCH}\`, stale specs against a shipped UI, and CDP red. Nothing auto-reverted it.
Green CI is not consent either: it proves the code runs, not that a person agreed to it.

For EACH ${gatedPrsNoun}, read its decision — this changes nothing, so the order does not matter here:
   \`gh pr view <url> --repo <ghRepo> --json reviewDecision,reviews\`
   - \`APPROVED\` → that one is satisfied. Go on to the next pr.
   - \`CHANGES_REQUESTED\` → **STOP IMMEDIATELY, before merging anything.** Report green:false,
     \`stopReason: "changes-requested"\`, and blocked "<repo> PR has changes requested".
     Leave every PR open. Do NOT merge the others, do NOT dismiss the review, and do NOT push a fix — a reviewer
     asked for something and answering them is a human's job, not this stage's.
   - anything else, including empty (\`REVIEW_REQUIRED\`, or no reviews yet) → nobody has looked at that one yet.

If any pr is still unapproved after that pass, WAIT: re-read the unapproved ones with the same command, up to
${APPROVAL_POLLS} times, sleeping 120 seconds between checks via \`sleep 120\`, until every ${gatedPrsNoun} reports
\`APPROVED\` — or any one of them reports \`CHANGES_REQUESTED\`, which stops you as above.
   - every ${gatedPrsNoun} \`APPROVED\` → the gate is satisfied for the whole increment. Go to STEP B.
   - still short after ${APPROVAL_POLLS} checks → **STOP, and this is not a failure.** Report green:false,
     \`stopReason: "awaiting-approval"\`, and blocked "<repo> PR is green and awaiting approval: <url>" naming
     EVERY pr still unapproved. **Merge nothing** — not even the ones that are approved. Leave them all open and
     untouched. Somebody will approve them and the increment resumes from its \`prs\` field on the next run,
     re-entering here with the approvals already in place.

NEVER merge a ${gatedPrsNoun} whose reviewDecision you have not just read and seen to be \`APPROVED\`, and never merge any PR
of this increment while a sibling is unapproved. Do not approve one yourself, do not ask anyone to, and do not
work around the gate by any other route — GitHub refuses a self-approval and defeating that refusal is never this
stage's business.

STEP B — THE MERGES. Only now, and only with every approval in hand. For EACH pr, in the merge order listed:`
    : `
For EACH pr, in that order:`
}
1. If this is not the first pr, RE-CHECK IT FIRST — merging the previous one moved \`${BASE_BRANCH}\` underneath
   it. \`gh pr checks <url> --watch --fail-fast --interval 30\`, Bash \`timeout\` 600000, at most
   ${CI_WATCH_WINDOWS} times. **If it is now RED, STOP.** Report green:false, \`stopReason: "pr-red"\`, name it
   in blocked as
   "<repo> PR went red after <previous repo> merged", and leave BOTH the merged commit and this open PR exactly
   as they are. Do NOT revert the merge, do NOT close the PR, do NOT force anything through. A revert is a
   human's call.
2. Confirm it is mergeable and green:
   \`gh pr view <url> --repo <ghRepo> --json mergeable,mergeStateStatus,statusCheckRollup\`
   Anything other than a clean, green, mergeable PR stops you, with \`stopReason: "not-mergeable"\`. NEVER
   merge a red PR, under any circumstance.${
     approvalGate
       ? `
   ${everyPrGated ? 'Re-read' : 'For a pr under NEEDS APPROVAL, re-read'} its \`reviewDecision\` in the same call and confirm it is still \`APPROVED\` — a review can be
   dismissed between STEP A and here. Anything else stops you with \`stopReason: "awaiting-approval"\`.`
       : ''
   }
3. \`gh pr merge <url> --repo <ghRepo> --squash --delete-branch\`
4. Get the merge commit: \`gh pr view <url> --repo <ghRepo> --json mergeCommit\`
5. WATCH \`${BASE_BRANCH}\` for that commit — a green PR can still break the base branch.
   a. WHICH WORKFLOWS THE MERGE STARTS. A workflow's push trigger can filter on branches and paths, so a merge
      that touches none of its paths starts no run at all. Ask tim, from the repo's own workflow files:
      \`git -C ${TILDE}/<repoPath> fetch origin ${BASE_BRANCH}\`, then
      \`tim build push-workflows ${TILDE}/<repoPath> --commit <sha> --branch ${BASE_BRANCH} --workspace ${TILDE} --json > ${WORKAREA_TILDE}/logs/${id}-push-workflows-<repo>.json 2>&1\`
      and read that file once. \`result.starts\` names every workflow the merge starts, as \`gh run list\` names
      its runs (workflowName); \`result.workflows\` gives each workflow's reason.
   b. THE RUNS: \`gh run list --repo <ghRepo> --branch ${BASE_BRANCH} --commit <sha> --json databaseId,workflowName,status,conclusion --limit 20\`
   c. For each run it names, BLOCK on it with the tool's \`timeout\` set to 600000:
      \`gh run watch <run-id> --repo <ghRepo> --exit-status > ${WORKAREA_TILDE}/logs/${id}-main-<repo>.log 2>&1\`
      At most ${CI_WATCH_WINDOWS} watches per run. A run's own status can stay in progress after its jobs have
      finished, so a run still unresolved after that gets one more check, of its jobs:
      \`gh api repos/<ghRepo>/actions/runs/<run-id>/jobs?filter=latest > ${WORKAREA_TILDE}/logs/${id}-main-<repo>-<run-id>-jobs.json 2>&1\`
      then, with the run's workflow file from \`result.workflows\` in step a (the entry whose \`name\` is the run's
      workflowName):
      \`tim build run-jobs ${TILDE}/<repoPath> --commit <sha> --workflow <file> --jobs ${WORKAREA_TILDE}/logs/${id}-main-<repo>-<run-id>-jobs.json --workspace ${TILDE} --json > ${WORKAREA_TILDE}/logs/${id}-main-<repo>-<run-id>-run-jobs.json 2>&1\`
      and read that file once. \`result.green\` true → every job has passed and every job the workflow defines has
      one, so count that run green and put it in jobsGreen\[\] as { repo, runId, workflow, jobs } with \`result.jobs\`.
      Anything else → the run is still unresolved, and that counts as RED.
      **If \`${BASE_BRANCH}\` goes RED, STOP.** Report green:false, \`stopReason: "base-branch-red"\`, put "the
      base branch went red after merging
      <repo>" in blocked, and put the failing job in failures\[\]. Do NOT auto-revert and do NOT push a fix — the
      base branch being red is a human decision, not a repair job.
   d. EVERY workflow in \`result.starts\` must have a run in that list. One missing means GitHub has not started it
      yet: run the list in b again, at most 5 times in all, and watch each new run by c. Still missing after that,
      or tim refused (\`ok:false\`) and the list is empty → **STOP.** Report green:false,
      \`stopReason: "base-branch-unverified"\`, with "<repo> merge commit <sha> should start <workflow> on
      ${BASE_BRANCH} and no run of it exists" (or tim's error, word for word) in blocked. Never call it green.
   e. The list is empty AND \`result.starts\` is empty → this merge starts no workflow on \`${BASE_BRANCH}\`: there is
      nothing to watch and nothing that can go red, so that repo's base branch counts as green. Put it in
      untriggered\[\] as { repo, sha, why }, where why gives each workflow's reason from \`result.workflows\`.
      This is the ONLY way an empty run list counts as green.
6. Persist it: \`${setRow(id, `--pr '{"url":"<url>","merged":true,"sha":"<merge sha>"}'`)}\`. Do this after EACH merge.

FINAL SWEEP, after the last merge and before you report. **The list above is not proof that it is the whole
increment.** A CI fixer may have opened a PR in another repo, and if anything went wrong when it registered
that PR you would never see it here. So go and look, rather than trusting this list. For EACH of
${Object.values(GH_REPO).join(', ')}:
   \`gh pr list --repo <ghRepo> --head ${workBranch} --state open --json number,url,title\`
Every one must come back empty. If ANY repo still has an open PR on \`${workBranch}\`:
**STOP and report green:false**, \`stopReason: "pr-left-open"\`, with "<repo> still has an open PR on this
branch: <url>" in blocked. Do NOT merge it yourself — it has not been through the watcher or the approval
gate in this run, and merging an unvetted PR to clear a warning is worse than the warning. Leave everything
as it is and name it, so a human can finish it.

green:true ONLY if every pr merged, ${BASE_BRANCH} went green afterwards for every one of them (or, by step 5c, every
job of a run still showing in progress had passed; or, by step 5e, the merge started no workflow there), AND the final sweep found no open PR left on \`${workBranch}\` in any repo.
Return the structured output only.`,
      light({ label: `${id} merge`, phase: 'Merge', schema: MERGE_SCHEMA })
    )

    if (!merge || !merge.green) {
      const detail = merge ? [merge.blocked, ...(merge.failures ?? [])].filter((x) => x && x !== 'none').join(' | ') : 'merge agent died'
      const stopReason = merge?.stopReason
      const atGate = stopReason === 'awaiting-approval' || stopReason === 'changes-requested'
      const leftOpen = stopReason === 'pr-left-open'
      const outcome = atGate || leftOpen ? stopReason : 'main-red'
      log(
        atGate
          ? `${id}: STOPPED AT THE APPROVAL GATE (${stopReason}) — ${detail}`
          : leftOpen
            ? `${id}: PARTLY MERGED — a PR on ${workBranch} is still open: ${detail}`
            : `${id}: MERGE/BASE-BRANCH STOP${stopReason ? ` (${stopReason})` : ' (stopReason not set)'} — ${detail}`
      )
      results.push({
        id,
        ticket: ticket.key,
        outcome,
        stopReason: stopReason ?? 'not-set',
        prs: prs.map((p) => p.url),
        merged: merge?.merged ?? [],
        detail: detail || 'the merge stage did not reach green',
        findings
      })
      stopped = { reason: outcome, detail: `${id}: ${detail || 'the merge stage did not reach green'}` }
      break
    }

    log(`${id}: merged ${(merge.merged ?? []).map((m) => `${m.repo}=${m.sha}`).join(' ')} — ${BASE_BRANCH} green`)
    for (const { repo, sha, why } of merge.untriggered ?? []) {
      log(`${id}: ${repo} merge ${sha} started no workflow on ${BASE_BRANCH}, so there was no run to watch — ${why}`)
    }
    mainRunsGreenByJobs = merge.jobsGreen ?? []
    for (const { repo, runId, workflow } of mainRunsGreenByJobs) {
      log(`${id}: ${repo} ${workflow} run ${runId} on ${BASE_BRANCH} still showed in progress, but every job in it had passed, so it counts as green`)
    }
  }

  phase('Done')

  const done = await agent(
    `Increment ${id} is merged into \`${BASE_BRANCH}\` and the base branch is green. Close out ${ticket.key}.
${guardrails()}
TASK — this board's finished status is \`${STATUS_DONE}\`. That name is CONFIGURATION, given to you here.
1. \`${jiraTransition(ticket.key, `"${STATUS_DONE}"`)}\`.
   If it reports that status is not available, run \`${jiraTransition(ticket.key, '--list')}\` and
   report ok:false with BOTH the status you were asked for — \`${STATUS_DONE}\` — AND the full list of
   transitions the board actually offers, so the config fix is obvious from your report alone.
   Do NOT guess a nearby status, do NOT pick one off the list yourself, and do NOT edit the ticket some
   other way.
2. Confirm it landed: \`tim jira ticket ${ticket.key} --workspace ${TILDE} --json\` must now show \`result.status\` \`${STATUS_DONE}\`.
3. Mark it done: \`${setRow(id, '--status done')}\`. It leaves \`ticket\`, \`branch\`, \`commit\` and \`prs\` in place —
   they are the record of how it got there.
Return the structured output only.`,
    light({ label: `${id} done`, phase: 'Done', schema: incrementSchema })
  )

  const workspaceBack = buildsWorkspace() ? await returnWorkspaceToBase(id, workBranch) : { ok: true }

  if (!done || !done.ok) {
    log(`${id}: TICKET NOT MOVED TO "${STATUS_DONE}" — ${done ? done.summary : 'agent failed'}. The merge stands.`)
    results.push({
      id,
      ticket: ticket.key,
      outcome: 'done-failed',
      prs: prs.map((p) => p.url),
      detail: done?.summary ?? 'agent failed',
      findings
    })
    stopped = { reason: 'done-failed', detail: `${id}: ${done?.summary ?? 'agent failed'}. The merge stands` }
    break
  }

  built += 1

  results.push({
    id,
    ticket: ticket.key,
    branch: workBranch,
    outcome: 'landed',
    commit: land?.commit,
    prs: prs.map((p) => p.url),
    ...(mainRunsGreenByJobs.length > 0 ? { mainRunsGreenByJobs } : {}),
    findings,
    judgement: judgementCalls,
    followUps: plan?.followUps
  })

  log(`${id}: LANDED ${ticket.key} merged to ${BASE_BRANCH}, ticket "${STATUS_DONE}" — ${rawFindings.length} findings, ${confirmed.length} confirmed, ${judgement.fixNow.length} fixed`)

  if (!workspaceBack.ok) {
    stopped = { reason: 'workspace-not-on-base', detail: workspaceBack.detail }
    break
  }
  }

  const gate = await agent(
    `Report whether increment ${id} carries a halt gate. Run exactly one command and read it:
\`jq -r '.increments[] | select(.id=="${id}") | .gate' ${BACKLOG_TILDE}\`
If it prints \`null\`, return ok:true with summary "no gate". Otherwise return ok:false and put the gate's full text
in summary.
Do not do anything else. One Bash call, no Grep/Glob tools, tilde paths only.
${RUN_WITH_BASH}`,
    light({ label: `${id} gate check`, phase: 'Done', schema: incrementSchema })
  )

  landedSpecPrefixes.set(id, specPrefixesOfRow)
  const themeCheck = await themeSpecCheck(id)
  if (themeCheck) specChecks.push(themeCheck.record)
  if (themeCheck?.themeRefuted?.length > 0) {
    log(`${id}: theme ${themeCheck.record.theme} is built with ${themeCheck.themeRefuted.length} refuted finding(s) — listed for its review`)
    reviewChecks.push(themeRefutedCheck(id, themeCheck.record.theme, themeCheck.themeRefuted))
  }
  const builtTheme = IS_BRANCH ? themeCheck?.record.theme : null
  if (builtTheme) themeReviewsRun += 1
  const themeReview = builtTheme ? await engineeringReviewOfTheme(id, builtTheme, rowGatePhases) : null
  reviewChecks.push(...(themeReview?.checks ?? []))
  const themeStop = themeReview?.stop
    ? { ...themeReview.stop, detail: [themeReview.stop.detail, themeCheck?.stop?.detail].filter(Boolean).join('. Also: ') }
    : themeCheck?.stop

  const gated = Boolean(gate && !gate.ok)
  if (gated && IS_BRANCH) {
    log(`${id}: review check for the finished branch — ${gate.summary}`)
    reviewChecks.push({ id, check: gate.summary })
  }
  const halted = gated && !IS_BRANCH
  if (halted) {
    log(`${id}: HALT-FOR-REVIEW GATE — stopping the run. ${gate.summary}`)
    results.push({ id, ticket: ticket?.key, outcome: 'halted-at-gate', detail: gate.summary })
  }

  if (themeStop) {
    stopped = halted ? { ...themeStop, detail: `${themeStop.detail}. ${id} also carries a halt gate: ${gate.summary}` } : themeStop
    break
  }

  if (halted) {
    stopped = { reason: 'gate', detail: `${id}: ${gate.summary}` }
    break
  }
}
} finally {
  if (runMayHoldLease) {
    const released = await releaseRunLease()
    if (!released?.ok) {
      const why = (released?.summary ?? 'the release agent died').replace(/\.$/, '')
      const leftBehind = `The run's workspace stack lease could not be given back — ${why}. Give it back with \`tim docker lease release --holder "${RUN_HOLDER}"\``
      log(`${WORKFLOW_NAME}: ${leftBehind}`)
      if (stopped) stopped = { ...stopped, detail: `${stopped.detail.replace(/\.$/, '')}. ${leftBehind}` }
    }
  }
}

if (workspaceLeftOn) {
  stopped = { ...stopped, detail: `${stopped.detail.replace(/\.$/, '')}. ${workspaceStaysNote(workspaceLeftOn)}` }
}

log(`${WORKAREA_REL}: ${built} increment(s) landed — stopping: ${stopped.reason}. ${stopped.detail}`)

return { increments: results, specChecks, reviewChecks, refutedFindings, stopped }
