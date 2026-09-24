import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCapture } from './run.js'

const here = dirname(fileURLToPath(import.meta.url))
const FIXTURE_TRACE = join(here, '__fixtures__', 'journey-trace.zip')

const WORKAREA = 'shared/programme'
const APP = 'animals-frontend'
const TRACE_TEST = 'journey-walks-part-of-the-journey'

const FLOW_MODULE = `
export const sections = [
  { id: 'start', pages: [{ id: 'dashboard', slug: '' }] },
  { id: 'origin', pages: [{ id: 'origin', slug: 'origin' }] },
  {
    id: 'commodities',
    pages: [
      { id: 'commodities', slug: 'commodities' },
      { id: 'animalIdentification', slug: 'commodities/identification' }
    ]
  },
  { id: 'addresses', pages: [{ id: 'cphNumber', slug: 'cph-number' }] }
]
`

const APP_CONFIG = {
  repo: 'repos/animals-frontend',
  fitScript: 'test:fit',
  projects: ['journeys'],
  flow: 'src/flow/flow.js',
  pagePath: '/notifications/{journeyId}/{slug}'
}

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedWorkspace = async ({
  apps = { [APP]: APP_CONFIG },
  flow = FLOW_MODULE
} = {}) => {
  root = mkdtempSync(join(tmpdir(), 'tim-capture-run-'))
  const workarea = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(join(workarea, 'capture.json'), JSON.stringify({ apps }))

  const repoPath = join(root, 'repos', 'animals-frontend')
  mkdirSync(join(repoPath, 'src', 'flow'), { recursive: true })
  writeFileSync(join(repoPath, 'package.json'), '{"type":"module"}')
  writeFileSync(join(repoPath, 'src', 'flow', 'flow.js'), flow)
  await execa('git', ['init', '--quiet', '-b', 'main', repoPath])
  await execa(
    'git',
    [
      '-c',
      'user.name=tim-test',
      '-c',
      'user.email=tim-test@example.invalid',
      'commit',
      '--quiet',
      '--allow-empty',
      '-m',
      'initial'
    ],
    { cwd: repoPath }
  )
  const { stdout } = await execa('git', ['rev-parse', 'HEAD'], {
    cwd: repoPath
  })
  return { repoPath, sha: stdout.trim() }
}

// Stands in for the browser run: the real suite leaves trace zips in the
// output folder, so the fake leaves the recorded one there.
const fitRunLeaving =
  (traceNames, exitCode = 0) =>
  async ({ outputDir }) => {
    for (const name of traceNames) {
      mkdirSync(join(outputDir, name), { recursive: true })
      copyFileSync(FIXTURE_TRACE, join(outputDir, name, 'trace.zip'))
    }
    return {
      command: 'npm run test:fit',
      exitCode,
      durationMs: 100,
      passed: exitCode === 0
    }
  }

const capture = (overrides = {}) =>
  runCapture({
    workspaceRoot: root,
    workarea: WORKAREA,
    app: APP,
    runFit: fitRunLeaving([TRACE_TEST]),
    ...overrides
  })

describe('runCapture', () => {
  test('says which pages the suite reached and which it did not', async () => {
    await seedWorkspace()

    const result = await capture()

    expect({
      reached: result.pages
        .filter(({ reached }) => reached)
        .map(({ id }) => id),
      gaps: result.gaps.map(({ id }) => id),
      reachedCount: result.reachedCount,
      pageCount: result.pageCount
    }).toEqual({
      reached: ['dashboard', 'origin', 'commodities', 'animalIdentification'],
      gaps: ['cphNumber'],
      reachedCount: 4,
      pageCount: 5
    })
  }, 60_000)

  test('names the trace that reached each page', async () => {
    await seedWorkspace()

    const result = await capture()

    expect(result.pages.at(1).reachedBy).toEqual([`${TRACE_TEST}.zip`])
  }, 60_000)

  test('keeps the traces and a manifest under the commit it captured', async () => {
    const { sha } = await seedWorkspace()

    const result = await capture()

    expect({
      captureDir: result.captureDir,
      manifest: JSON.parse(
        readFileSync(join(result.captureDir, 'manifest.json'), 'utf8')
      )
    }).toEqual({
      captureDir: join(root, 'workareas', WORKAREA, 'traces', APP, sha),
      manifest: expect.objectContaining({
        app: APP,
        repo: 'repos/animals-frontend',
        sha,
        command: 'npm run test:fit',
        suite: { exitCode: 0, passed: true, durationMs: 100 },
        traces: [{ file: `${TRACE_TEST}.zip`, test: TRACE_TEST }]
      })
    })
  }, 60_000)

  test('writes the coverage beside the traces', async () => {
    await seedWorkspace()

    const result = await capture()

    expect(
      JSON.parse(
        readFileSync(join(result.captureDir, 'coverage.json'), 'utf8')
      ).gaps.map(({ id }) => id)
    ).toEqual(['cphNumber'])
  }, 60_000)

  test('keeps the traces of a suite that failed and says it failed', async () => {
    await seedWorkspace()

    const result = await capture({ runFit: fitRunLeaving([TRACE_TEST], 1) })

    expect({
      passed: result.suite.passed,
      traces: result.traces.length
    }).toEqual({
      passed: false,
      traces: 1
    })
  }, 60_000)

  test('refuses to capture a commit that has already been captured', async () => {
    await seedWorkspace()
    await capture()

    await expect(capture()).rejects.toThrow('There is already a capture of')
  }, 60_000)

  test('refuses an app capture.json does not have', async () => {
    await seedWorkspace()

    await expect(capture({ app: 'plants-frontend' })).rejects.toThrow(
      'Can\'t find an app called "plants-frontend"'
    )
  })

  test('refuses a repo that is not cloned before running anything', async () => {
    await seedWorkspace({
      apps: { [APP]: { ...APP_CONFIG, repo: 'repos/not-cloned' } }
    })

    await expect(
      capture({
        runFit: async () => {
          throw new Error('the suite must not run')
        }
      })
    ).rejects.toThrow(/Can't find the repo at .*not-cloned/)
  })

  test('refuses a flow module it cannot read before running the suite', async () => {
    await seedWorkspace({ flow: 'export const sections = "not a list"' })

    await expect(
      capture({
        runFit: async () => {
          throw new Error('the suite must not run')
        }
      })
    ).rejects.toThrow('does not export "sections"')
  })

  test('reports no traces and every page as a gap when the suite recorded nothing', async () => {
    await seedWorkspace()

    const result = await capture({ runFit: fitRunLeaving([]) })

    expect({ traces: result.traces, gaps: result.gaps.length }).toEqual({
      traces: [],
      gaps: 5
    })
  }, 60_000)
})
