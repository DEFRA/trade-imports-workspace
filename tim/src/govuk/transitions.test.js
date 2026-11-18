import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  RUN_ID,
  stageGovukWorkspace
} from './__fixtures__/govuk-workspace.js'
import { versionsPath } from './state.js'
import {
  addVersionChange,
  classifyVersion,
  markVersionDone,
  markVersionFailed,
  stateTimestamp
} from './transitions.js'

const NOW = new Date('2026-11-14T03:04:05.678Z')

let staged

afterEach(() => staged?.remove())

const idsFor = (version) => ({
  workspaceRoot: staged.root,
  runId: RUN_ID,
  repo: ADMIN,
  version
})

const versionOnDisk = (version) =>
  JSON.parse(
    readFileSync(versionsPath(staged.root, RUN_ID, ADMIN), 'utf8')
  ).versions.find((entry) => entry.version === version)

describe('#stateTimestamp', () => {
  test('Should give UTC to the second with no milliseconds', () => {
    expect(stateTimestamp(NOW)).toBe('2026-11-14T03:04:05Z')
  })
})

describe('#classifyVersion', () => {
  test('Should write a noop with the time, a cleared summary and no changes', () => {
    staged = stageGovukWorkspace()

    classifyVersion({
      ...idsFor('5.9.1'),
      classification: 'noop',
      summary: '',
      now: NOW
    })

    expect(versionOnDisk('5.9.1')).toMatchObject({
      classification: 'noop',
      classified_at: '2026-11-14T03:04:05Z',
      summary: null,
      changes: []
    })
  })

  test('Should refuse another classification as a usage error', () => {
    staged = stageGovukWorkspace()

    expect(() =>
      classifyVersion({ ...idsFor('5.9.1'), classification: 'later' })
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Invalid --classification: later (must be todo|noop)'
      })
    )
  })
})

describe('#addVersionChange', () => {
  test('Should add the change after the existing ones', () => {
    staged = stageGovukWorkspace()

    const { entry } = addVersionChange({
      ...idsFor('5.6.0'),
      file: 'a.njk',
      why: 'Why',
      change: 'Change'
    })

    expect(entry.changes.map(({ file }) => file)).toEqual([
      'src/server/upload/index.njk',
      'a.njk'
    ])
  })
})

describe('#markVersionDone', () => {
  test('Should record the commit and clear the failure reason', () => {
    staged = stageGovukWorkspace()

    markVersionDone({ ...idsFor('5.7.0'), commit: 'abc1234', now: NOW })

    expect(versionOnDisk('5.7.0')).toMatchObject({
      implementation_status: 'done',
      implemented_at: '2026-11-14T03:04:05Z',
      commit_sha: 'abc1234',
      failure_reason: null
    })
  })
})

describe('#markVersionFailed', () => {
  test('Should refuse a missing reason as a usage error', () => {
    staged = stageGovukWorkspace()

    expect(() => markVersionFailed(idsFor('5.8.0'))).toThrow(
      expect.objectContaining({ code: 'USAGE', message: 'Missing --reason' })
    )
  })
})
