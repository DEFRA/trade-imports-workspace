import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import {
  FRONTEND,
  stageStartUpgradeWorkspace,
  startFixtureRegistry
} from '../../npm-upgrade/__fixtures__/npm-start-upgrade-workspace.js'
import {
  AXE_HOLD,
  fixtureDependencySets,
  fixtureDependencySetsHolding
} from '../../test-support/deps-workspace.js'

const cliPath = fileURLToPath(new URL('../../cli.js', import.meta.url))
const TICKET = 'EUDPA-800'
const BRANCH = 'chore/EUDPA-800-npm'
const RUN_ID = 'EUDPA-800-npm'
const UNUSED_REGISTRY = 'http://127.0.0.1:9'

const staging = []
let registry

beforeAll(async () => {
  registry = await startFixtureRegistry()
})

afterAll(async () => {
  await registry.close()
})

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const stage = (
  registryUrl = UNUSED_REGISTRY,
  dependencySets = fixtureDependencySets()
) => {
  const staged = stageStartUpgradeWorkspace({}, registryUrl)
  staging.push(staged)
  mkdirSync(join(staged.root, 'config'), { recursive: true })
  writeFileSync(
    join(staged.root, 'config', 'dependency-sets.json'),
    JSON.stringify(dependencySets)
  )
  return staged
}

const gitIn = (staged, repo, args) =>
  execa('git', args, {
    cwd: join(staged.root, 'repos', repo),
    env: staged.env,
    extendEnv: true
  })

const withOriginAtItself = async (staged, repo) => {
  await gitIn(staged, repo, ['remote', 'add', 'origin', '.'])
  await gitIn(staged, repo, ['fetch', '--quiet', 'origin'])
}

const tim = (staged, args) =>
  execa(process.execPath, [cliPath, '--workspace', staged.root, ...args], {
    env: staged.env,
    extendEnv: true,
    reject: false
  })

const upgrade = (staged, args) => tim(staged, ['npm', 'upgrade', ...args])

const unattended = (phase, ...args) => [
  TICKET,
  '--unattended',
  '--branch',
  BRANCH,
  '--phase',
  phase,
  '--repo',
  FRONTEND,
  ...args
]

const refusalOf = (run) => ({
  exitCode: run.exitCode,
  lastLine: run.stderr.trim().split('\n').at(-1)
})

describe('tim npm upgrade --unattended refusals', () => {
  test('Should refuse a run with no branch', async () => {
    const run = await upgrade(stage(), [TICKET, '--unattended', '--phase', '0'])

    expect(refusalOf(run)).toEqual({
      exitCode: 1,
      lastLine: `--unattended needs --branch chore/${TICKET}-<slug>: the same branch name in every repo.`
    })
  })

  test('Should refuse a branch for another ticket', async () => {
    const run = await upgrade(stage(), [
      TICKET,
      '--unattended',
      '--phase',
      '0',
      '--branch',
      'chore/EUDPA-1-npm'
    ])

    expect(refusalOf(run)).toEqual({
      exitCode: 1,
      lastLine: `--branch must be chore/, fix/ or feat/ followed by ${TICKET}-<slug>, with the slug in lower case. You gave chore/EUDPA-1-npm.`
    })
  })

  test('Should refuse an allowlist owner', async () => {
    const run = await upgrade(
      stage(),
      unattended('2', '--allowlist-owner', 'A Person', '--expiry-days', '30')
    )

    expect(refusalOf(run)).toEqual({
      exitCode: 1,
      lastLine:
        '--unattended never allowlists an advisory, so a new advisory needs a person. Remove --allowlist-owner and --expiry-days.'
    })
  })

  test('Should refuse NO_JIRA without --unattended', async () => {
    const run = await upgrade(stage(), ['NO_JIRA', '--phase', '0'])

    expect(refusalOf(run)).toEqual({
      exitCode: 1,
      lastLine:
        'NO_JIRA is for --unattended runs only. Give the ticket key, such as EUDPA-500.'
    })
  })

  test('Should stop phase 0 before switching branches when a repo has uncommitted changes', async () => {
    const staged = stage()
    writeFileSync(
      join(staged.root, 'repos', FRONTEND, 'notes.txt'),
      'Work in progress\n'
    )

    const run = await upgrade(staged, unattended('0'))

    expect(refusalOf(run)).toEqual({
      exitCode: 1,
      lastLine: `Stopped before switching branches: these repos have uncommitted changes: ${FRONTEND}`
    })
  })

  test('Should name the unattended usage in its help', async () => {
    const run = await upgrade(stage(), ['--help'])

    expect(run.stdout).toContain(
      '  tim npm upgrade EUDPA-XXXXX|NO_JIRA --unattended --branch chore/<ticket>-<slug> --phase 0|1|2|3|4'
    )
  })
})

describe('tim npm run-auto --unattended', () => {
  test('Should refuse an allowlist owner', async () => {
    const run = await tim(stage(), [
      'npm',
      'run-auto',
      FRONTEND,
      '--run-id',
      RUN_ID,
      '--unattended',
      '--allowlist-owner',
      'A Person'
    ])

    expect(refusalOf(run)).toEqual({
      exitCode: 1,
      lastLine:
        '--unattended never allowlists an advisory, so a new advisory needs a person. Remove --allowlist-owner and --expiry-days.'
    })
  })
})

describe('An unattended npm upgrade run', () => {
  const packagesFileOf = (staged) =>
    JSON.parse(
      readFileSync(
        join(
          staged.root,
          'workareas',
          'npm-upgrades',
          RUN_ID,
          FRONTEND,
          `packages.${FRONTEND}.json`
        ),
        'utf8'
      )
    )

  const classify = (staged, name, classification) =>
    tim(staged, [
      'npm',
      'packages',
      'set-classification',
      '--run-id',
      RUN_ID,
      '--repo',
      FRONTEND,
      '--package',
      name,
      '--classification',
      classification,
      '--risk',
      'LOW',
      '--safe-for-automation',
      String(classification === 'auto'),
      '--rationale',
      'Patch fix only'
    ])

  const stageThroughPhase1 = async (dependencySets) => {
    const staged = stage(registry.url, dependencySets)
    await withOriginAtItself(staged, FRONTEND)
    await gitIn(staged, FRONTEND, ['checkout', '--quiet', '-b', 'spike/local'])
    const phase0 = await upgrade(staged, unattended('0'))
    const phase1 = await upgrade(staged, unattended('1', '--json'))
    return { staged, phase0, phase1 }
  }

  test('Should put the repo on the branch in phase 0', async () => {
    const { staged, phase0 } = await stageThroughPhase1()

    const current = await gitIn(staged, FRONTEND, ['branch', '--show-current'])

    expect({ exitCode: phase0.exitCode, branch: current.stdout }).toEqual({
      exitCode: 0,
      branch: BRANCH
    })
  })

  test('Should give each planner task its mode, policy and set in phase 1', async () => {
    const { phase1 } = await stageThroughPhase1()

    const tasks = JSON.parse(phase1.stdout).result

    expect(
      tasks.map(({ package: name, ticket, mode, policy, set }) => ({
        name,
        ticket,
        mode,
        policy,
        set
      }))
    ).toEqual([
      {
        name: 'lodash',
        ticket: RUN_ID,
        mode: 'unattended',
        policy: 'ci-is-enough',
        set: null
      },
      {
        name: 'date-fns',
        ticket: RUN_ID,
        mode: 'unattended',
        policy: 'ci-is-enough',
        set: null
      }
    ])
  })

  test('Should leave a held package out of the run in phase 1, with a line naming the hold', async () => {
    const lodashHold = {
      ...AXE_HOLD,
      package: 'lodash',
      versions: '4.17.x',
      repos: [FRONTEND]
    }
    const { staged, phase1 } = await stageThroughPhase1(
      fixtureDependencySetsHolding([lodashHold])
    )

    const tasks = JSON.parse(phase1.stdout).result

    expect({
      tasks: tasks.map(({ package: name }) => name),
      rows: packagesFileOf(staged).packages.map(({ package: name }) => name),
      skipped: phase1.stderr
        .split('\n')
        .filter((line) => line.startsWith('Skipping '))
    }).toEqual({
      tasks: ['date-fns'],
      rows: ['date-fns'],
      skipped: [
        `Skipping lodash 4.17.21: lodash 4.17.21 is in the range 4.17.x held since 2026-11-19. ${AXE_HOLD.reason} Run tim deps holds to see the hold.`
      ]
    })
  })

  test('Should record each package policy in the packages file in phase 1', async () => {
    const { staged } = await stageThroughPhase1()

    const policies = packagesFileOf(staged).packages.map(
      ({ package: name, policy, policy_reason: reason }) => ({
        name,
        policy,
        reason
      })
    )

    expect(policies).toEqual([
      {
        name: 'lodash',
        policy: 'ci-is-enough',
        reason: 'lodash is in no set, and a patch upgrade needs only green CI.'
      },
      {
        name: 'date-fns',
        policy: 'ci-is-enough',
        reason:
          'date-fns is in no set, and a patch upgrade needs only green CI.'
      }
    ])
  })

  test('Should upgrade, check the evidence and render a table that names what a person must do', async () => {
    const { staged } = await stageThroughPhase1()
    await classify(staged, 'lodash', 'auto')
    await classify(staged, 'date-fns', 'manual')
    await tim(staged, [
      'npm',
      'packages',
      'add-evidence',
      '--run-id',
      RUN_ID,
      '--repo',
      FRONTEND,
      '--package',
      'lodash',
      '--item',
      'lodash/fp drops a method',
      '--outcome',
      'not-applicable',
      '--pattern',
      'lodash/fp',
      '--reason',
      'The repo does not import lodash/fp.'
    ])
    await upgrade(staged, unattended('2'))
    await tim(staged, [
      'npm',
      'packages',
      'check-evidence',
      '--run-id',
      RUN_ID,
      '--repo',
      FRONTEND,
      '--package',
      'lodash'
    ])

    const render = await tim(staged, [
      'npm',
      'packages',
      'render-evidence',
      '--run-id',
      RUN_ID
    ])

    expect(render.stdout.trim()).toBe(
      [
        '## Packages and changelog evidence',
        '',
        '### `trade-imports-animals-frontend`',
        '',
        '| Package | From | To | Policy | Set | Outcome |',
        '|---|---|---|---|---|---|',
        '| `lodash` | 4.17.20 | 4.17.21 | ci-is-enough | - | Upgraded |',
        '| `date-fns` | 4.1.0 | 4.1.1 | ci-is-enough | - | **Not started** |',
        '',
        '#### `lodash` 4.17.20 to 4.17.21',
        '',
        '| Changelog item | Outcome | Evidence |',
        '|---|---|---|',
        '| lodash/fp drops a method | Not applicable | `lodash/fp`: 0 hits before, 0 after.<br>The repo does not import lodash/fp. |',
        '',
        'Every row is clean.',
        '',
        '**Needs a person:**',
        '',
        '- `date-fns`: It is not upgraded yet: phase 2 or its implementer has not finished.',
        '',
        '**1 of 2 packages are not clean.**'
      ].join('\n')
    )
  }, 180_000)

  test('Should hand phase 3 to the job, not the WALKER', async () => {
    const { staged } = await stageThroughPhase1()

    const phase3 = await upgrade(staged, unattended('3'))

    expect(phase3.stderr.trim().split('\n').at(-1)).toBe(
      `Phase 3 manifest emitted. These packages are the unattended job's own work, not a walker's: follow "Unattended mode" in ${join(staged.root, '.claude/skills/npm-upgrade/SKILL.md')} (run-id ${RUN_ID}).`
    )
  })

  test('Should record the policy when tim npm discover is given --record-policy', async () => {
    const staged = stage(registry.url)

    const run = await tim(staged, [
      'npm',
      'discover',
      '--repo',
      FRONTEND,
      '--run-id',
      RUN_ID,
      '--package',
      'lodash',
      '--record-policy',
      '--json'
    ])

    expect(
      JSON.parse(run.stdout).result.packages.map(
        ({ package: name, policy }) => ({ name, policy })
      )
    ).toEqual([{ name: 'lodash', policy: 'ci-is-enough' }])
  })
})
