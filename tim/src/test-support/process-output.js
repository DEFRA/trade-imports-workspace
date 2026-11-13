import { vi } from 'vitest'

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
