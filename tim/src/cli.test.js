import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, 'cli.js')

const runTim = (args) => execa('node', [cliPath, ...args], { reject: false })

describe('tim CLI', () => {
  test('--version prints a semver string', async () => {
    const { stdout, exitCode } = await runTim(['--version'])
    expect(exitCode).toBe(0)
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('hello prints a friendly greeting in text mode', async () => {
    const { stdout, exitCode } = await runTim(['hello'])
    expect(exitCode).toBe(0)
    expect(stdout.trim()).toBe('Hello from tim')
  })

  test('hello --json emits one structured line with schema_version, tim_version, and the message', async () => {
    const { stdout, exitCode } = await runTim(['hello', '--json'])
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload).toEqual({
      ok: true,
      schema_version: 1,
      tim_version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      message: 'Hello from tim'
    })
  })

  test('an unknown command exits non-zero', async () => {
    const { exitCode } = await runTim(['nope-this-does-not-exist'])
    expect(exitCode).not.toBe(0)
  })

  // Regression — earlier the bin was gated by `if (import.meta.url === process.argv[1])`
  // which was false when invoked via npm's installed symlink, so `tim --help`
  // produced zero output. Asserting on actual help text covers that mode.
  test('--help lists every registered top-level command group', async () => {
    const { stdout, exitCode } = await runTim(['--help'])
    expect(exitCode).toBe(0)
    for (const cmd of [
      'hello',
      'workspace',
      'link',
      'docker',
      'start',
      'auth',
      'jira',
      'confluence'
    ]) {
      expect(stdout).toContain(cmd)
    }
  })

  test('--help lists no GitHub command groups', async () => {
    const { stdout } = await runTim(['--help'])

    const commandNames = stdout
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[0])

    expect(commandNames).not.toContain('github')
    expect(commandNames).not.toContain('gha')
  })

  test('no args shows help instead of exiting silently', async () => {
    const { stdout, stderr, exitCode } = await runTim([])
    // commander shows help on stderr by convention for the no-args case;
    // accept either stream
    const combined = stdout + stderr
    expect(combined).toMatch(/Usage:|Commands:/)
    expect(exitCode).not.toBe(undefined)
  })
})
