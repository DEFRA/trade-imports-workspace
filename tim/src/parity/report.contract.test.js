import { describe, test, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonFile } from './io.js'
import { parseBacklog, parseDeferred, parseCorpusMeta } from './schema.js'
import { loadCorpusProfile } from './corpus-profile.js'
import { loadCorpus } from './load.js'
import { runCounts } from './counts.js'

// The real corpus, parsed through the real schema. The workarea is gitignored
// except for these files, so a fresh clone that has never run the pipeline
// skips this file and stays green; Sam's machine catches journey-builder
// schema drift the moment it happens.
const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)
const runDir = join(workspaceRoot, 'workareas', 'journey-builder', 'EUDPA-328')
const backlogPath = join(runDir, 'backlog.json')
const present = existsSync(backlogPath)

describe.skipIf(!present)('the real EUDPA-328 corpus', () => {
  test('parses through the schema with every increment named', () => {
    const backlog = parseBacklog(readJsonFile(backlogPath))
    expect(backlog.increments.length).toBeGreaterThan(0)
    expect(backlog.run_id).toBe('EUDPA-328')
  })

  test('every increment id is unique', () => {
    const ids = parseBacklog(readJsonFile(backlogPath)).increments.map(
      (i) => i.id
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every dependsOn names an increment that exists', () => {
    const { increments } = parseBacklog(readJsonFile(backlogPath))
    const ids = new Set(increments.map((i) => i.id))
    const dangling = increments.flatMap((increment) =>
      (increment.dependsOn ?? [])
        .filter((id) => !ids.has(id))
        .map((id) => `${increment.id} -> ${id}`)
    )
    expect(dangling).toEqual([])
  })

  test('deferred candidates parse in their own thinner shape', () => {
    const deferredPath = join(runDir, 'deferred.json')
    if (!existsSync(deferredPath)) return
    expect(
      parseDeferred(readJsonFile(deferredPath)).candidates.length
    ).toBeGreaterThan(0)
  })

  test('the corpus meta parses and pins every repo to a full sha', () => {
    const metaPath = join(runDir, '.corpus-meta.json')
    if (!existsSync(metaPath)) return
    const meta = parseCorpusMeta(readJsonFile(metaPath))
    for (const pin of Object.values(meta.pins)) {
      expect(pin.sha).toHaveLength(40)
    }
  })

  test('loads into report items and joins every finding to its audit record', () => {
    const profile = loadCorpusProfile({ workspaceRoot, runId: 'EUDPA-328' })
    const corpus = loadCorpus({ profile })
    expect(corpus.joinReport.unmatchedIncrements).toEqual([])
    expect(corpus.joinReport.unmatchedFindings).toEqual([])
  })

  test('every live finding carries a falsifier, which is how it can be refused', () => {
    const profile = loadCorpusProfile({ workspaceRoot, runId: 'EUDPA-328' })
    const { findings } = loadCorpus({ profile })
    const without = findings.filter((item) => !item.sections.falsifiedBy)
    expect(without.map((item) => item.id)).toEqual([])
  })

  test('every live finding still reaches its audit record through the join', () => {
    // verification is never copied into the backlog. This is what guarantees it
    // is still there, and it is the reason nothing has to promise not to edit it.
    const profile = loadCorpusProfile({ workspaceRoot, runId: 'EUDPA-328' })
    const { findings } = loadCorpus({ profile })
    const without = findings.filter((item) => !item.sections.verification)
    expect(without.map((item) => item.id)).toEqual([])
  })

  test('no finding has had its verification copied into the backlog', () => {
    const { increments } = parseBacklog(readJsonFile(backlogPath))
    const copied = increments
      .filter((increment) => increment.finding?.verification)
      .map((increment) => increment.id)
    expect(copied).toEqual([])
  })

  test('the counts add up: findings plus withdrawn is what is in the file', () => {
    const profile = loadCorpusProfile({ workspaceRoot, runId: 'EUDPA-328' })
    const { counts } = runCounts({ profile })
    expect(counts.findings + counts.withdrawn).toBe(counts.inFile)
  })

  test('no citation carries a path without the repo it lives in', () => {
    const { increments } = parseBacklog(readJsonFile(backlogPath))
    const orphans = increments.flatMap((increment) =>
      (increment.citations ?? [])
        .filter(
          (citation) =>
            citation.kind === 'code' && citation.path && !citation.repo
        )
        .map((citation) => `${increment.id}/${citation.ref}`)
    )
    expect(orphans).toEqual([])
  })

  test('no citation claims to be resolved while asking for a human', () => {
    const { increments } = parseBacklog(readJsonFile(backlogPath))
    const contradictory = increments.flatMap((increment) =>
      (increment.citations ?? [])
        .filter(
          (citation) =>
            citation.needsHuman && citation.resolution !== 'unresolved'
        )
        .map((citation) => `${increment.id}/${citation.ref}`)
    )
    expect(contradictory).toEqual([])
  })
})
