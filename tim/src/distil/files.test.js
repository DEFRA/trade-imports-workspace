import { describe, test, expect, afterEach } from 'vitest'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DISTIL_SCHEMA_DIR,
  extractPartsOf,
  loadDistilSchemas,
  orphanFilesOf,
  readJsonLenient,
  requirementFingerprintOf,
  scopeHashOf,
  slugOf,
  verifyPartsOf
} from './files.js'
import { makeDistilWorkspace } from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const withoutDescriptions = (schema) =>
  JSON.parse(
    JSON.stringify(schema, (key, value) =>
      key === 'description' ? undefined : value
    )
  )

describe('slugOf', () => {
  test('turns the colon in a source id into a hyphen', () => {
    expect(slugOf('confluence:6518997274')).toBe('confluence-6518997274')
  })

  test('keeps dots and hyphens, and folds any other run into one hyphen', () => {
    expect(slugOf('web:grafana.com/docs k6')).toBe('web-grafana.com-docs-k6')
  })
})

describe('scopeHashOf', () => {
  const source = {
    id: 'repo:tests',
    kind: 'repo',
    locator: 'repos/trade-imports-ins-tests',
    scope: 'the plants specs',
    role: 'what is already proven end to end'
  }

  test('is the hash an extract of the demo workarea records', () => {
    workspace = makeDistilWorkspace()
    const sources = workspace.readJson(workspace.layout.sources)
    const extract = workspace.readJson(
      join(workspace.layout.extractDir, 'repo-tests.json')
    )

    expect(scopeHashOf(sources.sources[1])).toBe(extract.scopeHash)
  })

  test('changes when the scope changes', () => {
    expect(scopeHashOf({ ...source, scope: 'the animals specs' })).not.toBe(
      scopeHashOf(source)
    )
  })

  test('does not change when only the role changes', () => {
    expect(scopeHashOf({ ...source, role: 'something else' })).toBe(
      scopeHashOf(source)
    )
  })
})

describe('verifyPartsOf', () => {
  test('lists one source part files in part-number order', () => {
    workspace = makeDistilWorkspace()
    const { verifyDir } = workspace.layout
    for (const name of [
      'repo-tests.part10.json',
      'repo-tests.part2.json',
      'repo-tests.part1.json',
      'repo-testsx.part1.json'
    ]) {
      writeFileSync(join(verifyDir, name), '{}')
    }

    expect(
      verifyPartsOf(workspace.layout, 'repo-tests').map((part) => part.part)
    ).toEqual([1, 2, 10])
  })
})

describe('extractPartsOf', () => {
  test('lists one source extract part files in part-number order, never its partition', () => {
    workspace = makeDistilWorkspace()
    const { extractDir } = workspace.layout
    for (const name of [
      'repo-tests.part2.json',
      'repo-tests.part1.json',
      'repo-tests.partition.json',
      'repo-testsx.part1.json'
    ]) {
      writeFileSync(join(extractDir, name), '{}')
    }

    expect(
      extractPartsOf(workspace.layout, 'repo-tests').map((part) => part.path)
    ).toEqual([
      join(extractDir, 'repo-tests.part1.json'),
      join(extractDir, 'repo-tests.part2.json')
    ])
  })
})

describe('orphanFilesOf', () => {
  test('names a partition no source owns, and not one a source owns', () => {
    workspace = makeDistilWorkspace()
    const { extractDir } = workspace.layout
    writeFileSync(join(extractDir, 'repo-gone.partition.json'), '{}')
    writeFileSync(join(extractDir, 'repo-tests.partition.json'), '{}')

    expect(
      orphanFilesOf(
        workspace.layout,
        new Set([
          'repo-tests',
          'ruling-sam-2026-09-29c',
          'confluence-6608160092'
        ])
      )
    ).toEqual([join(extractDir, 'repo-gone.partition.json')])
  })

  test('names extract and verify files no source owns, parts included', () => {
    workspace = makeDistilWorkspace()
    const { extractDir, verifyDir } = workspace.layout
    writeFileSync(join(extractDir, 'repo-gone.json'), '{}')
    writeFileSync(join(verifyDir, 'repo-gone.part1.json'), '{}')
    writeFileSync(join(verifyDir, 'repo-tests.part1.json'), '{}')

    expect(
      orphanFilesOf(
        workspace.layout,
        new Set([
          'repo-tests',
          'ruling-sam-2026-09-29c',
          'confluence-6608160092'
        ])
      )
    ).toEqual([
      join(extractDir, 'repo-gone.json'),
      join(verifyDir, 'repo-gone.part1.json')
    ])
  })
})

describe('readJsonLenient', () => {
  test('says a missing file does not exist, without throwing', () => {
    workspace = makeDistilWorkspace()

    expect(readJsonLenient(join(workspace.root, 'nope.json'))).toEqual({
      exists: false
    })
  })

  test('says a broken file is not valid JSON, without throwing', () => {
    workspace = makeDistilWorkspace()
    const path = join(workspace.root, 'broken.json')
    writeFileSync(path, '{ nope')

    expect(readJsonLenient(path).error).toMatch(/^is not valid JSON: /)
  })
})

describe('loadDistilSchemas', () => {
  test('names a missing schema and what it is for', () => {
    workspace = makeDistilWorkspace()
    const missing = join(
      workspace.root,
      DISTIL_SCHEMA_DIR,
      'verify.schema.json'
    )
    rmSync(missing)

    expect(() => loadDistilSchemas(workspace.root)).toThrow(
      `Can't find the verify schema at ${missing}. tim distil checks every verify file against it.`
    )
  })

  test('the extract and verify schemas define the same claim shape', () => {
    workspace = makeDistilWorkspace()
    const { extract, verify } = workspace.schemas

    expect(withoutDescriptions(verify.$defs.claim)).toEqual(
      withoutDescriptions(extract.$defs.claim)
    )
  })
})

describe('requirementFingerprintOf', () => {
  const REQUIREMENT = {
    id: 'req-002',
    statement: 'The smoke run fails a pull request on a breached threshold.',
    why: 'So a slower change fails its check.',
    claims: ['confluence-6608160092-004'],
    status: 'adopted',
    delta: 'new'
  }

  test('stays the same when a re-distil rewords the why or cites other claims', () => {
    expect(
      requirementFingerprintOf({
        ...REQUIREMENT,
        why: 'Reworded.',
        claims: ['repo-tests-002']
      })
    ).toBe(requirementFingerprintOf(REQUIREMENT))
  })

  test('changes when what is to be built changes', () => {
    expect(
      [
        { ...REQUIREMENT, statement: 'The smoke run warns on a breach.' },
        { ...REQUIREMENT, status: 'question' },
        { ...REQUIREMENT, blockedBy: 'CDP must open the port.' }
      ].map(requirementFingerprintOf)
    ).not.toContain(requirementFingerprintOf(REQUIREMENT))
  })
})
