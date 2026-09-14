export const meta = {
  name: 'frontend-alignment',
  description:
    'Align trade-imports-ins-frontend with the journey frontends one stage at a time on a shared branch: plan → implement → review → verify findings → judge → fix → ladder → commit and push → draft PR → CI. Never merges.',
  whenToUse:
    'Running or resuming the stage backlog under workareas/shared/frontend-alignment/stages.json. One invocation runs every stage still todo, serially, and stops at the first red so nothing is built on a broken stage.',
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
  ],
}

// ---------------------------------------------------------------------------
// Configuration. `args` plumbing is unreliable in this runtime, so FALLBACK is
// the real switch: edit it, or pass the same shape as args.
//   workarea   path under workareas/, holding stages.json
//   stages     stage ids to run in order, or null for every stage still todo
// Everything else (branch, repos, ladders, caps) is read from stages.json by
// the agents, so the programme is data and this script knows nothing about it.
// ---------------------------------------------------------------------------
const FALLBACK = {
  workarea: 'shared/frontend-alignment',
  stages: null,
}

const CFG = typeof args === 'object' && args && args.workarea ? args : FALLBACK
const WORKAREA_REL = String(CFG.workarea).replace(/^\/+|\/+$/g, '')

// The canonical clone location is fixed by CLAUDE.md rule 1. Two spellings of
// the same directory: TILDE for Bash (the guard hook denies /Users paths),
// ABS for the Read/Write/Edit tools (which need an absolute path). Never let
// ABS appear near a Bash example.
const TILDE = '~/git/defra/trade-imports-workspace'
const ABS = '/Users/samfarrington/git/defra/trade-imports-workspace'

const WORKAREA = `${ABS}/workareas/${WORKAREA_REL}`
const WORKAREA_TILDE = `${TILDE}/workareas/${WORKAREA_REL}`
const STAGES = `${WORKAREA}/stages.json`
const STAGES_TILDE = `${WORKAREA_TILDE}/stages.json`
const PLANS = `${WORKAREA}/plans`
const LOGS_TILDE = `${WORKAREA_TILDE}/logs`
const SKILLS = `${ABS}/.claude/skills`
const TOOLS_TILDE = `${TILDE}/tools`

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
- In Bash ALWAYS use tilde paths \`${TILDE}/...\` — a literal /Users/... path in Bash is DENIED. For the Read/Write/Edit TOOLS use absolute paths under the workspace. Same directory, two spellings; if you catch yourself pasting an absolute path into Bash, stop and convert it.
- No \`awk\`, no \`sed\`, no text-processing pipes: read files with the Read tool, edit with the Edit tool, search with one unpiped \`grep -rn\`.
- Never bare \`node\` / \`node -e\` / \`npx\` / a node_modules binary. Everything runs through the repo's NAMED npm scripts: \`npm --prefix ${TILDE}/<repoPath> run <script>\`. Formatting is fixed ONLY by \`npm --prefix <repo> run format\`. If no script covers what you need, STOP and report the command you wanted.
- NEVER run \`sonar\`. NEVER \`gh\` directly for PRs or checks — the allowlisted scripts under ${TOOLS_TILDE}/github/ and ${TOOLS_TILDE}/github-actions/ do that.
- Tests go TO A FILE under ${LOGS_TILDE}/ and you read that file ONCE with the Read tool. Never grep streaming output, never re-run a suite just to see it again.
- For Playwright failures read \`test-results/*/error-context.md\` in the repo, not the tail of the run.
- Rollback is ALWAYS \`git stash push -u\` — NEVER \`reset --hard\`, NEVER \`clean -fd\`.
- NEVER sleep. The watcher scripts poll for you.
- Never \`git push --force\`. Never merge anything. Never push to \`main\`.
- Headless: never ask a question. Decide, write the decision into the stage's notes in stages.json, keep going.
`

const PUSH_RULE = `HOW TO PUSH — the exact form, every time, no variations:
\`git -C ${TILDE}/<repoPath> push -u origin refs/heads/<branch>:refs/heads/<branch>\`
Never \`--force\`. Never a bare \`git push\`. Never \`push origin <branch>\` — the fully qualified refspec can only ever
update that one branch.

BEFORE ANY COMMIT OR PUSH, prove you are on the branch you think you are:
\`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\`
If that prints anything other than the programme branch — \`main\` above all — STOP and report ok:false.`

const COMMIT_TRAILER = `Every commit message ends with these two lines, verbatim, after a blank line:
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012yTqNbopC6utUE3M1TKrj6`

const readStage = (id) => `
THE STAGE — read it in full before anything else. Run this Bash command and read the output:
\`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\`
Then read the programme header (everything except .stages) the same way:
\`jq 'del(.stages)' ${STAGES_TILDE}\`
The header gives you the branch, the repo paths and GitHub slugs, the direction rule, the invariants and the target
tree. The stage gives you the brief, the reference files in the journey frontends, and the ladder. Repo paths in the
header are workspace-relative: prefix them with ${TILDE}/ in Bash and with the workspace absolute path for the
Read/Write/Edit tools.`

const stageNotes = (id) => `To record a note or an open question on the stage, Edit ${STAGES} — append a string to
that stage's \`notes\` or \`openQuestions\` array, keep the JSON valid, and re-check with \`jq empty ${STAGES_TILDE}\`.`

// ---------------------------------------------------------------------------
// Schemas.
// ---------------------------------------------------------------------------
const BASELINE_SCHEMA = {
  type: 'object',
  required: ['ok', 'done', 'todo', 'summary'],
  properties: {
    ok: { type: 'boolean', description: 'Every repo is on the programme branch with a clean tree' },
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

// ---------------------------------------------------------------------------
// Baseline — where is the programme, and is every repo where it should be.
// ---------------------------------------------------------------------------
phase('Baseline')

const baseline = await agent(
  `You are the BASELINE checker for the frontend-alignment programme. You change nothing.
${GUARDRAILS}
1. Read the programme header: \`jq 'del(.stages)' ${STAGES_TILDE}\`. Note the branch and every repo path.
2. List every stage with its status: \`jq -r '.stages[] | .id + " " + .status' ${STAGES_TILDE}\`.
3. For EACH repo in the header: \`git -C ${TILDE}/<repoPath> rev-parse --abbrev-ref HEAD\` must print the programme
   branch, and \`git -C ${TILDE}/<repoPath> status --short\` must print nothing. A repo on another branch or with a
   dirty tree is a problem — name it. Do not fix it.
4. Report done = every stage whose status is "done", todo = every stage whose status is "todo" in file order.
   A stage in any other status (ci-red, ladder-red, implement-failed) is a problem — name it in problems and leave
   it out of todo; the run must not build on it.
Return the structured output only.`,
  watcher({ label: 'baseline', phase: 'Baseline', schema: BASELINE_SCHEMA })
)

if (!baseline || !baseline.ok) {
  throw new Error(`Baseline failed: ${baseline ? [baseline.summary, ...(baseline.problems ?? [])].join(' | ') : 'agent died'}`)
}

const requested = Array.isArray(CFG.stages) && CFG.stages.length > 0 ? CFG.stages : baseline.todo
const stageIds = requested.filter((id) => !baseline.done.includes(id))
log(`baseline ok on ${baseline.branch}: ${baseline.done.length} done, running ${stageIds.length} — ${stageIds.join(', ')}`)

const results = []

for (const id of stageIds) {
  // -------------------------------------------------------------------------
  // Report stage: one thinker writes it, one watcher lands it. No review, no CI.
  // -------------------------------------------------------------------------
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
\`find ${TILDE}/repos/trade-imports-ins-frontend/src -type f -not -path '*/node_modules/*'\` and the same for
animals and plants. For the residual-drift section, compare the chassis surfaces three ways with
\`diff -rq\` over src/auth, src/plugins, src/server/common and src/server/auth between ins and animals, and
between animals and plants, and classify what remains as: identical, import-path-only, deliberate (journey-only or
service-specific), or unexplained drift. Name the unexplained ones file by file.
WRITE ${WORKAREA}/report.md with the sections the brief lists. Plain GitHub markdown. British English, GDS plain
language, no em dashes, no time estimates. Be specific: name files, link the draft PRs, quote the decisions. The
open-questions section is the list the team rules on; write each as a question with the two-against-one count
where that applies.
Set the stage status to "done" in stages.json when the report is written.
Return the structured output only.`,
      think({ label: `${id} report`, phase: 'Report', schema: STAGE_SCHEMA })
    )
    if (!report || !report.ok) {
      results.push({ id, outcome: 'report-failed', detail: report?.summary ?? 'agent died' })
      break
    }
    const landed = await agent(
      `You are LANDING the alignment report on the workspace repository.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${readStage(id)}
The workspace repo path is "." — so the repo is ${TILDE} itself. Prove it is on the programme branch. Then stage
ONLY these paths: workareas/${WORKAREA_REL}/report.md, workareas/${WORKAREA_REL}/stages.json,
workareas/${WORKAREA_REL}/plans/ — nothing under logs/. Commit with subject
\`docs(alignment): the frontend alignment report\` and push with the refspec form. Record the SHA in the stage's
\`commit\` field in stages.json — note that this edit lands in the working tree after the commit; that is fine,
say so in your summary. Return the structured output only.`,
      watcher({ label: `${id} land`, phase: 'Land', schema: LAND_SCHEMA })
    )
    results.push({ id, outcome: landed?.landed ? 'done' : 'land-failed', detail: landed?.summary })
    continue
  }

  // -------------------------------------------------------------------------
  // Plan — Fable reads the brief, both reference frontends and the current
  // state of ins, and writes a file-level plan the implementor can execute.
  // -------------------------------------------------------------------------
  phase('Plan')
  log(`${id}: planning`)

  const plan = await agent(
    `You are the PLANNER for stage ${id} of the frontend-alignment programme. You write the plan; you change no
source file.
${GUARDRAILS}
${readStage(id)}
${stageNotes(id)}
WHAT A PLAN IS HERE: a file-level script for a Sonnet implementor who has less context than you. Read the stage's
reference files in the journey frontends IN FULL (Read tool), read the corresponding current files in ins IN FULL,
and read the workspace conventions you will hold the implementor to: ${ABS}/docs/best-practices/node/code-style.md,
${ABS}/docs/best-practices/node/hapi.md, ${ABS}/docs/best-practices/node/nunjucks.md and
${ABS}/docs/best-practices/node/testing/frontend.md. Then WRITE ${PLANS}/${id}.md with:
1. Moves — a table of from → to for every file that moves or is deleted, tests included.
2. Edits — for every file that changes content, what changes and why, quoting the reference file's shape where the
   implementor should copy it.
3. New files — full intent, and the reference file to imitate.
4. Imports — the rule for rewriting imports this stage disturbs.
5. Tests — which tests move, which change, which are new, and what each pins.
6. Invariants to prove — the programme invariants this stage can break and the check that proves it did not
   (a URL list to grep for, a fit spec to run, a jq over copy files).
7. Out of scope — what the implementor must leave alone even though it is tempting.
Direction is settled: ins moves toward animals/plants; where they differ, prefer plants' shape and record it in
decisions. Journey-only machinery never comes to ins. Where the brief leaves a choice open, MAKE IT and record it in
decisions — never leave a fork for the implementor. reviewFocus names the files whose content is worth a reviewer's
time: adapted logic, new code, rewritten tests — never pure moves. behaviourChanges lists every behaviour change,
or is empty. If the brief cannot be carried out as written, say exactly why and return ok:false.
Return the structured output only.`,
    think({ label: `${id} plan`, phase: 'Plan', schema: PLAN_SCHEMA })
  )

  if (!plan || !plan.ok) {
    log(`${id}: PLAN REFUSED — ${plan ? plan.summary : 'agent died'}`)
    results.push({ id, outcome: 'plan-refused', detail: plan?.summary ?? 'agent died' })
    break
  }
  log(`${id}: planned — ${plan.reviewFocus.length} files for review, ${plan.behaviourChanges.length} behaviour changes`)

  // -------------------------------------------------------------------------
  // Implement — Sonnet executes the plan and stages the result.
  // -------------------------------------------------------------------------
  phase('Implement')

  const impl = await agent(
    `You are the IMPLEMENTOR for stage ${id}. You execute the plan and nothing else — you do not review it and you
do not commit it.
${GUARDRAILS}
${readStage(id)}
${stageNotes(id)}
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
    break
  }

  const changed = (impl.changedFiles ?? []).filter((f) => !f.endsWith('.log'))
  const cap = 8
  const focus = plan.reviewFocus.slice(0, cap)
  log(`${id}: implemented, ${changed.length} files changed — reviewing ${focus.length}`)

  // -------------------------------------------------------------------------
  // Review — style and correctness per focus file on Sonnet, plus one
  // consistency review across the whole change on Fable.
  // -------------------------------------------------------------------------
  phase('Review')

  const styleReviews = focus.map((file) => () =>
    agent(
      `You are a STYLE REVIEWER for stage ${id}, reviewing ONE file: ${file}
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/code-style/references/STYLE_FILE_REVIEWER.md IN FULL and follow it, and
${SKILLS}/code-style/SKILL.md for the language routing (GDS/Nunjucks → components/styles/patterns; Playwright →
playwright; Node → the 17-rule style guide + JSDoc).
CONTEXT: the plan is at ${PLANS}/${id}.md; the stage is \`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\`.
See the change with \`git -C ${TILDE}/<repoPath> diff --staged -- <file>\`, and compare against the reference file
the plan names for it.
SCOPE: style only — formatting, naming, conventions, idiom, comment discipline, copy structure. HOUSE RULES that
override generic advice: comments are removed aggressively; no migration or rename comments; names say what a thing
does, never the benefit it brings; pipelines get named helpers. A file that was MOVED and matches its reference
file's shape is clean — do not invent findings for it.
Report ONLY real findings, each with a concrete fix. No praise. Clean file → empty findings array.
Return the structured output only.`,
      doer({ label: `${id} style:${file.split('/').pop()}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )
  )

  const codeReviews = focus.map((file) => () =>
    agent(
      `You are a CODE REVIEWER for stage ${id}, reviewing ONE file: ${file}
${GUARDRAILS}
YOUR PERSONA — read ${SKILLS}/review/references/FILE_REVIEWER.md IN FULL and follow it, and
${SKILLS}/review/SKILL.md for the review dimensions.
CONTEXT: the plan is at ${PLANS}/${id}.md; the stage and the programme invariants are at
\`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\` and \`jq '.invariants' ${STAGES_TILDE}\`. See the change
with \`git -C ${TILDE}/<repoPath> diff --staged -- <file>\`.
SCOPE: correctness, security, error handling, and TEST QUALITY. Hunt for: a behaviour change the plan did not
declare; an invariant broken (a public URL that moved, a string that should be in copy after s07, a module-boundary
mock where a network mock exists); tests that assert implementation rather than behaviour; tests whose name claims
something their assertions do not pin; a moved file whose adaptation dropped a guard the reference file has.
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
YOUR PERSONA — read ${SKILLS}/review/references/CONSISTENCY_REVIEWER.md IN FULL and follow it.
CONTEXT: plan at ${PLANS}/${id}.md; stage, header and target tree via \`jq 'del(.stages)' ${STAGES_TILDE}\` and
\`jq '.stages[] | select(.id=="${id}")' ${STAGES_TILDE}\`; whole change via \`git -C ${TILDE}/<repoPath> diff --staged --stat\`
then per file as needed.
LOOK FOR: a move the plan listed that did not happen, or one that happened but the plan did not list; a file whose
new location is not where the target tree puts it; the same concept named two ways; an import left pointing at the
old path; registration that exists in one place but not its twin (a route in a controller but not in the features
barrel; a copy key in en but not cy); a reference-file shape the plan said to copy that was paraphrased instead;
and the plan's "invariants to prove" section — run each proof it names and report any that fails as a finding.
Return the structured output only.`,
      think({ label: `${id} consistency`, phase: 'Review', schema: FINDINGS_SCHEMA })
    )

  const reviewResults = await parallel([...styleReviews, ...codeReviews, consistencyReview])
  const rawFindings = reviewResults.filter(Boolean).flatMap((r) => r.findings ?? [])
  log(`${id}: ${rawFindings.length} raw findings — verifying adversarially`)

  // -------------------------------------------------------------------------
  // Verify findings — refute before acting.
  // -------------------------------------------------------------------------
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
Judge each finding INDEPENDENTLY and on its own evidence.

THE FINDINGS:
${items
  .map((f) => `${f.n}. [${f.severity}] ${f.file}${f.line ? ' line ' + f.line : ''}\n   WHAT: ${f.what}\n   WHY: ${f.why}\n   PROPOSED FIX: ${f.fix}`)
  .join('\n')}

CHECK THEM against the ACTUAL code (\`git -C ${TILDE}/<repoPath> diff --staged -- ${file}\`, and Read the file in
full), against the plan at ${PLANS}/${id}.md, against the reference file the plan names, and against the programme
invariants (\`jq '.invariants' ${STAGES_TILDE}\`). Read those sources ONCE and reuse them across all findings.
real:false if it is wrong, already handled, out of the stage's scope, or taste dressed as defect. real:true ONLY if
you could not refute it. Cite file:line in every reasoning. Same numbering as above.
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

  // -------------------------------------------------------------------------
  // Judge — Fable rules each surviving finding. No human in the loop.
  // -------------------------------------------------------------------------
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
- reject — you disagree even post-refutation. Say why, with evidence.
BIAS: this programme values a faithful, complete stage over a polished one. Fix anything cheap and clearly right;
defer anything that widens the stage; reject taste.
For every fix-now item write a COMPLETE instruction in fixNow[]: file, exact change, and the test or check that
proves it. A fixer with no other context must be able to execute it.
Return the structured output only.`,
        think({ label: `${id} judge`, phase: 'Judge', schema: JUDGEMENT_SCHEMA })
      )) ?? judgement
  }

  // -------------------------------------------------------------------------
  // Fix — Sonnet applies only what the judge ruled.
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Ladder — the stage's own verification list, in order, on Sonnet.
  // -------------------------------------------------------------------------
  phase('Ladder')

  const ladder = await agent(
    `You are the VERIFIER for stage ${id}. Run its ladder and report honestly.
${GUARDRAILS}
${readStage(id)}
TASK — the stage's "ladder" array names npm scripts. For EACH repo the stage names, run them IN ORDER as
\`npm --prefix ${TILDE}/<repoPath> run <script> > ${LOGS_TILDE}/${id}-<repo>-<script>.log 2>&1\` (for "test", the
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
    break
  }

  // -------------------------------------------------------------------------
  // Land — commit and push on Haiku.
  // -------------------------------------------------------------------------
  phase('Land')

  const landed = await agent(
    `You are LANDING stage ${id}. The ladder is green. You commit and push; you review nothing.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${readStage(id)}
For EACH repo the stage names, in the order listed:
1. Prove it is on the programme branch.
2. \`git -C ${TILDE}/<repoPath> status --short\` — if it prints nothing for this repo, the stage changed nothing
   here; skip it and say so.
3. Make sure nothing under logs/, coverage/, test-results/, playwright-report/ or .public/ is staged.
4. Commit with subject \`refactor(alignment): ${id} — <the stage title from stages.json>\` (for s12 use
   \`fix(alignment): ...\`), a body of three to six lines saying what moved and what changed in behaviour (from the
   plan's behaviourChanges — write "No behaviour change." when it is empty), then the trailer.
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
    break
  }
  log(`${id}: landed ${(landed.commits ?? []).map((c) => `${c.repo}@${c.sha}`).join(' ')}`)

  // -------------------------------------------------------------------------
  // Pull request — one DRAFT per repo, reused across stages, never merged.
  // -------------------------------------------------------------------------
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
   It prints one JSON object with number, url and created; exit 3 means only merged or closed PRs exist — report
   ok:false, a human decides.
4. IMMEDIATELY persist: Edit ${STAGES} so THIS stage's \`prs\` array holds {"repo","url","number"} for every PR the
   stage's repos now have (reused or created). \`jq empty ${STAGES_TILDE}\`.
Report ok:true only when every pr-enabled repo the stage touched has an open draft PR.
Return the structured output only.`,
    watcher({ label: `${id} pr`, phase: 'Pull request', schema: PR_SCHEMA })
  )

  if (!pr || !pr.ok) {
    log(`${id}: PR STAGE FAILED — ${pr ? pr.summary : 'agent died'}`)
    results.push({ id, outcome: 'pr-failed', detail: pr?.summary ?? 'agent died' })
    break
  }
  const prs = pr.prs ?? []
  if (prs.length === 0) {
    log(`${id}: no PR-enabled repo touched — skipping CI`)
    results.push({ id, outcome: 'done', detail: 'no CI for this repo' })
    continue
  }

  // -------------------------------------------------------------------------
  // CI — Haiku watches, Sonnet fixes, bounded.
  // -------------------------------------------------------------------------
  phase('CI')

  const watch = () =>
    agent(
      `You are the CI WATCHER for stage ${id}. Wait for the checks on every PR below to resolve and report what they
did. You change no code.
${GUARDRAILS}
THE PULL REQUESTS:
${prList(prs)}
For EACH pr:
1. Read the watch budget: \`jq -r '.ciWatchSeconds' ${STAGES_TILDE}\`.
2. ONE Bash call with the tool's \`timeout\` parameter set to 600000:
   \`${TOOLS_TILDE}/github-actions/wait-for-pr-checks.sh <github slug without DEFRA/> <number> <ciWatchSeconds> > ${LOGS_TILDE}/${id}-ci-<repo>.log 2>&1\`
   The script polls for you; never sleep yourself.
3. Read the log ONCE. Exit 0 → green. Exit 1 → RED: one line per failing check in failures[], with its name and
   link. Exit 2 → unresolved: it counts as RED, never green; say "unresolved". Exit 4 → no checks configured:
   green:false and put "no checks configured on <repo>" in blocked.
   If the Bash call itself timed out before the script returned, run it again at most twice more; still unresolved
   → RED.
4. For a RED check get the failing job's log so a fixer can act:
   \`${TOOLS_TILDE}/github-actions/get-failure.sh <github slug without DEFRA/> <run id> > ${LOGS_TILDE}/${id}-ci-fail-<repo>.log 2>&1\`
   The check's link looks like \`.../actions/runs/<run id>/job/<job id>\` — pass the <run id> number only, never
   the whole link (the script would read the job id off the end of it).
   and name the failing step in failures[]. Where the failing job is Playwright, say so — its evidence is the
   uploaded report artefact, not the run log.
5. Record the outcome: Edit ${STAGES} so this stage's \`ci\` holds {"state": "green"|"red"|"unresolved", "failures": [...]}.
blocked is ONLY for something no code fix can address. green:true ONLY if EVERY pr resolved green.
Return the structured output only.`,
      watcher({ label: `${id} ci watch`, phase: 'CI', schema: CI_SCHEMA })
    )

  let ci = await watch()
  const ciFixAttempts = 2
  let ciAttempt = 0
  while ((!ci || !ci.green) && !hardStop(ci) && ciAttempt < ciFixAttempts) {
    ciAttempt += 1
    log(`${id}: CI RED — fix attempt ${ciAttempt} of ${ciFixAttempts}`)
    await agent(
      `You are the CI FIXER for stage ${id}, attempt ${ciAttempt} of ${ciFixAttempts}. CI is red on the programme
branch. Fix the CODE, prove it locally, commit and push. You merge nothing.
${GUARDRAILS}
${PUSH_RULE}
${COMMIT_TRAILER}
${readStage(id)}
THE PULL REQUESTS:
${prList(prs)}
WHAT THE WATCHER SAW:
${ci ? (ci.failures ?? []).map((f, i) => `${i + 1}. ${f}`).join('\n') || ci.summary : 'the watcher died — read the checks yourself with the wait script'}
The watcher's logs are under ${LOGS_TILDE}/${id}-ci-*.log — Read them.
TASK:
1. Read the actual failure. If it is something the local ladder could not have caught (a CI-only environment
   difference, the docker build, the npm version pin, the security audit), say so in your summary.
2. Fix the code. Never weaken, skip or delete a test; never disable a check.
3. Prove it with the narrowest npm script that covers the failure, to a log under ${LOGS_TILDE}/, read once.
4. Prove you are on the programme branch, commit with subject \`fix(alignment): ${id} — <what you fixed>\` and the
   trailer, push with the refspec form.
5. If the failure needs work outside this stage's scope, report ok:false saying exactly that.
Return the structured output only.`,
      doer({ label: `${id} ci fix ${ciAttempt}`, phase: 'CI', schema: STAGE_SCHEMA })
    )
    ci = await watch()
  }

  if (!ci || !ci.green) {
    const detail = ci ? [ci.blocked, ...(ci.failures ?? [])].filter((x) => x && x !== 'none').join(' | ') : 'ci watcher died'
    log(`${id}: CI STILL RED after ${ciAttempt} fix attempt(s) — stopping. ${detail}`)
    await agent(
      `Stage ${id} finished with CI red after ${ciAttempt} fix attempt(s): ${detail}. Record it.
${GUARDRAILS}
Edit ${STAGES}: set this stage's status to "ci-red" and append the failure detail to its notes. \`jq empty ${STAGES_TILDE}\`.
Return the structured output only.`,
      watcher({ label: `${id} record`, phase: 'CI', schema: STAGE_SCHEMA })
    )
    results.push({ id, outcome: 'ci-red', detail, prs: prs.map((p) => p.url) })
    break
  }

  await agent(
    `Stage ${id} is green in CI. Record it.
${GUARDRAILS}
Edit ${STAGES}: set this stage's status to "done". \`jq empty ${STAGES_TILDE}\`.
Return the structured output only.`,
    watcher({ label: `${id} done`, phase: 'CI', schema: STAGE_SCHEMA })
  )
  log(`${id}: DONE — green in CI`)
  results.push({ id, outcome: 'done', prs: prs.map((p) => p.url) })
}

const done = results.filter((r) => r.outcome === 'done').length
log(`frontend-alignment: ${done} of ${stageIds.length} stages done this run`)
return { branch: baseline.branch, ran: stageIds, results }
