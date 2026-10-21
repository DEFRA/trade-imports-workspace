import { describe, test, expect, vi, afterEach } from 'vitest'
import { TimError } from '../errors.js'
import { makeRunAction } from './_run-action.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const captureProcessOutput = () => {
  const captured = { stdout: '', stderr: '', exitCode: null }
  vi.spyOn(process.stdout, 'write').mockImplementation((text) => {
    captured.stdout += text
    return true
  })
  vi.spyOn(process.stderr, 'write').mockImplementation((text) => {
    captured.stderr += text
    return true
  })
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    captured.exitCode = code
  })
  return captured
}

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
})
