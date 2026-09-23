import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonFile } from './io.js'
import { runIngest } from './ingest.js'

let root
let profile

const buildProfile = (dir) => {
  const workarea = join(dir, 'workarea')
  mkdirSync(join(workarea, 'distil', 'atoms'), { recursive: true })
  return {
    id: 'temp-requirements',
    profileKey: 'requirements-v2',
    workspaceRoot: dir,
    paths: {
      workarea,
      backlog: join(dir, 'run', 'backlog.json'),
      state: join(workarea, 'build', 'state.json')
    }
  }
}

const atomsDir = () => join(profile.paths.workarea, 'distil', 'atoms')

const atom = (overrides = {}) => ({
  key: 'alpha--second',
  slice: 'alpha',
  kind: 'capability',
  title: 'A requirement',
  statement: 'The service MUST do the thing.',
  why: 'Because the thing matters.',
  acceptance: [
    {
      id: 'ac-1',
      text: 'Given a thing, when it happens, then it is observed.',
      witness: 'e2e',
      confidence: 'stated',
      sources: ['s1'],
      scenario: null,
      resolvedBy: null
    }
  ],
  falsifiedBy: 'The thing does not happen.',
  sources: [
    {
      id: 's1',
      source: 'sam-req',
      ref: 'line:1',
      quote: 'the thing',
      readAt: { version: null, fetchedAt: '2026-09-19', seal: 'git-blob:x' },
      confidence: 'stated',
      role: 'requirement'
    }
  ],
  surface: { service: 's', area: 'a', repos: ['workspace'] },
  ...overrides
})

const writeAtom = (name, body) =>
  writeFileSync(join(atomsDir(), name), JSON.stringify(body ?? atom(), null, 2))

const ingest = (opts = {}) =>
  runIngest({ profile, workspaceRoot: root, ...opts })

const backlog = () => readJsonFile(profile.paths.backlog)

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-backlog-ingest-core-'))
  profile = buildProfile(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('what a row looks like at birth', () => {
  test('a new item is born unstarted, with no ruling and nothing depending on it', () => {
    writeAtom('alpha--second.json')

    ingest()

    const [row] = backlog().requirements
    expect({
      status: row.status,
      dependsOn: row.dependsOn,
      relatedTo: row.relatedTo
    }).toEqual({ status: 'proposed', dependsOn: [], relatedTo: [] })
  })
})

describe('what a re-ingest keeps and what it refreshes', () => {
  test('keeps the saved status while taking the edited title', () => {
    writeAtom('alpha--second.json')
    ingest()
    const held = backlog()
    held.requirements[0] = { ...held.requirements[0], status: 'adopted' }
    writeFileSync(profile.paths.backlog, JSON.stringify(held))

    writeAtom('alpha--second.json', atom({ title: 'A better sentence.' }))
    ingest()

    const [row] = backlog().requirements
    expect(row.status).toBe('adopted')
    expect(row.title).toBe('A better sentence.')
  })
})

describe('a rebuild from scratch', () => {
  test('renumbers from the first id and counts every row as new', () => {
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))
    writeAtom('alpha--second.json')
    ingest()

    const result = ingest({ replace: true })

    expect(result.new).toBe(2)
    expect(backlog().requirements.map((row) => row.id)).toEqual([
      'req-001',
      'req-002'
    ])
  })
})

describe('what the result reports', () => {
  test('names each row that left the backlog when its file was struck', () => {
    writeAtom('alpha--second.json')
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))
    ingest()

    rmSync(join(atomsDir(), 'beta--first.json'))
    const result = ingest()

    expect(result.dropped).toEqual(['req-002'])
    expect(backlog().requirements.map((row) => row.id)).toEqual(['req-001'])
  })

  test('counts how many items were new and how many were refreshed', () => {
    writeAtom('alpha--second.json')
    ingest()
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))

    const result = ingest()

    expect({
      total: result.total,
      new: result.new,
      refreshed: result.refreshed
    }).toEqual({ total: 2, new: 1, refreshed: 1 })
  })

  test("a dry run writes nothing and still reports the counts, the assignment and the profile's own tallies", () => {
    writeAtom('alpha--second.json')
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))

    const result = ingest({ dryRun: true })

    expect(existsSync(profile.paths.backlog)).toBe(false)
    expect(result.written).toBe(false)
    expect(result.assignment.map((entry) => entry.id)).toEqual([
      'req-001',
      'req-002'
    ])
    expect(result.bySlice).toEqual({ alpha: 1, beta: 1 })
    expect(result.byKind).toEqual({ capability: 2 })
  })
})

describe('where the backlog is written', () => {
  test('creates the backlog directory when it does not exist yet', () => {
    profile.paths.backlog = join(root, 'brand-new-programme', 'backlog.json')
    writeAtom('alpha--second.json')

    const result = ingest()

    expect(result.written).toBe(true)
    expect(backlog().requirements.map((row) => row.id)).toEqual(['req-001'])
  })
})
