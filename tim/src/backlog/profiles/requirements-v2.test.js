import { describe, test, expect } from 'vitest'
import {
  validateAtom,
  verificationOf,
  atomSchema,
  parseAtom,
  parseV2Backlog,
  requirementsV2
} from './requirements-v2.js'

const atom = (overrides = {}) => ({
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
  ...overrides
})

const validate = (overrides = {}) =>
  validateAtom({ raw: atom(overrides), file: 'alpha--second.json' })

describe('validateAtom', () => {
  test("reads an atom's identity from key", () => {
    expect(validate().key).toBe('alpha--second')
  })

  test('refuses an atom whose statement is missing, naming the file and "statement"', () => {
    expect(() => validate({ statement: undefined })).toThrow(
      /alpha--second\.json.*"statement"/s
    )
  })

  test("refuses an atom whose kind is not one of DESIGN 3.4's ten, naming the file, the field and the allowed list", () => {
    expect(() => validate({ kind: 'made-up-kind' })).toThrow(
      /alpha--second\.json.*"kind".*capability.*spike/s
    )
  })

  test('refuses an atom whose acceptance is empty, naming the file and the field', () => {
    expect(() => validate({ acceptance: [] })).toThrow(
      /alpha--second\.json.*"acceptance"/s
    )
  })

  test('refuses an atom whose surface.repos is not a list, naming the file and the field', () => {
    expect(() =>
      validate({ surface: { service: 's', area: 'a', repos: 'workspace' } })
    ).toThrow(/alpha--second\.json.*"surface\.repos"/s)
  })

  test('keeps an unknown key on the atom untouched (D14)', () => {
    // Unknown-key tolerance is a property of the row schema, which parses
    // whatever the core already wrote (plus anything a later, out-of-scope
    // command — rule, verify-record — added to the row): a re-parse must
    // not strip a key it does not itself know about.
    const row = {
      id: 'req-001',
      key: 'alpha--second',
      slice: 'alpha',
      kind: 'capability',
      title: 't',
      statement: 's',
      why: 'w',
      acceptance: [{ id: 'ac-1' }],
      falsifiedBy: 'f',
      sources: [],
      surface: { repos: [] },
      dependsOn: [],
      relatedTo: [],
      status: 'proposed',
      provenance: null,
      needs: ['q-something']
    }

    expect(atomSchema.parse(row).needs).toEqual(['q-something'])
  })

  test('refuses a top-level verification key, naming the plan', () => {
    expect(() =>
      validate({ verification: 'ignored', provenance: { verifiedBy: null } })
    ).toThrow(/"verification".*plan/s)
  })

  test('reads a verification record from provenance.verifiedBy and nowhere else', () => {
    const withProvenance = validate({
      provenance: {
        verifiedBy: { phase: 'verify', task: 'verify:alpha', run: 'run-1' }
      }
    })

    expect(withProvenance.verification).toEqual({
      phase: 'verify',
      task: 'verify:alpha',
      run: 'run-1'
    })
  })

  test('refuses filesToTouch, naming the plan', () => {
    expect(() => validate({ filesToTouch: ['a.js'] })).toThrow(
      /"filesToTouch".*plan owns files/s
    )
  })

  test('refuses an unknown key, naming it and the known fields', () => {
    expect(() => validate({ bandwidth: 'high' })).toThrow(
      /"bandwidth".*Known fields:/s
    )
  })

  test('refuses a classed field this collection does not persist yet, naming its future owner', () => {
    expect(() => validate({ actor: 'importer' })).toThrow(
      /"actor".*author \(inc-032\)/s
    )
  })

  test('passes a not-yet-persisted field whose eventual owner is ingest itself', () => {
    expect(() => validate({ confidence: 'stated' })).not.toThrow()
  })

  test('returns needs as given when it is a list of strings', () => {
    expect(validate({ needs: ['q-1', 'q-2'] }).needs).toEqual(['q-1', 'q-2'])
  })

  test('returns [] for needs when absent', () => {
    expect(validate().needs).toEqual([])
  })

  test('refuses needs: "q-1" (not a list), naming the file and needs', () => {
    expect(() => validate({ needs: 'q-1' })).toThrow(
      /alpha--second\.json.*"needs"/s
    )
  })

  test('refuses needs: [""] (an empty entry), naming the file and needs', () => {
    expect(() => validate({ needs: [''] })).toThrow(
      /alpha--second\.json.*"needs"/s
    )
  })

  test('derives the born status proposed', () => {
    expect(requirementsV2.bornStatus({ item: validate(), profile: {} })).toBe(
      'proposed'
    )
  })
})

describe('verificationOf', () => {
  test('reads provenance.verifiedBy', () => {
    expect(verificationOf({ provenance: { verifiedBy: 'sam' } })).toBe('sam')
  })

  test('never falls back to a top-level verification field', () => {
    expect(verificationOf({ verification: 'sam' })).toBeNull()
  })
})

describe('parseAtom', () => {
  test('names the actual bad value on a wrongly-typed field, not the literal "undefined"', () => {
    expect(() => parseAtom({ ...atom(), id: 42 }, 0)).toThrow(/got 42/)
  })

  test('refuses a row carrying executor, naming the field and build/run.json (D8, D26)', () => {
    const row = {
      ...atom(),
      id: 'req-001',
      dependsOn: [],
      relatedTo: [],
      status: 'proposed',
      provenance: null,
      executor: 'codex'
    }

    expect(() => parseAtom(row, 0)).toThrow(
      /req-001.*executor.*build\/run\.json/s
    )
  })
})

describe('parseV2Backlog', () => {
  test('names the actual bad value on a wrongly-typed backlog field, not the literal "undefined"', () => {
    expect(() =>
      parseV2Backlog({
        schemaVersion: 2,
        programme: 42,
        profile: 'requirements-v2',
        requirements: []
      })
    ).toThrow(/got 42/)
  })

  test('refuses an atom row carrying executor, naming the field and build/run.json, on the read (D8, D26)', () => {
    const row = {
      ...atom(),
      id: 'req-001',
      dependsOn: [],
      relatedTo: [],
      status: 'proposed',
      provenance: null,
      executor: 'codex'
    }

    expect(() =>
      parseV2Backlog({
        schemaVersion: 2,
        programme: 'p',
        profile: 'requirements-v2',
        requirements: [row]
      })
    ).toThrow(/req-001.*executor.*build\/run\.json/s)
  })
})
