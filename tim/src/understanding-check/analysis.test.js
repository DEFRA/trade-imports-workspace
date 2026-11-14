import { afterEach, describe, expect, test } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  addFinding,
  completeAnalysis,
  completeAnalysisText,
  splitField
} from './analysis.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedAnalysis = (analysis) => {
  root = mkdtempSync(join(tmpdir(), 'tim-uc-analysis-'))
  const folder = join(root, 'workareas', 'understanding-checks', 'EUDPA-3')
  mkdirSync(folder, { recursive: true })
  const path = join(folder, 'analysis.stub.json')
  writeFileSync(path, JSON.stringify(analysis))
  return path
}

const readAnalysis = (path) => JSON.parse(readFileSync(path, 'utf8'))

const findingOptions = (overrides) => ({
  workspaceRoot: root,
  ticket: 'EUDPA-3',
  repo: 'stub',
  section: 'edgeCases',
  evidenceFile: 'a.js',
  evidenceLines: '4-6',
  fields: ['note=n'],
  ...overrides
})

describe('#splitField', () => {
  test('Should split on the first equals sign only', () => {
    expect(splitField('rule=a=b')).toEqual(['rule', 'a=b'])
  })

  test('Should refuse a field with no equals sign', () => {
    expect(() => splitField('rule')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: "Error: --field expects KEY=VALUE, got 'rule'"
      })
    )
  })
})

describe('#addFinding', () => {
  test('Should give a finding the id after the highest in its section, then its fields, then its evidence', () => {
    const path = seedAnalysis({ edgeCases: [{ id: 7 }, { id: 2 }] })

    const added = addFinding(findingOptions({ fields: ['b=2', 'a=1', 'b=3'] }))

    expect(added).toEqual({ id: 8 })
    const finding = readAnalysis(path).edgeCases.at(-1)
    expect(Object.entries(finding)).toEqual([
      ['id', 8],
      ['b', '3'],
      ['a', '1'],
      ['evidence', { file: 'a.js', lines: '4-6' }]
    ])
  })

  test('Should start a section that is not there yet at id 1', () => {
    const path = seedAnalysis({})

    addFinding(findingOptions())

    expect(readAnalysis(path).edgeCases.map(({ id }) => id)).toEqual([1])
  })

  test('Should refuse a section outside the seven', () => {
    seedAnalysis({})

    expect(() => addFinding(findingOptions({ section: 'style' }))).toThrow(
      "Error: invalid --section 'style'"
    )
  })

  test('Should refuse a finding with no fields', () => {
    seedAnalysis({})

    expect(() => addFinding(findingOptions({ fields: [] }))).toThrow(
      'Error: at least one --field KEY=VALUE is required'
    )
  })

  test('Should refuse a finding with no evidence lines', () => {
    seedAnalysis({})

    expect(() => addFinding(findingOptions({ evidenceLines: '' }))).toThrow(
      'Error: missing required arg EV_LINES'
    )
  })
})

describe('#completeAnalysis', () => {
  const completeOptions = (overrides) => ({
    workspaceRoot: root,
    ticket: 'EUDPA-3',
    repo: 'stub',
    changeSummary: 'What.',
    whyItChanged: 'Why.',
    now: '2026-11-14T09:00:00Z',
    ...overrides
  })

  test('Should stamp the summary, the reason, complete and the time', () => {
    const path = seedAnalysis({ repo: 'stub', verdict: null })

    completeAnalysis(completeOptions())

    expect(readAnalysis(path)).toEqual({
      repo: 'stub',
      verdict: 'complete',
      changeSummary: 'What.',
      whyItChanged: 'Why.',
      completed_at: '2026-11-14T09:00:00Z'
    })
  })

  test('Should count characters, not UTF-16 units, against the 300 cap', () => {
    const path = seedAnalysis({})

    completeAnalysis(completeOptions({ changeSummary: '😀'.repeat(300) }))

    expect([...readAnalysis(path).changeSummary]).toHaveLength(300)
  })

  test('Should refuse a reason over 300 characters', () => {
    seedAnalysis({})

    expect(() =>
      completeAnalysis(completeOptions({ whyItChanged: 'y'.repeat(301) }))
    ).toThrow('Error: --why-it-changed exceeds 300 chars (got 301)')
  })
})

describe('#completeAnalysisText', () => {
  test('Should name the repo marked complete', () => {
    expect(completeAnalysisText({ repo: 'stub' })).toBe(
      'Marked stub analysis complete.'
    )
  })
})
