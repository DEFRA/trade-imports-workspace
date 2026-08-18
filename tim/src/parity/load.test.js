import { describe, test, expect } from 'vitest'
import { splitSentinels, buildSections } from './load.js'

describe('splitSentinels', () => {
  test('returns the whole text as body when no sentinel is present', () => {
    expect(splitSentinels('Just the finding.')).toEqual({
      body: 'Just the finding.',
      correction: null,
      falsifiedBy: null
    })
  })

  test('splits a falsifier off the end', () => {
    const detail = 'The body.\n\nFALSIFIED BY: A prior decision to omit it.'
    expect(splitSentinels(detail)).toEqual({
      body: 'The body.',
      correction: null,
      falsifiedBy: 'A prior decision to omit it.'
    })
  })

  test('splits both a correction and a falsifier in the usual order', () => {
    const detail = [
      'The body.',
      '',
      'CORRECTED DURING VERIFICATION: Sharpen the claim.',
      '',
      'FALSIFIED BY: If the copy is signed off.'
    ].join('\n')
    expect(splitSentinels(detail)).toEqual({
      body: 'The body.',
      correction: 'Sharpen the claim.',
      falsifiedBy: 'If the copy is signed off.'
    })
  })

  test('handles the two sentinels in the other order', () => {
    const detail = [
      'The body.',
      '',
      'FALSIFIED BY: If the copy is signed off.',
      '',
      'CORRECTED DURING VERIFICATION: Sharpen the claim.'
    ].join('\n')
    expect(splitSentinels(detail)).toEqual({
      body: 'The body.',
      correction: 'Sharpen the claim.',
      falsifiedBy: 'If the copy is signed off.'
    })
  })

  test('treats a missing detail as empty rather than throwing', () => {
    expect(splitSentinels(undefined).body).toBe('')
  })
})

describe('buildSections', () => {
  const detail = [
    'The body.',
    '',
    'CORRECTED DURING VERIFICATION: Sharpen it.',
    '',
    'FALSIFIED BY: A prior decision.'
  ].join('\n')

  test('renders the unmigrated body in its own slot, not as a fake column split', () => {
    const sections = buildSections({ detail }, null)
    expect(sections.body.text).toBe('The body.')
    expect(sections.frontend).toBeNull()
    expect(sections.prototype).toBeNull()
  })

  test('labels sentinel-split text as such so the page can say where it came from', () => {
    const sections = buildSections({ detail }, null)
    expect(sections.falsifiedBy).toEqual({
      text: 'A prior decision.',
      source: 'sentinel-split'
    })
  })

  test('renders the upstream verification prose, which the old page never did', () => {
    const sections = buildSections(
      { detail },
      { verification: 'Confirmed on both sides.' }
    )
    expect(sections.verification).toEqual({
      text: 'Confirmed on both sides.',
      source: 'upstream'
    })
  })

  test('a migrated finding wins over both the split and the upstream field', () => {
    const sections = buildSections(
      {
        detail,
        finding: {
          frontend: 'The frontend does X [[c1]].',
          prototype: 'The prototype does Y [[c2]].',
          falsifiedBy: 'The rewritten falsifier.'
        }
      },
      { falsifiedBy: 'The upstream falsifier.' }
    )
    expect(sections.frontend.source).toBe('finding')
    expect(sections.falsifiedBy.text).toBe('The rewritten falsifier.')
    expect(sections.body).toBeNull()
  })

  test('falls back to the upstream correction when the detail carries no sentinel', () => {
    const sections = buildSections(
      { detail: 'Body only.' },
      { correction: 'From upstream.' }
    )
    expect(sections.correction).toEqual({
      text: 'From upstream.',
      source: 'upstream'
    })
  })

  test('leaves a slot null rather than rendering an empty label', () => {
    expect(buildSections({ detail: 'Body only.' }, null).correction).toBeNull()
  })
})
