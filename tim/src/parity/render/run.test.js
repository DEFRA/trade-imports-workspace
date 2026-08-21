import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runReport, reportWarnings } from './run.js'
import { DEFAULT_BANDS } from '../corpus-profile.js'

describe('runReport', () => {
  let root
  let profile

  const increment = {
    id: 'inc-001',
    type: 'gap',
    milestone: null,
    domain: 'documents',
    title: 'The frontend asks for a document type',
    detail: 'The prototype asks which kind of paperwork this is.',
    screens: ['fe-documents'],
    evidence: {},
    confidence: 'high',
    band: 'frontend-only',
    gate: null,
    dependsOn: [],
    status: 'todo',
    commit: null,
    failure_reason: null
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'tim-parity-render-'))
    const backlog = join(root, 'backlog.json')
    await writeFile(
      backlog,
      JSON.stringify({
        run_id: 'EUDPA-000-TEST',
        target: 'test',
        increments: [increment]
      })
    )
    const reportDir = join(root, 'report')
    await mkdir(reportDir, { recursive: true })
    profile = {
      id: 'test',
      runId: 'EUDPA-000-TEST',
      bands: DEFAULT_BANDS,
      sides: [
        {
          id: 'frontend',
          label: 'Frontend',
          repo: 'frontend',
          screenPrefix: 'fe-',
          modelDir: join(root, 'frontend', 'model'),
          screensDir: join(root, 'frontend', 'screens')
        }
      ],
      paths: {
        backlog,
        deferred: join(root, 'deferred.json'),
        meta: join(root, 'meta.json'),
        evidence: join(root, 'evidence.json'),
        reportDir,
        deltasDir: join(root, 'deltas'),
        upstreamFindings: null,
        enumeratorModule: null
      }
    }
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  test('the report is a page and its two static files, with no pictures beside them', async () => {
    await runReport({ profile })

    const written = await readdir(profile.paths.reportDir)
    expect(written.sort()).toEqual(['app.css', 'app.js', 'index.html'])
  })

  test('a report says what it wrote and how many findings it carried', async () => {
    const result = await runReport({ profile })

    expect(result).toEqual({
      path: join(profile.paths.reportDir, 'index.html'),
      bytes: expect.any(Number),
      items: { increments: 1, candidates: 0, withdrawn: 0 },
      warnings: []
    })
  })

  test('the artifact target is one file and writes no stylesheet beside it', async () => {
    const result = await runReport({ profile, target: 'artifact' })

    expect(result.path).toBe(join(profile.paths.reportDir, 'artifact.html'))
    expect(await readdir(profile.paths.reportDir)).toEqual(['artifact.html'])
  })

  test('a corpus with no journey renders on its bands and says nothing about it', async () => {
    const result = await runReport({ profile })

    expect(result.warnings).toEqual([])
  })

  test('a journey the report cannot read still gets a page, and a warning', async () => {
    const modulePath = join(root, 'enumerate.cjs')
    await writeFile(
      modulePath,
      `module.exports = {
  enumerators: { frontend: () => [] },
  journey: { side: 'nobody', flowPath: 'src/flow.js', screenOfPage: {} }
}`
    )
    profile.paths.enumeratorModule = modulePath

    const result = await runReport({ profile })

    expect(result.warnings).toEqual([
      "The corpus declares a journey but the report can't read it, so the findings are grouped by band instead. Check that the repo the journey names is checked out and that its flow file is where the corpus says."
    ])
  })
})

describe('reportWarnings', () => {
  const joinReport = { unmatchedIncrements: ['inc-001', 'inc-002'] }

  test('a corpus with no upstream file is not asked to match one', () => {
    expect(reportWarnings({ upstream: false, joinReport })).toEqual([])
  })

  test('a corpus that declares an upstream still says when the join failed', () => {
    expect(reportWarnings({ upstream: true, joinReport })).toEqual([
      '2 increments matched no upstream finding, so their audit record is missing.'
    ])
  })

  test('a journey that could not be read says the report fell back to bands', () => {
    expect(
      reportWarnings({ upstream: false, joinReport, journeyUnread: true })
    ).toEqual([
      "The corpus declares a journey but the report can't read it, so the findings are grouped by band instead. Check that the repo the journey names is checked out and that its flow file is where the corpus says."
    ])
  })

  test('what the grouping found to complain about is carried through', () => {
    expect(
      reportWarnings({
        upstream: false,
        joinReport,
        journeyWarnings: ['The journey flow has a page called "cphNumber".']
      })
    ).toEqual(['The journey flow has a page called "cphNumber".'])
  })
})
