import { rmSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { z } from 'zod'
import { createDepsWorkspace } from '../../test-support/deps-workspace.js'
import { envelopeOf, runTimInWorkspace } from '../../test-support/tim-cli.js'
import { renderDriftText } from './drift.js'

const FRONTEND = 'trade-imports-animals-frontend'

const driftEnvelope = z.object({
  ok: z.literal(true),
  schema_version: z.literal(1),
  result: z
    .object({
      ref: z.string(),
      repos: z.array(
        z
          .object({
            repo: z.string(),
            read: z.boolean(),
            packages: z.array(z.object({ package: z.string() }).passthrough()),
            counts: z.object({
              major: z.number(),
              minor: z.number(),
              patch: z.number()
            })
          })
          .strict()
      ),
      setsBehind: z.array(
        z.object({
          set: z.string(),
          behind: z.array(z.object({}).passthrough())
        })
      )
    })
    .strict()
})

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

describe('#renderDriftText', () => {
  test('Should give each repo its counts, mark a repo not read, and list each set behind with its holds', () => {
    const text = renderDriftText({
      ref: 'origin/main',
      repos: [
        {
          repo: FRONTEND,
          read: true,
          counts: { major: 1, minor: 2, patch: 0 }
        },
        { repo: 'tim', read: false, counts: { major: 0, minor: 0, patch: 0 } }
      ],
      setsBehind: [
        {
          set: 'playwright',
          behind: [
            {
              repo: FRONTEND,
              package: '@playwright/test',
              current: '1.65.0',
              proposed: '1.65.1',
              held: true
            }
          ]
        }
      ]
    })

    expect(text).toBe(
      [
        'Packages behind their latest release, at origin/main:',
        `${FRONTEND}: 1 major, 2 minor, 0 patch`,
        'tim: no package.json to read',
        '',
        'playwright is behind in:',
        `  ${FRONTEND}: @playwright/test 1.65.0 to 1.65.1 (held)`
      ].join('\n')
    )
  })

  test('Should say every cross-repo set is on its latest release when none is behind', () => {
    const text = renderDriftText({
      ref: 'origin/main',
      repos: [],
      setsBehind: []
    })

    expect(text.split('\n').at(-1)).toBe(
      'Every cross-repo set is on its latest release.'
    )
  })
})

describe('tim deps drift', () => {
  test('Should report a repo with no package.json at origin/main as not read, in the JSON envelope', async () => {
    root = createDepsWorkspace()

    const result = await runTimInWorkspace(root, [
      'deps',
      'drift',
      '--repo',
      FRONTEND,
      '--json'
    ])

    expect(result.exitCode).toBe(0)
    expect(driftEnvelope.parse(envelopeOf(result)).result).toEqual({
      ref: 'origin/main',
      repos: [
        {
          repo: FRONTEND,
          read: false,
          packages: [],
          counts: { major: 0, minor: 0, patch: 0 }
        }
      ],
      setsBehind: []
    })
  })

  test('Should refuse a repo out of scope with exit 2', async () => {
    root = createDepsWorkspace()

    const result = await runTimInWorkspace(root, [
      'deps',
      'drift',
      '--repo',
      'trade-imports-animals-backend'
    ])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain(
      'trade-imports-animals-backend is not in scope for the dependency sets.'
    )
  })
})
