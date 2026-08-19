import { describe, test, expect } from 'vitest'
import { compareCaptures, renderRepoint } from './repoint.js'

const row = (screen, sha256) => ({
  screen,
  file: `page/${screen}.png`,
  bytes: 100,
  sha256,
  size: { width: 1280, height: 900 }
})

describe('compareCaptures', () => {
  const from = { rows: [row('a', 'aaa'), row('b', 'bbb'), row('c', 'ccc')] }
  const to = { rows: [row('a', 'aaa'), row('b', 'zzz'), row('d', 'ddd')] }

  test('identical bytes are not evidence of anything moving', () => {
    const verdicts = Object.fromEntries(
      compareCaptures({ from, to }).map((r) => [r.screen, r.verdict])
    )
    expect(verdicts.a).toBe('identical')
  })

  test('a changed picture is named', () => {
    const changed = compareCaptures({ from, to }).find((r) => r.screen === 'b')
    expect(changed.verdict).toBe('changed')
    expect(changed.was.sha256).toBe('bbb')
    expect(changed.now.sha256).toBe('zzz')
  })

  test('a screen the new capture did not reach is lost, not absent', () => {
    const lost = compareCaptures({ from, to }).find((r) => r.screen === 'c')
    expect(lost.verdict).toBe('lost')
    expect(lost.now).toBeNull()
  })

  test('a screen the old capture never had is gained', () => {
    expect(
      compareCaptures({ from, to }).find((r) => r.screen === 'd').verdict
    ).toBe('gained')
  })

  test('repointing from nothing gains everything rather than throwing', () => {
    expect(compareCaptures({ from: null, to }).map((r) => r.verdict)).toEqual([
      'gained',
      'gained',
      'gained'
    ])
  })
})

describe('renderRepoint', () => {
  const rows = compareCaptures({
    from: { rows: [row('a', 'aaa'), row('b', 'bbb'), row('c', 'ccc')] },
    to: { rows: [row('a', 'aaa'), row('b', 'zzz')] }
  })

  const html = renderRepoint({
    side: 'frontend',
    from: { appSha: '1111111111' },
    to: { appSha: '2222222222' },
    rows,
    fromRel: '../old',
    toRel: '../new'
  })

  test('warns loudly when accepting would lose a screen', () => {
    expect(html).toContain('1 screens have no picture in the new capture')
    expect(html).toContain('Accepting this repoint loses them')
  })

  test('shows the moved screen old beside new', () => {
    expect(html).toContain('../old/page/b.png')
    expect(html).toContain('../new/page/b.png')
  })

  test('does not spend the reader on screens that did not move', () => {
    expect(html).not.toContain('page/a.png')
  })

  test('says nothing has changed yet', () => {
    expect(html).toContain('Nothing has been changed')
  })
})
