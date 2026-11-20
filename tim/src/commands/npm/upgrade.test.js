import { execa } from 'execa'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test } from 'vitest'
import {
  cases,
  REPO,
  replayUpgradeCase,
  RUN_ID,
  stageUpgradeWorkspace
} from '../../npm-upgrade/__fixtures__/npm-upgrade-workspace.js'
import {
  FRONTEND,
  RUN_ID as START_RUN_ID,
  stageStartUpgradeWorkspace
} from '../../npm-upgrade/__fixtures__/npm-start-upgrade-workspace.js'

const cliPath = fileURLToPath(new URL('../../cli.js', import.meta.url))
const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const timIn = (fixtureCase, args) => {
  const staged = stageUpgradeWorkspace(fixtureCase)
  staging.push(staged)
  return execa(
    process.execPath,
    [cliPath, '--workspace', staged.root, ...args],
    {
      env: { ...staged.env, TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined },
      extendEnv: true,
      reject: false
    }
  )
}

describe('tim npm upgrade steps', () => {
  test.each([
    'upgrade-one',
    'run-manual',
    'run-auto',
    'refresh-lockfile',
    'reset-overrides'
  ])('Should describe %s with an example in its help', async (command) => {
    const result = await timIn({}, ['npm', command, '--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(`  tim npm ${command} --run-id EUDPA-500`)
  })

  test('Should exit 2 on an unknown option to upgrade-one', async () => {
    const result = await timIn({}, ['npm', 'upgrade-one', '--colour', 'red'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain("unknown option '--colour'")
  })

  test('Should exit 1 on an unknown option to run-auto', async () => {
    const result = await timIn({}, ['npm', 'run-auto', REPO, '--colour', 'red'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("unknown option '--colour'")
  })

  test.each(['--no-discover', '--discover'])(
    'Should run run-auto with %s exactly as without it',
    async (flag) => {
      const args = ['npm', 'run-auto', REPO, '--run-id', RUN_ID]
      const outcomeOf = async (runArgs) => {
        const result = await timIn({}, runArgs)
        const { root } = staging.at(-1)
        return {
          exitCode: result.exitCode,
          stdout: result.stdout.replaceAll(root, '<root>'),
          stderr: result.stderr.replaceAll(root, '<root>')
        }
      }
      const without = await outcomeOf(args)

      const withFlag = await outcomeOf([...args, flag])

      expect(withFlag).toEqual(without)
    }
  )

  test('Should print the refresh in a JSON envelope with --json', async () => {
    const result = await timIn({}, [
      'npm',
      'refresh-lockfile',
      '--run-id',
      RUN_ID,
      '--repo',
      REPO,
      '--json'
    ])

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      result: { repo: REPO, status: 'no_change', commit: null, reason: null }
    })
  })
})

describe('tim npm upgrade steps with --trailer', () => {
  const COAUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>'
  const SESSION = 'Claude-Session: https://claude.ai/code/session_1'

  const replayWithTrailers = (command, name) => {
    const fixtureCase = cases[command].find(
      (candidate) => candidate.name === name
    )
    return replayUpgradeCase(command, {
      ...fixtureCase,
      args: [...fixtureCase.args, '--trailer', COAUTHOR, '--trailer', SESSION]
    })
  }

  test.each([
    ['upgrade-one', 'a green upgrade commits and marks the package done'],
    ['run-manual', 'a green upgrade commits and marks the package done']
  ])(
    'Should end the %s commit with the trailers in the order given',
    async (command, name) => {
      const timRun = await replayWithTrailers(command, name)

      expect(timRun.repo.log).toBe(
        `<COMMIT 1> Upgrade lodash 4.17.20 → 4.17.21\n${COAUTHOR}\n${SESSION}\n\n<COMMIT 2> Fixture repo\n`
      )
    },
    60_000
  )

  test('Should end the refresh-lockfile commit with the trailers in the order given', async () => {
    const timRun = await replayWithTrailers(
      'refresh-lockfile',
      'a refreshed lockfile is committed'
    )

    expect(timRun.repo.log).toBe(
      `<COMMIT 1> Refresh transitive dependencies\nnpm update within the existing package.json ranges.\n\n${COAUTHOR}\n${SESSION}\n\n<COMMIT 2> Fixture repo\n`
    )
  }, 60_000)

  test('Should end every run-auto commit with the trailers in the order given', async () => {
    const timRun = await replayWithTrailers(
      'run-auto',
      'three packages, one failing, then a lockfile refresh'
    )

    expect(timRun.repo.log).toBe(
      [
        `<COMMIT 1> Refresh transitive dependencies\nnpm update within the existing package.json ranges.\n\n${COAUTHOR}\n${SESSION}\n`,
        `<COMMIT 2> Upgrade hapi 21.0.0 → 21.0.1\n${COAUTHOR}\n${SESSION}\n`,
        `<COMMIT 3> Upgrade lodash 4.17.20 → 4.17.21\n${COAUTHOR}\n${SESSION}\n`,
        '<COMMIT 4> Fixture repo\n'
      ].join('\n')
    )
  }, 120_000)

  test('Should end the reset-overrides commit with the trailers in the order given', async () => {
    const timRun = await replayWithTrailers(
      'reset-overrides',
      'every override goes when nothing needs it'
    )

    const ending = `\n${COAUTHOR}\n${SESSION}\n\n<COMMIT 2> Fixture repo\n`
    expect(timRun.repo.log).toMatch(/^<COMMIT 1> Remove overrides\nRemoved: /)
    expect(timRun.repo.log.slice(-ending.length)).toBe(ending)
  }, 120_000)

  test('Should exit 2 and change nothing when a --trailer is not a Name: value line', async () => {
    const timRun = await replayUpgradeCase('upgrade-one', {
      ...cases['upgrade-one'][0],
      args: [...cases['upgrade-one'][0].args, '--trailer', 'Claude']
    })

    expect({
      exitCode: timRun.exitCode,
      stderr: timRun.stderr,
      log: timRun.repo.log
    }).toEqual({
      exitCode: 2,
      stderr:
        '--trailer must be one line in the form "Name: value", such as "Co-Authored-By: Claude <noreply@anthropic.com>". You gave: "Claude"\n',
      log: '<COMMIT 1> Fixture repo\n'
    })
  }, 60_000)

  test('Should show --trailer with an example in the help of every step that commits', async () => {
    const helps = await Promise.all(
      [
        'upgrade-one',
        'run-manual',
        'run-auto',
        'refresh-lockfile',
        'reset-overrides',
        'upgrade'
      ].map(
        async (command) => (await timIn({}, ['npm', command, '--help'])).stdout
      )
    )

    expect(
      helps.map((help) => [
        help.includes('--trailer <line>'),
        help.includes(
          ' --trailer "Co-Authored-By: Claude <noreply@anthropic.com>"'
        )
      ])
    ).toEqual(Array(6).fill([true, true]))
  })
})

describe('tim npm upgrade', () => {
  const unusedRegistry = 'http://127.0.0.1:9'

  const upgradeIn = (fixtureCase, args) => {
    const staged = stageStartUpgradeWorkspace(fixtureCase, unusedRegistry)
    staging.push(staged)
    return execa(
      process.execPath,
      [cliPath, '--workspace', staged.root, 'npm', 'upgrade', ...args],
      { env: staged.env, extendEnv: true, reject: false }
    )
  }

  test('Should describe the phases with an example in its help', async () => {
    const result = await upgradeIn({}, ['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(
      '  tim npm upgrade EUDPA-500 --phase 1 --branch chore/EUDPA-500-npm --json'
    )
  })

  test('Should give the phase 3 handoff as the result of a JSON envelope', async () => {
    const result = await upgradeIn({}, [
      START_RUN_ID,
      '--phase',
      '3',
      '--repo',
      FRONTEND,
      '--json'
    ])

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      result: {
        ticket: START_RUN_ID,
        manual_count: 0,
        failed_auto_count: 0,
        packages: [],
        held: [],
        allowlist: [],
        audit_before: null,
        audit_after: null
      }
    })
  })

  test('Should give a phase 1 refusal as a JSON error envelope and exit 1', async () => {
    const result = await upgradeIn({}, [
      START_RUN_ID,
      '--phase',
      '1',
      '--repo',
      FRONTEND,
      '--json'
    ])

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'REFUSED',
          message: `Refusing phase 1: no phase 0 run for ${START_RUN_ID}. Run --phase 0 first.`
        }
      ]
    })
  })
})
