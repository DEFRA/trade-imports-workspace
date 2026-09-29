import { describe, test, expect, afterEach } from 'vitest'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { adoptSource } from './adopt.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const extractPath = (slug) => join(workspace.layout.extractDir, `${slug}.json`)
const verifyPath = (slug) => join(workspace.layout.verifyDir, `${slug}.json`)

const adopt = (sourceId = 'repo:tests') =>
  adoptSource({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA,
    sourceId
  })

/** The demo's repo:tests files as a hand-run DISTIL left them: no hashes. */
const unhashed = () => {
  workspace = makeDistilWorkspace()
  const extract = workspace.readJson(extractPath('repo-tests'))
  const verify = workspace.readJson(verifyPath('repo-tests'))
  workspace.editJson(
    extractPath('repo-tests'),
    ({ scopeHash, ...rest }) => rest
  )
  workspace.editJson(
    verifyPath('repo-tests'),
    ({ extractHash, ...rest }) => rest
  )
  return { extract, verify }
}

describe('adoptSource', () => {
  test('records both hashes, so status counts the source verified', () => {
    unhashed()

    expect(adopt()).toEqual({
      source: 'repo:tests',
      state: 'verified',
      extract: { path: extractPath('repo-tests'), stamped: true },
      verify: { path: verifyPath('repo-tests'), exists: true, stamped: true }
    })
  })

  test('writes the same hashes merge and stamp would have written', () => {
    const { extract, verify } = unhashed()

    adopt()

    expect(workspace.readJson(extractPath('repo-tests'))).toEqual(extract)
    expect(workspace.readJson(verifyPath('repo-tests'))).toEqual(verify)
  })

  test('stamps an extract with no verification, which then waits to be verified', () => {
    unhashed()
    rmSync(verifyPath('repo-tests'))

    expect(adopt()).toMatchObject({
      state: 'extracted',
      verify: { exists: false, stamped: false }
    })
  })

  test('refuses, writing nothing, a verification that judged an earlier extract', () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(
      extractPath('ruling-sam-2026-09-29c'),
      ({ scopeHash, ...extract }) => ({
        ...extract,
        claims: extract.claims.map((claim) => ({
          ...claim,
          statement: 'The performance-testing tool is JMeter.'
        }))
      })
    )
    const before = readFileSync(extractPath('ruling-sam-2026-09-29c'), 'utf8')

    expect(() => adopt('ruling:sam-2026-09-29c')).toThrow(
      'distil/verify/ruling-sam-2026-09-29c.json judged an earlier extract: the claims changed after it was verified. Verify it again.'
    )
    expect(readFileSync(extractPath('ruling-sam-2026-09-29c'), 'utf8')).toBe(
      before
    )
  })

  test('refuses an extract made for a different scope', () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(workspace.layout.sources, (sources) => ({
      ...sources,
      sources: sources.sources.map((source) =>
        source.id === 'repo:tests'
          ? { ...source, scope: 'the k6 specs' }
          : source
      )
    }))

    expect(() => adopt()).toThrow(
      `1 problem adopting repo:tests. Nothing was written:\ndistil/extract/repo-tests.json was extracted for a different scope. Extract it again, or, if the change does not touch what it holds, run: tim distil stamp ${DEMO_WORKAREA} --source repo:tests`
    )
  })

  test('refuses an extract out of shape', () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(
      extractPath('repo-tests'),
      ({ structure, ...rest }) => rest
    )

    expect(() => adopt()).toThrow(
      'distil/extract/repo-tests.json has no "structure".'
    )
  })
})
