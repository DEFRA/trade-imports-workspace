import { describe, test, expect, afterEach } from 'vitest'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stampScopeHash } from './stamp.js'
import { scopeHashOf } from './files.js'
import { makeDistilWorkspace } from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const extractPath = () => join(workspace.layout.extractDir, 'repo-tests.json')

const stamp = (sourceId = 'repo:tests') =>
  stampScopeHash({
    layout: workspace.layout,
    schemas: workspace.schemas,
    sourceId
  })

const testsSource = () =>
  workspace
    .readJson(workspace.layout.sources)
    .sources.find((source) => source.id === 'repo:tests')

describe('stampScopeHash', () => {
  test('records the current scope hash in an extract that has none', () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(extractPath(), ({ scopeHash, ...extract }) => extract)

    stamp()

    expect(workspace.readJson(extractPath()).scopeHash).toBe(
      scopeHashOf(testsSource())
    )
  })

  test('keeps the claims last, after the hash', () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(extractPath(), ({ scopeHash, ...extract }) => extract)

    stamp()

    expect(Object.keys(workspace.readJson(extractPath()))).toEqual([
      'source',
      'structure',
      'scopeHash',
      'claims'
    ])
  })

  test('replaces a hash from an old scope, and says what it was', () => {
    workspace = makeDistilWorkspace()
    const before = workspace.readJson(extractPath()).scopeHash
    workspace.editJson(workspace.layout.sources, (sources) => ({
      ...sources,
      sources: sources.sources.map((source) =>
        source.id === 'repo:tests'
          ? { ...source, scope: 'the k6 specs' }
          : source
      )
    }))

    expect(stamp()).toEqual({
      source: 'repo:tests',
      path: extractPath(),
      scopeHash: scopeHashOf(testsSource()),
      before,
      changed: true
    })
  })

  test('writes nothing when the hash is already current', () => {
    workspace = makeDistilWorkspace()
    const original = readFileSync(extractPath(), 'utf8')

    const result = stamp()

    expect(result.changed).toBe(false)
    expect(readFileSync(extractPath(), 'utf8')).toBe(original)
  })

  test('names a missing extract', () => {
    workspace = makeDistilWorkspace()
    rmSync(extractPath())

    expect(stamp).toThrow(
      `Can't find ${extractPath()}. Write the extract before stamping it.`
    )
  })

  test('names an extract that is not JSON', () => {
    workspace = makeDistilWorkspace()
    writeFileSync(extractPath(), '{ nope')

    expect(stamp).toThrow(/is not valid JSON/)
  })

  test('names a source that is not in sources.json', () => {
    workspace = makeDistilWorkspace()

    expect(() => stamp('repo:gone')).toThrow(
      `Can't find source repo:gone in ${workspace.layout.sources}.`
    )
  })
})
