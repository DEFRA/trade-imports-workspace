import { describe, test, expect } from 'vitest'
import {
  ATOM_FIELDS,
  INCREMENT_FIELDS,
  REFUSED_FIELDS,
  RECIPE_FIELDS,
  EXECUTOR_FIELDS,
  RUN_STATE_FIELDS,
  REPO_HOW_FIELDS,
  LAYER_FIELDS
} from './requirements-v2.classes.js'
import { validateAtom, requirementsV2 } from './requirements-v2.js'
import {
  validateIncrement,
  soloIncrementsFor,
  requirementsV2Increments
} from './requirements-v2-increments.js'

const atomFile = (overrides = {}) => ({
  key: 'alpha--second',
  slice: 'alpha',
  kind: 'capability',
  title: 'One writer core serves parity and requirement backlogs',
  statement:
    'The writer MUST serve any registered programme through a profile.',
  why: 'One core gives every programme the same locks and refusals.',
  acceptance: [
    {
      id: 'ac-1',
      text: 'Given a fixture programme, when it is ingested, then every id is stable.',
      witness: 'e2e',
      confidence: 'stated',
      sources: ['s1'],
      scenario: null,
      resolvedBy: null
    }
  ],
  falsifiedBy: 'An existing id that moves on a re-ingest.',
  sources: [
    {
      id: 's1',
      source: 'sam-req',
      ref: 'line:10',
      quote: 'One backlog.json format.',
      readAt: { version: null, fetchedAt: '2026-09-19', seal: 'git-blob:abc' },
      confidence: 'stated',
      role: 'requirement'
    }
  ],
  surface: {
    service: 'requirements-pipeline',
    area: 'writer',
    repos: ['workspace']
  },
  needs: ['q-1'],
  ...overrides
})

const incrementFile = (overrides = {}) => ({
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

const memberAtomRow = () => ({
  id: 'req-001',
  key: 'alpha--second',
  status: 'adopted',
  needs: ['q-1'],
  dependsOn: [],
  surface: { repos: ['workspace'], area: 'writer' }
})

const incrementContext = (rows = [memberAtomRow()]) => {
  const atomTable = new Map()
  for (const row of rows) {
    atomTable.set(row.id, row.id)
    atomTable.set(row.key, row.id)
  }
  return { atomRows: rows, atomTable, startedIds: new Set() }
}

const bornAtomRow = () => {
  const item = validateAtom({ raw: atomFile(), file: 'alpha--second.json' })
  return {
    ...requirementsV2.rowFrom({ item, id: 'req-001' }),
    [requirementsV2.frozen.field]: requirementsV2.frozen.compose(item),
    ...requirementsV2.bornExtras({ item }),
    status: requirementsV2.bornStatus({ item, profile: {} })
  }
}

const bornCombinedIncrementRow = () => {
  const context = incrementContext()
  const tables = {
    batch: new Map([
      ['inc-001', 'inc-001'],
      ['core-and-registry', 'inc-001']
    ])
  }
  const item = {
    ...validateIncrement({
      raw: incrementFile(),
      file: 'core-and-registry.json'
    }),
    members: ['req-001']
  }
  return {
    ...requirementsV2Increments.rowFrom({
      item,
      id: 'inc-001',
      context,
      tables
    }),
    ...requirementsV2Increments.bornExtras({ item, context }),
    status: requirementsV2Increments.bornStatus({ item, context })
  }
}

const bornSoloIncrementRow = () => {
  const context = incrementContext()
  const tables = {
    batch: new Map([
      ['inc-001', 'inc-001'],
      ['solo--alpha--second', 'inc-001']
    ])
  }
  const [solo] = soloIncrementsFor({
    authoredItems: [],
    atomRows: context.atomRows,
    atomTable: context.atomTable
  })
  return {
    ...requirementsV2Increments.rowFrom({
      item: solo,
      id: 'inc-001',
      context,
      tables
    }),
    ...requirementsV2Increments.bornExtras({ item: solo, context }),
    status: requirementsV2Increments.bornStatus({ item: solo, context })
  }
}

describe('written keys are all classed', () => {
  test('every key on a born atom row is in ATOM_FIELDS', () => {
    for (const key of Object.keys(bornAtomRow())) {
      expect(Object.hasOwn(ATOM_FIELDS, key)).toBe(true)
    }
  })

  test('every key on a born combined increment row and a born solo row is in INCREMENT_FIELDS', () => {
    for (const key of Object.keys(bornCombinedIncrementRow())) {
      expect(Object.hasOwn(INCREMENT_FIELDS, key)).toBe(true)
    }
    for (const key of Object.keys(bornSoloIncrementRow())) {
      expect(Object.hasOwn(INCREMENT_FIELDS, key)).toBe(true)
    }
  })
})

describe('persisted fields are all written', () => {
  test('every ATOM_FIELDS entry marked persisted is on a born row, and a refreshed row folded onto it', () => {
    const row = bornAtomRow()
    const item = validateAtom({ raw: atomFile(), file: 'alpha--second.json' })
    const authored = requirementsV2.rowFrom({ item, id: 'req-001' })
    const refreshedRow = {
      ...row,
      ...authored,
      [requirementsV2.frozen.field]:
        row[requirementsV2.frozen.field] ?? requirementsV2.frozen.compose(item),
      ...requirementsV2.foldOnto({ row, item, id: 'req-001', authored })
    }
    for (const [field, entry] of Object.entries(ATOM_FIELDS)) {
      if (!entry.persisted) continue
      expect(Object.hasOwn(row, field), field).toBe(true)
      expect(Object.hasOwn(refreshedRow, field), field).toBe(true)
    }
  })

  test('every INCREMENT_FIELDS entry marked persisted is on a born combined row; a solo carries the same set less title and outcome', () => {
    const combined = bornCombinedIncrementRow()
    const solo = bornSoloIncrementRow()
    for (const [field, entry] of Object.entries(INCREMENT_FIELDS)) {
      if (!entry.persisted) continue
      expect(Object.hasOwn(combined, field), field).toBe(true)
      if (field === 'title' || field === 'outcome') continue
      expect(Object.hasOwn(solo, field), field).toBe(true)
    }
    expect(Object.hasOwn(solo, 'title')).toBe(false)
    expect(Object.hasOwn(solo, 'outcome')).toBe(false)
  })
})

describe('class map shape', () => {
  test('every entry class is requirement, meta or state, and persisted is a boolean', () => {
    for (const entry of [
      ...Object.values(ATOM_FIELDS),
      ...Object.values(INCREMENT_FIELDS)
    ]) {
      expect(['requirement', 'meta', 'state']).toContain(entry.class)
      expect(typeof entry.persisted).toBe('boolean')
    }
  })

  test('REFUSED_FIELDS shares no key with either class map', () => {
    for (const field of Object.keys(REFUSED_FIELDS)) {
      expect(Object.hasOwn(ATOM_FIELDS, field)).toBe(false)
      expect(Object.hasOwn(INCREMENT_FIELDS, field)).toBe(false)
    }
  })

  test('filesToTouch, executor and verification have their named homes; every REFUSED_FIELDS entry is one of the five DESIGN 3.14 families', () => {
    expect(REFUSED_FIELDS.filesToTouch).toMatch(/plan owns files/)
    expect(REFUSED_FIELDS.executor).toMatch(/build\/run\.json/)
    expect(REFUSED_FIELDS.verification).toMatch(
      /plan owns how a change is verified/
    )

    const families = [
      ...RECIPE_FIELDS,
      ...EXECUTOR_FIELDS,
      ...RUN_STATE_FIELDS,
      ...REPO_HOW_FIELDS,
      ...LAYER_FIELDS
    ]
    expect(Object.keys(REFUSED_FIELDS).sort()).toEqual([...families].sort())
  })

  test("DESIGN 3.4's field list is covered", () => {
    expect(Object.keys(ATOM_FIELDS).sort()).toEqual(
      [
        'id',
        'key',
        'slice',
        'kind',
        'title',
        'statement',
        'why',
        'actor',
        'acceptance',
        'falsifiedBy',
        'sources',
        'confidence',
        'surface',
        'consistentWith',
        'constraints',
        'outOfScope',
        'needs',
        'assumptions',
        'decisions',
        'conflicts',
        'dependsOn',
        'edgeChecks',
        'relatedTo',
        'specRefs',
        'variantOf',
        'status',
        'supersededBy',
        'carriedFrom',
        'provenance'
      ].sort()
    )
  })

  test("DESIGN 3.5's field list is covered", () => {
    expect(Object.keys(INCREMENT_FIELDS).sort()).toEqual(
      [
        'id',
        'key',
        'title',
        'outcome',
        'why',
        'members',
        'class',
        'surface',
        'milestone',
        'dependsOn',
        'edgeChecks',
        'sequence',
        'needs',
        'checkpoint',
        'size',
        'combination',
        'status',
        'doneBy',
        'statusNote',
        'supersededBy'
      ].sort()
    )
  })
})
