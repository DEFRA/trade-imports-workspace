import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { prettierJson } from './json-layout.js'
import {
  AXE_HOLD,
  CHECKOUT_WORKSPACE_ROOT,
  fixtureDependencySetsHolding
} from '../test-support/deps-workspace.js'

const FIXTURE_PATH = fileURLToPath(
  new URL('./fixtures/dependency-sets.json', import.meta.url)
)

const textOf = (path) => readFileSync(path, 'utf8')

describe('#prettierJson', () => {
  test("Should lay out the workspace's config/dependency-sets.json exactly as it is committed", () => {
    const committed = textOf(
      join(CHECKOUT_WORKSPACE_ROOT, 'config', 'dependency-sets.json')
    )

    expect(prettierJson(JSON.parse(committed))).toBe(committed)
  })

  test('Should lay out the dependency sets fixture exactly as it is committed', () => {
    const committed = textOf(FIXTURE_PATH)

    expect(prettierJson(JSON.parse(committed))).toBe(committed)
  })

  test('Should lay out the fixture holding a hold exactly as Prettier formats it', async () => {
    const laidOut = prettierJson(fixtureDependencySetsHolding([AXE_HOLD]))

    const formatted = await format(laidOut, {
      ...(await resolveConfig(FIXTURE_PATH)),
      parser: 'json'
    })

    expect(formatted).toBe(laidOut)
  })

  test('Should keep a short list on one line and put each item of a long list on its own line', () => {
    const value = {
      short: ['one', 'two'],
      long: Array.from({ length: 8 }, (_, index) => `package-number-${index}`)
    }

    expect(prettierJson(value)).toBe(
      [
        '{',
        '  "short": ["one", "two"],',
        '  "long": [',
        ...Array.from(
          { length: 8 },
          (_, index) => `    "package-number-${index}"${index < 7 ? ',' : ''}`
        ),
        '  ]',
        '}',
        ''
      ].join('\n')
    )
  })

  test('Should break a list of objects onto its own lines, write empty lists and objects bare and leave out undefined keys', () => {
    const value = {
      holds: [{ package: 'axe', link: undefined, repos: [] }],
      empty: {}
    }

    expect(prettierJson(value)).toBe(
      [
        '{',
        '  "holds": [',
        '    {',
        '      "package": "axe",',
        '      "repos": []',
        '    }',
        '  ],',
        '  "empty": {}',
        '}',
        ''
      ].join('\n')
    )
  })
})
