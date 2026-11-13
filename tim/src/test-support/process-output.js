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
