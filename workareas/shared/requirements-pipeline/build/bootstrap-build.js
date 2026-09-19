export const meta = {
  name: 'requirements-pipeline-bootstrap-build',
  description: 'Bootstrap build of the requirements-pipeline programme: plan, audit, implement, live-skill review, verify, judge, fix, ladder, acceptance, land',
  phases: [
    { title: 'Baseline' },
    { title: 'Plan', detail: 'Opus plans just in time; a different Opus audits it against the backlog row' },
    { title: 'Implement' },
    { title: 'Review', detail: 'per-file code-style + review personas read live; one consistency reviewer' },
    { title: 'Verify', detail: 'adversarial, default refuted' },
    { title: 'Judge' },
    { title: 'Fix' },
    { title: 'Ladder', detail: 'cheap run-this agent: tim test + lint to logs' },
    { title: 'Acceptance', detail: 'fresh Opus: backlog criteria against the final change, never the plan' },
    { title: 'Land' },
  ],
}

// This bootstrap exists because the new pipeline cannot build itself yet (DESIGN.md 0.4, 11.1).
// It follows the corrected design's stage shape: judgement on Opus or Sonnet, mechanical work
// on a Haiku "run this" agent, review personas and routing read live from the workspace skills.

const cfg = typeof args === 'string' ? JSON.parse(args) : args
if (!cfg || !Array.isArray(cfg.increments) || !cfg.increments.length) throw new Error('args.increments (array of increment ids) is required')
if (!cfg.trailer) throw new Error('args.trailer (commit trailer text) is required')
log(`Config: ${JSON.stringify(cfg)}`)

const ROOT_ABS = '/Users/samfarrington/git/defra/trade-imports-workspace'
const ROOT = '~/git/defra/trade-imports-workspace'
const P = 'workareas/shared/requirements-pipeline'
const P_ABS = `${ROOT_ABS}/${P}`
const P_T = `${ROOT}/${P}`
const BL_T = `${P_T}/design/backlog.json`
const DESIGN_ABS = `${P_ABS}/design/DESIGN.md`
const REQS_ABS = `${P_ABS}/analysis/sam-requirements.md`
const LOGS_T = `${P_T}/build/logs`
const LOGS_ABS = `${P_ABS}/build/logs`
const PLANS_ABS = `${P_ABS}/build/plans`
const BRANCH = 'chore/NO_JIRA-requirements-pipeline'
const SK = `${ROOT_ABS}/.claude/skills`

const THINK = { model: 'opus', effort: 'high' }
const DOER = { model: 'sonnet', effort: 'high' }
const RUNNER = { model: 'haiku', effort: 'low' }

const GUARD = `
GUARD RAILS (mandatory, every step):
- Bash = tilde paths only (${ROOT}/...). Read/Write/Edit TOOLS = absolute paths (${ROOT_ABS}/...). Both name the same directory. If you catch yourself pasting an absolute path into Bash, stop and convert it.
- NEVER use the Grep or Glob TOOLS. Use Bash grep -rn / find / ls / jq / git -C ${ROOT}.
- ONE command per Bash call. No &&, no ;, no |, no cd, no env-var prefixes, no trailing echo $?. Use git -C and npm --prefix. Redirecting output to a file IS allowed.
- Never bare node, npx or node_modules binaries: run tim through npm scripts (npm --prefix ${ROOT}/tim test, npm --prefix ${ROOT}/tim run lint, npm --prefix ${ROOT}/tim run tim -- <args>). No curl, no python, no awk or sed edits (use the Edit tool). Never run sonar.
- Test and lint output goes TO A FILE under ${LOGS_T}/ and you read that file ONCE. Never grep streaming output; never re-run a suite just to see it again.
- The working tree holds other people's untracked work under workareas/shared/ (other programmes). NEVER stage, move, edit or stash anything outside the paths this increment's plan names. Never git add -A or git add . ; always add paths by name.
- Rollback is only ever git stash push -u -- <named paths>. Never reset --hard, never clean, never checkout -- on files you did not create in this increment.
- Never push, never open a PR, never switch branches. The branch is ${BRANCH}.
- tim rails (tim/CLAUDE.md) apply to any tim change: library-first, test on input/output with vitest, sibling *.test.js files, no spy-call assertions, nock/undici mocks only at the network boundary.
- Headless: never ask a question. Decide, record the decision, keep going.
`

const STANDARDS = `
STANDARDS ARE READ LIVE (Sam's R2 and R3): path-scoped rules in .claude/rules/ load when you Read a matching file. They are POINTERS: open and read every best-practice file a loaded rule names before you write or judge code of that type. Rules load on Read, not Write, so before creating a file of a type you have not read in this task, Read an existing sibling of that type first.
`

const READ_ROW = `Read the increment's backlog row and every member atom with jq against ${BL_T}, for example:
  jq '.increments[] | select(.id=="<ID>")' ${BL_T}
  jq '[.requirements[] | select(.id as $x | ["<member ids>"] | index($x))]' ${BL_T}
The atoms are the requirement: statement, acceptance criteria, provenance, constraints. The increment is the unit of build.`

const S = {
  row: { type: 'object', properties: {
    id: { type: 'string' }, status: { type: 'string' }, title: { type: 'string' },
    members: { type: 'array', items: { type: 'string' } },
    depStatuses: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } }, required: ['id', 'status'] } },
    criteriaCount: { type: 'number' },
  }, required: ['id', 'status', 'title', 'members', 'depStatuses', 'criteriaCount'] },
  plan: { type: 'object', properties: {
    ok: { type: 'boolean' }, refusal: { type: 'string' }, planFile: { type: 'string' },
    files: { type: 'array', items: { type: 'string' }, description: 'every path (workspace-relative) the increment will create, edit, move or delete' },
    reviewFocus: { type: 'array', items: { type: 'string' } },
    commitSubject: { type: 'string', description: 'conventional commit subject, e.g. feat(backlog): ...' },
    behaviourChanges: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  }, required: ['ok', 'refusal', 'planFile', 'files', 'reviewFocus', 'commitSubject', 'behaviourChanges', 'risks'] },
  audit: { type: 'object', properties: {
    pass: { type: 'boolean', description: 'true when there is no blocking objection' },
    objections: { type: 'array', items: { type: 'string' }, description: 'BLOCKING objections only' },
    notes: { type: 'array', items: { type: 'string' }, description: 'non-blocking points the implementer must address' },
  }, required: ['pass', 'objections', 'notes'] },
  impl: { type: 'object', properties: {
    done: { type: 'boolean' }, changedFiles: { type: 'array', items: { type: 'string' } },
    testsGreen: { type: 'boolean' }, logFiles: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
  }, required: ['done', 'changedFiles', 'testsGreen', 'logFiles', 'notes'] },
  manifest: { type: 'object', properties: {
    files: { type: 'array', items: { type: 'string' } },
    unexpected: { type: 'array', items: { type: 'string' } },
  }, required: ['files', 'unexpected'] },
  findings: { type: 'object', properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      file: { type: 'string' }, line: { type: 'number' }, severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      category: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } },
      required: ['file', 'line', 'severity', 'category', 'problem', 'evidence', 'fix'] } },
    standardsRead: { type: 'array', items: { type: 'string' }, description: 'every SKILL.md, persona and best-practice file you actually read' },
  }, required: ['findings', 'standardsRead'] },
  verify: { type: 'object', properties: {
    verdicts: { type: 'array', items: { type: 'object', properties: {
      index: { type: 'number' }, refuted: { type: 'boolean' }, reason: { type: 'string' } }, required: ['index', 'refuted', 'reason'] } },
  }, required: ['verdicts'] },
  judge: { type: 'object', properties: {
    rulings: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string' }, ruling: { type: 'string', enum: ['fix-now', 'defer', 'reject'] }, reason: { type: 'string' } },
      required: ['key', 'ruling', 'reason'] } },
  }, required: ['rulings'] },
  fixverify: { type: 'object', properties: {
    allResolved: { type: 'boolean' }, unresolved: { type: 'array', items: { type: 'string' } }, regressions: { type: 'array', items: { type: 'string' } },
  }, required: ['allResolved', 'unresolved', 'regressions'] },
  ladder: { type: 'object', properties: {
    testExit: { type: 'number' }, lintExit: { type: 'number' }, testSummary: { type: 'string' }, failing: { type: 'array', items: { type: 'string' } },
    testLog: { type: 'string' }, lintLog: { type: 'string' },
  }, required: ['testExit', 'lintExit', 'testSummary', 'failing', 'testLog', 'lintLog'] },
  accept: { type: 'object', properties: {
    accepted: { type: 'boolean' },
    criteria: { type: 'array', items: { type: 'object', properties: {
      atom: { type: 'string' }, criterion: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' } },
      required: ['atom', 'criterion', 'met', 'evidence'] } },
    gaps: { type: 'array', items: { type: 'string' } },
  }, required: ['accepted', 'criteria', 'gaps'] },
  land: { type: 'object', properties: {
    sha: { type: 'string' }, committedFiles: { type: 'array', items: { type: 'string' } },
  }, required: ['sha', 'committedFiles'] },
}

const results = []

phase('Baseline')
const base = await agent(`You are a "run this" agent. Make no judgement; run these and report.
${GUARD}
1. git -C ${ROOT} rev-parse --abbrev-ref HEAD  (must print ${BRANCH})
2. git -C ${ROOT} status --porcelain --untracked-files=all > ${LOGS_T}/baseline-status.txt 2>&1   (create ${LOGS_ABS} first with the Write tool by writing ${LOGS_ABS}/.keep if needed)
3. Read ${LOGS_ABS}/baseline-status.txt and return every path it lists.`,
  { label: 'baseline', phase: 'Baseline', ...RUNNER, schema: { type: 'object', properties: {
    branch: { type: 'string' }, preexisting: { type: 'array', items: { type: 'string' } } }, required: ['branch', 'preexisting'] } })
if (!base || base.branch !== BRANCH) throw new Error(`Baseline: not on ${BRANCH} (${base && base.branch})`)
const PREEXISTING = base.preexisting
log(`Baseline: ${PREEXISTING.length} pre-existing dirty or untracked paths will be left alone`)

for (const ID of cfg.increments) {
  const L = (s) => `${ID}:${s}`
  const stop = (reason, extra) => { results.push({ id: ID, landed: false, reason, ...(extra || {}) }); log(`${ID} STOPPED: ${reason}`) }

  const row = await agent(`${READ_ROW.replace(/<ID>/g, ID)}\n${GUARD}\nReturn the increment's id, status, title (or the single member atom's title if the increment has none), member atom ids, the status of every increment in its dependsOn, and the total number of acceptance criteria across its members.`,
    { label: L('row'), phase: 'Baseline', ...RUNNER, schema: S.row })
  if (!row) { stop('could not read the backlog row'); break }
  if (row.status !== 'todo') { stop(`status is ${row.status}, not todo`); continue }
  const unmet = row.depStatuses.filter(d => d.status !== 'done')
  if (unmet.length) { stop(`dependencies not done: ${unmet.map(d => d.id + '=' + d.status).join(', ')}`); break }

  phase('Plan')
  const PLAN_FILE = `${PLANS_ABS}/${ID}.md`
  const planPrompt = (objections) => `You are the PLANNER for increment ${ID} of Sam's requirements-pipeline programme.
${READ_ROW.replace(/<ID>/g, ID)}
${GUARD}${STANDARDS}
The HOW lives in the programme's design, which is the knowledge source for this programme: ${DESIGN_ABS} (large: grep -n for the sections, commands and atom ids this increment needs, then Read those ranges). Sam's hard requirements R1-R8: ${REQS_ABS}. Read the live code you will change; plan against the tree as it is now, not as the design imagined it. If the design and the live code disagree, the live code is the fact and you record the decision.
Write the plan to ${PLAN_FILE} with these sections:
0 Decisions (every choice the atoms leave open, made and recorded with rejected alternatives; never leave a fork for the implementer)
1 Criteria map (every acceptance criterion of every member atom, quoted, and how the change will meet it and how it will be proven)
2 Changes (files to create, edit, move or delete, with what changes in each)
3 Tests (the vitest cases on input and output that prove each behaviour)
4 Invariants to prove (runnable commands that obey the guard rails, with the expected output)
5 Out of scope (what this increment deliberately does not do, naming the later increment that does)
Never plan lifecycle steps (commits, pushes, branches): the workflow owns them.
If the increment cannot be built as specified, set ok=false and give the refusal.
${objections ? `A plan auditor objected to your previous plan at ${PLAN_FILE}. Revise the plan to resolve every objection, or record in Decisions why an objection is wrong: ${JSON.stringify(objections)}` : ''}
Return the plan summary.`
  let plan = await agent(planPrompt(null), { label: L('plan'), phase: 'Plan', ...THINK, schema: S.plan })
  if (!plan || !plan.ok) { stop(`plan refused: ${plan ? plan.refusal : 'planner died'}`); break }

  const auditPrompt = `You are the PLAN AUDITOR for ${ID}. You did not write the plan.
${READ_ROW.replace(/<ID>/g, ID)}
${GUARD}
Derive the requirement YOURSELF from the backlog row and its atoms (never from the plan's restatement of them). Then read the plan ${PLAN_FILE} and check:
(a) every acceptance criterion of every member atom is covered and will be proven;
(b) nothing is built that no atom asks for, unless the design requires it for this increment and the plan's Decisions say so;
(c) R1-R8 in ${REQS_ABS} hold, especially: the backlog stays requirement-shaped (R1), anything executor-specific stays out of the backlog (R5), full-stack slices (R7), and nothing is chosen for build cost (R8);
(d) tim rails and the guard rails are honoured;
(e) the invariants are runnable under the guard rails.
Classify every point you raise.
- BLOCKING (goes in objections, and fails the audit): a false premise the plan's scope or decisions rest on; an acceptance criterion not covered or not proven; something built that no atom asks for; a breach of R1-R8, the tim rails or the guard rails; a design deviation not justified on merit.
- NOTE (goes in notes, passes the audit): a flaw the implementer can correct while executing, such as an imprecise invariant command, a missing edge-case test, or a naming improvement. Notes are handed to the implementer, who must address them.
Be concrete. pass=true exactly when objections is empty.`
  let audit = await agent(auditPrompt, { label: L('plan-audit'), phase: 'Plan', ...THINK, schema: S.audit })
  let planRefused = false
  for (let round = 2; audit && !audit.pass && round <= 4; round++) {
    plan = await agent(planPrompt(audit.objections), { label: L(`plan-revise-${round}`), phase: 'Plan', ...THINK, schema: S.plan })
    if (!plan || !plan.ok) { planRefused = true; break }
    audit = await agent(auditPrompt, { label: L(`plan-audit-${round}`), phase: 'Plan', ...THINK, schema: S.audit })
  }
  if (planRefused) { stop(`plan refused on revision: ${plan ? plan.refusal : 'planner died'}`); break }
  if (!audit || !audit.pass) { stop(`plan audit failed after 4 rounds: ${audit ? audit.objections.join(' | ') : 'auditor died'}`); break }

  phase('Implement')
  const impl = await agent(`You are the IMPLEMENTER for ${ID}. Execute the plan at ${PLAN_FILE} and nothing else. Where the plan is silent, choose what best meets the atoms and say so in your notes.
The plan auditor's notes, which you must address while implementing: ${JSON.stringify(audit.notes || [])}
${GUARD}${STANDARDS}
Write the tests the plan names. Run tim's tests to ${LOGS_T}/${ID}-implement-test.log and lint to ${LOGS_T}/${ID}-implement-lint.log if you changed anything under tim/, and read each log once. Fix your own reds before returning. Do not commit or stage.
Return every file you created, edited, moved or deleted (workspace-relative), whether the tests are green, and the log paths.`,
    { label: L('implement'), phase: 'Implement', ...DOER, schema: S.impl })
  if (!impl || !impl.done) { stop(`implement failed: ${impl ? impl.notes : 'implementer died'}`); break }

  const manifestPrompt = `You are a "run this" agent. Make no judgement.
${GUARD}
Run: git -C ${ROOT} status --porcelain --untracked-files=all > ${LOGS_T}/${ID}-status.txt 2>&1 ; then Read ${LOGS_ABS}/${ID}-status.txt.
Pre-existing paths to IGNORE (they belong to other work): ${JSON.stringify(PREEXISTING)}
The plan names these paths: ${JSON.stringify(plan.files)}
Also IGNORE everything under ${P}/build/ (plans and logs; the land step handles the plan file).
Return in "files" every path in the status output that is not pre-existing and not ignored (a directory entry counts as every file under it; list the files with find if needed). Return in "unexpected" the ones that are not under any path the plan names.`
  let manifest = await agent(manifestPrompt, { label: L('manifest'), phase: 'Implement', ...RUNNER, schema: S.manifest })
  if (!manifest || !manifest.files.length) { stop('manifest found no changed files'); break }
  if (manifest.unexpected.length) log(`${ID}: files changed outside the plan: ${manifest.unexpected.join(', ')}`)

  phase('Review')
  const reviewFile = (f) => [
    () => agent(`You are a STYLE REVIEWER for one file: ${f} (increment ${ID}).
Follow the workspace code-style skill as its owner wrote it, reading it LIVE now: first ${SK}/code-style/SKILL.md (to learn its method, its language-to-bundle routing and its severity rules), then ${SK}/code-style/references/STYLE_FILE_REVIEWER.md (your persona). Use the skill's own routing to decide which best-practice bundle applies to this file type and read that bundle. If the skill routes no bundle for this file type, review it against the GDS plain-English rules in ${ROOT_ABS}/docs/best-practices/gds/ for prose files, or return no findings.
${GUARD}${STANDARDS}
Review only the lines this increment changed: git -C ${ROOT} diff HEAD -- ${f} (or, for an untracked new file, the whole file). Ignore the persona's steps about writing review files, posting to PRs, committing or marking outcomes: return findings instead. List every standards file you actually read.`,
      { label: L(`style:${f}`), phase: 'Review', model: 'sonnet', schema: S.findings }),
    () => agent(`You are a CODE REVIEWER for one file: ${f} (increment ${ID}).
Follow the workspace review skill as its owner wrote it, reading it LIVE now: first ${SK}/review/SKILL.md (its method, severity rules and best-practice routing), then ${SK}/review/references/FILE_REVIEWER.md (your persona), then the best-practice files the skill routes this file type to.
${GUARD}${STANDARDS}
Review the change: git -C ${ROOT} diff HEAD -- ${f} (or the whole file if untracked), in the context of the whole file. Judge correctness, error handling, security, test coverage and the tim rails. Also judge it against the requirement: ${READ_ROW.replace(/<ID>/g, ID)}
Ignore the persona's steps about writing review files, posting or committing: return findings instead. List every standards file you actually read.`,
      { label: L(`code:${f}`), phase: 'Review', model: 'sonnet', schema: S.findings }),
  ]
  const perFile = await parallel(manifest.files.flatMap(f => reviewFile(f)))
  const consistency = await agent(`You are the CONSISTENCY REVIEWER for increment ${ID}. Follow ${SK}/review/SKILL.md and ${SK}/review/references/CONSISTENCY_REVIEWER.md, read LIVE now.
${GUARD}${STANDARDS}
Read the whole change together: every file in ${JSON.stringify(manifest.files)} (git -C ${ROOT} diff HEAD -- <file>, or the whole file if untracked). Check the contracts between the parts (command signatures against their callers, schemas against their readers, docs and skills against the code), naming against the design ${DESIGN_ABS}, and the plan's invariants in ${PLAN_FILE}: run each one that obeys the guard rails and report any that fail. Ignore the persona's steps about writing files or posting: return findings. List every standards file you read.`,
    { label: L('consistency'), phase: 'Review', ...THINK, schema: S.findings })
  const reviewSets = [...perFile, consistency]
  const deadReviewers = reviewSets.filter(r => !r).length
  if (deadReviewers) { stop(`${deadReviewers} reviewer(s) died; a dead reviewer never reads as approval`); break }
  const allFindings = reviewSets.flatMap(r => r.findings)
  log(`${ID}: ${allFindings.length} findings from ${reviewSets.length} reviewers`)

  phase('Verify')
  const byFile = {}
  allFindings.forEach((f, i) => { (byFile[f.file] = byFile[f.file] || []).push({ index: i, ...f }) })
  const verifyResults = await parallel(Object.entries(byFile).map(([file, fs]) => () => agent(`You are an ADVERSARIAL VERIFIER. Try to REFUTE each finding about ${file}. Default to refuted=true unless the evidence holds when you check the actual code yourself. Do not invent corrections to seem useful.
${GUARD}
Findings (keep each index): ${JSON.stringify(fs)}`, { label: L(`verify:${file}`), phase: 'Verify', model: 'sonnet', schema: S.verify })))
  const verdicts = verifyResults.filter(Boolean).flatMap(v => v.verdicts)
  const deadVerifiers = verifyResults.filter(v => !v).length
  if (deadVerifiers) log(`${ID}: ${deadVerifiers} verifier(s) died; their findings are kept as unrefuted`)
  const refuted = new Set(verdicts.filter(v => v.refuted).map(v => v.index))
  const surviving = allFindings.map((f, i) => ({ key: `F${i}`, ...f })).filter((f, i) => !refuted.has(i))
  log(`${ID}: ${surviving.length} findings survive verification`)

  let judged = { rulings: [] }
  let fixNow = []
  if (surviving.length) {
    phase('Judge')
    judged = await agent(`You are the JUDGE for increment ${ID}. Rule each surviving finding fix-now, defer or reject, without asking anyone.
fix-now: a real defect or standards breach in this change. defer: real but belongs to a later increment (name it). reject: wrong, a matter of taste the standards do not require, or out of scope.
${READ_ROW.replace(/<ID>/g, ID)}
Hard requirements: ${REQS_ABS}. Plan: ${PLAN_FILE}.
${GUARD}
Findings: ${JSON.stringify(surviving)}`, { label: L('judge'), phase: 'Judge', ...THINK, schema: S.judge })
    if (!judged) { stop('judge died; an unjudged finding never reads as approval'); break }
    const fixKeys = new Set(judged.rulings.filter(r => r.ruling === 'fix-now').map(r => r.key))
    fixNow = surviving.filter(f => fixKeys.has(f.key))
  }

  if (fixNow.length) {
    phase('Fix')
    const fix = await agent(`You are the FIXER for ${ID}. Apply exactly these fix-now findings, following ${SK}/review/references/REVIEW_ITEM_FIXER.md and ${SK}/code-style/references/STYLE_IMPLEMENTOR.md for method (read live). Ignore their commit and mark-outcome steps.
${GUARD}${STANDARDS}
Findings: ${JSON.stringify(fixNow)}
Re-run tim's tests to ${LOGS_T}/${ID}-fix-test.log and lint to ${LOGS_T}/${ID}-fix-lint.log if tim changed, reading each once. Do not commit.`,
      { label: L('fix'), phase: 'Fix', ...DOER, schema: S.impl })
    if (!fix || !fix.done) { stop(`fix failed: ${fix ? fix.notes : 'fixer died'}`); break }
    const fv = await agent(`You are the FIX VERIFIER for ${ID}. You did not make the fixes. For each finding, check the current code resolves it, and check the fixes introduced no regression.
${GUARD}
Findings that were to be fixed: ${JSON.stringify(fixNow)}`, { label: L('fix-verify'), phase: 'Fix', model: 'sonnet', schema: S.fixverify })
    if (!fv) { stop('fix verifier died'); break }
    if (!fv.allResolved || fv.regressions.length) {
      const fix2 = await agent(`You are the FIXER for ${ID}, round 2. Resolve these: unresolved ${JSON.stringify(fv.unresolved)}; regressions ${JSON.stringify(fv.regressions)}.
${GUARD}${STANDARDS}`, { label: L('fix-2'), phase: 'Fix', ...DOER, schema: S.impl })
      if (!fix2 || !fix2.done) { stop('fix round 2 failed'); break }
    }
    manifest = await agent(manifestPrompt, { label: L('manifest-2'), phase: 'Fix', ...RUNNER, schema: S.manifest })
  }

  phase('Ladder')
  const ladderPrompt = (n) => `You are a "run this" agent. Make no judgement.
${GUARD}
1. npm --prefix ${ROOT}/tim test > ${LOGS_T}/${ID}-ladder${n}-test.log 2>&1
2. npm --prefix ${ROOT}/tim run lint > ${LOGS_T}/${ID}-ladder${n}-lint.log 2>&1
Record each command's exit code. Read each log once. Return the exit codes, the test summary line(s), and the names of failing tests or lint errors.`
  let ladder = await agent(ladderPrompt(1), { label: L('ladder'), phase: 'Ladder', ...RUNNER, schema: S.ladder })
  let repairs = 0
  while (ladder && (ladder.testExit !== 0 || ladder.lintExit !== 0) && repairs < 2) {
    repairs++
    const rep = await agent(`You are the LADDER REPAIRER for ${ID}, round ${repairs}. The ladder is red: ${JSON.stringify(ladder)}. Read the logs ${ladder.testLog} and ${ladder.lintLog} (absolute paths under ${LOGS_ABS}). Fix the cause in this increment's change. A failure is never "pre-existing" or "unrelated": the baseline was green (109 files, 1215 tests, lint clean) before this programme's first increment.
${GUARD}${STANDARDS}`, { label: L(`repair-${repairs}`), phase: 'Ladder', ...DOER, schema: S.impl })
    if (!rep) break
    ladder = await agent(ladderPrompt(repairs + 1), { label: L(`ladder-${repairs + 1}`), phase: 'Ladder', ...RUNNER, schema: S.ladder })
  }
  if (!ladder || ladder.testExit !== 0 || ladder.lintExit !== 0) { stop(`ladder red: ${ladder ? ladder.failing.join(', ') : 'runner died'}`); break }

  phase('Acceptance')
  const acceptPrompt = `You are the ACCEPTANCE CHECKER for ${ID}. You have never seen the plan and must not read ${PLANS_ABS}.
${READ_ROW.replace(/<ID>/g, ID)}
${GUARD}
Judge the FINAL change (every file in ${JSON.stringify(manifest ? manifest.files : [])}: git -C ${ROOT} diff HEAD -- <file>, or the whole file if untracked) against every acceptance criterion of every member atom, one by one, with evidence you checked yourself (read code, read tests; you may run tim commands through npm --prefix ${ROOT}/tim run tim -- <args> to observe behaviour, output to a file under ${LOGS_T}/). The ladder is green: ${JSON.stringify(ladder)}.
accepted=true only if every criterion is met.`
  let accept = await agent(acceptPrompt, { label: L('acceptance'), phase: 'Acceptance', ...THINK, schema: S.accept })
  if (accept && !accept.accepted) {
    const rep = await agent(`You are the ACCEPTANCE REPAIRER for ${ID}. These acceptance criteria are not met: ${JSON.stringify(accept.criteria.filter(c => !c.met))}; gaps: ${JSON.stringify(accept.gaps)}. Close them in the change, with tests.
${GUARD}${STANDARDS}
Then run tim's tests to ${LOGS_T}/${ID}-accept-repair-test.log and lint to ${LOGS_T}/${ID}-accept-repair-lint.log, reading each once.`, { label: L('accept-repair'), phase: 'Acceptance', ...DOER, schema: S.impl })
    manifest = await agent(manifestPrompt, { label: L('manifest-3'), phase: 'Acceptance', ...RUNNER, schema: S.manifest })
    ladder = await agent(ladderPrompt('A'), { label: L('ladder-A'), phase: 'Acceptance', ...RUNNER, schema: S.ladder })
    if (!rep || !ladder || ladder.testExit !== 0 || ladder.lintExit !== 0) { stop('acceptance repair left the ladder red'); break }
    accept = await agent(acceptPrompt, { label: L('acceptance-2'), phase: 'Acceptance', ...THINK, schema: S.accept })
  }
  if (!accept || !accept.accepted) { stop(`not accepted: ${accept ? accept.gaps.join(' | ') : 'checker died'}`, { acceptance: accept }); break }

  phase('Land')
  const landed = await agent(`You are a "run this" agent that lands increment ${ID}. Make no judgement.
${GUARD}
1. Write the commit message to ${LOGS_ABS}/${ID}-commit-msg.txt with the Write tool:
   line 1: ${plan.commitSubject}
   blank line, then one line per behaviour change: ${JSON.stringify(plan.behaviourChanges)}
   blank line, then: Backlog-Increment: requirements-pipeline/${ID}
   blank line, then: ${cfg.trailer}
2. Stage each of these files by name, one git -C ${ROOT} add -- <path> call each (for a deleted file use git -C ${ROOT} rm --cached -- <path> only if add refuses): ${JSON.stringify(manifest.files)}
   Also stage the plan file ${P}/build/plans/${ID}.md.
3. git -C ${ROOT} commit -F ${LOGS_T}/${ID}-commit-msg.txt
4. git -C ${ROOT} rev-parse HEAD
Return the sha and the files committed.`, { label: L('land'), phase: 'Land', ...RUNNER, schema: S.land })
  if (!landed || !landed.sha) { stop('land failed'); break }

  const deferred = (judged.rulings || []).filter(r => r.ruling === 'defer').map(r => ({ ...r, finding: surviving.find(f => f.key === r.key) }))
  results.push({ id: ID, landed: true, sha: landed.sha, findings: allFindings.length, surviving: surviving.length, fixed: fixNow.length, deferred, criteria: accept.criteria.length, repairs })
  log(`${ID} landed at ${landed.sha}: ${allFindings.length} findings, ${fixNow.length} fixed, ${deferred.length} deferred`)
}

return { results }
