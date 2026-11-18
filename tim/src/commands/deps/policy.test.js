import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { z } from 'zod'
import { renderPolicyText } from './policy.js'
import { runTimInWorkspace, envelopeOf } from '../../test-support/tim-cli.js'
import { createDepsWorkspace } from '../../test-support/deps-workspace.js'

const envelopeSchema = z.object({
  ok: z.literal(true),
  schema_version: z.literal(1),
  result: z
    .object({
      package: z.string(),
      from: z.string(),
      to: z.string(),
      jump: z.enum(['major', 'minor', 'patch', 'prerelease']),
      set: z.string().nullable(),
      scope: z.enum(['repo', 'cross-repo']).nullable(),
      policy: z.enum(['ci-is-enough', 'changelog-driven']),
      reason: z.string()
    })
    .strict()
})

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const runPolicy = (...args) =>
  runTimInWorkspace(root, ['deps', 'policy', ...args, '--json'])

describe('tim deps policy', () => {
  test('Should print the policy of a set member as JSON', async () => {
    root = createDepsWorkspace()

    const run = await runPolicy(
      'govuk-frontend',
      '--from',
      '6.5.0',
      '--to',
      '6.6.0'
    )

    const { set, policy } = envelopeSchema.parse(envelopeOf(run)).result
    expect({ exitCode: run.exitCode, set, policy }).toEqual({
      exitCode: 0,
      set: 'govuk-frontend',
      policy: 'changelog-driven'
    })
  })

  test('Should refuse a missing --to as a usage error', async () => {
    root = createDepsWorkspace()

    const run = await runPolicy('lodash', '--from', '4.17.20')

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: 2,
      errors: [{ code: 'USAGE', message: 'Give the target version with --to.' }]
    })
  })

  test('Should refuse a version range as a usage error', async () => {
    root = createDepsWorkspace()

    const run = await runPolicy(
      'lodash',
      '--from',
      '^4.17.20',
      '--to',
      '4.17.21'
    )

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code
    }).toEqual({ exitCode: 2, code: 'USAGE' })
  })
})

describe('#renderPolicyText', () => {
  test('Should say the policy, the upgrade, the set and the reason', () => {
    const text = renderPolicyText({
      package: 'lodash',
      from: '4.16.0',
      to: '4.17.0',
      jump: 'minor',
      set: null,
      scope: null,
      policy: 'ci-is-enough',
      reason: 'lodash is in no set, and a minor upgrade needs only green CI.'
    })

    expect(text).toBe(
      [
        'lodash 4.16.0 to 4.17.0: ci-is-enough',
        'Upgrade: minor',
        'Set: none',
        'lodash is in no set, and a minor upgrade needs only green CI.'
      ].join('\n')
    )
  })
})
