import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTrace } from './trace.js'
import { makeDistilWorkspace } from '../test-support/distil-workspace.js'

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
      "playwright trace actions failed with exit 1: Error: No trace opened. Run 'npx playwright trace open <file>' first."
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
})
