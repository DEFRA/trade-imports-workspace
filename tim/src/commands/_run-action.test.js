import { describe, test, expect, vi, afterEach } from 'vitest'
import { TimError } from '../errors.js'
import { makeRunAction } from './_run-action.js'
import { captureProcessOutput } from '../test-support/process-output.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const invoke = (action, { positional = [], options = {} } = {}) =>
  action.call({ optsWithGlobals: () => options }, ...positional, options, {})

describe('makeRunAction', () => {
  test('prints the rendered result and exits with the code chosen from the result and parsed options', async () => {
    const captured = captureProcessOutput()
    const action = makeRunAction({
      parseOptions: (opts) => ({ ...opts, watch: true }),
      run: async ({ args }) => ({ repo: args[0], outcome: 'failed' }),
      renderText: ({ repo, outcome }) => `${repo}: ${outcome}`,
      exitCodeForResult: (result, parsed) =>
        parsed.watch && result.outcome === 'failed' ? 1 : 0,
      timVersion: '1.0.0'
    })

    await invoke(action, { positional: ['repo-a'] })

    expect(captured).toEqual({
      stdout: 'repo-a: failed\n',
      stderr: '',
      exitCode: 1
    })
  })

  test('prints a JSON error envelope and exits 2 for a USAGE error in --json mode', async () => {
    const captured = captureProcessOutput()
    const action = makeRunAction({
      run: async () => {
        throw new TimError('USAGE', 'Give a repo.')
      },
      renderText: () => '',
      timVersion: '1.0.0'
    })

    await invoke(action, { options: { json: true } })

    expect(JSON.parse(captured.stdout)).toEqual({
      ok: false,
      schema_version: 1,
      tim_version: '1.0.0',
      result: null,
      errors: [{ code: 'USAGE', message: 'Give a repo.' }]
    })
    expect(captured.exitCode).toBe(2)
  })

  test('prints a result that partly failed to stdout and its failure to stderr', async () => {
    const captured = captureProcessOutput()
    const action = makeRunAction({
      run: async () => ({ done: 'a', failed: 'b' }),
      renderText: ({ done }) => `Done: ${done}`,
      renderTextError: ({ failed }) => `Could not do ${failed}.`,
      exitCodeForResult: () => 1,
      timVersion: '1.0.0'
    })

    await invoke(action)

    expect(captured).toEqual({
      stdout: 'Done: a\n',
      stderr: 'Could not do b.\n',
      exitCode: 1
    })
  })

  test('exits with the code the command chooses for an error', async () => {
    const captured = captureProcessOutput()
    const action = makeRunAction({
      run: async () => {
        throw new TimError('NOT_FOUND', 'No such thing.')
      },
      renderText: () => '',
      exitCodeForError: () => 1,
      timVersion: '1.0.0'
    })

    await invoke(action)

    expect(captured).toEqual({
      stdout: '',
      stderr: 'No such thing.\n',
      exitCode: 1
    })
  })
})
