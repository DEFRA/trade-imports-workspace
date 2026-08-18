import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonFile } from './io.js'
import { setSlot, setDecisionRequired, setCitation } from './set.js'

let dir
let profile

const increment = (overrides = {}) => ({
  id: 'inc-001',
  type: 'add-field',
  milestone: 'M0',
  domain: 'commodities',
  title: 't',
  detail: 'The frozen original.',
  screens: [],
  evidence: {},
  confidence: 'medium',
  band: 'needs-design-decision',
  gate: 'sam',
  dependsOn: [],
  status: 'blocked',
  commit: null,
  failure_reason: null,
  ...overrides
})

const write = (increments) =>
  writeFileSync(
    profile.paths.backlog,
    JSON.stringify({ run_id: 'R', target: 't', increments })
  )

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-parity-set-'))
  mkdirSync(join(dir, 'run'), { recursive: true })
  profile = { paths: { backlog: join(dir, 'run', 'backlog.json') } }
  write([increment(), increment({ id: 'inc-002', gate: null })])
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const slotFile = (text) => {
  const path = join(dir, 'slot.txt')
  writeFileSync(path, text)
  return path
}

describe('setSlot', () => {
  test('writes the slot from the file, trimmed', () => {
    setSlot({
      profile,
      id: 'inc-001',
      slot: 'difference',
      file: slotFile('  The frontend offers a Tattoo field for cattle.\n')
    })
    const [first] = readJsonFile(profile.paths.backlog).increments
    expect(first.finding.difference).toBe(
      'The frontend offers a Tattoo field for cattle.'
    )
  })

  test('leaves detail untouched — it is the migration oracle', () => {
    setSlot({ profile, id: 'inc-001', slot: 'difference', file: slotFile('x') })
    expect(readJsonFile(profile.paths.backlog).increments[0].detail).toBe(
      'The frozen original.'
    )
  })

  test('touches no other increment', () => {
    setSlot({ profile, id: 'inc-001', slot: 'difference', file: slotFile('x') })
    expect(
      readJsonFile(profile.paths.backlog).increments[1].finding
    ).toBeUndefined()
  })

  test('keeps a slot that was already set', () => {
    setSlot({ profile, id: 'inc-001', slot: 'frontend', file: slotFile('a') })
    setSlot({ profile, id: 'inc-001', slot: 'prototype', file: slotFile('b') })
    const [first] = readJsonFile(profile.paths.backlog).increments
    expect(first.finding).toMatchObject({ frontend: 'a', prototype: 'b' })
  })

  test('refuses a slot name that is not one of the seven', () => {
    expect(() =>
      setSlot({ profile, id: 'inc-001', slot: 'detail', file: slotFile('x') })
    ).toThrow(/not a prose slot/)
  })

  test('names the increment when it is not in the backlog', () => {
    expect(() =>
      setSlot({
        profile,
        id: 'inc-999',
        slot: 'difference',
        file: slotFile('x')
      })
    ).toThrow(/inc-999 is not in this backlog/)
  })

  test('reports the word count so a budget breach is visible at the call site', () => {
    const result = setSlot({
      profile,
      id: 'inc-001',
      slot: 'difference',
      file: slotFile('one two three four')
    })
    expect(result.words).toBe(4)
  })
})

describe('setDecisionRequired', () => {
  test('defaults the audience to the increment gate', () => {
    setDecisionRequired({
      profile,
      id: 'inc-001',
      decisionRequired: { question: 'Q?', source: 'authored' }
    })
    const [first] = readJsonFile(profile.paths.backlog).increments
    expect(first.finding.decisionRequired.audience).toBe('sam')
  })

  test('refuses an increment with no gate', () => {
    expect(() =>
      setDecisionRequired({
        profile,
        id: 'inc-002',
        decisionRequired: { question: 'Q?', source: 'authored' }
      })
    ).toThrow(/not gated/)
  })
})

describe('setCitation', () => {
  beforeEach(() => {
    write([
      increment({
        citations: [
          {
            ref: 'c1',
            kind: 'code',
            side: null,
            repo: null,
            path: null,
            asWritten: 'stub.js:1',
            resolution: 'unresolved',
            needsHuman: true,
            why: 'matched 9 files',
            candidates: ['a/stub.js', 'b/stub.js']
          }
        ]
      })
    ])
  })

  test('records that a person resolved it, not that it resolved itself', () => {
    setCitation({
      profile,
      id: 'inc-001',
      ref: 'c1',
      repo: 'frontend',
      path: 'a/stub.js'
    })
    const [citation] = readJsonFile(profile.paths.backlog).increments[0]
      .citations
    expect(citation).toMatchObject({
      repo: 'frontend',
      path: 'a/stub.js',
      resolution: 'human',
      needsHuman: false
    })
    expect(citation.why).toMatch(/Resolved by hand/)
  })

  test('names the ref when the citation is not there', () => {
    expect(() =>
      setCitation({ profile, id: 'inc-001', ref: 'c9', repo: 'x', path: 'y' })
    ).toThrow(/no citation c9/)
  })
})
