import { describe, test, expect } from 'vitest'
import { fitArgs, runFitSuite } from './fit-run.js'

const SUITE = {
  repoPath: '/ws/repos/animals-frontend',
  fitScript: 'test:fit',
  projects: ['journeys', 'features'],
  outputDir: '/tmp/run'
}

describe('fitArgs', () => {
  test("forwards tracing, the output folder and every project to the repo's own script", () => {
    expect(fitArgs(SUITE)).toEqual([
      'run',
      'test:fit',
      '--',
      '--trace',
      'on',
      '--reporter=list',
      '--output',
      '/tmp/run',
      '--project=journeys',
      '--project=features'
    ])
  })
})

describe('runFitSuite', () => {
  const fakeRun = (exitCode) => {
    const calls = []
    return {
      calls,
      run: async (command, args, opts) => {
        calls.push({ command, args, cwd: opts.cwd, stdio: opts.stdio })
        return { exitCode, durationMs: 42 }
      }
    }
  }

  test('runs npm in the repo with the capture arguments', async () => {
    const { calls, run } = fakeRun(0)

    await runFitSuite({ ...SUITE, run })

    expect(calls).toEqual([
      {
        command: 'npm',
        args: fitArgs(SUITE),
        cwd: SUITE.repoPath,
        stdio: ['ignore', 2, 2]
      }
    ])
  })

  test('says the suite passed when it exits zero', async () => {
    const { run } = fakeRun(0)

    await expect(runFitSuite({ ...SUITE, run })).resolves.toEqual({
      command: `npm ${fitArgs(SUITE).join(' ')}`,
      exitCode: 0,
      durationMs: 42,
      passed: true
    })
  })

  test('reports a failing suite rather than throwing, so its traces survive', async () => {
    const { run } = fakeRun(1)

    await expect(runFitSuite({ ...SUITE, run })).resolves.toMatchObject({
      exitCode: 1,
      passed: false
    })
  })
})
