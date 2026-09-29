import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { mergeVerifyParts } from './merge-verify.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const verifyFile = (name) => join(workspace.layout.verifyDir, name)

const merge = (sourceId = 'repo:tests') =>
  mergeVerifyParts({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA,
    sourceId
  })

/**
 * Split the demo's repo:tests verification into two parts, the way two
 * verify agents given a claim range each would write them: the later range
 * first in the file listing, so the merge has to restore claim order.
 */
const splitIntoParts = () => {
  workspace = makeDistilWorkspace()
  const whole = workspace.readJson(verifyFile('repo-tests.json'))
  rmSync(verifyFile('repo-tests.json'))
  const [first, second, third, fourth] = whole.verdicts
  workspace.writeJson(verifyFile('repo-tests.part1.json'), {
    source: 'repo:tests',
    verdicts: [second, first],
    missed: whole.missed
  })
  workspace.writeJson(verifyFile('repo-tests.part2.json'), {
    source: 'repo:tests',
    verdicts: [third, fourth],
    missed: []
  })
  return whole
}

describe('mergeVerifyParts', () => {
  test('joins the parts in claim order into the one verify file', () => {
    const whole = splitIntoParts()

    merge()

    expect(workspace.readJson(verifyFile('repo-tests.json'))).toEqual(whole)
  })

  test('removes the parts once merged, and says what it did', () => {
    splitIntoParts()

    const result = merge()

    expect(result).toEqual({
      source: 'repo:tests',
      path: verifyFile('repo-tests.json'),
      parts: [
        verifyFile('repo-tests.part1.json'),
        verifyFile('repo-tests.part2.json')
      ],
      replaced: false,
      extractHash:
        '7075984fe85548fa7b546e38f5b16cb924bc1509b6418406b8baf0607e977005',
      verdicts: 4,
      held: 3,
      refuted: 1,
      missed: 1
    })
    expect(
      readdirSync(workspace.layout.verifyDir).filter((name) =>
        name.startsWith('repo-tests')
      )
    ).toEqual(['repo-tests.json'])
  })

  test('writes nothing and keeps the parts when a claim has no verdict', () => {
    splitIntoParts()
    rmSync(verifyFile('repo-tests.part2.json'))

    expect(merge).toThrow(
      "1 problem merging repo:tests's verify parts. Nothing was written and the parts are kept:\n" +
        'The merged verification of repo:tests has no verdict for 2 claims: tests-005, tests-010.'
    )
    expect(existsSync(verifyFile('repo-tests.json'))).toBe(false)
  })

  test('refuses two parts that judge the same claim', () => {
    splitIntoParts()
    workspace.editJson(verifyFile('repo-tests.part2.json'), (part) => ({
      ...part,
      verdicts: [
        ...part.verdicts,
        { id: 'tests-001', holds: false, reason: 'Again.' }
      ]
    }))

    expect(merge).toThrow(
      "1 problem merging repo:tests's verify parts. Nothing was written and the parts are kept:\n" +
        'The merged verification of repo:tests gives tests-001 more than one verdict.'
    )
  })

  test('names a part out of shape by its own file', () => {
    splitIntoParts()
    workspace.editJson(
      verifyFile('repo-tests.part2.json'),
      ({ missed, ...part }) => part
    )

    expect(merge).toThrow(
      'distil/verify/repo-tests.part2.json has no "missed".'
    )
  })

  test('says so when a source has no parts to merge', () => {
    workspace = makeDistilWorkspace()

    expect(merge).toThrow(
      'No verify part files for repo:tests. Each verify agent writes distil/verify/repo-tests.part1.json, repo-tests.part2.json and so on.'
    )
  })

  test('says it replaced a verify file that was already there', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(
      verifyFile('ruling-sam-2026-09-29c.part1.json'),
      workspace.readJson(verifyFile('ruling-sam-2026-09-29c.json'))
    )

    expect(merge('ruling:sam-2026-09-29c').replaced).toBe(true)
  })
})
