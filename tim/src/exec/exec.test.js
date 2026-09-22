import { describe, test, expect } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { run, runStreamed, runToLog } from './exec.js'
import { TimError } from '../errors.js'

describe('run', () => {
  test('captures stdout from a successful command', async () => {
    const result = await run('node', ['-e', "process.stdout.write('hello')"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('hello')
    expect(result.stderr).toBe('')
  })

  test('captures stderr separately', async () => {
    const result = await run('node', ['-e', "process.stderr.write('oops')"])
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('oops')
    expect(result.stdout).toBe('')
  })

  test('resolves with non-zero exitCode instead of throwing', async () => {
    const result = await run('node', ['-e', 'process.exit(7)'])
    expect(result.exitCode).toBe(7)
  })

  test('records a non-negative durationMs', async () => {
    const result = await run('node', ['-e', '0'])
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('throws TimError(MISSING_DEP) when the executable is not found', async () => {
    await expect(
      run('a-definitely-not-installed-binary-xyz', [])
    ).rejects.toMatchObject({
      name: 'TimError',
      code: 'MISSING_DEP'
    })
  })

  test('re-throws an aborted subprocess error unchanged (not a missing-dep, not a non-zero exit)', async () => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 20)
    await expect(
      run('node', ['-e', 'setInterval(() => {}, 1000)'], {
        cancelSignal: controller.signal
      })
    ).rejects.toThrowError(/abort/i)
  })

  test('passes through cwd via opts', async () => {
    const result = await run(
      'node',
      ['-e', 'process.stdout.write(process.cwd())'],
      {
        cwd: '/tmp'
      }
    )
    expect(result.stdout).toMatch(/tmp$/)
  })
})

describe('runStreamed', () => {
  test('returns the child exit code', async () => {
    const result = await runStreamed('node', ['-e', 'process.exit(3)'])
    expect(result.exitCode).toBe(3)
  })

  test('throws TimError(MISSING_DEP) when the executable is not found', async () => {
    await expect(
      runStreamed('a-definitely-not-installed-binary-xyz', [])
    ).rejects.toBeInstanceOf(TimError)
  })

  test('re-throws an aborted subprocess error unchanged', async () => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 20)
    await expect(
      runStreamed('node', ['-e', 'setInterval(() => {}, 1000)'], {
        cancelSignal: controller.signal,
        stdio: 'pipe'
      })
    ).rejects.toThrowError(/abort/i)
  })
})

const tempLogPath = () =>
  join(mkdtempSync(join(tmpdir(), 'tim-run-to-log-')), 'logs', 'out.log')

describe('runToLog', () => {
  test('writes stdout and stderr to the log, after the command line', async () => {
    const logPath = tempLogPath()

    await runToLog(
      'node',
      ['-e', "process.stdout.write('out\\n'); process.stderr.write('err\\n')"],
      { logPath }
    )

    const body = readFileSync(logPath, 'utf8')
    expect(body).toMatch(/^\$ node -e .*\n# in .*\n\nout\nerr\n$/s)
  })

  test('returns the exit code and the log path', async () => {
    const logPath = tempLogPath()

    const result = await runToLog('node', ['-e', 'process.exit(4)'], {
      logPath
    })

    expect(result).toEqual({
      exitCode: 4,
      durationMs: expect.any(Number),
      log: logPath
    })
  })

  test('replaces the log from an earlier run', async () => {
    const logPath = tempLogPath()
    await runToLog('node', ['-e', "console.log('first')"], { logPath })

    await runToLog('node', ['-e', "console.log('second')"], { logPath })

    expect(readFileSync(logPath, 'utf8')).not.toContain('first')
  })

  test('throws TimError(MISSING_DEP) when the executable is not found', async () => {
    await expect(
      runToLog('a-definitely-not-installed-binary-xyz', [], {
        logPath: tempLogPath()
      })
    ).rejects.toMatchObject({ name: 'TimError', code: 'MISSING_DEP' })
  })
})
