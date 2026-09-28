import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildFields,
  findWarnings,
  computePlanId,
  buildPlan,
  MAX_DESCRIPTION_LENGTH,
  PLACEHOLDER_PATTERNS
} from './plan.js'

const baseManifest = () => ({
  project: 'EUDPA',
  type: 'Story',
  summary: 'Let importers save transporters they use a lot',
  labels: ['UCD'],
  attachments: [],
  relates: []
})

describe('buildFields', () => {
  test('maps the manifest onto Jira field shape', () => {
    const fields = buildFields(baseManifest(), 'the description')
    expect(fields).toEqual({
      project: { key: 'EUDPA' },
      summary: 'Let importers save transporters they use a lot',
      description: 'the description',
      issuetype: { name: 'Story' },
      labels: ['UCD']
    })
  })

  test('includes priority and parent only when set', () => {
    const fields = buildFields(
      { ...baseManifest(), priority: 'High', parent: 'EUDPA-100' },
      'body'
    )
    expect(fields.priority).toEqual({ name: 'High' })
    expect(fields.parent).toEqual({ key: 'EUDPA-100' })
  })
})

describe('findWarnings', () => {
  test('returns no warnings for clean, short text', () => {
    expect(
      findWarnings('A clean description with nothing left to fix.')
    ).toEqual([])
  })

  test('warns when the text is over the description limit', () => {
    const warnings = findWarnings('x'.repeat(MAX_DESCRIPTION_LENGTH + 1))
    expect(warnings.some((warning) => warning.includes('32767'))).toBe(true)
  })

  test.each(PLACEHOLDER_PATTERNS)(
    'warns when the placeholder "%s" is still present',
    (pattern) => {
      const warnings = findWarnings(`Some text. ${pattern} More text.`)
      expect(warnings.some((warning) => warning.includes(pattern))).toBe(true)
    }
  )
})

describe('computePlanId', () => {
  test('is stable for the same inputs', () => {
    const args = {
      manifest: baseManifest(),
      description: 'body',
      attachments: []
    }
    expect(computePlanId(args)).toBe(computePlanId(args))
  })

  test('is unaffected by label order', () => {
    const first = computePlanId({
      manifest: { ...baseManifest(), labels: ['a', 'b'] },
      description: 'body',
      attachments: []
    })
    const second = computePlanId({
      manifest: { ...baseManifest(), labels: ['b', 'a'] },
      description: 'body',
      attachments: []
    })
    expect(first).toBe(second)
  })

  test('changes when the description changes', () => {
    const args = { manifest: baseManifest(), attachments: [] }
    expect(computePlanId({ ...args, description: 'one' })).not.toBe(
      computePlanId({ ...args, description: 'two' })
    )
  })

  test('changes when an attachment hash changes, even with the same filename', () => {
    const args = { manifest: baseManifest(), description: 'body' }
    const first = computePlanId({
      ...args,
      attachments: [{ filename: 'a.txt', hash: 'hash-1' }]
    })
    const second = computePlanId({
      ...args,
      attachments: [{ filename: 'a.txt', hash: 'hash-2' }]
    })
    expect(first).not.toBe(second)
  })
})

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-jira-plan-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('buildPlan', () => {
  test('reads the description and attachments and returns a full plan', () => {
    writeFileSync(join(dir, 'description.txt'), 'A clean description.')
    writeFileSync(join(dir, 'screenshot.png'), Buffer.from('fake-bytes'))
    const manifest = {
      ...baseManifest(),
      descriptionFile: 'description.txt',
      attachments: ['screenshot.png']
    }

    const plan = buildPlan({ manifest, dir })

    expect(plan.fields.description).toBe('A clean description.')
    expect(plan.attachments).toEqual([
      {
        path: join(dir, 'screenshot.png'),
        filename: 'screenshot.png',
        size: 10,
        hash: expect.stringMatching(/^[0-9a-f]{64}$/)
      }
    ])
    expect(plan.warnings).toEqual([])
    expect(plan.planId).toMatch(/^[0-9a-f]{64}$/)
  })

  test('throws USAGE naming the path when the description file is missing', () => {
    const manifest = { ...baseManifest(), descriptionFile: 'missing.txt' }
    expect(() => buildPlan({ manifest, dir })).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('missing.txt')
      })
    )
  })

  test('throws USAGE naming the path when an attachment is missing', () => {
    writeFileSync(join(dir, 'description.txt'), 'body')
    const manifest = {
      ...baseManifest(),
      descriptionFile: 'description.txt',
      attachments: ['missing.png']
    }
    expect(() => buildPlan({ manifest, dir })).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('missing.png')
      })
    )
  })
})
