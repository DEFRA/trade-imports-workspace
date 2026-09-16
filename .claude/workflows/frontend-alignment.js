export const meta = {
  name: 'frontend-alignment',
  description:
    'Align trade-imports-ins-frontend with the journey frontends one stage at a time on a shared branch: plan → implement → review → verify findings → judge → fix → ladder → commit and push → draft PR → CI → report refresh → record → cross-repo E2E. Never merges.',
  whenToUse:
    'Running or resuming the stage backlog under workareas/shared/frontend-alignment/stages.json, including the ruling stages appended as Sam answers the report\'s open questions. One invocation drains every stage still todo, serially, in file order, re-reading the backlog after each so stages appended mid-run are picked up, and stops at the first red so nothing is built on a broken stage.',
  phases: [
    { title: 'Baseline', model: 'haiku' },
    { title: 'Plan', model: 'fable' },
    { title: 'Implement', model: 'sonnet' },
    { title: 'Review' },
    { title: 'Verify findings', model: 'sonnet' },
    { title: 'Judge', model: 'fable' },
    { title: 'Fix', model: 'sonnet' },
    { title: 'Ladder', model: 'sonnet' },
    { title: 'Land', model: 'haiku' },
    { title: 'Pull request', model: 'haiku' },
    { title: 'CI', model: 'haiku' },
    { title: 'Report', model: 'fable' },
    { title: 'Record', model: 'haiku' },
    { title: 'E2E', model: 'haiku' },
  ],
}

// ---------------------------------------------------------------------------
// Configuration. `args` plumbing is unreliable in this runtime, so FALLBACK is
// the real switch: edit it, or pass the same shape as args.
//   workarea     path under workareas/, holding stages.json
//   stages       stage ids to run in order, or null for every stage still todo
//   checkouts    'root'   — the workspace itself and the checkouts under repos/
//                          (how stages s01 to s14 ran)
//                'clones' — the clones under workareas/clones/, so Sam's live
//                          checkouts are never switched (stages s15 on)
//   workspacePr  the workspace repo's open PR, watched after every record push
//                because its E2E job runs the whole stack on the branch-tagged
//                images; null to skip that gate
// Everything else (branch, repos, ladders, caps, rulings) is read from
// stages.json by the agents, so the programme is data and this script knows
// nothing about it.
// ---------------------------------------------------------------------------
const FALLBACK = {
  workarea: 'shared/frontend-alignment',
  stages: null,
  checkouts: 'clones',
  workspacePr: {
    repo: 'workspace',
    slug: 'trade-imports-workspace',
    number: 47,
    url: 'https://github.com/DEFRA/trade-imports-workspace/pull/47',
  },
}

const CFG = typeof args === 'object' && args && args.workarea ? args : FALLBACK
const WORKAREA_REL = String(CFG.workarea).replace(/^\/+|\/+$/g, '')
const CLONES = CFG.checkouts === 'clones'
const PATH_FIELD = CLONES ? 'clonePath' : 'path'
const WORKSPACE_PR = CFG.workspacePr && CFG.workspacePr.number ? CFG.workspacePr : null

// The canonical clone location is fixed by CLAUDE.md rule 1. Two spellings of
// the same directory: TILDE for Bash (the guard hook denies /Users paths),
// ABS for the Read/Write/Edit tools (which need an absolute path). Never let
// ABS appear near a Bash example.
const ROOT_TILDE = '~/git/defra/trade-imports-workspace'
const ROOT_ABS = '/Users/samfarrington/git/defra/trade-imports-workspace'

// The workspace REPO the run writes its state to: the root itself, or its
// clone under workareas/clones/. Skills, docs and the allowlisted helper
// scripts are always read from the root, because the permission allowlist
// names tools/** at the root path only.
const WS_REL = CLONES ? 'workareas/clones/trade-imports-workspace' : '.'
const WS_TILDE = CLONES ? `${ROOT_TILDE}/${WS_REL}` : ROOT_TILDE
const WS_ABS = CLONES ? `${ROOT_ABS}/${WS_REL}` : ROOT_ABS

const WORKAREA = `${WS_ABS}/workareas/${WORKAREA_REL}`
const WORKAREA_TILDE = `${WS_TILDE}/workareas/${WORKAREA_REL}`
const STAGES = `${WORKAREA}/stages.json`
const STAGES_TILDE = `${WORKAREA_TILDE}/stages.json`
const REPORT = `${WORKAREA}/report.md`
const PLANS = `${WORKAREA}/plans`
const LOGS_TILDE = `${WORKAREA_TILDE}/logs`
const SKILLS = `${ROOT_ABS}/.claude/skills`
const DOCS = `${ROOT_ABS}/docs`
const TOOLS_TILDE = `${ROOT_TILDE}/tools`

// ---------------------------------------------------------------------------
// Models. Thinking on Fable, doing on Sonnet, watching on Haiku.
// ---------------------------------------------------------------------------
const think = (opts) => ({ ...opts, model: 'fable', effort: 'high' })
const doer = (opts) => ({ ...opts, model: 'sonnet' })
const watcher = (opts) => ({ ...opts, model: 'haiku', effort: 'low' })

// ---------------------------------------------------------------------------
// Shared prompt blocks.
// ---------------------------------------------------------------------------
const GUARDRAILS = `
GUARD RAILS (mandatory, every step):
- NEVER use the Grep or Glob TOOLS — they are not allowlisted and will prompt the user. Search with Bash \`grep -rn\` and \`find\`, inspect with the Read tool.
- Bash hygiene: ONE command per Bash call. No \`&&\`, no \`;\`, no \`|\`, no \`cd\`, no env-var prefixes (\`VAR=x cmd\`). Use \`git -C\`, \`npm --prefix\`. Output redirection (\`> file 2>&1\`) IS allowed.
- In Bash ALWAYS use tilde paths \`${ROOT_TILDE}/...\` — a literal /Users/... path in Bash is DENIED. For the Read/Write/Edit TOOLS use absolute paths under the workspace. Same directory, two spellings; if you catch yourself pasting an absolute path into Bash, stop and convert it.
- No \`awk\`, no \`sed\`, no text-processing pipes: read files with the Read tool, edit with the Edit tool, search with one unpiped \`grep -rn\`.
- Never bare \`node\` / \`node -e\` / \`npx\` / a node_modules binary. Everything runs through the repo's NAMED npm scripts: \`npm --prefix ${ROOT_TILDE}/<repoPath> run <script>\`. Formatting is fixed ONLY by \`npm --prefix <repo> run format\`. If no script covers what you need, STOP and report the command you wanted.
- NEVER run \`sonar\`. NEVER \`gh\` directly for PRs or checks — the allowlisted scripts under ${TOOLS_TILDE}/github/ and ${TOOLS_TILDE}/github-actions/ do that.
- Tests go TO A FILE under ${LOGS_TILDE}/ and you read that file ONCE with the Read tool. Never grep streaming output, never re-run a suite just to see it again.
- For Playwright failures read \`test-results/*/error-context.md\` in the repo, not the tail of the run.
- Rollback is ALWAYS \`git stash push -u\` — NEVER \`reset --hard\`, NEVER \`clean -fd\`.
- NEVER sleep. The watcher scripts poll for you.
- Never \`git push --force\`. Never merge anything. Never push to \`main\`.
${CLONES ? `- The checkouts under ${ROOT_TILDE}/repos/ are Sam's live work. Never read them for this programme, never touch them, never switch their branch. Your repos are ONLY the \`${PATH_FIELD}\` entries in the stages.json header.` : ''}
- Headless: never ask a question. Decide, write the decision into the stage's notes in stages.json, keep going.
`

const PATH_RULE = `PATHS: every repo path in the stages.json header (\`repos.<key>.${PATH_FIELD}\`) and every entry in a
stage's \`reference\` list is relative to the workspace root. Prefix with ${ROOT_TILDE}/ in Bash and with ${ROOT_ABS}/
for the Read/Write/Edit tools. The workspace repo itself — where stages.json, plans/ and report.md live and where
the programme's state is committed — is ${WS_TILDE} in Bash and ${WS_ABS} for the Read/Write/Edit tools; its header
entry is \`repos.workspace\`. Use the \`${PATH_FIELD}\` field and no other path field.`

const PUSH_RULE = `HOW TO PUSH — the exact form, every time, no variations:
\`git -C ${ROOT_TILDE}/<repoPath> push -u origin refs/heads/<branch>:refs/heads/<branch>\`
Never \`--force\`. Never a bare \`git push\`. Never \`push origin <branch>\` — the fully qualified refspec can only ever
update that one branch.

BEFORE ANY COMMIT OR PUSH, prove you are on the branch you think you are:
\`git -C ${ROOT_TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`
If that prints anything other than the programme branch — \`main\` above all — STOP and report ok:false.`

const COMMIT_TRAILER = `Every commit message ends with these two lines, verbatim, after a blank line:
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012yTqNbopC6utUE3M1TKrj6
Write the message to a file under ${LOGS_TILDE}/ with the Write tool and commit with \`git -C <repo> commit -F <file>\`;
the guard blocks \`-m\` messages that name uncommitted paths.`

const readStage = (id) => `
THE STAGE — read it in full before anything else. Run this Bash command and read the output:
\`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\`
Then read the programme header (everything except .stages) the same way:
\`jq 'del(.stages)' ${STAGES_TILDE}\`
The header gives you the branch, the repo paths and GitHub slugs, the direction rule, the invariants, the target
tree and, for stages from s15 on, how rulings work. The stage gives you the brief, the reference files, the ladder
and — when it carries \`question\` and \`ruling\` — Sam's settled answer to that numbered open question in report.md.
${PATH_RULE}`

const stageNotes = (id) => `To record a note or an open question on the stage, Edit ${STAGES} — append a string to
that stage's \`notes\` or \`openQuestions\` array, keep the JSON valid, and re-check with \`jq empty ${STAGES_TILDE}\`.`

const RULING_RULE = `RULINGS: a stage that carries \`ruling\` is settled. The ruling is the direction for that stage whichever
way it points (ins toward the journeys, or the journeys toward ins); the header's direction rule applies only where
the ruling is silent. Never reopen the question, never soften the ruling into an option, never widen it into the
neighbouring questions the brief names as out of scope.`

// ---------------------------------------------------------------------------
// Schemas.
// ---------------------------------------------------------------------------
const BASELINE_SCHEMA = {
  type: 'object',
  required: ['ok', 'done', 'todo', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'Every repo a pending stage touches is on the programme branch with a clean tree' },
    done: { type: 'array', items: { type: 'string' }, description: 'Stage ids whose status is already done' },
    todo: { type: 'array', items: { type: 'string' }, description: 'Stage ids still to run, in file order' },
    branch: { type: 'string' },
    problems: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  additionalProperties: false,
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary', 'reviewFocus', 'behaviourChanges'],
  properties: {
    ok: { type: 'boolean', description: 'false only when the brief cannot be carried out as written' },
    summary: { type: 'string' },
    planFile: { type: 'string', description: 'Workspace-relative path of the plan you wrote' },
    reviewFocus: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Repo-relative paths of the files whose CONTENT deserves a reviewer — new code, adapted logic, rewritten tests. Not pure moves. At most the reviewCap from stages.json.',
    },
    behaviourChanges: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every user-visible or operational behaviour change this stage makes, one line each. Empty when the stage is pure structure.',
    },
    decisions: { type: 'array', items: { type: 'string' }, description: 'Choices the brief left open and how you settled them' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
}

const STAGE_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' }, description: 'Repo-relative paths created, edited, moved or deleted' },
    notes: { type: 'string' },
  },
  additionalProperties: false,
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
          fix: { type: 'string', description: 'The specific change to make' },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
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
          n: { type: 'number' },
          real: { type: 'boolean' },
          reasoning: { type: 'string', description: 'Evidence for or against, citing file:line' },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
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
          reasoning: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    fixNow: { type: 'array', items: { type: 'string' }, description: 'Full fix instructions for the fixer, one per item' },
    summary: { type: 'string' },
  },
  additionalProperties: false,
}

const LADDER_SCHEMA = {
  type: 'object',
  required: ['green', 'ran', 'summary'],
  properties: {
    green: { type: 'boolean' },
    ran: { type: 'array', items: { type: 'string' } },
    failures: { type: 'array', items: { type: 'string' } },
    repairsAttempted: { type: 'number' },
    summary: { type: 'string' },
  },
  additionalProperties: false,
}

const LAND_SCHEMA = {
  type: 'object',
  required: ['landed', 'summary'],
  properties: {
    landed: { type: 'boolean' },
    commits: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'sha'],
        properties: { repo: { type: 'string' }, sha: { type: 'string' } },
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  additionalProperties: false,
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
        required: ['repo', 'url', 'number'],
        properties: {
          repo: { type: 'string' },
          url: { type: 'string' },
          number: { type: 'number' },
          created: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  additionalProperties: false,
}

const CI_SCHEMA = {
  type: 'object',
  required: ['green', 'summary'],
  properties: {
    green: { type: 'boolean', description: 'Every PR resolved green. An unresolved watch is NOT green' },
    prs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['repo', 'url', 'state'],
        properties: {
          repo: { type: 'string' },
          url: { type: 'string' },
          state: { type: 'string', description: 'green | red | unresolved' },
        },
        additionalProperties: false,
      },
    },
    failures: { type: 'array', items: { type: 'string' }, description: 'One line per failing check: its name, the run link, and what it said' },
    blocked: { type: 'string', description: '"none", or one line naming a stop condition no code fix can address' },
    summary: { type: 'string' },
  },
  additionalProperties: false,
}

const hardStop = (r) => Boolean(r && r.blocked && r.blocked !== 'none')

const prList = (prs) => prs.map((p) => `- ${p.repo}: ${p.url}`).join('\n')

const ciFixAttempts = 2

// ---------------------------------------------------------------------------
// Reusable steps. A watcher over a PR list, writing its verdict into the
// stage's `field`; a fixer for a red watch; a recorder that commits the
// programme's state on the workspace repo and pushes it.
// ---------------------------------------------------------------------------
const watchPrs = (id, prs, field, label) =>
  agent(
    `You are the CI WATCHER for stage ${id}. Wait for the checks on every PR below to resolve and report what they
did. You change no code.
${GUARDRAILS}
THE PULL REQUESTS:
${prList(prs)}
For EACH pr (the GitHub slug is the repository name in the URL, without DEFRA/):
1. Read the watch budget: \`jq -r '.ciWatchSeconds' ${STAGES_TILDE}\`.
2. ONE Bash call with the tool's \`timeout\` parameter set to 600000:
   \`${TOOLS_TILDE}/github-actions/wait-for-pr-checks.sh <slug> <number> <ciWatchSeconds> > ${LOGS_TILDE}/${id}-${field}-<repo>.log 2>&1\`
   The script polls for you; never sleep yourself.
3. Read the log ONCE. Exit 0 → green. Exit 1 → RED: one line per failing check in failures[], with its name and
   link. Exit 2 → unresolved: it counts as RED, never green; say "unresolved". Exit 4 → no checks configured:
   green:false and put "no checks configured on <repo>" in blocked.
   If the Bash call itself timed out before the script returned, run it again at most twice more; still unresolved
   → RED.
4. For a RED check get the failing job's log so a fixer can act:
   \`${TOOLS_TILDE}/github-actions/get-failure.sh <slug> <run id> > ${LOGS_TILDE}/${id}-${field}-fail-<repo>.log 2>&1\`
   The check's link looks like \`.../actions/runs/<run id>/job/<job id>\` — pass the <run id> number only, never
   the whole link (the script would read the job id off the end of it).
   and name the failing step in failures[]. Where the failing job is Playwright, say so — its evidence is the
   uploaded report artefact, not the run log.
5. Record the outcome: Edit ${STAGES} so this stage's \`${field}\` holds {"state": "green"|"red"|"unresolved", "failures": [...]}.
blocked is ONLY for something no code fix can address. green:true ONLY if EVERY pr resolved green.
Return the structured output only.`,
    watcher({ label, phase: field === 'e2e' ? 'E2E' : 'CI', schema: CI_SCHEMA })
  )

const fixRed = (id, prs, ci, field, attempt, extra) =>
  agent(
    `You are the CI FIXER for stage ${id}, attempt ${attempt} of ${ciFixAttempts}. CI is red on the programme
branch. Fix the CODE, prove it locally, commit and push. You merge nothing.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${readStage(id)}
${RULING_RULE}
THE PULL REQUESTS:
${prList(prs)}
WHAT THE WATCHER SAW:
${ci ? (ci.failures ?? []).map((f, i) => `${i + 1}. ${f}`).join('\n') || ci.summary : 'the watcher died — read the checks yourself with the wait script'}
The watcher's logs are under ${LOGS_TILDE}/${id}-${field}-*.log — Read them.
${extra}
TASK:
1. Read the actual failure. If it is something the local ladder could not have caught (a CI-only environment
   difference, the docker build, the npm version pin, the security audit, a SonarCloud finding), say so in your
   summary.
2. Fix the code in the repos THIS STAGE names. Never weaken, skip or delete a test; never disable a check.
3. Prove it with the narrowest npm script that covers the failure, to a log under ${LOGS_TILDE}/, read once.
4. Prove you are on the programme branch, commit with subject \`fix(alignment): ${id} — <what you fixed>\` and the
   trailer, push with the refspec form.
5. If the failure needs work outside this stage's scope, report ok:false saying exactly that.
Return the structured output only.`,
    doer({ label: `${id} ${field} fix ${attempt}`, phase: field === 'e2e' ? 'E2E' : 'CI', schema: STAGE_SCHEMA })
  )

const recordState = (id, subject, allowEmpty) =>
  agent(
    `You are RECORDING the programme's state for stage ${id} on the workspace repository. You commit and push; you
review nothing and you change no source file.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${PATH_RULE}
The workspace repo is ${WS_TILDE}. Prove it is on the programme branch (\`jq -r '.branch' ${STAGES_TILDE}\`).
Then \`jq empty ${STAGES_TILDE}\` — invalid JSON is a stop: report landed:false.
Stage ONLY these paths, by name, with \`git -C ${WS_TILDE} add <path>\`: workareas/${WORKAREA_REL}/stages.json,
workareas/${WORKAREA_REL}/report.md, and every file under workareas/${WORKAREA_REL}/plans/ — never anything under
logs/, never any other path, never \`add -A\`.
Check what is staged with \`git -C ${WS_TILDE} diff --cached --stat\`.
${
  allowEmpty
    ? 'If nothing is staged, commit anyway with `--allow-empty`: the push is what re-runs the cross-repo E2E suite on the workspace PR, and that re-run is the point of this step.'
    : 'If nothing is staged, there is nothing to record: report landed:true with an empty commits list and say so.'
}
Commit with subject \`${subject}\`, a body of two to four lines saying what the recorded state is (which stage, its
outcome, the SHA of the stage commit from stages.json), then the trailer. Push with the refspec form. A
non-fast-forward rejection means someone else pushed this branch — report landed:false; never force, never pull.
Return landed:true with the commit SHA under repo "workspace". Do NOT write the SHA back into stages.json.
Return the structured output only.`,
    watcher({ label: `${id} record`, phase: 'Record', schema: LAND_SCHEMA })
  )

const results = []
let halted = false
let round = 0
let branchName = ''
const explicitList = Array.isArray(CFG.stages) && CFG.stages.length > 0

// ---------------------------------------------------------------------------
// The loop. Each round re-reads the backlog, so a stage appended while an
// earlier one was building is picked up without a relaunch. A red stage
// halts the run; nothing is built on top of it.
// ---------------------------------------------------------------------------
while (!halted) {
  round += 1

  // -------------------------------------------------------------------------
  // Baseline — where is the programme, and is every repo where it should be.
  // -------------------------------------------------------------------------
  phase('Baseline')

  const baseline = await agent(
    `You are the BASELINE checker for the frontend-alignment programme, round ${round} of this run. You change
nothing.
${GUARDRAILS}
${PATH_RULE}
1. Read the programme header: \`jq 'del(.stages)' ${STAGES_TILDE}\`. Note the branch and every repo's \`${PATH_FIELD}\`.
2. List every stage with its status: \`jq -r '.stages[] | .id + " " + .status' ${STAGES_TILDE}\`.
3. Work out which stages this run will build: ${explicitList ? `exactly these, in this order — ${CFG.stages.join(', ')}` : 'every stage whose status is "todo", in file order'}${results.length > 0 ? `, leaving out the stages this run has already handled (${results.map((r) => r.id).join(', ')})` : ''}.
   Then for EACH repo named in the \`repos\` of THOSE stages (and only those — a repo no pending stage touches may
   be on any branch, that is someone else's work): \`git -C ${ROOT_TILDE}/<${PATH_FIELD}> rev-parse --abbrev-ref HEAD\`
   must print the programme branch, and \`git -C ${ROOT_TILDE}/<${PATH_FIELD}> status --short\` must print nothing. A repo
   on another branch or with a dirty tree is a problem — name it. Do not fix it.
   The workspace repo (${WS_TILDE}) counts as touched by every run because stages.json and plans/ are written
   there. Two exemptions for it and it alone: untracked files under workareas/${WORKAREA_REL}/logs/ are scratch,
   and a modified workareas/${WORKAREA_REL}/stages.json, report.md or plans/ file is the programme's own state
   that the record step commits; neither is a problem.
4. Report done = every stage whose status is "done", todo = every stage whose status is "todo" in file order.
   A stage in any other status (ci-red, ladder-red, implement-failed, e2e-red) is a problem — name it in problems
   and leave it out of todo; the run must not build on it.
Return the structured output only.`,
    watcher({ label: `baseline ${round}`, phase: 'Baseline', schema: BASELINE_SCHEMA })
  )

  if (!baseline || !baseline.ok) {
    throw new Error(`Baseline failed: ${baseline ? [baseline.summary, ...(baseline.problems ?? [])].join(' | ') : 'agent died'}`)
  }
  branchName = baseline.branch

  const requested = explicitList ? CFG.stages : baseline.todo
  const stageIds = requested.filter((id) => !baseline.done.includes(id) && !results.some((r) => r.id === id))
  if (stageIds.length === 0) {
    log(`round ${round}: nothing left to build — ${baseline.done.length} done`)
    break
  }
  log(`round ${round}: baseline ok on ${baseline.branch}: ${baseline.done.length} done, running ${stageIds.length} — ${stageIds.join(', ')}`)

  for (const id of stageIds) {
    // -----------------------------------------------------------------------
    // Report stage: one thinker writes it, one watcher lands it. No review, no CI.
    // -----------------------------------------------------------------------
    if (id === 's13-alignment-report') {
      phase('Report')
      const report = await agent(
        `You are writing the ALIGNMENT REPORT for the frontend-alignment programme — the document the team reads to
decide whether this is the architecture they want. You are the last stage; everything before you has landed.
${GUARDRAILS}
${readStage(id)}
${stageNotes(id)}
SOURCES you must read before writing: every stage's plan under ${PLANS}/ (Read tool), every stage's notes,
openQuestions, commit and prs in stages.json, and the current trees of the three frontends:
\`find ${ROOT_TILDE}/<ins ${PATH_FIELD}>/src -type f -not -path '*/node_modules/*'\` and the same for
animals and plants. For the residual-drift section, compare the chassis surfaces three ways with
\`diff -rq\` over src/auth, src/plugins, src/server/common and src/server/auth between ins and animals, and
between animals and plants, and classify what remains as: identical, import-path-only, deliberate (journey-only or
service-specific), or unexplained drift. Name the unexplained ones file by file.
WRITE ${REPORT} with the sections the brief lists. Plain GitHub markdown. British English, GDS plain
language, no em dashes, no time estimates. Be specific: name files, link the draft PRs, quote the decisions. The
open-questions section is the list the team rules on; write each as a question with the two-against-one count
where that applies.
Set the stage status to "done" in stages.json when the report is written.
Return the structured output only.`,
        think({ label: `${id} report`, phase: 'Report', schema: STAGE_SCHEMA })
      )
      if (!report || !report.ok) {
        results.push({ id, outcome: 'report-failed', detail: report?.summary ?? 'agent died' })
        halted = true
        break
      }
      const landed = await recordState(id, 'docs(alignment): the frontend alignment report', false)
      results.push({ id, outcome: landed?.landed ? 'done' : 'land-failed', detail: landed?.summary })
      if (!landed || !landed.landed) {
        halted = true
        break
      }
      continue
    }

    // -----------------------------------------------------------------------
    // Plan — Fable reads the brief, the reference files and the current state
    // of the target repo, and writes a file-level plan the implementor can
    // execute.
    // -----------------------------------------------------------------------
    phase('Plan')
    log(`${id}: planning`)

    const plan = await agent(
      `You are the PLANNER for stage ${id} of the frontend-alignment programme. You write the plan; you change no
source file.
${GUARDRAILS}
${readStage(id)}
${stageNotes(id)}
${RULING_RULE}
WHAT A PLAN IS HERE: a file-level script for a Sonnet implementor who has less context than you. Read the stage's
reference files IN FULL (Read tool), read the corresponding current files in the target repo IN FULL, and read the
workspace conventions you will hold the implementor to: ${DOCS}/best-practices/node/code-style.md,
${DOCS}/best-practices/node/hapi.md, ${DOCS}/best-practices/node/nunjucks.md and
${DOCS}/best-practices/node/testing/frontend.md. Capture the baseline of the target repo's ladder scripts before you
plan (to ${LOGS_TILDE}/${id}-baseline-<repo>-<script>.log, read once) so a later red is unambiguous. Then WRITE
${PLANS}/${id}.md, opening with a table of the repos and their two path spellings, then:
0. Decisions — every choice the brief left open and how you settled it, so the implementor never chooses.
1. Moves — a table of from → to for every file that moves or is deleted, tests included. "None" is an answer.
2. Edits — for every file that changes content, what changes and why, quoting the reference file's shape where the
   implementor should copy it.
3. New files — full intent, and the reference file to imitate.
4. Imports — the rule for rewriting imports this stage disturbs.
5. Tests — which tests move, which change, which are new, and what each pins.
6. Invariants to prove — the programme invariants this stage can break and the check that proves it did not
   (a URL list to grep for, a fit spec to run, a jq over copy files, a diff against the reference file).
7. Out of scope — what the implementor must leave alone even though it is tempting, including the neighbouring
   open questions the brief names.
Where the stage has no ruling, direction is the header's: ins moves toward animals/plants; where they differ, prefer
plants' shape and record it in decisions. Journey-only machinery never comes to ins. Where the brief leaves a choice
open, MAKE IT and record it in decisions — never leave a fork for the implementor. reviewFocus names the files whose
content is worth a reviewer's time: adapted logic, new code, rewritten tests — never pure moves. behaviourChanges
lists every behaviour change, or is empty. If the brief cannot be carried out as written, say exactly why and
return ok:false.
Return the structured output only.`,
      think({ label: `${id} plan`, phase: 'Plan', schema: PLAN_SCHEMA })
    )

    if (!plan || !plan.ok) {
      log(`${id}: PLAN REFUSED — ${plan ? plan.summary : 'agent died'}`)
      results.push({ id, outcome: 'plan-refused', detail: plan?.summary ?? 'agent died' })
      halted = true
      break
    }
    log(`${id}: planned — ${plan.reviewFocus.length} files for review, ${plan.behaviourChanges.length} behaviour changes`)

    // -----------------------------------------------------------------------
    // Implement — Sonnet executes the plan and stages the result.
    // -----------------------------------------------------------------------
    phase('Implement')

    const impl = await agent(
      `You are the IMPLEMENTOR for stage ${id}. You execute the plan and nothing else — you do not review it and you
do not commit it.
${GUARDRAILS}
${readStage(id)}
${stageNotes(id)}
${RULING_RULE}
THE PLAN is at ${PLANS}/${id}.md — Read it in full and follow it verbatim. Where the plan quotes a reference file's
shape, open that reference file and copy the shape rather than improvising. Moves are \`git -C <repo> mv\` so
history follows the file.
RULES:
- Implement EXACTLY the plan's scope. Notice adjacent problems, report them in notes, do not fix them.
- Work that belongs to THIS stage gets DONE, never deferred. Where you genuinely leave something out, say so in
  notes as \`DEFERRED: <what>\`, on its own line.
- Every stage ends with format:check, lint and the unit suite green, so run the narrowest npm script that covers
  what you touched as you go, to a log under ${LOGS_TILDE}/${id}-<script>.log, read once. If \`format:check\` is
  red, run \`npm --prefix <repo> run format\` and re-check. Do NOT run the Playwright suite — the ladder stage does.
- Never weaken, skip or delete a test to get green. If you get stuck on a red step, you get at most 3 self-repair
  attempts; then stop and report ok:false with exactly what is red and what you tried.
- STAGE your work (\`git -C <repo> add -A\` is fine here — the tree was clean at baseline) but DO NOT COMMIT.
Return ok, a summary, changedFiles (repo-relative, including moves and deletions), and notes for the reviewers and
the judge, including anything the plan got wrong.`,
      doer({ label: `${id} implement`, phase: 'Implement', schema: STAGE_SCHEMA })
    )

    if (!impl || !impl.ok) {
      log(`${id}: IMPLEMENT FAILED — ${impl ? impl.summary : 'agent died'}. Preserving the attempt.`)
      await agent(
        `The implementor for stage ${id} could not finish: ${impl?.summary ?? 'the agent died'}. PRESERVE THE WORK.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${readStage(id)}
For each repo the stage names: stage everything except logs, coverage, test-results and playwright-report; commit
on the programme branch with subject \`wip(alignment): ${id} — implement failed\` and a body naming what went red;
push with the refspec form. Then set the stage's status to "implement-failed" in stages.json and append the
reason to its notes. Return the structured output only.`,
        watcher({ label: `${id} preserve`, phase: 'Implement', schema: STAGE_SCHEMA })
      )
      results.push({ id, outcome: 'implement-failed', detail: impl?.summary ?? 'agent died' })
      halted = true
      break
    }

    const changed = (impl.changedFiles ?? []).filter((f) => !f.endsWith('.log'))
    const cap = 8
    const focus = plan.reviewFocus.slice(0, cap)
    log(`${id}: implemented, ${changed.length} files changed — reviewing ${focus.length}`)

    // -----------------------------------------------------------------------
    // Review — style and correctness per focus file on Sonnet, plus one
    // consistency review across the whole change on Fable.
    // -----------------------------------------------------------------------
    phase('Review')

    const styleReviews = focus.map((file) => () =>
      agent(
        `You are a STYLE REVIEWER for stage ${id}, reviewing ONE file: ${file}
${GUARDRAILS}
${PATH_RULE}
YOUR PERSONA — read ${SKILLS}/code-style/references/STYLE_FILE_REVIEWER.md IN FULL and follow it, and
${SKILLS}/code-style/SKILL.md for the language routing (GDS/Nunjucks → components/styles/patterns; Playwright →
playwright; Node → the 17-rule style guide + JSDoc).
CONTEXT: the plan is at ${PLANS}/${id}.md; the stage is \`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\`.
See the change with \`git -C ${ROOT_TILDE}/<repoPath> diff --staged -- <file>\`, and compare against the reference file
the plan names for it.
SCOPE: style only — formatting, naming, conventions, idiom, comment discipline, copy structure. HOUSE RULES that
override generic advice: comments are removed aggressively; no migration or rename comments; names say what a thing
does, never the benefit it brings; pipelines get named helpers. A file that was MOVED or COPIED and matches its
reference file's shape is clean — a comment the reference file carries is not a finding here, because byte-equality
with the reference is what the drift check measures. Do not invent findings for it.
Report ONLY real findings, each with a concrete fix. No praise. Clean file → empty findings array.
Return the structured output only.`,
        doer({ label: `${id} style:${file.split('/').pop()}`, phase: 'Review', schema: FINDINGS_SCHEMA })
      )
    )

    const codeReviews = focus.map((file) => () =>
      agent(
        `You are a CODE REVIEWER for stage ${id}, reviewing ONE file: ${file}
${GUARDRAILS}
${PATH_RULE}
YOUR PERSONA — read ${SKILLS}/review/references/FILE_REVIEWER.md IN FULL and follow it, and
${SKILLS}/review/SKILL.md for the review dimensions.
CONTEXT: the plan is at ${PLANS}/${id}.md; the stage and the programme invariants are at
\`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\` and \`jq '.invariants' ${STAGES_TILDE}\`. See the change
with \`git -C ${ROOT_TILDE}/<repoPath> diff --staged -- <file>\`.
SCOPE: correctness, security, error handling, and TEST QUALITY. Hunt for: a behaviour change the plan did not
declare; an invariant broken (a public URL that moved, a string that should be in copy after s07, a module-boundary
mock where a network mock exists); tests that assert implementation rather than behaviour; tests whose name claims
something their assertions do not pin; a moved or copied file whose adaptation dropped a guard the reference file
has. A stage with a ruling is judged against the ruling, not against the option the ruling rejected.
Style nits belong to another reviewer — skip them. Report ONLY real findings with a concrete failure scenario.
Return the structured output only.`,
        doer({ label: `${id} review:${file.split('/').pop()}`, phase: 'Review', schema: FINDINGS_SCHEMA })
      )
    )

    const consistencyReview = () =>
      agent(
        `You are the CONSISTENCY REVIEWER for stage ${id} — you look ACROSS the whole change, not at one file, and you
judge it against the plan and the target tree.
${GUARDRAILS}
${PATH_RULE}
YOUR PERSONA — read ${SKILLS}/review/references/CONSISTENCY_REVIEWER.md IN FULL and follow it.
CONTEXT: plan at ${PLANS}/${id}.md; stage, header and target tree via \`jq 'del(.stages)' ${STAGES_TILDE}\` and
\`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\`; whole change via \`git -C ${ROOT_TILDE}/<repoPath> diff --staged --stat\`
then per file as needed.
LOOK FOR: a move the plan listed that did not happen, or one that happened but the plan did not list; a file whose
new location is not where the target tree puts it; the same concept named two ways; an import left pointing at the
old path; registration that exists in one place but not its twin (a route in a controller but not in the features
barrel; a copy key in en but not cy); a reference-file shape the plan said to copy that was paraphrased instead;
a ruling implemented in one handler but not the sibling the brief also names; and the plan's "invariants to prove"
section — run each proof it names and report any that fails as a finding.
Return the structured output only.`,
        think({ label: `${id} consistency`, phase: 'Review', schema: FINDINGS_SCHEMA })
      )

    const reviewResults = await parallel([...styleReviews, ...codeReviews, consistencyReview])
    const rawFindings = reviewResults.filter(Boolean).flatMap((r) => r.findings ?? [])
    log(`${id}: ${rawFindings.length} raw findings — verifying adversarially`)

    // -----------------------------------------------------------------------
    // Verify findings — refute before acting.
    // -----------------------------------------------------------------------
    let confirmed = []
    if (rawFindings.length > 0) {
      phase('Verify findings')
      const byFile = new Map()
      rawFindings.forEach((f, i) => {
        const key = f.file || '(whole change)'
        if (!byFile.has(key)) byFile.set(key, [])
        byFile.get(key).push({ ...f, n: i + 1 })
      })

      const verdicts = await parallel(
        [...byFile.entries()].map(([file, items]) => () =>
          agent(
            `You are an ADVERSARIAL VERIFIER for stage ${id}. You are given ${items.length} finding(s) against ONE file:
${file}. Your job is to REFUTE each of them. Default to refuted unless the evidence is clear — a wrong finding that
survives drives a pointless edit to working code.
${GUARDRAILS}
${PATH_RULE}
Judge each finding INDEPENDENTLY and on its own evidence.

THE FINDINGS:
${items
  .map((f) => `${f.n}. [${f.severity}] ${f.file}${f.line ? ' line ' + f.line : ''}\n   WHAT: ${f.what}\n   WHY: ${f.why}\n   PROPOSED FIX: ${f.fix}`)
  .join('\n')}

CHECK THEM against the ACTUAL code (\`git -C ${ROOT_TILDE}/<repoPath> diff --staged -- ${file}\`, and Read the file in
full), against the plan at ${PLANS}/${id}.md, against the reference file the plan names, against the stage's ruling
if it has one, and against the programme invariants (\`jq '.invariants' ${STAGES_TILDE}\`). Read those sources ONCE
and reuse them across all findings.
real:false if it is wrong, already handled, out of the stage's scope, contradicts the ruling, or taste dressed as
defect. real:true ONLY if you could not refute it. Cite file:line in every reasoning. Same numbering as above.
Return the structured output only.`,
            doer({ label: `${id} verify:${file.split('/').pop()}`, phase: 'Verify findings', schema: VERDICT_SCHEMA })
          ).then((v) => {
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
    // Judge — Fable rules each surviving finding. No human in the loop.
    // -----------------------------------------------------------------------
    let judgement = { decisions: [], fixNow: [], summary: 'no findings to judge' }
    if (confirmed.length > 0) {
      phase('Judge')
      judgement =
        (await agent(
          `You are the JUDGE for stage ${id}. You replace the interactive triage a human would do — read
${SKILLS}/review/references/WALKER.md to understand what you substitute for, then make every call YOURSELF.
${GUARDRAILS}
${readStage(id)}
${stageNotes(id)}
${RULING_RULE}
THE PLAN is at ${PLANS}/${id}.md.
CONFIRMED FINDINGS (each survived an adversarial refutation attempt):
${confirmed
  .map((f, i) => `${i + 1}. [${f.severity}] ${f.file}${f.line ? ':' + f.line : ''} — ${f.what}\n   WHY: ${f.why}\n   PROPOSED FIX: ${f.fix}\n   SURVIVED BECAUSE: ${f.verdict}`)
  .join('\n')}

FOR EACH finding decide exactly one of:
- fix-now — in this stage's scope and the fix is clear. Anything that breaks a programme invariant, an undeclared
  behaviour change, a security or correctness defect, a test that does not pin what it claims, or a house-rule
  violation is fix-now regardless of severity label.
- defer-to-open-question — real, but outside this stage, or a design call the team should make. Append it to the
  stage's openQuestions in stages.json so it reaches the report.
- reject — you disagree even post-refutation, or the finding argues against the ruling. Say why, with evidence.
BIAS: this programme values a faithful, complete stage over a polished one. Fix anything cheap and clearly right;
defer anything that widens the stage; reject taste.
For every fix-now item write a COMPLETE instruction in fixNow[]: file, exact change, and the test or check that
proves it. A fixer with no other context must be able to execute it.
Return the structured output only.`,
          think({ label: `${id} judge`, phase: 'Judge', schema: JUDGEMENT_SCHEMA })
        )) ?? judgement
    }

    // -----------------------------------------------------------------------
    // Fix — Sonnet applies only what the judge ruled.
    // -----------------------------------------------------------------------
    if (judgement.fixNow.length > 0) {
      phase('Fix')
      log(`${id}: judge ruled ${judgement.fixNow.length} fixes`)
      await agent(
        `You are the FIXER for stage ${id}. Apply EXACTLY the fixes the judge ruled — no more, no less.
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/REVIEW_ITEM_FIXER.md IN FULL and follow it. For a purely stylistic
fix also read ${SKILLS}/code-style/references/STYLE_IMPLEMENTOR.md.
${readStage(id)}
THE RULED FIXES:
${judgement.fixNow.map((f, i) => `${i + 1}. ${f}`).join('\n')}

RULES: apply each and prove it with the test or check the instruction names, to a log under ${LOGS_TILDE}/, read
once. Do NOT re-open anything rejected or deferred. Do NOT expand scope. A fix that needs a weakened test is not a
fix — say so instead. Leave everything STAGED (\`git -C <repo> add -A\`), do not commit.
Return the structured output only.`,
        doer({ label: `${id} fix`, phase: 'Fix', schema: STAGE_SCHEMA })
      )
    }

    // -----------------------------------------------------------------------
    // Ladder — the stage's own verification list, in order, on Sonnet.
    // -----------------------------------------------------------------------
    phase('Ladder')

    const ladder = await agent(
      `You are the VERIFIER for stage ${id}. Run its ladder and report honestly.
${GUARDRAILS}
${readStage(id)}
TASK — the stage's "ladder" array names npm scripts. For EACH repo the stage names, run them IN ORDER as
\`npm --prefix ${ROOT_TILDE}/<repoPath> run <script> > ${LOGS_TILDE}/${id}-<repo>-<script>.log 2>&1\` (for "test", the
script is \`npm --prefix <repo> test\`), reading each log ONCE with the Read tool. Every step must be green before
the next.
- A red step gets at most 3 repair attempts across the whole ladder. A repair fixes the CODE — never weaken, skip
  or delete a test, never mark a step green that was not.
- The one exception: an assertion that is wrong about the framework rather than the application (an exact-text
  assertion against a GDS macro that renders more than it was given). Correct it ONLY when the application renders
  the right thing and you can cite the evidence from \`test-results/*/error-context.md\`, and say so in your summary.
- format:check red → run \`npm --prefix <repo> run format\` once, then re-run format:check; that is a repair.
- test:fit: if Playwright reports a missing browser, run \`npm --prefix <repo> run playwright:install\` once. Read
  \`test-results/*/error-context.md\` for any failure.
- EADDRINUSE on the app's port (3002 for ins) means the workspace stack or another process holds it. That is not
  a code failure and no repair can fix it: report it in failures[] as "could not run: port 3002 in use" with
  green:false, so the run stops and the port can be freed.
- A step that cannot run at all goes in failures[] as "could not run: <reason>" with green:false.
Anything you changed during repair must be left STAGED (\`git -C <repo> add -A\`).
Report green:true ONLY if every step actually ran and actually passed in every repo.
Return the structured output only.`,
      doer({ label: `${id} ladder`, phase: 'Ladder', schema: LADDER_SCHEMA })
    )

    if (!ladder || !ladder.green) {
      const detail = ladder ? (ladder.failures ?? []).join(' | ') || ladder.summary : 'ladder agent died'
      log(`${id}: LADDER RED — ${detail}. Preserving the attempt and stopping.`)
      await agent(
        `The ladder for stage ${id} is red: ${detail}. PRESERVE THE WORK so it survives this machine.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${readStage(id)}
For each repo the stage names: stage everything except logs, coverage, test-results and playwright-report; commit on
the programme branch with subject \`wip(alignment): ${id} — ladder red\` and a body naming exactly what went red; push
with the refspec form. Set the stage's status to "ladder-red" in stages.json and append the failures to its notes.
Return the structured output only.`,
        watcher({ label: `${id} preserve`, phase: 'Ladder', schema: STAGE_SCHEMA })
      )
      results.push({ id, outcome: 'ladder-red', detail })
      halted = true
      break
    }

    // -----------------------------------------------------------------------
    // Land — commit and push on Haiku.
    // -----------------------------------------------------------------------
    phase('Land')

    const landed = await agent(
      `You are LANDING stage ${id}. The ladder is green. You commit and push; you review nothing.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${readStage(id)}
For EACH repo the stage names, in the order listed:
1. Prove it is on the programme branch.
2. \`git -C ${ROOT_TILDE}/<repoPath> status --short\` — if it prints nothing for this repo, the stage changed nothing
   here; skip it and say so.
3. Make sure nothing under logs/, coverage/, test-results/, playwright-report/ or .public/ is staged.
4. Commit with subject \`<type>(alignment): ${id} — <the stage title from stages.json>\`, where <type> is \`fix\` when
   the stage carries a ruling or its behaviourChanges below are non-empty, and \`refactor\` otherwise. The body is
   three to six lines saying what moved and what changed in behaviour (write "No behaviour change." when the list
   is empty), then for a ruling stage one line \`Ruling: <the ruling text from stages.json>\`, then the trailer.
   behaviourChanges from the plan: ${plan.behaviourChanges.length ? plan.behaviourChanges.map((b) => `\n   - ${b}`).join('') : 'none'}
5. Push with the refspec form. A non-fast-forward rejection means someone else pushed this branch — report
   landed:false naming the repo; never force.
6. Record the SHA: Edit ${STAGES} so this stage's \`commit\` holds it (an object keyed by repo when more than one),
   set status to "landed", and \`jq empty ${STAGES_TILDE}\`.
Return the structured output only.`,
      watcher({ label: `${id} land`, phase: 'Land', schema: LAND_SCHEMA })
    )

    if (!landed || !landed.landed) {
      log(`${id}: LAND FAILED — ${landed ? landed.summary : 'agent died'}`)
      results.push({ id, outcome: 'land-failed', detail: landed?.summary ?? 'agent died' })
      halted = true
      break
    }
    log(`${id}: landed ${(landed.commits ?? []).map((c) => `${c.repo}@${c.sha}`).join(' ')}`)

    // -----------------------------------------------------------------------
    // Pull request — one DRAFT per repo, reused across stages, never merged.
    // -----------------------------------------------------------------------
    phase('Pull request')

    const pr = await agent(
      `You are the PULL REQUEST keeper for stage ${id}. Every repo this programme touches gets exactly ONE draft PR that
lives for the whole programme; you make sure it exists after this stage's push.
${GUARDRAILS}
${readStage(id)}
For EACH repo the stage names whose header entry has "pr": true:
1. Is there already a PR recorded for that repo on ANY stage? \`jq -r '.stages[].prs[] | select(.repo=="<repo>") | .url' ${STAGES_TILDE}\`
   — if so, that is the PR; reuse it, do not create another.
2. Otherwise write the PR body with the Write tool to ${WORKAREA}/logs/pr-<repo>.md. It says, in plain GitHub
   markdown: this is a DESIGN PROPOSAL, not for merging; what the programme is (one paragraph from the header's
   purpose); that every stage lands as its own commit on this branch with a message saying what moved; that the
   report at workareas/shared/frontend-alignment/report.md on the workspace branch is the document to read; and it
   ends with the two attribution lines:
   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   https://claude.ai/code/session_012yTqNbopC6utUE3M1TKrj6
3. Then ONE command: \`${TOOLS_TILDE}/github/pr-ensure-draft.sh <github slug without DEFRA/> <branch> "Design proposal: align the frontends (do not merge)" ${WORKAREA_TILDE}/logs/pr-<repo>.md\`
   It prints one JSON object with number, url and created; an open PR that already exists is reused (created:false);
   exit 3 means only merged or closed PRs exist — report ok:false, a human decides.
4. IMMEDIATELY persist: Edit ${STAGES} so THIS stage's \`prs\` array holds {"repo","url","number"} for every PR the
   stage's repos now have (reused or created). \`jq empty ${STAGES_TILDE}\`.
Report ok:true only when every pr-enabled repo the stage touched has an open draft PR.
Return the structured output only.`,
      watcher({ label: `${id} pr`, phase: 'Pull request', schema: PR_SCHEMA })
    )

    if (!pr || !pr.ok) {
      log(`${id}: PR STAGE FAILED — ${pr ? pr.summary : 'agent died'}`)
      results.push({ id, outcome: 'pr-failed', detail: pr?.summary ?? 'agent died' })
      halted = true
      break
    }
    const prs = pr.prs ?? []

    // -----------------------------------------------------------------------
    // CI — Haiku watches the stage's own PRs, Sonnet fixes, bounded.
    // -----------------------------------------------------------------------
    if (prs.length > 0) {
      phase('CI')
      let ci = await watchPrs(id, prs, 'ci', `${id} ci watch`)
      let ciAttempt = 0
      while ((!ci || !ci.green) && !hardStop(ci) && ciAttempt < ciFixAttempts) {
        ciAttempt += 1
        log(`${id}: CI RED — fix attempt ${ciAttempt} of ${ciFixAttempts}`)
        await fixRed(id, prs, ci, 'ci', ciAttempt, '')
        ci = await watchPrs(id, prs, 'ci', `${id} ci watch after fix ${ciAttempt}`)
      }

      if (!ci || !ci.green) {
        const detail = ci ? [ci.blocked, ...(ci.failures ?? [])].filter((x) => x && x !== 'none').join(' | ') : 'ci watcher died'
        log(`${id}: CI STILL RED after ${ciAttempt} fix attempt(s) — stopping. ${detail}`)
        await agent(
          `Stage ${id} finished with CI red after ${ciAttempt} fix attempt(s): ${detail}. Record it.
${GUARDRAILS}
Edit ${STAGES}: set this stage's status to "ci-red" and append the failure detail to its notes. \`jq empty ${STAGES_TILDE}\`.
Return the structured output only.`,
          watcher({ label: `${id} record ci-red`, phase: 'CI', schema: STAGE_SCHEMA })
        )
        await recordState(id, `docs(alignment): record ${id} — ci red`, false)
        results.push({ id, outcome: 'ci-red', detail, prs: prs.map((p) => p.url) })
        halted = true
        break
      }
      log(`${id}: green in CI on ${prs.map((p) => p.repo).join(', ')}`)
    } else {
      log(`${id}: no PR-enabled repo touched — no repo CI to watch`)
    }

    await agent(
      `Stage ${id} is green in CI. Record it.
${GUARDRAILS}
Edit ${STAGES}: set this stage's status to "done". \`jq empty ${STAGES_TILDE}\`.
Return the structured output only.`,
      watcher({ label: `${id} done`, phase: 'CI', schema: STAGE_SCHEMA })
    )

    // -----------------------------------------------------------------------
    // Report — for a ruling stage, Fable moves the answered question out of
    // the open list and into the rulings section, with what landed.
    // -----------------------------------------------------------------------
    phase('Report')
    const refreshed = await agent(
      `You are REFRESHING the alignment report after stage ${id} landed green. You edit ${REPORT} in place with the
Edit tool; you change no source file and you do not rewrite the report.
${GUARDRAILS}
${readStage(id)}
${RULING_RULE}
Read ${REPORT} in full first, then the plan at ${PLANS}/${id}.md and the stage's notes, commit and prs in stages.json.
Then, keeping every other line of the report as it is:
1. If the stage carries \`question\` and \`ruling\`: remove that numbered question from the "Open questions" section
   (the whole numbered entry or table row, nothing else; keep every other question's number as it is — numbers are
   how Sam refers to them, so gaps are fine). Add or extend a section headed "## Rulings applied", placed directly
   after the "Open questions" section and before "Decisions you may want to reverse", with one entry per applied
   ruling in the shape: \`N. **<the question's headline, past tense>** Ruled <date from the ruling text>: <the ruling
   text>. Landed as <short SHA> on <PR link>.\` followed by two to four sentences saying what changed, naming the
   files, and any behaviour change the plan declared.
2. If the stage has no ruling: add one entry to "What was built" describing it, in the register of the entries
   already there.
3. Update every row of the "Residual drift" tables that the stage's changed files affect: a file the stage made
   byte-equal to its reference becomes "identical"; a file still differing only by a line another question owns
   names that question. Re-measure with \`diff\` before you change a row; never guess a class.
4. Update the "What was built" checks table row for each repo the stage touched: the checks are green as of the
   landing commit's date (\`git -C ${ROOT_TILDE}/<repoPath> log -1 --format=%cd --date=format:%-d\\ %B\\ %H:%M <sha>\`).
5. If a "Known caveats" bullet is no longer true after this stage, fix or remove that bullet.
British English, GDS plain language, no em dashes, no time estimates, no new headings beyond "## Rulings applied".
Set the stage's \`reportRefreshed\` field in stages.json to true. \`jq empty ${STAGES_TILDE}\`.
Return the structured output only.`,
      think({ label: `${id} report refresh`, phase: 'Report', schema: STAGE_SCHEMA })
    )
    if (!refreshed || !refreshed.ok) {
      log(`${id}: report refresh did not complete — ${refreshed ? refreshed.summary : 'agent died'}; recording state anyway`)
    }

    // -----------------------------------------------------------------------
    // Record — commit the state, the plan and the report on the workspace
    // repo and push. On the workspace PR that push re-runs the cross-repo E2E
    // suite against the branch-tagged images, which is the last gate.
    // -----------------------------------------------------------------------
    phase('Record')
    const recorded = await recordState(id, `docs(alignment): record ${id}`, false)
    if (!recorded || !recorded.landed) {
      log(`${id}: RECORD FAILED — ${recorded ? recorded.summary : 'agent died'}`)
      results.push({ id, outcome: 'record-failed', detail: recorded?.summary ?? 'agent died' })
      halted = true
      break
    }
    log(`${id}: recorded ${(recorded.commits ?? []).map((c) => `${c.repo}@${c.sha}`).join(' ') || '(nothing to commit)'}`)

    if (!WORKSPACE_PR || !(recorded.commits ?? []).length) {
      results.push({ id, outcome: 'done', prs: prs.map((p) => p.url) })
      log(`${id}: DONE`)
      continue
    }

    // -----------------------------------------------------------------------
    // E2E — Haiku watches the workspace PR. A red E2E is fixed in the stage's
    // own repos, re-proven on their PRs, then the workspace is pushed again to
    // re-run the suite. Bounded like CI.
    // -----------------------------------------------------------------------
    phase('E2E')
    const wsPrs = [{ repo: WORKSPACE_PR.repo, url: WORKSPACE_PR.url, number: WORKSPACE_PR.number }]
    let e2e = await watchPrs(id, wsPrs, 'e2e', `${id} e2e watch`)
    let e2eAttempt = 0
    while ((!e2e || !e2e.green) && !hardStop(e2e) && e2eAttempt < ciFixAttempts) {
      e2eAttempt += 1
      log(`${id}: E2E RED on the workspace PR — fix attempt ${e2eAttempt} of ${ciFixAttempts}`)
      await fixRed(
        id,
        prs.length ? prs : wsPrs,
        e2e,
        'e2e',
        e2eAttempt,
        `THIS RED IS THE CROSS-REPO E2E SUITE on the workspace PR (${WORKSPACE_PR.url}), which runs the tests repo's
Playwright suite against the whole stack built from the branch-tagged images of every repo. The failing spec's
evidence is the uploaded Playwright report artefact and the stack-logs artefact on the run. Decide first whether
the failure is caused by THIS stage's change (a page, URL, copy string or redirect the tests repo asserts) or is a
flake unrelated to it (a transient 500 on a fresh stack, a seed race). A flake gets no code change: report ok:true
with summary "flake: <what the run showed>" and no commit, and the workspace will be pushed again to re-run it.
A real failure is fixed in THIS stage's repos, never in the tests repo unless the stage names it.`
      )
      if (prs.length) {
        const again = await watchPrs(id, prs, 'ci', `${id} ci watch after e2e fix ${e2eAttempt}`)
        if (!again || !again.green) {
          e2e = again
          break
        }
      }
      await recordState(id, `chore(alignment): re-run E2E for ${id} (attempt ${e2eAttempt})`, true)
      e2e = await watchPrs(id, wsPrs, 'e2e', `${id} e2e watch after fix ${e2eAttempt}`)
    }

    if (!e2e || !e2e.green) {
      const detail = e2e ? [e2e.blocked, ...(e2e.failures ?? [])].filter((x) => x && x !== 'none').join(' | ') : 'e2e watcher died'
      log(`${id}: E2E STILL RED after ${e2eAttempt} fix attempt(s) — stopping. ${detail}`)
      await agent(
        `Stage ${id} landed green on its own PR but the workspace E2E suite is red after ${e2eAttempt} fix attempt(s): ${detail}. Record it.
${GUARDRAILS}
Edit ${STAGES}: set this stage's status to "e2e-red" and append the failure detail to its notes. \`jq empty ${STAGES_TILDE}\`.
Return the structured output only.`,
        watcher({ label: `${id} record e2e-red`, phase: 'E2E', schema: STAGE_SCHEMA })
      )
      results.push({ id, outcome: 'e2e-red', detail, prs: [...prs.map((p) => p.url), WORKSPACE_PR.url] })
      halted = true
      break
    }

    log(`${id}: DONE — green on its PR and on the workspace E2E`)
    results.push({ id, outcome: 'done', prs: [...prs.map((p) => p.url), WORKSPACE_PR.url] })
  }

  if (explicitList) break
}

// ---------------------------------------------------------------------------
// Whatever state the last E2E watcher wrote is still uncommitted on the
// workspace repo. Record it once, unless the run halted (the halt paths
// already recorded, or left the tree for a human to read).
// ---------------------------------------------------------------------------
if (!halted && results.length > 0) {
  phase('Record')
  await recordState(results[results.length - 1].id, 'docs(alignment): record the run outcome', false)
}

const done = results.filter((r) => r.outcome === 'done').length
log(`frontend-alignment: ${done} of ${results.length} stages done this run${halted ? ' — HALTED' : ''}`)
return { branch: branchName, rounds: round, ran: results.map((r) => r.id), results, halted }
