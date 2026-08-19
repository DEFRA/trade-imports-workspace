import { describe, it, expect } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  existsSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveMapPaths, runMap } from './run.js'
import { parseMap } from './schema.js'

const workarea = () => mkdtempSync(join(tmpdir(), 'tim-cartography-'))

const profileFor = (root, over = {}) => ({
  sideIds: ['frontend'],
  sideById: {
    frontend: {
      id: 'frontend',
      repo: 'frontend',
      screenPrefix: 'fe-',
      modelDir: join(root, 'model'),
      app: { baseURL: 'http://localhost:3000', startPath: '/' },
      ...over
    }
  },
  repos: { frontend: { absolutePath: null } },
  paths: { workarea: root }
})

const page = (over = {}) => ({
  h1: 'A page',
  title: 'A page',
  taskItems: [],
  summaryRows: [],
  links: [],
  forms: [],
  allFields: [],
  errorSummary: { items: [] },
  ...over
})

const fakeDriver = () => {
  let url = '/start'
  return {
    reset: async () => {
      url = '/start'
    },
    url: () => url,
    model: async () =>
      url === '/start'
        ? page({
            h1: 'What is your full name?',
            forms: [{ action: '/next', buttons: [{ text: 'Continue' }] }]
          })
        : page({ h1: 'Notification submitted' }),
    controls: async () =>
      url === '/start'
        ? [{ kind: 'text', name: 'fullName', label: 'Full name' }]
        : [],
    perform: async (step) => {
      if (step.kind === 'submit') url = '/confirmation'
      return { done: true }
    },
    close: async () => {}
  }
}

const run = (root, opts = {}) =>
  runMap({
    profile: profileFor(root),
    workspaceRoot: root,
    side: 'frontend',
    open: async () => fakeDriver(),
    ...opts
  })

describe('resolveMapPaths', () => {
  it('files the map and its hints in the corpus own cartography folder', () => {
    const root = workarea()

    const paths = resolveMapPaths({
      profile: profileFor(root),
      side: 'frontend'
    })

    expect([paths.mapPath, paths.hintsPath]).toEqual([
      join(root, 'cartography', 'map.frontend.json'),
      join(root, 'cartography', 'hints.frontend.json')
    ])
  })

  it('names the sides it does have when asked for one it does not', () => {
    const root = workarea()

    expect(() =>
      resolveMapPaths({ profile: profileFor(root), side: 'nope' })
    ).toThrow(/Unknown side "nope". This corpus has: frontend./)
  })

  it('keeps its own page models out of the corpus model directory', () => {
    const root = workarea()

    const paths = resolveMapPaths({
      profile: profileFor(root),
      side: 'frontend'
    })

    expect(paths.modelDir).toBe(join(root, 'cartography', 'models', 'frontend'))
  })
})

describe('runMap', () => {
  it('asks where the application is running when nothing says', async () => {
    const root = workarea()
    const profile = profileFor(root, { app: null })

    await expect(
      runMap({
        profile,
        workspaceRoot: root,
        side: 'frontend',
        open: async () => fakeDriver()
      })
    ).rejects.toThrow(/Pass --base-url/)
  })

  it('reports the coverage of what it mapped', async () => {
    const root = workarea()

    const result = await run(root)

    expect(result.coverage).toEqual({
      screensMapped: 2,
      routeTemplatesSeen: 2,
      frontierRemaining: 0,
      unfilledFields: 0,
      blockedScreens: 0
    })
  })

  it('writes nothing until it is told to', async () => {
    const root = workarea()

    const result = await run(root)

    expect([result.written, existsSync(result.mapPath)]).toEqual([false, false])
  })

  it('writes a map its own schema accepts', async () => {
    const root = workarea()

    const result = await run(root, { write: true })
    const written = JSON.parse(readFileSync(result.mapPath, 'utf8'))

    expect(() => parseMap(written, result.mapPath)).not.toThrow()
  })

  it('writes one page model per screen, in its own directory', async () => {
    const root = workarea()

    const result = await run(root, { write: true })

    expect(readdirSync(result.modelDir).sort()).toEqual([
      'fe-confirmation.json',
      'fe-start.json'
    ])
  })

  it('leaves the corpus own page models exactly as it found them', async () => {
    const root = workarea()
    const corpusModels = join(root, 'model')
    mkdirSync(corpusModels, { recursive: true })
    writeFileSync(join(corpusModels, 'fe-check-answers.json'), '{}\n', 'utf8')

    await run(root, { write: true })

    expect(readdirSync(corpusModels)).toEqual(['fe-check-answers.json'])
  })

  it('deletes yesterday route plan when nothing can be walked again', async () => {
    const root = workarea()
    const planPath = join(root, 'cartography', 'frontend.routes.json')
    mkdirSync(join(root, 'cartography'), { recursive: true })
    writeFileSync(planPath, '{"routes":[{"screen":"fe-gone"}]}\n', 'utf8')

    const result = await run(root, { write: true, budgets: { steps: 0 } })

    expect([result.routePlanWritten, result.routePlanRemoved]).toEqual([
      false,
      true
    ])
    expect(existsSync(planPath)).toBe(false)
  })

  it('writes the route plan the capture stage refuses to walk without', async () => {
    const root = workarea()

    const result = await run(root, { write: true })
    const plan = JSON.parse(readFileSync(result.routePlanPath, 'utf8'))

    expect(plan.routes.map((route) => route.screen)).toEqual([
      'fe-start',
      'fe-confirmation'
    ])
  })

  it('refuses to write a map its own schema would reject', async () => {
    const root = workarea()
    const rogue = { ...fakeDriver(), model: async () => page({ title: 42 }) }

    await expect(
      run(root, { write: true, open: async () => rogue })
    ).rejects.toThrow(/is not a usable map/)
  })

  it('writes a hints stub so the next run can be seeded by hand', async () => {
    const root = workarea()

    const result = await run(root, { write: true })
    const hints = JSON.parse(readFileSync(result.hintsPath, 'utf8'))

    expect(hints.side).toBe('frontend')
  })

  it('passes --check on a map that reached everything', async () => {
    const root = workarea()

    const result = await run(root, { check: true })

    expect([result.blockers, result.exitNonZero]).toEqual([[], false])
  })
})
