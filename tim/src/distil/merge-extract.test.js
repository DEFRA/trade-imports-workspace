import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { mergeExtractParts } from './merge-extract.js'
import { checkDistil, distilStatus } from './checks.js'
import { scopeHashOf } from './files.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace,
  splitExtractIntoParts
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const setUp = () => {
  workspace = makeDistilWorkspace()
  return splitExtractIntoParts(workspace)
}

const merge = (sourceId = 'repo:tests') =>
  mergeExtractParts({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA,
    sourceId
  })

const REFUSED =
  "merging repo:tests's extract parts in shared/demo. Nothing was written and the parts are kept"

const repoTestsSource = () =>
  workspace
    .readJson(workspace.layout.sources)
    .sources.find((source) => source.id === 'repo:tests')

describe('mergeExtractParts', () => {
  test('joins the parts into the one extract, every claim in part order', () => {
    const { whole, extractPath } = setUp()

    merge()

    expect(workspace.readJson(extractPath).claims).toEqual(whole.claims)
  })

  test("stamps the extract with the source's scope hash", () => {
    const { extractPath } = setUp()

    merge()

    expect(workspace.readJson(extractPath).scopeHash).toBe(
      scopeHashOf(repoTestsSource())
    )
  })

  test('says what it merged, part by part', () => {
    const { extractPath } = setUp()

    expect(merge()).toEqual({
      source: 'repo:tests',
      path: extractPath,
      replaced: false,
      scopeHash: scopeHashOf(repoTestsSource()),
      claims: 4,
      parts: [
        {
          part: 1,
          title: 'Suite layout and config',
          claims: 3,
          from: 'tests-001',
          to: 'tests-005'
        },
        {
          part: 2,
          title: 'Fixtures',
          claims: 1,
          from: 'tests-010',
          to: 'tests-010'
        }
      ]
    })
  })

  test('keeps the partition and the parts, and the extract checks out against them', () => {
    const { partitionPath, partPath } = setUp()

    merge()

    expect(
      [partitionPath, partPath(1), partPath(2)].filter(
        (path) => !existsSync(path)
      )
    ).toEqual([])
    expect(
      checkDistil({
        layout: workspace.layout,
        schemas: workspace.schemas,
        workarea: DEMO_WORKAREA,
        stage: 'all',
        sourceId: 'repo:tests'
      }).sources[0].state
    ).toBe('verified')
  })

  test('leaves the verification current when the claims are what it judged', () => {
    setUp()

    merge()

    expect(
      distilStatus({
        layout: workspace.layout,
        schemas: workspace.schemas,
        workarea: DEMO_WORKAREA
      }).work
    ).toEqual([])
  })

  test('writes nothing and names the part that has no file', () => {
    const { partPath, extractPath } = setUp()
    rmSync(partPath(2))

    expect(merge).toThrow(
      `1 problem ${REFUSED}:\ndistil/extract/repo-tests.part2.json does not exist yet: part 2 (Fixtures) has no extract.`
    )
    expect(existsSync(extractPath)).toBe(false)
  })

  test('refuses a claim id two parts both use', () => {
    const { partPath, partitionPath } = setUp()
    workspace.editJson(partPath(2), (part) => ({
      ...part,
      claims: [...part.claims, { ...workspace.readJson(partPath(1)).claims[0] }]
    }))
    workspace.editJson(partitionPath, (partition) => ({
      ...partition,
      parts: partition.parts.map((part) =>
        part.part === 2 ? { ...part, prefix: 'tests' } : part
      )
    }))

    expect(merge).toThrow(
      'distil/extract/repo-tests.part1.json and distil/extract/repo-tests.part2.json both have claim tests-001. A claim belongs to one part.'
    )
  })

  test("refuses a claim id another source's extract already has", () => {
    const { partPath } = setUp()
    workspace.editJson(partPath(2), (part) => ({
      ...part,
      claims: [{ ...part.claims[0], id: 'repo-tests-p2-001' }]
    }))
    workspace.editJson(
      `${workspace.layout.extractDir}/confluence-6608160092.json`,
      (extract) => ({
        ...extract,
        claims: [{ ...extract.claims[0], id: 'repo-tests-p2-001' }]
      })
    )

    expect(merge).toThrow(
      "distil/extract/repo-tests.part2.json claim repo-tests-p2-001 is also in confluence:6608160092's extract. Claim ids must be unique across the workarea, so give this source a prefix of its own."
    )
  })

  test('refuses a part file the partition does not name', () => {
    setUp()
    writeFileSync(`${workspace.layout.extractDir}/repo-tests.part3.json`, '{}')

    expect(merge).toThrow(
      'distil/extract/repo-tests.part3.json is not a part of distil/extract/repo-tests.partition.json, which has 2 parts.'
    )
  })

  test('names a part out of shape by its own file', () => {
    const { partPath } = setUp()
    workspace.editJson(partPath(1), ({ structure, ...part }) => part)

    expect(merge).toThrow(
      `1 problem ${REFUSED}:\ndistil/extract/repo-tests.part1.json has no "structure".`
    )
  })

  test('says so when the source has no partition', () => {
    workspace = makeDistilWorkspace()

    expect(merge).toThrow(
      "Can't find distil/extract/repo-tests.partition.json. The characterise step writes it, then one extract agent per part writes repo-tests.part1.json, repo-tests.part2.json and so on."
    )
  })

  test('says it replaced an extract that was already there', () => {
    const { whole, extractPath } = setUp()
    workspace.writeJson(extractPath, whole)

    expect(merge().replaced).toBe(true)
  })
})
