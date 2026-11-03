import { describe, test, expect, afterEach } from 'vitest'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

const stamp = (sourceId = 'repo:tests', workspaceRoot) =>
  stampScopeHash({
    layout: workspace.layout,
    schemas: workspace.schemas,
    sourceId,
    workspaceRoot
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
      repoHead: null,
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

describe('stampScopeHash, for a repo source', () => {
  const HEAD = '6666666666666666666666666666666666666666'

  const makeCheckout = (relative, head) => {
    const gitDir = join(workspace.root, relative, '.git')
    mkdirSync(gitDir, { recursive: true })
    writeFileSync(join(gitDir, 'HEAD'), `${head}\n`)
  }

  test('records the commit its checkout is on, so a stamped extract is watched too', () => {
    workspace = makeDistilWorkspace()
    makeCheckout('repos/trade-imports-ins-tests', HEAD)

    stamp('repo:tests', workspace.root)

    expect(JSON.parse(readFileSync(extractPath(), 'utf8')).repoHead).toBe(HEAD)
  })

  test('reports the commit it recorded', () => {
    workspace = makeDistilWorkspace()
    makeCheckout('repos/trade-imports-ins-tests', HEAD)

    expect(stamp('repo:tests', workspace.root)).toMatchObject({
      repoHead: HEAD
    })
  })

  test('records no commit when the checkout cannot be read', () => {
    workspace = makeDistilWorkspace()

    stamp('repo:tests', workspace.root)

    expect(
      JSON.parse(readFileSync(extractPath(), 'utf8')).repoHead
    ).toBeUndefined()
  })
})
