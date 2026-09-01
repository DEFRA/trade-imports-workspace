export const meta = {
  name: 'increment-build-loop',
  description:
    'Build backlog increments one at a time, each through a full ticket-to-merge lifecycle: raise the ticket → cut the branch → implement → style review + code review → adversarially verify findings → judge → fix → verification ladder → commit → PR → CI → merge → close the ticket',
  whenToUse:
    'Running any increment backlog under workareas/. One invocation builds one increment (or a serial list) with a full multi-agent quality pass per increment. Point FALLBACK at the workarea and set its increments, or pass args.',
  phases: [
    { title: 'Ticket' },
    { title: 'Branch' },
    { title: 'Baseline' },
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
// Configuration. `args` plumbing is unreliable in this runtime, so FALLBACK is
// the real switch: edit it, or pass the same shape as args.
//   workarea        path under workareas/, holding backlog.json
//   branch          the BASE branch. Every increment cuts its own branch off
//                   this one and merges back into it
//   scope           conventional-commit scope; defaults to the workarea's basename
//   executor        'claude' (every stage a subagent) or 'codex' (implement,
//                   review and fix delegated to Codex CLI via the briefs in codex/)
//   lifecycle       'full'  ticket → branch → build → PR → CI → merge → ticket done
//                   'local' build and commit on the current branch. No Jira, no
//                           push, no PR. For programmes that do not want a PR per
//                           increment
//   jiraProject     Jira project key raised tickets land in
//   epic            parent epic every raised ticket hangs off. Required when
//                   lifecycle is 'full'
//   jiraInProgressStatus  the board's working status, set when the build starts
//   jiraDoneStatus        the board's finished status, set after the merge
//   jiraBoard       the numeric board id raised tickets are moved onto. Required
//                   when lifecycle is 'full'. Board membership is NOT a field on
//                   the issue and NOT implied by status: a freshly raised ticket
//                   lands in the board's backlog and stays there, invisible to
//                   the team, however many times it is transitioned. Moving it
//                   is a separate agile call, and this is the id it needs
//   ciFixAttempts   how many times a red PR may be fixed and re-pushed before the
//                   run stops
//   ciWatchMinutes  how long one CI watch may block before it counts as RED
//   requireApproval whether EVERY PR of an increment needs an APPROVING REVIEW
//                   ON GITHUB before the merge stage may merge ANY of them.
//                   Default true. Green CI is not consent: it proves the code
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
//                   before it stops and leaves every PR open. Default 20
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
const FALLBACK = {
  workarea: 'shared/plant-products-ched-pp',
  branch: 'main',
  scope: 'plant-products',
  executor: 'claude',
  lifecycle: 'full',
  jiraProject: 'EUDPA',
  epic: '',
  jiraInProgressStatus: 'In Progress',
  jiraDoneStatus: 'Done',
  jiraBoard: 13780,
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  increments: ['pp-053']
}
const CFG = typeof args === 'object' && args && args.increments ? args : FALLBACK

const WORKAREA_REL = String(CFG.workarea ?? '').replace(/^\/+|\/+$/g, '')
const SCOPE = CFG.scope ?? WORKAREA_REL.split('/').pop()
const BASE_BRANCH = CFG.branch
const EXECUTOR = CFG.executor ?? 'claude'
const LIFECYCLE = CFG.lifecycle ?? 'full'
const JIRA_PROJECT = CFG.jiraProject ?? 'EUDPA'
const EPIC = CFG.epic ?? ''
const STATUS_IN_PROGRESS = CFG.jiraInProgressStatus ?? 'In Progress'
const STATUS_DONE = CFG.jiraDoneStatus ?? 'Done'
const JIRA_BOARD = CFG.jiraBoard ?? ''
const CI_FIX_ATTEMPTS = CFG.ciFixAttempts ?? 3
const CI_WATCH_MINUTES = CFG.ciWatchMinutes ?? 30
const REQUIRE_APPROVAL = CFG.requireApproval ?? true
const APPROVAL_WAIT_MINUTES = CFG.approvalWaitMinutes ?? 20

// One watch call blocks for at most ten minutes — the Bash tool's ceiling. A
// longer wait is that many consecutive watches, and running out of them is RED.
const CI_WATCH_WINDOWS = Math.max(1, Math.ceil(CI_WATCH_MINUTES / 10))

// Approval polls are cheap, so the window is a count of two-minute checks.
// Running out is NOT a failure — it means nobody has looked yet, and the PR is
// left open for them to.
const APPROVAL_POLLS = Math.max(1, Math.ceil(APPROVAL_WAIT_MINUTES / 2))

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
if (LIFECYCLE !== 'full' && LIFECYCLE !== 'local') {
  throw new Error(`increment-build-loop: unknown lifecycle "${LIFECYCLE}" — expected "full" or "local"`)
}
if (LIFECYCLE === 'full' && !/^[A-Z]+-\d+$/.test(EPIC)) {
  throw new Error(
    `increment-build-loop: config.epic is required when lifecycle is "full" — the parent epic every raised ticket hangs off, e.g. "${JIRA_PROJECT}-20628". Got "${EPIC}"`
  )
}
if (LIFECYCLE === 'full' && (!STATUS_IN_PROGRESS.trim() || !STATUS_DONE.trim())) {
  throw new Error(
    `increment-build-loop: config.jiraInProgressStatus and config.jiraDoneStatus must both name a real status on the board. Confirm them with \`tools/jira/transition-ticket.sh <ANY-KEY> --list\`. Got "${STATUS_IN_PROGRESS}" and "${STATUS_DONE}"`
  )
}
if (LIFECYCLE === 'full' && !/^\d+$/.test(String(JIRA_BOARD))) {
  throw new Error(
    `increment-build-loop: config.jiraBoard is required when lifecycle is "full" — the numeric id of the board raised tickets are moved onto, e.g. 13780 for EUDPA. Without it every ticket is raised into the board's backlog and stays there, which no status change fixes. Got "${JIRA_BOARD}"`
  )
}
if (!Number.isInteger(CI_FIX_ATTEMPTS) || CI_FIX_ATTEMPTS < 0) {
  throw new Error(`increment-build-loop: config.ciFixAttempts must be a non-negative integer — got "${CI_FIX_ATTEMPTS}"`)
}

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
  { label: 'workspace', phase: 'Baseline', schema: WORKSPACE_SCHEMA }
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
const SKILLS = ABS + '/.claude/skills'
const BRIEFS = ABS + '/.claude/workflows/codex'
const BRIEFS_TILDE = TILDE + '/.claude/workflows/codex'
const JIRA = TILDE + '/tools/jira'

const REPO_PATH = {
  frontend: 'repos/trade-imports-animals-frontend',
  backend: 'repos/trade-imports-animals-backend',
  tests: 'repos/trade-imports-animals-tests'
}

const GH_REPO = {
  frontend: 'DEFRA/trade-imports-animals-frontend',
  backend: 'DEFRA/trade-imports-animals-backend',
  tests: 'DEFRA/trade-imports-animals-tests'
}

const repoTable = Object.entries(REPO_PATH)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ')
const ghTable = Object.entries(GH_REPO)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ')

const REPO_RULE = `REPO PATHS: ${repoTable}. An increment whose "repo" field is \`both\` means BOTH the backend and the
frontend repo — do the work in each, on the SAME branch name (CLAUDE.md rule 2, cross-repo branch parity).`

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
- Never \`git push --force\`. Never merge a PR that is not green.
- NEVER push to \`${BASE_BRANCH}\`. Nothing in this loop writes to the base branch except the merge stage, and it
  does it by merging an approved PR. Every other push in every other stage goes to a work branch, always with the
  fully-qualified refspec form given below. A push that updates \`${BASE_BRANCH}\` has bypassed CI, review and the
  approval gate at once.
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
const PUSH_RULE = `HOW TO PUSH — the exact form, every time, no variations:
\`git -C ${TILDE}/<repoPath> push -u origin refs/heads/<branch>:refs/heads/<branch>\`
Never \`--force\`. Never a bare \`git push\`. Never \`push origin <branch>\` — that leaves git to work out the
destination, and in a repo configured \`push.default=tracking\` (two of these three repos are) it resolves to the
branch's upstream, which is how a commit once landed on \`${BASE_BRANCH}\` with no PR behind it. The fully
qualified \`refs/heads/X:refs/heads/X\` can only ever update branch X.

BEFORE ANY COMMIT OR PUSH, prove you are on the branch you think you are:
\`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`
If that prints anything other than the work branch — \`${BASE_BRANCH}\` above all — STOP and report ok:false.
Do not commit "just this once" and sort the branch out afterwards.`

// Preserving a failed attempt. A stash is machine-local: on another machine the
// ref means nothing and the work is gone. Under the full lifecycle the increment
// already owns a branch, so the work is committed and PUSHED there and travels.
// A stash stays the mechanism for genuinely local mess, and the only rollback verb.
const preserveWork = (id, branch, reason, evidence) =>
  LIFECYCLE === 'full'
    ? `Attempt at increment ${id} failed: ${reason}. PRESERVE THE WORK so it survives this machine.
${GUARDRAILS}
${REPO_RULE}
${PUSH_RULE}
EVIDENCE: ${evidence}
TASK — the work goes onto its own branch, not into a stash. A stash ref does not travel; a pushed branch does.
1. Look up the increment's repo(s): \`jq -r '.increments[] | select(.id=="${id}") | .repo' ${BACKLOG_TILDE}\`.
2. For EACH repo, stage what the increment produced — but NOTHING under logs/, no coverage output, no
   test-results/, no Playwright artefacts.
3. Commit it on \`${branch}\`, marked as failing: subject \`wip(${SCOPE}): <increment title> — ${reason}\`,
   body naming exactly what went red, and the usual trailer.
4. \`git -C ${TILDE}/<repoPath> push -u origin refs/heads/${branch}:refs/heads/${branch}\` — never \`--force\`.
   That is what lets another engineer fetch the attempt and see what was tried.
5. Do NOT open a pull request. This work does not pass its ladder and must not look reviewable.
6. Confirm each tree is clean: \`git -C ${TILDE}/<repoPath> status --short\`.
7. Append an "ATTEMPT FAILED" note to the increment's notes in ${BACKLOG}: what went red, the branch name and
   the wip commit SHA. Do NOT write a \`commit\` field — the increment is not built, and writing one would make
   the next attempt skip the build. Keep the JSON valid (\`jq empty ${BACKLOG_TILDE}\`).
The next attempt branches from here and builds on top; the squash merge collapses the wip commit.
NEVER \`reset --hard\`, NEVER \`clean -fd\`.
Report the branch name and the wip SHA.
Return the structured output only.`
    : `Attempt at increment ${id} failed: ${reason}. Roll it back NON-DESTRUCTIVELY and preserve the evidence.
${GUARDRAILS}
${REPO_RULE}
EVIDENCE: ${evidence}
TASK:
1. Look up the increment's repo(s): \`jq -r '.increments[] | select(.id=="${id}") | .repo' ${BACKLOG_TILDE}\`.
2. \`git -C ${TILDE}/<repoPath> stash push -u -m "failed-${id}"\` for EACH of them — NEVER \`reset --hard\`,
   NEVER \`clean -fd\`. The stash is recoverable and that is the point.
3. Confirm each tree is clean: \`git -C ${TILDE}/<repoPath> status --short\`.
4. Append an "ATTEMPT FAILED" note to the increment's notes in ${BACKLOG} recording what went red and the
   stash ref, so the next attempt starts informed. Keep the JSON valid (\`jq empty ${BACKLOG_TILDE}\`).
Report the stash refs so the work can be recovered. Note that a stash is machine-local — it does not travel.
Return the structured output only.`

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
Run this Bash command and read the output: \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`
That object is your brief. Backlogs differ in shape, so read what THIS one carries and work from that.
It may spell the change out — filesToTouch (paths + action + what), obligations, flowChanges, schemaFields,
copyKeys, specs, acceptanceCriteria, verification (the ladder, in order), notes, openQuestions. It may
instead state a finding and cite the evidence for it, and leave the change to you. Both are supported inputs.
A field that is absent is NOT a defect and NOT a reason to stop: THE BACKLOG SAYS WHAT IS WRONG, AND
WORKING OUT WHAT TO CHANGE IS YOUR JOB. Derive it from the code and the cited evidence, and say in your
summary what you derived and why.
What IS worth reporting as a defect is a claim that does not hold — a path that is not there, a citation
whose line has moved on, an asserted behaviour the application does not have. Thin is fine; wrong is not.
Supporting context: read ONLY what the increment's "recipe" field cites, resolving workarea-relative paths
against ${WORKAREA}. Read the cited sections, not the whole document.
`

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

const codexPaths = (id, stage) => ({
  promptFile: `${WORKAREA}/logs/${id}-${stage}.prompt.md`,
  promptFileTilde: `${WORKAREA_TILDE}/logs/${id}-${stage}.prompt.md`,
  lastMessage: `${WORKAREA}/logs/${id}-${stage}.lastmsg.txt`,
  lastMessageTilde: `${WORKAREA_TILDE}/logs/${id}-${stage}.lastmsg.txt`,
  runLog: `${WORKAREA_TILDE}/logs/${id}-${stage}.log`
})

const codexRun = (id, stage, phaseName, instructions, workingBranch) => {
  const { brief, schemaFile } = CODEX[stage]
  const { promptFile, promptFileTilde, lastMessageTilde, runLog } = codexPaths(id, stage)

  return agent(
    `You are the CODEX SHELL for the ${stage} stage of increment ${id}. Codex does the work; you start it, wait
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
  <INCREMENT_ID> = ${id}

${instructions}
---8<---
STEP 2 — run EXACTLY this one command with run_in_background true, then wait for it to exit:
\`codex exec -C ${WORKAREA_TILDE} --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema ${BRIEFS_TILDE}/schemas/${schemaFile} -o ${lastMessageTilde} "Read ${promptFileTilde} and follow it in full." > ${runLog} 2>&1\`
STEP 3 — check that it produced a result. One Bash call: \`jq empty ${lastMessageTilde}\`
STEP 4 — report TRANSPORT and nothing else:
- ok:true ONLY if the command exited ZERO and \`jq empty\` accepted ${lastMessageTilde}. Put Codex's
  \`tokens used\` line from the tail of ${runLog} in your summary.
- ok:false in EVERY other case — non-zero exit, ${lastMessageTilde} missing, or jq rejecting it. Quote the
  tail of ${runLog} in your summary so the failure is diagnosable.
ok here is about the RUN, NEVER about what Codex concluded: a Codex run that finished and reported a problem,
a red suite or an unapplied fix is still ok:true to you. NEVER write ${lastMessageTilde} yourself and never
invent a result.
Return the structured output only.`,
    { label: `${id} codex:${stage}`, phase: phaseName, schema: incrementSchema }
  )
}

const codexRelay = (id, stage, phaseName, schema) => {
  const { schemaFile, relay } = CODEX[stage]
  const { lastMessage } = codexPaths(id, stage)

  return agent(
    `You are the RELAY for the ${stage} stage of increment ${id}. Codex has already run and written its final
message to ${lastMessage}. Re-emitting that file as your structured output is your ENTIRE job.
${GUARDRAILS}
Read ${lastMessage} once with the Read tool. It conforms to ${BRIEFS}/schemas/${schemaFile}.
${relay}
Add nothing of your own — no findings, no opinions, no work. Run no suite. Edit no file.
Return the structured output only.`,
    { label: `${id} relay:${stage}`, phase: phaseName, schema }
  )
}

// Returns null when the stage could not produce a result — a dead shell agent, a
// codex run that never wrote one, or a dead relay. Callers must treat null as a
// failure to review/implement/fix, never as an empty-but-valid result.
const codexStage = async (id, stage, phaseName, schema, instructions, workingBranch) => {
  const run = await codexRun(id, stage, phaseName, instructions, workingBranch)
  if (!run || !run.ok) {
    log(`${id}: codex ${stage} DID NOT RUN — ${run ? run.summary : 'the codex shell agent died'}`)
    return null
  }
  const relayed = await codexRelay(id, stage, phaseName, schema)
  if (!relayed) log(`${id}: codex ${stage} ran but its relay agent died`)
  return relayed
}

const codexResult = (result, stage, id) => {
  if (result) return result
  throw new Error(
    `increment-build-loop: the codex ${stage} stage produced no result for ${id} — the run or its relay failed. Halting rather than treating a stage that did not run as a clean one. See ${WORKAREA}/logs/${id}-${stage}.log`
  )
}

const preflight = await agent(
  `Report whether this run's backlog exists and is readable. Run exactly one command and read its output:
\`jq -e '.increments | length' ${BACKLOG_TILDE}\`
If it prints a number, return ok:true with that number in summary. If the file is missing or is not valid
JSON, return ok:false quoting the error. Do nothing else. One Bash call, no Grep/Glob tools, tilde paths only.`,
  { label: 'preflight', phase: 'Baseline', schema: incrementSchema }
)

if (!preflight || !preflight.ok) {
  throw new Error(
    `increment-build-loop: no readable backlog at ${BACKLOG} (workarea "${WORKAREA_REL}") — ${preflight ? preflight.summary : 'preflight agent failed'}`
  )
}

log(
  `${WORKAREA_REL}: ${CFG.increments.length} increment(s) off ${BASE_BRANCH}, executor ${EXECUTOR}, lifecycle ${LIFECYCLE}`
)

const results = []

for (const id of CFG.increments) {
  // -----------------------------------------------------------------------
  // Ticket — reuse or raise, put it in the working status, and work out where
  // to resume. Runs first so a retry never re-does work the last attempt landed.
  // -----------------------------------------------------------------------
  let ticket = null
  let workBranch = BASE_BRANCH
  let repos = null
  let resumeAt = 'build'

  if (LIFECYCLE === 'full') {
    phase('Ticket')

    ticket = await agent(
      `You are the TICKET STAGE for increment ${id}. You give the increment a Jira ticket and work out where in
the lifecycle this run picks up. YOU RAISE AT MOST ONE TICKET, AND ONLY IF THE INCREMENT HAS NONE.
${GUARDRAILS}
${REPO_RULE}

STEP 1 — READ WHAT IS ALREADY PERSISTED. One Bash call:
\`jq -r '.increments[] | select(.id=="${id}") | {ticket, branch, commit, prs, repo, kind, title}' ${BACKLOG_TILDE}\`
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
  d. **IMMEDIATELY** persist it: Edit ${BACKLOG} to set this increment's \`ticket\` field to the key, before you
     do anything else at all. Re-check with \`jq empty ${BACKLOG_TILDE}\`. This write is what makes a retry safe.

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
- Otherwise build it as \`<type>/<KEY>-<slug>\` and persist it to the increment's \`branch\` field
  (Edit ${BACKLOG}, then \`jq empty ${BACKLOG_TILDE}\`):
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

STEP 7 — repos[]: from the increment's \`repo\` field. frontend → \["frontend"\]; backend → \["backend"\];
tests → \["tests"\]; both → \["backend","frontend"\] IN THAT ORDER.
If the field is ABSENT, \`null\` or empty — whole backlogs are written without it — do NOT guess a single repo
from the increment's title or band. Read its \`band\` and apply this:
  \`frontend-work\` or anything else that changes the UI → \["frontend","tests"\]
  \`needs-backend\` → \["backend","frontend","tests"\]
  a band that is plainly tests-only → \["tests"\]
**Include \`tests\` in every case that changes what a user sees.** A UI change breaks the E2E specs and their
visual baselines essentially always, so the tests repo is part of the increment from the start, not a surprise.
Naming it here is what gets it BRANCHED, and a repo that is never branched sits on \`${BASE_BRANCH}\` for the
whole run — which is how an increment once committed straight onto the tests repo's main. Over-listing a repo
costs nothing: a repo with no changes simply gets no commit and no PR.

Report ok:true only if the ticket exists, its status is one you left alone or successfully set, STEP 4
moved it onto the board, and the branch name is persisted. Report \`status\` as the ticket's status when you
finished, verbatim.
Return the structured output only.`,
      { label: `${id} ticket`, phase: 'Ticket', schema: TICKET_SCHEMA }
    )

    if (!ticket || !ticket.ok || !ticket.key) {
      log(`${id}: TICKET STAGE FAILED — ${ticket ? ticket.summary : 'agent failed'}`)
      results.push({ id, outcome: 'ticket-failed', detail: ticket?.summary ?? 'agent failed' })
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
      break
    }

    workBranch = ticket.branch
    repos = ticket.repos
    resumeAt = ticket.resumeAt ?? 'build'
    log(
      `${id}: ${ticket.key} (${ticket.created ? 'raised' : 'reused'}) on board ${JIRA_BOARD}, branch ${workBranch}, resuming at ${resumeAt}`
    )

    // ---------------------------------------------------------------------
    // Branch — off FRESH base, in every repo the increment touches. Refuses on
    // a dirty tree, because switching branches over uncommitted work loses it.
    // ---------------------------------------------------------------------
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
      { label: `${id} branch`, phase: 'Branch', schema: BRANCH_SCHEMA }
    )

    if (!branched || !branched.ok) {
      log(`${id}: BRANCH STAGE FAILED — ${branched ? branched.summary : 'agent failed'}`)
      results.push({ id, ticket: ticket.key, outcome: 'branch-failed', detail: branched?.summary ?? 'agent failed' })
      break
    }
  }

  let rawFindings = []
  let confirmed = []
  let judgement = { decisions: [], fixNow: [], summary: 'No findings to judge.' }
  let land = null

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
    `You are the BASELINE GUARD for increment ${id}. Establish that the tree is green BEFORE any edit, so a
failure later in this increment is unambiguously ours.
${GUARDRAILS}
${readIncrement(id)}
${REPO_RULE}
TASK:
1. Determine the increment's repo(s) from its "repo" field and confirm each one is clean:
   \`git -C ${TILDE}/<repoPath> status --short\`.
   If any is DIRTY, stop and report ok:false — an unclean tree makes commit-or-rollback unsafe.
2. Record which branch each repo is on (\`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`) and put it
   in your summary. Do not switch branches — an earlier stage owns that.
   One assertion only: if ANY repo is on \`${BASE_BRANCH}\`, stop and report ok:false naming it. You are not
   checking that it is on the *right* branch; you are refusing to let an increment start editing a repo that is
   on the base branch, because every later stage then commits and pushes there. This is the last cheap place to
   catch a repo the branch stage did not cover.
3. Run the FASTEST meaningful suite for each repo, to a log, and read it once:
   frontend: \`npm --prefix ${TILDE}/${REPO_PATH.frontend} test > ${WORKAREA_TILDE}/logs/${id}-baseline-frontend.log 2>&1\`
   backend:  \`mvn -q -f ${TILDE}/${REPO_PATH.backend}/pom.xml test > ${WORKAREA_TILDE}/logs/${id}-baseline-backend.log 2>&1\`
   tests:    read package.json and run its unit/lint script if one exists; if the suite needs a running stack, SKIP it and say so.
4. Report ok:true only if every repo's tree is clean and every suite is green.
Return the structured output only.`,
    { label: `${id} baseline`, phase: 'Baseline', schema: incrementSchema }
  )

  if (!baseline || !baseline.ok) {
    log(`${id}: BASELINE RED — skipping. ${baseline ? baseline.summary : 'agent failed'}`)
    results.push({ id, outcome: 'baseline-red', detail: baseline?.summary ?? 'agent failed' })
    continue
  }

  // -----------------------------------------------------------------------
  // Implement — the frontend-change skill is the script for frontend work.
  // -----------------------------------------------------------------------
  phase('Implement')

  const impl = EXECUTOR === 'codex'
    ? await codexStage(id, 'implement', 'Implement', incrementSchema, `You are implementing increment ${id}.`, workBranch)
    : await agent(
    `You are the IMPLEMENTOR for increment ${id}. You make the change and nothing else — you do not review it,
and you do not commit it.
${GUARDRAILS}
${readIncrement(id)}
${REPO_RULE}

HOW TO BUILD IT — route on the increment's "repo" field:
- **frontend** → the workspace frontend-change skill is your script. READ ${SKILLS}/frontend-change/SKILL.md IN
  FULL and follow it verbatim. It routes you to the repo's own recipe under
  \`src/server/app/sets/<set>/docs/add-a-*.md\` (or the obligation/flow maintenance guard rails) — read that recipe
  and follow it, varying as little as possible. Do NOT improvise around a recipe. The recipes are set-relative, so
  where the increment targets a set other than the one a recipe was written against (\`sets/<set>/\`), substitute the
  set folder and otherwise follow it exactly. Where the increment cites a gap that no recipe covers, the increment's
  own filesToTouch IS the script, and any exemplar it names is the shape to imitate.
- **backend** → follow the increment plus the workspace Java best practices
  (${TILDE}/docs/best-practices/java/). Mirror the existing animals package idiom exactly. Compact-constructor null
  guards on public records at API boundaries. One round-trip + one unknown-value negative per enum — never a test
  per enum constant.
- **tests** → follow the increment plus ${TILDE}/docs/best-practices/playwright/. Independent tests, raw
  role/label locators, no page objects where the repo does not already use them, no sleeps, expect.poll only for
  non-locator state.

RULES:
- Implement EXACTLY the increment's scope. Do not fix adjacent things you notice — report them in notes instead;
  a later increment or the judge will deal with them.
- Every user-facing string goes in copy.en.js AND copy.cy.js with identical structure. NO display logic in
  obligations or the model.
- Write the specs the increment lists (co-located Playwright spec, axe test) — they are part of the increment,
  not optional extras.
- STAGE your work (\`git -C ... add\`) but DO NOT COMMIT. Landing is a later step that runs after review.
- If you get stuck on a red step, you get at most 3 self-repair attempts. If still red, stop and report ok:false
  with exactly what is red and what you tried — do NOT thrash, and do NOT weaken a test to make it pass.

Return ok, a summary, changedFiles (repo-relative paths you created or edited), and notes (anything the reviewers
or the judge should know, including anything the increment got wrong).`,
    { label: `${id} implement`, phase: 'Implement', schema: incrementSchema }
  )

  if (!impl || !impl.ok) {
    log(`${id}: IMPLEMENT FAILED — preserving the attempt. ${impl ? impl.summary : 'agent failed'}`)
    const kept = await agent(
      preserveWork(id, workBranch, 'the implementor could not finish it', impl?.summary ?? 'the implementor agent died'),
      { label: `${id} preserve`, phase: 'Implement', schema: incrementSchema }
    )
    results.push({
      id,
      ticket: ticket?.key,
      branch: LIFECYCLE === 'full' ? workBranch : undefined,
      outcome: 'implement-failed',
      detail: impl?.summary ?? 'agent failed',
      preserved: kept?.summary
    })
    continue
  }

  const files = (impl.changedFiles ?? []).filter((f) => !f.endsWith('.log'))
  log(`${id}: implemented, ${files.length} files changed — reviewing`)

  // -----------------------------------------------------------------------
  // Review — style and correctness, per file, in parallel, plus consistency.
  // -----------------------------------------------------------------------
  phase('Review')

  const reviewTargets = files.length > 0 ? files : ['(no files reported — review the staged diff)']

  const styleReviews = reviewTargets.map((file) => () =>
    agent(
      `You are a STYLE REVIEWER for increment ${id}, reviewing ONE file: ${file}
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/code-style/references/STYLE_FILE_REVIEWER.md IN FULL and follow it. It defines what
you look for and the bundle to judge against. Also read ${SKILLS}/code-style/SKILL.md for the language routing
(Java → modern-java + Javadoc; GDS/Nunjucks → components/styles/patterns; Playwright → playwright; Node → the
17-rule style guide + JSDoc).
CONTEXT: the increment is at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`.
See the change with \`git -C ${TILDE}/<repoPath> diff --staged -- <file>\`.
SCOPE: style only — formatting, naming, conventions, idiom, comment discipline, copy structure. Correctness and
security belong to a different reviewer; do not duplicate them.
HOUSE RULES that override generic style advice: comments are removed aggressively (code near-bare; rationale lives
in docs/, not in the file); no migration/rename comments — git history is the source of truth; pipelines get named
helper functions rather than dense inline callbacks; names say what a thing does, never the benefit it brings.
Report ONLY real findings, each with a concrete fix. No praise, no summary of what the file does. If the file is
clean, return an empty findings array.
Return the structured output only.`,
      { label: `${id} style:${file.split('/').pop()}`, phase: 'Review', schema: FINDINGS_SCHEMA }
    )
  )

  const codeReviews = reviewTargets.map((file) => () =>
    agent(
      `You are a CODE REVIEWER for increment ${id}, reviewing ONE file: ${file}
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/FILE_REVIEWER.md IN FULL and follow it. Also read
${SKILLS}/review/SKILL.md for the review dimensions.
CONTEXT: the increment is at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\` — its
acceptanceCriteria are what this code is supposed to do. See the change with
\`git -C ${TILDE}/<repoPath> diff --staged -- <file>\`.
SCOPE: correctness, security, error handling, performance, and TEST QUALITY. Specifically hunt for:
- behaviour that does not match the increment's acceptanceCriteria
- tests that assert implementation rather than behaviour (toHaveBeenCalledWith on a collaborator is the tell);
  mocks at the module boundary rather than the network boundary
- tests whose name claims something their assertions do not pin (coverage padding — those should be deleted)
- missing negative/edge cases the acceptance criteria imply
- the programme-specific traps the increment or its cited plan names — for example, in a multi-set frontend:
  route-shape vs link-builder confusion (route tables must use the PREFIX-FREE builders; rendered links, redirects
  and form actions must use the PREFIX-BEARING ones), display logic leaking into obligations or the model, and any
  platform-layer file that has learned a set's vocabulary.
Report ONLY real findings with a concrete failure scenario. Style nits belong to a different reviewer — skip them.
Return the structured output only.`,
      { label: `${id} review:${file.split('/').pop()}`, phase: 'Review', schema: FINDINGS_SCHEMA }
    )
  )

  const consistencyReview = () =>
    agent(
      `You are the CONSISTENCY REVIEWER for increment ${id} — you look ACROSS the whole change, not at one file.
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/CONSISTENCY_REVIEWER.md IN FULL and follow it.
CONTEXT: increment at \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`; whole change via
\`git -C ${TILDE}/<repoPath> diff --staged\`.
LOOK FOR: the same concept named two ways across files; a pattern the repo already has, reimplemented instead of
reused (check the named exemplar the increment cites and compare); registration that exists in one place but not
its twin (a page in dispatch but not in the contract table, a feature in features/index.js but not evaluation.js,
copy.en.js without the matching copy.cy.js key); an obligation with no schema field behind it or a schema field
nothing writes; and anything the increment's filesToTouch listed that is NOT in the diff, or in the diff but NOT
listed.
Return the structured output only.`,
      { label: `${id} consistency`, phase: 'Review', schema: FINDINGS_SCHEMA }
    )

  const reviewResults = EXECUTOR === 'codex'
    ? [codexResult(await codexStage(id, 'review', 'Review', FINDINGS_SCHEMA, `Review the staged, uncommitted change for increment ${id}.`, workBranch), 'review', id)]
    : await parallel([...styleReviews, ...codeReviews, consistencyReview])
  rawFindings = reviewResults.filter(Boolean).flatMap((r) => r.findings ?? [])
  log(`${id}: ${rawFindings.length} raw findings — verifying adversarially`)

  // -----------------------------------------------------------------------
  // Verify findings — refute before acting, so churn is never driven by a
  // plausible-but-wrong review comment.
  // -----------------------------------------------------------------------
  if (rawFindings.length > 0) {
    phase('Verify findings')
    // Grouped BY FILE: every finding still gets refuted independently, but the
    // file, the diff and the increment are read once per file instead of once
    // per finding — that redundancy was the loop's dominant cost.
    const byFile = new Map()
    rawFindings.forEach((f, i) => {
      const key = f.file || '(whole change)'
      if (!byFile.has(key)) byFile.set(key, [])
      byFile.get(key).push({ ...f, n: i + 1 })
    })

    const verdicts = await parallel(
      [...byFile.entries()].map(([file, items]) => () =>
        agent(
          `You are an ADVERSARIAL VERIFIER for increment ${id}. You are given ${items.length} finding(s) against ONE
file: ${file}. Your job is to REFUTE each of them. Default to refuted unless the evidence is clear — a wrong
finding that survives costs more than a real one that is missed, because it drives a pointless edit to working code.
${GUARDRAILS}
Judge each finding INDEPENDENTLY and on its own evidence. They do not stand or fall together, and the number of
them tells you nothing about whether any one is real.

THE FINDINGS:
${items
  .map(
    (f) =>
      `${f.n}. [${f.severity}] ${f.file}${f.line ? ' line ' + f.line : ''}\n   WHAT: ${f.what}\n   WHY: ${f.why}\n   PROPOSED FIX: ${f.fix}`
  )
  .join('\n')}

CHECK THEM against the ACTUAL code (\`git -C ${TILDE}/<repoPath> diff --staged -- ${file}\`, and Read the file in
full — the diff alone can mislead), against the increment's acceptanceCriteria
(\`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`), and against the house conventions the
repo actually follows (find a comparable file and compare — "unconventional" is only a finding if the convention
really exists here). Read those sources ONCE and reuse them across all ${items.length} findings.
For each: real:false if it is wrong, already handled elsewhere, out of the increment's scope, or a matter of taste
dressed as a defect. real:true ONLY if you could not refute it. Cite file:line in every reasoning.
Return one verdict per finding, using the SAME numbers as above. Return the structured output only.`,
          { label: `${id} verify:${file.split('/').pop()}`, phase: 'Verify findings', schema: VERDICT_SCHEMA }
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
      )
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
  decision that code cannot settle. You MUST then append it to that increment's openQuestions in
  ${BACKLOG} (Edit the file; keep it valid JSON — re-check with
  \`jq empty ${BACKLOG_TILDE}\`) so it is never silently dropped.
- **reject** — you disagree with it even post-refutation. Say why, with evidence.

BIAS: prefer fix-now for anything cheap and clearly right. Prefer defer for anything that would expand the
increment's blast radius. Reject freely when a finding is taste rather than defect — this loop values a small
correct increment over a large polished one.
For every fix-now item, write a COMPLETE instruction in fixNow[]: the file, exactly what to change, and how to
prove it (the test or assertion that should now pass). A fixer with no other context must be able to execute it.
Return the structured output only.`,
        { label: `${id} judge`, phase: 'Judge', schema: JUDGEMENT_SCHEMA }
      )) ?? judgement
  }

  // -----------------------------------------------------------------------
  // Fix — apply only what the judge ruled fix-now.
  // -----------------------------------------------------------------------
  if (judgement.fixNow.length > 0) {
    phase('Fix')
    log(`${id}: judge ruled ${judgement.fixNow.length} fixes`)
    if (EXECUTOR === 'codex') {
      codexResult(
        await codexStage(
          id,
          'fix',
          'Fix',
          incrementSchema,
          `THE RULED FIXES for increment ${id} — apply exactly these, in order:\n${judgement.fixNow.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
          workBranch
        ),
        'fix',
        id
      )
    } else {
      await agent(
      `You are the FIXER for increment ${id}. Apply EXACTLY the fixes the judge ruled — no more, no less.
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/REVIEW_ITEM_FIXER.md IN FULL and follow it. For any fix that is
purely stylistic also read ${SKILLS}/code-style/references/STYLE_IMPLEMENTOR.md.
${readIncrement(id)}
THE RULED FIXES:
${judgement.fixNow.map((f, i) => `${i + 1}. ${f}`).join('\n')}

RULES: apply each fix and prove it with the test or assertion the instruction names. Do NOT re-open anything the
judge rejected or deferred. Do NOT expand scope. If a fix turns out to be wrong or impossible, say so in your
summary rather than forcing it — a fix that requires weakening a test is not a fix. Leave everything STAGED, do
not commit.
Return the structured output only.`,
        { label: `${id} fix`, phase: 'Fix', schema: incrementSchema }
      )
    }
  }

  // -----------------------------------------------------------------------
  // Ladder — the increment's own verification list, in its own order.
  // -----------------------------------------------------------------------
  phase('Ladder')

  const ladder = await agent(
    `You are the VERIFIER for increment ${id}. Run its verification ladder and report honestly.
${GUARDRAILS}
${readIncrement(id)}
TASK — run the increment's "verification" array IN ORDER, each to its own log under ${WORKAREA_TILDE}/logs/ named
\`${id}-<step>.log\`, reading each log ONCE. Every step must be green before you run the next.
- If a step is red, you get at most 3 repair attempts across the whole ladder. A repair fixes the CODE — never
  weaken, skip or delete a test to get green, and never mark a step green that was not.
- Where the verification names more than one leg — a platform change that must leave every consumer still working —
  run every leg, not just the one your increment was aimed at.
- If the ladder includes an E2E leg, read \`test-results/*/error-context.md\` for any failure rather than grepping
  the run output. Journey E2E specs on a fresh stack are known to be flaky with transient 500s in beforeEach that
  recover on retry — a green run with retried journey specs IS a pass, but say so explicitly.
- If a step cannot run at all (needs a stack that is not up, needs a branch that does not exist yet), do NOT
  pretend it passed: record it in failures[] as "could not run: <reason>" and set green:false.
Report green:true ONLY if every step actually ran and actually passed.
Return the structured output only.`,
    { label: `${id} ladder`, phase: 'Ladder', schema: LADDER_SCHEMA }
  )

  // -----------------------------------------------------------------------
  // Land — commit on green, non-destructive rollback on red.
  // -----------------------------------------------------------------------
  phase('Land')

  if (!ladder || !ladder.green) {
    log(`${id}: LADDER RED — preserving the attempt`)
    const rb = await agent(
      preserveWork(
        id,
        workBranch,
        'red verification ladder',
        ladder ? (ladder.failures ?? []).join(' | ') : 'verifier agent failed'
      ),
      { label: `${id} preserve`, phase: 'Land', schema: incrementSchema }
    )
    results.push({
      id,
      ticket: ticket?.key,
      branch: LIFECYCLE === 'full' ? workBranch : undefined,
      outcome: 'ladder-red',
      detail: ladder?.summary ?? 'verifier failed',
      preserved: rb?.summary
    })
    log(`${id}: attempt preserved — stopping the run so the failure is not built on top of`)
    break
  }

  land = await agent(
    `Increment ${id} is implemented, reviewed, judged and verified green. COMMIT IT.
${GUARDRAILS}
${REPO_RULE}
TASK:
1. Look up its repo: \`jq -r '.increments[] | select(.id=="${id}") | .repo' ${BACKLOG_TILDE}\`, and its
   title for the commit subject.
2. For EVERY repo you are about to commit in, confirm it is on the work branch FIRST:
   \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\` must print \`${workBranch}\`. If it prints
   \`${BASE_BRANCH}\`, STOP and report landed:false naming the repo. Do not commit and do not "fix it up after" —
   a commit made on the base branch is one \`git push\` away from being on the base branch for good, with no PR,
   no CI and no review behind it. That has happened here once already.
3. Confirm what is staged with \`git -C ${TILDE}/<repoPath> status --short\`. Stage anything the increment produced
   that is still untracked — but NOTHING under logs/, no coverage output, no test-results/, no .playwright artefacts.
4. Commit with a conventional message: \`<type>(${SCOPE}): <increment title>\`, a body saying what changed and
   naming the increment id${LIFECYCLE === 'full' ? ` and its ticket \`${ticket?.key}\`` : ''}, and the trailer:
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
   A \`both\` increment gets ONE commit per repo, each with the same subject.
5. Do NOT push. A later stage owns that.
6. Update ${BACKLOG}: add a "commit" field with the short SHA${LIFECYCLE === 'local' ? ' and set this increment\'s "status" to "done"' : '. Leave "status" alone — this increment is not done until its PR is merged'}.
   Keep the JSON valid (\`jq empty ${BACKLOG_TILDE}\`).
Report the commit SHA. For a \`both\` increment report both, backend first, space separated.
Return the structured output only.`,
    { label: `${id} land`, phase: 'Land', schema: LAND_SCHEMA }
  )
  } // build

  const findings = { raw: rawFindings.length, confirmed: confirmed.length, fixed: judgement.fixNow.length }
  const judgementCalls = judgement.decisions.map((d) => `${d.call}: ${d.what}`)

  if (LIFECYCLE === 'local') {
    results.push({
      id,
      outcome: land && land.landed ? 'landed' : 'land-failed',
      commit: land?.commit,
      findings,
      judgement: judgementCalls
    })
    log(`${id}: LANDED ${land?.commit ?? ''} — ${rawFindings.length} findings, ${confirmed.length} confirmed, ${judgement.fixNow.length} fixed`)
  } else {
    if (resumeAt === 'build' && (!land || !land.landed)) {
      log(`${id}: COMMIT FAILED — ${land ? land.summary : 'agent failed'}`)
      results.push({ id, ticket: ticket.key, outcome: 'land-failed', detail: land?.summary ?? 'agent failed', findings })
      break
    }

    const prList = (list) => list.map((p) => `${p.repo}: ${p.url}`).join('\n')

    // ---------------------------------------------------------------------
    // Pull request — push the branch and raise one PR per repo. Idempotent:
    // an existing open PR for this head is reused, never duplicated.
    // ---------------------------------------------------------------------
    let prs = []

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
5. **IMMEDIATELY** persist it: Edit ${BACKLOG} so this increment's \`prs\` array holds
   \`{"repo":"<repo>","url":"<url>","number":<n>}\` for every PR that now exists — appending, never replacing an
   entry that is already there. Re-check with \`jq empty ${BACKLOG_TILDE}\`. Do this after EACH repo, not once at
   the end: a run that dies between two PRs must not lose the first.

Report every PR in prs\[\], in the same order. Report ok:true only when every repo that had commits ahead of
\`${BASE_BRANCH}\` has exactly one open PR, and every repo you skipped at step 2 genuinely had none. At least one
PR must exist — a run where EVERY repo was empty means nothing was built, and that is ok:false.
Return the structured output only.`,
        { label: `${id} pr`, phase: 'Pull request', schema: PR_SCHEMA }
      )

      if (!pr || !pr.ok || (pr.prs ?? []).length === 0) {
        log(`${id}: PR STAGE FAILED — ${pr ? pr.summary : 'agent failed'}`)
        results.push({ id, ticket: ticket.key, outcome: 'pr-failed', detail: pr?.summary ?? 'agent failed', findings })
        break
      }

      prs = pr.prs
      log(`${id}: ${prs.length} PR(s) — ${prs.map((p) => p.url).join(' ')}`)

      // -------------------------------------------------------------------
      // CI — block on the checks, fix red a bounded number of times, and stop
      // rather than merge anything that is not green.
      // -------------------------------------------------------------------
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
          { label: `${id} ci watch`, phase: 'CI', schema: CI_SCHEMA }
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
   d. **IMMEDIATELY** persist it: Edit ${BACKLOG} so this increment's \`prs\` array also holds
      \`{"repo":"<repo>","url":"<url>","number":<n>}\` — appending, never replacing an entry already there.
      \`jq empty ${BACKLOG_TILDE}\` after. Do this per repo, not once at the end.
   e. Report it in \`newPrs\[\]\`. Both matter: the backlog is what a resume reads, \`newPrs\` is what the rest of
      THIS run reads. Skipping either one is how a PR gets left behind.
7. If you cannot work out what is failing, or the fix would need work outside this increment's scope, report
   ok:false saying exactly that. An honest refusal is worth more than a speculative push.
Return the structured output only.`,
          { label: `${id} ci fix ${ciAttempt}`, phase: 'CI', schema: CI_FIX_SCHEMA }
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
        break
      }

      // -------------------------------------------------------------------
      // Merge — approvals collected for the WHOLE increment first, then merge
      // in canonical order, watching the base branch after each one.
      // -------------------------------------------------------------------
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
6. Persist it: Edit ${BACKLOG} to mark that PR's entry in this increment's \`prs\` array \`"merged": true\` with
   its merge \`"sha"\`. \`jq empty ${BACKLOG_TILDE}\` after. Do this after EACH merge.

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
        { label: `${id} merge`, phase: 'Merge', schema: CI_SCHEMA }
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
        break
      }

      log(`${id}: merged ${(merge.merged ?? []).map((m) => `${m.repo}=${m.sha}`).join(' ')} — ${BASE_BRANCH} green`)
    }

    // ---------------------------------------------------------------------
    // Done — the ticket moves only once the merge is real and the base branch
    // has proved it. This is also what marks the increment done in the backlog.
    // ---------------------------------------------------------------------
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
3. Update ${BACKLOG}: set this increment's "status" to "done". Leave \`ticket\`, \`branch\`, \`commit\` and
   \`prs\` in place — they are the record of how it got there. Keep the JSON valid
   (\`jq empty ${BACKLOG_TILDE}\`).
Return the structured output only.`,
      { label: `${id} done`, phase: 'Done', schema: incrementSchema }
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
      break
    }

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
  }

  // A HALT-FOR-REVIEW gate is a DESIGNED human checkpoint, not a review finding.
  // The judge absorbs routine triage; it does not absorb these.
  const gate = await agent(
    `Report whether increment ${id} carries a halt gate. Run exactly one command and read it:
\`jq -r '.increments[] | select(.id=="${id}") | .gate' ${BACKLOG_TILDE}\`
If it prints \`null\`, return ok:true with summary "no gate". Otherwise return ok:false and put the gate's full text
in summary — the run will stop so a human can review before dependent increments proceed.
Do not do anything else. One Bash call, no Grep/Glob tools, tilde paths only.`,
    { label: `${id} gate check`, phase: LIFECYCLE === 'full' ? 'Done' : 'Land', schema: incrementSchema }
  )

  if (gate && !gate.ok) {
    log(`${id}: HALT-FOR-REVIEW GATE — stopping the run. ${gate.summary}`)
    results.push({ id, ticket: ticket?.key, outcome: 'halted-at-gate', detail: gate.summary })
    break
  }
}

return { increments: results }
