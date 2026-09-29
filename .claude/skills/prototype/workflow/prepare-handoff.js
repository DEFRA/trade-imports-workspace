export const meta = {
  name: 'prepare-handoff',
  description:
    'Build a hand-off change into the real trade-imports-plants-frontend on its own branch (route C1), or write a DISTIL request for a bigger change (route C2). Never pushes, never opens a pull request, never merges, never launches a build run.',
  whenToUse:
    'references/build-it-for-real.md. Launch by scriptPath with args { handoff, ticket, route, dryRun }. Always run once with dryRun true first.',
  phases: [
    {
      title: 'Plan',
      detail:
        'read the hand-off folder, pick the route if auto, list elements and their recipes, name the branches'
    },
    {
      title: 'Apply',
      detail:
        'C1 only: switch, apply the starting patch, run frontend-change per element, run the ladder'
    },
    {
      title: 'Spec',
      detail: 'C1 only: write the workspace openspec delta as a patch file'
    },
    {
      title: 'Commit',
      detail: 'C1 only: commit locally, never push; C2: write the DISTIL request'
    },
    { title: 'Return', detail: 'switch trade-imports-plants-frontend back' }
  ]
}

/* global agent, phase, log, args */

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

// The one place to point each kind of step at a model. A `runner` runs
// commands and reports what they printed, a `builder` edits code and tests,
// and a `judge` reads and decides. Any model name the Workflow tool accepts
// goes here; null uses the session's own model.
const MODELS = { runner: 'haiku', builder: 'sonnet', judge: 'opus' }

const MAX_REPAIRS = 3
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TICKET_PATTERN = /^EUDPA-\d+$/
const ROUTES = ['C1', 'C2', 'auto']

const WORKFLOW_NAME = meta.name
const REQUIRED_KEYS = ['handoff', 'ticket', 'route', 'dryRun']
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)

function fail(message) {
  throw new Error(`${WORKFLOW_NAME}: ${message}`)
}

if (typeof config.handoff !== 'string' || config.handoff.trim() === '') {
  fail('handoff must be the hand-off folder path, such as ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/2026-09-28-consignment-addresses')
}
if (config.ticket !== 'NO_JIRA' && !TICKET_PATTERN.test(config.ticket)) {
  fail('ticket must be an EUDPA-N key or the literal string "NO_JIRA"')
}
if (!ROUTES.includes(config.route)) {
  fail(`route must be one of ${ROUTES.join(', ')}`)
}
if (typeof config.dryRun !== 'boolean') {
  fail('dryRun must be true or false. Always run true first.')
}

const { handoff, ticket, dryRun } = config

// Every workspace-side path this script reads or writes; every prototype and
// real-repo command is written out in full so a subagent launched from the
// workspace root never touches the wrong checkout.
const WORKSPACE = '~/git/defra/trade-imports-workspace'
const PLANTS_FRONTEND = `${WORKSPACE}/repos/trade-imports-plants-frontend`
const PLANTS_BACKEND = `${WORKSPACE}/repos/trade-imports-plants-backend`
const TESTS_REPO = `${WORKSPACE}/repos/trade-imports-ins-tests`
const PROTOTYPE_SKILL = `${WORKSPACE}/.claude/skills/prototype`

const GUARD_RAILS = [
  'GUARD RAILS:',
  `- Read the hand-off folder at ${handoff} (an absolute tilde path already).`,
  `- Every command that touches the real frontend acts on ${PLANTS_FRONTEND}, via "git -C ${PLANTS_FRONTEND} <command>" or "npm --prefix ${PLANTS_FRONTEND} run <script>". Never a bare npm or git command.`,
  '- One Bash command per call: no &&, ;, | or cd.',
  '- Never push, never open a pull request, never merge, never run git reset --hard, never rewrite history, never use --no-verify, never force anything.',
  '- Never launch the requirements-pipeline BUILD phase, and never launch any other Workflow yourself.',
  '- Never edit .claude/settings.json, .claude/settings.local.json or anything under .claude/hooks/, in any repo.',
  '- Never install packages. If node_modules is missing, stop and say so.',
  '- Stage files by name. Never a wildcard add.'
].join('\n')

const withModel = (role, opts) =>
  MODELS[role] ? { ...opts, model: MODELS[role] } : opts

// extra is spread first so its own status/reason (for example a stray
// "planned" from a plan result passed through as context) can never win over
// the fact that this run stopped.
const stopped = (reason, extra = {}) => ({
  ...extra,
  status: 'stopped',
  reason
})

// ---------------------------------------------------------------------------
// Plan: always runs, always read-only. dryRun stops here and returns the plan.

const ELEMENT_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    recipe: { type: 'string' },
    kind: { type: 'string', enum: ['frontend', 'backend-contract', 'other'] }
  },
  required: ['description', 'recipe', 'kind']
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    problem: { type: 'string' },
    slug: { type: 'string' },
    title: { type: 'string' },
    route: { type: 'string', enum: ['C1', 'C2'] },
    routeWhy: { type: 'string' },
    elements: { type: 'array', items: ELEMENT_SCHEMA },
    sources: { type: 'array', items: { type: 'string' } },
    frontendClean: { type: 'boolean' },
    frontendStartBranch: { type: 'string' }
  },
  required: [
    'ok',
    'problem',
    'slug',
    'title',
    'route',
    'routeWhy',
    'elements',
    'sources',
    'frontendClean',
    'frontendStartBranch'
  ]
}

const routeInstruction =
  config.route === 'auto'
    ? [
        'Decide the route yourself:',
        '- C1: words only, or up to three frontend-only elements (a field, a page, a section).',
        '- C2: a new service, four or more elements, or an element that clashes with a standing ruling in house-conventions.md\'s "Kept deliberately" section (for example a service the real team removed on purpose, such as commercial transporters).',
        `Read ${PROTOTYPE_SKILL}/references/house-conventions.md, "Kept deliberately", before deciding. Put your reasoning in routeWhy.`
      ].join('\n')
    : [
        `The route is already decided: ${config.route}. Put "${config.route} was given, not decided here" in routeWhy.`
      ].join('\n')

const plan = () =>
  agent(
    [
      'Plan a hand-off build. Change nothing: no git command that writes, no file edit, no install. Read only.',
      '',
      `1. Read ${handoff}/report.json and ${handoff}/brief.md.`,
      '   If report.json does not exist, ok is false and problem says the hand-off folder is missing its report: make the hand-off first (hand-off.md).',
      `   A brief-only hand-off (no upstream.patch, report.json's briefOnly set) is fine for route C2, which needs no patch: plan it as C2.${config.route === 'C1' ? ' The route given is C1, which needs upstream.patch, so ok is false and problem says a brief-only hand-off can only go the C2 way.' : ''}`,
      '   Otherwise ok is true, problem is "", slug is the last path segment of the hand-off folder with its date prefix removed (for example "consignment-addresses" from ".../2026-09-28-consignment-addresses"), and title is the hand-off\'s short summary.',
      '2. List elements: one entry per page or service the patch touches (from report.json\'s files or pages list). For each: description (one plain sentence), recipe (the recipe file name such as add-a-field, add-a-page, add-a-section, or "none" for a wording-only change), and kind ("frontend" for a plants-frontend page or field, "backend-contract" when report.json or brief.md names a new backend endpoint or contract field, "other" otherwise).',
      routeInstruction,
      '3. sources: for a C2 route, list the DISTIL sources a distil-request.md should name: the hand-off folder itself, the design branch named in brief.md\'s links, "repo:trade-imports-plants-frontend", "repo:trade-imports-plants-backend" only if any element is kind backend-contract, and "openspec/specs/plants". For C1, return [].',
      `4. Run: git -C ${PLANTS_FRONTEND} status --porcelain`,
      '   frontendClean is true only when it prints nothing.',
      `5. Run: git -C ${PLANTS_FRONTEND} branch --show-current`,
      '   frontendStartBranch is what it prints.',
      '',
      GUARD_RAILS
    ].join('\n'),
    withModel('judge', { label: 'plan', schema: PLAN_SCHEMA })
  )

phase('Plan')
const planned = await plan()
if (!planned) {
  return stopped('The plan step did not answer.')
}
if (!planned.ok) {
  return stopped(planned.problem)
}
if (!KEBAB.test(planned.slug)) {
  return stopped(
    `The hand-off's slug ("${planned.slug}") is not usable as a branch slug.`
  )
}

const route = config.route === 'auto' ? planned.route : config.route
const branchName = `feat/${ticket}-${planned.slug}`
const backendNeeded = planned.elements.some(
  (element) => element.kind === 'backend-contract'
)

const parityQuote = [
  `Branch parity (see "tim workspace branch"): ${branchName} in trade-imports-plants-frontend`,
  backendNeeded
    ? `, trade-imports-plants-backend (a backend-contract element needs it)`
    : ' (no backend-contract element, so trade-imports-plants-backend does not need this branch)',
  `, and the tests repo once the change is ready to prove end to end. Coordinate the branch name across repos via the tests repo, per the workspace's cross-repo branch-parity rule.`
].join('')

const planResult = {
  status: 'planned',
  route,
  routeWhy: planned.routeWhy,
  branchName,
  slug: planned.slug,
  title: planned.title,
  elements: planned.elements,
  parityQuote,
  frontendClean: planned.frontendClean,
  frontendStartBranch: planned.frontendStartBranch
}

if (dryRun) {
  log(
    [
      `Dry run only: nothing was changed in any repo.`,
      `Route: ${route} (${planned.routeWhy})`,
      `Planned branch: ${branchName}`,
      parityQuote,
      ...planned.elements.map(
        (element) => `- ${element.description} — recipe: ${element.recipe}`
      )
    ].join('\n')
  )
  return planResult
}

if (route === 'C2') {
  phase('Commit')
  const DISTIL_SCHEMA = {
    type: 'object',
    properties: { ok: { type: 'boolean' }, path: { type: 'string' } },
    required: ['ok', 'path']
  }
  const written = await agent(
    [
      `Write ${handoff}/distil-request.md naming these sources, one per line under a "Sources" heading, and a one-paragraph summary of the change from ${handoff}/brief.md's opening:`,
      JSON.stringify(planned.sources, null, 2),
      'Also add a line: "Route: C2 — too large for a direct build-it-for-real apply. A developer or a requirements-pipeline DISTIL run picks this up next; nothing has been built yet."',
      'Do not touch any other file, and do not launch requirements-pipeline yourself.',
      'Return ok and the path you wrote.',
      GUARD_RAILS
    ].join('\n'),
    withModel('builder', { label: 'write distil request', schema: DISTIL_SCHEMA })
  )
  return {
    ...planResult,
    status: written?.ok ? 'ready' : 'stopped',
    distilRequest: written?.path ?? null,
    next: `Nothing was built. A developer or a requirements-pipeline DISTIL run picks this up from ${handoff}/distil-request.md.`
  }
}

// ---------------------------------------------------------------------------
// C1 only, real (non-dry) run: apply the change to trade-imports-plants-frontend.

if (!planned.frontendClean) {
  return stopped(
    `trade-imports-plants-frontend has unsaved changes on ${planned.frontendStartBranch}. Commit, stash or discard them there before building this hand-off.`,
    planResult
  )
}
if (planned.frontendStartBranch === branchName) {
  return stopped(
    `trade-imports-plants-frontend is already on ${branchName}. Switch to another branch first, or finish the work already there.`,
    planResult
  )
}

const APPLY_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' } }
  },
  required: ['ok', 'summary', 'changedFiles']
}

const PARK = `If you cannot finish, do not leave the branch half-changed: run "git -C ${PLANTS_FRONTEND} stash push --include-untracked -m \\"prepare-handoff ${planned.slug}: unfinished\\"", then "git -C ${PLANTS_FRONTEND} switch ${planned.frontendStartBranch}", and set ok to false with the reason.`

phase('Apply')
const branched = await agent(
  [
    `Create the branch and apply the hand-off's starting patch, on trade-imports-plants-frontend.`,
    `1. Run: git -C ${PLANTS_FRONTEND} switch -c ${branchName} origin/main`,
    `2. Run: git -C ${PLANTS_FRONTEND} apply --3way ${handoff}/upstream.patch`,
    '   This is a starting point, not the final diff: a hunk that conflicts should keep the real frontend\'s newer code, with the intent applied on top by hand afterwards. No file may contain conflict markers when you finish this step.',
    '3. Do not commit yet.',
    PARK,
    'Return ok, a plain summary, and changedFiles: every path git status --porcelain lists.',
    GUARD_RAILS
  ].join('\n'),
  withModel('builder', { label: 'apply starting patch', schema: APPLY_SCHEMA })
)
if (!branched || !branched.ok) {
  return stopped(
    branched ? branched.summary : 'Applying the starting patch did not finish.',
    planResult
  )
}

const elementPrompt = (element, index) =>
  [
    `Finish element ${index + 1} of ${planned.elements.length} of this hand-off, on the ${branchName} branch of trade-imports-plants-frontend: "${element.description}".`,
    element.recipe === 'none'
      ? 'This is a wording-only element: tidy the already-applied patch to match the real repo\'s own copy conventions, following ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/house-conventions.md, "Copy".'
      : `Follow the frontend-change skill's recipe for this element (the ${element.recipe} recipe, with target profile high-risk-plants-frontend), reading the recipe doc and its exemplars first, exactly as a developer would — do not hand-edit the patched files without reading the recipe. Read ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/house-conventions.md first, for the reading-list rung that applies (Controllers, Templates or Copy).`,
    'Run the recipe\'s own checks as you go (lint, unit tests for the files you touched). Do not commit.',
    PARK,
    'Return ok, a plain summary, and changedFiles.',
    GUARD_RAILS
  ].join('\n')

const elementResults = []
for (const [index, element] of planned.elements.entries()) {
  const result = await agent(
    elementPrompt(element, index),
    withModel('builder', {
      label: `element ${index + 1}`,
      schema: APPLY_SCHEMA
    })
  )
  if (!result || !result.ok) {
    return stopped(
      result
        ? result.summary
        : `Element ${index + 1} ("${element.description}") did not finish.`,
      { ...planResult, completedElements: elementResults }
    )
  }
  elementResults.push({ element: element.description, summary: result.summary })
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          summary: { type: 'string' }
        },
        required: ['command', 'summary']
      }
    }
  },
  required: ['passed', 'failures']
}

// Script names only (never the words "npm" and "run" adjacent in this file):
// the prompt below assembles each into a full --prefix command.
const LADDER = ['test', 'lint', 'lint:arch', 'test:fit', 'test:a11y']

const verifyPrompt = (attempt) =>
  [
    `Run trade-imports-plants-frontend's own ladder on ${branchName} (attempt ${attempt}). Fix nothing.`,
    ...LADDER.map(
      (script) => `- npm --prefix ${PLANTS_FRONTEND} ${script === 'test' ? 'test' : `run ${script}`}`
    ),
    'Skip a script this repo does not have (say so) rather than failing on "missing script".',
    'passed is true only when every script that exists succeeds. For each failure give the command and a plain summary naming the failing test or rule and its file.',
    GUARD_RAILS
  ].join('\n')

const repairPrompt = (failures) =>
  [
    `The ladder failed on ${branchName}. Fix the cause, not the check:`,
    JSON.stringify(failures, null, 2),
    'Never weaken what a test checks, never skip or delete a test.',
    PARK,
    'Return ok, a plain summary and changedFiles.',
    GUARD_RAILS
  ].join('\n')

phase('Apply')
let verdict = await agent(
  verifyPrompt(1),
  withModel('runner', { label: 'ladder 1', schema: VERIFY_SCHEMA })
)
let repairs = 0
while (verdict && !verdict.passed && repairs < MAX_REPAIRS) {
  repairs += 1
  log(`The ladder failed; repair ${repairs} of ${MAX_REPAIRS}.`)
  const repaired = await agent(
    repairPrompt(verdict.failures),
    withModel('builder', { label: `repair ${repairs}`, schema: APPLY_SCHEMA })
  )
  if (!repaired || !repaired.ok) {
    break
  }
  verdict = await agent(
    verifyPrompt(repairs + 1),
    withModel('runner', { label: `ladder ${repairs + 1}`, schema: VERIFY_SCHEMA })
  )
}
if (!verdict || !verdict.passed) {
  await agent(
    [
      `The change could not be made to pass the ladder. Park it safely:`,
      `1. git -C ${PLANTS_FRONTEND} stash push --include-untracked -m "prepare-handoff ${planned.slug}: checks failing"`,
      `2. git -C ${PLANTS_FRONTEND} switch ${planned.frontendStartBranch}`,
      `3. git -C ${PLANTS_FRONTEND} status --porcelain must print nothing.`,
      'Say what you did in one sentence.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', { label: 'park' })
  )
  return stopped(
    `The ladder still fails after ${repairs} repair(s). The work is stashed as "prepare-handoff ${planned.slug}: checks failing" and ${branchName} is kept. Ask a developer to look.`,
    { ...planResult, elementResults, failures: verdict ? verdict.failures : [] }
  )
}

// ---------------------------------------------------------------------------
// Spec: the workspace's own behaviour-spec delta, as a patch file only —
// never by switching the workspace repo to this branch under a running
// session.

const SPEC_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, path: { type: 'string' } },
  required: ['ok', 'path']
}

phase('Spec')
const specPatch = await agent(
  [
    `Write the behaviour-spec delta this change needs, as a patch file, without switching ${WORKSPACE} to any branch.`,
    `1. Run: git -C ${PLANTS_FRONTEND} diff origin/main..${branchName} -- .`,
    `   Read the diff to see what changed on which pages.`,
    `2. In a scratch checkout of ${WORKSPACE} (do not modify the running one): work out which openspec/specs/plants/**/spec.md files and coverage.json entries this change touches, following ${WORKSPACE}/docs/reference/openspec.md.`,
    `3. Write the edits as a unified diff to ${handoff}/openspec.patch (create the hand-off folder's parent if needed; do not apply it to the running workspace checkout).`,
    'If nothing in openspec/ needs to change (a pure wording tidy with no behaviour change), write a patch file containing only a comment line saying so, so the file still exists as a record.',
    'Return ok and the path you wrote.',
    GUARD_RAILS
  ].join('\n'),
  withModel('builder', { label: 'openspec delta', schema: SPEC_SCHEMA })
)

// ---------------------------------------------------------------------------
// Commit: locally only. Never push.

const COMMIT_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    commit: { type: 'string' },
    summary: { type: 'string' }
  },
  required: ['ok', 'commit', 'summary']
}

phase('Commit')
const committed = await agent(
  [
    `Commit the finished change locally on ${branchName}, in trade-imports-plants-frontend. Do not push.`,
    `1. Run: git -C ${PLANTS_FRONTEND} status --porcelain`,
    '   Stage every changed file by name (never a wildcard add).',
    `2. Write the message's first line from the hand-off's title: "${planned.title}". Body: one line per element, and "Hand-off: ${handoff}".`,
    `3. Run: git -C ${PLANTS_FRONTEND} commit -m "<first line>" -m "<body>"`,
    `4. Run: git -C ${PLANTS_FRONTEND} log -1 --format=%H and return it in commit.`,
    'Return ok, commit and a one-line summary.',
    GUARD_RAILS
  ].join('\n'),
  withModel('builder', { label: 'commit locally', schema: COMMIT_SCHEMA })
)

phase('Return')
const back = await agent(
  [
    `Run: git -C ${PLANTS_FRONTEND} switch ${planned.frontendStartBranch}`,
    `Then: git -C ${PLANTS_FRONTEND} status --porcelain (must print nothing)`,
    `Then: git -C ${PLANTS_FRONTEND} log --oneline -3 ${branchName}`,
    'Return ok and a one-line summary.',
    GUARD_RAILS
  ].join('\n'),
  withModel('runner', {
    label: 'switch back',
    schema: { type: 'object', properties: { ok: { type: 'boolean' }, summary: { type: 'string' } }, required: ['ok', 'summary'] }
  })
)

return {
  ...planResult,
  status: committed?.ok ? 'ready' : 'stopped',
  elementResults,
  ladderRepairs: repairs,
  openspecPatch: specPatch?.ok ? specPatch.path : null,
  commit: committed?.commit ?? null,
  back: back?.summary ?? null,
  next: `Nothing was pushed. ${branchName} in trade-imports-plants-frontend has a local commit. ${parityQuote} Push it, and coordinate the matching branch in trade-imports-plants-backend and the tests repo, only when the designer or a developer asks.`
}
