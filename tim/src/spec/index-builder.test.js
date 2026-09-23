import { describe, test, expect } from 'vitest'
import {
  buildUnitIndex,
  buildFitIndex,
  buildE2eIndex
} from './index-builder.js'

const REPO_PATH = '/ws/repos/animals-frontend'

const fakeRun = (stdout) => {
  const calls = []
  return {
    calls,
    run: async (command, args, opts) => {
      calls.push({ command, args, cwd: opts.cwd })
      return { stdout, stderr: '', exitCode: 0 }
    }
  }
}

describe('buildUnitIndex', () => {
  test('runs bare npx vitest list --json in the repo', async () => {
    const { calls, run } = fakeRun(JSON.stringify([]))

    await buildUnitIndex({ repoPath: REPO_PATH, run })

    expect(calls).toEqual([
      { command: 'npx', args: ['vitest', 'list', '--json'], cwd: REPO_PATH }
    ])
  })

  test('makes the file repo-relative and splits leaf from full title', async () => {
    const { run } = fakeRun(
      JSON.stringify([
        {
          name: 'species label > Should put the common name first',
          file: '/ws/repos/animals-frontend/src/species-label.test.js'
        }
      ])
    )

    await expect(buildUnitIndex({ repoPath: REPO_PATH, run })).resolves.toEqual(
      [
        {
          file: 'src/species-label.test.js',
          title: 'Should put the common name first',
          fullTitle: 'species label > Should put the common name first'
        }
      ]
    )
  })

  test('strips an npm script banner before the JSON', async () => {
    const { run } = fakeRun(
      `\n> tim@0.0.0 tim\n> node src/cli.js\n\n${JSON.stringify([])}`
    )

    await expect(buildUnitIndex({ repoPath: REPO_PATH, run })).resolves.toEqual(
      []
    )
  })

  test('is not fooled by a stray bracket in an earlier log line', async () => {
    // A build step's own log lines (e.g. a webpack-cli banner reading
    // "[webpack-cli] Compiler starting...") can contain a `[` well before
    // the real JSON. The first bracket in the text is not always the
    // start of the JSON.
    const { run } = fakeRun(
      `[webpack-cli] Compiler starting...\n${JSON.stringify([])}`
    )

    await expect(buildUnitIndex({ repoPath: REPO_PATH, run })).resolves.toEqual(
      []
    )
  })
})

const PLAYWRIGHT_LIST = {
  config: { rootDir: '/ws/repos/animals-frontend/fit' },
  suites: [
    {
      title: 'journeys',
      suites: [
        {
          specs: [
            {
              title: 'opens the hub',
              file: 'hub.fit.spec.js',
              line: 10,
              tests: 1
            }
          ]
        }
      ]
    }
  ]
}

describe('buildFitIndex', () => {
  test("runs the repo's own test:fit script, not test:fit:ci", async () => {
    const { calls, run } = fakeRun(JSON.stringify(PLAYWRIGHT_LIST))

    await buildFitIndex({ repoPath: REPO_PATH, run })

    expect(calls).toEqual([
      {
        command: 'npm',
        args: ['run', 'test:fit', '--', '--list', '--reporter=json'],
        cwd: REPO_PATH
      }
    ])
  })

  test('resolves a spec file against config.rootDir, repo-relative', async () => {
    const { run } = fakeRun(JSON.stringify(PLAYWRIGHT_LIST))

    await expect(buildFitIndex({ repoPath: REPO_PATH, run })).resolves.toEqual([
      {
        file: 'fit/hub.fit.spec.js',
        title: 'opens the hub',
        fullTitle: 'opens the hub'
      }
    ])
  })

  test('resolves a testDir-relative file that starts ../', async () => {
    const { run } = fakeRun(
      JSON.stringify({
        config: { rootDir: '/ws/repos/animals-frontend/fit' },
        suites: [
          {
            specs: [{ title: 'shared spec', file: '../shared/shared.spec.js' }]
          }
        ]
      })
    )

    await expect(buildFitIndex({ repoPath: REPO_PATH, run })).resolves.toEqual([
      {
        file: 'shared/shared.spec.js',
        title: 'shared spec',
        fullTitle: 'shared spec'
      }
    ])
  })
})

describe('buildE2eIndex', () => {
  test('runs _test_docker_compose, not test:docker-compose', async () => {
    const { calls, run } = fakeRun(JSON.stringify(PLAYWRIGHT_LIST))

    await buildE2eIndex({ repoPath: REPO_PATH, run })

    expect(calls).toEqual([
      {
        command: 'npm',
        args: [
          'run',
          '_test_docker_compose',
          '--',
          '--list',
          '--reporter=json'
        ],
        cwd: REPO_PATH
      }
    ])
  })
})
