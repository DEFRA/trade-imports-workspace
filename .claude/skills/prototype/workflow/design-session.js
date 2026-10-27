export const meta = {
  name: 'design-session',
  description:
    'Work through a list of design requests in one design release: split each into parts, route each part to its reference with references/ROUTING.md, build it, check it, show the whole session in one gallery, and save each landed part as its own commit',
  whenToUse:
    "Several changes to one design release in one go, such as notes from a crit or a feedback round. Launch by scriptPath with args {set, requests}; both are required. Optional: keepOffMain (boolean) when the designer already asked to keep this session off main; designerMandate ({ id }) when the skill has recorded the designer's own permission for release patterns with designer:mandate record. Never pushes.",
  phases: [
    {
      title: 'Classify',
      detail:
        "any designer's mandate is confirmed from mandates.md; the release is yours; each request is split into parts, and each part gets a reference and its pages from references/ROUTING.md"
    },
    {
      title: 'Prepare',
      detail:
        'no unsaved changes; stays on the current branch (main included) unless keepOffMain asks for a design/<set>-<slug> branch'
    },
    {
      title: 'Build',
      detail: 'one request at a time: build, check, one repair, else park'
    },
    {
      title: 'Show',
      detail: 'designer:show --pages changed --before for the whole session'
    },
    { title: 'Save', detail: 'a full check, then one commit per request' }
  ]
}

/* global agent, args, log, phase */

// The one place to choose models. A `runner` only runs commands and reports
// what they printed, a `builder` edits files by following a reference, and a
// `judge` reads and decides. Point any of them at another model by changing
// its name here; null means "use the session's own model".
const MODELS = { runner: 'haiku', builder: 'sonnet', judge: 'opus' }

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
const REQUIRED_KEYS = ['set', 'requests']
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)

// This workflow lives in the workspace, but every command it runs must act on
// the prototype's own checkout, never on the workspace repo a bare `npm run`
// or `git` command would otherwise touch.
const REPO = '~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype'
const npm = (script) => `npm --prefix ${REPO} run ${script}`
const git = (command) => `git -C ${REPO} ${command}`

const NOT_RELEASES = ['high-risk-plants', 'sample-journey']
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MANDATE_ID = /^m-\d{4}-\d{2}-\d{2}-\d+$/
const MAX_SLUG_WORDS = 5

// The references a session can run for a request. Each one changes a design
// release in place and leaves checking, showing and saving to this workflow.
const SESSION_REFERENCES = [
  'change-the-words',
  'match-the-design',
  'change-the-journey',
  'example-data',
  'fake-a-service'
]
const PATTERN_REFERENCE = 'custom-pattern'

const sessionReferences = (mandate) =>
  mandate ? [...SESSION_REFERENCES, PATTERN_REFERENCE] : SESSION_REFERENCES

// check-my-change's rule: words, layout and examples need the quick check
// (which also runs the code rules on every changed file, so an example that
// breaks one is caught here, not in a later request's check); flow, model and
// service changes need the full one, and so does a release pattern, whose
// asset tests run only there.
const CHECK_LEVEL = {
  'change-the-words': 'quick',
  'match-the-design': 'quick',
  'example-data': 'quick',
  'change-the-journey': 'full',
  'fake-a-service': 'full',
  [PATTERN_REFERENCE]: 'full'
}

const refuse = (reason) => {
  throw new Error(`${WORKFLOW_NAME}: ${reason}`)
}

if (typeof config.set !== 'string' || !KEBAB.test(config.set)) {
  refuse(
    `set must be a design release id such as plants-working, not "${config.set}"`
  )
}
if (NOT_RELEASES.includes(config.set)) {
  refuse(
    `${config.set} is not a design release. Name a working release instead, such as plants-working: the session starts it from the real journey when it does not exist yet`
  )
}
if (
  !Array.isArray(config.requests) ||
  config.requests.length === 0 ||
  config.requests.some(
    (request) => typeof request !== 'string' || request.trim() === ''
  )
) {
  refuse('requests must be a list of at least one request, each in words')
}
if (
  config.designerMandate !== undefined &&
  !MANDATE_ID.test(config.designerMandate?.id ?? '')
) {
  refuse(
    "designerMandate must be { id } with an id that designer:mandate record printed, such as m-2026-10-27-1. Leave it out when the designer gave no permission for release patterns"
  )
}

const SET_DIR = `src/server/app/sets/${config.set}`
const SKILL_DIR = '~/git/defra/trade-imports-workspace/.claude/skills/prototype'

// The prototype-owned service folders: each has its own line in the ours
// list of overrides.json. Every other folder under src/server/app/services/
// belongs to the real service.
const PROTOTYPE_SERVICES = [
  'transporters',
  'templates',
  'ins-address-book',
  'notification-search'
]
const PROTOTYPE_SERVICE_GLOBS = PROTOTYPE_SERVICES.map(
  (name) => `src/server/app/services/${name}/`
)

const RELEASE_PATTERN_FILES = `${SET_DIR}/assets/**, ${SET_DIR}/layout.njk, ${SET_DIR}/patterns.md or ${SET_DIR}/mandates.md`

const noMandateRails = () => [
  `- This session has no designer's mandate. Never create or change ${RELEASE_PATTERN_FILES}, and never add an app-* class. When a part needs a pattern GOV.UK and MoJ lack, build the nearest GOV.UK option and add a row to ${SET_DIR}/design-gaps.md.`,
  '- Never change *.scss, src/client/**, webpack.config.js, src/server/app/shared/**, .claude/settings.json (in the prototype or the workspace) or any other set.',
  '- Never add *.test.js or *.fit.spec.js files to a design release.'
]

const mandateRails = (mandate) => [
  `- DESIGNER'S MANDATE ${mandate.id}. The designer gave this permission in their own session, and ${SET_DIR}/mandates.md records it:`,
  `  Words: "${mandate.words}"`,
  `  Scope: ${mandate.scope}`,
  `- Within that scope you may build a release pattern, following ${SKILL_DIR}/references/custom-pattern.md ("Working inside a workflow"): change ${SET_DIR}/assets/**, ${SET_DIR}/layout.njk and ${SET_DIR}/patterns.md, and use app-${config.set}- classes. Outside that scope, build the nearest GOV.UK option and add a row to ${SET_DIR}/design-gaps.md. No script checks the scope, so keep to it yourself.`,
  '- Climb the ladder first: GOV.UK Frontend, then MoJ Frontend. Build a custom pattern only when neither does the job, and give one line per rung you checked in notes.',
  `- Every patterns.md entry you write says Asked by: "${mandate.words}" (${mandate.id}), with those words exactly. A need or hypothesis you wrote yourself ends "(proposed: confirm)".`,
  '- Give every patterns.md entry you add Status: Option, for the designer to choose, even when you build only one. Never pick one for them.',
  `- To change a pattern the release already has, keep its entry and its Asked by lines, and add an Asked by line quoting this mandate when it has none.`,
  `- Never create or change ${SET_DIR}/mandates.md, and never run designer:mandate.`,
  '- Never change src/client/**, webpack.config.js, webpack.prototype.config.js, src/server/app/shared/**, .claude/settings.json (in the prototype or the workspace) or any other set. Never write a style attribute, an inline <style> or an inline <script>.',
  `- Never add *.test.js or *.fit.spec.js files to a design release, except ${SET_DIR}/assets/<name>.test.js beside a pattern's own script module.`
]

const guardRailsWith = (editLines) =>
  [
    'GUARD RAILS:',
    `- Every command acts on the prototype repository at ${REPO}, never on the workspace repo you were launched from: use "${npm('<script>')} -- ..." for every npm command and "${git('<command>')}" for every git command. A command without that prefix would act on the wrong repo.`,
    'Run one Bash command per call: no &&, ;, | or cd.',
    `- Change files only under ${SET_DIR}/, src/server/app/routes-${config.set}.js, src/server/prototype-seed/scenarios/${config.set}.js, src/server/prototype-seed/fixtures/${config.set}/, src/server/prototype-data/${config.set}/, src/server/prototype-support/ and the prototype-owned service folders (${PROTOTYPE_SERVICE_GLOBS.join(', ')}, or any other src/server/app/services/<name>/ that overrides.json lists on its own line in ours), all inside ${REPO}, and only when your step says to change files. A new prototype-owned service is made only with ${npm('designer:service')} -- new, which adds its own ours line to overrides.json.`,
    '- Never change any other folder under src/server/app/services/ (address-book, countries, ports, persistence, set-context): they belong to the real service.',
    ...editLines,
    '- Never push, never run git reset, never use --no-verify.',
    '- Never ask the designer a question: you are running unattended.'
  ].join('\n')

// A step that edits files by following a reference: the mandate, or its
// absence, decides what it may build.
const builderRails = (mandate) =>
  guardRailsWith(mandate ? mandateRails(mandate) : noMandateRails())

// A step that only runs the commands it is given, which may stage or undo a
// release's own files but never edits one.
const GUARD_RAILS = guardRailsWith([
  '- Never change src/client/**, webpack.config.js, src/server/app/shared/**, .claude/settings.json (in the prototype or the workspace) or any other set.'
])

const withModel = (tier, opts) =>
  MODELS[tier] ? { ...opts, model: MODELS[tier] } : opts

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    releaseOk: { type: 'boolean' },
    releaseMissing: { type: 'boolean' },
    releaseReason: { type: 'string' },
    sessionSlug: { type: 'string' },
    requests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          part: { type: 'string' },
          skill: { type: 'string' },
          pages: { type: 'array', items: { type: 'string' } },
          refused: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['index', 'skill', 'pages', 'refused', 'reason']
      }
    }
  },
  required: [
    'releaseOk',
    'releaseMissing',
    'releaseReason',
    'sessionSlug',
    'requests'
  ]
}

const MANDATE_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    words: { type: 'string' },
    scope: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['found', 'words', 'scope', 'reason']
}

const PREPARE_SCHEMA = {
  type: 'object',
  properties: {
    ready: { type: 'boolean' },
    branch: { type: 'string' },
    baseCommit: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['ready', 'branch', 'baseCommit', 'reason']
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    built: { type: 'boolean' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    recipe: { type: 'string' },
    welshNeeded: { type: 'boolean' },
    notes: { type: 'string' }
  },
  required: ['built', 'filesChanged', 'recipe', 'welshNeeded', 'notes']
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    logPath: { type: 'string' },
    changed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          owner: { type: 'string' }
        },
        required: ['path', 'owner']
      }
    }
  },
  required: ['passed', 'summary', 'logPath', 'changed']
}

const DONE_SCHEMA = {
  type: 'object',
  properties: {
    done: { type: 'boolean' },
    reason: { type: 'string' }
  },
  required: ['done', 'reason']
}

const SHOW_SCHEMA = {
  type: 'object',
  properties: {
    ran: { type: 'boolean' },
    galleryPath: { type: 'string' },
    pagesShown: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' }
  },
  required: ['ran', 'galleryPath', 'pagesShown', 'summary']
}

const COMMIT_SCHEMA = {
  type: 'object',
  properties: {
    committed: { type: 'boolean' },
    commit: { type: 'string' },
    message: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['committed', 'commit', 'message', 'reason']
}

const numbered = (requests) =>
  requests.map((request, index) => `${index + 1}. ${request}`).join('\n')

const confirmMandate = (id) =>
  agent(
    [
      `Read one recorded designer's mandate from the design release "${config.set}".`,
      `Run: ${npm('designer:mandate')} -- show --set ${config.set} --id ${id}`,
      "It prints JSON after npm's own first lines. When the JSON holds the entry, found is true, and words and scope are copied from it character for character, with nothing tidied. When it refuses, finds no such entry or the command is missing, found is false, words and scope are empty, and reason is what it printed.",
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'confirm mandate',
      phase: 'Classify',
      schema: MANDATE_SCHEMA
    })
  )

/**
 * The designer's mandate this session works under, read back from the
 * release's mandates.md, and the line the summary gives about it.
 */
const confirmedMandate = async () => {
  if (config.designerMandate === undefined) {
    return { mandate: null, note: [] }
  }
  const { id } = config.designerMandate
  const shown = await confirmMandate(id)
  if (!shown?.found) {
    return {
      mandate: null,
      note: [
        `The designer's mandate ${id} could not be read from ${SET_DIR}/mandates.md (${shown?.reason || 'the step did not answer'}), so this session built no release patterns.`
      ]
    }
  }
  return {
    mandate: { id, words: shown.words, scope: shown.scope },
    note: [`Worked under the designer's mandate ${id}: "${shown.words}".`]
  }
}

const classifyMandateLines = (mandate) =>
  mandate
    ? [
        `The designer has a recorded mandate (${mandate.id}) for release patterns: "${mandate.words}" Scope: ${mandate.scope}.`,
        `A part within that scope that needs something GOV.UK and MoJ lack (new styles, a script, a component switched on) is a ${PATTERN_REFERENCE} part. Read ${SKILL_DIR}/references/${PATTERN_REFERENCE}.md too.`
      ]
    : [
        "This session has no designer's mandate. Never refuse a part for needing styles, a script or a component GOV.UK and MoJ lack: route it to match-the-design, which builds the nearest GOV.UK option and logs a design gap. Its reason says: \"Built the nearest GOV.UK option and logged a design gap. Ask in your own words, with what you want research to learn, and it can be built.\""
      ]

const classify = (mandate) =>
  agent(
    [
      `A designer has asked for these changes to the design release "${config.set}":`,
      numbered(config.requests),
      '',
      'Step 1. Check the release is one this session may change.',
      `Run: ls ${REPO}/${SET_DIR}/set.js`,
      `If it says there is no such file, the release does not exist yet: releaseMissing is true, releaseOk is true and releaseReason is "${config.set} does not exist yet, so the session starts it from the real journey first." Go on to step 2.`,
      `Otherwise releaseMissing is false. Run: ${npm('designer:where')} -- ${SET_DIR}/set.js`,
      'releaseOk is false when the answer does not start with "Yours", or when it says the release is frozen. Put the plain reason in releaseReason.',
      '',
      'Step 2. Split each request into parts and route each part to exactly one reference.',
      'Read ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/ROUTING.md: "Working out what they want", the "Outcomes" and "Phrases" tables, "When no single row fits" and "Requests that fit two references". Then read each of these references, at ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/<name>.md (in the workspace, not the prototype repo — this skill lives in the workspace):',
      sessionReferences(mandate).join(', '),
      ...classifyMandateLines(mandate),
      'Follow "Working out what they want": name the outcome of each request, split it into parts, and map each part with the Outcomes table, then the Phrases table, matching on meaning rather than exact words ("overdue" is "late", "attach" is "upload").',
      'A request with one part gets one entry. A request with several parts (new words and a layout change, say, or a vague note such as "the dashboard feels thin") gets one entry per part, in the order to build them, all with the same index. Give each entry a part: one short sentence saying exactly what that part changes, specific enough to build without asking. For a one-part request, part may repeat the request.',
      'Never refuse a request for being vague. Split it into the concrete parts a designer most likely meant, using the release as it is now, and say in reason which reading you took.',
      'Anything the real service cannot do yet (a new lookup, a saved list, an upload, a status the dashboard cannot filter on) is a fake-a-service part.',
      'When a request names something the release does not have (a task list group called "Arrival" when the group is "Arrival and destination"), route it to the nearest match and say which in reason, so the summary shows it.',
      'For each entry return: index (the 1-based number of the request it came from), part, skill (one of the names above), pages (the page addresses it changes, for example arrival-details; use the flow in the release to find them) and refused.',
      'Set refused to true on an entry, with a plain reason a designer understands, only when that part:',
      "- needs a reference that is not in the list (a new release, research mode, saving or sharing, handing off, re-creating an old Prototype Kit page, running, checking or showing): the reason says what to ask for afterwards, in the designer's words, for example \"say 'get ready for research'\",",
      '- asks to change the real journey (high-risk-plants) or a real-service file every set shares.',
      'When refused is true, set skill to "none". The other parts of the same request still build.',
      '',
      'Step 3. Suggest sessionSlug: 2 to 4 lower-case words joined by hyphens that sum up the session, for example crit-notes-oct.',
      'Change nothing.'
    ].join('\n'),
    withModel('judge', {
      label: 'classify',
      phase: 'Classify',
      schema: CLASSIFY_SCHEMA
    })
  )

const prepare = (slug) =>
  agent(
    [
      'Get the git branch of the prototype repository ready for a design session. Change no files. Branches are optional: stay on whatever branch this session is already on unless told otherwise below.',
      `1. Run: ${git('status --porcelain')}`,
      "   If it prints anything, stop: ready is false and reason is \"You have unsaved changes. Save them or undo them first (say 'save my work' or 'undo that'), then start the session again.\"",
      `2. Run: ${git('branch --show-current')}`,
      config.keepOffMain === true
        ? `   - If the branch is main: the designer asked to keep this session off main, so run: ${git(`switch -c design/${config.set}-${slug}`)} (the new branch starts from main). If git says the branch already exists, stop: ready is false and reason names the branch and asks the designer to switch to it or pick another name.`
        : '   - If the branch is main, stay on it: main is a fully supported place to run this session. Never make a branch and never mention one.',
      '   - If the branch starts with design/, stay on it.',
      '   - If it starts with handoff/, stop: ready is false and reason is "You are on <branch>, a hand-off branch for the real team. Switch back to your design branch (or main) and start the session again."',
      `   - Any other branch (a feat/, chore/ or trial branch that is not this designer's own): run: ${git(`switch -c design/${config.set}-${slug}`)}`,
      '     The new branch starts from the current one. If git says the branch already exists, stop: ready is false and reason names the branch and asks the designer to switch to it or pick another name.',
      `3. Run: ${git('branch --show-current')}, and return the branch name in branch.`,
      `4. Run: ${git('rev-parse HEAD')}, and return the commit it prints in baseCommit.`,
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'prepare',
      phase: 'Prepare',
      schema: PREPARE_SCHEMA
    })
  )

const releasePaths = (set) => [
  `src/server/app/sets/${set}`,
  `src/server/app/routes-${set}.js`,
  'src/server/prototype-sets/index.js',
  'src/server/prototype-sets/descriptions.js',
  'overrides.json'
]

const startRelease = () =>
  agent(
    [
      `The design release "${config.set}" does not exist yet. Start it from the real journey and save it as its own commit, following section B of ${REPO}/references/design-release.md with these answers already given:`,
      `1. Run: ${npm('new:set')} -- ${config.set} --from high-risk-plants --purpose working --describe "Working release for a design session"`,
      `2. Run: ${npm('designer:format')}`,
      '3. Stage exactly the files new:set made, one add per path (never a wildcard add):',
      ...releasePaths(config.set).map((path) => `   Run: ${git(`add -- ${path}`)}`),
      `   Then run: ${git('diff --cached --name-only')}`,
      `   Every line it prints must start with one of: ${releasePaths(config.set).join(', ')}. If any other file is staged, stop: done is false and reason names the unexpected files.`,
      `4. Run: ${npm('designer:save')} -- -m "Start design release ${config.set} from high-risk-plants" -m "Copied from high-risk-plants for a design session."`,
      '   The pre-commit hook runs the full check; its output goes to .cache/designer/commit.log (in the prototype repo) and the command prints one line, or the end of the log when the save failed. Never add --no-verify.',
      'done is true when the commit went through. Otherwise done is false and reason is the plain reason the command or the hook gave.',
      'new:set also adds lines to overrides.json and src/server/prototype-sets/: that is expected here, and the only change outside the release this step may make. Never edit files by hand in this step.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'start release',
      phase: 'Prepare',
      schema: DONE_SCHEMA
    })
  )

// A part of a request that was split names that part, so the builder makes
// only it and leaves the other parts to their own steps.
const partLine = (request, route) =>
  route.id.includes('.') && route.part && route.part !== request
    ? [
        `This step makes only this part of it: "${route.part}". Other steps make the other parts.`
      ]
    : []

const build = (request, route, context) =>
  agent(
    [
      `Make one change in the design release "${config.set}". The designer asked:`,
      `"${request}"`,
      ...partLine(request, route),
      `Follow ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/${route.skill}.md (in the workspace, not the prototype repo). The pages involved are likely: ${route.pages.join(', ') || 'not known yet'}.`,
      'How to follow the reference in this session:',
      '- Do the steps that find, plan and make the change, including its ownership step (designer:where) and any reference or recipe it tells you to read.',
      '- Skip the steps that check, show, save, share or hand off. This workflow does those for every request.',
      '- When the reference says to confirm something with the designer, take the request as confirmed.',
      '- When you cannot make the change without an answer only the designer has, change nothing and return built false with the question in notes.',
      "- New words go in copy.en.js, and the same key in copy.cy.js as '[Welsh needed] <English>' unless the designer gave the Welsh.",
      `- Run ${npm('designer:format')} when you have finished editing.`,
      'Return built, every file you created or changed (repo-relative paths, relative to the prototype repo), the recipe you followed (its file name, such as add-a-field or move-a-page, or "none"), whether you added any [Welsh needed] marker, and notes in one or two plain sentences.',
      builderRails(context.mandate)
    ].join('\n'),
    withModel('builder', {
      label: `build ${route.id}`,
      phase: 'Build',
      schema: BUILD_SCHEMA
    })
  )

const runFlags = (context) =>
  context.mandate
    ? ` --since ${context.baseCommit} --mandate ${context.mandate.id}`
    : ` --since ${context.baseCommit} --no-new-patterns`

const check = (label, level, context) =>
  agent(
    [
      `1. Run: ${npm('designer:check')} -- --set ${config.set} --${level}${runFlags(context)}`,
      '   Report whether it passed, its plain-English summary (every failing row in full) and the log path it prints.',
      `2. Run: ${npm('designer:where')} -- --changed --json`,
      "   The JSON comes after npm's own first lines. Return every record as { path, owner } in changed.",
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', { label, phase: 'Build', schema: CHECK_SCHEMA })
  )

const patternRepairLines = (context) =>
  context.mandate
    ? [
        `If it says a pattern must cite the designer's mandate ${context.mandate.id}, or must be an Option, fix that entry in ${SET_DIR}/patterns.md to say so. If it says the run added a mandate, take that entry out of ${SET_DIR}/mandates.md. Never change any other mandates.md entry.`
      ]
    : [
        `If it says this run has no designer's mandate, take out what this request added to ${RELEASE_PATTERN_FILES} and every app-* class it added, then build the nearest GOV.UK option and add a row to ${SET_DIR}/design-gaps.md. Never edit mandates.md or patterns.md to make it pass.`
      ]

const repair = (request, route, failure, context) =>
  agent(
    [
      `The check of the design release "${config.set}" failed after this request was built:`,
      `"${request}"`,
      ...partLine(request, route),
      `Summary: ${failure.summary}`,
      `Full log: ${failure.logPath} (read it; the path is inside ${REPO}).`,
      `Fix the cause in the files this request changed, following ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/${route.skill}.md and ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/check-my-change.md. If the failure is in a file this request did not touch, change nothing and say so in notes.`,
      ...patternRepairLines(context),
      `Run ${npm('designer:format')} when you have finished. Return what you changed.`,
      builderRails(context.mandate)
    ].join('\n'),
    withModel('builder', {
      label: `repair ${route.id}`,
      phase: 'Build',
      schema: BUILD_SCHEMA
    })
  )

const stage = (index, paths) =>
  agent(
    [
      `Keep the files of request ${index} aside from the requests that follow, without saving a commit.`,
      `Run: ${git(`add -- ${paths.join(' ')}`)}`,
      `Then run: ${git('status --porcelain')}`,
      'done is true when every one of those paths shows in the first column. Change nothing else.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: `keep ${index}`,
      phase: 'Build',
      schema: DONE_SCHEMA
    })
  )

const putAway = (index, request, paths) =>
  agent(
    [
      `Request ${index} ("${request}") is parked. Undo only its edits, so the requests already kept stay as they are.`,
      `1. Run: ${git(`status --porcelain=v1 -uall -- ${paths.join(' ')}`)}`,
      `2. Lines starting "??" are new files. Put them all away in one go, so they can come back later: ${git(`stash push --include-untracked -m "design-session parked: request ${index}" -- <those paths>`)}`,
      `3. For every other path from step 1, run: ${git('restore --worktree -- <path>')}`,
      '   This puts back the version kept by an earlier request, or the saved version.',
      `4. Run step 1's command again. done is true when no line has a second-column change and no line starts with "??".`,
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: `put away ${index}`,
      phase: 'Build',
      schema: DONE_SCHEMA
    })
  )

const show = (landedSkills) =>
  agent(
    [
      ...(landedSkills.includes('example-data')
        ? [
            `An example-data request landed. Run: ${git(`diff --cached -- src/server/prototype-seed/scenarios/${config.set}.js`)}`,
            "Note the slug of every example it adds (the lines starting + with slug: '...').",
            `Then run: ${npm('designer:show')} -- --set ${config.set} --pages changed,dashboard --examples <those slugs, comma-separated> --before`,
            'Leave out --examples when it adds no slug.'
          ]
        : [
            `Run: ${npm('designer:show')} -- --set ${config.set} --pages changed --before`
          ]),
      'Report the gallery folder it prints (the index.html path), the pages it pictured and its summary, including any "None of your changes show on a page" or page-health note, word for word.',
      'Do not describe what the pictures look like. Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', { label: 'show', phase: 'Show', schema: SHOW_SCHEMA })
  )

const fullCheck = (context) =>
  agent(
    [
      `Run: ${npm('designer:check')} -- --set ${config.set} --full${runFlags(context)}`,
      'This is what the pre-commit hook runs. Report whether it passed, its plain-English summary (every failing row in full) and the log path. Return changed as an empty list.',
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'full check',
      phase: 'Save',
      schema: CHECK_SCHEMA
    })
  )

const commit = (group) =>
  agent(
    [
      `Save one commit for ${group.requests.length === 1 ? 'this request' : 'these requests, which changed the same files'}:`,
      group.requests
        .map((item) => `- "${item.text}" (${item.skill})`)
        .join('\n'),
      `Files: ${group.paths.join(' ')}`,
      `Recipes followed: ${group.recipes.join(', ') || 'none'}`,
      'Every landed request is staged. Save only these files, from the staged changes, with no path list on the commit: a commit with paths makes git run the pre-commit hook against a temporary index, which the hook’s own tests trip over.',
      `1. Read ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/share-my-change/commit-message.md and follow it exactly.`,
      `2. Run: ${git('restore --staged -- .')}`,
      '   This only takes every change off the staging area. Nothing on disk changes.',
      `3. Run: ${git(`add -A -- ${group.paths.join(' ')}`)}`,
      `4. Run: ${git('diff --cached --name-only')}`,
      '   It must list exactly the files above. If it lists any other file, change nothing more and return committed false naming it.',
      `5. Run: ${git('diff --cached')}`,
      '   Write the message from that change, never from the request text alone.',
      `6. Run: ${npm('designer:save')} -- -m "<first line>" -m "<body>"`,
      '   The pre-commit hook runs the full check. It prints one line when the save worked, or "Nothing was saved" and the end of the log. Never add --no-verify. If the save fails, change nothing and return committed false with the hook\'s plain reason.',
      `7. Run: ${git('log -1 --format=%h')} and return it in commit, with the whole message in message.`,
      GUARD_RAILS
    ].join('\n'),
    withModel('builder', {
      label: `save ${group.requests.map((item) => item.id).join('+')}`,
      phase: 'Save',
      schema: COMMIT_SCHEMA
    })
  )

const sessionSlugFrom = (suggested) => {
  const words = String(suggested ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter(Boolean)
    .slice(0, MAX_SLUG_WORDS)
  return words.length > 0 ? words.join('-') : 'design-session'
}

const checkedRoute = (route, references) =>
  !route.refused && !references.includes(route.skill)
    ? {
        ...route,
        refused: true,
        reason: `"${route.skill}" is not a reference a design session can run.`
      }
    : route

/**
 * The units of work for one request: one per part the judge split it into.
 * A request with one part keeps its number as its id ("2"); the parts of a
 * split request are numbered under it ("2.1", "2.2"), in build order.
 */
const unitsFor = (classified, index, references) => {
  const request = config.requests[index - 1]
  const routes = (classified.requests ?? []).filter(
    (item) => item.index === index
  )
  if (routes.length === 0) {
    return [
      {
        id: String(index),
        index,
        request,
        text: request,
        skill: 'none',
        pages: [],
        refused: true,
        reason: 'The request could not be matched to a reference.'
      }
    ]
  }
  return routes.map((route, position) => {
    const split = routes.length > 1
    return {
      ...checkedRoute({ pages: [], reason: '', ...route }, references),
      id: split ? `${index}.${position + 1}` : String(index),
      index,
      request,
      text: split && route.part ? route.part : request
    }
  })
}

const pathsOf = (records) => records.map((record) => record.path)

const notYours = (records) =>
  records.filter((record) => record.owner !== 'yours')

// Requests that changed a file in common are saved in one commit, because
// git cannot split one file's changes between two commits here.
const groupByFiles = (landed) => {
  const groups = []
  for (const item of landed) {
    const overlapping = groups.filter((group) =>
      group.paths.some((filePath) => item.paths.includes(filePath))
    )
    const merged = {
      requests: [...overlapping.flatMap((group) => group.requests), item],
      paths: [
        ...new Set([
          ...overlapping.flatMap((group) => group.paths),
          ...item.paths
        ])
      ],
      recipes: [
        ...new Set([
          ...overlapping.flatMap((group) => group.recipes),
          ...(item.recipe && item.recipe !== 'none' ? [item.recipe] : [])
        ])
      ]
    }
    for (const group of overlapping) {
      groups.splice(groups.indexOf(group), 1)
    }
    groups.push(merged)
  }
  return groups.sort(
    (left, right) => left.requests[0].order - right.requests[0].order
  )
}

const buildOne = async (request, route, alreadyChanged, context) => {
  const built = await build(request, route, context)
  if (!built?.built) {
    return {
      landed: false,
      paths: built?.filesChanged ?? [],
      reason: built?.notes || 'The change could not be made.'
    }
  }
  const level = CHECK_LEVEL[route.skill]
  let checked = await check(`check ${route.id}`, level, context)
  if (checked && !checked.passed) {
    log(`Request ${route.id} failed its check. One repair.`)
    await repair(request, route, checked, context)
    checked = await check(`recheck ${route.id}`, level, context)
  }
  const changedNow = checked?.changed ?? []
  const paths = [
    ...new Set([
      ...built.filesChanged,
      ...pathsOf(changedNow).filter(
        (filePath) => !alreadyChanged.includes(filePath)
      )
    ])
  ]
  if (!checked?.passed) {
    return {
      landed: false,
      paths,
      reason: `It still fails its check after one repair: ${checked?.summary ?? 'the check did not answer'}`
    }
  }
  const strays = notYours(
    changedNow.filter((record) => paths.includes(record.path))
  )
  if (strays.length > 0) {
    return {
      landed: false,
      paths,
      reason: `It changed files that are not yours: ${pathsOf(strays).join(', ')}.`
    }
  }
  return {
    landed: true,
    paths,
    recipe: built.recipe,
    welshNeeded: built.welshNeeded,
    reason: built.notes
  }
}

const statusLine = (item) => {
  if (item.status === 'landed') {
    return `${item.id}. Landed (${item.skill})${item.commit ? `, saved as ${item.commit}` : ', not saved'}: ${item.text}`
  }
  return `${item.id}. ${item.status === 'parked' ? 'Parked' : 'Not done'}: ${item.text}. ${item.reason}`
}

// A split request says once which parts it became, so the designer can see
// how a vague note was read.
const splitLines = (units) =>
  config.requests.flatMap((request, position) => {
    const parts = units.filter((unit) => unit.index === position + 1)
    return parts.length > 1
      ? [
          `Request ${position + 1} ("${request}") was split into ${parts.length} parts: ${parts.map((unit) => unit.id).join(', ')}.`
        ]
      : []
  })

const PATTERNS_SCHEMA = {
  type: 'object',
  properties: {
    patterns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          status: { type: 'string' }
        },
        required: ['name', 'status']
      }
    }
  },
  required: ['patterns']
}

const listChangedPatterns = (context) =>
  agent(
    [
      `List the release patterns this session added or changed in ${SET_DIR}/patterns.md.`,
      `Run: ${git(`diff ${context.baseCommit} -- ${SET_DIR}/patterns.md`)}`,
      `Then read ${REPO}/${SET_DIR}/patterns.md.`,
      'Return, in patterns, one { name, status } for each "## <name>" entry that the diff adds or changes: its name as the heading writes it, and the value of its "- Status:" line. Return an empty list when the diff is empty.',
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'list patterns',
      phase: 'Save',
      schema: PATTERNS_SCHEMA
    })
  )

const patternLines = (patterns) => {
  const quoted = (list) => list.map(({ name }) => `"${name}"`).join(', ')
  const options = patterns.filter(({ status }) => status === 'Option')
  const others = patterns.filter(({ status }) => status !== 'Option')
  return [
    ...(options.length > 0
      ? [
          `Options for you to choose, in ${SET_DIR}/patterns.md: ${quoted(options)}. Say which to keep, and the others are closed.`
        ]
      : []),
    ...(others.length > 0
      ? [
          `Release patterns this session changed, in ${SET_DIR}/patterns.md: ${others.map(({ name, status }) => `"${name}" (${status})`).join(', ')}.`
        ]
      : [])
  ]
}

const changedPatternLines = async (context) => {
  if (!context.mandate) {
    return []
  }
  const listed = await listChangedPatterns(context)
  if (!listed) {
    return [
      `The release patterns this session changed could not be listed. Read ${SET_DIR}/patterns.md for any Option to choose.`
    ]
  }
  return patternLines(listed.patterns)
}

const summarise = (results, extra) => {
  log(
    [
      `Design session in ${config.set}:`,
      ...results.map(statusLine),
      ...extra
    ].join('\n')
  )
}

// Each landed result is the same object the summary prints, so marking its
// commit here shows in the summary.
const saveGroups = async (groups) => {
  for (const group of groups) {
    const saved = await commit(group)
    if (!saved?.committed) {
      return `Saving stopped: ${saved?.reason ?? 'the commit step did not answer'}. The remaining changes are kept but not saved; say "check my changes".`
    }
    for (const item of group.requests) {
      item.commit = saved.commit
    }
  }
  return `Saved ${groups.length} commit${groups.length === 1 ? '' : 's'}. Nothing was pushed: say "share this" to open a pull request.`
}

const buildAll = async (units, context) => {
  const results = []
  const kept = []
  for (const [order, unit] of units.entries()) {
    const base = {
      id: unit.id,
      order,
      index: unit.index,
      text: unit.text,
      skill: unit.skill
    }
    if (unit.refused) {
      results.push({ ...base, status: 'refused', reason: unit.reason })
      continue
    }
    log(`Request ${unit.id} of ${config.requests.length}: ${unit.skill}`)
    const outcome = await buildOne(unit.request, unit, kept, context)
    if (outcome.landed) {
      const staged = await stage(unit.id, outcome.paths)
      if (staged?.done) {
        kept.push(...outcome.paths)
        results.push({ ...base, status: 'landed', ...outcome })
        continue
      }
      outcome.reason = `Its files could not be kept aside: ${staged?.reason ?? 'no answer'}`
    }
    if (outcome.paths.length > 0) {
      await putAway(unit.id, unit.text, outcome.paths)
    }
    results.push({ ...base, status: 'parked', reason: outcome.reason })
  }
  return results
}

const main = async () => {
  phase('Classify')
  const { mandate, note: mandateNote } = await confirmedMandate()
  const classified = await classify(mandate)
  if (!classified) {
    log('Stopped before any change: the classify step did not answer.')
    return
  }
  if (!classified.releaseOk) {
    log(`Stopped before any change: ${classified.releaseReason}`)
    return
  }
  const references = sessionReferences(mandate)
  const units = config.requests.flatMap((_, position) =>
    unitsFor(classified, position + 1, references)
  )
  const splits = [...mandateNote, ...splitLines(units)]
  if (units.every((unit) => unit.refused)) {
    summarise(
      units.map((unit) => ({ ...unit, status: 'refused' })),
      [...splits, 'Nothing was changed.']
    )
    return
  }

  phase('Prepare')
  const prepared = await prepare(sessionSlugFrom(classified.sessionSlug))
  if (!prepared?.ready) {
    log(
      `Stopped before any change: ${prepared?.reason ?? 'the prepare step did not answer'}`
    )
    return
  }
  if (!prepared.baseCommit) {
    log(
      "Stopped before any change: the prepare step did not give the starting commit, so the checks could not tell a release pattern from this session's own work."
    )
    return
  }
  const context = { mandate, baseCommit: prepared.baseCommit }
  log(`Working on branch ${prepared.branch}.`)
  if (classified.releaseMissing) {
    const started = await startRelease()
    if (!started?.done) {
      log(
        `Stopped before any change: ${config.set} could not be started (${started?.reason ?? 'the step did not answer'}). Ask for it with "start a new design release called ${config.set}".`
      )
      return
    }
    log(`Started ${config.set} from the real journey, saved as its own commit.`)
  }

  phase('Build')
  const results = await buildAll(units, context)
  const landed = results.filter((item) => item.status === 'landed')
  if (landed.length === 0) {
    summarise(results, [
      ...splits,
      'Nothing landed, so there is no gallery or commit.'
    ])
    return
  }

  phase('Show')
  const shown = await show(landed.map((item) => item.skill))
  const gallery = shown?.ran
    ? `Gallery: ${shown.galleryPath}`
    : `No gallery: ${shown?.summary ?? 'the show step did not answer'}`

  phase('Save')
  const options = await changedPatternLines(context)
  const checked = await fullCheck(context)
  if (!checked?.passed) {
    summarise(results, [
      ...splits,
      ...options,
      gallery,
      `Not saved: the full check failed (${checked?.summary ?? 'no answer'}). The landed changes are kept but not saved; say "check my changes".`
    ])
    return
  }
  const saving = await saveGroups(groupByFiles(landed))
  summarise(results, [
    ...splits,
    ...options,
    gallery,
    `Branch: ${prepared.branch}`,
    saving
  ])
}

await main()
