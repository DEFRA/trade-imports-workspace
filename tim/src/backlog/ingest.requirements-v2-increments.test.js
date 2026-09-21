import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync
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
  mkdirSync(join(workarea, 'distil', 'increments'), { recursive: true })
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
const incrementsDir = () => join(profile.paths.workarea, 'distil', 'increments')

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

const increment = (overrides = {}) => ({
  key: 'core-and-registry',
  title: 'A combined increment',
  outcome: 'Something true when done.',
  why: 'Two atoms land together.',
  members: ['alpha--second'],
  class: 'feat',
  milestone: null,
  checkpoint: null,
  size: { class: 'S', basis: '1 criterion, 1 atom' },
  combination: { why: 'One reason.', rules: ['rule-a'] },
  ...overrides
})

const writeAtom = (name, body) =>
  writeFileSync(join(atomsDir(), name), JSON.stringify(body ?? atom(), null, 2))

const writeIncrement = (name, body) =>
  writeFileSync(
    join(incrementsDir(), name),
    JSON.stringify(body ?? increment(), null, 2)
  )

const ingestAtoms = (opts = {}) =>
  runIngest({ profile, workspaceRoot: root, collection: 'atoms', ...opts })

const ingestIncrements = (opts = {}) =>
  runIngest({
    profile,
    workspaceRoot: root,
    collection: 'increments',
    ...opts
  })

const backlog = () => readJsonFile(profile.paths.backlog)

const writeBacklog = (value) =>
  writeFileSync(profile.paths.backlog, JSON.stringify(value))

const writeState = (body) => {
  mkdirSync(join(profile.paths.workarea, 'build'), { recursive: true })
  writeFileSync(profile.paths.state, JSON.stringify(body))
}

const markStarted = (...incrementIds) =>
  writeState({
    increments: Object.fromEntries(
      incrementIds.map((id) => [id, { attempts: [{ n: 1 }] }])
    )
  })

const setAtomStatus = (key, status, extra = {}) => {
  const currentBacklog = backlog()
  writeBacklog({
    ...currentBacklog,
    requirements: currentBacklog.requirements.map((row) =>
      row.key === key ? { ...row, status, ...extra } : row
    )
  })
}

const setIncrementStatus = (key, status) => {
  const currentBacklog = backlog()
  writeBacklog({
    ...currentBacklog,
    increments: currentBacklog.increments.map((row) =>
      row.key === key ? { ...row, status } : row
    )
  })
}

const rowByKey = (rows, key) => rows.find((row) => row.key === key)

const seedSingleAtomIncrement = () => {
  writeAtom('alpha--second.json')
  ingestAtoms()
  writeIncrement('core-and-registry.json')
  ingestIncrements()
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-backlog-ingest-inc-'))
  profile = buildProfile(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('ids', () => {
  test('numbers increments inc-001 upward, authored before solo, each in key order', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    setAtomStatus('alpha--third', 'adopted')
    writeIncrement(
      'zeta.json',
      increment({ key: 'zeta', members: ['alpha--third'] })
    )

    ingestIncrements()

    const rows = backlog().increments
    expect(rows.map((row) => [row.id, row.key])).toEqual([
      ['inc-001', 'zeta'],
      ['inc-002', 'solo--alpha--second']
    ])
  })

  test('gives the same ids on a second run over the same increments', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement('core-and-registry.json')

    const first = ingestIncrements().assignment
    const second = ingestIncrements().assignment

    expect(second.map((entry) => entry.id)).toEqual(
      first.map((entry) => entry.id)
    )
  })

  test('an increment authored with a key that sorts ahead keeps every existing id and takes the next number', () => {
    writeAtom('alpha--second.json')
    writeAtom('beta--first.json', atom({ key: 'beta--first', slice: 'beta' }))
    ingestAtoms()
    writeIncrement(
      'zzz.json',
      increment({ key: 'zzz', members: ['beta--first'] })
    )
    ingestIncrements()
    const before = backlog().increments[0].id

    writeIncrement(
      'aaa.json',
      increment({ key: 'aaa', members: ['alpha--second'] })
    )
    ingestIncrements()

    const rows = backlog().increments
    expect(rowByKey(rows, 'zzz').id).toBe(before)
    expect(rowByKey(rows, 'aaa').id).toBe('inc-002')
  })

  test('a supersession swaps an unstarted todo solo member, and moves neither key nor id', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    ingestIncrements()
    const soloId = backlog().increments[0].id

    writeAtom('alpha--variant.json', atom({ key: 'alpha--variant' }))
    ingestAtoms()
    setAtomStatus('alpha--variant', 'adopted')
    setAtomStatus('alpha--second', 'superseded', {
      supersededBy: backlog().requirements.find(
        (r) => r.key === 'alpha--variant'
      ).id
    })

    ingestIncrements()

    const solo = backlog().increments[0]
    expect(solo.id).toBe(soloId)
    expect(solo.key).toBe('solo--alpha--second')
    expect(solo.members).toEqual([
      backlog().requirements.find((r) => r.key === 'alpha--variant').id
    ])
  })

  test('a supersession swaps an unstarted todo combined increment member, and moves neither key nor id', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement('core-and-registry.json')
    ingestIncrements()
    const before = backlog().increments[0].id

    writeAtom('alpha--variant.json', atom({ key: 'alpha--variant' }))
    ingestAtoms()
    const variantId = backlog().requirements.find(
      (r) => r.key === 'alpha--variant'
    ).id
    setAtomStatus('alpha--second', 'superseded', { supersededBy: variantId })

    ingestIncrements()

    const row = backlog().increments[0]
    expect(row.id).toBe(before)
    expect(row.key).toBe('core-and-registry')
    expect(row.members).toEqual([variantId])
  })

  test('an unstarted todo combined increment keeps its id when its members change', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second', 'alpha--third'] })
    )
    ingestIncrements()
    const before = backlog().increments[0].id

    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second'] })
    )
    ingestIncrements()

    const row = backlog().increments[0]
    expect(row.id).toBe(before)
    expect(row.members).toEqual([backlog().requirements[0].id])
  })
})

describe('unique identities (req-010)', () => {
  test('two authored increments sharing one key are refused, naming both files', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'a.json',
      increment({ key: 'core-and-registry', members: ['alpha--second'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'core-and-registry', members: ['alpha--third'] })
    )

    expect(() => ingestIncrements()).toThrow(/a\.json.*b\.json/s)
    expect(backlog().increments).toBeUndefined()
  })

  test('an authored key colliding with the solo-- prefix is refused before it can collide with a synthesised solo', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    writeIncrement(
      'solo--alpha--second.json',
      increment({ key: 'solo--alpha--second' })
    )

    expect(() => ingestIncrements()).toThrow(/reserved/)
    expect(backlog().increments).toBeUndefined()
  })
})

describe('regroup refused (D29)', () => {
  const seedTwoMemberIncrement = () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second', 'alpha--third'] })
    )
    ingestIncrements()
  }

  test('a started combined increment losing a member is refused, naming key, id, before and after', () => {
    seedTwoMemberIncrement()
    markStarted('inc-001')
    const beforeBacklog = backlog()

    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second'] })
    )

    expect(() => ingestIncrements()).toThrow(
      /inc-001.*core-and-registry.*req-001, req-002.*req-001/s
    )
    expect(backlog()).toEqual(beforeBacklog)
  })

  test('a started increment gaining a member is refused', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second'] })
    )
    ingestIncrements()
    markStarted('inc-001')

    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second', 'alpha--third'] })
    )

    expect(() => ingestIncrements()).toThrow(/inc-001/)
  })

  test('a member moving from a started increment to an unstarted one is refused, naming the started increment', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second', 'alpha--third'] })
    )
    // b needs at least one member to validate; give it a throwaway third atom
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma' })
    )
    ingestAtoms()
    writeIncrement('b.json', increment({ key: 'b', members: ['gamma--first'] }))
    ingestIncrements()
    const aId = rowByKey(backlog().increments, 'a').id
    markStarted(aId)

    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['gamma--first', 'alpha--third'] })
    )

    expect(() => ingestIncrements()).toThrow(new RegExp(aId))
  })

  test('a done increment whose members change is refused, and so is a deferred one', () => {
    seedTwoMemberIncrement()
    setIncrementStatus('core-and-registry', 'done')

    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second'] })
    )

    expect(() => ingestIncrements()).toThrow(/inc-001/)

    setIncrementStatus('core-and-registry', 'deferred')
    expect(() => ingestIncrements()).toThrow(/inc-001/)
  })

  test('a forward-supersession swap on a started solo is refused, naming the solo', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    ingestIncrements()
    const soloId = backlog().increments[0].id
    markStarted(soloId)

    writeAtom('alpha--variant.json', atom({ key: 'alpha--variant' }))
    ingestAtoms()
    const variantId = backlog().requirements.find(
      (r) => r.key === 'alpha--variant'
    ).id
    setAtomStatus('alpha--variant', 'adopted')
    setAtomStatus('alpha--second', 'superseded', { supersededBy: variantId })

    expect(() => ingestIncrements()).toThrow(new RegExp(soloId))
  })

  test('a forward-supersession swap on a done combined increment is refused', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement('core-and-registry.json')
    ingestIncrements()
    setIncrementStatus('core-and-registry', 'done')

    writeAtom('alpha--variant.json', atom({ key: 'alpha--variant' }))
    ingestAtoms()
    const variantId = backlog().requirements.find(
      (r) => r.key === 'alpha--variant'
    ).id
    setAtomStatus('alpha--second', 'superseded', { supersededBy: variantId })

    expect(() => ingestIncrements()).toThrow(/inc-001/)
  })

  test('unstarted todo and born-blocked increments accept a member change and keep their ids', () => {
    writeAtom('alpha--second.json')
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma', needs: ['q-open'] })
    )
    ingestAtoms()
    writeIncrement(
      'todo-one.json',
      increment({ key: 'todo-one', members: ['alpha--second'] })
    )
    writeIncrement(
      'blocked-one.json',
      increment({ key: 'blocked-one', members: ['gamma--first'] })
    )
    ingestIncrements()
    expect(rowByKey(backlog().increments, 'blocked-one').status).toBe('blocked')
    const todoId = rowByKey(backlog().increments, 'todo-one').id
    const blockedId = rowByKey(backlog().increments, 'blocked-one').id

    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'todo-one.json',
      increment({ key: 'todo-one', members: ['alpha--second', 'alpha--third'] })
    )

    expect(() => ingestIncrements()).not.toThrow()
    const rows = backlog().increments
    expect(rowByKey(rows, 'todo-one').id).toBe(todoId)
    expect(rowByKey(rows, 'blocked-one').id).toBe(blockedId)
  })

  test('reordering members, or naming one by id instead of key, is not a regroup', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second', 'alpha--third'] })
    )
    ingestIncrements()
    markStarted('inc-001')
    const secondId = backlog().requirements.find(
      (r) => r.key === 'alpha--second'
    ).id

    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--third', secondId] })
    )

    expect(() => ingestIncrements()).not.toThrow()
  })

  test('--dry-run over a regroup is refused the same way, and nothing is written', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second', 'alpha--third'] })
    )
    ingestIncrements()
    markStarted('inc-001')
    const beforeBacklog = backlog()

    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second'] })
    )

    expect(() => ingestIncrements({ dryRun: true })).toThrow(/inc-001/)
    expect(backlog()).toEqual(beforeBacklog)
  })
})

describe('rows', () => {
  test('the written increment carries every field, and requirements[] is untouched by the increments pass', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    const beforeRequirements = backlog().requirements
    writeIncrement('core-and-registry.json')

    ingestIncrements()

    const row = backlog().increments[0]
    expect(row).toMatchObject({
      id: 'inc-001',
      key: 'core-and-registry',
      title: 'A combined increment',
      outcome: 'Something true when done.',
      why: 'Two atoms land together.',
      class: 'feat',
      milestone: null,
      checkpoint: null,
      status: 'todo',
      doneBy: null,
      statusNote: null
    })
    expect(row.members).toEqual([backlog().requirements[0].id])
    expect(row.surface).toEqual({ repos: ['workspace'], areas: ['a'] })
    expect(backlog().requirements).toEqual(beforeRequirements)
    expect(backlog().schemaVersion).toBe(2)
    expect(backlog().profile).toBe('requirements-v2')
  })

  test('a solo row carries no title, no outcome, and combination: null', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')

    ingestIncrements()

    const row = backlog().increments[0]
    expect(row.title).toBeUndefined()
    expect(row.outcome).toBeUndefined()
    expect(row.combination).toBeNull()
  })
})

describe('born status from rows the writer produced (D28)', () => {
  test('an increment claiming an atom authored with needs is born blocked', () => {
    writeAtom('alpha--second.json', atom({ needs: ['q-open'] }))
    ingestAtoms()
    writeIncrement('core-and-registry.json')

    ingestIncrements()

    const row = backlog().increments[0]
    expect(row.status).toBe('blocked')
    expect(row.needs).toEqual(['q-open'])
  })

  test('an increment whose members carry no needs is born todo with needs: []', () => {
    seedSingleAtomIncrement()

    const row = backlog().increments[0]
    expect(row.status).toBe('todo')
    expect(row.needs).toEqual([])
  })

  test('needs recomputes on a refresh; status does not (D21)', () => {
    writeAtom('alpha--second.json', atom({ needs: ['q-open'] }))
    ingestAtoms()
    writeIncrement('core-and-registry.json')
    ingestIncrements()
    expect(backlog().increments[0].status).toBe('blocked')

    setAtomStatus('alpha--second', 'adopted', { needs: [] })
    ingestIncrements()

    const row = backlog().increments[0]
    expect(row.needs).toEqual([])
    expect(row.status).toBe('blocked')
  })
})

describe('references', () => {
  test('members written as keys resolve to ids', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second'] })
    )

    ingestIncrements()

    expect(backlog().increments[0].members).toEqual([
      backlog().requirements[0].id
    ])
  })

  test('members naming an unknown key is refused naming the file, the field and the key', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['nowhere--else'] })
    )

    expect(() => ingestIncrements()).toThrow(
      /core-and-registry\.json.*members.*nowhere--else/s
    )
  })

  test('dependsOn written as an increment key resolves', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['alpha--third'], dependsOn: ['a'] })
    )

    ingestIncrements()

    const rows = backlog().increments
    expect(rowByKey(rows, 'b').dependsOn).toEqual([rowByKey(rows, 'a').id])
  })

  test('an unknown dependsOn key is refused', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ dependsOn: ['nowhere--else'] })
    )

    expect(() => ingestIncrements()).toThrow(/dependsOn.*nowhere--else/s)
  })

  test('an increment naming itself in dependsOn is refused', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ dependsOn: ['core-and-registry'] })
    )

    expect(() => ingestIncrements()).toThrow(
      /core-and-registry.*dependsOn.*core-and-registry/s
    )
  })
})

describe('dangling ids (D5.1)', () => {
  test('members: ["req-999"] is refused, naming the file, members and req-999, and backlog.json is unchanged', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    const beforeBacklog = backlog()
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['req-999'] })
    )

    expect(() => ingestIncrements()).toThrow(
      /core-and-registry\.json.*members.*req-999/s
    )
    expect(backlog()).toEqual(beforeBacklog)
  })

  test('members: ["req-<id>"] naming a real atom by id resolves and claims it', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    const id = backlog().requirements[0].id
    writeIncrement('core-and-registry.json', increment({ members: [id] }))

    ingestIncrements()

    expect(backlog().increments[0].members).toEqual([id])
  })

  test('dependsOn: ["inc-999"] is refused naming dependsOn and inc-999', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ dependsOn: ['inc-999'] })
    )

    expect(() => ingestIncrements()).toThrow(/dependsOn.*inc-999/s)
  })

  test('dependsOn: ["inc-001"] naming an increment in the run resolves', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['alpha--third'], dependsOn: ['inc-001'] })
    )

    ingestIncrements()

    expect(rowByKey(backlog().increments, 'b').dependsOn).toEqual(['inc-001'])
  })
})

describe('cycles', () => {
  test('two increments depending on each other are refused naming both keys, and nothing is written', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    ingestAtoms()
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second'], dependsOn: ['b'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['alpha--third'], dependsOn: ['a'] })
    )

    expect(() => ingestIncrements()).toThrow(/a.*b/s)
    expect(existsSync(profile.paths.backlog)).toBe(true)
    expect(backlog().increments).toBeUndefined()
  })

  test('a cycle created purely by lifting is refused, naming both increment keys', () => {
    // No atom-level cycle: alpha--second -> gamma--first, delta--first ->
    // alpha--third are two separate chains. Grouping {alpha--second,
    // alpha--third} into "a" and {gamma--first, delta--first} into "b"
    // makes "a" depend on "b" (via the first edge) and "b" depend on "a"
    // (via the second) — a cycle only the lift can see (D22).
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma' })
    )
    writeAtom(
      'delta--first.json',
      atom({ key: 'delta--first', slice: 'delta', dependsOn: ['alpha--third'] })
    )
    ingestAtoms()
    setAtomStatus('alpha--second', 'proposed', {
      dependsOn: [
        backlog().requirements.find((r) => r.key === 'gamma--first').id
      ]
    })
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second', 'alpha--third'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['gamma--first', 'delta--first'] })
    )

    expect(() => ingestIncrements()).toThrow(/a.*b/s)
  })

  test('a three-increment loop names all three', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma' })
    )
    ingestAtoms()
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second'], dependsOn: ['b'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['alpha--third'], dependsOn: ['c'] })
    )
    writeIncrement(
      'c.json',
      increment({ key: 'c', members: ['gamma--first'], dependsOn: ['a'] })
    )

    expect(() => ingestIncrements()).toThrow(/a.*b.*c/s)
  })

  test('an acyclic diamond ingests', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma' })
    )
    writeAtom(
      'delta--first.json',
      atom({ key: 'delta--first', slice: 'delta' })
    )
    ingestAtoms()
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['alpha--third'], dependsOn: ['a'] })
    )
    writeIncrement(
      'c.json',
      increment({ key: 'c', members: ['gamma--first'], dependsOn: ['a'] })
    )
    writeIncrement(
      'd.json',
      increment({ key: 'd', members: ['delta--first'], dependsOn: ['b', 'c'] })
    )

    expect(() => ingestIncrements()).not.toThrow()
  })
})

describe('solos and membership (D11, D13)', () => {
  test('three adopted atoms, one increment claiming two: one solo, membership summary reads correctly', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma' })
    )
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    setAtomStatus('alpha--third', 'adopted')
    setAtomStatus('gamma--first', 'adopted')
    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second', 'alpha--third'] })
    )

    const result = ingestIncrements()

    expect(result.membership).toEqual({
      adopted: 3,
      covered: 3,
      solo: 1,
      combined: 1
    })
    const solo = backlog().increments.find((row) =>
      row.key.startsWith('solo--')
    )
    expect(solo.key).toBe('solo--gamma--first')
    expect(solo.title).toBeUndefined()
    expect(solo.outcome).toBeUndefined()
  })

  test('an empty distil/increments/ with three adopted atoms gives three solos', () => {
    writeAtom('alpha--second.json')
    writeAtom('alpha--third.json', atom({ key: 'alpha--third' }))
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma' })
    )
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    setAtomStatus('alpha--third', 'adopted')
    setAtomStatus('gamma--first', 'adopted')

    const result = ingestIncrements()

    expect(result.membership).toEqual({
      adopted: 3,
      covered: 3,
      solo: 3,
      combined: 0
    })
  })

  test('a proposed atom gets no solo', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()

    const result = ingestIncrements()

    expect(result.membership).toEqual({
      adopted: 0,
      covered: 0,
      solo: 0,
      combined: 0
    })
  })

  test('two authored increments both claiming the same adopted atom are refused, naming the atom and both increments', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    writeIncrement(
      'a.json',
      increment({ key: 'a', members: ['alpha--second'] })
    )
    writeIncrement(
      'b.json',
      increment({ key: 'b', members: ['alpha--second'] })
    )

    expect(() => ingestIncrements()).toThrow(/alpha--second.*a.*b/s)
  })
})

describe('started and ruled (req-014)', () => {
  test('an unstarted born-blocked increment is regrouped without a refusal, and appears in dropped[]', () => {
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma', needs: ['q-open'] })
    )
    ingestAtoms()
    writeIncrement(
      'blocked-one.json',
      increment({ key: 'blocked-one', members: ['gamma--first'] })
    )
    ingestIncrements()
    expect(backlog().increments[0].status).toBe('blocked')

    rmSync(join(incrementsDir(), 'blocked-one.json'))
    const result = ingestIncrements()

    expect(result.dropped).toContain('inc-001')
    expect(backlog().increments).toHaveLength(0)
  })

  test('the same born-blocked increment with a recorded attempt is refused on removal, naming its key', () => {
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma', needs: ['q-open'] })
    )
    ingestAtoms()
    writeIncrement(
      'blocked-one.json',
      increment({ key: 'blocked-one', members: ['gamma--first'] })
    )
    ingestIncrements()
    markStarted('inc-001')

    rmSync(join(incrementsDir(), 'blocked-one.json'))

    expect(() => ingestIncrements()).toThrow(/blocked-one/)
  })

  test('a born-blocked increment from a disputed member is regrouped without a refusal', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    setAtomStatus('alpha--second', 'disputed')
    writeIncrement('core-and-registry.json')
    ingestIncrements()
    expect(backlog().increments[0].status).toBe('blocked')

    rmSync(join(incrementsDir(), 'core-and-registry.json'))

    expect(() => ingestIncrements()).not.toThrow()
  })

  test('--replace runs over one born-blocked and one todo increment with no state file, renumbering both', () => {
    writeAtom('alpha--second.json')
    writeAtom(
      'gamma--first.json',
      atom({ key: 'gamma--first', slice: 'gamma', needs: ['q-open'] })
    )
    ingestAtoms()
    writeIncrement(
      'todo-one.json',
      increment({ key: 'todo-one', members: ['alpha--second'] })
    )
    writeIncrement(
      'blocked-one.json',
      increment({ key: 'blocked-one', members: ['gamma--first'] })
    )
    ingestIncrements()

    expect(() => ingestIncrements({ replace: true })).not.toThrow()
    expect(backlog().increments.map((row) => row.id)).toEqual([
      'inc-001',
      'inc-002'
    ])
  })

  test('a deferred increment removal is refused, naming its key', () => {
    seedSingleAtomIncrement()
    setIncrementStatus('core-and-registry', 'deferred')

    rmSync(join(incrementsDir(), 'core-and-registry.json'))

    expect(() => ingestIncrements()).toThrow(/core-and-registry/)
  })

  test('an unstarted todo increment is dropped without a refusal, and its id appears in dropped[]', () => {
    seedSingleAtomIncrement()

    rmSync(join(incrementsDir(), 'core-and-registry.json'))
    const result = ingestIncrements()

    expect(result.dropped).toEqual(['inc-001'])
  })

  test('--replace is refused while any increment is started, naming it', () => {
    seedSingleAtomIncrement()
    markStarted('inc-001')

    expect(() => ingestIncrements({ replace: true })).toThrow(/inc-001/)
  })

  test('a done increment removal is refused, with no state file recorded', () => {
    seedSingleAtomIncrement()
    setIncrementStatus('core-and-registry', 'done')

    rmSync(join(incrementsDir(), 'core-and-registry.json'))

    expect(() => ingestIncrements()).toThrow(/inc-001/)
  })

  test('a started solo is displaced when a new authored increment claims its atom, refused naming the solo', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    setAtomStatus('alpha--second', 'adopted')
    ingestIncrements()
    const solo = backlog().increments[0]
    markStarted(solo.id)

    writeIncrement(
      'core-and-registry.json',
      increment({ members: ['alpha--second'] })
    )

    expect(() => ingestIncrements()).toThrow(new RegExp(solo.key))
    expect(backlog().increments).toEqual([solo])
  })
})

describe('collection plumbing', () => {
  test('--dry-run writes nothing while still refusing a bad increment', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    const beforeBacklog = backlog()
    writeIncrement('core-and-registry.json', increment({ why: undefined }))

    expect(() => ingestIncrements({ dryRun: true })).toThrow()
    expect(backlog()).toEqual(beforeBacklog)
  })

  test('a missing distil/increments/ is refused naming the directory', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    rmSync(incrementsDir(), { recursive: true, force: true })

    expect(() => ingestIncrements()).toThrow(/increments/)
  })

  test('an increments pass with no atoms yet is refused naming the atoms pass', () => {
    expect(() => ingestIncrements()).toThrow(/--atoms/)
  })
})

describe('writer-only fields refused through the full pipeline (req-010)', () => {
  test('an authored increment carrying filesToTouch is refused, naming the plan', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement(
      'core-and-registry.json',
      increment({ filesToTouch: ['a.js'] })
    )

    expect(() => ingestIncrements()).toThrow(/plan owns files/)
    expect(backlog().increments).toBeUndefined()
  })

  test('an authored increment carrying executor is refused, naming build/run.json', () => {
    writeAtom('alpha--second.json')
    ingestAtoms()
    writeIncrement('core-and-registry.json', increment({ executor: 'codex' }))

    expect(() => ingestIncrements()).toThrow(/build\/run\.json/)
    expect(backlog().increments).toBeUndefined()
  })

  test('an increment row hand-edited to carry executor is refused on the next ingest', () => {
    seedSingleAtomIncrement()
    const currentBacklog = backlog()
    writeBacklog({
      ...currentBacklog,
      increments: currentBacklog.increments.map((row) => ({
        ...row,
        executor: 'codex'
      }))
    })

    expect(() => ingestIncrements()).toThrow(/build\/run\.json/)
  })
})
