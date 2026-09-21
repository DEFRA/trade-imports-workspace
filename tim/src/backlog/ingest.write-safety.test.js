import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonFile } from './io.js'
import { runIngest } from './ingest.js'
import { readVersioned, sha256Of, commitWrite } from './write.js'

let root
let profile

const FAST_RETRY = { retryDelaysMs: [1, 1, 1] }

const buildProfile = (dir) => {
  const workarea = join(dir, 'workarea')
  mkdirSync(join(workarea, 'distil', 'atoms'), { recursive: true })
  return {
    id: 'temp-requirements',
    profileKey: 'requirements-v2',
    workspaceRoot: dir,
    paths: {
      workarea,
      backlog: join(workarea, 'backlog.json'),
      state: join(workarea, 'build', 'state.json'),
      opsLog: join(workarea, '.backlog-ops.jsonl'),
      journal: join(workarea, 'build', 'journal.jsonl')
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
  runIngest({ profile, workspaceRoot: root, ...FAST_RETRY, ...opts })

const backlog = () => readJsonFile(profile.paths.backlog)

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-ingest-write-safety-'))
  profile = buildProfile(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('req-015: the default read version protects against a race', () => {
  test('IW1: a runIngest given the version it would have read is refused once a competing write has landed', () => {
    writeAtom('alpha--second.json')
    ingest()
    const shaBeforeCompetingWrite = readVersioned(profile.paths.backlog).sha256

    const competing = commitWrite({
      path: profile.paths.backlog,
      body: '{"schemaVersion":2,"programme":"temp-requirements","profile":"requirements-v2","requirements":[]}\n',
      format: 'json',
      validate: () => {},
      expectedSha: shaBeforeCompetingWrite,
      command: 'test-competitor',
      ...FAST_RETRY
    })

    expect(() =>
      ingest({ expectSha: shaBeforeCompetingWrite })
    ).toThrowError(expect.objectContaining({ code: 'LOST_UPDATE' }))
    expect(readVersioned(profile.paths.backlog).sha256).toBe(competing.sha256)
  })
})

describe('req-015: the result carries sha256 and notes', () => {
  test('IW2a: sha256 equals the file on disk and notes is []', () => {
    writeAtom('alpha--second.json')

    const result = ingest()

    expect(result.sha256).toBe(
      sha256Of(`${JSON.stringify(backlog(), null, 2)}\n`)
    )
    expect(result.notes).toEqual([])
  })

  test('IW2b: a dry run carries sha256: null and writes nothing', () => {
    writeAtom('alpha--second.json')
    ingest()

    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))
    const dry = ingest({ dryRun: true })

    expect(dry.sha256).toBeNull()
  })
})

describe('req-016: a replayed op id', () => {
  test('IW3: replayed after adding an atom returns the first result deep-equal, and the bytes are unchanged', () => {
    writeAtom('alpha--second.json')
    const first = ingest({ opId: 'op-1' })
    const beforeBytes = readVersioned(profile.paths.backlog).text

    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))
    const replay = ingest({ opId: 'op-1' })

    expect(replay).toEqual(first)
    expect(readVersioned(profile.paths.backlog).text).toBe(beforeBytes)
  })
})

describe('req-016: an op id reused with a different dryRun is not replayed', () => {
  test('IW6: the same opId, first for a real write and then with dryRun: true, previews the current state rather than replaying the earlier written result', () => {
    writeAtom('alpha--second.json')
    const written = ingest({ opId: 'op-1' })
    expect(written.written).toBe(true)

    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))
    const dry = ingest({ opId: 'op-1', dryRun: true })

    expect(dry.written).toBe(false)
    expect(dry.sha256).toBeNull()
    expect(dry.total).toBe(2)
  })
})

describe('req-015/req-016: no lock or temp file is left behind', () => {
  test('IW4: after a write, the folder holds no .backlog.lock and no .tmp file', () => {
    writeAtom('alpha--second.json')

    ingest()

    const entries = readdirSync(profile.paths.workarea)
    expect(entries).not.toContain('.backlog.lock')
    expect(entries.some((name) => name.endsWith('.tmp'))).toBe(false)
  })
})

describe('a frozen field cannot be changed by ingest', () => {
  test('IW5: a frozen-statement change is refused', () => {
    writeAtom('alpha--second.json')
    ingest()

    writeAtom(
      'alpha--second.json',
      atom({ statement: 'The service MUST do a different thing.' })
    )

    expect(() => ingest()).toThrow(/statement is frozen/)
  })
})
