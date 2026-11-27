import { describe, test, expect, afterEach } from 'vitest'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { renderHoldText, renderHoldsText, renderLiftText } from './holds.js'
import { localDateOf } from '../../deps/holds.js'
import { runTimInWorkspace, envelopeOf } from '../../test-support/tim-cli.js'
import {
  AXE_HOLD,
  SPRINGDOC_HOLD,
  createDepsWorkspace,
  fixtureDependencySetsHolding
} from '../../test-support/deps-workspace.js'

const REPO = 'trade-imports-animals-frontend'

const holdShape = z
  .object({
    package: z.string(),
    versions: z.string(),
    repos: z.array(z.string()),
    reason: z.string(),
    failingTest: z.string(),
    clashesWith: z.string().optional(),
    link: z.string().optional(),
    since: z.string()
  })
  .strict()

const envelopeOfResult = (result) =>
  z.object({
    ok: z.literal(true),
    schema_version: z.literal(1),
    result
  })

const holdEnvelope = envelopeOfResult(
  z
    .object({
      hold: holdShape,
      replaced: holdShape.nullable(),
      regenerate: z.array(z.string())
    })
    .strict()
)

const holdsEnvelope = envelopeOfResult(
  z.object({ holds: z.array(holdShape) }).strict()
)

const liftEnvelope = envelopeOfResult(
  z.object({ lifted: holdShape, regenerate: z.array(z.string()) }).strict()
)

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const runDeps = (...args) =>
  runTimInWorkspace(root, ['deps', ...args, '--json'])

const holdArgs = [
  'hold',
  AXE_HOLD.package,
  '--versions',
  AXE_HOLD.versions,
  '--repo',
  REPO,
  '--reason',
  AXE_HOLD.reason,
  '--failing-test',
  AXE_HOLD.failingTest,
  '--clashes-with',
  AXE_HOLD.clashesWith,
  '--link',
  AXE_HOLD.link
]

const committedHolds = () =>
  JSON.parse(readFileSync(join(root, 'config', 'dependency-sets.json'), 'utf8'))
    .holds

describe('tim deps hold', () => {
  test('Should write the hold dated today and list the repo to regenerate', async () => {
    root = createDepsWorkspace()

    const run = await runDeps(...holdArgs)

    const today = localDateOf(new Date())
    expect({
      exitCode: run.exitCode,
      result: holdEnvelope.parse(envelopeOf(run)).result,
      onDisk: committedHolds()
    }).toEqual({
      exitCode: 0,
      result: {
        hold: { ...AXE_HOLD, since: today },
        replaced: null,
        regenerate: [REPO]
      },
      onDisk: [{ ...AXE_HOLD, since: today }]
    })
  })

  test('Should take --repo more than once', async () => {
    root = createDepsWorkspace()

    const run = await runDeps(...holdArgs, '--repo', 'tim')

    expect(holdEnvelope.parse(envelopeOf(run)).result.regenerate).toEqual([
      'tim',
      REPO
    ])
  })

  test('Should make tim deps dependabot --check fail until the repo is regenerated', async () => {
    root = createDepsWorkspace()
    await runDeps('dependabot', REPO, '--write')
    await runDeps(...holdArgs)

    const before = await runDeps('dependabot', REPO, '--check')
    await runDeps('dependabot', REPO, '--write')
    const after = await runDeps('dependabot', REPO, '--check')

    expect([before.exitCode, after.exitCode]).toEqual([1, 0])
  })

  test("Should hold a Maven package at a Maven range, fail the Java repo's --check until it is regenerated, and make the range held for tim deps policy", async () => {
    const javaRepo = 'trade-imports-animals-backend'
    root = createDepsWorkspace({ cloned: [javaRepo] })
    await runDeps('dependabot', javaRepo, '--write')

    const hold = await runDeps(
      'hold',
      SPRINGDOC_HOLD.package,
      '--versions',
      SPRINGDOC_HOLD.versions,
      '--repo',
      javaRepo,
      '--reason',
      SPRINGDOC_HOLD.reason,
      '--failing-test',
      SPRINGDOC_HOLD.failingTest
    )
    const before = await runDeps('dependabot', javaRepo, '--check')
    await runDeps('dependabot', javaRepo, '--write')
    const after = await runDeps('dependabot', javaRepo, '--check')
    const policy = await runDeps(
      'policy',
      SPRINGDOC_HOLD.package,
      '--from',
      '2.8.9',
      '--to',
      '3.2.1',
      '--repo',
      javaRepo
    )

    expect({
      regenerate: holdEnvelope.parse(envelopeOf(hold)).result.regenerate,
      checks: [before.exitCode, after.exitCode],
      policy: envelopeOf(policy).result.policy
    }).toEqual({ regenerate: [javaRepo], checks: [1, 0], policy: 'held' })
  })

  test('Should refuse a missing --failing-test as a usage error', async () => {
    root = createDepsWorkspace()

    const run = await runDeps(
      'hold',
      AXE_HOLD.package,
      '--versions',
      AXE_HOLD.versions,
      '--repo',
      REPO,
      '--reason',
      AXE_HOLD.reason
    )

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: 2,
      errors: [
        {
          code: 'USAGE',
          message:
            'Give the test or check the new version breaks with --failing-test.'
        }
      ]
    })
  })

  test('Should refuse a missing --repo as a usage error', async () => {
    root = createDepsWorkspace()

    const run = await runDeps(
      'hold',
      AXE_HOLD.package,
      '--versions',
      AXE_HOLD.versions,
      '--reason',
      AXE_HOLD.reason,
      '--failing-test',
      AXE_HOLD.failingTest
    )

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: 2,
      errors: [
        {
          code: 'USAGE',
          message: 'Give each repo the hold covers with --repo.'
        }
      ]
    })
  })
})

describe('tim deps holds', () => {
  test('Should list every hold', async () => {
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD])
    })

    const run = await runDeps('holds')

    expect({
      exitCode: run.exitCode,
      holds: holdsEnvelope.parse(envelopeOf(run)).result.holds
    }).toEqual({ exitCode: 0, holds: [AXE_HOLD] })
  })
})

describe('tim deps lift', () => {
  test('Should remove the hold and list the repo to regenerate', async () => {
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD])
    })

    const run = await runDeps('lift', AXE_HOLD.package)

    expect({
      exitCode: run.exitCode,
      result: liftEnvelope.parse(envelopeOf(run)).result,
      onDisk: committedHolds()
    }).toEqual({
      exitCode: 0,
      result: { lifted: AXE_HOLD, regenerate: [REPO] },
      onDisk: []
    })
  })

  test('Should exit 2 for a package that is not held', async () => {
    root = createDepsWorkspace()

    const run = await runDeps('lift', AXE_HOLD.package)

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code
    }).toEqual({ exitCode: 2, code: 'NOT_FOUND' })
  })
})

describe('#renderHoldText', () => {
  test('Should say the package was held and give the command for each repo', () => {
    const text = renderHoldText({
      hold: AXE_HOLD,
      replaced: null,
      regenerate: ['tim', REPO]
    })

    expect(text).toBe(
      [
        'Held @axe-core/playwright 4.14.x in config/dependency-sets.json.',
        'Regenerate the Dependabot config of each repo it covers:',
        '  tim deps dependabot tim --write',
        `  tim deps dependabot ${REPO} --write`
      ].join('\n')
    )
  })

  test('Should say a hold was replaced', () => {
    const text = renderHoldText({
      hold: AXE_HOLD,
      replaced: AXE_HOLD,
      regenerate: [REPO]
    })

    expect(text.split('\n')[0]).toBe(
      'Replaced the hold on @axe-core/playwright 4.14.x in config/dependency-sets.json.'
    )
  })
})

describe('#renderHoldsText', () => {
  test('Should say when no package is held', () => {
    expect(renderHoldsText({ holds: [] })).toBe('No packages are held.')
  })

  test('Should give each hold its versions, date, repos, clash and reason', () => {
    const { clashesWith, ...plainHold } = { ...AXE_HOLD, package: 'lodash' }

    const text = renderHoldsText({ holds: [AXE_HOLD, plainHold] })

    expect(text).toBe(
      [
        '@axe-core/playwright 4.14.x, held since 2026-11-19',
        `  Repos: ${REPO}`,
        '  Clashes with: govuk-frontend',
        `  ${AXE_HOLD.reason}`,
        'lodash 4.14.x, held since 2026-11-19',
        `  Repos: ${REPO}`,
        `  ${AXE_HOLD.reason}`
      ].join('\n')
    )
  })
})

describe('#renderLiftText', () => {
  test('Should say the hold was lifted and give the command for each repo', () => {
    expect(renderLiftText({ lifted: AXE_HOLD, regenerate: [REPO] })).toBe(
      [
        'Lifted the hold on @axe-core/playwright 4.14.x in config/dependency-sets.json.',
        'Regenerate the Dependabot config of each repo it covers:',
        `  tim deps dependabot ${REPO} --write`
      ].join('\n')
    )
  })
})
