import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

const SCRIPT = readFileSync(
  new URL(
    '../../../../.claude/skills/prototype/workflow/prepare-handoff.js',
    import.meta.url
  ),
  'utf8'
)

const WORKSPACE = '~/git/defra/trade-imports-workspace'
const PLANTS_FRONTEND = `${WORKSPACE}/repos/trade-imports-plants-frontend`
const HANDOFF = `${WORKSPACE}/repos/trade-imports-plants-prototype/handoffs/2026-09-28-consignment-addresses`

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

const runWorkflow = (args, { agent, log = vi.fn(), phase = vi.fn() }) =>
  new AsyncFunction(
    'args',
    'agent',
    'phase',
    'log',
    SCRIPT.replace('export const meta', 'const meta')
  )(args, agent, phase, log)

const ARGS = {
  handoff: HANDOFF,
  ticket: 'EUDPA-621',
  route: 'auto',
  dryRun: true
}

const PLAN_ANSWER = {
  ok: true,
  problem: '',
  slug: 'consignment-addresses',
  title: 'Consignment addresses',
  route: 'C1',
  routeWhy: 'One frontend field, well within the C1 limit.',
  elements: [
    {
      description: "Rename 'Consignment parties' to 'Consignment addresses'",
      recipe: 'add-a-field',
      kind: 'frontend'
    }
  ],
  sources: [],
  frontendClean: true,
  frontendStartBranch: 'main'
}

const labels = (agent) => agent.mock.calls.map(([, opts]) => opts.label)
const promptFor = (agent, label) =>
  agent.mock.calls.find(([, opts]) => opts.label === label)?.[0]
const phaseLabels = (phase) => phase.mock.calls.map(([name]) => name)

const answers = (overrides = {}) => {
  const byLabel = {
    plan: () => overrides.plan ?? PLAN_ANSWER,
    'write distil request': () =>
      overrides.distil ?? {
        ok: true,
        path: `${HANDOFF}/distil-request.md`
      },
    'apply starting patch': () =>
      overrides.apply ?? {
        ok: true,
        summary: 'Applied.',
        changedFiles: ['src/server/app/copy.en.js']
      },
    'openspec delta': () =>
      overrides.spec ?? { ok: true, path: `${HANDOFF}/openspec.patch` },
    'commit locally': () =>
      overrides.commit ?? {
        ok: true,
        commit: 'abc1234',
        summary: 'Committed.'
      },
    'switch back': () =>
      overrides.back ?? { ok: true, summary: 'Back on main.' },
    park: () => ({})
  }
  return vi.fn(async (_prompt, opts) => {
    if (opts.label.startsWith('element ')) {
      const list = overrides.elements ?? [
        { ok: true, summary: 'Done.', changedFiles: ['a.njk'] }
      ]
      const index = Number(opts.label.split(' ')[1]) - 1
      return list[index] ?? list.at(-1)
    }
    if (opts.label.startsWith('ladder ')) {
      const list = overrides.ladder ?? [{ passed: true, failures: [] }]
      const index = Number(opts.label.split(' ')[1]) - 1
      return list[Math.min(index, list.length - 1)]
    }
    if (opts.label.startsWith('repair ')) {
      return (
        overrides.repair ?? { ok: true, summary: 'Fixed.', changedFiles: [] }
      )
    }
    const handler = byLabel[opts.label]
    if (!handler) {
      throw new Error(`unexpected agent label "${opts.label}"`)
    }
    return handler()
  })
}

describe('prepare-handoff: the args contract', () => {
  it('stops before any agent when a required key is missing', async () => {
    const { dryRun, ...withoutDryRun } = ARGS
    const agent = answers()
    await expect(runWorkflow(withoutDryRun, { agent })).rejects.toThrow(
      /missing required key dryRun/
    )
    expect(agent).not.toHaveBeenCalled()
    expect(dryRun).toBe(true)
  })

  it.each([
    [{ handoff: '' }, /handoff must be/],
    [{ ticket: 'eudpa-621' }, /ticket must be/],
    [{ ticket: 'EUDPA' }, /ticket must be/],
    [{ route: 'C3' }, /route must be one of/],
    [{ dryRun: 'true' }, /dryRun must be true or false/]
  ])('refuses %j before any agent', async (change, message) => {
    const agent = answers()
    await expect(
      runWorkflow({ ...ARGS, ...change }, { agent })
    ).rejects.toThrow(message)
    expect(agent).not.toHaveBeenCalled()
  })

  it('accepts NO_JIRA as a ticket', async () => {
    const agent = answers()
    const result = await runWorkflow({ ...ARGS, ticket: 'NO_JIRA' }, { agent })
    expect(result.branchName).toBe('feat/NO_JIRA-consignment-addresses')
  })
})

describe('prepare-handoff: dry run', () => {
  it('runs exactly one agent — the plan — and returns the plan without touching any repo', async () => {
    const agent = answers()
    const phase = vi.fn()
    const result = await runWorkflow(ARGS, { agent, phase })

    expect(labels(agent)).toEqual(['plan'])
    expect(phaseLabels(phase)).toEqual(['Plan'])
    expect(phaseLabels(phase)).not.toContain('Apply')
    expect(phaseLabels(phase)).not.toContain('Commit')

    expect(result.status).toBe('planned')
    expect(result.route).toBe('C1')
    expect(result.branchName).toBe('feat/EUDPA-621-consignment-addresses')
    expect(result.elements).toEqual(PLAN_ANSWER.elements)
    expect(result.parityQuote).toContain('feat/EUDPA-621-consignment-addresses')
  })

  it('never runs an agent whose prompt could write to a repo', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    for (const call of agent.mock.calls) {
      const [prompt] = call
      expect(prompt).toMatch(/Change nothing/)
      expect(prompt).not.toMatch(/git -C \S+ (switch -c|commit|apply)/)
    }
  })

  it('honours an explicit route over the plan agent’s own guess', async () => {
    const agent = answers({ plan: { ...PLAN_ANSWER, route: 'C1' } })
    const result = await runWorkflow({ ...ARGS, route: 'C2' }, { agent })
    expect(result.route).toBe('C2')
  })

  it('stops when the plan is not ok, before any repo is touched', async () => {
    const agent = answers({
      plan: { ...PLAN_ANSWER, ok: false, problem: 'No upstream.patch here.' }
    })
    const result = await runWorkflow(ARGS, { agent })
    expect(result.status).toBe('stopped')
    expect(result.reason).toBe('No upstream.patch here.')
    expect(labels(agent)).toEqual(['plan'])
  })
})

describe('prepare-handoff: route C2, real run', () => {
  it('writes the distil request and stops, touching no frontend repo', async () => {
    const agent = answers({
      plan: {
        ...PLAN_ANSWER,
        route: 'C2',
        sources: ['repo:trade-imports-plants-frontend']
      }
    })
    const result = await runWorkflow(
      { ...ARGS, route: 'C2', dryRun: false },
      { agent }
    )
    expect(labels(agent)).toEqual(['plan', 'write distil request'])
    expect(result.status).toBe('ready')
    expect(result.distilRequest).toBe(`${HANDOFF}/distil-request.md`)
    const prompt = promptFor(agent, 'write distil request')
    expect(prompt).toContain('repo:trade-imports-plants-frontend')
    expect(prompt).toContain('do not launch requirements-pipeline yourself')
    expect(labels(agent)).not.toContain('apply starting patch')
  })
})

describe('prepare-handoff: route C1, real run', () => {
  const REAL_ARGS = { ...ARGS, route: 'C1', dryRun: false }

  it('refuses when trade-imports-plants-frontend is not clean', async () => {
    const agent = answers({ plan: { ...PLAN_ANSWER, frontendClean: false } })
    const result = await runWorkflow(REAL_ARGS, { agent })
    expect(result.status).toBe('stopped')
    expect(result.reason).toMatch(/unsaved changes/)
    expect(labels(agent)).toEqual(['plan'])
  })

  it('refuses when already on the target branch', async () => {
    const agent = answers({
      plan: {
        ...PLAN_ANSWER,
        frontendStartBranch: 'feat/EUDPA-621-consignment-addresses'
      }
    })
    const result = await runWorkflow(REAL_ARGS, { agent })
    expect(result.status).toBe('stopped')
    expect(result.reason).toMatch(/already on/)
  })

  it('runs plan, apply, one element, the ladder, spec, commit and switch back in order', async () => {
    const agent = answers()
    const result = await runWorkflow(REAL_ARGS, { agent })
    expect(labels(agent)).toEqual([
      'plan',
      'apply starting patch',
      'element 1',
      'ladder 1',
      'openspec delta',
      'commit locally',
      'switch back'
    ])
    expect(result.status).toBe('ready')
    expect(result.commit).toBe('abc1234')
    expect(result.openspecPatch).toBe(`${HANDOFF}/openspec.patch`)
  })

  it('creates the branch from origin/main and applies the upstream patch by --3way', async () => {
    const agent = answers()
    await runWorkflow(REAL_ARGS, { agent })
    const prompt = promptFor(agent, 'apply starting patch')
    expect(prompt).toContain(
      `git -C ${PLANTS_FRONTEND} switch -c feat/EUDPA-621-consignment-addresses origin/main`
    )
    expect(prompt).toContain(
      `git -C ${PLANTS_FRONTEND} apply --3way ${HANDOFF}/upstream.patch`
    )
  })

  it('never pushes, opens a pull request or merges at any step', async () => {
    const agent = answers()
    await runWorkflow(REAL_ARGS, { agent })
    for (const [prompt] of agent.mock.calls) {
      expect(prompt).not.toMatch(/git push/)
      expect(prompt).not.toMatch(/gh pr (create|merge)/)
    }
  })

  it('repairs the ladder up to 3 times, then parks if it still fails', async () => {
    const agent = answers({
      ladder: [
        { passed: false, failures: [{ command: 'npm test', summary: 'x' }] }
      ]
    })
    const result = await runWorkflow(REAL_ARGS, { agent })
    const ladders = labels(agent).filter((label) => label.startsWith('ladder'))
    const repairs = labels(agent).filter((label) => label.startsWith('repair'))
    expect(ladders).toEqual(['ladder 1', 'ladder 2', 'ladder 3', 'ladder 4'])
    expect(repairs).toEqual(['repair 1', 'repair 2', 'repair 3'])
    expect(labels(agent)).toContain('park')
    expect(result.status).toBe('stopped')
    expect(result.reason).toMatch(/ladder still fails/)
  })

  it('stops without committing when an element fails', async () => {
    const agent = answers({
      elements: [{ ok: false, summary: 'Recipe refused.', changedFiles: [] }]
    })
    const result = await runWorkflow(REAL_ARGS, { agent })
    expect(labels(agent)).toEqual(['plan', 'apply starting patch', 'element 1'])
    expect(result.status).toBe('stopped')
    expect(result.reason).toBe('Recipe refused.')
  })

  it('follows the recipe for each element with the plants-frontend target profile', async () => {
    const agent = answers()
    await runWorkflow(REAL_ARGS, { agent })
    const prompt = promptFor(agent, 'element 1')
    expect(prompt).toContain('frontend-change')
    expect(prompt).toContain('high-risk-plants-frontend')
    expect(prompt).toContain('house-conventions.md')
  })
})
