export const meta = {
  name: 'increment-build-loop',
  description:
    'Build backlog increments one at a time: implement → style review + code review → adversarially verify findings → judge → fix → verification ladder → commit or roll back',
  whenToUse:
    'Running any increment backlog under workareas/. One invocation builds one increment (or a serial list) with a full multi-agent quality pass per increment. Point FALLBACK at the workarea and set its increments, or pass args.',
  phases: [
    { title: 'Baseline' },
    { title: 'Implement' },
    { title: 'Review' },
    { title: 'Verify findings' },
    { title: 'Judge' },
    { title: 'Fix' },
    { title: 'Ladder' },
    { title: 'Land' },
  ],
}

// ---------------------------------------------------------------------------
// Configuration. `args` plumbing is unreliable in this runtime, so FALLBACK is
// the real switch: edit it, or pass the same shape as args.
//   workarea   path under workareas/, holding backlog.json
//   branch     the branch every repo in the programme is cut onto
//   scope      conventional-commit scope; defaults to the workarea's basename
//   executor   'claude' (every stage a subagent) or 'codex' (implement, review
//              and fix delegated to Codex CLI via the briefs in codex/)
// ---------------------------------------------------------------------------
const FALLBACK = {
  workarea: 'shared/plant-products-ched-pp',
  branch: 'spike/trace-to-requirements',
  scope: 'plant-products',
  executor: 'claude',
  increments: ['pp-053']
}
const CFG = typeof args === 'object' && args && args.increments ? args : FALLBACK

const ABS = '/Users/samfarrington/git/defra/trade-imports-animals'
const TILDE = '~/git/defra/trade-imports-animals'
const WORKAREA_REL = String(CFG.workarea ?? '').replace(/^\/+|\/+$/g, '')
const WORKAREA = `${ABS}/workareas/${WORKAREA_REL}`
const WORKAREA_TILDE = `${TILDE}/workareas/${WORKAREA_REL}`
const BACKLOG = `${WORKAREA}/backlog.json`
const BACKLOG_TILDE = `${WORKAREA_TILDE}/backlog.json`
const SCOPE = CFG.scope ?? WORKAREA_REL.split('/').pop()
const BRANCH = CFG.branch
const EXECUTOR = CFG.executor ?? 'claude'
const SKILLS = ABS + '/.claude/skills'
const BRIEFS = ABS + '/.claude/workflows/codex'
const BRIEFS_TILDE = TILDE + '/.claude/workflows/codex'

if (!WORKAREA_REL) {
  throw new Error(
    'increment-build-loop: config.workarea is required — a path relative to workareas/, e.g. "shared/plant-products-ched-pp"'
  )
}
if (!BRANCH) {
  throw new Error(`increment-build-loop: config.branch is required — the branch the "${WORKAREA_REL}" programme builds on`)
}
if (EXECUTOR !== 'claude' && EXECUTOR !== 'codex') {
  throw new Error(`increment-build-loop: unknown executor "${EXECUTOR}" — expected "claude" or "codex"`)
}

const REPO_PATH = {
  frontend: 'repos/trade-imports-animals-frontend',
  backend: 'repos/trade-imports-animals-backend',
  tests: 'repos/trade-imports-animals-tests'
}

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
- Headless: never ask a question. Decide, record the decision, keep going.
`

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

const readIncrement = (id) => `
THE INCREMENT — read it in full before anything else:
Run this Bash command and read the output: \`jq '.increments[] | select(.id=="${id}")' ${BACKLOG_TILDE}\`
That object is your complete specification: filesToTouch (paths + action + what), obligations, flowChanges,
schemaFields, copyKeys, specs, acceptanceCriteria, verification (the ladder, in order), notes, openQuestions.
It is self-contained BY DESIGN — if you find yourself needing information that is not in it, that is a defect
worth reporting in your summary, not a reason to improvise.
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

const codexRun = (id, stage, phaseName, instructions) => {
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
  <branch>       = ${BRANCH}
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
const codexStage = async (id, stage, phaseName, schema, instructions) => {
  const run = await codexRun(id, stage, phaseName, instructions)
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

log(`${WORKAREA_REL}: ${CFG.increments.length} increment(s) on ${BRANCH}, executor ${EXECUTOR}`)

const results = []

for (const id of CFG.increments) {
  // -----------------------------------------------------------------------
  // Baseline — never build on a red tree.
  // -----------------------------------------------------------------------
  phase('Baseline')

  const baseline = await agent(
    `You are the BASELINE GUARD for increment ${id}. Establish that the tree is green BEFORE any edit, so a
failure later in this increment is unambiguously ours.
${GUARDRAILS}
${readIncrement(id)}
TASK:
1. Determine the increment's repo from its "repo" field and confirm that repo is clean:
   \`git -C ${TILDE}/<repoPath> status --short\` (repo paths: frontend=${REPO_PATH.frontend}, backend=${REPO_PATH.backend}, tests=${REPO_PATH.tests}).
   If it is DIRTY, stop and report ok:false — an unclean tree makes commit-or-rollback unsafe.
2. Confirm the repo is on branch \`${BRANCH}\`. A repo the programme has not yet cut onto that branch may not
   have it; if your increment is the one that creates it, that is expected — say so and pass.
3. Run the FASTEST meaningful suite for that repo, to a log, and read it once:
   frontend: \`npm --prefix ${TILDE}/${REPO_PATH.frontend} test > ${WORKAREA_TILDE}/logs/${id}-baseline.log 2>&1\`
   backend:  \`mvn -q -f ${TILDE}/${REPO_PATH.backend}/pom.xml test > ${WORKAREA_TILDE}/logs/${id}-baseline.log 2>&1\`
   tests:    read package.json and run its unit/lint script if one exists; if the suite needs a running stack, SKIP it and say so.
4. Report ok:true only if the tree is clean and the suite is green.
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
    ? await codexStage(id, 'implement', 'Implement', incrementSchema, `You are implementing increment ${id}.`)
    : await agent(
    `You are the IMPLEMENTOR for increment ${id}. You make the change and nothing else — you do not review it,
and you do not commit it.
${GUARDRAILS}
${readIncrement(id)}

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
    log(`${id}: IMPLEMENT FAILED — rolling back. ${impl ? impl.summary : 'agent failed'}`)
    await agent(
      `Roll back the failed increment ${id} NON-DESTRUCTIVELY.
${GUARDRAILS}
Run exactly: \`git -C ${TILDE}/<repoPath> stash push -u -m "failed-${id}"\` for the increment's repo (look up its
"repo" field with jq against ${BACKLOG_TILDE}). NEVER \`reset --hard\`, NEVER \`clean -fd\` — the stash
is recoverable and that is the point. Confirm with \`git -C ... status --short\` that the tree is clean, and report
the stash ref so a human can recover the work.
Return the structured output only.`,
      { label: `${id} rollback`, phase: 'Implement', schema: incrementSchema }
    )
    results.push({ id, outcome: 'implement-failed', detail: impl?.summary ?? 'agent failed' })
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
    ? [codexResult(await codexStage(id, 'review', 'Review', FINDINGS_SCHEMA, `Review the staged, uncommitted change for increment ${id}.`), 'review', id)]
    : await parallel([...styleReviews, ...codeReviews, consistencyReview])
  const rawFindings = reviewResults.filter(Boolean).flatMap((r) => r.findings ?? [])
  log(`${id}: ${rawFindings.length} raw findings — verifying adversarially`)

  // -----------------------------------------------------------------------
  // Verify findings — refute before acting, so churn is never driven by a
  // plausible-but-wrong review comment.
  // -----------------------------------------------------------------------
  let confirmed = []
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
  let judgement = { decisions: [], fixNow: [], summary: 'No findings to judge.' }

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
          `THE RULED FIXES for increment ${id} — apply exactly these, in order:\n${judgement.fixNow.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
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
    log(`${id}: LADDER RED — rolling back`)
    const rb = await agent(
      `Increment ${id} failed its verification ladder. Roll it back NON-DESTRUCTIVELY and preserve the evidence.
${GUARDRAILS}
FAILURES: ${ladder ? (ladder.failures ?? []).join(' | ') : 'verifier agent failed'}
TASK:
1. Look up the increment's repo: \`jq -r '.increments[] | select(.id=="${id}") | .repo' ${BACKLOG_TILDE}\`.
2. \`git -C ${TILDE}/<repoPath> stash push -u -m "failed-${id}"\` — NEVER reset --hard, NEVER clean -fd.
3. Confirm the tree is clean with \`git -C ... status --short\`.
4. Append a short "ATTEMPT FAILED" note to that increment's notes field in ${BACKLOG} recording what
   went red and the stash ref, so the next attempt starts informed. Keep the JSON valid
   (\`jq empty ${BACKLOG_TILDE}\`).
Report the stash ref in your summary so the work can be recovered.
Return the structured output only.`,
      { label: `${id} rollback`, phase: 'Land', schema: LAND_SCHEMA }
    )
    results.push({ id, outcome: 'ladder-red', detail: ladder?.summary ?? 'verifier failed', rollback: rb?.summary })
    log(`${id}: rolled back — stopping the run so the failure is not built on top of`)
    break
  }

  const land = await agent(
    `Increment ${id} is implemented, reviewed, judged and verified green. LAND IT.
${GUARDRAILS}
TASK:
1. Look up its repo: \`jq -r '.increments[] | select(.id=="${id}") | .repo' ${BACKLOG_TILDE}\`, and its
   title for the commit subject.
2. Confirm what is staged with \`git -C ${TILDE}/<repoPath> status --short\`. Stage anything the increment produced
   that is still untracked — but NOTHING under logs/, no coverage output, no test-results/, no .playwright artefacts.
3. Commit with a conventional message: \`<type>(${SCOPE}): <increment title>\`, a body saying what changed and
   naming the increment id, and the trailer:
   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
4. Do NOT push — pushing is the human's call.
5. Update ${BACKLOG}: set this increment's "status" to "done" and add a "commit" field with the short
   SHA. Keep the JSON valid (\`jq empty ${BACKLOG_TILDE}\`).
Report the commit SHA.
Return the structured output only.`,
    { label: `${id} land`, phase: 'Land', schema: LAND_SCHEMA }
  )

  results.push({
    id,
    outcome: land && land.landed ? 'landed' : 'land-failed',
    commit: land?.commit,
    findings: { raw: rawFindings.length, confirmed: confirmed.length, fixed: judgement.fixNow.length },
    judgement: judgement.decisions.map((d) => `${d.call}: ${d.what}`)
  })

  log(`${id}: LANDED ${land?.commit ?? ''} — ${rawFindings.length} findings, ${confirmed.length} confirmed, ${judgement.fixNow.length} fixed`)

  // A HALT-FOR-REVIEW gate is a DESIGNED human checkpoint, not a review finding.
  // The judge absorbs routine triage; it does not absorb these.
  const gate = await agent(
    `Report whether increment ${id} carries a halt gate. Run exactly one command and read it:
\`jq -r '.increments[] | select(.id=="${id}") | .gate' ${BACKLOG_TILDE}\`
If it prints \`null\`, return ok:true with summary "no gate". Otherwise return ok:false and put the gate's full text
in summary — the run will stop so a human can review before dependent increments proceed.
Do not do anything else. One Bash call, no Grep/Glob tools, tilde paths only.`,
    { label: `${id} gate check`, phase: 'Land', schema: incrementSchema }
  )

  if (gate && !gate.ok) {
    log(`${id}: HALT-FOR-REVIEW GATE — stopping the run. ${gate.summary}`)
    results.push({ id, outcome: 'halted-at-gate', detail: gate.summary })
    break
  }
}

return { increments: results }
