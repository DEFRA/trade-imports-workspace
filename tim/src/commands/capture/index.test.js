import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderCaptureText } from './index.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const fixtureTrace = join(
  here,
  '..',
  '..',
  'capture',
  '__fixtures__',
  'journey-trace.zip'
)

const WORKAREA = 'shared/programme'
const TRACE_TEST = 'journey-walks-part-of-the-journey'

const FLOW_MODULE = `
export const sections = [
  { id: 'start', pages: [{ id: 'dashboard', slug: '' }] },
  { id: 'origin', pages: [{ id: 'origin', slug: 'origin' }] },
  { id: 'addresses', pages: [{ id: 'cphNumber', slug: 'cph-number' }] }
]
`

// Stands in for the browser run the real script starts: it reads the --output
// folder tim forces on the command line and leaves a recorded trace there,
// which proves the arguments reach Playwright through `npm run <script> --`.
const FAKE_FIT = `
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outputDir = process.argv[process.argv.indexOf('--output') + 1]
mkdirSync(join(outputDir, '${TRACE_TEST}'), { recursive: true })
copyFileSync('${fixtureTrace}', join(outputDir, '${TRACE_TEST}', 'trace.zip'))
`

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const runTim = (args) =>
  execa('node', [cliPath, ...args, '--workspace', root], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

const seedWorkspace = async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-capture-cli-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')

  const workarea = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(
    join(workarea, 'capture.json'),
    JSON.stringify({
      apps: {
        'animals-frontend': {
          repo: 'repos/animals-frontend',
          fitScript: 'test:fit',
          projects: ['journeys'],
          flow: 'src/flow/flow.js',
          pagePath: '/notifications/{journeyId}/{slug}'
        }
      }
    })
  )

  const repoPath = join(root, 'repos', 'animals-frontend')
  mkdirSync(join(repoPath, 'src', 'flow'), { recursive: true })
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify({
      name: 'animals-frontend',
      type: 'module',
      scripts: { 'test:fit': 'node fake-fit.mjs' }
    })
  )
  writeFileSync(join(repoPath, 'fake-fit.mjs'), FAKE_FIT)
  writeFileSync(join(repoPath, 'src', 'flow', 'flow.js'), FLOW_MODULE)
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
}

describe('tim capture', () => {
  test('runs the suite and reports the pages it did not reach', async () => {
    await seedWorkspace()

    const run = await runTim([
      'capture',
      WORKAREA,
      '--app',
      'animals-frontend',
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      envelope: JSON.parse(run.stdout.trim())
    }).toEqual({
      exitCode: 0,
      envelope: expect.objectContaining({
        ok: true,
        errors: [],
        result: expect.objectContaining({
          app: 'animals-frontend',
          traces: [{ file: `${TRACE_TEST}.zip`, test: TRACE_TEST }],
          gaps: [expect.objectContaining({ id: 'cphNumber', reached: false })],
          reachedCount: 2,
          pageCount: 3
        })
      })
    })
  }, 120_000)

  test('refuses an app capture.json does not have', async () => {
    await seedWorkspace()

    const run = await runTim(['capture', WORKAREA, '--app', 'plants-frontend'])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr:
        'Can\'t find an app called "plants-frontend" in capture.json. It has: animals-frontend.'
    })
  }, 30_000)

  test('says where it looked when the workarea has no capture.json', async () => {
    await seedWorkspace()

    const run = await runTim([
      'capture',
      'shared/nothing',
      '--app',
      'animals-frontend'
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: 2,
      stderr: expect.stringContaining("Can't find")
    })
  }, 30_000)
})

describe('renderCaptureText', () => {
  test('lists each page, says whether the suite passed, and counts the gaps', () => {
    expect(
      renderCaptureText({
        app: 'animals-frontend',
        sha: '0f3c9a1b2c3d4e5f',
        captureDir:
          '/ws/workareas/shared/programme/traces/animals-frontend/0f3c9a1b2c3d4e5f',
        suite: { passed: true, exitCode: 0 },
        traces: [{ file: 'journey.zip' }],
        pages: [
          { section: 'start', id: 'dashboard', slug: '', reached: true },
          {
            section: 'addresses',
            id: 'cphNumber',
            slug: 'cph-number',
            reached: false
          }
        ],
        gaps: [{ id: 'cphNumber' }],
        pageCount: 2
      })
    ).toBe(
      [
        'Captured animals-frontend at 0f3c9a1b2c3d. The FIT suite passed.',
        '1 trace in /ws/workareas/shared/programme/traces/animals-frontend/0f3c9a1b2c3d4e5f.',
        '  reached  section    page       slug',
        '  yes      start      dashboard',
        '  NO       addresses  cphNumber  cph-number',
        '1 of 2 pages not reached. Write specs for: cphNumber.'
      ].join('\n')
    )
  })

  test('says the suite failed and with what exit code', () => {
    expect(
      renderCaptureText({
        app: 'animals-frontend',
        sha: '0f3c9a1b2c3d4e5f',
        captureDir: '/captures',
        suite: { passed: false, exitCode: 1 },
        traces: [],
        pages: [{ section: 'start', id: 'dashboard', slug: '', reached: true }],
        gaps: [],
        pageCount: 1
      }).split('\n')
    ).toEqual([
      'Captured animals-frontend at 0f3c9a1b2c3d. The FIT suite failed — it exited 1.',
      '0 traces in /captures.',
      '  reached  section  page       slug',
      '  yes      start    dashboard',
      'The suite reached every page.'
    ])
  })
})
