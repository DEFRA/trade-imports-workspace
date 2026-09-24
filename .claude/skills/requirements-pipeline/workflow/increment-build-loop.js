export const meta = {
  name: 'increment-build-loop',
  description:
    'Build backlog increments one at a time, each through a full ticket-to-merge lifecycle: raise the ticket → cut the branch → plan against the live tree → implement the plan → style review + code review → adversarially verify findings → judge → fix → the plan\'s ladder → commit → PR → CI → merge → close the ticket',
  whenToUse:
    'Running any increment backlog under workareas/ in the one backlog shape (fields defined in .claude/skills/requirements-pipeline/references/backlog.schema.json): each row is a requirement, and the loop plans the how just in time. One invocation drains the backlog, deriving its own next increment and building each one with a full multi-agent quality pass, until stopAfter increments have landed or something stops it. Pass the configuration as args, an object or a JSON string. Every key this workflow needs is required, and a missing one stops the run before any agent starts. planOnly:true writes the plan and stops. lifecycle:"full" runs the ticket-to-merge lifecycle; lifecycle:"branch" builds straight onto an existing long-lived branch with no Jira and no merge, finding the open PRs rather than raising them.',
  phases: [
    { title: 'Derive' },
    { title: 'Ticket' },
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
  ],
}

// ---------------------------------------------------------------------------
// Configuration comes only from args (an object, or a JSON string). There are
// no defaults: a missing key stops the run before any agent starts. Every
// increment runs the one pipeline: ticket → branch → build → PR → CI → merge →
// ticket done.
//   workarea        path under workareas/, holding backlog.json
//   increments      null to DRAIN the backlog: the run derives its own next
//                   increment with `tim backlog next` after each one lands, so
//                   one invocation builds as many as it can. Or a list of ids,
//                   built serially in the order given — an explicit override
//                   for a run that must build exactly those
//   stopAfter       how many increments may LAND before the run stops: a
//                   positive integer, or 'all'. It counts landings, not
//                   attempts, so a stopped attempt never uses one up
//   branch          under lifecycle 'full', the BASE branch: every increment
//                   cuts its own branch off this one and merges back into it.
//                   Under lifecycle 'branch', the WORKING branch itself: it
//                   already exists in every backlog repo, every increment is
//                   committed and pushed straight onto it, and main or master
//                   is refused
//   lifecycle       'full': ticket → branch → build → PR → CI → merge → ticket
//                   done. 'branch': assert the branch → build → push → find
//                   the open PR → CI → mark done. No Jira call of any kind, no
//                   branch created, no PR created or edited, nothing merged.
//                   A row may ask for a ref to be merged into a repo (its
//                   `merge` field) and name the gate phases it owes (its
//                   `gatePhases` field) and whether CI is awaited (`awaitCi`);
//                   only this lifecycle reads those three. The Jira keys,
//                   requireApproval and approvalWaitMinutes must be null here,
//                   because nothing reads them
//   scope           conventional-commit scope
//   executor        'claude' (every stage a subagent) or 'codex' (implement,
//                   review and fix delegated to Codex CLI via the briefs in codex/)
//   jiraProject     Jira project key raised tickets land in
//   epic            parent epic every raised ticket hangs off
//   jiraInProgressStatus  the board's working status, set when the build starts
//   jiraDoneStatus        the board's finished status, set after the merge
//   jiraBoard       the numeric board id raised tickets are moved onto. Board
//                   membership is NOT a field on the issue and NOT implied by
//                   status: a freshly raised ticket lands in the board's backlog
//                   and stays there, invisible to the team, however many times
//                   it is transitioned. Moving it is a separate agile call, and
//                   this is the id it needs
//   ciFixAttempts   how many times a red PR may be fixed and re-pushed before the
//                   run stops
//   ciWatchMinutes  how long one CI watch may block before it counts as RED
//   requireApproval whether EVERY PR of an increment needs an APPROVING REVIEW
//                   ON GITHUB before the merge stage may merge ANY of them.
//                   Green CI is not consent: it proves the code
//                   runs, not that anyone agreed to it. The gate is collected
//                   for the whole increment up front, not per PR as each one is
//                   reached — a per-PR gate merged an approved frontend and then
//                   stopped on its unapproved sibling in the tests repo, leaving
//                   half an increment on the base branch and CDP red. With this
//                   on, a run stops with every PR open rather than merging
//                   unapproved work, and resumes once someone approves.
//                   GitHub forbids approving your own PR, so the approver is
//                   always somebody other than whoever the run raised it as.
//                   Set false only for a programme that genuinely wants
//                   unattended merges
//   approvalWaitMinutes  how long the merge stage may wait for those approvals
//                   before it stops and leaves every PR open.
//   planOnly        true: plan each increment into <workarea>/plans/<id>.md and
//                   stop — no ticket, branch, baseline or build. false: the
//                   whole lifecycle. It needs an explicit `increments` list:
//                   planning a backlog you are not building has no end, because
//                   a plan does not change what `tim backlog next` returns
//   repos           the three repos an increment's "repos" list can name —
//                   frontend, backend, tests — each with its workspace-relative
//                   path and its GitHub owner/name slug. A programme in another
//                   repo family (the plants frontend and backend, say) names its
//                   own table here. Under lifecycle 'branch' the keys are
//                   whatever the backlog envelope's `repos` names (ins,
//                   animals, plants, tests, say), copied in full
//   models         required; {} inherits the session model for both tiers. heavy =
//                   implement, the reviewers, the adversarial verifiers, judge, fix
//                   and CI fix; light = the lifecycle and plumbing stages (ticket,
//                   branch, baseline, ladder, land, PR, CI watch, merge, done). A
//                   tier left out inherits it
//

// Status names are BOARD CONFIGURATION, not constants — every board words them
// differently and a workflow change renames them. They live here so a programme
// never has to edit a stage. Confirm them against the board itself with
// `tools/jira/transition-ticket.sh <ANY-KEY> --list`; the script's own --help
// text is generic placeholder wording and is not board truth.
//
// `jiraBoard` is the same kind of configuration. 13780 is the EUDPA board; a
// programme on another board must say so, and the run throws at startup if the
// id is missing rather than quietly leaving every ticket in the backlog.
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
  'jiraInProgressStatus',
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
const STATUS_IN_PROGRESS = CFG.jiraInProgressStatus
const STATUS_DONE = CFG.jiraDoneStatus
const JIRA_BOARD = CFG.jiraBoard
const CI_FIX_ATTEMPTS = CFG.ciFixAttempts
const CI_WATCH_MINUTES = CFG.ciWatchMinutes
const REQUIRE_APPROVAL = CFG.requireApproval
const APPROVAL_WAIT_MINUTES = CFG.approvalWaitMinutes
const PLAN_ONLY = CFG.planOnly
const STOP_AFTER = CFG.stopAfter

// One watch call blocks for at most ten minutes — the Bash tool's ceiling. A
// longer wait is that many consecutive watches, and running out of them is RED.
const CI_WATCH_WINDOWS = Math.max(1, Math.ceil(CI_WATCH_MINUTES / 10))

// Approval polls are cheap, so the window is a count of two-minute checks.
// Running out is NOT a failure — it means nobody has looked yet, and the PR is
// left open for them to.
const APPROVAL_POLLS = Math.max(1, Math.ceil(APPROVAL_WAIT_MINUTES / 2))

// The Workflow tool caps one run at 1000 agents over its whole lifetime. That
// is the tool's limit, not a programme's choice, so it is a constant here and
// not a config key. An increment is 23–35 agents on Claude and 29–41 on Codex,
// plus the one that derives it, so a drain of an open-ended backlog would hit
// the cap mid-increment and lose the attempt. The run stops before starting one
// that would not fit — roughly 27 increments on Claude, 23 on Codex — and
// resuming is launching the workflow again with the same args, because
// backlog.json already carries the status, ticket, branch and PRs.
const AGENT_CAP = 1000
const AGENTS_PER_INCREMENT = { claude: 36, codex: 42 }
const STARTUP_AGENTS = 2
const agentsThrough = (increments) => STARTUP_AGENTS + increments * AGENTS_PER_INCREMENT[EXECUTOR]

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

// Under the branch lifecycle nothing raises a ticket, moves a board or merges a
// PR, so these keys would govern nothing. They must still be passed, as null,
// so the args say plainly that the run has no Jira and no approval gate.
const UNUSED_ON_BRANCH_KEYS = [
  'jiraProject',
  'epic',
  'jiraInProgressStatus',
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
  if (EXECUTOR !== 'claude') {
    throw new Error(
      `${WORKFLOW_NAME}: lifecycle "branch" runs on executor "claude" only. The Codex briefs name the frontend, backend and tests repos, and a branch-lifecycle backlog names its own — got "${EXECUTOR}"`
    )
  }
}

if (!IS_BRANCH && (typeof EPIC !== 'string' || !/^[A-Z]+-\d+$/.test(EPIC))) {
  throw new Error(
    `increment-build-loop: config.epic is required — the parent epic every raised ticket hangs off, e.g. "${JIRA_PROJECT}-20628". Got "${EPIC}"`
  )
}
if (!IS_BRANCH && (typeof STATUS_IN_PROGRESS !== 'string' || !STATUS_IN_PROGRESS.trim() || typeof STATUS_DONE !== 'string' || !STATUS_DONE.trim())) {
  throw new Error(
    `increment-build-loop: config.jiraInProgressStatus and config.jiraDoneStatus must both name a real status on the board. Confirm them with \`tools/jira/transition-ticket.sh <ANY-KEY> --list\`. Got "${STATUS_IN_PROGRESS}" and "${STATUS_DONE}"`
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

// ---------------------------------------------------------------------------
// Repos. An increment is a full-stack slice and lists the repos it touches in
// "repos"; this table says where each one lives on disk and on GitHub. All
// three keys are required so every stage's REPO PATHS line reads the same
// whichever repo family the programme builds in.
// ---------------------------------------------------------------------------
// Under the branch lifecycle the keys are whatever the backlog envelope names.
// They must be plain lower-case words, because a changed file is written
// `<repoKey>:<path>` and routed back to its repo by that prefix. `workspace`
// is reserved: it names the workspace repo itself, where a docs row writes.
const REPOS = CFG.repos
const FULL_REPO_KEYS = ['frontend', 'backend', 'tests']
const WORKSPACE_KEY = 'workspace'
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

if (IS_BRANCH) {
  const keys = isPlainObject(REPOS) ? Object.keys(REPOS) : []
  const badKeys = keys.filter((key) => !/^[a-z]+$/.test(key) || key === WORKSPACE_KEY)
  if (keys.length === 0 || badKeys.length > 0) {
    throw new Error(
      `${WORKFLOW_NAME}: config.repos must map at least one repo key to its "path" and "github", copied from the backlog envelope's repos. Each key is a lower-case word other than "${WORKSPACE_KEY}" — got ${JSON.stringify(REPOS)}`
    )
  }
}

const REPO_KEYS = IS_BRANCH ? Object.keys(REPOS) : FULL_REPO_KEYS

for (const key of REPO_KEYS) {
  const entry = REPOS?.[key]
  const pathOk = typeof entry?.path === 'string' && /^repos\/[^/]+$/.test(entry.path)
  const githubOk = typeof entry?.github === 'string' && /^[^/\s]+\/[^/\s]+$/.test(entry.github)
  if (!pathOk || !githubOk) {
    throw new Error(
      `increment-build-loop: config.repos.${key} must give a workspace-relative "path" like "repos/trade-imports-animals-${key}" and a "github" owner/name slug like "DEFRA/trade-imports-animals-${key}" — got ${JSON.stringify(entry)}`
    )
  }
}

// ---------------------------------------------------------------------------
// Models. The key itself is required ({} to inherit the session model for
// both); each tier is optional. heavy() and light() wrap an agent's options so
// a stage inherits the session model unless the programme set its tier.
// ---------------------------------------------------------------------------
const MODELS = CFG.models
if (MODELS === null || typeof MODELS !== 'object' || Array.isArray(MODELS)) {
  throw new Error(`${WORKFLOW_NAME}: config.models must be an object, {} to inherit the session model for both tiers — got ${JSON.stringify(MODELS)}`)
}
const MODEL_TIERS = ['heavy', 'light']

for (const tier of MODEL_TIERS) {
  const model = MODELS[tier]
  if (model !== undefined && (typeof model !== 'string' || !model.trim())) {
    throw new Error(`increment-build-loop: config.models.${tier} must be a model name or left out — got ${JSON.stringify(model)}`)
  }
}

const withTier = (tier) => (opts) => (MODELS[tier] ? { ...opts, model: MODELS[tier] } : opts)
const heavy = withTier('heavy')
const light = withTier('light')

// ---------------------------------------------------------------------------
// Workspace root. A workflow script has no filesystem and no environment, so it
// cannot see $HOME — an agent resolves the root and everything else hangs off
// what it returns. Nothing here may be a literal home directory: the run has to
// work on whichever machine picks the programme up.
// ---------------------------------------------------------------------------
// The first is canonical (CLAUDE.md rule 1). The other two are the names this
// workspace had before it was renamed, kept so a machine still carrying the old
// clone or symlink resolves rather than throwing.
const WORKSPACE_CANDIDATES = [
  '~/git/defra/trade-imports-workspace',
  '~/git/defra/trade-imports-animals-workspace',
  '~/git/defra/trade-imports-animals'
]

const WORKSPACE_SCHEMA = {
  type: 'object',
  required: ['ok', 'abs', 'tilde', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    abs: { type: 'string', description: 'Absolute path of the workspace checkout, starting with /' },
    tilde: { type: 'string', description: 'The SAME root written with a leading ~/ — this one goes in Bash commands' },
    canonical: { type: 'boolean', description: 'true if the canonical -workspace path resolved' },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const workspace = await agent(
  `Resolve THIS machine's workspace root and report it. That is your whole job.
Try each of these in order, ONE Bash call each, and stop at the first that exits zero:
${WORKSPACE_CANDIDATES.map((c, i) => `${i + 1}. \`git -C ${c} rev-parse --show-toplevel\``).join('\n')}
Report \`abs\` as exactly what that command printed, and \`tilde\` as the candidate path you used —
tilde MUST still begin with \`~/\`, because a literal /Users/... path in a Bash command is DENIED.
Set canonical:true only if candidate 1 worked; if it did not, say so in your summary, because CLAUDE.md
rule 1 wants ${WORKSPACE_CANDIDATES[0]} to resolve to the workspace and it is a symlink away.
If none of them works, report ok:false. Do NOT guess a path and do NOT invent a home directory.
No Grep/Glob tools. One command per Bash call.`,
  light({ label: 'workspace', phase: 'Baseline', schema: WORKSPACE_SCHEMA })
)

if (!workspace || !workspace.ok || !workspace.abs?.startsWith('/') || !workspace.tilde?.startsWith('~/')) {
  throw new Error(
    `increment-build-loop: could not resolve the workspace root. CLAUDE.md rule 1 wants ${WORKSPACE_CANDIDATES[0]} to resolve to the workspace checkout — symlink it if your clone is elsewhere. ${workspace ? workspace.summary : 'the resolver agent failed'}`
  )
}

const ABS = workspace.abs.replace(/\/+$/, '')
const TILDE = workspace.tilde.replace(/\/+$/, '')
if (!workspace.canonical) {
  log(`workspace resolved at ${TILDE} — the canonical ${WORKSPACE_CANDIDATES[0]} symlink is missing (CLAUDE.md rule 1)`)
}

const WORKAREA = `${ABS}/workareas/${WORKAREA_REL}`
const WORKAREA_TILDE = `${TILDE}/workareas/${WORKAREA_REL}`
const BACKLOG = `${WORKAREA}/backlog.json`
const BACKLOG_TILDE = `${WORKAREA_TILDE}/backlog.json`
const PLANS = `${WORKAREA}/plans`

// Every backlog write goes through tim, which validates it and writes it whole.
// A hand-edited backlog.json is how a run corrupted its own state.
const setRow = (id, flags) => `tim backlog set ${WORKAREA_REL} ${id} ${flags} --workspace ${TILDE} --json`
const SET_ROW_RULE = `WRITING TO THE BACKLOG: never Edit ${BACKLOG} by hand. Every write is one \`tim backlog set\` call, shown
where it is needed. It exits non-zero and says why if the write is refused — report that, do not work around it.`
const SKILLS = ABS + '/.claude/skills'
const BRIEFS = ABS + '/.claude/skills/requirements-pipeline/workflow/codex'
const BRIEFS_TILDE = TILDE + '/.claude/skills/requirements-pipeline/workflow/codex'
const JIRA = TILDE + '/tools/jira'

const REPO_PATH = Object.fromEntries(REPO_KEYS.map((key) => [key, REPOS[key].path]))
const GH_REPO = Object.fromEntries(REPO_KEYS.map((key) => [key, REPOS[key].github]))

const repoTable = Object.entries(REPO_PATH)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ')
const ghTable = Object.entries(GH_REPO)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ')

const FULL_REPO_RULE = `REPO PATHS: ${repoTable}. An increment is a full-stack slice: it is built, reviewed and proved in
every repo it touches at once, on the SAME branch name in each (CLAUDE.md rule 2, cross-repo branch parity).
ITS REPOS: the increment's \`repos\` list. Where it has none, an older backlog's \`repo\` field: \`both\` means backend,
frontend and tests; any other value means that repo plus tests. Where it has neither, all three: ${REPO_KEYS.join(', ')}.
Listing a repo the change leaves alone costs nothing — no change means no commit and no PR.`

const BRANCH_REPO_RULE = `REPO PATHS: ${repoTable}. This run builds straight onto \`${BASE_BRANCH}\`, which already exists in
every one of them with an open pull request. No stage creates a branch or a pull request.
ITS REPOS: the increment's \`repos\` list, exactly as written. \`[]\` means it changes no backlog repo: its output is in
the workspace repo itself (under workareas/), which is not a backlog repo and which the orchestrator commits. Where the
row has no \`repos\` at all, every configured repo: ${REPO_KEYS.join(', ')}.`

const REPO_RULE = IS_BRANCH ? BRANCH_REPO_RULE : FULL_REPO_RULE

// Commit and rollback act on every configured repo with changes, not only the
// ones the row or the plan named: an implementor that fixed a stale spec in the
// tests repo must not leave it staged for the next increment to trip over.
const CHANGED_REPOS_RULE = `WHICH REPOS: check EVERY configured repo — ${REPO_KEYS.map((key) => `\`${TILDE}/${REPO_PATH[key]}\``).join(', ')} —
with \`git -C ${TILDE}/<repoPath> status --short\`, and act on each one that has changes.`

// frontend-change ends by writing the workspace's own behaviour spec under
// openspec/ and leaves it uncommitted. The workspace is not a configured repo
// and is never branched, so without this no stage commits those edits, they
// pile up across a run, and a rolled-back increment leaves a spec for behaviour
// that is gone.
const SPEC_RULE = `THE BEHAVIOUR SPEC: an increment may also change \`${TILDE}/openspec/\`, the workspace repo's own spec and
coverage, which frontend-change writes and leaves uncommitted. The workspace is not a configured repo and is never
branched: act on \`openspec/\` ONLY, on whatever branch the workspace is on, and never on anything else in the
workspace — not the backlog, not the plans, not the logs. See what it holds with
\`git -C ${TILDE} status --short -- openspec/\`.`

// The repo's own rungs — format, lint, typecheck, unit, `mvn verify`, FIT and
// E2E — belong to `tim build gate`, which reads them from gates.json and owns
// the workspace stack. Agents that picked those scripts by hand picked a
// remote CDP one, ran unit tests against a stack left up and called a real
// failure "pre-existing". The gate runs one phase per call so each fits in
// one ten-minute Bash window.
const GATE_PHASES = ['unit', 'fit', 'e2e']
const gateLogs = (id, stage) => `${WORKAREA_TILDE}/logs/${id}-${stage}`
const gateCommand = (phase, logs) =>
  `tim build gate ${WORKAREA_REL} --phase ${phase} --workspace ${TILDE} --json --logs ${logs}`
const gateCommandList = (phases, logs) =>
  phases.map((phase, index) => `   ${index + 1}. \`${gateCommand(phase, logs)}\``).join('\n')

const GATE_RULE = `THE GATE owns every repo's own rungs and the workspace stack. \`tim build gate\` runs the rungs
listed for each backlog repo in ${ABS}/.claude/skills/requirements-pipeline/references/gates.json — format check,
lint, typecheck, unit tests, \`mvn verify\`, FIT and the local-stack E2E suite — each to its own
\`gate-<repo>-<rung>.log\` under the --logs folder. For E2E it starts the workspace stack only if it was down and
stops only what it started. So:
- Never pick, add, drop or substitute a script for a repo's own rungs, and never run one by hand.
- Never start or stop the workspace stack, and never drive \`docker\` yourself. A stack that is up is not in your way:
  leave it as it is.
- Run each gate command in the FOREGROUND with the Bash tool's \`timeout\` set to 600000. It prints one JSON line:
  \`ok\`, then \`result.green\` and \`result.rungs[]\`, each with \`repo\`, \`name\`, \`phase\`, \`ok\`, \`log\` and \`reason\`.
  It exits 1 unless every rung passed. A phase whose \`result.rungs\` is empty has nothing to run for this backlog:
  it is neither green nor red, so say so and go on. A command that errors before running any rung (\`ok\` false with
  an \`errors[]\` entry and no \`result\`), or that hits the Bash timeout, is RED: report its error verbatim.
- A red rung's evidence is its \`log\`: read that file once. For a Playwright failure read
  \`test-results/*/error-context.md\` in the tests repo as well.`

const BUILDER_PHASES = ['unit', 'fit']

// The branch lifecycle narrows the builder's phases to the row's gatePhases.
const builderGateRule = (id, stage, phases = BUILDER_PHASES) =>
  phases.length === 0
    ? `CHECKING YOUR OWN WORK: this row's gatePhases runs neither the gate's unit nor its FIT phase, so run no gate phase
yourself. Never run the gate's E2E phase, never start or stop the workspace stack, and never pick a script by hand for a
repo's own rungs. The plan's sections 5 and 6 checks are yours to run as the plan writes them.`
    : `CHECKING YOUR OWN WORK: a repo's own rungs belong to \`tim build gate\`. Run its ${phases.length === BUILDER_PHASES.length ? 'unit and\nFIT phases' : `${phases[0] === 'fit' ? 'FIT' : phases[0]} phase`} yourself, one Bash call each, in the FOREGROUND with the Bash tool's \`timeout\` set to 600000:
${gateCommandList(phases, gateLogs(id, stage))}
Each prints one JSON line; a red rung names its \`log\` — read that file once. To repair a red format rung, run the
repo's \`format\` script, then the unit phase again. Never run the gate's E2E phase — the ladder does, after review —
never start or stop the workspace stack, and never pick a script by hand for a repo's own rungs. A stack that is up
is not in your way: leave it. The plan's sections 5 and 6 checks are yours to run as the plan writes them.`

// Codex has a normal shell and reads absolute paths; its sandbox cannot start
// a browser, so it runs only the gate's unit phase.
const codexGateUnit = (id, stage) =>
  `tim build gate ${WORKAREA_REL} --phase unit --workspace ${ABS} --json --logs ${WORKAREA}/logs/${id}-${stage}`

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

// ---------------------------------------------------------------------------
// Review groups. One style reviewer and one code reviewer per (repo, language)
// group of changed files, never per file: per-file review spent 87 agents and
// 81% of fresh tokens on a 31-file increment, 29 of them returning nothing.
// A group over REVIEW_GROUP_CAP files splits into near-equal parts, so no one
// reviewer is handed more than it can read in full.
// ---------------------------------------------------------------------------
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

// Under the branch lifecycle a docs row writes in the workspace repo itself,
// reported as `workspace:<path>`, so review can be routed there too.
const FILE_REPO_KEYS = IS_BRANCH ? [...REPO_KEYS, WORKSPACE_KEY] : REPO_KEYS

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

// Each group carries its distinct files and the items (files or findings)
// that fall on them; a split divides by file, never across one file's items.
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

const isWorkspaceGroup = (group) => IS_BRANCH && group.repo === WORKSPACE_KEY

const groupRepoPath = (group) => {
  if (isWorkspaceGroup(group)) return TILDE
  return REPO_PATH[group.repo] ? `${TILDE}/${REPO_PATH[group.repo]}` : `${TILDE}/<repoPath>`
}
const groupFileList = (group) => group.files.map((file) => `- ${file}`).join('\n')

// The workspace repo's edits are left unstaged for the orchestrator, so they
// are read against HEAD rather than from the index. A new file shows nowhere
// in a diff: it is read in full.
const groupDiffCommand = (group) =>
  isWorkspaceGroup(group)
    ? `\`git -C ${TILDE} diff HEAD -- <path>\` (a new, untracked file shows in no diff: Read it in full)`
    : `\`git -C ${groupRepoPath(group)} diff --staged -- <path>\``

// Canonical merge order for a cross-repo increment. Lower merges first.
//
// backend before frontend: the backend is the provider and the frontend the
// consumer, so the base branch is never left holding a frontend that calls an
// endpoint which is not there yet.
//
// tests before frontend: CDP runs the tests repo's suite against the deployed
// frontend, so a frontend that merges ahead of its own test fixes is exercised
// by stale specs and CDP goes red. That has happened.
//
// `prs` is built by append — the PR stage raises in `repos` order and a CI
// fixer pushes whatever it had to open on the end — so the array's own order is
// an accident of when a PR appeared, not a merge plan. Sort it here rather than
// asking the merge agent to reorder: order is a decision the script owns.
const MERGE_RANK = { backend: 0, tests: 1, frontend: 2 }
const sortForMerge = (list) =>
  [...list].sort((a, b) => (MERGE_RANK[a.repo] ?? 99) - (MERGE_RANK[b.repo] ?? 99))

const MERGE_ORDER_RULE = `MERGE ORDER for a cross-repo increment: BACKEND FIRST, THEN TESTS, THEN FRONTEND. The
backend is the provider and the frontend the consumer, so \`${BASE_BRANCH}\` is never left holding a frontend that
calls an endpoint which is not there yet; and CDP runs the tests repo's suite against the deployed frontend, so a
frontend merged ahead of its own test fixes is exercised by stale specs and CDP goes red.
EVERY PR of the increment must be GREEN — AND, where the approval gate is on, APPROVED — BEFORE ANY ONE OF THEM
MERGES. Half an increment on \`${BASE_BRANCH}\` is the failure this ordering exists to prevent, and nothing
auto-reverts it.`

// A `blocked` line means the stage hit something no fixer can fix. It stops the
// run without spending fix attempts on it.
const hardStop = (r) => Boolean(r && r.blocked && r.blocked !== 'none')

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

const GUARDRAILS = `
GUARD RAILS (mandatory, every step):
- NEVER use the Grep or Glob TOOLS — they are not allowlisted and will prompt the user. Use Bash \`grep -rn\` / \`find\` / \`ls\` / \`jq\`.
- Bash hygiene: ONE command per Bash call. No \`&&\`, no \`;\`, no \`|\`, no \`cd\`, no trailing \`echo $?\`. Use \`git -C\`, \`npm --prefix\`, \`mvn -f\`. Output redirection (\`> file 2>&1\`) IS allowed.
- In Bash ALWAYS use tilde paths \`${TILDE}/...\` — a literal /Users/... path in Bash is DENIED.
- For the Read/Write/Edit TOOLS use absolute paths \`${ABS}/...\`.
- Never bare \`node\` / \`node -e\` (denied — wrap in an npm script). NEVER run \`sonar\` (not allowlisted; it is a milestone gate the human runs).
- Tests go TO A FILE under \`${WORKAREA_TILDE}/logs/\` and you read that file ONCE. Never grep streaming output, never re-run a suite to see it again.
- For Playwright failures read \`test-results/*/error-context.md\`, do not grep the tail of the run.
- Rollback is ALWAYS \`git stash push -u\` — NEVER \`reset --hard\` or \`clean -fd\`.
- NEVER sleep-poll. Foreground \`sleep\` is denied. Wait on CI by BLOCKING on \`gh pr checks --watch\` or
  \`gh run watch --exit-status\`, with the Bash tool's \`timeout\` parameter set to 600000 (its ceiling).
  A watch that hits that timeout has NOT gone green — treat it as unresolved, never as a pass.
- NEVER background a command: no trailing \`&\`, no run_in_background. Every command is a foreground call that
  returns by itself — a backgrounded one is one whose result you never read.
${IS_BRANCH ? BRANCH_PUSH_GUARD : FULL_PUSH_GUARD}
- Headless: never ask a question. Decide, record the decision, keep going.
`

// How every stage pushes, and why it looks paranoid.
//
// A stage once put a commit straight onto the tests repo's `main`. No PR, no CI,
// no approval — and the merge stage was innocent: it had merged nothing at all.
// Two things combined:
//
//   1. `git checkout -b <work> origin/main` sets the new branch's upstream to
//      `origin/main`, because git's default `branch.autoSetupMerge` tracks a
//      remote-tracking start point. The branch is now *named* for the increment
//      and *pointed at* main.
//   2. `repos/trade-imports-animals-tests` and `-backend` are configured
//      `push.default=tracking`, so a push that has to resolve its own
//      destination resolves it to that upstream — `main`.
//
// So the fix is at both ends: cut with `--no-track` so no work branch ever
// carries the base branch as upstream, and push with an explicit fully-qualified
// refspec so no push ever has a destination left to resolve. Either alone would
// have stopped it; a stage that pushes is worth two locks.
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
destination, and in a repo configured \`push.default=tracking\` (two of these three repos are) it resolves to the
branch's upstream, which is how a commit once landed on \`${BASE_BRANCH}\` with no PR behind it. The fully
qualified \`refs/heads/X:refs/heads/X\` can only ever update branch X.

BEFORE ANY COMMIT OR PUSH, prove you are on the branch you think you are:
${HEAD_BRANCH_CHECK}
If that prints anything other than the work branch — \`${BASE_BRANCH}\` above all — STOP and report ok:false.
Do not commit "just this once" and sort the branch out afterwards.`

// Preserving a failed attempt. A stash is machine-local: on another machine the
// ref means nothing and the work is gone. The increment already owns a branch,
// so the work is committed and PUSHED there and travels.
const preserveWork = (id, branch, reason, evidence) =>
  `Attempt at increment ${id} failed: ${reason}. PRESERVE THE WORK so it survives this machine.
${GUARDRAILS}
${REPO_RULE}
${PUSH_RULE}
EVIDENCE: ${evidence}
TASK — the work goes onto its own branch, not into a stash. A stash ref does not travel; a pushed branch does.
1. ${CHANGED_REPOS_RULE} A repo with changes that is not on \`${branch}\` is a stop: report ok:false naming it, and
   change nothing in it.
2. For EACH repo with changes, stage what the increment produced — but NOTHING under logs/, no coverage output, no
   test-results/, no Playwright artefacts.
3. Commit it on \`${branch}\`, marked as failing: subject \`wip(${SCOPE}): <increment title> — ${reason}\`,
   body naming exactly what went red, and the usual trailer.
4. \`git -C ${TILDE}/<repoPath> push -u origin refs/heads/${branch}:refs/heads/${branch}\` — never \`--force\`.
   That is what lets another engineer fetch the attempt and see what was tried.
5. Do NOT open a pull request. This work does not pass its ladder and must not look reviewable.
6. Confirm each tree is clean: \`git -C ${TILDE}/<repoPath> status --short\`.
6a. ${SPEC_RULE} If it has changes, they cannot go on \`${branch}\` — the workspace is not on it — so stash them:
   \`git -C ${TILDE} stash push -u -m "failed-${id}" -- openspec/\`, then confirm
   \`git -C ${TILDE} status --short -- openspec/\` is empty. Name the stash ref in the note below.
7. Record it: \`${setRow(id, "--note 'ATTEMPT FAILED: <what went red>; branch <branch>; wip <sha>'")}\`.
   Write the text inside those single quotes, and write any ' in it as \`'\\''\` — backticks and $ are then safe.
   Do NOT record a commit — the increment is not built, and a recorded commit would make the next attempt skip
   the build.
The next attempt branches from here and builds on top; the squash merge collapses the wip commit.
NEVER \`reset --hard\`, NEVER \`clean -fd\`.
Report the branch name and the wip SHA.
Return the structured output only.`

// Under the branch lifecycle the branch is shared and carries open PRs, so a
// failed attempt must never reach it: a wip commit there would show failing
// work to every reviewer, and a commit made mid-merge would conclude a merge
// nobody finished resolving. The attempt goes to patch files under logs/ and
// the merge is aborted, which leaves the tree clean for the next run.
const preserveWorkOnBranch = (id, branch, reason, evidence) =>
  `Attempt at increment ${id} failed: ${reason}. PRESERVE THE WORK WITHOUT COMMITTING ANY OF IT.
${GUARDRAILS}
${REPO_RULE}
EVIDENCE: ${evidence}
\`${branch}\` is a shared branch with open pull requests. NOTHING from a failed attempt may be committed or pushed to
it. Your own task below is the one place you ARE told to abort a merge.
TASK:
1. ${CHANGED_REPOS_RULE} Also act on every repo that is MID-MERGE:
   \`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet MERGE_HEAD\` prints a SHA, even where status looks empty.
   A repo with changes that is not on \`${branch}\` is a stop: report ok:false naming it, and change nothing in it.
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
6. Record it: \`${setRow(id, "--note 'ATTEMPT FAILED: <what went red>; merge of <ref> aborted in <repo>; patches and unresolved paths at <the logs files>; stash <ref or none>'")}\`.
   Write the text inside those single quotes, and write any ' in it as \`'\\''\` — backticks and $ are then safe.
   Do NOT record a commit — the increment is not built.
Do NOT commit, do NOT push, do NOT open or edit a pull request.
Report the patch files, the stash refs and which merges you aborted.
Return the structured output only.`

// Every stop after the implementor has touched the tree goes through here, so
// the tree is left clean and the attempt recoverable. A stop that only records
// its outcome leaves staged work the next run's baseline refuses.
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

// The Codex fix stage of hrp-origin-codex inc-001 cut `spike/hrp-origin-codex-inc-001`
// in the backend "because no separate increment branch existed" and staged its
// fixes there; land then refused the repo. Run after every Codex stage and
// before land, this puts such a repo back when that is safe and stops when not.
const branchGuard = (id, stageName, phaseName, branch, branchedRepos) => {
  const reposToCheck = branchedRepos
    ? `the increment's repos — ${branchedRepos.map((key) => `\`${TILDE}/${REPO_PATH[key]}\``).join(', ')} — and any other
configured repo whose \`git -C ${TILDE}/<repoPath> status --short\` is not empty (${REPO_KEYS.map((key) => `\`${TILDE}/${REPO_PATH[key]}\``).join(', ')})`
    : `every configured repo — ${REPO_KEYS.map((key) => `\`${TILDE}/${REPO_PATH[key]}\``).join(', ')}`

  return agent(
    `You are the BRANCH GUARD for increment ${id}, run after the ${stageName} stage. Every repo this increment works
in must be on \`${branch}\`. A stage that switched a repo to another branch, or cut a new one, leaves the work where
the land stage refuses it. You check, move a repo back where that is safe, and change nothing else.
${GUARDRAILS}
CHECK ${reposToCheck}.
For EACH of them:
1. ${HEAD_BRANCH_CHECK} Prints \`${branch}\` → that repo is fine; go to the next.
2. Anything else → compare the commits: \`git -C ${TILDE}/<repoPath> rev-parse HEAD\` and
   \`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet refs/heads/${branch}\`.
   - The same SHA → \`git -C ${TILDE}/<repoPath> checkout ${branch}\`. The staged and unstaged work travels with it,
     because the two branches point at the same commit. Run step 1 again and confirm it prints \`${branch}\`. Say in
     your summary which repo you moved and from which branch. Leave that other branch where it is — do not delete it.
   - A different SHA, \`${branch}\` missing, or a checkout that refuses → STOP: report ok:false naming the repo, the
     branch it is on and both SHAs, and change nothing in it.
Never create a branch, and never commit, stash, reset or clean. You only ever move a repo back onto \`${branch}\`.${
      IS_BRANCH
        ? `
A repo MID-MERGE (\`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet MERGE_HEAD\` prints a SHA) is in that state by design:
a later stage commits the merge. Never \`merge --abort\`, \`merge --continue\` or check out in it. If it is on \`${branch}\` it
is fine; if it is not, STOP and report ok:false naming it.`
        : ''
    }
Report ok:true only when every repo you checked prints \`${branch}\`.
Return the structured output only.`,
    light({ label: `${id} branch-guard:${stageName}`, phase: phaseName, schema: incrementSchema })
  )
}

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

// The CI fixer's schema is the increment schema plus a channel for a PR it had
// to open in a repo the increment did not start with — a frontend change whose
// fix lands in the tests repo, typically. Without somewhere to report that, a
// fixer that raises a second PR leaves it invisible to every later stage, and
// the increment merges half of itself.
const CI_FIX_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
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

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'what', 'why', 'fix'],
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
          category: { type: 'string' },
          what: { type: 'string', description: 'The defect, one sentence' },
          why: { type: 'string', description: 'Concrete failure scenario or rule broken' },
          fix: { type: 'string', description: 'The specific change to make' }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
}

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
          reasoning: { type: 'string', description: 'Evidence for or against, citing file:line' }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
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
  required: ['ok', 'summary', 'repos', 'behaviourChanges', 'decisions'],
  properties: {
    ok: { type: 'boolean', description: 'false only when the increment cannot be carried out as written' },
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
    decisions: { type: 'array', items: { type: 'string' }, description: 'Every choice the increment left open, and how you settled it' },
    risks: { type: 'array', items: { type: 'string' } }
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

const TICKET_SCHEMA = {
  type: 'object',
  required: ['ok', 'key', 'repos', 'branch', 'resumeAt', 'movedToBoard', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    key: { type: 'string', description: 'The Jira key, e.g. EUDPA-12345' },
    created: { type: 'boolean', description: 'true ONLY if this run raised it. false when you reused a persisted key' },
    status: { type: 'string', description: "The ticket's status when this stage finished, verbatim as the board words it" },
    movedToBoard: {
      type: 'boolean',
      description:
        'true ONLY if move-to-board.sh ran and exited 0 this time. Never infer it from the status, and never assume a reused ticket is already on the board — the call is idempotent, so run it and report what happened'
    },
    repos: {
      type: 'array',
      description: 'Every repo this increment touches, in merge order. A "both" increment is ["backend","frontend"]',
      items: { type: 'string', enum: ['frontend', 'backend', 'tests'] }
    },
    branch: { type: 'string', description: 'The branch name this increment builds on, e.g. feat/EUDPA-12345-add-a-set-recipe' },
    resumeAt: {
      type: 'string',
      enum: ['build', 'pr', 'ci', 'done'],
      description: 'Where the lifecycle picks up, from what is already persisted on the increment'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

const BRANCH_SCHEMA = {
  type: 'object',
  required: ['ok', 'branch', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    branch: { type: 'string' },
    repos: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'head'],
        properties: {
          repo: { type: 'string' },
          head: { type: 'string', description: 'The short SHA the branch points at' },
          cut: { type: 'boolean', description: 'true if this run created the branch in that repo' }
        },
        additionalProperties: false
      }
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
}

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
      enum: ['none', 'awaiting-approval', 'changes-requested', 'not-mergeable', 'pr-red', 'base-branch-red', 'pr-left-open'],
      description:
        'WHICH stop condition fired, as a fixed value the caller branches on. `blocked` is prose for a human; this is the machine answer and the two must agree. "none" when green. Set "awaiting-approval" ONLY when the PR is green and simply has no approving review yet — never for anything that is actually wrong, because the caller reports that one as a healthy pause rather than a failure'
    },
    summary: { type: 'string' }
  },
  additionalProperties: false
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

// ---------------------------------------------------------------------------
// Codex delegation. A workflow script has no shell of its own, so a codex stage
// is two agents: a shell that runs `codex exec` and reports ONLY whether it ran,
// and a relay that re-emits what Codex wrote. Splitting them keeps "the run died"
// distinguishable from "Codex reviewed the change and found nothing".
// ---------------------------------------------------------------------------
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
    schemaFile: 'increment.json',
    relay: 'The two shapes match field for field — copy it across unchanged.'
  }
}

// A stage that fans out (review, one Codex run per group) names each run with
// its own slug, so every run has its own prompt, result and log.
const codexPaths = (id, slug) => ({
  promptFile: `${WORKAREA}/logs/${id}-${slug}.prompt.md`,
  promptFileTilde: `${WORKAREA_TILDE}/logs/${id}-${slug}.prompt.md`,
  lastMessage: `${WORKAREA}/logs/${id}-${slug}.lastmsg.txt`,
  lastMessageTilde: `${WORKAREA_TILDE}/logs/${id}-${slug}.lastmsg.txt`,
  runLog: `${WORKAREA_TILDE}/logs/${id}-${slug}.log`
})

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
${GUARDRAILS}
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
  <frontendRepo> = ${ABS}/${REPOS.frontend.path}
  <backendRepo>  = ${ABS}/${REPOS.backend.path}
  <testsRepo>    = ${ABS}/${REPOS.tests.path}
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
${GUARDRAILS}
Read ${lastMessage} once with the Read tool. It conforms to ${BRIEFS}/schemas/${schemaFile}.
${relay}
Add nothing of your own — no findings, no opinions, no work. Run no suite. Edit no file.
Return the structured output only.`,
    light({ label: `${id} relay:${slug}`, phase: phaseName, schema })
  )
}

// Returns null when the stage could not produce a result — a dead shell agent, a
// codex run that never wrote one, or a dead relay. Callers must treat null as a
// failure to review/implement/fix, never as an empty-but-valid result.
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

// ---------------------------------------------------------------------------
// Plan — the row says what, why and acceptance; the planner works out how,
// against the live tree, immediately before it is built. Lifted from
// frontend-alignment.js, where "Sonnet never had to decide anything".
// ---------------------------------------------------------------------------
const standardsKeys = REPO_KEYS.map((key) => `${key} → \`${REPO_PATH[key].replace(/^repos\//, '')}\``).join(', ')

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

const planIncrement = (id, branchedRepos = null) =>
  agent(
    `You are the PLANNER for increment ${id}. You write the plan; you change no source file and you commit nothing.
${GUARDRAILS}
${readIncrement(id)}
${REPO_RULE}
${IS_BRANCH ? branchPlanRule(branchedRepos) : branchedRepos ? `BRANCHED REPOS: the repos branched for this increment are ${branchedRepos.join(', ')}. Plan only
within them, and if the slice genuinely needs another repo, return ok:false naming it.\n` : ''}
WHAT A PLAN IS: a file-level script for an implementor who has less context than you. The increment says what must
be true afterwards and why. You work out how, against the code as it is now, and settle every choice so the
implementor decides nothing.

1. PIN THE TREE. For each of the increment's repos, record its branch and HEAD in the plan:
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\` and \`git -C ${TILDE}/<repoPath> rev-parse --short HEAD\`.
2. READ, IN FULL, with the Read tool:
   - the files the change will touch, and the nearest existing feature that already does something similar —
     the exemplar the implementor will imitate;
   - the standards for those files. Run \`tim backlog standards --files <repoKey>:<path> --workspace ${TILDE} --json\`
     (repeat --files for each file; the repo keys are ${standardsKeys}, and \`workspace\` for this repo) and read
     every rules and bestPractice file it lists;
   - where the change adds a field, page, section or collection to a frontend journey, or changes an obligation or
     the journey flow, ${SKILLS}/frontend-change/SKILL.md, then the repo's own recipe it routes to. Plan by that
     recipe, substituting this programme's repo path and set. A recipe is the repo's own how-knowledge: follow it
     rather than improvising.
3. CHECK THE CLAIMS. Test each thing the increment asserts about the application against the live tree. Where one
   is wrong, record it under Decisions and plan against reality. If the increment cannot be carried out at all,
   return ok:false saying exactly why.
4. WRITE ${PLANS}/${id}.md with the Write tool. Open with a table of the repos: path, branch, HEAD. Then:
   0. Decisions — every choice the increment left open, how you settled it, and the alternative you rejected.
   1. Moves — every file that moves or is deleted, from → to. "None" is an answer.
   2. Edits — for each file that changes, what changes and why. Name the exemplar to copy where there is one.
   3. New files — full intent, and the file to imitate.
   4. Tests — which tests change or are new, and what each pins. Where the slice changes anything a user or
      another system can see, include the INTEGRATION PROOF: an E2E or contract test in the tests repo that
      exercises the slice through the real stack.
   5. Invariants to prove — one runnable check per acceptance criterion where practical, with its expected result,
      plus any programme invariant this change could break.
   6. Increment-specific checks beyond the gate. \`tim build gate\` already runs every repo's own rungs from
      gates.json — format check, lint, typecheck, unit tests, \`mvn verify\`, FIT and the tests repo's local-stack
      E2E suite, which carries the integration proof — so never list those here. List only what this increment
      needs proved on top of them and section 5, one command each in the GUARD RAILS form (\`npm --prefix\`,
      \`mvn -f\`, tilde paths), with what each proves. None of them may need the workspace stack running: a check
      that needs the real stack belongs in the tests repo's E2E suite, which the gate runs. "None" is an answer.
   7. Out of scope — what the implementor must leave alone, including neighbouring open questions.
   The plan never covers lifecycle: no commit messages, branches, pushes or pull requests. Later stages own those.
   The increment is one full-stack slice. Plan every repo it needs in this one plan; never leave "the tests half"
   or "the backend half" for another increment.
Return ok, summary, repos (the repos the plan changes), behaviourChanges, decisions and risks.
Return the structured output only.`,
    heavy({ label: `${id} plan`, phase: 'Plan', schema: PLAN_SCHEMA })
  )

const preflight = await agent(
  `Report whether this run's backlog exists and is readable. Run exactly one command and read its output:
\`jq -e '.increments | length' ${BACKLOG_TILDE}\`
If it prints a number, return ok:true with that number in summary. If the file is missing or is not valid
JSON, return ok:false quoting the error. Do nothing else. One Bash call, no Grep/Glob tools, tilde paths only.`,
  light({ label: 'preflight', phase: 'Baseline', schema: incrementSchema })
)

if (!preflight || !preflight.ok) {
  throw new Error(
    `increment-build-loop: no readable backlog at ${BACKLOG} (workarea "${WORKAREA_REL}") — ${preflight ? preflight.summary : 'preflight agent failed'}`
  )
}

// Deriving the next increment is a shell command, and a workflow script has no
// shell — hence an agent for one `tim backlog next` call. It reads the id out
// of the JSON envelope rather than the text rendering, so "NONE" never has to
// be told apart from an increment that happens to be called that.
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
One Bash call, no Grep/Glob tools, tilde paths only.`,
    light({ label: 'derive next', phase: 'Derive', schema: NEXT_SCHEMA })
  )

// ---------------------------------------------------------------------------
// The branch lifecycle. Every stage below runs only under lifecycle 'branch':
// the run builds straight onto an existing branch that already carries an open
// PR in each repo, so nothing raises a ticket, cuts a branch, raises or edits a
// PR, or merges one. The branch stage replaces the ticket and branch stages:
// it asserts every repo is ready and reads the row's lifecycle fields, because
// the script has no filesystem of its own.
// ---------------------------------------------------------------------------
const repoPathList = (keys) => keys.map((key) => `${key} \`${TILDE}/${REPO_PATH[key]}\``).join(', ')
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
${GUARDRAILS}
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

// What the branch stage copied from the row, checked here rather than trusted:
// a merge into a repo the row does not name would be built without its repo's
// gate, and an unknown gate phase would fail inside tim instead of here.
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
${GUARDRAILS}
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

// Every stage from implement to land is told the same thing about a merge in
// progress, so none of them reads a staged merge as ordinary work, aborts it
// or commits it half-resolved.
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

const gateStepFor = (phases, logs) =>
  phases.length
    ? gateCommandList(phases, logs)
    : "   None: this row's gatePhases is [], so the gate runs nothing for it. Report green:true with no rungs."

const branchBaselinePrompt = (id, phases) => `You are the BASELINE GUARD for increment ${id}. Establish that the tree is clean, on the right branch and
green BEFORE any edit, so a failure later in this increment is unambiguously ours. You run fixed commands and
report what they printed. You choose no test, script or suite: \`tim build gate\` does that.
${GUARDRAILS}
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
3. THE GATE, for the phases this row owes. Run these, in this order, one Bash call each, and nothing else:
${gateStepFor(phases, gateLogs(id, 'baseline'))}
   Stop after the first one that comes back red: nothing is built on a red baseline, so a later phase proves nothing.
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
${GUARDRAILS}
${REPO_RULE}
${PUSH_RULE}
${SET_ROW_RULE}${mergeNoteOf(started)}
TASK:
1. ${CHANGED_REPOS_RULE} Also act on every repo MID-MERGE (${MERGE_HEAD_CHECK} prints a SHA), even one whose status
   looks empty. The increment's title, for the commit subject:
   \`jq -r '.increments[] | select(.id=="${id}") | .title' ${BACKLOG_TILDE}\`.
2. For EVERY repo you are about to commit in, ${HEAD_BRANCH_CHECK} must print \`${BASE_BRANCH}\`. Anything else is a
   stop: landed:false naming the repo, and change nothing in it.
3. In a repo MID-MERGE, ${UNRESOLVED_CHECK} must print nothing. Otherwise landed:false naming the paths: a merge is
   never committed with a path unresolved.
4. Confirm what is staged with \`git -C ${TILDE}/<repoPath> status --short\`. Stage anything the increment produced that
   is still untracked, but NOTHING under logs/, no coverage output, no test-results/, no .playwright artefacts.
5. Commit, one commit per repo, each with the same message: \`<type>(${SCOPE}): <increment title>\`, where the type is
   \`feat\` or \`fix\` when the behaviour changes below are not empty, otherwise the type the increment's \`kind\`
   implies; a body saying what changed and naming the increment id (this run has no ticket); and the trailer:
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
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
   pushed:false, saying which repo and what git said. Never \`--force\`.
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
${GUARDRAILS}
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
      enum: ['none', 'pr-red', 'pr-conflicting', 'mergeability-unknown', 'no-checks'],
      description: 'WHICH stop condition fired, as a fixed value the caller branches on. "none" when every PR is green'
    }
  }
}

const branchWatchPrompt = (id, prList) => `You are the CI WATCHER for increment ${id} on \`${BASE_BRANCH}\`. WAIT for the checks on every PR below to
resolve, and report what they did. You change no code, you merge nothing, and you edit no PR.
${GUARDRAILS}
THE PULL REQUESTS:
${prList}

For EACH pr, in the order listed:
1. MERGEABILITY FIRST. A PR that conflicts with its base gets NO checks at all, so waiting on its checks would wait for
   nothing. \`gh pr view <url> --json mergeable,mergeStateStatus\`
   - \`mergeable\` UNKNOWN → GitHub has not worked it out yet. Run the same command again, up to 10 times in all. Still
     UNKNOWN → state "unresolved", a line in failures[], stopReason "mergeability-unknown".
   - \`mergeable\` CONFLICTING, or \`mergeStateStatus\` DIRTY → state "red", failures[] "<repo> PR conflicts with its base:
     GitHub runs no checks on it", blocked "<repo> PR conflicts with its base", stopReason "pr-conflicting". Do not
     watch its checks. This is a red, not an API failure, and no code fix in this row clears it.
   - anything else → go on to step 2.
2. BLOCK on its checks. One Bash call, with the tool's \`timeout\` parameter set to 600000:
   \`${TILDE}/tools/github-actions/wait-for-pr-checks.sh <owner/name> <number> 570 > ${WORKAREA_TILDE}/logs/${id}-ci-<repo>.log 2>&1\`
   Read that log ONCE. Exit 0 → green. Exit 1 → RED: one line per failing check in failures[], naming the check and
   what it said. Exit 2 → not resolved yet: run it again, at most ${CI_WATCH_WINDOWS} times per PR in all, then state
   "unresolved", which counts as RED. Exit 4 → no checks at all: state "unresolved", blocked "no checks on <repo>",
   stopReason "no-checks". An absence of evidence is not green.
3. For a RED check, name the failing job precisely enough for a fixer to act. Get the detail with
   \`gh run view <run-id> --repo <ghRepo> --log-failed\`, redirected to a log you read once. Where the failing
   job is Playwright, say so: its real evidence is \`test-results/*/error-context.md\`, not the run output.

\`blocked\` is ONLY for something a code fix in this row cannot address: a conflict with the base, no checks, \`gh\`
refused, the PR is gone. Setting it stops the run outright. A failing test is NOT blocked: it is a red check, and a
fixer gets it. green:true ONLY if EVERY pr resolved green. stopReason "pr-red" for an ordinary red.
Return the structured output only.`

const branchCiFixPrompt = (id, attempt, prList, seen) => `You are the CI FIXER for increment ${id}, attempt ${attempt} of ${CI_FIX_ATTEMPTS}.
CI is red on \`${BASE_BRANCH}\`. Fix the CODE, commit onto \`${BASE_BRANCH}\` and push. You do not merge, and you
never create, edit or un-draft a pull request.
${GUARDRAILS}
${PUSH_RULE}
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
${GUARDRAILS}
${SET_ROW_RULE}
Run exactly one command: \`${setRow(id, commit ? `--status done --commit "${commit}"` : '--status done')}\`
It leaves \`branch\`, \`commit\` and \`prs\` in place: they are the record of how it got there.
Report ok:true only when tim exited 0 and its JSON reports ok:true.
Return the structured output only.`,
    light({ label: `${id} done`, phase: 'Done', schema: incrementSchema })
  )

const queue = EXPLICIT_IDS === null ? null : [...EXPLICIT_IDS]
const plannedWork = queue ? `${queue.length} increment(s)` : 'draining the backlog'
const stopAfterText = STOP_AFTER === 'all' ? 'every one it can' : `${STOP_AFTER} landed`
log(
  IS_BRANCH
    ? `${WORKAREA_REL}: ${plannedWork} onto ${BASE_BRANCH} (branch lifecycle: no Jira, no merge), executor ${EXECUTOR}, stopping after ${stopAfterText}`
    : `${WORKAREA_REL}: ${plannedWork} off ${BASE_BRANCH}, executor ${EXECUTOR}, stopping after ${stopAfterText}`
)

const results = []
let built = 0
let lastId = null
let stopped = null

while (true) {
  if (STOP_AFTER !== 'all' && built >= STOP_AFTER) {
    stopped = { reason: 'count-reached', detail: `${built} increment(s) landed, which is what stopAfter asked for` }
    break
  }

  // Checked before the increment starts, never part-way through one: a run that
  // runs out of agents mid-increment loses the attempt it was making.
  if (agentsThrough(built + 1) > AGENT_CAP) {
    stopped = {
      reason: 'agent-budget',
      detail: `${built} increment(s) landed. Another would take this run past the Workflow tool's ${AGENT_CAP}-agent cap at up to ${AGENTS_PER_INCREMENT[EXECUTOR]} agents per increment on ${EXECUTOR}. Launch the workflow again with the same args to carry on`
    }
    break
  }

  let id = null

  if (queue) {
    id = queue.shift()
    if (!id) {
      stopped = { reason: 'no-buildable', detail: 'the increments list is built out' }
      break
    }
  } else {
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

  // The backstop. Every failure path below stops the run, so nothing should
  // hand back the same id twice — but a path that forgets would otherwise
  // rebuild one increment for ever, because `tim backlog next` selects on
  // status and dependsOn alone and a failed attempt changes neither.
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
    const plan = await planIncrement(id)
    results.push({
      id,
      outcome: plan?.ok ? 'planned' : 'plan-refused',
      plan: `${PLANS}/${id}.md`,
      detail: plan?.summary ?? 'the planner died',
      repos: plan?.repos,
      behaviourChanges: plan?.behaviourChanges,
      decisions: plan?.decisions,
      risks: plan?.risks
    })
    log(`${id}: ${plan?.ok ? 'PLANNED' : 'PLAN REFUSED'} — ${plan?.summary ?? 'the planner died'}`)
    continue
  }

  // -----------------------------------------------------------------------
  // Ticket — reuse or raise, put it in the working status, and work out where
  // to resume. Runs first so a retry never re-does work the last attempt landed.
  // -----------------------------------------------------------------------
  let ticket = null
  let workBranch = BASE_BRANCH
  let repos = null
  let resumeAt = 'build'
  // Only the branch lifecycle reads these three row fields.
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

  phase('Ticket')

  ticket = await agent(
    `You are the TICKET STAGE for increment ${id}. You give the increment a Jira ticket and work out where in
the lifecycle this run picks up. YOU RAISE AT MOST ONE TICKET, AND ONLY IF THE INCREMENT HAS NONE.
${GUARDRAILS}
${REPO_RULE}
${SET_ROW_RULE}

STEP 1 — READ WHAT IS ALREADY PERSISTED. One Bash call:
\`jq -r '.increments[] | select(.id=="${id}") | {ticket, branch, commit, prs, repos, repo, kind, title}' ${BACKLOG_TILDE}\`
Everything below turns on that output. Read it before you do anything else.

STEP 2 — THE TICKET.
- If \`ticket\` is a key (not null, not absent): REUSE IT. Do NOT create anything. Confirm it exists with
  \`${JIRA}/ticket.sh <KEY> summary\` and note its status VERBATIM — do not tidy or normalise the wording.
  Set created:false.
- Only if \`ticket\` is null or absent, raise one:
  a. Write the description with the Write tool to ${WORKAREA}/logs/${id}-ticket.txt. **Jira uses WIKI MARKUP,
     NOT MARKDOWN** — markdown renders as visible garbage. Use exactly this shape, substituting real values:
---8<---
h2. Increment

{{${id}}} from the {{${WORKAREA_REL}}} backlog.

h2. Acceptance criteria

* <first acceptance criterion>
* <second acceptance criterion>

h2. Source

Backlog: {{workareas/${WORKAREA_REL}/backlog.json}}
---8<---
     Wiki-markup rules you MUST apply to every acceptance criterion you copy across:
     - Escape every \`[\` as \`\\[\` and every \`]\` as \`\\]\` — bare brackets become links.
     - Escape every \`{\` as \`\\{\` — a bare brace opens a macro.
     - Strip any leading \`*\` or \`-\` from the criterion text, or it nests the bullet.
     - Put file paths, code identifiers and commands in \`{{monospace}}\`, never in backticks.
     - Never write \`#\`, \`##\`, \`**bold**\` or a markdown table. Headings are \`h2.\`, bold is \`*bold*\`.
  b. Raise it. ONE command, and run it ONCE:
     \`JIRA_PROJECT_KEY=${JIRA_PROJECT} ${JIRA}/create-ticket.sh -t Task -p ${EPIC} -D ${WORKAREA_TILDE}/logs/${id}-ticket.txt "${id} — <the increment title, trimmed to fit>" > ${WORKAREA_TILDE}/logs/${id}-ticket.log 2>&1\`
  c. Read that log. Its first line is the new key. If the command failed, report ok:false with the log's
     contents and STOP — do not retry, a retry is how a board gets two tickets for one increment.
  d. **IMMEDIATELY** persist it, before you do anything else at all: \`${setRow(id, '--ticket <KEY>')}\`.
     This write is what makes a retry safe.

STEP 3 — THE WORKING STATUS. This board's working status is \`${STATUS_IN_PROGRESS}\` and its finished
status is \`${STATUS_DONE}\`. Both names are CONFIGURATION and are given to you here. Use them literally.
- Status is exactly \`${STATUS_IN_PROGRESS}\` → leave it alone.
- Status is exactly \`${STATUS_DONE}\` → leave it alone, and SAY SO in your summary. A finished ticket whose
  increment is not done in the backlog is a mismatch a human needs to see.
- Any other status → \`${JIRA}/transition-ticket.sh <KEY> "${STATUS_IN_PROGRESS}"\`.
⚠ Do NOT reason about whether a status comes "before" or "after" the working one. You cannot see this
board's workflow order, and boards carry statuses whose names say nothing about direction. Compare against
the two configured names by EXACT STRING and nothing else.
If the transition reports the status is not available, run \`${JIRA}/transition-ticket.sh <KEY> --list\` and
report ok:false with BOTH the status you were asked for — \`${STATUS_IN_PROGRESS}\` — AND the full list of
transitions the board actually offers, so the config fix is obvious from your report alone.
Do NOT guess a nearby status and do NOT pick one off the list yourself.

STEP 4 — PUT IT ON THE BOARD. Run this for EVERY increment, whether you raised the ticket or reused it:
\`${JIRA}/move-to-board.sh ${JIRA_BOARD} <KEY>\`
A raised ticket lands in the board's BACKLOG, and STEP 3 does not get it out. Board membership is not a
field on the issue and is not implied by status — two tickets identical in every field sit one on the board
and one in the backlog. So a ticket left here is one the team cannot see, on a run that otherwise looks
clean. The call is idempotent, so running it on a ticket already on the board is a harmless no-op; that is
why it is unconditional rather than something you reason about.
Set movedToBoard:true when the command exits 0. If it fails, report ok:false with the command's full output
— do not carry on, and do not fall back to a status change, which cannot do this.

STEP 5 — THE BRANCH NAME.
- If \`branch\` is already persisted on the increment, REUSE IT VERBATIM. Do not recompute it.
- Otherwise build it as \`<type>/<KEY>-<slug>\` and persist it: \`${setRow(id, '--branch <branch>')}\`.
  - \`<type>\` from the increment's \`kind\`: bug/fix → \`fix\`; chore/docs/refactor/test/test-coverage/
    test-infrastructure/fixture → \`chore\`; everything else → \`feat\`.
  - \`<slug>\` from the title: lower case, every run of non-alphanumeric characters becomes one \`-\`, trim
    leading and trailing \`-\`, truncate to 40 characters and trim any trailing \`-\` again.
  This matches CLAUDE.md rule 2 (\`<type>/${JIRA_PROJECT}-XXXX[-slug]\`).

STEP 6 — WHERE TO RESUME, from what STEP 1 showed you. Take the FIRST that matches:
- \`prs\` is non-empty and every entry is marked merged → resumeAt "done".
- \`prs\` is non-empty → resumeAt "ci".
- \`commit\` is set and \`prs\` is empty or absent → resumeAt "pr".
- anything else, including a brand new ticket → resumeAt "build".
Re-entering an increment must never rebuild work that is already committed on its branch.
⚠ resumeAt comes from the BACKLOG FIELDS ABOVE and from nothing else. **Never derive it from the ticket's
status.** A board status is moved by people for reasons this loop cannot see, and a ticket parked at
Deskcheck or IN QA says nothing about how far the build got.

STEP 7 — repos[]: by the ITS REPOS rule above, in merge order (backend, tests, frontend). An older row's
\`repo\` of \`both\` → \["backend","frontend","tests"\]; any other single \`repo\` → that repo plus \`tests\`.
Do NOT narrow the list from the increment's title. **Include \`tests\` in every case that changes what a user
sees.** A UI change breaks the E2E specs and their visual baselines essentially always, and the slice's
integration proof lives there. Naming a repo here is what gets it BRANCHED, and a repo that is never branched sits
on \`${BASE_BRANCH}\` for the whole run — which is how an increment once committed straight onto the tests repo's
main. Over-listing a repo costs nothing: a repo with no changes simply gets no commit and no PR.

Report ok:true only if the ticket exists, its status is one you left alone or successfully set, STEP 4
moved it onto the board, and the branch name is persisted. Report \`status\` as the ticket's status when you
finished, verbatim.
Return the structured output only.`,
    light({ label: `${id} ticket`, phase: 'Ticket', schema: TICKET_SCHEMA })
  )

  if (!ticket || !ticket.ok || !ticket.key) {
    log(`${id}: TICKET STAGE FAILED — ${ticket ? ticket.summary : 'agent failed'}`)
    results.push({ id, outcome: 'ticket-failed', detail: ticket?.summary ?? 'agent failed' })
    stopped = { reason: 'ticket-failed', detail: `${id}: ${ticket?.summary ?? 'agent failed'}` }
    break
  }

  // A ticket in the backlog is one the team cannot see, and nothing later in
  // the lifecycle notices. Checked here rather than trusted to the stage's own
  // ok, because "I set the status" reads like success from inside that stage.
  if (!ticket.movedToBoard) {
    log(`${id}: TICKET STAGE FAILED — ${ticket.key} was not moved onto board ${JIRA_BOARD}`)
    results.push({
      id,
      ticket: ticket.key,
      outcome: 'ticket-failed',
      detail: `${ticket.key} exists but is still in the backlog of board ${JIRA_BOARD}. Run \`tools/jira/move-to-board.sh ${JIRA_BOARD} ${ticket.key}\` and re-run the increment. Stage said: ${ticket.summary}`
    })
    stopped = { reason: 'ticket-failed', detail: `${id}: ${ticket.key} is still in the backlog of board ${JIRA_BOARD}` }
    break
  }

  workBranch = ticket.branch
  repos = ticket.repos
  resumeAt = ticket.resumeAt ?? 'build'
  log(
    `${id}: ${ticket.key} (${ticket.created ? 'raised' : 'reused'}) on board ${JIRA_BOARD}, branch ${workBranch}, resuming at ${resumeAt}`
  )

  // -----------------------------------------------------------------------
  // Branch — off FRESH base, in every repo the increment touches. Refuses on
  // a dirty tree, because switching branches over uncommitted work loses it.
  // -----------------------------------------------------------------------
  phase('Branch')

  const branched = await agent(
    `You are the BRANCH STAGE for increment ${id} (${ticket.key}). Put every repo this increment touches on
\`${workBranch}\`, cut from a FRESHLY FETCHED \`${BASE_BRANCH}\`.
${GUARDRAILS}
${REPO_RULE}
REPOS, in order: ${repos.join(', ')}. Do all of the following for EACH of them.

1. \`git -C ${TILDE}/<repoPath> status --short\` — it MUST be empty. A dirty tree means uncommitted work from a
   previous attempt: stop, report ok:false naming the repo and the files, and change nothing. NEVER stash,
   reset or clean here — this stage does not own that work.
2. \`git -C ${TILDE}/<repoPath> fetch origin\`
3. Does the branch exist locally? \`git -C ${TILDE}/<repoPath> rev-parse --verify --quiet refs/heads/${workBranch}\`
   - It does → \`git -C ${TILDE}/<repoPath> checkout ${workBranch}\`, then
     \`git -C ${TILDE}/<repoPath> pull --ff-only\` to pick up anything already pushed. If the pull is not a
     fast-forward, report ok:false — a diverged branch needs a human. If it fails because the upstream branch is
     GONE, this increment has already merged and the remote branch was deleted: say so and pass.
   - It does not → does it exist on the remote?
     \`git -C ${TILDE}/<repoPath> ls-remote --heads origin ${workBranch}\`
     - Remote has it → \`git -C ${TILDE}/<repoPath> checkout -b ${workBranch} --track origin/${workBranch}\`
     - Nobody has it → \`git -C ${TILDE}/<repoPath> checkout -b ${workBranch} --no-track origin/${BASE_BRANCH}\`
       \`--no-track\` is load-bearing and NOT optional. Without it the new branch takes \`origin/${BASE_BRANCH}\`
       as its upstream, and a later push in a \`push.default=tracking\` repo follows that upstream onto
       \`${BASE_BRANCH}\`. That is exactly how an increment once put a commit on the tests repo's main with no PR.
   NEVER a bare \`checkout -b ${workBranch}\` — that branches off whatever the repo happened to be on.
4. Confirm where you landed: \`git -C ${TILDE}/<repoPath> rev-parse --short HEAD\` and
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`. The second must print \`${workBranch}\`.
5. Confirm the branch does not point at the base branch for its upstream:
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref --symbolic-full-name ${workBranch}@{upstream}\`
   It must print \`origin/${workBranch}\`, or fail with "no upstream" — either is correct, and both are safe.
   If it prints \`origin/${BASE_BRANCH}\` the branch was cut by an older run that lacked \`--no-track\`: repair it
   with \`git -C ${TILDE}/<repoPath> branch --unset-upstream ${workBranch}\` and say so in your summary.
   Do NOT leave it and rely on the push form to save you.

The branch name is IDENTICAL in every repo. That is CLAUDE.md rule 2 and it is load-bearing: the workspace
stack probes each repo for a branch-tagged image, so a mismatched name breaks the linked-branch pickup.
Report ok:true only when every repo is on ${workBranch} with a clean tree.
Return the structured output only.`,
    light({ label: `${id} branch`, phase: 'Branch', schema: BRANCH_SCHEMA })
  )

  if (!branched || !branched.ok) {
    log(`${id}: BRANCH STAGE FAILED — ${branched ? branched.summary : 'agent failed'}`)
    results.push({ id, ticket: ticket.key, outcome: 'branch-failed', detail: branched?.summary ?? 'agent failed' })
    stopped = { reason: 'branch-failed', detail: `${id}: ${branched?.summary ?? 'agent failed'}` }
    break
  }
  } // ticketAndBranch

  let plan = null
  let rawFindings = []
  let confirmed = []
  let judgement = { decisions: [], fixNow: [], summary: 'No findings to judge.' }
  let land = null
  let mergesInProgress = []
  let workspaceEdits = []
  const findingCounts = () => ({ raw: rawFindings.length, confirmed: confirmed.length, fixed: judgement.fixNow.length })

  build: {
    if (resumeAt !== 'build') {
      log(`${id}: already built on ${workBranch} — skipping to ${resumeAt}`)
      break build
    }

  // -----------------------------------------------------------------------
  // Baseline — never build on a red tree.
  // -----------------------------------------------------------------------
  phase('Baseline')

  const baseline = await agent(
    IS_BRANCH ? branchBaselinePrompt(id, rowGatePhases) : `You are the BASELINE GUARD for increment ${id}. Establish that the tree is clean, on the right branch and
green BEFORE any edit, so a failure later in this increment is unambiguously ours. You run fixed commands and
report what they printed. You choose no test, script or suite: \`tim build gate\` does that.
${GUARDRAILS}
${REPO_RULE}
${GATE_RULE}
TASK:
1. THE BRANCH. The branch stage has already put the increment's repos on their branch, cut from a fresh
   \`${BASE_BRANCH}\`. Do not switch branches. Record which branch each repo is on
   (\`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`) in your summary.
   One assertion only: if ANY repo is on \`${BASE_BRANCH}\`, stop and report ok:false naming it. You are not
   checking that it is on the *right* branch; you are refusing to let an increment start editing a repo that is
   on the base branch, because every later stage then commits and pushes there. This is the last cheap place to
   catch a repo the branch stage did not cover.
2. CLEAN TREES. Determine the increment's repos by the ITS REPOS rule${repos ? ` (the ticket stage settled them: ${repos.join(', ')})` : ''}
   (\`jq '.increments[] | select(.id=="${id}") | {repos, repo}' ${BACKLOG_TILDE}\`) and confirm each one is clean:
   \`git -C ${TILDE}/<repoPath> status --short\`.
   If any is DIRTY, stop and report ok:false — an unclean tree makes commit-or-rollback unsafe.
   ${SPEC_RULE} It too must be clean before the increment starts: the land stage commits everything under it as
   this increment's, so anything already there would go in with it. If it is dirty, report ok:false naming the files.
3. THE GATE. Run these, in this order, one Bash call each, and nothing else:
${gateCommandList(GATE_PHASES, gateLogs(id, 'baseline'))}
   Stop after the first one that comes back red: nothing is built on a red baseline, so a later phase proves nothing.
4. REPORT what tim printed, not your reading of it. rungs[]: every rung from every phase, each with the \`repo\`,
   \`name\`, \`phase\`, \`ok\`, \`log\` and \`reason\` tim gave it. green:true only if every phase that had rungs came back
   green. ok:true only if steps 1 and 2 passed. Put each red rung's reason in your summary, word for word.
Return the structured output only.`,
    light({ label: `${id} baseline`, phase: 'Baseline', schema: BASELINE_SCHEMA })
  )

  // A red tree before this increment touched anything makes nothing downstream
  // trustworthy, so the run stops rather than trying the next increment against
  // the same tree.
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

  // -----------------------------------------------------------------------
  // Plan — just in time, against the tree the implementor is about to edit.
  // -----------------------------------------------------------------------
  phase('Plan')

  plan = await planIncrement(id, repos)

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

  // -----------------------------------------------------------------------
  // Implement — execute the plan, and nothing else.
  // -----------------------------------------------------------------------
  phase('Implement')

  // Branch lifecycle only: the loop, not the planner or the implementor, owns
  // the git mechanics of a merge row. It starts each merge here and leaves it
  // in progress for the implementor to resolve.
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
        instructions: `You are implementing increment ${id}. Execute the plan at ${PLANS}/${id}.md.`,
        workingBranch: workBranch,
        bindings: { gateUnit: codexGateUnit(id, 'implement') }
      })
    : await agent(
    `You are the IMPLEMENTOR for increment ${id}. You execute the plan and nothing else — you do not review it,
and you do not commit it.
${GUARDRAILS}
${readIncrement(id)}
${REPO_RULE}${IS_BRANCH ? implementMergeTask(mergesInProgress, mergesAlreadyIn) : ''}${IS_BRANCH && repos.length === 0 ? WORKSPACE_ONLY_TASK : ''}
${readPlan(id)} Follow it verbatim: it has already settled every choice. Where it names an exemplar, open that file
and copy its shape rather than improvising. Where it follows a repo's recipe, read the recipe it cites and follow
it exactly. Where the plan is wrong about the tree, do the smallest thing that meets the increment's acceptance
criteria and say what you changed in notes.
Before you write to a file, read the rules and best-practice files the plan lists for it.
Where the plan follows ${SKILLS}/frontend-change/SKILL.md, substitute this programme's repo only for TARGET REPO
paths and npm --prefix. **Paths under the WORKSPACE root \`${TILDE}\` are LITERAL — never substitute them.** The
skill's Step 5 writes the workspace's own behaviour spec (\`${TILDE}/openspec/specs\`, \`${TILDE}/openspec/coverage\`)
and calls \`${TILDE}/tools/frontend-change/openspec-validate.sh\`; those live in the workspace repo, and rewriting them
at the target repo would write the spec into the wrong tree. For Step 5's two roots: the TARGET REPO is
${REPO_PATH.frontend ? `\`${TILDE}/${REPO_PATH.frontend}\`` : 'the backlog repo the plan names for the journey change'}; the SPEC ROOT is \`${TILDE}\` (the skill's default — do NOT pass one). Leave the
\`openspec/\` write uncommitted — the land stage commits it — and name every file the skill's completion output lists
in your notes. If the skill HALTS at spec sync, the increment is NOT complete: report the halt, do not paper over it.

RULES:
- Implement EXACTLY the plan's scope. Do not fix adjacent things you notice — report them in notes instead;
  a later increment or the judge will deal with them.
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
- Write the tests the plan lists, the integration proof included — they are part of the increment, not optional
  extras.
- STAGE your work (\`git -C ... add\`) but DO NOT COMMIT. Landing is a later step that runs after review.
- If you get stuck on a red step, you get at most 3 self-repair attempts. If still red, stop and report ok:false
  with exactly what is red and what you tried — do NOT thrash, and do NOT weaken a test to make it pass.
${builderGateRule(id, 'implement', builderPhases)}

Return ok, a summary, changedFiles, and notes (anything the reviewers, the judge or the ladder should know,
including anything the increment got wrong and any diagnosis of a red suite you made).
changedFiles: every file you created or edited, each written \`<repoKey>:<repo-relative path>\` with the repo keys
${REPO_KEYS.join(', ')}${IS_BRANCH ? ` (and \`${WORKSPACE_KEY}\` for a file in the workspace repo itself)` : ''} — e.g. \`frontend:src/server/app/index.js\`. Review is grouped by repo and language from it.`,
    heavy({ label: `${id} implement`, phase: 'Implement', schema: incrementSchema })
  )

  const attempt = { id, ticket, workBranch }

  // The attempt is preserved as a pushed wip commit, so the work is not lost —
  // but a dead implementor has had its go, and the run stops rather than
  // deriving an increment that would be built on top of it.
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

  // Returns the preserved result when a repo is off the run's branch and could
  // not be moved back, or null when every repo is on it.
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

  // -----------------------------------------------------------------------
  // Review — style and correctness, one pair of reviewers per (repo,
  // language) group of changed files, in parallel, plus consistency.
  // -----------------------------------------------------------------------
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
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/code-style/references/STYLE_FILE_REVIEWER.md IN FULL and follow it. It defines what
you look for and the bundle to judge against. Also read ${SKILLS}/code-style/SKILL.md for the language routing
(Java → modern-java + Javadoc; GDS/Nunjucks → components/styles/patterns; Playwright → playwright; Node → the
17-rule style guide + JSDoc). The persona is written per file: apply it to each file in the list in turn, and load
the bundle once for the group.
CONTEXT: the increment is at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`, and the plan it was
built from at ${PLANS}/${id}.md. See the change with ${groupDiffCommand(group)} for
each file, and compare it with the exemplar the plan names for that file.${mergeNote}
SCOPE: style only — formatting, naming, conventions, idiom, comment discipline, copy structure. Correctness and
security belong to a different reviewer; do not duplicate them.
HOUSE RULES that override generic style advice: comments are removed aggressively (code near-bare; rationale lives
in docs/, not in the file); no migration/rename comments — git history is the source of truth; pipelines get named
helper functions rather than dense inline callbacks; names say what a thing does, never the benefit it brings.
Report ONLY real findings, each with a concrete fix. No praise, no summary of what a file does. If every file is
clean, return an empty findings array.
Return the structured output only.`,
      heavy({ label: `${id} style:${group.name}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )
  )

  const codeReviews = reviewGroups.map((group) => () =>
    agent(
      `You are a CODE REVIEWER for increment ${id}, reviewing ${groupHeader(group)}
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/FILE_REVIEWER.md IN FULL and follow it. Also read
${SKILLS}/review/SKILL.md for the review dimensions. The persona is written per file: apply it to each file in the
list in turn.
CONTEXT: the increment is at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\` — its
acceptanceCriteria are what this code is supposed to do, and the header's invariants
(\`jq 'del(.increments)' ${BACKLOG_TILDE}\`) are what it must not break. The plan is at ${PLANS}/${id}.md. See the
change with ${groupDiffCommand(group)} for each file.${mergeNote}
SCOPE: correctness, security, error handling, performance, and TEST QUALITY. Specifically hunt for:
- behaviour that does not match the increment's acceptanceCriteria, or a behaviour change the plan did not declare
- tests that assert implementation rather than behaviour (toHaveBeenCalledWith on a collaborator is the tell);
  mocks at the module boundary rather than the network boundary
- tests whose name claims something their assertions do not pin (coverage padding — those should be deleted)
- missing negative/edge cases the acceptance criteria imply
- the traps the plan's risks name, and the programme-specific ones — for example, in a multi-set frontend:
  route-shape vs link-builder confusion (route tables must use the PREFIX-FREE builders; rendered links, redirects
  and form actions must use the PREFIX-BEARING ones), display logic leaking into obligations or the model, and any
  platform-layer file that has learned a set's vocabulary.
Report ONLY real findings with a concrete failure scenario. Style nits belong to a different reviewer — skip them.
Return the structured output only.`,
      heavy({ label: `${id} review:${group.name}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )
  )

  const consistencyReview = () =>
    agent(
      `You are the CONSISTENCY REVIEWER for increment ${id} — you look ACROSS the whole change, not at one file.
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/CONSISTENCY_REVIEWER.md IN FULL and follow it.
CONTEXT: increment at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`; plan at ${PLANS}/${id}.md;
the whole change via \`git -C ${TILDE}/<repoPath> diff --staged\` in EVERY repo the plan names.${mergeNote}${IS_BRANCH && repos.length === 0 ? WORKSPACE_REVIEW_LINE : ''}
LOOK FOR: the same concept named two ways across files; a pattern the repo already has, reimplemented instead of
reused (compare with the exemplar the plan names); registration that exists in one place but not its twin (a page
in dispatch but not in the contract table, a feature in features/index.js but not evaluation.js, copy.en.js
without the matching copy.cy.js key); an obligation with no schema field behind it or a schema field nothing
writes; a move or new file the plan listed that did not happen; THE CONTRACT BETWEEN REPOS — what the frontend
sends and expects matches what the backend accepts and returns, and the tests repo exercises the slice through it;
an acceptance criterion nothing in the change proves; and the plan's section 5 — run each check it names and
report any that fails as a finding. A better solution than the plan imagined is not a finding.
Write each finding's \`file\` as \`<repoKey>:<repo-relative path>\` (repo keys ${REPO_KEYS.join(', ')}), so it can be
routed to the right verifier.
Return the structured output only.`,
      heavy({ label: `${id} consistency`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )

  // Codex reviews at the same granularity as Claude: one run per group applying
  // that group's personas (style + code, code alone for docs), plus one
  // consistency run across the whole change. hrp-origin-codex inc-001 had one
  // run over the whole change return 1 finding where the grouped Claude review
  // of the same increment returned 21 raw, 3 confirmed.
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
Apply every persona bound to <personas>, and no other. Another Codex run reviews each other group, and a consistency
run looks across the whole change, so report findings on this group's files only.`
    )
  )

  const codexConsistencyReview = codexReview(
    'review-consistency',
    [CONSISTENCY_PERSONA],
    `${WHOLE_CHANGE} — every file staged or committed on ${workBranch} in every repo`,
    `Review the WHOLE staged, uncommitted change for increment ${id} ACROSS files and repos. Apply the persona bound to
<personas>, and no other: other Codex runs review each (repo, language) group file by file. Hunt for the same concept
named two ways, a pattern the repo already has reimplemented, registration in one place but not its twin, the contract
between repos, an acceptance criterion nothing in the change proves, and run each check the plan's section 5 names,
reporting any that fails as a finding.`
  )

  const codexReviewResults = async () => {
    const runs = await parallel([...codexGroupReviews, codexConsistencyReview])
    const failed = runs.filter((run) => !run.result).map((run) => run.slug)
    return { results: runs.map((run) => run.result), failed }
  }

  const reviewed = EXECUTOR === 'codex'
    ? await codexReviewResults()
    : { results: await parallel([...styleReviews, ...codeReviews, consistencyReview]), failed: [] }

  // A Codex review that did not run must never read as a clean one.
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

  // -----------------------------------------------------------------------
  // Verify findings — refute before acting, so churn is never driven by a
  // plausible-but-wrong review comment.
  // -----------------------------------------------------------------------
  if (rawFindings.length > 0) {
    phase('Verify findings')
    // Grouped the way review was, by (repo, language): every finding still
    // gets refuted independently, but the increment, the conventions and each
    // diff are read once per group instead of once per file or per finding.
    const numbered = rawFindings.map((finding, index) => ({ ...finding, n: index + 1 }))
    const verifyGroups = groupFindingsForVerification(numbered)

    const verdicts = await parallel(
      verifyGroups.map((group) => () => {
        const items = group.items
        const groupFiles = group.files.join(', ')
        return agent(
          `You are an ADVERSARIAL VERIFIER for increment ${id}. You are given ${items.length} finding(s) against
${group.files.length} file(s) in the ${group.repo} repo (${groupRepoPath(group)}), language ${group.language}:
${groupFiles}. Your job is to REFUTE each of them. Default to refuted unless the evidence is clear — a wrong
finding that survives costs more than a real one that is missed, because it drives a pointless edit to working code.
${GUARDRAILS}
Judge each finding INDEPENDENTLY and on its own evidence. They do not stand or fall together, and the number of
them tells you nothing about whether any one is real.${mergeNote}

THE FINDINGS:
${items
  .map(
    (f) =>
      `${f.n}. [${f.severity}] ${f.file}${f.line ? ' line ' + f.line : ''}\n   WHAT: ${f.what}\n   WHY: ${f.why}\n   PROPOSED FIX: ${f.fix}`
  )
  .join('\n')}

CHECK THEM against the ACTUAL code (${groupDiffCommand(group)} for each file named,
where the \`<repoKey>:\` prefix is dropped to get <path>, and Read each file in full — the diff alone can mislead),
against the increment's acceptanceCriteria
(\`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`), and against the house conventions the
repo actually follows (find a comparable file and compare — "unconventional" is only a finding if the convention
really exists here). Read those sources ONCE and reuse them across all ${items.length} findings.
For each: real:false if it is wrong, already handled elsewhere, out of the increment's scope, or a matter of taste
dressed as a defect. real:true ONLY if you could not refute it. Cite file:line in every reasoning.
Return one verdict per finding, using the SAME numbers as above. Return the structured output only.`,
          heavy({ label: `${id} verify:${group.name}`, phase: 'Verify findings', schema: VERDICT_SCHEMA })
        ).then((v) => {
          // A dead verifier must not silently delete findings — pass them to the
          // judge marked unrefuted rather than dropping them on the floor.
          if (!v) return items.map((f) => ({ ...f, verdict: 'VERIFIER FAILED — unrefuted, treat with caution' }))
          const byN = new Map((v.verdicts ?? []).map((x) => [x.n, x]))
          return items.map((f) => {
            const verdict = byN.get(f.n)
            if (!verdict) return { ...f, verdict: 'NO VERDICT RETURNED — unrefuted, treat with caution' }
            return verdict.real ? { ...f, verdict: verdict.reasoning } : null
          })
        })
      })
    )
    confirmed = verdicts.filter(Boolean).flat().filter(Boolean)
    log(`${id}: ${confirmed.length}/${rawFindings.length} findings survived refutation`)
  }

  // -----------------------------------------------------------------------
  // Judge — replaces the skills' interactive WALKER. Makes the calls itself.
  // -----------------------------------------------------------------------
  if (confirmed.length > 0) {
    phase('Judge')
    judgement =
      (await agent(
        `You are the JUDGE for increment ${id}. You replace the interactive triage step a human would normally do —
read ${SKILLS}/review/references/WALKER.md to understand the triage this substitutes for, then make every call
YOURSELF. Do not defer to a human and do not ask anything.
${GUARDRAILS}
${readIncrement(id)}
CONFIRMED FINDINGS (each already survived an adversarial refutation attempt):
${confirmed
  .map(
    (f, i) =>
      `${i + 1}. [${f.severity}] ${f.file}${f.line ? ':' + f.line : ''} — ${f.what}\n   WHY: ${f.why}\n   PROPOSED FIX: ${f.fix}\n   SURVIVED REFUTATION BECAUSE: ${f.verdict}`
  )
  .join('\n')}

FOR EACH finding decide exactly one of:
- **fix-now** — it is in this increment's scope and the fix is clear. Anything that breaks an acceptance criterion,
  a security or correctness defect, a test that does not pin what it claims, or a house-rule violation is fix-now
  regardless of severity label.
- **defer-to-open-question** — real, but genuinely outside this increment's scope, or it needs a product/design
  decision that code cannot settle. You MUST then record it, so it is never silently dropped:
  \`${setRow(id, "--open-question '<the question, and the finding that raised it>'")}\`.
  Write the text inside those single quotes, and write any ' in it as \`'\\''\` — backticks and $ are then safe.
- **reject** — you disagree with it even post-refutation. Say why, with evidence.

BIAS: prefer fix-now for anything cheap and clearly right. Prefer defer for anything that would expand the
increment's blast radius. Reject freely when a finding is taste rather than defect — this loop values a small
correct increment over a large polished one.
For every fix-now item, write a COMPLETE instruction in fixNow[]: the file, exactly what to change, and how to
prove it (the test or assertion that should now pass). A fixer with no other context must be able to execute it.
Return the structured output only.`,
        heavy({ label: `${id} judge`, phase: 'Judge', schema: JUDGEMENT_SCHEMA })
      )) ?? judgement
  }

  // -----------------------------------------------------------------------
  // Fix — apply only what the judge ruled fix-now.
  // -----------------------------------------------------------------------
  let fixResult = null

  if (judgement.fixNow.length > 0) {
    phase('Fix')
    log(`${id}: judge ruled ${judgement.fixNow.length} fixes`)
    const ruledFixes = judgement.fixNow.map((f, i) => `${i + 1}. ${f}`).join('\n')
    if (EXECUTOR === 'codex') {
      fixResult = await codexStage(id, 'fix', {
        phaseName: 'Fix',
        schema: incrementSchema,
        instructions: `THE RULED FIXES for increment ${id} — apply exactly these, in order:\n${ruledFixes}

${baselineEvidence}

THE IMPLEMENTOR'S NOTES — a diagnosis it already made is yours to use:
${impl.notes || '(none)'}`,
        workingBranch: workBranch,
        bindings: { gateUnit: codexGateUnit(id, 'fix') }
      })
      if (!fixResult) {
        results.push(
          await preserveAttempt({
            ...attempt,
            phaseName: 'Fix',
            reason: 'the fix stage produced no result',
            evidence: codexNoResult(id, 'fix'),
            outcome: 'fix-failed',
            detail: codexNoResult(id, 'fix')
          })
        )
        stopped = { reason: 'fix-failed', detail: `${id}: ${codexNoResult(id, 'fix')}` }
        break
      }
      const stray = await offBranch('fix', 'Fix')
      if (stray) {
        results.push(stray)
        stopped = { reason: 'off-branch', detail: `${id} after fix: ${stray.detail}` }
        break
      }
    } else {
      fixResult = await agent(
      `You are the FIXER for increment ${id}. Apply EXACTLY the fixes the judge ruled — no more, no less.
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/REVIEW_ITEM_FIXER.md IN FULL and follow it. For any fix that is
purely stylistic also read ${SKILLS}/code-style/references/STYLE_IMPLEMENTOR.md.
${readIncrement(id)}${mergeNote ? `${mergeNote}\n` : ''}
THE RULED FIXES:
${ruledFixes}

RULES: apply each fix and prove it with the test or assertion the instruction names. Do NOT re-open anything the
judge rejected or deferred. Do NOT expand scope. If a fix turns out to be wrong or impossible, say so in your
summary rather than forcing it — a fix that requires weakening a test is not a fix. Leave everything STAGED, do
not commit.
${builderGateRule(id, 'fix', builderPhases)}
${baselineEvidence}
If a rung goes red for a reason that is not your fix — a port held, an environment variable — write the diagnosis
and whatever got it green in notes. The ladder runs after you and is given your notes.
Return the structured output only.`,
        heavy({ label: `${id} fix`, phase: 'Fix', schema: incrementSchema })
      )
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

  // -----------------------------------------------------------------------
  // Ladder — the gate, run the same way the baseline ran it, then the plan's
  // increment-specific checks. A red rung that was green at baseline is ours.
  // -----------------------------------------------------------------------
  phase('Ladder')

  const ladder = await agent(
    `You are the VERIFIER for increment ${id}. Run its ladder and report honestly.
${GUARDRAILS}
${readIncrement(id)}
${readPlan(id)}
${earlierFindings}${mergeNote ? `${mergeNote}\nA path still unresolved (${UNRESOLVED_CHECK} prints it) is a failure, never a skip.` : ''}

${GATE_RULE}

${baselineEvidence}

TASK — the ladder, IN ORDER. Every rung runs here, after the fix stage, even one the implementor or fixer already
ran green: their runs are evidence, not proof.
1. THE GATE. These, in this order, one Bash call each — the same commands the baseline ran, into their own folder:
${gateStepFor(rowGatePhases, gateLogs(id, 'ladder'))}
   Run every one, even after a red one, so you have the whole picture before you repair anything.
2. THE INCREMENT'S OWN CHECKS. The plan's section 5, "Invariants to prove", then its section 6, "Increment-specific
   checks beyond the gate", as the plan writes them, each to its own log under ${WORKAREA_TILDE}/logs/ named
   \`${id}-ladder-<step>.log\`, reading each log ONCE. These are the only commands you choose to run; none of them
   may need the workspace stack running. Where a check does, record it in failures[] as
   "could not run: needs the workspace stack — belongs in the E2E suite".
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
  a green rung with retried journey specs IS a pass, but say so explicitly.
- A rung that cannot run fails with its reason — a held port names its holder. Never kill that holder and never
  start or stop the stack to clear it: record the reason in failures[] and set green:false.
In ran[], list every gate rung as \`<repo> <name>\` and every plan check you ran. In failures[], one line per red rung
or check, with its reason and its log.
Report green:true ONLY if every rung and every check actually ran and actually passed, with no repair after it.
Return the structured output only.`,
    light({ label: `${id} ladder`, phase: 'Ladder', schema: LADDER_SCHEMA })
  )

  // -----------------------------------------------------------------------
  // Land — commit on green, non-destructive rollback on red.
  // -----------------------------------------------------------------------
  phase('Land')

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

  workspaceEdits = [...(impl.changedFiles ?? []), ...(fixResult?.changedFiles ?? [])].filter(
    (file) => IS_BRANCH && file.startsWith(`${WORKSPACE_KEY}:`)
  )

  land = IS_BRANCH
    ? await agent(
        branchLandPrompt(id, plan?.behaviourChanges, mergesInProgress),
        light({ label: `${id} land`, phase: 'Land', schema: BRANCH_LAND_SCHEMA })
      )
    : await agent(
    `Increment ${id} is implemented, reviewed, judged and verified green. COMMIT IT.
${GUARDRAILS}
${REPO_RULE}
${SET_ROW_RULE}
TASK:
1. ${CHANGED_REPOS_RULE} A repo with changes that is not on \`${workBranch}\` is a
   stop: report landed:false naming it, and change nothing in it. The increment's title, for the commit subject:
   \`jq -r '.increments[] | select(.id=="${id}") | .title' ${BACKLOG_TILDE}\`.
2. For EVERY repo you are about to commit in, confirm it is on the work branch FIRST:
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\` must print \`${workBranch}\`. If it prints
   \`${BASE_BRANCH}\`, STOP and report landed:false naming the repo. Do not commit and do not "fix it up after" —
   a commit made on the base branch is one \`git push\` away from being on the base branch for good, with no PR,
   no CI and no review behind it. That has happened here once already.
3. Confirm what is staged with \`git -C ${TILDE}/<repoPath> status --short\`. Stage anything the increment produced
   that is still untracked — but NOTHING under logs/, no coverage output, no test-results/, no .playwright artefacts.
4. Commit with a conventional message: \`<type>(${SCOPE}): <increment title>\` — \`feat\` or \`fix\` when the
   behaviour changes below are not empty, otherwise the type the increment's \`kind\` implies — a body saying what
   changed and naming the increment id and its ticket \`${ticket?.key}\`, and the trailer:
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
   Behaviour changes, from the plan: ${plan?.behaviourChanges?.length ? plan.behaviourChanges.map((b) => `\n   - ${b}`).join('') : 'none'}
   A slice across several repos gets ONE commit per repo, each with the same subject.
4a. ${SPEC_RULE} If it has changes, they are part of this increment: commit them in the workspace with the same
   subject and trailer, and nothing else from the workspace. Two commands, the pathspec on both:
   \`git -C ${TILDE} add -- openspec/\` then \`git -C ${TILDE} commit -m "<message>" -- openspec/\`.
   The pathspec on the commit is load-bearing: anything else staged in the workspace stays out of it. Do NOT push
   the workspace. Name the spec commit in your summary, separately from the repo commits.
5. Do NOT push. A later stage owns that.
6. Record it: \`${setRow(id, '--commit "<sha, or several backend first, space separated>"')}\`. Leave the status alone — this increment is not done until its PRs are merged.
Report the commit SHA. For several repos report each, backend first, space separated.
Return the structured output only.`,
    light({ label: `${id} land`, phase: 'Land', schema: LAND_SCHEMA })
  )

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

  // Committed, and the commit recorded, but the branch moved underneath it.
  // The tree is clean, so there is nothing to preserve: a human reconciles
  // the branch, and a resume pushes the recorded commit.
  if (IS_BRANCH && !land.pushed) {
    log(`${id}: PUSH FAILED — ${land.summary}`)
    results.push({ id, branch: workBranch, outcome: 'push-failed', commit: land.commit, detail: land.summary, findings: findingCounts() })
    stopped = { reason: 'push-failed', detail: `${id}: ${land.summary}` }
    break
  }
  } // build

  const findings = findingCounts()
  const judgementCalls = judgement.decisions.map((d) => `${d.call}: ${d.what}`)

  const prList = (list) => list.map((p) => `${p.repo}: ${p.url}`).join('\n')

  // -----------------------------------------------------------------------
  // Pull request — push the branch and raise one PR per repo. Idempotent:
  // an existing open PR for this head is reused, never duplicated.
  // -----------------------------------------------------------------------
  let prs = []

  finish: {
    // -----------------------------------------------------------------------
    // Branch lifecycle: the commits are already pushed by land. Find the open
    // PR in each repo the row touched, wait for CI unless the row says not to,
    // and mark the row done. No PR is raised, edited or merged, and no ticket
    // exists to close.
    // -----------------------------------------------------------------------
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
            await agent(
              branchCiFixPrompt(id, ciAttempt, prList(prs), seen),
              heavy({ label: `${id} ci fix ${ciAttempt}`, phase: 'CI', schema: incrementSchema })
            )
            ci = await watchOnBranch()
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
        judgement: judgementCalls
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
${GUARDRAILS}
${PUSH_RULE}
${MERGE_ORDER_RULE}
REPOS, in order: ${repos.join(', ')}. GitHub repos: ${ghTable}. Repo paths: ${repoTable}.

For EACH repo, in that order:
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
        the increment id and the ticket, and for a \`both\` increment names the sibling repo and states the merge
        order and why. Plain GitHub markdown here — a PR body is markdown, unlike the Jira ticket.
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

    prs = pr.prs
    log(`${id}: ${prs.length} PR(s) — ${prs.map((p) => p.url).join(' ')}`)

    // ---------------------------------------------------------------------
    // CI — block on the checks, fix red a bounded number of times, and stop
    // rather than merge anything that is not green.
    // ---------------------------------------------------------------------
    phase('CI')

    const watch = () =>
      agent(
        `You are the CI WATCHER for increment ${id} (${ticket.key}). WAIT for the checks on every PR below to
resolve, and report what they did. You change no code and you merge nothing.
${GUARDRAILS}
THE PULL REQUESTS:
${prList(prs)}

For EACH pr, in the order listed:
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

\`blocked\` is ONLY for something a code fix cannot address — no checks configured, \`gh\` refused, the PR is
gone. Setting it stops the run outright. A failing test is NOT blocked: it is a red check, and a fixer gets it.
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
${GUARDRAILS}
${PUSH_RULE}
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
        heavy({ label: `${id} ci fix ${ciAttempt}`, phase: 'CI', schema: CI_FIX_SCHEMA })
      )

      // Fold in anything the fixer had to open elsewhere, deduped by url, so
      // the next watch() blocks on it and the merge stage merges it. `prs` is
      // a plain variable and the script has no filesystem access, so a PR the
      // fixer wrote only to the backlog would otherwise stay invisible for
      // the rest of the run.
      for (const p of fix?.newPrs ?? []) {
        if (p?.url && !prs.some((existing) => existing.url === p.url)) {
          prs.push(p)
          log(`${id}: CI fixer opened ${p.repo} ${p.url} — added to this increment's PRs`)
        }
      }

      ci = await watch()
    }

    if (!ci || !ci.green) {
      // Exhausted. The PR stays open and the ticket stays in the working
      // status — a red PR is never merged and never closed, because a human
      // has to see it.
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

    // ---------------------------------------------------------------------
    // Merge — approvals collected for the WHOLE increment first, then merge
    // in canonical order, watching the base branch after each one.
    // ---------------------------------------------------------------------
    phase('Merge')

    // Merge order is the script's decision, not the order PRs happened to be
    // appended in. See MERGE_RANK.
    const mergeOrder = sortForMerge(prs)

    const merge = await agent(
      `You are the MERGE STAGE for increment ${id} (${ticket.key}). Every PR below is green${REQUIRE_APPROVAL ? `, which is
necessary but NOT sufficient — every one of them also needs an approving review on GitHub, and you collect ALL of
those BEFORE you merge ANYTHING` : ''}.
Merge them and prove \`${BASE_BRANCH}\` survived it.
${GUARDRAILS}
${MERGE_ORDER_RULE}
THE PULL REQUESTS, in merge order:
${prList(mergeOrder)}
${
  REQUIRE_APPROVAL
    ? `
STEP A — THE APPROVAL SWEEP. Do this for EVERY pr above BEFORE you merge a single one.
**This is a whole-increment gate, not a per-PR one.** It runs first because it used to run per-PR inside the merge
loop, and that merged an approved frontend while its sibling tests PR was still waiting on a reviewer — half an
increment on \`${BASE_BRANCH}\`, stale specs against a shipped UI, and CDP red. Nothing auto-reverted it.
Green CI is not consent either: it proves the code runs, not that a person agreed to it.

For EACH pr above, read its decision — this changes nothing, so the order does not matter here:
   \`gh pr view <url> --repo <ghRepo> --json reviewDecision,reviews\`
   - \`APPROVED\` → that one is satisfied. Go on to the next pr.
   - \`CHANGES_REQUESTED\` → **STOP IMMEDIATELY, before merging anything.** Report green:false,
     \`stopReason: "changes-requested"\`, and blocked "<repo> PR has changes requested".
     Leave every PR open. Do NOT merge the others, do NOT dismiss the review, and do NOT push a fix — a reviewer
     asked for something and answering them is a human's job, not this stage's.
   - anything else, including empty (\`REVIEW_REQUIRED\`, or no reviews yet) → nobody has looked at that one yet.

If any pr is still unapproved after that pass, WAIT: re-read the unapproved ones with the same command, up to
${APPROVAL_POLLS} times, sleeping 120 seconds between checks via \`sleep 120\`, until every pr reports
\`APPROVED\` — or any one of them reports \`CHANGES_REQUESTED\`, which stops you as above.
   - every pr \`APPROVED\` → the gate is satisfied for the whole increment. Go to STEP B.
   - still short after ${APPROVAL_POLLS} checks → **STOP, and this is not a failure.** Report green:false,
     \`stopReason: "awaiting-approval"\`, and blocked "<repo> PR is green and awaiting approval: <url>" naming
     EVERY pr still unapproved. **Merge nothing** — not even the ones that are approved. Leave them all open and
     untouched. Somebody will approve them and the increment resumes from its \`prs\` field on the next run,
     re-entering here with the approvals already in place.

NEVER merge a PR whose reviewDecision you have not just read and seen to be \`APPROVED\`, and never merge any PR
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
     REQUIRE_APPROVAL
       ? `
   Re-read its \`reviewDecision\` in the same call and confirm it is still \`APPROVED\` — a review can be
   dismissed between STEP A and here. Anything else stops you with \`stopReason: "awaiting-approval"\`.`
       : ''
   }
3. \`gh pr merge <url> --repo <ghRepo> --squash --delete-branch\`
4. Get the merge commit: \`gh pr view <url> --repo <ghRepo> --json mergeCommit\`
5. WATCH \`${BASE_BRANCH}\` for that commit — a green PR can still break the base branch.
   \`gh run list --repo <ghRepo> --branch ${BASE_BRANCH} --commit <sha> --json databaseId,name,status,conclusion --limit 20\`
   then, for each run it names, BLOCK on it with the tool's \`timeout\` set to 600000:
   \`gh run watch <run-id> --repo <ghRepo> --exit-status > ${WORKAREA_TILDE}/logs/${id}-main-<repo>.log 2>&1\`
   At most ${CI_WATCH_WINDOWS} watches per run; still unresolved after that counts as RED.
   **If \`${BASE_BRANCH}\` goes RED, STOP.** Report green:false, \`stopReason: "base-branch-red"\`, put "the
   base branch went red after merging
   <repo>" in blocked, and put the failing job in failures\[\]. Do NOT auto-revert and do NOT push a fix — the
   base branch being red is a human decision, not a repair job.
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

green:true ONLY if every pr merged, ${BASE_BRANCH} went green afterwards for every one of them, AND the final
sweep found no open PR left on \`${workBranch}\` in any repo.
Return the structured output only.`,
      light({ label: `${id} merge`, phase: 'Merge', schema: CI_SCHEMA })
    )

    if (!merge || !merge.green) {
      const detail = merge ? [merge.blocked, ...(merge.failures ?? [])].filter((x) => x && x !== 'none').join(' | ') : 'merge agent died'
      // Waiting on a reviewer is not a broken increment, and must never be
      // reported as one: `main-red` reads as "something is wrong with the
      // build", and the fix for that is nothing like "go and ask a colleague".
      //
      // The stage says which condition fired in `stopReason`, a fixed enum
      // value, rather than us reading it back out of its prose. Anything we
      // do not recognise — including a stage that never set it — falls to
      // `main-red`, because the two mistakes are not symmetrical: calling a
      // healthy pause a failure wastes somebody's afternoon, while calling a
      // red base branch a healthy pause hides it.
      const stopReason = merge?.stopReason
      const atGate = stopReason === 'awaiting-approval' || stopReason === 'changes-requested'
      // `pr-left-open` is its own outcome rather than `main-red`. The base
      // branch is fine; what is wrong is that the increment is only partly
      // merged, and the two need completely different things from a human.
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
  }

  // -----------------------------------------------------------------------
  // Done — the ticket moves only once the merge is real and the base branch
  // has proved it. This is also what marks the increment done in the backlog.
  // -----------------------------------------------------------------------
  phase('Done')

  const done = await agent(
    `Increment ${id} is merged into \`${BASE_BRANCH}\` and the base branch is green. Close out ${ticket.key}.
${GUARDRAILS}
TASK — this board's finished status is \`${STATUS_DONE}\`. That name is CONFIGURATION, given to you here.
1. \`${JIRA}/transition-ticket.sh ${ticket.key} "${STATUS_DONE}"\`.
   If it reports that status is not available, run \`${JIRA}/transition-ticket.sh ${ticket.key} --list\` and
   report ok:false with BOTH the status you were asked for — \`${STATUS_DONE}\` — AND the full list of
   transitions the board actually offers, so the config fix is obvious from your report alone.
   Do NOT guess a nearby status, do NOT pick one off the list yourself, and do NOT edit the ticket some
   other way.
2. Confirm it landed: \`${JIRA}/ticket.sh ${ticket.key} summary\` must now show status \`${STATUS_DONE}\`.
3. Mark it done: \`${setRow(id, '--status done')}\`. It leaves \`ticket\`, \`branch\`, \`commit\` and \`prs\` in place —
   they are the record of how it got there.
Return the structured output only.`,
    light({ label: `${id} done`, phase: 'Done', schema: incrementSchema })
  )

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
    findings,
    judgement: judgementCalls
  })

  log(`${id}: LANDED ${ticket.key} merged to ${BASE_BRANCH}, ticket "${STATUS_DONE}" — ${rawFindings.length} findings, ${confirmed.length} confirmed, ${judgement.fixNow.length} fixed`)
  } // finish

  // A HALT-FOR-REVIEW gate is a DESIGNED human checkpoint, not a review finding.
  // The judge absorbs routine triage; it does not absorb these.
  const gate = await agent(
    `Report whether increment ${id} carries a halt gate. Run exactly one command and read it:
\`jq -r '.increments[] | select(.id=="${id}") | .gate' ${BACKLOG_TILDE}\`
If it prints \`null\`, return ok:true with summary "no gate". Otherwise return ok:false and put the gate's full text
in summary — the run will stop so a human can review before dependent increments proceed.
Do not do anything else. One Bash call, no Grep/Glob tools, tilde paths only.`,
    light({ label: `${id} gate check`, phase: 'Done', schema: incrementSchema })
  )

  if (gate && !gate.ok) {
    log(`${id}: HALT-FOR-REVIEW GATE — stopping the run. ${gate.summary}`)
    results.push({ id, ticket: ticket?.key, outcome: 'halted-at-gate', detail: gate.summary })
    stopped = { reason: 'gate', detail: `${id}: ${gate.summary}` }
    break
  }
}

log(`${WORKAREA_REL}: ${built} increment(s) landed — stopping: ${stopped.reason}. ${stopped.detail}`)

return { increments: results, stopped }
