import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

const SCRIPT = readFileSync(
  new URL(
    '../../../../.claude/skills/prototype/workflow/design-session.js',
    import.meta.url
  ),
  'utf8'
)

const REPO =
  '~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype'

// The Workflow tool runs a script as the body of an async function with
// `args`, `agent`, `log` and `phase` in scope. Run it the same way, with
// stand-ins that record every call.
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

const runWorkflow = (args, { agent, log = vi.fn(), phase = vi.fn() }) =>
  new AsyncFunction(
    'args',
    'agent',
    'log',
    'phase',
    SCRIPT.replace('export const meta', 'const meta')
  )(args, agent, log, phase)

const SET = 'plants-working'
const FEATURES = `src/server/app/sets/${SET}/journeys/linear/features`

const ARGS = {
  set: SET,
  requests: [
    "Change the hint on origin to 'The country the plants were grown in'",
    'Add a draft example stopped at commodities',
    "Make the task list's 'Arrival' group 'Arrival and transport'"
  ]
}

const FILES = {
  1: [
    `${FEATURES}/origin/copy/copy.en.js`,
    `${FEATURES}/origin/copy/copy.cy.js`
  ],
  2: [`src/server/prototype-seed/scenarios/${SET}.js`],
  3: [`${FEATURES}/hub/copy/copy.en.js`, `${FEATURES}/hub/copy/copy.cy.js`]
}

const BASE_COMMIT = '3f2a9c1d'
const MANDATE_ID = 'm-2026-10-27-1'
const MANDATE_WORDS =
  "give me 3 options for this page; you can make reasonable use of new components or designs if GOV.UK doesn't fit"

const ROUTES = [
  { index: 1, skill: 'change-the-words', pages: ['origin'] },
  { index: 2, skill: 'example-data', pages: ['commodities'] },
  { index: 3, skill: 'change-the-words', pages: ['hub'] }
].map((route) => ({ ...route, refused: false, reason: '' }))

// A step's label ends with the id of the request, or of one part of a split
// request: "build 2" or "build 2.1".
const idIn = (label) => /(\d+(?:\.\d+)?)$/.exec(label)?.[1]

/**
 * An agent stand-in that answers each step by its label. `overrides` maps a
 * label to an answer (or a function of the call count) to steer one step.
 */
const makeAgent = (overrides = {}, files = FILES) => {
  const changed = new Set()
  const calls = []
  const answer = (label) => {
    if (label === 'classify') {
      return {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'Crit notes Friday',
        requests: ROUTES
      }
    }
    if (label === 'prepare') {
      return {
        ready: true,
        branch: `design/${SET}-crit-notes-friday`,
        baseCommit: BASE_COMMIT,
        reason: ''
      }
    }
    if (label === 'confirm mandate') {
      return {
        found: true,
        words: MANDATE_WORDS,
        scope: 'commodity-search',
        reason: ''
      }
    }
    if (label.startsWith('build') || label.startsWith('repair')) {
      const paths = files[idIn(label)]
      paths.forEach((filePath) => changed.add(filePath))
      return {
        built: true,
        filesChanged: paths,
        recipe: 'none',
        welshNeeded: true,
        notes: 'Done.'
      }
    }
    if (
      label.startsWith('check') ||
      label.startsWith('recheck') ||
      label === 'full check'
    ) {
      return {
        passed: true,
        summary: 'Passed',
        logPath: '.cache/designer/check/x.log',
        changed: [...changed].map((path) => ({
          path,
          owner: path.includes('/app/shared/') ? 'real-service' : 'yours'
        }))
      }
    }
    if (
      label.startsWith('keep') ||
      label.startsWith('put away') ||
      label === 'start release'
    ) {
      return { done: true, reason: '' }
    }
    if (label === 'list patterns') {
      return { patterns: [] }
    }
    if (label === 'show') {
      return {
        ran: true,
        galleryPath: `.cache/designer/show/${SET}/latest/index.html`,
        pagesShown: ['origin', 'hub'],
        summary: 'Pictured 2 pages.'
      }
    }
    if (label.startsWith('save')) {
      return {
        committed: true,
        commit: `abc${label.slice(5)}`,
        message: `${SET}: a change`,
        reason: ''
      }
    }
    throw new Error(`unexpected agent label ${label}`)
  }
  const agent = vi.fn(async (prompt, opts) => {
    calls.push({ prompt, opts })
    const override = overrides[opts.label]
    if (override !== undefined) {
      const count = calls.filter((call) => call.opts.label === opts.label)
      return typeof override === 'function' ? override(count.length) : override
    }
    return answer(opts.label)
  })
  return { agent, calls }
}

const labels = (calls) => calls.map((call) => call.opts.label)
const logText = (log) => log.mock.calls.map(([line]) => line).join('\n')

describe('design-session', () => {
  describe('refuses before any agent runs', () => {
    it.each([
      ['a missing requests key', { set: SET }, /missing required key requests/],
      [
        'the real journey',
        { ...ARGS, set: 'high-risk-plants' },
        /not a design release/
      ],
      [
        'the placeholder',
        { ...ARGS, set: 'sample-journey' },
        /not a design release/
      ],
      ['a set id with capitals', { ...ARGS, set: 'Plants' }, /set must be/],
      ['no requests', { ...ARGS, requests: [] }, /requests must be/],
      ['a blank request', { ...ARGS, requests: ['  '] }, /requests must be/],
      [
        'a mandate with no recorded id',
        { ...ARGS, designerMandate: { id: 'go ahead' } },
        /designerMandate must be/
      ],
      [
        'a mandate given as words',
        { ...ARGS, designerMandate: MANDATE_WORDS },
        /designerMandate must be/
      ]
    ])('%s', async (_, args, message) => {
      const { agent } = makeAgent()
      await expect(runWorkflow(args, { agent })).rejects.toThrow(message)
      expect(agent).not.toHaveBeenCalled()
    })
  })

  it('accepts args as a JSON string', async () => {
    const { agent } = makeAgent()
    await runWorkflow(JSON.stringify(ARGS), { agent })
    expect(agent).toHaveBeenCalled()
  })

  it('lands three requests as three commits and one gallery', async () => {
    const { agent, calls } = makeAgent()
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })

    expect(labels(calls)).toEqual([
      'classify',
      'prepare',
      'build 1',
      'check 1',
      'keep 1',
      'build 2',
      'check 2',
      'keep 2',
      'build 3',
      'check 3',
      'keep 3',
      'show',
      'full check',
      'save 1',
      'save 2',
      'save 3'
    ])
    const showCall = calls.find((call) => call.opts.label === 'show')
    expect(showCall.prompt).toContain(
      `npm --prefix ${REPO} run designer:show -- --set ${SET} --pages changed,dashboard --examples`
    )
    const text = logText(log)
    expect(text).toContain('1. Landed (change-the-words), saved as abc1')
    expect(text).toContain('3. Landed (change-the-words), saved as abc3')
    expect(text).toContain(
      `Gallery: .cache/designer/show/${SET}/latest/index.html`
    )
    expect(text).toContain('Saved 3 commits. Nothing was pushed')
  })

  it('shows only the changed pages when no example was added', async () => {
    const routes = [ROUTES[0], { ...ROUTES[1], skill: 'match-the-design' }]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseMissing: false,
        releaseReason: '',
        sessionSlug: 'x',
        requests: [...routes, ROUTES[2]]
      }
    })
    await runWorkflow(ARGS, { agent })
    const showCall = calls.find((call) => call.opts.label === 'show')
    expect(showCall.prompt).toContain(
      `npm --prefix ${REPO} run designer:show -- --set ${SET} --pages changed --before`
    )
  })

  it('saves each commit from the staged files, never with a path list', async () => {
    const { agent, calls } = makeAgent()
    await runWorkflow(ARGS, { agent })
    const save = calls.find((call) => call.opts.label === 'save 1').prompt
    expect(save).toContain(`Run: git -C ${REPO} restore --staged -- .`)
    expect(save).toContain(
      `Run: git -C ${REPO} add -A -- ${FILES[1].join(' ')}`
    )
    expect(save).toContain(
      `Run: npm --prefix ${REPO} run designer:save -- -m "<first line>" -m "<body>"\n`
    )
    expect(save).not.toMatch(/designer:save [^\n]* -- \S+\.js/)
    expect(save).not.toContain('git commit')
  })

  it('starts a release that does not exist yet, then carries on', async () => {
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseMissing: true,
        releaseReason: 'plants-working does not exist yet',
        sessionSlug: 'x',
        requests: ROUTES
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    const order = labels(calls)
    expect(order.slice(0, 4)).toEqual([
      'classify',
      'prepare',
      'start release',
      'build 1'
    ])
    const start = calls.find((call) => call.opts.label === 'start release')
    expect(start.prompt).toContain(
      `npm --prefix ${REPO} run new:set -- ${SET} --from high-risk-plants --purpose working`
    )
    expect(start.prompt).not.toMatch(/Run: git -C \S+ add -A\s*$/m)
    for (const path of [
      `src/server/app/sets/${SET}`,
      `src/server/app/routes-${SET}.js`,
      'src/server/prototype-sets/index.js',
      'src/server/prototype-sets/descriptions.js',
      'overrides.json'
    ]) {
      expect(start.prompt).toContain(`Run: git -C ${REPO} add -- ${path}`)
    }
    expect(start.prompt).toContain(`git -C ${REPO} diff --cached --name-only`)
    expect(logText(log)).toContain(`Started ${SET} from the real journey`)
  })

  it('stops when the new release cannot be started', async () => {
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseMissing: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: ROUTES
      },
      'start release': { done: false, reason: 'The hook failed.' }
    })
    await runWorkflow(ARGS, { agent })
    expect(labels(calls)).toEqual(['classify', 'prepare', 'start release'])
  })

  it('makes the branch name from the judge’s slug', async () => {
    const { agent, calls } = makeAgent()
    await runWorkflow(ARGS, { agent })
    const prepareCall = calls.find((call) => call.opts.label === 'prepare')
    expect(prepareCall.prompt).toContain(
      `git -C ${REPO} switch -c design/${SET}-crit-notes-friday`
    )
  })

  it('points each kind of step at its model', async () => {
    const { agent, calls } = makeAgent()
    await runWorkflow(ARGS, { agent })
    const modelOf = (label) =>
      calls.find((call) => call.opts.label === label).opts.model
    expect(modelOf('classify')).toBe('opus')
    expect(modelOf('build 1')).toBe('sonnet')
    expect(modelOf('check 1')).toBe('haiku')
    expect(modelOf('save 1')).toBe('sonnet')
  })

  it('uses the full check for journey changes and the quick one for words', async () => {
    const routes = [
      { ...ROUTES[0] },
      { ...ROUTES[1], skill: 'change-the-journey' },
      { ...ROUTES[2] }
    ]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: routes
      }
    })
    await runWorkflow(ARGS, { agent })
    const promptOf = (label) =>
      calls.find((call) => call.opts.label === label).prompt
    expect(promptOf('check 1')).toContain('--quick')
    expect(promptOf('check 2')).toContain('--full')
  })

  it('stops before any change when the release is frozen', async () => {
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: false,
        releaseReason:
          'This is a frozen release. Start a working release from it instead.',
        sessionSlug: 'x',
        requests: []
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).toEqual(['classify'])
    expect(logText(log)).toContain('This is a frozen release')
  })

  it('repairs once, then parks and puts the request’s files away', async () => {
    const failing = {
      passed: false,
      summary: 'Welsh key missing',
      logPath: '.cache/designer/check/y.log',
      changed: FILES[2].map((path) => ({ path, owner: 'yours' }))
    }
    const { agent, calls } = makeAgent({
      'check 2': failing,
      'recheck 2': failing
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })

    const order = labels(calls)
    expect(order).toContain('repair 2')
    expect(order.filter((label) => label.startsWith('repair'))).toEqual([
      'repair 2'
    ])
    expect(order).toContain('put away 2')
    expect(order).not.toContain('keep 2')
    expect(order).not.toContain('save 2')
    expect(order).toContain('save 3')
    const putAway = calls.find((call) => call.opts.label === 'put away 2')
    expect(putAway.prompt).toContain(FILES[2][0])
    expect(logText(log)).toContain(
      '2. Parked: Add a draft example stopped at commodities. It still fails its check after one repair: Welsh key missing'
    )
  })

  it('parks a request that changed a file that is not yours', async () => {
    const shared = 'src/server/app/shared/copy.en.js'
    const { agent, calls } = makeAgent({}, { ...FILES, 1: [shared] })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).toContain('put away 1')
    expect(labels(calls)).not.toContain('save 1')
    expect(logText(log)).toContain('changed files that are not yours')
  })

  it('does not build a request the judge refused', async () => {
    const routes = [
      ROUTES[0],
      {
        index: 2,
        skill: 'none',
        pages: [],
        refused: true,
        reason:
          'Starting a release is a separate step: say "start a new design release".'
      },
      ROUTES[2]
    ]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: routes
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).not.toContain('build 2')
    expect(logText(log)).toContain('2. Not done: Add a draft example')
  })

  it('refuses a reference a session cannot run', async () => {
    const routes = [
      { ...ROUTES[0], skill: 'design-release' },
      ROUTES[1],
      ROUTES[2]
    ]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: routes
      }
    })
    await runWorkflow(ARGS, { agent })
    expect(labels(calls)).not.toContain('build 1')
  })

  it('saves requests that changed the same file in one commit', async () => {
    const { agent, calls } = makeAgent({}, { ...FILES, 3: FILES[1] })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls).filter((label) => label.startsWith('save'))).toEqual([
      'save 1+3',
      'save 2'
    ])
    expect(logText(log)).toContain('Saved 2 commits')
  })

  it('saves nothing when the full check fails', async () => {
    const { agent, calls } = makeAgent({
      'full check': {
        passed: false,
        summary: 'Lint failed',
        logPath: 'z.log',
        changed: []
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls).some((label) => label.startsWith('save'))).toBe(false)
    expect(logText(log)).toContain('Not saved: the full check failed')
  })

  it('stops when there are unsaved changes before the session', async () => {
    const { agent, calls } = makeAgent({
      prepare: {
        ready: false,
        branch: 'main',
        reason: 'You have unsaved changes.'
      }
    })
    await runWorkflow(ARGS, { agent })
    expect(labels(calls)).toEqual(['classify', 'prepare'])
  })

  it('makes no gallery when nothing lands', async () => {
    const { agent, calls } = makeAgent({
      'build 1': {
        built: false,
        filesChanged: [],
        recipe: 'none',
        welshNeeded: false,
        notes: 'Which page?'
      },
      'build 2': {
        built: false,
        filesChanged: [],
        recipe: 'none',
        welshNeeded: false,
        notes: 'Which page?'
      },
      'build 3': {
        built: false,
        filesChanged: [],
        recipe: 'none',
        welshNeeded: false,
        notes: 'Which page?'
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).not.toContain('show')
    expect(logText(log)).toContain('Nothing landed')
  })

  describe('routing through references/ROUTING.md', () => {
    const classifyPrompt = (calls) =>
      calls.find((call) => call.opts.label === 'classify').prompt

    it('reads the routing from references/ROUTING.md, never AGENTS.md or CLAUDE.md', async () => {
      const { agent, calls } = makeAgent()
      await runWorkflow(ARGS, { agent })
      const prompt = classifyPrompt(calls)
      expect(prompt).toContain(
        'Read ~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/ROUTING.md'
      )
      expect(prompt).toContain('"Working out what they want"')
      expect(prompt).toContain('"Outcomes" and "Phrases" tables')
      expect(prompt).not.toContain('AGENTS.md')
      expect(prompt).not.toContain('CLAUDE.md')
    })

    it('tells the judge to split vague notes, never to refuse them', async () => {
      const { agent, calls } = makeAgent()
      await runWorkflow(ARGS, { agent })
      const prompt = classifyPrompt(calls)
      expect(prompt).toContain('Never refuse a request for being vague')
      expect(prompt).not.toContain('too vague to build')
    })
  })

  describe('a request split into parts', () => {
    const VAGUE = {
      set: SET,
      requests: [
        "Change the hint on origin to 'The country the plants were grown in'",
        'The dashboard should show which ones are overdue'
      ]
    }
    const SPLIT_FILES = {
      1: FILES[1],
      2.1: [`src/server/prototype-seed/scenarios/${SET}.js`],
      2.2: [
        `${FEATURES}/dashboard/controller.js`,
        'src/server/app/services/notification-search/stub.js'
      ]
    }
    const SPLIT_ROUTES = [
      { ...ROUTES[0], part: VAGUE.requests[0] },
      {
        index: 2,
        part: 'Add two late example notifications',
        skill: 'example-data',
        pages: ['dashboard'],
        refused: false,
        reason: 'Read "overdue" as late.'
      },
      {
        index: 2,
        part: 'Add a late filter, a late count and a red late tag to the dashboard',
        skill: 'fake-a-service',
        pages: ['dashboard'],
        refused: false,
        reason: ''
      }
    ]
    const classifyWith = (requests) => ({
      classify: {
        releaseOk: true,
        releaseMissing: false,
        releaseReason: '',
        sessionSlug: 'overdue',
        requests
      }
    })

    it('builds, keeps and saves each part on its own', async () => {
      const { agent, calls } = makeAgent(
        classifyWith(SPLIT_ROUTES),
        SPLIT_FILES
      )
      const log = vi.fn()
      await runWorkflow(VAGUE, { agent, log })

      expect(labels(calls)).toEqual([
        'classify',
        'prepare',
        'build 1',
        'check 1',
        'keep 1',
        'build 2.1',
        'check 2.1',
        'keep 2.1',
        'build 2.2',
        'check 2.2',
        'keep 2.2',
        'show',
        'full check',
        'save 1',
        'save 2.1',
        'save 2.2'
      ])
      const text = logText(log)
      expect(text).toContain(
        'Request 2 ("The dashboard should show which ones are overdue") was split into 2 parts: 2.1, 2.2.'
      )
      expect(text).toContain(
        '2.2. Landed (fake-a-service), saved as abc2.2: Add a late filter'
      )
    })

    it('tells each builder the whole request and only its own part', async () => {
      const { agent, calls } = makeAgent(
        classifyWith(SPLIT_ROUTES),
        SPLIT_FILES
      )
      await runWorkflow(VAGUE, { agent })
      const build = calls.find((call) => call.opts.label === 'build 2.2').prompt
      expect(build).toContain(`"${VAGUE.requests[1]}"`)
      expect(build).toContain(
        'This step makes only this part of it: "Add a late filter, a late count and a red late tag to the dashboard"'
      )
      expect(build).toContain(
        '~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/fake-a-service.md'
      )
      const single = calls.find((call) => call.opts.label === 'build 1').prompt
      expect(single).not.toContain('This step makes only this part')
    })

    it('still builds the other parts when one part is refused', async () => {
      const routes = [
        SPLIT_ROUTES[0],
        SPLIT_ROUTES[1],
        {
          ...SPLIT_ROUTES[2],
          skill: 'none',
          refused: true,
          reason: "Printing a sheet is research: say 'get ready for research'."
        }
      ]
      const { agent, calls } = makeAgent(classifyWith(routes), SPLIT_FILES)
      const log = vi.fn()
      await runWorkflow(VAGUE, { agent, log })
      expect(labels(calls)).toContain('save 2.1')
      expect(labels(calls)).not.toContain('build 2.2')
      expect(logText(log)).toContain(
        "2.2. Not done: Add a late filter, a late count and a red late tag to the dashboard. Printing a sheet is research: say 'get ready for research'."
      )
    })
  })

  describe('guard rails', () => {
    it('allow the prototype-owned services and their support code, and no other service', async () => {
      const { agent, calls } = makeAgent()
      await runWorkflow(ARGS, { agent })
      const build = calls.find((call) => call.opts.label === 'build 1').prompt
      for (const name of [
        'transporters',
        'templates',
        'ins-address-book',
        'notification-search'
      ]) {
        expect(build).toContain(`src/server/app/services/${name}/`)
      }
      expect(build).toContain('src/server/prototype-support/')
      expect(build).toContain(
        'Never change any other folder under src/server/app/services/'
      )
      // The old home of the fakes, spelt in two halves so no file names it.
      expect(build).not.toContain(['prototype', 'services'].join('-'))
    })

    it('never touches the workspace repo: every command names the prototype repo', async () => {
      const { agent, calls } = makeAgent()
      await runWorkflow(ARGS, { agent })
      const build = calls.find((call) => call.opts.label === 'build 1').prompt
      expect(build).toContain(REPO)
    })
  })

  describe("a designer's mandate", () => {
    const WITH_MANDATE = { ...ARGS, designerMandate: { id: MANDATE_ID } }
    const PATTERN_FILES = `src/server/app/sets/${SET}/assets/**, src/server/app/sets/${SET}/layout.njk, src/server/app/sets/${SET}/patterns.md or src/server/app/sets/${SET}/mandates.md`
    const NO_MANDATE_RAIL = `- This session has no designer's mandate. Never create or change ${PATTERN_FILES}, and never add an app-* class.`
    const promptOf = (calls, label) =>
      calls.find((call) => call.opts.label === label).prompt
    const builderPrompts = (calls) =>
      calls
        .filter(
          (call) =>
            call.opts.label.startsWith('build') ||
            call.opts.label.startsWith('repair')
        )
        .map((call) => call.prompt)
    const failingOnce = (count) => ({
      passed: count > 1,
      summary: 'Release styles and scripts failed',
      logPath: 'x.log',
      changed: []
    })

    it('reads the recorded words back before classifying, with the mandate show command', async () => {
      const { agent, calls } = makeAgent()
      await runWorkflow(WITH_MANDATE, { agent })
      expect(labels(calls).slice(0, 3)).toEqual([
        'confirm mandate',
        'classify',
        'prepare'
      ])
      expect(promptOf(calls, 'confirm mandate')).toContain(
        `Run: npm --prefix ${REPO} run designer:mandate -- show --set ${SET} --id ${MANDATE_ID}`
      )
    })

    it("quotes the designer's words, scope and id in every builder's brief, and lets it build a release pattern", async () => {
      const { agent, calls } = makeAgent({ 'check 1': failingOnce })
      await runWorkflow(WITH_MANDATE, { agent })
      const briefs = builderPrompts(calls)
      expect(briefs).toHaveLength(4)
      for (const brief of briefs) {
        expect(brief).toContain(`DESIGNER'S MANDATE ${MANDATE_ID}`)
        expect(brief).toContain(`  Words: "${MANDATE_WORDS}"`)
        expect(brief).toContain('  Scope: commodity-search')
        expect(brief).toContain(`Asked by: "${MANDATE_WORDS}" (${MANDATE_ID})`)
        expect(brief).toContain(
          'Climb the ladder first: GOV.UK Frontend, then MoJ Frontend.'
        )
        expect(brief).toContain(
          'Give every patterns.md entry you add Status: Option, for the designer to choose, even when you build only one.'
        )
        expect(brief).toContain(
          `Never create or change src/server/app/sets/${SET}/mandates.md, and never run designer:mandate.`
        )
        expect(brief).toContain('No script checks the scope')
        expect(brief).not.toContain(NO_MANDATE_RAIL)
      }
    })

    it('runs every check against the starting commit and the mandate, without the no-new-patterns flag', async () => {
      const { agent, calls } = makeAgent({ 'check 1': failingOnce })
      await runWorkflow(WITH_MANDATE, { agent })
      for (const label of ['check 1', 'recheck 1', 'check 2', 'full check']) {
        expect(promptOf(calls, label)).toContain(
          `--since ${BASE_COMMIT} --mandate ${MANDATE_ID}`
        )
        expect(promptOf(calls, label)).not.toContain('--no-new-patterns')
      }
      expect(promptOf(calls, 'repair 1')).toContain(
        `If it says a pattern must cite the designer's mandate ${MANDATE_ID}, or must be an Option`
      )
    })

    it('stops before any change under a mandate with no starting commit', async () => {
      const { agent, calls } = makeAgent({
        prepare: { ready: true, branch: 'main', baseCommit: '', reason: '' }
      })
      await runWorkflow(WITH_MANDATE, { agent })
      expect(labels(calls)).toEqual(['confirm mandate', 'classify', 'prepare'])
    })

    it('offers the custom-pattern reference to the judge only under a mandate', async () => {
      const withMandate = makeAgent()
      await runWorkflow(WITH_MANDATE, { agent: withMandate.agent })
      expect(promptOf(withMandate.calls, 'classify')).toContain(
        'fake-a-service, custom-pattern'
      )

      const without = makeAgent()
      await runWorkflow(ARGS, { agent: without.agent })
      expect(promptOf(without.calls, 'classify')).not.toContain(
        'custom-pattern'
      )
      expect(promptOf(without.calls, 'classify')).toContain(
        'Ask in your own words, with what you want research to learn, and it can be built.'
      )
    })

    it('builds a custom-pattern part with the full check under a mandate', async () => {
      const routes = [
        { ...ROUTES[0], skill: 'custom-pattern' },
        ROUTES[1],
        ROUTES[2]
      ]
      const { agent, calls } = makeAgent({
        classify: {
          releaseOk: true,
          releaseMissing: false,
          releaseReason: '',
          sessionSlug: 'x',
          requests: routes
        }
      })
      await runWorkflow(WITH_MANDATE, { agent })
      expect(promptOf(calls, 'build 1')).toContain(
        '~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/custom-pattern.md'
      )
      expect(promptOf(calls, 'check 1')).toContain('--full')
    })

    it('refuses a custom-pattern part when no mandate was given', async () => {
      const routes = [
        { ...ROUTES[0], skill: 'custom-pattern' },
        ROUTES[1],
        ROUTES[2]
      ]
      const { agent, calls } = makeAgent({
        classify: {
          releaseOk: true,
          releaseMissing: false,
          releaseReason: '',
          sessionSlug: 'x',
          requests: routes
        }
      })
      await runWorkflow(ARGS, { agent })
      expect(labels(calls)).not.toContain('build 1')
    })

    it('lists every pattern patterns.md shows this session added or changed, the options for the designer to choose, and picks none', async () => {
      const { agent, calls } = makeAgent({
        'list patterns': {
          patterns: [
            { name: 'Commodity search: list', status: 'Option' },
            { name: 'Commodity search: cards', status: 'Option' },
            { name: 'Tabs on the dashboard', status: 'Open' }
          ]
        }
      })
      const log = vi.fn()
      await runWorkflow(WITH_MANDATE, { agent, log })
      expect(promptOf(calls, 'list patterns')).toContain(
        `Run: git -C ${REPO} diff ${BASE_COMMIT} -- src/server/app/sets/${SET}/patterns.md`
      )
      expect(logText(log)).toContain(
        `Options for you to choose, in src/server/app/sets/${SET}/patterns.md: "Commodity search: list", "Commodity search: cards". Say which to keep, and the others are closed.`
      )
      expect(logText(log)).toContain(
        `Release patterns this session changed, in src/server/app/sets/${SET}/patterns.md: "Tabs on the dashboard" (Open).`
      )
    })

    it('never lists patterns when there is no mandate', async () => {
      const { agent, calls } = makeAgent()
      await runWorkflow(ARGS, { agent })
      expect(labels(calls)).not.toContain('list patterns')
    })

    it('says so and keeps the rail when the mandate cannot be read', async () => {
      const { agent, calls } = makeAgent({
        'confirm mandate': {
          found: false,
          words: '',
          scope: '',
          reason: 'No mandate m-2026-10-27-1 in this release.'
        }
      })
      const log = vi.fn()
      await runWorkflow(WITH_MANDATE, { agent, log })
      for (const brief of builderPrompts(calls)) {
        expect(brief).toContain(NO_MANDATE_RAIL)
        expect(brief).not.toContain("DESIGNER'S MANDATE")
      }
      expect(promptOf(calls, 'check 1')).toContain(
        `--since ${BASE_COMMIT} --no-new-patterns`
      )
      expect(logText(log)).toContain(
        `The designer's mandate ${MANDATE_ID} could not be read from src/server/app/sets/${SET}/mandates.md (No mandate m-2026-10-27-1 in this release.), so this session built no release patterns.`
      )
    })

    it('puts the explicit rail in every builder brief when there is no mandate', async () => {
      const { agent, calls } = makeAgent({ 'check 1': failingOnce })
      await runWorkflow(ARGS, { agent })
      const briefs = builderPrompts(calls)
      expect(briefs).toHaveLength(4)
      for (const brief of briefs) {
        expect(brief).toContain(NO_MANDATE_RAIL)
        expect(brief).toContain(
          'build the nearest GOV.UK option and add a row to src/server/app/sets/plants-working/design-gaps.md'
        )
      }
      expect(promptOf(calls, 'repair 1')).toContain(
        'Never edit mandates.md or patterns.md to make it pass.'
      )
    })

    it('checks every change and the full check against the starting commit when there is no mandate', async () => {
      const { agent, calls } = makeAgent({ 'check 1': failingOnce })
      await runWorkflow(ARGS, { agent })
      for (const label of ['check 1', 'recheck 1', 'check 2', 'full check']) {
        expect(promptOf(calls, label)).toContain(
          `--since ${BASE_COMMIT} --no-new-patterns`
        )
      }
      expect(promptOf(calls, 'prepare')).toContain(
        `Run: git -C ${REPO} rev-parse HEAD`
      )
    })

    it('stops before any change when there is no starting commit', async () => {
      const { agent, calls } = makeAgent({
        prepare: {
          ready: true,
          branch: 'main',
          baseCommit: '',
          reason: ''
        }
      })
      const log = vi.fn()
      await runWorkflow(ARGS, { agent, log })
      expect(labels(calls)).toEqual(['classify', 'prepare'])
      expect(logText(log)).toContain(
        'Stopped before any change: the prepare step did not give the starting commit'
      )
    })
  })
})
