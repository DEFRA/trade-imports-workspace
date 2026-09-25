import { describe, test, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { makeSpecAction } from './shared.js'
import { TimError } from '../../errors.js'

let workspaceRoot

const seedWorkspace = () => {
  workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-spec-shared-'))
  writeFileSync(join(workspaceRoot, 'Makefile'), 'all:\n')
  mkdirSync(join(workspaceRoot, 'repos'), { recursive: true })
  return workspaceRoot
}

afterEach(() => {
  if (workspaceRoot) rmSync(workspaceRoot, { recursive: true, force: true })
  workspaceRoot = undefined
  vi.restoreAllMocks()
})

const invoke = async (action, { json = true, workspace } = {}, opts = {}) => {
  const stdout = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(() => true)
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined)

  await action.call({ optsWithGlobals: () => ({ json, workspace }) }, opts)

  return {
    stdout: stdout.mock.calls.map(([text]) => text).join(''),
    exitCode: exit.mock.calls[0]?.[0]
  }
}

describe('makeSpecAction', () => {
  test('resolves the workspace, runs, and emits a JSON envelope with the result', async () => {
    const workspace = seedWorkspace()
    const action = makeSpecAction({
      parseOptions: (opts) => opts,
      run: async ({ workspaceRoot: root }) => ({ sawRoot: root }),
      renderText: () => 'unused',
      exitCodeForResult: () => 5,
      timVersion: '1.2.3'
    })

    const { stdout, exitCode } = await invoke(action, { workspace })

    expect(JSON.parse(stdout.trim())).toMatchObject({
      ok: true,
      tim_version: '1.2.3',
      result: { sawRoot: workspace }
    })
    expect(exitCode).toBe(5)
  })

  test('emits plain text instead of JSON when --json is not set', async () => {
    const workspace = seedWorkspace()
    const action = makeSpecAction({
      parseOptions: (opts) => opts,
      run: async () => ({ count: 1 }),
      renderText: (result) => `count is ${result.count}`,
      timVersion: '1.2.3'
    })

    const { stdout, exitCode } = await invoke(action, {
      json: false,
      workspace
    })

    expect(stdout.trim()).toBe('count is 1')
    expect(exitCode).toBe(0)
  })

  test('catches a thrown TimError and emits an ok:false envelope at its mapped exit code', async () => {
    const action = makeSpecAction({
      parseOptions: () => {
        throw new TimError('USAGE', 'Bad --capability.')
      },
      run: async () => ({}),
      renderText: () => '',
      timVersion: '1.2.3'
    })

    const { stdout, exitCode } = await invoke(action, {})

    expect(JSON.parse(stdout.trim())).toMatchObject({
      ok: false,
      errors: [{ code: 'USAGE', message: 'Bad --capability.' }]
    })
    expect(exitCode).toBe(2)
  })
})
