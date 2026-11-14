import { execa } from 'execa'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test } from 'vitest'
import {
  REPO,
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
