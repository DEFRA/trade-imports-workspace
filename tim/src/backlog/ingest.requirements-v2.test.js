import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { readJsonFile } from './io.js'
import { runIngest } from './ingest.js'

const here = dirname(fileURLToPath(import.meta.url))

let root
let profile

const buildProfile = (dir) => {
  const workarea = join(dir, 'workarea')
  mkdirSync(join(workarea, 'distil', 'atoms'), { recursive: true })
  return {
    id: 'temp-requirements',
    profileKey: 'requirements-v2',
    workspaceRoot: dir,
    paths: { workarea, backlog: join(dir, 'run', 'backlog.json') }
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
  root = mkdtempSync(join(tmpdir(), 'tim-backlog-ingest-v2-'))
  profile = buildProfile(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('ids', () => {
  test('numbers atoms req-001 upward by slice then file name', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))

    ingest()

    expect(backlog().requirements.map((row) => [row.id, row.key])).toEqual([
      ['req-001', 'alpha--second'],
      ['req-002', 'alpha--third'],
      ['req-003', 'beta--first']
    ])
  })

  test('gives the same ids on a second run over the same atoms', () => {
    writeAtom('alpha--second.json')
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))

    const idsOf = ({ assignment }) =>
      assignment.map((entry) => [entry.file, entry.id])

    const first = idsOf(ingest())
    const second = idsOf(ingest())

    expect(second).toEqual(first)
  })

  test("leaves every existing id where it is when an atom sorts in ahead of it, and gives the new atom the next number (ac-3's own case)", () => {
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))
    ingest()
    const before = Object.fromEntries(
      backlog().requirements.map((row) => [row.key, row.id])
    )

    // Sorts ahead of both existing files (slice "alpha", file name
    // "alpha--first.json" < "alpha--third.json").
    writeAtom('alpha--first.json', atom({ key: 'alpha--first' }))
    ingest()

    const after = Object.fromEntries(
      backlog().requirements.map((row) => [row.key, row.id])
    )
    expect(after['alpha--third']).toBe(before['alpha--third'])
    expect(after['beta--first']).toBe(before['beta--first'])
    expect(after['alpha--first']).toBe('req-003')
  })

  test("keeps an atom's id when its key is unchanged and its title is edited", () => {
    writeAtom('alpha--second.json')
    ingest()
    const before = backlog().requirements[0].id

    writeAtom('alpha--second.json', atom({ title: 'A rewritten title.' }))
    ingest()

    const [row] = backlog().requirements
    expect(row.id).toBe(before)
    expect(row.title).toBe('A rewritten title.')
  })
})

describe('refusals and safety', () => {
  test('refuses to change a frozen statement, naming the atom and its key', () => {
    writeAtom('alpha--second.json')
    ingest()

    writeAtom(
      'alpha--second.json',
      atom({ statement: 'The service MUST do a different thing.' })
    )

    expect(() => ingest()).toThrow(/req-001.*alpha--second/s)
    expect(backlog().requirements[0].statement).toBe(
      'The service MUST do the thing.'
    )
  })

  test('refuses --replace while any atom has moved off proposed, naming what would be lost', () => {
    writeAtom('alpha--second.json')
    ingest()
    const held = backlog()
    held.requirements[0] = { ...held.requirements[0], status: 'adopted' }
    writeFileSync(profile.paths.backlog, JSON.stringify(held))

    expect(() => ingest({ replace: true })).toThrow(/req-001/)
  })

  test('refuses to drop an atom that has moved off proposed when its file has gone, naming the file', () => {
    writeAtom('alpha--second.json')
    ingest()
    const held = backlog()
    held.requirements[0] = { ...held.requirements[0], status: 'adopted' }
    writeFileSync(profile.paths.backlog, JSON.stringify(held))

    rmSync(join(atomsDir(), 'alpha--second.json'))
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))

    expect(() => ingest()).toThrow(/alpha--second/)
  })

  test('resolves a dependsOn written as a key into the id it means, in the same run that assigns it', () => {
    writeAtom('alpha--second.json', atom({ dependsOn: ['beta--first'] }))
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))

    ingest()

    const byKey = Object.fromEntries(
      backlog().requirements.map((row) => [row.key, row])
    )
    expect(byKey['alpha--second'].dependsOn).toEqual([byKey['beta--first'].id])
  })

  test('refuses a dependsOn naming a key no atom in the run has, naming the file and the key', () => {
    writeAtom('alpha--second.json', atom({ dependsOn: ['nowhere--else'] }))

    expect(() => ingest()).toThrow(
      /alpha--second\.json.*dependsOn.*nowhere--else/s
    )
  })

  test('refuses an atom that names itself in dependsOn, naming the file and the key', () => {
    writeAtom('alpha--second.json', atom({ dependsOn: ['alpha--second'] }))

    expect(() => ingest()).toThrow(
      /alpha--second\.json.*dependsOn.*alpha--second/s
    )
  })

  test('writes a v2 header (schemaVersion: 2, programme, profile) and a requirements[] array, and no run_id, target or corpus', () => {
    writeAtom('alpha--second.json')

    ingest()

    const written = backlog()
    expect(written.schemaVersion).toBe(2)
    expect(written.programme).toBe('temp-requirements')
    expect(written.profile).toBe('requirements-v2')
    expect(Array.isArray(written.requirements)).toBe(true)
    expect(written.run_id).toBeUndefined()
    expect(written.target).toBeUndefined()
    expect(written.corpus).toBeUndefined()
  })

  test('writes nothing under --dry-run while still refusing a bad atom', () => {
    writeAtom('alpha--second.json', atom({ statement: undefined }))

    expect(() => ingest({ dryRun: true })).toThrow()
    expect(existsSync(profile.paths.backlog)).toBe(false)
  })

  test('refuses when the atoms directory does not exist', () => {
    rmSync(atomsDir(), { recursive: true, force: true })

    expect(() => ingest()).toThrow(/atoms/)
  })
})

describe('every refusal names its field', () => {
  const requiredFields = [
    'key',
    'slice',
    'kind',
    'title',
    'statement',
    'why',
    'falsifiedBy'
  ]

  for (const field of requiredFields) {
    test(`missing "${field}" names the file and the field`, () => {
      writeAtom('alpha--second.json', atom({ [field]: undefined }))

      expect(() => ingest()).toThrow(
        new RegExp(`alpha--second\\.json.*"${field}"`, 's')
      )
    })
  }

  test('an empty acceptance list names the file and the field', () => {
    writeAtom('alpha--second.json', atom({ acceptance: [] }))

    expect(() => ingest()).toThrow(/alpha--second\.json.*"acceptance"/s)
  })

  test('an empty sources list names the file and the field', () => {
    writeAtom('alpha--second.json', atom({ sources: [] }))

    expect(() => ingest()).toThrow(/alpha--second\.json.*"sources"/s)
  })

  test('a malformed surface.repos names the file and the field', () => {
    writeAtom(
      'alpha--second.json',
      atom({ surface: { service: 's', area: 'a', repos: 'workspace' } })
    )

    expect(() => ingest()).toThrow(/alpha--second\.json.*"surface\.repos"/s)
  })
})

describe('the tracked fixture-requirements programme', () => {
  // tools/backlog/registry.json points the real `fixture-requirements`
  // programme at this file's own __fixtures__ directory, so any future
  // `tim backlog ingest fixture-requirements` run without --dry-run would
  // write into tracked source (D17). This proves the footgun would surface
  // as a failing test rather than a dirty working tree: a clean re-ingest of
  // the tracked atoms, run against a temp copy so the tracked backlog.json
  // itself is never touched, reproduces it row for row (compared parsed,
  // not byte for byte, because Prettier reformats the tracked JSON's array
  // line-wrapping and this test has no opinion on that).
  test('a clean re-ingest of the tracked fixture produces the same backlog', () => {
    const trackedDir = join(here, '__fixtures__', 'fixture-requirements')
    const trackedAtomsDir = join(trackedDir, 'distil', 'atoms')
    const trackedBacklog = JSON.parse(
      readFileSync(join(trackedDir, 'backlog.json'), 'utf8')
    )

    // The real registry names this programme "fixture-requirements"
    // (tools/backlog/registry.json); match it so the header compares equal.
    profile.id = 'fixture-requirements'
    const copyAtomsDir = atomsDir()
    for (const file of readdirSync(trackedAtomsDir)) {
      writeFileSync(
        join(copyAtomsDir, file),
        readFileSync(join(trackedAtomsDir, file))
      )
    }

    ingest()

    expect(JSON.parse(readFileSync(profile.paths.backlog, 'utf8'))).toEqual(
      trackedBacklog
    )
  })
})
