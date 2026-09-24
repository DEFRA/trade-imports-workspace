import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  resolveRun,
  loadFindings,
  listFindings,
  countFindings,
  ruleFinding,
  markApplied,
  ruleBucket,
  renderReport,
  writeReport,
  createRun,
  assertRunRuled
} from './findings.js'

const finding = (overrides = {}) => ({
  id: 'F-001',
  verdict: 'spec-wrong',
  capability: 'live-animals/addresses',
  anchor: 'SCN-ADDR-001-A',
  judgement: 'The behaviour changed.',
  evidence: { test: 'a.spec.ts:12', commit: 'abc1234' },
  proposal: { file: 'openspec/specs/x/spec.md', diff: '-old\n+new' },
  ...overrides
})

const findingsFile = (overrides = {}) => ({
  date: '2026-09-24',
  baseline: { verifiedAt: '2026-09-16', verifiedBy: '8932fbf9' },
  findings: [finding()],
  noActionBucket: { capabilities: 16 },
  ...overrides
})

let root
let runDir

const seed = (contents) => {
  root = mkdtempSync(join(tmpdir(), 'tim-findings-'))
  runDir = join(root, 'workareas', 'spec-catchup', '2026-09-24')
  mkdirSync(runDir, { recursive: true })
  writeFileSync(
    join(runDir, 'findings.json'),
    JSON.stringify(contents ?? findingsFile())
  )
}

beforeEach(() => seed())
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('resolveRun', () => {
  test('picks the most recent run when none is named', () => {
    const older = join(root, 'workareas', 'spec-catchup', '2026-09-01')
    mkdirSync(older, { recursive: true })
    writeFileSync(join(older, 'findings.json'), JSON.stringify(findingsFile()))

    expect(resolveRun({ workspaceRoot: root })).toBe(runDir)
  })

  test('ignores a run directory with no findings file', () => {
    const empty = join(root, 'workareas', 'spec-catchup', '2026-12-31')
    mkdirSync(empty, { recursive: true })

    expect(resolveRun({ workspaceRoot: root })).toBe(runDir)
  })

  test('says where it looked when a named run has no findings', () => {
    expect(() =>
      resolveRun({ workspaceRoot: root, run: '2026-01-01' })
    ).toThrow(/Can't find findings.json for run 2026-01-01/)
  })

  test('tells you to run spec-catchup when there is no run at all', () => {
    rmSync(join(root, 'workareas'), { recursive: true, force: true })

    expect(() => resolveRun({ workspaceRoot: root })).toThrow(
      /Run spec-catchup first/
    )
  })
})

describe('loadFindings', () => {
  test('defaults the fields a judge may leave out', () => {
    seed(
      findingsFile({
        findings: [
          {
            id: 'F-002',
            verdict: 'no-action',
            capability: 'x',
            judgement: 'Copy only.'
          }
        ]
      })
    )

    const [entry] = loadFindings(runDir).findings

    expect(entry.status).toBe('pending')
    expect(entry.disposition).toBeNull()
    expect(entry.anchor).toBeNull()
    expect(entry.proposal).toBeNull()
    expect(entry.evidence).toEqual({})
  })

  test('refuses a finding with no judgement, naming the field', () => {
    seed(
      findingsFile({
        findings: [
          { id: 'F-001', verdict: 'spec-gap', capability: 'x', judgement: '' }
        ]
      })
    )

    expect(() => loadFindings(runDir)).toThrow(/one-sentence call/)
  })

  test('refuses a duplicated finding id', () => {
    seed(findingsFile({ findings: [finding(), finding()] }))

    expect(() => loadFindings(runDir)).toThrow(/uses the id F-001 twice/)
  })

  test('refuses a file that is not JSON', () => {
    writeFileSync(join(runDir, 'findings.json'), 'not json {{{')

    expect(() => loadFindings(runDir)).toThrow(/Can't read/)
  })
})

describe('ruling a finding', () => {
  test('accept records the disposition and leaves it not yet applied', () => {
    const ruled = ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })

    expect(ruled.disposition).toBe('accept')
    expect(ruled.status).toBe('accepted')
  })

  test('applied is refused until a person accepted it', () => {
    expect(() => markApplied({ runDir, id: 'F-001' })).toThrow(
      /is pending, not accepted/
    )
  })

  test('applied follows an accept', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })

    expect(markApplied({ runDir, id: 'F-001' }).status).toBe('applied')
  })

  test('a reject keeps the note that explains it', () => {
    const ruled = ruleFinding({
      runDir,
      id: 'F-001',
      disposition: 'reject',
      note: 'already covered by SCN-ADDR-002-A'
    })

    expect(ruled.status).toBe('rejected')
    expect(ruled.note).toBe('already covered by SCN-ADDR-002-A')
  })

  test('names the ids to look at when the finding does not exist', () => {
    expect(() =>
      ruleFinding({ runDir, id: 'F-999', disposition: 'accept' })
    ).toThrow(/tim spec findings list/)
  })

  test('the ruling survives a reload, so a walk can be interrupted', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'defer' })

    expect(loadFindings(runDir).findings[0].status).toBe('deferred')
  })
})

describe('countFindings', () => {
  test('a deferred finding is still open, because deferring is not deciding', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'defer' })
    ruleBucket({ runDir, disposition: 'accept' })

    const counts = countFindings(loadFindings(runDir))

    expect(counts.pending).toBe(0)
    expect(counts.open).toBe(1)
    expect(counts.allRuled).toBe(false)
  })

  test('accept alone is not allRuled — the change must also be applied', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })
    ruleBucket({ runDir, disposition: 'accept' })

    const counts = countFindings(loadFindings(runDir))

    expect(counts.unapplied).toBe(1)
    expect(counts.allRuled).toBe(false)
  })

  test('everything ruled once each finding is applied and the bucket is settled', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })
    markApplied({ runDir, id: 'F-001' })
    ruleBucket({ runDir, disposition: 'accept' })

    expect(countFindings(loadFindings(runDir)).allRuled).toBe(true)
  })

  test('an empty bucket needs no ruling', () => {
    seed(findingsFile({ noActionBucket: { capabilities: 0 } }))
    ruleFinding({ runDir, id: 'F-001', disposition: 'reject' })

    expect(countFindings(loadFindings(runDir)).allRuled).toBe(true)
  })
})

describe('listFindings', () => {
  test('orders by verdict so the mechanical ones come first', () => {
    seed(
      findingsFile({
        findings: [
          finding({ id: 'F-003', verdict: 'no-action' }),
          finding({ id: 'F-002', verdict: 'spec-gap' }),
          finding({ id: 'F-001', verdict: 'stale-link' })
        ]
      })
    )

    expect(
      listFindings(loadFindings(runDir)).map((entry) => entry.verdict)
    ).toEqual(['stale-link', 'spec-gap', 'no-action'])
  })

  test('--pending drops the ones already ruled', () => {
    seed(
      findingsFile({
        findings: [finding({ id: 'F-001' }), finding({ id: 'F-002' })]
      })
    )
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })

    expect(
      listFindings(loadFindings(runDir), true).map((entry) => entry.id)
    ).toEqual(['F-002'])
  })
})

describe('renderReport', () => {
  test('says the report is generated, so nobody edits it by hand', () => {
    expect(renderReport(loadFindings(runDir))).toContain(
      'edit the findings, not this file'
    )
  })

  test('shows each finding, its ruling and the proposed diff', () => {
    const text = renderReport(loadFindings(runDir))

    expect(text).toContain('SCN-ADDR-001-A')
    expect(text).toContain('not yet ruled')
    expect(text).toContain('+new')
  })

  test('says what accepting the NO ACTION bucket wholesale means', () => {
    expect(renderReport(loadFindings(runDir))).toContain('accepts the judge')
  })

  test('withholds the advance command until everything is ruled and applied', () => {
    expect(renderReport(loadFindings(runDir))).toContain(
      'Rule them before finishing this run'
    )

    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })
    ruleBucket({ runDir, disposition: 'accept' })

    expect(renderReport(loadFindings(runDir))).toContain(
      'accepted but not applied'
    )

    markApplied({ runDir, id: 'F-001' })

    expect(renderReport(loadFindings(runDir))).toContain(
      'tim spec baseline --advance --require-ruled'
    )
  })

  test('writeReport puts it beside the findings', () => {
    const path = writeReport(runDir)

    expect(readFileSync(path, 'utf8')).toContain('# Spec catch-up — 2026-09-24')
  })
})

describe('createRun', () => {
  test('writes findings.json and report.md under the skill runs dir', () => {
    const { runDir: created, data } = createRun({
      workspaceRoot: root,
      skill: 'cover',
      date: '2026-09-25',
      baseline: { verifiedAt: '2026-09-16', verifiedBy: '8932fbf9' },
      findings: [
        {
          id: 'F-001',
          verdict: 'write-test',
          capability: 'plants/authentication',
          anchor: 'SCN-PLANTS-AUTH-002-A',
          judgement: 'No test proves the invalid-credentials message.',
          proposal: {
            file: 'tests/e2e/auth.spec.ts',
            repo: 'trade-imports-animals-tests',
            type: 'e2e',
            diff: '+test("rejects invalid credentials", async () => {})'
          }
        }
      ]
    })

    expect(created).toContain('spec-cover')
    expect(data.skill).toBe('cover')
    expect(existsSync(join(created, 'findings.json'))).toBe(true)
    expect(readFileSync(join(created, 'report.md'), 'utf8')).toContain(
      'Spec cover'
    )
  })

  test('refuses to overwrite a run that already has rulings', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })

    expect(() =>
      createRun({
        workspaceRoot: root,
        skill: 'catchup',
        date: '2026-09-24',
        baseline: { verifiedAt: '2026-09-16', verifiedBy: '8932fbf9' },
        findings: [
          {
            id: 'F-001',
            verdict: 'stale-link',
            capability: 'x',
            judgement: 'The behaviour is unchanged and only the test moved.'
          }
        ]
      })
    ).toThrow(/already has rulings/)
  })

  test('--force overwrites a ruled run', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })

    const { data } = createRun({
      workspaceRoot: root,
      skill: 'catchup',
      date: '2026-09-24',
      baseline: { verifiedAt: '2026-09-16', verifiedBy: '8932fbf9' },
      findings: [
        {
          id: 'F-009',
          verdict: 'stale-link',
          capability: 'y',
          judgement: 'The behaviour is unchanged and only the test moved.'
        }
      ],
      force: true
    })

    expect(data.findings[0].id).toBe('F-009')
    expect(data.findings[0].disposition).toBeNull()
  })
})

describe('assertRunRuled', () => {
  test('refuses while findings are still open', () => {
    expect(() => assertRunRuled({ workspaceRoot: root })).toThrow(
      /Can't advance the baseline yet/
    )
  })

  test('passes once everything is applied', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })
    markApplied({ runDir, id: 'F-001' })
    ruleBucket({ runDir, disposition: 'accept' })

    expect(assertRunRuled({ workspaceRoot: root }).ok).toBe(true)
  })

  test('cover cannot advance the baseline', () => {
    expect(() =>
      assertRunRuled({ workspaceRoot: root, skill: 'cover' })
    ).toThrow(/does not advance the baseline/)
  })

  test('refuses when candidates.json still has unjudged packets', () => {
    ruleFinding({ runDir, id: 'F-001', disposition: 'accept' })
    markApplied({ runDir, id: 'F-001' })
    ruleBucket({ runDir, disposition: 'accept' })
    writeFileSync(
      join(runDir, 'candidates.json'),
      JSON.stringify({
        result: {
          workPackets: [
            { capability: 'live-animals/addresses' },
            { capability: 'plants/authentication' }
          ],
          unresolvedLinks: []
        }
      })
    )

    expect(() => assertRunRuled({ workspaceRoot: root })).toThrow(
      /never judged: plants\/authentication/
    )
  })
})

describe('createRun scope', () => {
  test('refuses a seed that leaves a work packet unjudged', () => {
    expect(() =>
      createRun({
        workspaceRoot: root,
        date: '2026-09-25',
        baseline: { verifiedAt: '2026-09-16', verifiedBy: '8932fbf9' },
        findings: [finding()],
        scope: {
          workPackets: ['live-animals/addresses', 'plants/authentication'],
          unresolvedLinks: []
        }
      })
    ).toThrow(/never judged: plants\/authentication/)
  })
})
