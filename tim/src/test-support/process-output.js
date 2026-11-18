import { Command } from 'commander'
import { vi } from 'vitest'

const recordWritesTo = (stream, captured, key) =>
  vi.spyOn(stream, 'write').mockImplementation((text, ...rest) => {
    captured[key] += text
    rest.findLast((argument) => typeof argument === 'function')?.()
    return true
  })

/**
 * Capture what a command action writes to stdout and stderr and the code it
 * exits with, without ending the test process. Restore with
 * `vi.restoreAllMocks()` after each test.
 *
 * @returns {{ stdout: string, stderr: string, exitCode: number | null }} -
 *   filled in as the action runs
 */
export const captureProcessOutput = () => {
  const captured = { stdout: '', stderr: '', exitCode: null }
  recordWritesTo(process.stdout, captured, 'stdout')
  recordWritesTo(process.stderr, captured, 'stderr')
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    captured.exitCode = code
  })
  return captured
}

/**
 * Run a command group's `register` under a bare commander program, as
 * `tim <args>` would, capturing its output and exit code. Restore with
 * `vi.restoreAllMocks()` after each test.
 *
 * @param {(program: import('commander').Command, options: {timVersion: string}) => void} register
 * @param {...string} args - The command line after `tim`
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number | null }>}
 */
export const runRegisteredCommand = async (register, ...args) => {
  const captured = captureProcessOutput()
  const program = new Command().option('--json').exitOverride()
  register(program, { timVersion: '1.0.0' })

  await program.parseAsync(['node', 'tim', ...args])

  return captured
}
