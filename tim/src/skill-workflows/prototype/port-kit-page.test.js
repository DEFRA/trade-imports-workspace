import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SCRIPT = readFileSync(
  new URL(
    '../../../../.claude/skills/prototype/workflow/port-kit-page.js',
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

const ARGS = {
  set: 'plants-working',
  source:
    '.claude/skills/prototype/references/port-a-kit-page/examples/transporter-type.kit.html',
  sourceKind: 'html',
  slug: 'transporter-type',
  after: 'arrival-details',
  reference: null
}

const BASE_COMMIT = '3f2a9c1d'
const MANDATE_ID = 'm-2026-10-27-1'
const MANDATE_WORDS =
  'rebuild the old transporter cards, we are testing them in round 3'

const INVENTORY = {
  title: 'Choose a transporter type',
  pageKind: 'data-collecting',
  headings: [{ level: 1, text: 'Choose a transporter type' }],
  components: ['warning text', 'radios (hand-written)'],
  strings: [{ role: 'heading', text: 'Choose a transporter type' }],
  fields: [{ name: 'transporterType', type: 'radios', label: 'Type' }],
  reveals: [],
  appClasses: ['app-transporter-add-page'],
  links: [],
  scripts: [],
  notes: []
}

const answers = (overrides = {}) => {
  const checks = overrides.checks ?? [true]
  let checkIndex = 0
  const byLabel = {
    preflight: () =>
      overrides.preflight ?? {
        ok: true,
        baseCommit: BASE_COMMIT,
        reason: 'Ready.'
      },
    'confirm mandate': () =>
      overrides.mandate ?? {
        found: true,
        words: MANDATE_WORDS,
        scope: 'transporter-type',
        reason: ''
      },
    inventory: () => INVENTORY,
    build: () =>
      overrides.build ?? {
        built: true,
        recipe: 'add-a-page',
        filesChanged: ['src/server/app/sets/plants-working/x/template.njk'],
        leftOut: [],
        notes: ''
      },
    show: () => ({
      ran: true,
      galleryPath: '.cache/designer/show/plants-working/1',
      screenshots: ['transporter-type.png'],
      axeFindings: [],
      summary: 'ok'
    }),
    fidelity: () => ({
      rows: [
        {
          original: 'Warning text',
          built: 'govukWarningText',
          verdict: 'matched',
          why: 'Same component.'
        }
      ],
      gapRows: [
        '| transporter-type | Bespoke heading | govuk-heading-l | No Sass. | x |'
      ],
      summary: 'Close match.'
    }),
    'write records': () => 'done',
    'list patterns': () => overrides.patterns ?? { patterns: [] }
  }
  return vi.fn(async (_prompt, opts) => {
    if (opts.label.startsWith('check')) {
      const passed = checks[Math.min(checkIndex, checks.length - 1)]
      checkIndex++
      return {
        passed,
        summary: passed ? 'All passed' : 'Copy shape failed',
        logPath: 'x.log'
      }
    }
    if (opts.label.startsWith('repair')) {
      return byLabel.build()
    }
    return byLabel[opts.label]()
  })
}

const labels = (agent) => agent.mock.calls.map(([, opts]) => opts.label)
const promptFor = (agent, label) =>
  agent.mock.calls.find(([, opts]) => opts.label === label)[0]

describe('port-kit-page workflow', () => {
  let agent

  beforeEach(() => {
    agent = answers()
  })

  it('Should stop before any agent when a required key is missing', async () => {
    const { reference, ...withoutReference } = ARGS
    await expect(runWorkflow(withoutReference, { agent })).rejects.toThrow(
      'port-kit-page: args is missing required key reference. Pass every one in args: this workflow has no defaults'
    )
    expect(agent).not.toHaveBeenCalled()
    expect(reference).toBeNull()
  })

  it('Should name every missing key when args are absent', async () => {
    await expect(runWorkflow(undefined, { agent })).rejects.toThrow(
      'missing required keys set, source, sourceKind, slug, after, reference'
    )
    expect(agent).not.toHaveBeenCalled()
  })

  it('Should log the resolved configuration before anything else', async () => {
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(log.mock.calls[0][0]).toBe(
      `port-kit-page: resolved configuration ${JSON.stringify(ARGS)}`
    )
  })

  it('Should accept args as a JSON string', async () => {
    await runWorkflow(JSON.stringify(ARGS), { agent })
    expect(labels(agent)[0]).toBe('preflight')
  })

  it.each([
    [{ set: 'high-risk-plants' }, 'high-risk-plants is not a design release'],
    [{ set: 'sample-journey' }, 'sample-journey is not a design release'],
    [{ sourceKind: 'pdf' }, 'sourceKind must be one of html, url, screenshot'],
    [{ slug: 'Transporter Type' }, 'slug must be lower-case words'],
    [{ reference: 3 }, 'reference must be an image path or null']
  ])('Should refuse %j before any agent', async (change, message) => {
    await expect(
      runWorkflow({ ...ARGS, ...change }, { agent })
    ).rejects.toThrow(message)
    expect(agent).not.toHaveBeenCalled()
  })

  it('Should change nothing when the preflight says no', async () => {
    agent = answers({
      preflight: { ok: false, reason: 'This is a frozen release.' }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(agent)).toEqual(['preflight'])
    expect(log).toHaveBeenLastCalledWith(
      'Stopped before any change: This is a frozen release.'
    )
  })

  it('Should run inventory, build, check, show and fidelity in order', async () => {
    await runWorkflow(ARGS, { agent })
    expect(labels(agent)).toEqual([
      'preflight',
      'inventory',
      'build',
      'check 1',
      'show',
      'fidelity',
      'write records'
    ])
  })

  it('Should give each step the model its tier names', async () => {
    await runWorkflow(ARGS, { agent })
    const modelOf = (label) =>
      agent.mock.calls.find(([, opts]) => opts.label === label)[1].model
    expect(modelOf('preflight')).toBe('haiku')
    expect(modelOf('inventory')).toBe('opus')
    expect(modelOf('build')).toBe('sonnet')
    expect(modelOf('fidelity')).toBe('opus')
  })

  it('Should route a data-collecting page to the add-a-page recipe', async () => {
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'build')).toContain(
      "references/change-the-journey.md's add-a-page recipe"
    )
    expect(promptFor(agent, 'build')).toContain(
      'comes straight after the page "arrival-details"'
    )
  })

  it('Should run the full check on the prototype repo', async () => {
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'check 1')).toContain(
      `npm --prefix ${REPO} run designer:check -- --set plants-working --full`
    )
  })

  it('Should show the page without a reference when none is given', async () => {
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'show')).toContain(
      `npm --prefix ${REPO} run designer:show -- --set plants-working --pages transporter-type\n`
    )
  })

  it('Should use a screenshot source as the reference image', async () => {
    await runWorkflow(
      { ...ARGS, sourceKind: 'screenshot', source: 'old.png' },
      { agent }
    )
    expect(promptFor(agent, 'show')).toContain(
      '--pages transporter-type --reference transporter-type=old.png'
    )
  })

  it('Should repair a failing check and carry on once it passes', async () => {
    agent = answers({ checks: [false, false, true] })
    await runWorkflow(ARGS, { agent })
    expect(labels(agent)).toEqual([
      'preflight',
      'inventory',
      'build',
      'check 1',
      'repair 1',
      'check 2',
      'repair 2',
      'check 3',
      'show',
      'fidelity',
      'write records'
    ])
  })

  it('Should park the port after 3 repairs, without showing or grading it', async () => {
    agent = answers({ checks: [false] })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(agent).filter((label) => label.startsWith('repair'))).toEqual(
      ['repair 1', 'repair 2', 'repair 3']
    )
    expect(labels(agent)).not.toContain('show')
    expect(log.mock.calls.at(-1)[0]).toMatch(/^Parked: /)
  })

  it('Should write the fidelity table and the gap rows at the full prototype-repo path', async () => {
    await runWorkflow(ARGS, { agent })
    const prompt = promptFor(agent, 'write records')
    expect(prompt).toContain(
      `${REPO}/src/server/app/sets/plants-working/docs/fidelity-transporter-type.md`
    )
    expect(prompt).toContain(
      '| 1 | Warning text | govukWarningText | matched | Same component. |'
    )
    expect(prompt).toContain(
      `${REPO}/src/server/app/sets/plants-working/design-gaps.md`
    )
    expect(prompt).toContain(
      '| transporter-type | Bespoke heading | govuk-heading-l | No Sass. | x |'
    )
  })

  it('never touches the workspace repo: every prototype command names the prototype repo', async () => {
    await runWorkflow(ARGS, { agent })
    for (const label of ['preflight', 'build', 'check 1', 'show']) {
      expect(promptFor(agent, label)).toContain(REPO)
    }
  })

  describe("a designer's mandate", () => {
    const WITH_MANDATE = { ...ARGS, designerMandate: { id: MANDATE_ID } }
    const NO_MANDATE_RAIL = `- This port has no designer's mandate. Never create or change ${REPO}/src/server/app/sets/plants-working/assets/**, ${REPO}/src/server/app/sets/plants-working/layout.njk, ${REPO}/src/server/app/sets/plants-working/patterns.md or ${REPO}/src/server/app/sets/plants-working/mandates.md, and never add an app-* class.`
    const builderPrompts = () =>
      agent.mock.calls
        .filter(([, opts]) => /^(build|repair)/.test(opts.label))
        .map(([prompt]) => prompt)

    it.each([
      [{ designerMandate: { id: 'yes' } }],
      [{ designerMandate: MANDATE_WORDS }]
    ])('Should refuse %j before any agent', async (change) => {
      await expect(
        runWorkflow({ ...ARGS, ...change }, { agent })
      ).rejects.toThrow('designerMandate must be { id }')
      expect(agent).not.toHaveBeenCalled()
    })

    it('Should read the recorded words back straight after the preflight', async () => {
      await runWorkflow(WITH_MANDATE, { agent })
      expect(labels(agent).slice(0, 3)).toEqual([
        'preflight',
        'confirm mandate',
        'inventory'
      ])
      expect(promptFor(agent, 'confirm mandate')).toContain(
        `Run: npm --prefix ${REPO} run designer:mandate -- show --set plants-working --id ${MANDATE_ID}`
      )
    })

    it("Should quote the designer's words and id in the build and every repair, and let them rebuild the old page's own code as a pattern", async () => {
      agent = answers({ checks: [false, true] })
      await runWorkflow(WITH_MANDATE, { agent })
      const briefs = builderPrompts()
      expect(briefs).toHaveLength(2)
      for (const brief of briefs) {
        expect(brief).toContain(`DESIGNER'S MANDATE ${MANDATE_ID}`)
        expect(brief).toContain(`  Words: "${MANDATE_WORDS}"`)
        expect(brief).toContain(`Asked by: "${MANDATE_WORDS}" (${MANDATE_ID})`)
        expect(brief).toContain('Never copy the Kit')
        expect(brief).not.toContain(NO_MANDATE_RAIL)
      }
      expect(promptFor(agent, 'build')).toContain(
        "rebuild each app-* class and custom script the designer's words cover as an app-plants-working- release pattern"
      )
      expect(promptFor(agent, 'build')).not.toContain(
        'Drop every app-* class and custom script.'
      )
      for (const label of ['check 1', 'check 2']) {
        expect(promptFor(agent, label)).toContain(
          `--full --since ${BASE_COMMIT} --mandate ${MANDATE_ID}`
        )
        expect(promptFor(agent, label)).not.toContain('--no-new-patterns')
      }
    })

    it("Should never tell a step of a port with a confirmed mandate that it has no designer's mandate", async () => {
      agent = answers({ checks: [false, true] })
      await runWorkflow(WITH_MANDATE, { agent })
      for (const [prompt] of agent.mock.calls) {
        expect(prompt).not.toContain("has no designer's mandate")
      }
    })

    it('Should list the options patterns.md shows the port added, for the designer to choose', async () => {
      agent = answers({
        patterns: {
          patterns: [
            { name: 'Transporter cards', status: 'Option' },
            { name: 'Older pattern', status: 'Open' }
          ]
        }
      })
      const log = vi.fn()
      await runWorkflow(WITH_MANDATE, { agent, log })
      expect(promptFor(agent, 'list patterns')).toContain(
        `Run: git -C ${REPO} diff ${BASE_COMMIT} -- src/server/app/sets/plants-working/patterns.md`
      )
      expect(log.mock.calls.at(-1)[0]).toContain(
        'Options for you to choose, in src/server/app/sets/plants-working/patterns.md: "Transporter cards". Say which to keep, and the others are closed.'
      )
    })

    it('Should refuse, in the preflight, a branch that is not main or design/', async () => {
      await runWorkflow(ARGS, { agent })
      expect(promptFor(agent, 'preflight')).toContain(
        `Run: git -C ${REPO} branch --show-current`
      )
      expect(promptFor(agent, 'preflight')).toContain(
        'ok is false unless the branch is main or starts with design/.'
      )
    })

    it('Should drop the custom code and check against the starting commit with no mandate', async () => {
      agent = answers({ checks: [false, true] })
      await runWorkflow(ARGS, { agent })
      for (const brief of builderPrompts()) {
        expect(brief).toContain(NO_MANDATE_RAIL)
        expect(brief).not.toContain("DESIGNER'S MANDATE")
      }
      expect(promptFor(agent, 'build')).toContain(
        '- Drop every app-* class and custom script. List each dropped thing in leftOut.'
      )
      expect(promptFor(agent, 'repair 1')).toContain(
        'Never edit mandates.md or patterns.md to make it pass.'
      )
      for (const label of ['check 1', 'check 2']) {
        expect(promptFor(agent, label)).toContain(
          `--full --since ${BASE_COMMIT} --no-new-patterns`
        )
      }
    })

    it('Should offer once to rebuild what it dropped when there is no mandate', async () => {
      agent = answers({
        build: {
          built: true,
          recipe: 'add-a-page',
          filesChanged: [],
          leftOut: ['app-transporter-add-page'],
          notes: ''
        }
      })
      const log = vi.fn()
      await runWorkflow(ARGS, { agent, log })
      expect(log.mock.calls.at(-1)[0]).toContain(
        "Left out of the old page's own look or behaviour: app-transporter-add-page. If research needs any of it, tell me what you want to learn and it can be rebuilt in your release."
      )
    })

    it('Should keep the rail and say so when the mandate cannot be read', async () => {
      agent = answers({
        mandate: { found: false, words: '', scope: '', reason: 'Not found.' }
      })
      const log = vi.fn()
      await runWorkflow(WITH_MANDATE, { agent, log })
      expect(promptFor(agent, 'build')).toContain(NO_MANDATE_RAIL)
      expect(promptFor(agent, 'check 1')).toContain('--no-new-patterns')
      expect(log.mock.calls.at(-1)[0]).toContain(
        `The designer's mandate ${MANDATE_ID} could not be read from src/server/app/sets/plants-working/mandates.md (Not found.), so this port rebuilt no release patterns.`
      )
    })

    it('Should stop before any change with no mandate and no starting commit', async () => {
      agent = answers({
        preflight: { ok: true, baseCommit: '', reason: 'Ready.' }
      })
      const log = vi.fn()
      await runWorkflow(ARGS, { agent, log })
      expect(labels(agent)).toEqual(['preflight'])
      expect(log.mock.calls.at(-1)[0]).toMatch(
        /^Stopped before any change: the preflight did not give the starting commit/
      )
    })
  })
})
