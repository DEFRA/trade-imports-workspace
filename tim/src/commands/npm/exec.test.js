import { execa } from 'execa'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  cases,
  readAuditGolden,
  stageAuditWorkspace,
  stageFakeCommands
} from '../../npm-upgrade/__fixtures__/npm-audit-workspace.js'

const golden = readAuditGolden().exec
const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const isUsageCase = (recorded) => recorded.stderr.includes('Usage: ')

const execArgsOf = (args) => {
  const firstNpmArg = args.findIndex(
    (arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--')
  )
  return firstNpmArg === -1
    ? ['npm', 'exec', ...args]
    : [
        'npm',
        'exec',
        ...args.slice(0, firstNpmArg),
        '--',
        ...args.slice(firstNpmArg)
      ]
}

describe('tim npm exec', () => {
  test.each(cases.exec.map((fixtureCase) => [fixtureCase.name, fixtureCase]))(
    'Should do what npm-in-repo.sh did: %s',
    async (name, fixtureCase) => {
      const staged = stageAuditWorkspace(fixtureCase)
      const fakes = stageFakeCommands(fixtureCase)
      staging.push(staged, fakes)
      const recorded = golden.find((run) => run.case === name)

      const timRun = await recordTimRun(staged, execArgsOf(fixtureCase.args), {
        env: fakes.env
      })

      expect(timRun.exitCode).toBe(recorded.exitCode)
      expect(timRun.stdout).toBe(recorded.stdout)
      if (isUsageCase(recorded)) {
        expect(timRun.stderr).toContain('Usage: tim npm exec')
      } else {
        expect(timRun.stderr).toBe(recorded.stderr)
      }
    },
    30_000
  )

  const symlinkedRepo = () => {
    const home = realpathSync(mkdtempSync(join(tmpdir(), 'tim-npm-exec-real-')))
    staging.push({
      remove: () => rmSync(home, { recursive: true, force: true })
    })
    const root = join(home, 'workspace')
    const real = join(home, 'checkouts', 'app')
    mkdirSync(join(root, 'repos'), { recursive: true })
    mkdirSync(join(root, 'docs', 'best-practices'), { recursive: true })
    writeFileSync(join(root, 'repos.json'), '{ "repos": [] }\n')
    mkdirSync(join(real, 'local-dep'), { recursive: true })
    writeFileSync(
      join(real, 'package.json'),
      '{"name":"app","version":"1.0.0","dependencies":{"local-dep":"file:local-dep"}}\n'
    )
    writeFileSync(
      join(real, 'local-dep', 'package.json'),
      '{"name":"local-dep","version":"2.0.0"}\n'
    )
    symlinkSync(real, join(root, 'repos', 'app'))
    return { root, real }
  }

  const runRealNpm = (root, npmArgs) =>
    execa(
      'node',
      [
        join(import.meta.dirname, '..', '..', 'cli.js'),
        '--workspace',
        root,
        'npm',
        'exec',
        '--repo',
        'app',
        '--',
        ...npmArgs
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

  test('Should give npm the real path of a symlinked repo as its prefix', async () => {
    const { root, real } = symlinkedRepo()

    const result = await runRealNpm(root, ['prefix'])

    expect(result.stdout).toBe(real)
  }, 60_000)

  test('Should write lockfile paths relative to the real checkout when the repo is symlinked', async () => {
    const { root, real } = symlinkedRepo()

    const result = await runRealNpm(root, [
      'install',
      '--package-lock-only',
      '--offline',
      '--no-audit',
      '--no-fund'
    ])

    expect(result.exitCode).toBe(0)
    const lockfile = JSON.parse(
      readFileSync(join(real, 'package-lock.json'), 'utf8')
    )
    expect(Object.keys(lockfile.packages)).toEqual([
      '',
      'local-dep',
      'node_modules/local-dep'
    ])
  }, 60_000)
})
