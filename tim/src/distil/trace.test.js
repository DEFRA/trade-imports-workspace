import { describe, test, expect, afterEach } from 'vitest'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTrace, workspacePlaywrightsOf } from './trace.js'
import { compareVersions } from './trace-zip.js'
import { makeDistilWorkspace } from '../test-support/distil-workspace.js'
import { makeZip } from '../test-support/zip-file.js'

const here = dirname(fileURLToPath(import.meta.url))
const journeyTrace = join(
  here,
  '..',
  'capture',
  '__fixtures__',
  'journey-trace.zip'
)

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

/** The demo workarea with one trace source added, as intake would add it. */
const withTraceSource = () => {
  workspace = makeDistilWorkspace()
  workspace.editJson(workspace.layout.sources, (sources) => ({
    ...sources,
    sources: [
      ...sources.sources,
      {
        id: 'trace:journey',
        kind: 'trace',
        locator: journeyTrace,
        scope: 'the one journey trace',
        role: 'what the service does today'
      }
    ],
    precedence: [...sources.precedence, 'trace:journey']
  }))
}

const workFolder = () => join(workspace.layout.extractDir, 'trace-journey.work')

const trace = (traceArgs, options = {}) =>
  runTrace({
    layout: workspace.layout,
    schemas: workspace.schemas,
    sourceId: 'trace:journey',
    traceArgs,
    ...options
  })

describe('runTrace', () => {
  test('opens a trace inside the source working folder', async () => {
    withTraceSource()

    const result = await trace(['open', journeyTrace])

    expect(result).toMatchObject({
      source: 'trace:journey',
      workFolder: workFolder(),
      command: ['trace', 'open', journeyTrace],
      out: null
    })
    expect(existsSync(join(workFolder(), '.playwright-cli'))).toBe(true)
  })

  test('writes a later subcommand output to a file in the working folder', async () => {
    withTraceSource()
    await trace(['open', journeyTrace])

    const result = await trace(['actions'], { out: 'actions.txt' })

    expect(result.out).toBe(join(workFolder(), 'actions.txt'))
    expect(result.lines).toBeGreaterThan(0)
    expect(readFileSync(result.out, 'utf8').trimEnd().split('\n')).toHaveLength(
      result.lines
    )
  })

  test('opens a trace in a sub-folder of its own, so agents side by side keep their traces apart', async () => {
    withTraceSource()

    await trace(['open', journeyTrace], { folder: 'part2' })

    await expect(trace(['actions'])).rejects.toThrow('No trace opened')
  })

  test('reads the trace a sub-folder opened, from that sub-folder', async () => {
    withTraceSource()
    await trace(['open', journeyTrace], { folder: 'part2' })

    const result = await trace(['actions'], { folder: 'part2', out: 'a.txt' })

    expect(result.out).toBe(join(workFolder(), 'part2', 'a.txt'))
  })

  test('refuses a sub-folder that is a path', async () => {
    withTraceSource()

    await expect(trace(['actions'], { folder: '../x' })).rejects.toThrow(
      '--folder must be one folder name, such as part3. Got "../x".'
    )
  })

  test('says what went wrong when the subcommand fails', async () => {
    withTraceSource()

    await expect(trace(['actions'])).rejects.toThrow(
      /^playwright trace actions failed with exit 1, using Playwright 1\.63\.0 \(tim\): Error: No trace opened\./
    )
  })

  test('refuses a source that is not a trace', async () => {
    withTraceSource()

    await expect(
      runTrace({
        layout: workspace.layout,
        schemas: workspace.schemas,
        sourceId: 'repo:tests',
        traceArgs: ['actions']
      })
    ).rejects.toThrow(
      'repo:tests is a repo source. tim distil trace reads trace sources only.'
    )
  })

  test('refuses an output file name with a folder in it', async () => {
    withTraceSource()

    await expect(trace(['actions'], { out: '../actions.txt' })).rejects.toThrow(
      '--out must be a file name with no folder, such as actions.txt. Got "../actions.txt".'
    )
  })

  test('asks for a subcommand', async () => {
    withTraceSource()

    await expect(trace([])).rejects.toThrow(
      'Name a trace subcommand after --, such as: -- actions'
    )
  })

  test("opens a trace with tim's own Playwright when it is new enough", async () => {
    withTraceSource()

    const result = await trace(['open', journeyTrace])

    expect(result.playwright).toEqual({ version: '1.63.0', origin: 'tim' })
  })
})

describe('runTrace, for a trace recorded by a newer Playwright than tim', () => {
  const PRINTS_ITS_ARGUMENTS =
    'process.stdout.write(JSON.stringify(process.argv.slice(2)))\n'

  /** A repo under repos/ with a Playwright of this version, whose CLI prints the arguments it was given. */
  const repoPlaywright = (name, version) => {
    const folder = join(
      workspace.root,
      'repos',
      name,
      'node_modules',
      'playwright'
    )
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'package.json'), JSON.stringify({ version }))
    writeFileSync(join(folder, 'cli.js'), PRINTS_ITS_ARGUMENTS)
  }

  const traceRecordedBy = (version) => {
    const path = join(workspace.root, 'recorded.zip')
    writeFileSync(
      path,
      makeZip({
        '0-trace.trace': `${JSON.stringify({ type: 'context-options', playwrightVersion: version })}\n`
      })
    )
    return path
  }

  const traceIn = (traceArgs) =>
    runTrace({
      layout: workspace.layout,
      schemas: workspace.schemas,
      sourceId: 'trace:journey',
      traceArgs,
      workspaceRoot: workspace.root
    })

  test('opens it with the newest Playwright a workspace repo has installed', async () => {
    withTraceSource()
    repoPlaywright('older', '98.0.0')
    repoPlaywright('newer', '99.1.0')
    const zip = traceRecordedBy('98.5.0')

    const result = await traceIn(['open', zip])

    expect({
      playwright: result.playwright,
      stdout: JSON.parse(result.stdout)
    }).toEqual({
      playwright: { version: '99.1.0', origin: 'repos/newer' },
      stdout: ['trace', 'open', zip]
    })
  })

  test('reads it with the same Playwright on every later subcommand', async () => {
    withTraceSource()
    repoPlaywright('newer', '99.1.0')
    await traceIn(['open', traceRecordedBy('98.5.0')])

    const result = await traceIn(['actions'])

    expect(result.playwright.origin).toBe('repos/newer')
  })

  test('refuses, saying how to update tim, when no Playwright is new enough', async () => {
    withTraceSource()
    repoPlaywright('newer', '99.1.0')
    const zip = traceRecordedBy('100.0.0')

    await expect(traceIn(['open', zip])).rejects.toMatchObject({
      code: 'MISSING_DEP',
      message: `${zip} was recorded by Playwright 100.0.0, which is newer than any Playwright tim can open it with: tim's own is 1.63.0, and the workspace repos have 99.1.0 (repos/newer). Update tim's: npm --prefix ${join(workspace.root, 'tim')} install playwright@100.0.0 @playwright/test@100.0.0 --save-exact`
    })
  })
})

describe('the Playwright tim installs', () => {
  const workspaceRoot = join(here, '..', '..', '..')
  const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
  const RELEASE = /^[0-9]+\.[0-9]+\.[0-9]+$/

  /** The @playwright/test each cloned repo pins: the version its traces are recorded with. */
  const recordingVersions = () => {
    const reposDir = join(workspaceRoot, 'repos')
    if (!existsSync(reposDir)) return []
    return readdirSync(reposDir)
      .map((name) => join(reposDir, name, 'package.json'))
      .filter((path) => existsSync(path))
      .map((path) => {
        const manifest = readJson(path)
        const pinned =
          manifest.devDependencies?.['@playwright/test'] ??
          manifest.dependencies?.['@playwright/test']
        return { path, version: pinned?.replace(/^[\^~]/, '') }
      })
      .filter(({ version }) => RELEASE.test(version ?? ''))
  }

  test('is at least as new as the Playwright every workspace repo records traces with', () => {
    const timVersion = readJson(
      join(workspaceRoot, 'tim', 'node_modules', 'playwright', 'package.json')
    ).version

    const newer = recordingVersions().filter(
      ({ version }) => compareVersions(version, timVersion) > 0
    )

    expect(newer).toEqual([])
  })

  test('finds the Playwright a repo installs for @playwright/test, not only the one hoisted beside it', () => {
    workspace = makeDistilWorkspace()
    const nested = join(
      workspace.root,
      'repos',
      'suite',
      'node_modules',
      '@playwright',
      'test',
      'node_modules',
      'playwright'
    )
    mkdirSync(nested, { recursive: true })
    writeFileSync(
      join(nested, 'package.json'),
      JSON.stringify({ version: '1.70.0' })
    )

    expect(
      workspacePlaywrightsOf(workspace.root).map((found) => found.origin)
    ).toEqual(['repos/suite (@playwright/test)'])
  })
})
