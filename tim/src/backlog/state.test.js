import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  startedIncrementIds,
  setIncrementField,
  appendJournalNote
} from './state.js'

let root
let statePath

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-backlog-state-'))
  statePath = join(root, 'build', 'state.json')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeState = (state) => {
  mkdirSync(join(root, 'build'), { recursive: true })
  writeFileSync(statePath, JSON.stringify(state))
}

describe('startedIncrementIds', () => {
  test('an absent file gives an empty set', () => {
    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('{} gives an empty set', () => {
    writeState({})

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('{ increments: {} } gives an empty set', () => {
    writeState({ increments: {} })

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('attempts: [] is not started', () => {
    writeState({ increments: { 'inc-001': { attempts: [] } } })

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('attempts: [{...}] is started', () => {
    writeState({ increments: { 'inc-001': { attempts: [{ n: 1 }] } } })

    expect(startedIncrementIds(statePath)).toEqual(new Set(['inc-001']))
  })

  test('attempts: 2 is started, attempts: 0 is not', () => {
    writeState({
      increments: {
        'inc-001': { attempts: 2 },
        'inc-002': { attempts: 0 }
      }
    })

    expect(startedIncrementIds(statePath)).toEqual(new Set(['inc-001']))
  })

  test('an increment with no attempts key is not started', () => {
    writeState({ increments: { 'inc-001': {} } })

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('invalid JSON throws PARSE naming the path', () => {
    mkdirSync(join(root, 'build'), { recursive: true })
    writeFileSync(statePath, '{not json')

    expect(() => startedIncrementIds(statePath)).toThrowError(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringContaining(statePath)
      })
    )
  })
})

const buildV2Profile = () => {
  const workarea = join(root, 'workarea')
  mkdirSync(workarea, { recursive: true })
  const backlogPath = join(workarea, 'backlog.json')
  writeFileSync(
    backlogPath,
    JSON.stringify({
      schemaVersion: 2,
      programme: 'temp-requirements',
      profile: 'requirements-v2',
      requirements: [],
      increments: [{ id: 'inc-001', key: 'core' }]
    })
  )
  return {
    id: 'temp-requirements',
    profileKey: 'requirements-v2',
    paths: {
      workarea,
      backlog: backlogPath,
      state: join(workarea, 'build', 'state.json'),
      opsLog: join(workarea, '.backlog-ops.jsonl'),
      journal: join(workarea, 'build', 'journal.jsonl')
    }
  }
}

const buildParityProfile = () => ({
  id: 'alpha',
  profileKey: 'parity-v1',
  paths: {
    workarea: root,
    backlog: join(root, 'backlog.json'),
    state: join(root, 'build', 'state.json'),
    opsLog: join(root, '.backlog-ops.jsonl'),
    journal: join(root, 'build', 'journal.jsonl')
  }
})

const FAST_RETRY = { retryDelaysMs: [1, 1, 1] }

describe('setIncrementField', () => {
  test('ST1: on a programme with no state file, writes {schemaVersion: 1, increments: {"inc-001": {phase: "plan"}}}, returning before: undefined, after: "plan" and the sha', () => {
    const profile = buildV2Profile()

    const result = setIncrementField({
      profile,
      id: 'inc-001',
      field: 'phase',
      value: 'plan',
      ...FAST_RETRY
    })

    expect(result.before).toBeUndefined()
    expect(result.after).toBe('plan')
    expect(typeof result.sha256).toBe('string')
    expect(JSON.parse(readFileSync(profile.paths.state, 'utf8'))).toEqual({
      schemaVersion: 1,
      increments: { 'inc-001': { phase: 'plan' } }
    })
  })

  test('ST2: keeps every other increment and field untouched, and startedIncrementIds still reads the same set afterwards', () => {
    const profile = buildV2Profile()
    mkdirSync(join(profile.paths.workarea, 'build'), { recursive: true })
    writeFileSync(
      profile.paths.state,
      JSON.stringify({
        schemaVersion: 1,
        increments: {
          'inc-001': { attempts: [{ n: 1 }], phase: 'implement' }
        }
      })
    )

    setIncrementField({
      profile,
      id: 'inc-001',
      field: 'ticket',
      value: 'EUDPA-1',
      ...FAST_RETRY
    })

    const state = JSON.parse(readFileSync(profile.paths.state, 'utf8'))
    expect(state.increments['inc-001'].phase).toBe('implement')
    expect(state.increments['inc-001'].attempts).toEqual([{ n: 1 }])
    expect(state.increments['inc-001'].ticket).toBe('EUDPA-1')
    expect(startedIncrementIds(profile.paths.state)).toEqual(
      new Set(['inc-001'])
    )
  })

  test('ST3: an id not in backlog.json throws NOT_FOUND, naming it', () => {
    const profile = buildV2Profile()

    expect(() =>
      setIncrementField({
        profile,
        id: 'inc-404',
        field: 'phase',
        value: 'plan',
        ...FAST_RETRY
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.stringContaining('inc-404')
      })
    )
  })

  test('ST4: a parity-v1 profile throws USAGE, and nothing is written', () => {
    const profile = buildParityProfile()

    expect(() =>
      setIncrementField({
        profile,
        id: 'inc-001',
        field: 'phase',
        value: 'plan',
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
    expect(existsSync(profile.paths.state)).toBe(false)
  })

  test('ST5: an invalid value throws PARSE, and the file is unchanged', () => {
    const profile = buildV2Profile()
    setIncrementField({
      profile,
      id: 'inc-001',
      field: 'phase',
      value: 'plan',
      ...FAST_RETRY
    })
    const before = readFileSync(profile.paths.state, 'utf8')

    expect(() =>
      setIncrementField({
        profile,
        id: 'inc-001',
        field: 'heads',
        value: { workspace: { sha: 'nope', branch: 'b', dirty: false } },
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'PARSE' }))
    expect(readFileSync(profile.paths.state, 'utf8')).toBe(before)
  })

  test('ST7 (set half): expectSha of an older version throws LOST_UPDATE, and nothing is written', () => {
    const profile = buildV2Profile()
    setIncrementField({
      profile,
      id: 'inc-001',
      field: 'phase',
      value: 'plan',
      ...FAST_RETRY
    })
    const before = readFileSync(profile.paths.state, 'utf8')

    expect(() =>
      setIncrementField({
        profile,
        id: 'inc-001',
        field: 'phase',
        value: 'implement',
        expectSha: 'a'.repeat(64),
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'LOST_UPDATE' }))
    expect(readFileSync(profile.paths.state, 'utf8')).toBe(before)
  })

  test('ST8 (set half): replaying the same op id returns the first result, and the state is unchanged', () => {
    const profile = buildV2Profile()
    const first = setIncrementField({
      profile,
      id: 'inc-001',
      field: 'phase',
      value: 'plan',
      opId: 'op-1',
      ...FAST_RETRY
    })
    const after = readFileSync(profile.paths.state, 'utf8')

    const replay = setIncrementField({
      profile,
      id: 'inc-001',
      field: 'phase',
      value: 'plan',
      opId: 'op-1',
      ...FAST_RETRY
    })

    expect(replay).toEqual(first)
    expect(readFileSync(profile.paths.state, 'utf8')).toBe(after)
  })

  test('ST9: a replay after the increment has left backlog.json still returns the first result', () => {
    const profile = buildV2Profile()
    const first = setIncrementField({
      profile,
      id: 'inc-001',
      field: 'phase',
      value: 'plan',
      opId: 'op-gone',
      ...FAST_RETRY
    })

    writeFileSync(
      profile.paths.backlog,
      JSON.stringify({
        schemaVersion: 2,
        programme: 'temp-requirements',
        profile: 'requirements-v2',
        requirements: [],
        increments: []
      })
    )

    const replay = setIncrementField({
      profile,
      id: 'inc-001',
      field: 'phase',
      value: 'plan',
      opId: 'op-gone',
      ...FAST_RETRY
    })

    expect(replay).toEqual(first)
  })

  test('ST10: the same opId with a `heads` value whose keys are inserted in a different order still replays', () => {
    const profile = buildV2Profile()
    const first = setIncrementField({
      profile,
      id: 'inc-001',
      field: 'heads',
      value: {
        workspace: { sha: 'a'.repeat(40), branch: 'b', dirty: false }
      },
      opId: 'op-heads',
      ...FAST_RETRY
    })

    const replay = setIncrementField({
      profile,
      id: 'inc-001',
      field: 'heads',
      value: {
        workspace: { dirty: false, branch: 'b', sha: 'a'.repeat(40) }
      },
      opId: 'op-heads',
      ...FAST_RETRY
    })

    expect(replay).toEqual(first)
  })
})

describe('appendJournalNote', () => {
  test('ST6: appends one line {at, id, note, stage, by}, keeps earlier lines byte-identical, and returns the entry', () => {
    const profile = buildV2Profile()
    const first = appendJournalNote({
      profile,
      id: 'inc-001',
      note: 'First note.',
      ...FAST_RETRY
    })
    const afterFirst = readFileSync(profile.paths.journal, 'utf8')

    const second = appendJournalNote({
      profile,
      id: 'inc-001',
      note: 'Second note.',
      stage: 'plan',
      by: 'agent',
      ...FAST_RETRY
    })

    const journal = readFileSync(profile.paths.journal, 'utf8')
    expect(journal.startsWith(afterFirst)).toBe(true)
    expect(second.entry).toEqual({
      at: expect.any(String),
      id: 'inc-001',
      note: 'Second note.',
      stage: 'plan',
      by: 'agent'
    })
    expect(first.entry.note).toBe('First note.')
  })

  test('ST7 (note half): expectSha of an older version throws LOST_UPDATE, and nothing is written', () => {
    const profile = buildV2Profile()
    appendJournalNote({ profile, id: 'inc-001', note: 'First.', ...FAST_RETRY })
    const before = readFileSync(profile.paths.journal, 'utf8')

    expect(() =>
      appendJournalNote({
        profile,
        id: 'inc-001',
        note: 'Second.',
        expectSha: 'a'.repeat(64),
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'LOST_UPDATE' }))
    expect(readFileSync(profile.paths.journal, 'utf8')).toBe(before)
  })

  test('ST8 (note half): replaying the same op id returns the first result, and the journal still has one line', () => {
    const profile = buildV2Profile()
    const first = appendJournalNote({
      profile,
      id: 'inc-001',
      note: 'First.',
      opId: 'op-note-1',
      ...FAST_RETRY
    })

    const replay = appendJournalNote({
      profile,
      id: 'inc-001',
      note: 'First.',
      opId: 'op-note-1',
      ...FAST_RETRY
    })

    expect(replay).toEqual(first)
    expect(
      readFileSync(profile.paths.journal, 'utf8').trim().split('\n')
    ).toHaveLength(1)
  })
})
