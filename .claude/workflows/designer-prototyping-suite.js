export const meta = {
  name: 'designer-prototyping-suite',
  description: 'Analyse how the GB-notification-service Heroku prototype is changed (recency-weighted), then plan, build and trial a designer-focused skill/doc/workflow suite for trade-imports-plants-prototype',
  phases: [
    { title: 'Understand', detail: 'Fable readers: commit batches, anatomy, usage, plants-prototype mappers' },
    { title: 'Synthesise', detail: 'recency-weighted change taxonomy + gap map, then completeness critic' },
    { title: 'Design', detail: 'three independent suite designs, judged and merged into one plan' },
    { title: 'Implement', detail: 'one builder per deliverable, then integration + verify + commit' },
    { title: 'Trial', detail: 'designer-persona agents re-enact real prototype changes using only the suite' },
    { title: 'Fix', detail: 'apply trial findings, re-trial failures' },
    { title: 'Review', detail: 'adversarial review, fix, handover' },
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

const WORKFLOW_NAME = meta.name
const REQUIRED_KEYS = ['batches', 'branch']
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)

const WS = '~/git/defra/trade-imports-workspace'
const WS_ABS = '/Users/samfarrington/git/defra/trade-imports-workspace'
const OLD = WS + '/workareas/designer-prototyping/GB-notification-service'
const OLD_ABS = WS_ABS + '/workareas/designer-prototyping/GB-notification-service'
const PROTO = WS + '/repos/trade-imports-plants-prototype'
const PROTO_ABS = WS_ABS + '/repos/trade-imports-plants-prototype'
const OUT = WS + '/workareas/shared/designer-prototyping'
const OUT_ABS = WS_ABS + '/workareas/shared/designer-prototyping'
const BRANCH = config.branch
const BATCHES = config.batches

const RAILS = `GUARD RAILS (read first — the user is away for hours; every permission prompt stalls the run):
- Bash paths ALWAYS use the tilde form (${WS}/...). Read/Write/Edit tools use the absolute form (${WS_ABS}/...). They name the same directories. Never paste an absolute /Users path into Bash.
- One command per Bash call. No &&, ;, |, no bare cd, no env-var prefixes (FOO=1 cmd), no node/python/curl/awk/sed, no npx, no direct node_modules/.bin binaries.
- Do NOT use the Grep or Glob tools — use Bash \`grep -rn\` (unpiped) and \`find ${WS}/...\`. Read files with the Read tool.
- git: always \`git -C <tilde path> ...\`. npm scripts: always \`npm --prefix ${PROTO} run <script>\`. Never npm install / npm ci.
- To capture long output, redirect to a file under ${OUT}/logs/ and Read it once.
- Never edit .claude/settings*.json or .claude/hooks/** (a guard blocks it). If a settings change is needed, write the proposed JSON to ${OUT_ABS}/settings-proposal.json instead.
- Never push, never open PRs, never touch other repos under repos/ except ${PROTO}.`

const OLD_CTX = `THE OLD PROTOTYPE: GB-notification-service (defra-design), a GOV.UK Prototype Kit app deployed to Heroku, for the trade-imports import-notification service with a focus on live animals and common capabilities (dashboard, address book, transporters, notification hub). A read-only clone is at ${OLD} (Bash) / ${OLD_ABS} (Read). Nearly all commits are by one designer (MrMister-88); a few July commits by samfarrington added a Playwright "journey-demo". "Recent" means since 2026-06-27 (last 3 months) and matters MUCH more than older history. Useful: \`git -C ${OLD} show <hash> --stat\`, \`git -C ${OLD} show <hash> -- app\` (skip package-lock.json and node_modules).`

const NEW_CTX = `THE NEW PROTOTYPE: trade-imports-plants-prototype at ${PROTO} (Bash) / ${PROTO_ABS} (Read), on branch ${BRANCH}. It is a copy of the REAL plants frontend (upstream remote = trade-imports-plants-frontend) that runs without a backend: data is stubbed (isStubDataMode), sign-in is the dev stub locally (npm run dev on :3103) and the Defra ID stub when deployed. It hosts several "sets" (src/server/app/sets/<set-id>/, chooser at /, \`npm run new:set -- <id> [--from high-risk-plants]\`). A weekly robot (\`npm run sync:upstream\`, driven by overrides.json with deleted/ours/patched lists) merges upstream into it — anything not in overrides.json "ours" belongs upstream and gets overwritten or conflicts. Read PROTOTYPE.md (the designer guide), overrides.json, src/server/app/docs/*.md and src/server/app/sets/high-risk-plants/docs/*.md (recipe docs: add-a-field, add-a-page, add-a-section, add-a-collection, journey-flow-and-gates, obligation-model...). The THEORY being tested: with agentic skills/workflows, designers can make higher-fidelity prototypes on this closer-to-real codebase (real GOV.UK components, real flow engine, stub services already provided for FIT testing) instead of the traditional Prototype Kit/Heroku approach.`

// ---------- schemas ----------
const BATCH_SCHEMA = {
  type: 'object',
  properties: {
    changes: { type: 'array', items: { type: 'object', properties: {
      commit: { type: 'string' }, date: { type: 'string' },
      category: { type: 'string', description: 'e.g. copy/content, new page, new journey version/release snapshot, flow/branching, validation/error states, dashboard/listing, address book/reusable entity, data/session seeding, component/styling, research/testing variant, tooling/demo, housekeeping' },
      area: { type: 'string', description: 'product area touched, e.g. dashboard, address book, transporter, reason for import' },
      summary: { type: 'string' },
      designer_intent: { type: 'string', description: 'what the designer was trying to achieve / learn' },
      size: { type: 'string', enum: ['tiny', 'small', 'medium', 'large'] },
      kit_mechanics: { type: 'string', description: 'Prototype Kit mechanisms used: routes.js branching, session data, copied view folders, partials, filters, JS, static images, etc.' },
    }, required: ['commit', 'category', 'area', 'summary', 'designer_intent', 'size', 'kit_mechanics'] } },
    patterns: { type: 'array', items: { type: 'string' } },
    notes_file: { type: 'string' },
  },
  required: ['changes', 'patterns', 'notes_file'],
}
const NOTES_SCHEMA = {
  type: 'object',
  properties: { findings: { type: 'array', items: { type: 'string' } }, notes_file: { type: 'string' } },
  required: ['findings', 'notes_file'],
}
const TAXONOMY_SCHEMA = {
  type: 'object',
  properties: {
    change_types: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, recent_count: { type: 'number' }, older_count: { type: 'number' },
      example_commits: { type: 'array', items: { type: 'string' } },
      how_in_old: { type: 'string' }, how_in_plants: { type: 'string' },
      plants_difficulty: { type: 'string', enum: ['easy', 'moderate', 'hard', 'blocked'] },
      gaps: { type: 'string' },
    }, required: ['name', 'recent_count', 'older_count', 'example_commits', 'how_in_old', 'how_in_plants', 'plants_difficulty', 'gaps'] } },
    usage_modes: { type: 'array', items: { type: 'string' } },
    key_insights: { type: 'array', items: { type: 'string' } },
    analysis_file: { type: 'string' },
  },
  required: ['change_types', 'usage_modes', 'key_insights', 'analysis_file'],
}
const DELIVERABLE = { type: 'object', properties: {
  id: { type: 'string', description: 'kebab-case' },
  kind: { type: 'string', enum: ['skill', 'doc', 'workflow', 'script', 'integration'] },
  title: { type: 'string' },
  owns_paths: { type: 'array', items: { type: 'string' }, description: 'repo-relative paths in the prototype this deliverable creates/edits; disjoint from every other deliverable' },
  purpose: { type: 'string' },
  spec: { type: 'string', description: 'detailed build spec: triggers, steps, guard rails, what it must say/do' },
  acceptance: { type: 'array', items: { type: 'string' } },
}, required: ['id', 'kind', 'title', 'owns_paths', 'purpose', 'spec', 'acceptance'] }
const TRIAL = { type: 'object', properties: {
  id: { type: 'string' }, scenario: { type: 'string', description: 'a designer request in the designer\'s own words' },
  based_on_commits: { type: 'array', items: { type: 'string' } },
  expected_deliverables: { type: 'array', items: { type: 'string' } },
  success_criteria: { type: 'array', items: { type: 'string' } },
}, required: ['id', 'scenario', 'based_on_commits', 'expected_deliverables', 'success_criteria'] }
const PROPOSAL_SCHEMA = { type: 'object', properties: {
  deliverables: { type: 'array', items: DELIVERABLE }, rationale: { type: 'string' }, proposal_file: { type: 'string' },
}, required: ['deliverables', 'rationale', 'proposal_file'] }
const PLAN_SCHEMA = { type: 'object', properties: {
  deliverables: { type: 'array', items: DELIVERABLE },
  trials: { type: 'array', items: TRIAL },
  plan_file: { type: 'string' },
}, required: ['deliverables', 'trials', 'plan_file'] }
const BUILD_SCHEMA = { type: 'object', properties: {
  files_written: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' }, open_issues: { type: 'array', items: { type: 'string' } },
}, required: ['files_written', 'notes', 'open_issues'] }
const VERIFY_SCHEMA = { type: 'object', properties: {
  lint: { type: 'string', enum: ['pass', 'fail'] }, test: { type: 'string', enum: ['pass', 'fail'] }, format: { type: 'string', enum: ['pass', 'fail'] },
  committed: { type: 'boolean' }, commit_sha: { type: 'string' }, notes: { type: 'string' },
}, required: ['lint', 'test', 'format', 'committed', 'notes'] }
const TRIAL_RESULT = { type: 'object', properties: {
  outcome: { type: 'string', enum: ['success', 'partial', 'failed'] },
  change_works: { type: 'boolean', description: 'the requested prototype change renders and behaves as asked, verified by running it' },
  friction: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, deliverable: { type: 'string' }, problem: { type: 'string' }, suggested_fix: { type: 'string' },
  }, required: ['severity', 'deliverable', 'problem', 'suggested_fix'] } },
  trial_branch: { type: 'string' }, report_file: { type: 'string' },
}, required: ['outcome', 'change_works', 'friction', 'trial_branch', 'report_file'] }
const REVIEW_SCHEMA = { type: 'object', properties: {
  findings: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['high', 'medium', 'low'] }, file: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
  }, required: ['severity', 'file', 'problem', 'fix'] } },
}, required: ['findings'] }

// ---------- Phase 1: Understand ----------
phase('Understand')
log('Reading ' + BATCHES.recent.length + ' recent commit batches + older history + anatomy/usage + 5 plants-prototype mappers')

const batchPrompt = (b, older) => `${RAILS}

${OLD_CTX}

YOUR JOB: analyse commit batch ${b.id} (${b.window}) of the old prototype: ${b.commits.join(', ')}.
${older ? 'These are OLDER commits (before the 3-month window) — lower weight. Two of them vendor thousands of files (initial kit import, node_modules churn): read --stat only for those and summarise in one line. Focus on what the designer changed in app/.' : 'These are RECENT commits — be thorough. For each commit read the --stat and the actual app/ diff (views, routes.js, data, partials, assets). Large commits: read enough of the diff to understand every distinct change, not just the first file.'}
For every commit record what changed, what the designer was trying to achieve, how big it was, and which Prototype Kit mechanisms they leaned on (routes.js branching, session data/data/session-data-defaults, copying whole view folders to create versions like design-release-2 / design-release-2.1 / testing, partials, custom JS, images, etc.).
Also record cross-commit patterns you notice (e.g. "copies the dashboard into a new release folder then iterates copy", "fixes a bug in the same afternoon").
Write your detailed notes (markdown, with commit hashes and file paths) to ${OUT_ABS}/notes/${b.id}.md using the Write tool, and return the structured result.`

const OTHER_READERS = [
  { id: 'anatomy', model: 'fable', prompt: `${RAILS}\n\n${OLD_CTX}\n\nYOUR JOB: map the ANATOMY of the old prototype as it stands at HEAD: app/ layout, routes.js (size, how branching/validation is done, how versions are routed), app/data/session-data-defaults and other data files, views structure (top-level pages vs design-release-2, design-release-2.1, testing folders, partials per release), layouts, assets (sass, JS, images), index.html (the "start page"/version index), usage-data-config.json, package.json (kit version, plugins), journey-demo/ (Playwright walks + CI). Quantify: number of pages per version, lines of routes.js, how much is duplicated between versions. Explain how a designer creates a new version/release and how they present it. Write notes to ${OUT_ABS}/notes/anatomy.md and return findings.` },
  { id: 'usage', model: 'fable', prompt: `${RAILS}\n\n${OLD_CTX}\n\nYOUR JOB: work out HOW THE PROTOTYPE IS USED and by whom: user-research testing versions ("testing" folder, "testing version" commits), design releases (DR2, DR2.1) shown to stakeholders/devs, Heroku deploy (Procfile? env? password?), the journey-demo Playwright recordings (journey-demo/README.md, .github workflows), the index page as a menu of versions, commit cadence (bursts before research sessions? same-day fixes?), commit message quality, whether branches/PRs are used (git -C ${OLD} log --all --merges, branch list). Infer the designer's workflow and skill level with git/code. Also compare with what the workspace records about it: grep -rln "GB-notification\\|gb-notification\\|DESIGN RELEASE\\|design-release" ${WS}/docs ${WS}/workareas/shared --include=*.md (read the 3-5 most relevant hits, e.g. the DR1/DR2 parity specs — they show how the real frontend team consumes the prototype as a source of requirements). Write notes to ${OUT_ABS}/notes/usage.md and return findings.` },
  { id: 'plants-sets', model: 'fable', prompt: `${RAILS}\n\n${NEW_CTX}\n\nYOUR JOB: map the SET mechanism and SYNC SAFETY of the plants prototype from a designer's point of view: how sets are mounted (src/server/prototype-sets/**, sets-index), scripts/new-set (what it copies and renames, what --from high-risk-plants gives you and what is left to rename by hand), scripts/sync-upstream (what it overwrites, how conflicts/needs-person arise), overrides.json deleted/ours/patched semantics, which paths a designer can safely own. Crucially: if a designer edits the high-risk-plants set directly, what happens at the next weekly sync? What would a safe "design release" (a designer-owned copy of the journey that can diverge) look like? Is a set per design release viable (size, route prefixes, tests, seed data)? Try \`npm --prefix ${PROTO} run new:set -- --help\` only if it is harmless (read the script first; do NOT create a set). Write notes to ${OUT_ABS}/notes/plants-sets.md and return findings.` },
  { id: 'plants-pages', model: 'fable', prompt: `${RAILS}\n\n${NEW_CTX}\n\nYOUR JOB: map how the COMMON DESIGNER CHANGES are done in the plants prototype: changing copy (copy.en.js / copy.cy.js), changing a template (.njk, GOV.UK macros), adding a field, adding a page, reordering/branching flow (flow.js, gates/obligations), validation and error messages (validation.md), check-your-answers/summary rows, task list sections, dashboard/listing pages, confirmation pages. For each: which files, how many, what tests break/need updating, which recipe doc covers it, and how hard it is for someone who knows HTML/Nunjucks but not JS architecture. Note where the architecture (obligation model, engine, lint:arch dependency-cruiser) will trip a designer. Write notes to ${OUT_ABS}/notes/plants-pages.md and return findings.` },
  { id: 'plants-data', model: 'fable', prompt: `${RAILS}\n\n${NEW_CTX}\n\nYOUR JOB: map the STUB SERVICES and DATA a designer can lean on: stub records store, prototype seed (src/server/prototype-seed/**: how example notifications are made by walking the journey, the states they end in), reset from the chooser, address-book stub, countries/ports/reference-data stubs, commodity lookups, any stubbed upload/document services, what the dashboard lists. Where would a designer add a new example notification state, a new reference-data option, a new address-book entry, or fake a service that doesn't exist yet (e.g. a new dashboard filter, a transporter lookup)? Which of these seams are upstream-owned vs prototype-owned (check overrides.json)? Write notes to ${OUT_ABS}/notes/plants-data.md and return findings.` },
  { id: 'plants-verify', model: 'fable', prompt: `${RAILS}\n\n${NEW_CTX}\n\nYOUR JOB: map how a designer RUNS, CHECKS, SHOWS and SHIPS a change: npm run dev (port, hot reload for njk/copy/js), npm test / test:high-risk-plants (duration: time one run of \`npm --prefix ${PROTO} run test:high-risk-plants\` redirected to ${OUT}/logs/plants-verify-test.log), lint, format, fit (Playwright; fit/ folder; projects), capture:high-risk-plants (screenshots from traces — read the capture code and docs), husky pre-commit hook, CI workflows under .github/workflows (check-pull-request, publish), deployment to CDP. Which of these can a designer realistically run, which errors will they meet, and what a "show me my change" loop could look like (screenshots of the pages they changed, a walkthrough). Write notes to ${OUT_ABS}/notes/plants-verify.md and return findings.` },
  { id: 'reusable-assets', model: 'fable', prompt: `${RAILS}\n\n${NEW_CTX}\n\nYOUR JOB: inventory what already exists in the WORKSPACE that the designer suite could adapt (designers will only have the prototype repo, NOT the workspace, so anything reused must be copied/adapted into the prototype repo): ${WS}/.claude/skills/frontend-change (recipes-as-scripts, verification ladder), ${WS}/.claude/skills/journey-builder, ${WS}/.claude/skills/requirements-pipeline (read SKILL.md headers only), ${WS}/tim capture (grep -rn "capture" ${WS}/tim/src --include=*.js -l), ${WS}/docs/best-practices/gds/, and any workspace docs about the plants prototype (grep -rln "plants-prototype" ${WS}/docs ${WS}/workareas/shared). Also note Claude Code features useful to designers: project skills in .claude/skills/<name>/SKILL.md (frontmatter name/description), CLAUDE.md, .claude/workflows/*.js workflow scripts, slash commands. Recommend what to port and what to leave behind. Write notes to ${OUT_ABS}/notes/reusable-assets.md and return findings.` },
]

const understand = await parallel([
  ...BATCHES.recent.map(b => () => agent(batchPrompt(b, false), { label: 'batch:' + b.id, phase: 'Understand', schema: BATCH_SCHEMA, model: 'fable' })),
  () => agent(batchPrompt(BATCHES.older, true), { label: 'batch:older', phase: 'Understand', schema: BATCH_SCHEMA, model: 'fable' }),
  ...OTHER_READERS.map(r => () => agent(r.prompt, { label: 'read:' + r.id, phase: 'Understand', schema: NOTES_SCHEMA, model: r.model })),
])
const missing = understand.map((r, i) => r ? null : i).filter(i => i !== null)
if (missing.length) log('WARNING: ' + missing.length + ' understand agents returned nothing (indexes ' + missing.join(',') + ')')

// ---------- Phase 2: Synthesise ----------
phase('Synthesise')
const taxonomy = await agent(`${RAILS}

${OLD_CTX}

${NEW_CTX}

YOUR JOB: synthesise the understand-phase notes into ONE detailed, recency-weighted analysis. Read every file in ${OUT_ABS}/notes/ (Read tool; list them with \`find ${OUT}/notes -name '*.md'\`). Weight changes since 2026-06-27 heavily; older history is context only.
Produce ${OUT_ABS}/analysis.md (GDS plain English, for Sam — a senior engineer — and for designers) with:
1. How the old prototype is used (who, for what: research sessions, design releases, stakeholder demos, requirements source for the real frontend) and the designer's working rhythm.
2. A change taxonomy table: each type of change, count in last 3 months vs older, example commits, how it is done in the Prototype Kit, how the SAME change would be done in the plants prototype (files, recipe doc, tests), difficulty there, and the gap.
3. Where the plants prototype is already BETTER for a designer (fidelity, real components, real validation, stub data, seed states) and where it is WORSE (JS architecture, tests, sync ownership, no quick "copy the folder" versioning).
4. The sync-safety problem: where designer edits should live so the weekly upstream sync never clobbers them, and how a "design release"/research variant maps onto sets.
5. The top needs a designer suite must meet, ranked by how often the need occurred recently.
Return the structured taxonomy (analysis_file = the path you wrote).`, { label: 'synthesise', phase: 'Synthesise', schema: TAXONOMY_SCHEMA })

const critic = await agent(`${RAILS}

${OLD_CTX}

${NEW_CTX}

YOUR JOB: completeness critic. Read ${OUT_ABS}/analysis.md and the notes in ${OUT_ABS}/notes/. Then check against the source: pick the 8 largest recent commits (git -C ${OLD} log --since=2026-06-27 --shortstat --format='%h %ad %s' --date=short, redirected to ${OUT}/logs/critic-log.txt) and confirm the analysis accounts for each distinct kind of change they contain. Look for: change types missed or merged wrongly, claims about the plants prototype that are wrong (verify each one in ${PROTO}), designer needs missed (e.g. showing variants side by side, research-session resets, content review with Welsh, shareable links, screenshots for Mural/Figma, handing a change to the real frontend team). Append a section "## Critic addendum" to ${OUT_ABS}/analysis.md correcting and extending it (edit in place when a claim is simply wrong). Return findings.`, { label: 'critic', phase: 'Synthesise', schema: NOTES_SCHEMA })

// ---------- Phase 3: Design ----------
phase('Design')
const DESIGN_RULES = `DESIGN CONSTRAINTS:
- Audience: interaction/content designers who know HTML, Nunjucks and the GOV.UK Design System, use Claude Code, but are not JS architects and use git lightly. Everything they read is GDS plain English.
- Everything lives in the prototype repo (${PROTO}): skills at .claude/skills/<name>/SKILL.md (frontmatter: name, description with trigger phrases and NOT-for lines), optional references/ beside them, docs in a designer docs folder, optional .claude/workflows/*.js Claude Code workflow scripts, optional scripts/ + npm scripts. Designers do NOT have the trade-imports workspace, tim, or its tools — nothing may depend on them.
- Every new path must be listed under overrides.json "ours" (so the weekly sync never touches it). package.json is upstream-owned: adding npm scripts means adding package.json to "patched" with a why, or avoid it — decide and justify. .claude/settings.json cannot be edited by agents: any settings need goes into ${OUT_ABS}/settings-proposal.json for Sam.
- The suite must cover the real recent change types from the analysis in proportion to how often they occur, and must steer designers to sync-safe places for their edits (their own sets / design releases) rather than editing upstream-owned high-risk-plants files.
- Every skill must end with a verification step the designer can actually run (and see: screenshots/pages), and must say how to hand a change to the real plants-frontend team when it should become real.
- Include one deliverable of kind "integration" that owns the shared files: PROTOTYPE.md, a CLAUDE.md (or AGENTS.md) for the prototype repo that routes designer requests to the skills, overrides.json, package.json if touched. No other deliverable may list those paths. owns_paths must be disjoint across deliverables.
- Aim for 6–12 deliverables. Quality over count; luxurious, not spartan.`

const LENSES = [
  { id: 'designer-experience', brief: 'Design from the designer\'s day: the fastest possible "I want X on this page" → see it → show it loop, research-session variants, copy iteration, zero-jargon guidance.' },
  { id: 'sync-and-fidelity', brief: 'Design from sync safety and fidelity: design releases as owned sets, never clobbered by the weekly sync, leaning on the real flow engine and stub services so prototypes stay close to what the real service can build, with a clean path to hand changes to plants-frontend.' },
  { id: 'agentic-workflows', brief: 'Design from agent leverage: multi-step Claude Code workflows and skills that do the heavy lifting (e.g. "make a new design release from the current journey", "re-create this Prototype Kit page in the real components", "screenshot every page I changed", "prepare a hand-off for the dev team"), with strong guard rails so agents never break upstream-owned files.' },
]
const proposals = await parallel(LENSES.map(l => () => agent(`${RAILS}

${NEW_CTX}

Read ${OUT_ABS}/analysis.md (including the Critic addendum) and skim ${OUT_ABS}/notes/plants-*.md and reusable-assets.md.
Structured taxonomy from the analysis: ${JSON.stringify(taxonomy)}

${DESIGN_RULES}

YOUR LENS: ${l.brief}
Propose a complete designer suite. For every deliverable give a build-ready spec. Write the proposal to ${OUT_ABS}/design/proposal-${l.id}.md and return it structured.`, { label: 'propose:' + l.id, phase: 'Design', schema: PROPOSAL_SCHEMA })))

const plan = await agent(`${RAILS}

${NEW_CTX}

YOUR JOB: judge and merge. Read ${OUT_ABS}/analysis.md and the three proposals in ${OUT_ABS}/design/ (proposal-*.md). Score each against: coverage of the recent change types weighted by frequency, sync safety, designer usability, verifiability, feasibility in this codebase, and hand-off to the real team. Then write ONE final plan: take the strongest proposal as the spine and graft the best ideas from the others. Resolve conflicts explicitly.
${DESIGN_RULES}
Also define 6–8 TRIALS: realistic designer requests, each re-enacting a REAL recent old-prototype change (cite its commits) translated into the plants/high-risk-plants domain — e.g. a copy/content pass, a new dashboard layout, adding an address/transporter-style reusable entity page, validation/error-message changes, a new page in the flow with branching, creating a research-session variant/design release. Trials must together exercise every skill deliverable.
Write ${OUT_ABS}/plan.md (scores, choices, the deliverables with full specs, the trials) and return the structured plan.`, { label: 'judge+merge', phase: 'Design', schema: PLAN_SCHEMA })

log('Plan: ' + plan.deliverables.length + ' deliverables, ' + plan.trials.length + ' trials')

// ---------- Phase 4: Implement ----------
phase('Implement')
const buildPrompt = (d) => `${RAILS}

${NEW_CTX}

YOUR JOB: build deliverable "${d.id}" (${d.kind}: ${d.title}) in the prototype repo. You may create/edit ONLY these paths: ${JSON.stringify(d.owns_paths)} (plus new test files beside any script you write). Other builders are working on other paths concurrently — do not touch anything else, do not commit, do not run git add.
Purpose: ${d.purpose}
Spec: ${d.spec}
Acceptance: ${JSON.stringify(d.acceptance)}
Context: ${OUT_ABS}/plan.md (full plan — read the whole thing so your deliverable fits the suite and cross-references sibling deliverables by their exact names/paths), ${OUT_ABS}/analysis.md.
Rules: before writing any instruction, verify it against the real code in ${PROTO} (file paths, npm script names, function names, copy file shapes) — wrong guidance is the worst failure. Skills: SKILL.md with frontmatter (name, description with triggers + NOT-for), numbered steps, guard rails (never edit upstream-owned files unless handing off; check overrides.json), a verification step, a hand-off note. GDS plain English, short sentences, no jargon without a definition. Any script must be tested (vitest, beside the script, following the repo's test style) and you may run \`npm --prefix ${PROTO} run lint:js\` and the single test file via \`npm --prefix ${PROTO} run test:watch -- --run <relative test path>\` is NOT allowed (it has env prefix) — instead just write the test; the verify step runs the suite. Claude Code workflow scripts (.claude/workflows/*.js) must follow the Workflow script format: \`export const meta = {name, description, phases}\` pure literal, then agent()/parallel()/pipeline()/phase() — plain JS.
Return files written, notes, and open issues.`

const built = await parallel(plan.deliverables.filter(d => d.kind !== 'integration').map(d => () =>
  agent(buildPrompt(d), { label: 'build:' + d.id, phase: 'Implement', schema: BUILD_SCHEMA })))

const integ = plan.deliverables.find(d => d.kind === 'integration')
const integResult = await agent(`${buildPrompt(integ || { id: 'integration', kind: 'integration', title: 'Integration', owns_paths: ['PROTOTYPE.md', 'CLAUDE.md', 'overrides.json', 'package.json'], purpose: 'wire the suite in', spec: 'route designers to the skills; list every new path under overrides.json ours', acceptance: [] })}

EXTRA: the other builders have finished. Their reports: ${JSON.stringify(built.filter(Boolean))}
List every path they created under overrides.json "ours" (use globs per skill folder). Make PROTOTYPE.md and the repo CLAUDE.md route designers to each skill by the phrases a designer would actually say. Check cross-references between deliverables resolve (paths, skill names).`, { label: 'build:integration', phase: 'Implement', schema: BUILD_SCHEMA })

const verifyAndCommit = (msg, label, ph) => agent(`${RAILS}

${NEW_CTX}

YOUR JOB: verify and commit the working-tree changes on ${BRANCH} in ${PROTO}.
1. \`git -C ${PROTO} status --short\` and \`git -C ${PROTO} branch --show-current\` (must be ${BRANCH}; if not, switch to it — never lose changes; stop and report if that is impossible).
2. \`npm --prefix ${PROTO} run format\` then \`npm --prefix ${PROTO} run lint\` (redirect to ${OUT}/logs/${label}-lint.log and Read it) then \`npm --prefix ${PROTO} test\` (redirect to ${OUT}/logs/${label}-test.log). Also \`npm --prefix ${PROTO} run test:fit -- fit/sets-chooser.fit.spec.js\` if any set/chooser/routing code changed.
3. Fix every failure — they are yours, whether or not you think the suite caused them (never "pre-existing"). Keep fixes inside the suite's own files where possible; if an upstream-owned file must change, record why in overrides.json "patched".
4. \`git -C ${PROTO} add -A\` then commit with a conventional message: "${msg}" plus a short body listing what changed, ending with the line "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Never --no-verify. If the husky hook fails, fix and commit again.
Return the outcome.`, { label, phase: ph, schema: VERIFY_SCHEMA })

const v1 = await verifyAndCommit('feat: add the designer prototyping suite', 'verify-build', 'Implement')
log('Build verify: lint ' + v1.lint + ', test ' + v1.test + ', committed ' + v1.committed)

// ---------- Phase 5/6: Trial + Fix loop ----------
const runTrial = (t, round) => agent(`${RAILS}

YOU ARE A DESIGNER on the high-risk plants team, trying out the new prototype. You know HTML, Nunjucks and the GOV.UK Design System. You do NOT know the codebase's JS architecture and you have NO access to the trade-imports workspace, its docs, skills or tools — ONLY the prototype repo at ${PROTO} (Bash) / ${PROTO_ABS} (Read/Edit/Write). Do not read anything under ${WS}/docs, ${WS}/.claude or ${WS}/workareas except to write your report.
Start the way a designer would: read ${PROTO_ABS}/CLAUDE.md and ${PROTO_ABS}/PROTOTYPE.md, find the skill(s) under ${PROTO_ABS}/.claude/skills/ that match your request, and follow them LITERALLY, step by step (as if Claude Code had loaded them). Where a skill is wrong, vague or missing a step, note it as friction — then do what a sensible person would to get unstuck, and note that too.

YOUR REQUEST (trial ${t.id}, round ${round}): "${t.scenario}"
(Grounded in old-prototype commits ${t.based_on_commits.join(', ')} — you may read them via git -C ${OLD} show <hash> -- app if the request needs the original design.)
Success criteria: ${JSON.stringify(t.success_criteria)}

SETUP: \`git -C ${PROTO} switch -c ${BRANCH}-trial-${t.id}-r${round} ${BRANCH}\` (if it exists, add a suffix). Do all your work on that branch.
VERIFY for real: follow the skill's verification step. If that needs the dev server, start it with the Bash tool's run_in_background (\`npm --prefix ${PROTO} run dev\`), and stop it when done (KillShell/TaskStop on that background task). Screenshots/pages the skill produces: record their paths.
FINISH: commit your work on the trial branch (\`git -C ${PROTO} add -A\`, then \`git -C ${PROTO} commit -m "trial(${t.id}): <what>"\` — if the pre-commit hook fails, record that as friction, fix it if the skill tells you how, else commit with the failure noted in your report, but never --no-verify), then \`git -C ${PROTO} switch ${BRANCH}\` and confirm \`git -C ${PROTO} status --short\` is clean. The next trial needs the checkout clean on ${BRANCH}.
Write a report to ${OUT_ABS}/trials/${t.id}-r${round}.md: what you asked, each step you took, every friction point (quote the skill line), whether the change works, screenshots, time-wasters. Return it structured. Be a harsh, honest tester — the goal is to find what would stop a real designer.`, { label: `trial:${t.id}:r${round}`, phase: round === 1 ? 'Trial' : 'Fix', schema: TRIAL_RESULT })

phase('Trial')
const results = {}
for (const t of plan.trials) {
  results[t.id] = await runTrial(t, 1)
  const r = results[t.id]
  log(`trial ${t.id}: ${r ? r.outcome + ', ' + r.friction.length + ' friction' : 'no result'}`)
}

phase('Fix')
let pending = plan.trials
for (let round = 2; round <= 3; round++) {
  const reports = pending.map(t => results[t.id]).filter(Boolean)
  const friction = reports.flatMap(r => r.friction)
  if (!friction.some(f => f.severity !== 'minor') && reports.every(r => r.outcome === 'success') && round > 2) break
  await agent(`${RAILS}

${NEW_CTX}

YOUR JOB: fix the designer suite on ${BRANCH} in ${PROTO} using the trial reports (round ${round - 1}). Reports: ${JSON.stringify(reports)} — full write-ups in ${OUT_ABS}/trials/.
Check out ${BRANCH} first (\`git -C ${PROTO} branch --show-current\`). Fix EVERY blocker and major, and every minor that is cheap and clearly right. Verify each fix against the real code. If a trial exposed that a recipe is missing entirely, add it. If a trial's change failed because the plants codebase makes it genuinely hard, make the skill say so honestly and give the best route. Do not commit (the verify step does). Keep overrides.json "ours" complete for any new path. Write a changelog of fixes to ${OUT_ABS}/trials/fixes-r${round - 1}.md.`, { label: 'fix:r' + (round - 1), phase: 'Fix' })
  const vf = await verifyAndCommit('fix: act on designer trial round ' + (round - 1), 'verify-fix-r' + (round - 1), 'Fix')
  log(`fix round ${round - 1}: lint ${vf.lint}, test ${vf.test}, committed ${vf.committed}`)
  pending = plan.trials.filter(t => { const r = results[t.id]; return !r || r.outcome !== 'success' || r.friction.some(f => f.severity !== 'minor') })
  if (!pending.length || round === 3) break
  for (const t of pending) {
    results[t.id] = await runTrial(t, round)
    const r = results[t.id]
    log(`re-trial ${t.id} r${round}: ${r ? r.outcome + ', ' + r.friction.length + ' friction' : 'no result'}`)
  }
}

// ---------- Phase 7: Review ----------
phase('Review')
const LENS_REVIEW = [
  { id: 'accuracy', brief: 'ACCURACY: every command, path, script name, function name and file shape the suite tells a designer about — check each against the real code. Also every workflow script parses and follows the Workflow format.' },
  { id: 'sync-safety', brief: 'SYNC SAFETY + REPO HYGIENE: every new path is in overrides.json "ours"; nothing upstream-owned is edited without a "patched" entry; run \`npm --prefix ' + PROTO + ' run sync:upstream -- --help\` only if the script supports a dry run (read it first) — otherwise reason from the script; scripts have tests; no dead links.' },
  { id: 'designer-ux', brief: 'DESIGNER UX + COVERAGE: GDS plain English, triggers a designer would say, each recent change type from ' + OUT_ABS + '/analysis.md has a clear route, hand-off to the real team is explained, nothing assumes workspace access.' },
]
const reviews = await parallel(LENS_REVIEW.map(l => () => agent(`${RAILS}

${NEW_CTX}

YOUR JOB: adversarial review of the suite: \`git -C ${PROTO} diff main...${BRANCH} --stat\` then read every changed file. Lens: ${l.brief}
Only report real problems with a concrete fix. Return findings.`, { label: 'review:' + l.id, phase: 'Review', schema: REVIEW_SCHEMA })))
const findings = reviews.filter(Boolean).flatMap(r => r.findings)
log('Review findings: ' + findings.length + ' (' + findings.filter(f => f.severity === 'high').length + ' high)')
if (findings.length) {
  await agent(`${RAILS}

${NEW_CTX}

YOUR JOB: apply these review findings to the suite on ${BRANCH} in ${PROTO} (verify each against the code first; skip any that are wrong and say why in ${OUT_ABS}/review-dispositions.md): ${JSON.stringify(findings)}. Do not commit.`, { label: 'review-fix', phase: 'Review' })
}
const vr = await verifyAndCommit('fix: act on designer suite review', 'verify-review', 'Review')

const handover = await agent(`${RAILS}

YOUR JOB: write the handover for Sam at ${OUT_ABS}/README.md (GDS plain English, standalone — Sam skips things): what the old prototype analysis found (headline numbers, top change types, link analysis.md), what the suite contains (each deliverable, one line, path), trial outcomes per trial (final round; link reports and trial branch names; be honest about partial/failed), open issues and decisions Sam must make (including ${OUT_ABS}/settings-proposal.json if it exists, and the stale sonar hooks in the prototype's .claude/settings.json), and the commits on ${BRANCH} (\`git -C ${PROTO} log --oneline main..${BRANCH}\`). Return the README text.`, { label: 'handover', phase: 'Review' })

return {
  plan_deliverables: plan.deliverables.map(d => d.id),
  trials: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r ? { outcome: r.outcome, works: r.change_works, friction: r.friction.length, branch: r.trial_branch } : null])),
  final_verify: vr,
  review_findings: findings.length,
  handover,
}
