import { describe, test, expect } from 'vitest'
import {
  validateIncrement,
  soloIncrementsFor,
  liftDependencies,
  checkOneIncrementPerAtom,
  parseIncrement,
  rootKeyOf,
  requirementsV2Increments,
  needsFor
} from './requirements-v2-increments.js'

const increment = (overrides = {}) => ({
  key: 'core-and-registry',
  title: 'One writer core serves parity and requirement backlogs',
  outcome: 'Any registered programme is ingested through one writer core.',
  why: 'Both atoms land in the same change.',
  members: ['alpha--second'],
  class: 'feat',
  milestone: null,
  checkpoint: null,
  size: { class: 'S', basis: '1 criterion, 1 atom' },
  combination: { why: 'One atom.', rules: ['solo-slice'] },
  ...overrides
})

const validate = (overrides = {}) =>
  validateIncrement({
    raw: increment(overrides),
    file: 'core-and-registry.json'
  })

describe('validateIncrement', () => {
  test('refuses filesToTouch with the plan-owns-files message', () => {
    expect(() => validate({ filesToTouch: ['a.js'] })).toThrow(
      /filesToTouch.*plan owns files/s
    )
  })

  test('refuses executor with the run-configuration message', () => {
    expect(() => validate({ executor: 'codex' })).toThrow(
      /executor.*build\/run\.json/s
    )
  })

  test('refuses verification, naming the plan', () => {
    expect(() => validate({ verification: 'ignored' })).toThrow(
      /verification.*plan/s
    )
  })

  test('refuses an unknown key, naming the known fields', () => {
    expect(() => validate({ bandwidth: 'high' })).toThrow(
      /"bandwidth".*Known fields:/s
    )
  })

  for (const field of ['key', 'title', 'outcome', 'why']) {
    test(`refuses a missing "${field}"`, () => {
      expect(() => validate({ [field]: undefined })).toThrow(
        new RegExp(`"${field}"`)
      )
    })
  }

  test('refuses an empty members', () => {
    expect(() => validate({ members: [] })).toThrow(/"members"/)
  })

  test('refuses a class outside the enum, listing it', () => {
    expect(() => validate({ class: 'made-up' })).toThrow(/"class".*feat.*docs/s)
  })

  test('refuses a checkpoint outside null | halt-after | walkthrough', () => {
    expect(() => validate({ checkpoint: 'made-up' })).toThrow(
      /"checkpoint".*halt-after.*walkthrough/s
    )
  })

  test('refuses a missing milestone key while accepting milestone: null', () => {
    const { milestone: _milestone, ...withoutMilestone } = increment()
    expect(() =>
      validateIncrement({ raw: withoutMilestone, file: 'x.json' })
    ).toThrow(/"milestone"/)
    expect(validate({ milestone: null }).milestone).toBeNull()
  })

  test('refuses a size without class or basis', () => {
    expect(() => validate({ size: { class: 'S' } })).toThrow(/"size\.basis"/)
    expect(() => validate({ size: { basis: 'x' } })).toThrow(/"size\.class"/)
  })

  test('refuses a combination with no why', () => {
    expect(() => validate({ combination: { rules: [] } })).toThrow(
      /"combination\.why"/
    )
  })

  test('defaults dependsOn and sequence', () => {
    const item = validate()
    expect(item.dependsOn).toEqual([])
    expect(item.sequence).toBeNull()
  })

  test('refuses a dependsOn that is not a list', () => {
    expect(() => validate({ dependsOn: 'a' })).toThrow(
      /"dependsOn" must be a list/
    )
  })

  test('refuses an authored edgeChecks, naming its future owner, rather than silently dropping it', () => {
    expect(() => validate({ edgeChecks: ['ec-1'] })).toThrow(
      /"edgeChecks".*COMBINE_VERIFIER \(inc-011\)/s
    )
  })

  test('refuses a combination.rules that is not a list', () => {
    expect(() => validate({ combination: { why: 'x', rules: 'a' } })).toThrow(
      /"combination\.rules" must be a list/
    )
  })

  test('refuses a key that starts with the reserved solo-- prefix', () => {
    expect(() => validate({ key: 'solo--alpha--second' })).toThrow(
      /"key".*reserved/s
    )
  })
})

const atomRow = (overrides = {}) => ({
  id: 'req-001',
  key: 'alpha--second',
  status: 'adopted',
  kind: 'capability',
  why: 'The requirement why.',
  acceptance: [{ id: 'ac-1' }],
  needs: [],
  dependsOn: [],
  surface: { repos: ['workspace'], area: 'writer' },
  ...overrides
})

const tableFor = (rows) =>
  new Map(
    rows.flatMap((row) => [
      [row.id, row.id],
      [row.key, row.id]
    ])
  )

describe('soloIncrementsFor', () => {
  const callSolo = (rows, authoredItems = []) =>
    soloIncrementsFor({
      authoredItems,
      atomRows: rows,
      atomTable: tableFor(rows)
    })

  test('one solo per unclaimed adopted atom', () => {
    const rows = [atomRow()]
    const solos = callSolo(rows)
    expect(solos).toHaveLength(1)
    expect(solos[0].key).toBe('solo--alpha--second')
    expect(solos[0].members).toEqual(['req-001'])
  })

  test('none for a claimed atom', () => {
    const rows = [atomRow()]
    const authored = [{ key: 'core-and-registry', members: ['req-001'] }]
    const solos = callSolo(rows, authored)
    expect(solos).toHaveLength(0)
  })

  test('none for a proposed atom', () => {
    const rows = [atomRow({ status: 'proposed' })]
    const solos = callSolo(rows)
    expect(solos).toHaveLength(0)
  })

  test('a claim written as an id and a claim written as a key both count', () => {
    const rows = [atomRow(), atomRow({ id: 'req-002', key: 'alpha--third' })]
    const byId = [{ key: 'a', members: ['req-001'] }]
    const byKey = [{ key: 'b', members: ['alpha--third'] }]
    const solos = callSolo(rows, [...byId, ...byKey])
    expect(solos).toHaveLength(0)
  })

  test('the key is solo--<root key> through a supersededBy chain', () => {
    const survivor = atomRow({ id: 'req-002', key: 'alpha--variant' })
    const original = atomRow({ status: 'superseded', supersededBy: 'req-002' })
    const rows = [original, survivor]
    const solos = callSolo(rows)
    expect(solos).toHaveLength(1)
    expect(solos[0].key).toBe('solo--alpha--second')
    expect(solos[0].members).toEqual(['req-002'])
  })

  test('a looping chain terminates', () => {
    const a = atomRow({ id: 'req-001', key: 'a', supersededBy: 'req-002' })
    const b = atomRow({ id: 'req-002', key: 'b', supersededBy: 'req-001' })
    expect(rootKeyOf(a, [a, b])).toBe('a')
  })

  test('the solo carries no title and no outcome', () => {
    const rows = [atomRow()]
    const [solo] = callSolo(rows)
    expect(solo.title).toBeUndefined()
    expect(solo.outcome).toBeUndefined()
  })

  test('class chore for a hygiene member and feat otherwise', () => {
    const hygiene = [atomRow({ kind: 'hygiene' })]
    const other = [atomRow({ kind: 'capability' })]
    expect(callSolo(hygiene)[0].class).toBe('chore')
    expect(callSolo(other)[0].class).toBe('feat')
  })

  test('size S/M/L at the threshold boundaries', () => {
    const sizeFor = (count) => {
      const rows = [
        atomRow({
          acceptance: Array.from({ length: count }, (_, i) => ({
            id: `ac-${i}`
          }))
        })
      ]
      return callSolo(rows)[0].size
    }
    expect(sizeFor(3).class).toBe('S')
    expect(sizeFor(4).class).toBe('M')
    expect(sizeFor(8).class).toBe('M')
    expect(sizeFor(9).class).toBe('L')
  })

  test('basis uses the singular "criterion" for a single acceptance item', () => {
    const rows = [atomRow({ acceptance: [{ id: 'ac-1' }] })]
    expect(callSolo(rows)[0].size.basis).toBe('1 criterion, 1 atom')
  })

  test('basis uses the plural "criteria" for more than one acceptance item', () => {
    const rows = [atomRow({ acceptance: [{ id: 'ac-1' }, { id: 'ac-2' }] })]
    expect(callSolo(rows)[0].size.basis).toBe('2 criteria, 1 atom')
  })
})

describe('liftDependencies', () => {
  test('an edge between atoms in different increments becomes an edge between those increments', () => {
    const membershipKeyByAtomId = new Map([
      ['req-001', 'a'],
      ['req-002', 'b']
    ])
    const context = {
      atomRows: [atomRow({ dependsOn: ['req-002'] })],
      membershipKeyByAtomId
    }
    const tables = {
      batch: new Map([
        ['a', 'inc-001'],
        ['b', 'inc-002']
      ])
    }
    const item = { key: 'a', members: ['req-001'], dependsOn: [] }

    expect(liftDependencies({ item, context, tables })).toEqual(['inc-002'])
  })

  test('an edge inside one increment is dropped', () => {
    const context = {
      atomRows: [
        atomRow({ dependsOn: ['req-002'] }),
        atomRow({ id: 'req-002', key: 'alpha--third' })
      ],
      membershipKeyByAtomId: new Map([
        ['req-001', 'a'],
        ['req-002', 'a']
      ])
    }
    const tables = { batch: new Map([['a', 'inc-001']]) }
    const item = { key: 'a', members: ['req-001', 'req-002'], dependsOn: [] }

    expect(liftDependencies({ item, context, tables })).toEqual([])
  })

  test('an authored edge and a lifted edge are unioned without duplicates', () => {
    const context = {
      atomRows: [atomRow({ dependsOn: ['req-002'] })],
      membershipKeyByAtomId: new Map([
        ['req-001', 'a'],
        ['req-002', 'b']
      ])
    }
    const tables = {
      batch: new Map([
        ['a', 'inc-001'],
        ['b', 'inc-002']
      ])
    }
    const item = { key: 'a', members: ['req-001'], dependsOn: ['inc-002'] }

    expect(liftDependencies({ item, context, tables })).toEqual(['inc-002'])
  })

  test('an edge to an atom in no increment is dropped rather than refused', () => {
    const context = {
      atomRows: [atomRow({ dependsOn: ['req-999'] })],
      membershipKeyByAtomId: new Map([['req-001', 'a']])
    }
    const tables = { batch: new Map([['a', 'inc-001']]) }
    const item = { key: 'a', members: ['req-001'], dependsOn: [] }

    expect(() => liftDependencies({ item, context, tables })).not.toThrow()
    expect(liftDependencies({ item, context, tables })).toEqual([])
  })
})

describe('checkOneIncrementPerAtom', () => {
  test('passes when every adopted atom has exactly one claim', () => {
    const context = { atomRows: [atomRow()] }
    const rows = [{ key: 'a', members: ['req-001'] }]
    expect(() => checkOneIncrementPerAtom({ rows, context })).not.toThrow()
  })

  test('refuses a doubly claimed atom naming the atom key and both increment keys', () => {
    const context = { atomRows: [atomRow()] }
    const rows = [
      { key: 'a', members: ['req-001'] },
      { key: 'b', members: ['req-001'] }
    ]
    expect(() => checkOneIncrementPerAtom({ rows, context })).toThrow(
      /alpha--second.*a.*b/
    )
  })

  test('ignores proposed atoms', () => {
    const context = { atomRows: [atomRow({ status: 'proposed' })] }
    expect(() => checkOneIncrementPerAtom({ rows: [], context })).not.toThrow()
  })
})

describe('requirementsV2Increments.isRuled', () => {
  const context = (startedIds = new Set()) => ({ startedIds })

  for (const status of ['todo', 'blocked', 'superseded']) {
    test(`${status} with no recorded attempt is not ruled`, () => {
      expect(
        requirementsV2Increments.isRuled({ id: 'inc-001', status }, context())
      ).toBe(false)
    })
  }

  for (const status of ['deferred', 'dropped', 'done']) {
    test(`${status} with no recorded attempt is ruled`, () => {
      expect(
        requirementsV2Increments.isRuled({ id: 'inc-001', status }, context())
      ).toBe(true)
    })
  }

  for (const status of [
    'todo',
    'blocked',
    'deferred',
    'dropped',
    'done',
    'superseded'
  ]) {
    test(`${status} with a recorded attempt is ruled`, () => {
      expect(
        requirementsV2Increments.isRuled(
          { id: 'inc-001', status },
          context(new Set(['inc-001']))
        )
      ).toBe(true)
    })
  }
})

describe('regroup (D29)', () => {
  test('regroupField is "members"', () => {
    expect(requirementsV2Increments.regroupField).toBe('members')
  })

  test('messages.regrouped renders the id, key, before and after, and the put-back sentence', () => {
    const message = requirementsV2Increments.messages.regrouped([
      {
        id: 'inc-001',
        key: 'core-and-registry',
        before: ['req-001', 'req-002'],
        after: ['req-001']
      }
    ])
    expect(message).toContain('inc-001')
    expect(message).toContain('core-and-registry')
    expect(message).toContain('it has started or been ruled on')
    expect(message).toContain('req-001, req-002')
    expect(message).toContain('to req-001')
    expect(message).toContain('Put its members back')
  })

  test('one line per increment over two entries', () => {
    const message = requirementsV2Increments.messages.regrouped([
      { id: 'inc-001', key: 'a', before: ['req-001'], after: [] },
      { id: 'inc-002', key: 'b', before: ['req-002'], after: [] }
    ])
    expect(message.split('\n')).toHaveLength(2)
  })
})

describe('born status and needs (D14, D21, D28)', () => {
  const rowFor = (context, item) =>
    requirementsV2Increments.rowFrom({
      item,
      id: 'inc-001',
      context,
      tables: { batch: new Map() }
    })
  const bornFor = (context, item) =>
    requirementsV2Increments.bornStatus({ item, context })

  test("needs is the sorted, deduplicated union of the members' needs", () => {
    const context = {
      atomRows: [
        atomRow({ needs: ['q-2', 'q-1'] }),
        atomRow({ id: 'req-002', key: 'alpha--third', needs: ['q-1'] })
      ]
    }
    const item = { members: ['req-001', 'req-002'] }

    expect(rowFor(context, item).needs).toEqual(['q-1', 'q-2'])
  })

  test('a member row with no needs key contributes []', () => {
    const context = { atomRows: [atomRow({ needs: undefined })] }
    const item = { members: ['req-001'] }

    expect(rowFor(context, item).needs).toEqual([])
  })

  test('a superseded, parked or rejected member contributes nothing', () => {
    for (const status of ['superseded', 'parked', 'rejected']) {
      const context = { atomRows: [atomRow({ status, needs: ['q-1'] })] }
      const item = { members: ['req-001'] }

      expect(rowFor(context, item).needs).toEqual([])
    }
  })

  test('born status is blocked for a non-empty needs union', () => {
    const context = { atomRows: [atomRow({ needs: ['q-1'] })] }
    const item = { members: ['req-001'] }

    expect(bornFor(context, item)).toBe('blocked')
  })

  test('born status is blocked for a disputed member', () => {
    const context = { atomRows: [atomRow({ status: 'disputed' })] }
    const item = { members: ['req-001'] }

    expect(bornFor(context, item)).toBe('blocked')
  })

  test('born status is todo otherwise', () => {
    const context = { atomRows: [atomRow()] }
    const item = { members: ['req-001'] }

    expect(bornFor(context, item)).toBe('todo')
  })

  test('needsFor over the bare {atomRows} shape matches what rowFrom writes for the same members (T-I3)', () => {
    const atomRows = [
      { id: 'req-001', status: 'adopted', needs: ['q-a', 'q-b'] },
      { id: 'req-002', status: 'adopted', needs: ['q-b'] }
    ]
    const item = { members: ['req-001', 'req-002'] }
    const ingestContext = { atomRows, atomTable: new Map(), startedIds: new Set() }

    expect(needsFor(item, { atomRows })).toEqual(
      rowFor(ingestContext, item).needs
    )
  })
})

describe('parseIncrement', () => {
  const row = () => ({
    id: 'inc-001',
    key: 'core-and-registry',
    title: 't',
    outcome: 'o',
    why: 'w',
    members: ['req-001'],
    class: 'feat',
    surface: { repos: [], areas: [] },
    milestone: null,
    dependsOn: [],
    sequence: null,
    needs: [],
    checkpoint: null,
    size: { class: 'S', basis: 'x' },
    combination: null,
    status: 'todo',
    doneBy: null,
    statusNote: null
  })

  test('parses a written row', () => {
    expect(parseIncrement(row(), 0).id).toBe('inc-001')
  })

  test('names the id and the field path on a bad row', () => {
    expect(() =>
      parseIncrement({ ...row(), members: 'not-a-list' }, 0)
    ).toThrow(/inc-001.*members/s)
  })

  test('keeps a neutral unknown key on a row untouched', () => {
    expect(parseIncrement({ ...row(), tranche: 2 }, 0).tranche).toBe(2)
  })

  test('refuses a row carrying executor, naming the row id and the home', () => {
    expect(() => parseIncrement({ ...row(), executor: 'codex' }, 0)).toThrow(
      /inc-001.*build\/run\.json/s
    )
  })

  test('refuses a row carrying filesToTouch, naming the row id and the home', () => {
    expect(() =>
      parseIncrement({ ...row(), filesToTouch: ['a.js'] }, 0)
    ).toThrow(/inc-001.*plan owns files/s)
  })
})

