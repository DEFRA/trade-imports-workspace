import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sealOf, sealsFrom, diffSeals, readSeals, writeSeals } from './seals.js'
import { markDrift } from './render/run.js'

const SIDES = [{ id: 'frontend' }, { id: 'prototype' }]

const crop = (sha, anchor = 'field-portofentry') => ({
  state: 'crop',
  screen: 'fe-arrival-details',
  anchorKey: anchor,
  sha256: sha
})

const page = (sha, screen = 'fe-arrival-details') => ({
  state: 'page',
  screen,
  sha256: sha
})

const item = (id, rows) => ({ id, title: `Finding ${id}`, assets: rows })

describe('sealOf', () => {
  test('reduces an asset to the frame and the bytes', () => {
    expect(sealOf(crop('aaa'))).toEqual({
      state: 'crop',
      screen: 'fe-arrival-details',
      anchor: 'field-portofentry',
      sha256: 'aaa'
    })
  })

  test('a page shot has no anchor', () => {
    expect(sealOf(page('bbb')).anchor).toBeNull()
  })

  test('a state with no picture seals nothing', () => {
    expect(sealOf({ state: 'model' })).toBeNull()
    expect(sealOf({ state: 'absent' })).toBeNull()
  })
})

describe('sealsFrom', () => {
  test('one seal per side per picture row', () => {
    const seals = sealsFrom(
      [
        item('inc-001', [
          { frontend: crop('aaa'), prototype: page('bbb') },
          { frontend: page('ccc'), prototype: { state: 'absent' } }
        ])
      ],
      SIDES
    )
    expect(seals['inc-001'].frontend).toHaveLength(2)
    expect(seals['inc-001'].prototype[1]).toBeNull()
  })

  test('a finding with no picture at all is not sealed', () => {
    const seals = sealsFrom(
      [item('inc-002', [{ frontend: { state: 'model' } }])],
      SIDES
    )
    expect(seals['inc-002']).toBeUndefined()
  })
})

describe('diffSeals', () => {
  const current = sealsFrom(
    [item('inc-001', [{ frontend: crop('aaa'), prototype: page('bbb') }])],
    SIDES
  )

  test('a finding nobody has been shown yet cannot have drifted under them', () => {
    expect(diffSeals({ sealed: {}, current })).toEqual([])
  })

  test('the same picture is not drift', () => {
    expect(diffSeals({ sealed: current, current })).toEqual([])
  })

  test('a re-captured picture is image-changed, and says what it was', () => {
    const sealed = sealsFrom(
      [item('inc-001', [{ frontend: crop('zzz'), prototype: page('bbb') }])],
      SIDES
    )
    const drift = diffSeals({ sealed, current })
    expect(drift).toHaveLength(1)
    expect(drift[0]).toMatchObject({
      id: 'inc-001',
      side: 'frontend',
      row: 0,
      kind: 'image-changed',
      wasSha: 'zzz',
      nowSha: 'aaa'
    })
    expect(drift[0].was).toBe('crop of field-portofentry on fe-arrival-details')
  })

  test('a different control is frame-changed, not a re-capture', () => {
    const sealed = sealsFrom(
      [
        item('inc-001', [
          { frontend: crop('zzz', 'field-file'), prototype: page('bbb') }
        ])
      ],
      SIDES
    )
    const drift = diffSeals({ sealed, current })
    expect(drift[0].kind).toBe('frame-changed')
    expect(drift[0].was).toContain('field-file')
  })

  test('a crop replacing a whole page is frame-changed even at the same screen', () => {
    const sealed = sealsFrom(
      [item('inc-001', [{ frontend: page('zzz'), prototype: page('bbb') }])],
      SIDES
    )
    expect(diffSeals({ sealed, current })[0].kind).toBe('frame-changed')
  })

  test('a picture that has gone is drift, not silence', () => {
    const gone = sealsFrom(
      [
        item('inc-001', [
          { frontend: { state: 'model' }, prototype: page('bbb') }
        ])
      ],
      SIDES
    )
    const drift = diffSeals({ sealed: current, current: gone })
    expect(drift).toHaveLength(1)
    expect(drift[0].now).toBe('no picture')
  })
})

describe('writeSeals', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'seals-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const current = sealsFrom(
    [item('inc-001', [{ frontend: crop('aaa') }])],
    SIDES
  )

  test('an unseen finding is sealed on the first render', () => {
    const path = join(dir, 'seals.json')
    writeSeals({ path, sealed: {}, current })
    expect(readSeals(path)['inc-001'].frontend[0].sha256).toBe('aaa')
  })

  test('a moved picture keeps the seal it drifted from', () => {
    const path = join(dir, 'seals.json')
    const sealed = sealsFrom(
      [item('inc-001', [{ frontend: crop('zzz') }])],
      SIDES
    )
    writeSeals({ path, sealed, current })
    // Otherwise the drift panel erases its own evidence: the rebuild that
    // reports the change would also accept it, and the next rebuild is silent.
    expect(readSeals(path)['inc-001'].frontend[0].sha256).toBe('zzz')
  })

  test('--reseal accepts the current state', () => {
    const path = join(dir, 'seals.json')
    const sealed = sealsFrom(
      [item('inc-001', [{ frontend: crop('zzz') }])],
      SIDES
    )
    writeSeals({ path, sealed, current, reseal: true })
    expect(readSeals(path)['inc-001'].frontend[0].sha256).toBe('aaa')
  })

  test('reading a store that does not exist yet is empty, not an error', () => {
    expect(existsSync(join(dir, 'nothing.json'))).toBe(false)
    expect(readSeals(join(dir, 'nothing.json'))).toEqual({})
  })
})

describe('markDrift', () => {
  test('the ribbon lands on the picture that moved, not on the card', () => {
    const items = [
      item('inc-001', [
        { frontend: crop('aaa'), prototype: page('bbb') },
        { frontend: page('ccc'), prototype: page('ddd') }
      ])
    ]
    markDrift({
      items,
      drift: [
        {
          id: 'inc-001',
          side: 'prototype',
          row: 1,
          kind: 'image-changed',
          was: 'full page of fe-arrival-details'
        }
      ]
    })
    expect(items[0].assets[1].prototype.drifted).toBe(true)
    expect(items[0].assets[1].prototype.driftedFrom).toBe(
      'full page of fe-arrival-details'
    )
    expect(items[0].assets[0].prototype.drifted).toBeUndefined()
    expect(items[0].assets[1].frontend.drifted).toBeUndefined()
  })

  test('drift naming a row that no longer exists is ignored rather than thrown', () => {
    const items = [item('inc-001', [{ frontend: crop('aaa') }])]
    expect(() =>
      markDrift({
        items,
        drift: [{ id: 'inc-001', side: 'frontend', row: 9, kind: 'gone' }]
      })
    ).not.toThrow()
  })
})
