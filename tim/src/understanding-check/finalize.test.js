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
import { finalizeText, finalizeVerdict, verdictFor } from './finalize.js'

const counts = (overrides) => ({
  FAIL: 0,
  PARTIAL: 0,
  security_fails: 0,
  coverage_gaps: 0,
  ...overrides
})

describe('#verdictFor', () => {
  test.each([
    [
      { FAIL: 3, security_fails: 1 },
      { verdict: 'high-risk', exit: 2, reason: 'security-category FAIL (1)' }
    ],
    [
      { FAIL: 3 },
      { verdict: 'high-risk', exit: 2, reason: 'FAIL count >= 3 (3)' }
    ],
    [
      { FAIL: 2, PARTIAL: 4 },
      { verdict: 'needs-review', exit: 1, reason: 'FAIL count 2' }
    ],
    [
      { PARTIAL: 3, coverage_gaps: 1 },
      { verdict: 'needs-review', exit: 1, reason: 'PARTIAL count 3 (>= 3)' }
    ],
    [
      { PARTIAL: 2, coverage_gaps: 2 },
      { verdict: 'needs-review', exit: 1, reason: 'coverage gaps (2)' }
    ],
    [
      { PARTIAL: 2 },
      {
        verdict: 'pass',
        exit: 0,
        reason: 'no FAIL/PARTIAL threshold, no coverage gaps'
      }
    ]
  ])('Should give %j the verdict %j', (given, expected) => {
    expect(verdictFor(counts(given))).toEqual(expected)
  })
})

describe('#finalizeVerdict', () => {
  let root

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const seedCheck = () => {
    root = mkdtempSync(join(tmpdir(), 'tim-uc-finalize-'))
    const folder = join(root, 'workareas', 'understanding-checks', 'EUDPA-9')
    mkdirSync(folder, { recursive: true })
    writeFileSync(
      join(folder, 'questions.json'),
      JSON.stringify({ questions: [{ id: 'Q1', category: 'security' }] })
    )
    writeFileSync(
      join(folder, 'transcript.json'),
      JSON.stringify({
        entries: [{ question_id: 'Q1', score: { verdict: 'FAIL' } }]
      })
    )
    writeFileSync(
      join(folder, '.interview-meta.json'),
      JSON.stringify({ ticket: 'EUDPA-9', coverage_gaps: [] })
    )
    return join(folder, '.interview-meta.json')
  }

  test('Should stamp the verdict, reason, exit code, time and counts after the keys the meta held', () => {
    const metaPath = seedCheck()

    const finalized = finalizeVerdict({
      workspaceRoot: root,
      ticket: 'EUDPA-9',
      now: '2026-11-14T10:00:00Z'
    })

    expect(finalized).toEqual({
      verdict: 'high-risk',
      exit: 2,
      reason: 'security-category FAIL (1)',
      meta_path: metaPath
    })
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    expect(Object.keys(meta)).toEqual([
      'ticket',
      'coverage_gaps',
      'verdict',
      'verdict_reason',
      'exit_code',
      'completed_at',
      'counts'
    ])
    expect(meta.completed_at).toBe('2026-11-14T10:00:00Z')
    expect(meta.counts.security_fails).toBe(1)
  })

  test('Should refuse, naming the meta file, when the check has none', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-uc-finalize-'))

    expect(() =>
      finalizeVerdict({ workspaceRoot: root, ticket: 'EUDPA-9', now: 'now' })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Error: ${join(root, 'workareas', 'understanding-checks', 'EUDPA-9', '.interview-meta.json')} not found`
      })
    )
  })
})

describe('#finalizeText', () => {
  test('Should print the verdict with its exit code, the reason and the meta path', () => {
    const text = finalizeText('EUDPA-9', {
      verdict: 'pass',
      exit: 0,
      reason: 'r',
      meta_path: '/m.json'
    })

    expect(text).toBe(
      'Verdict for EUDPA-9: pass (exit 0)\nReason: r\nMeta:   /m.json'
    )
  })
})
