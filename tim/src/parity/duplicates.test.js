import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  contentTokens,
  noiseFor,
  titleSimilarity,
  shapeOf,
  judgePair,
  runDuplicates,
  renderDuplicates,
  STOPWORDS
} from './duplicates.js'

let root
let workarea

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-duplicates-'))
  workarea = join(root, 'workarea')
  mkdirSync(join(workarea, 'findings'), { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeFinding = (file, finding) =>
  writeFileSync(join(workarea, 'findings', file), JSON.stringify(finding))

const profile = () => ({
  sides: [
    { id: 'frontend', label: 'Frontend', paragraphLabels: ['The frontend'] },
    { id: 'prototype', label: 'Design release 1', paragraphLabels: ['DR1'] }
  ],
  paths: { workarea }
})

const noise = () => noiseFor(profile())

const shape = (file, raw) => shapeOf({ entry: { file, raw }, noise: noise() })

describe('noiseFor', () => {
  test('drops the side names every title carries by construction', () => {
    const words = noiseFor(profile())

    expect(words.has('frontend')).toBe(true)
    expect(words.has('dr1')).toBe(true)
    expect(words.has('release')).toBe(true)
  })

  test('keeps the ordinary stopwords as well', () => {
    expect([...STOPWORDS].every((word) => noiseFor(profile()).has(word))).toBe(
      true
    )
  })
})

describe('contentTokens', () => {
  test('keeps the words that say what a finding is about', () => {
    expect([
      ...contentTokens(
        'DR1 asks for a document type; the frontend infers it',
        noise()
      )
    ]).toEqual(['asks', 'document', 'type', 'infers'])
  })

  test('an empty title yields nothing rather than throwing', () => {
    expect(contentTokens(undefined, noise()).size).toBe(0)
  })
})

describe('titleSimilarity', () => {
  test('two titles about the same thing score high', () => {
    const a = contentTokens(
      'The phase banner is missing from every page',
      noise()
    )
    const b = contentTokens('Phase banner missing from every page', noise())

    expect(titleSimilarity(a, b)).toBeGreaterThan(0.6)
  })

  test('two unrelated titles score low', () => {
    const a = contentTokens('The phase banner is missing', noise())
    const b = contentTokens('Document upload caps at fifteen files', noise())

    expect(titleSimilarity(a, b)).toBe(0)
  })

  test('an empty side scores zero rather than dividing by nothing', () => {
    expect(titleSimilarity(new Set(), new Set(['banner']))).toBe(0)
  })
})

describe('judgePair', () => {
  test('a shared screen alone is not enough — a page yields a dozen findings', () => {
    const a = shape('a.json', {
      slice: 'hub',
      title: 'The hub omits the exit details row',
      screens: ['fe-hub']
    })
    const b = shape('b.json', {
      slice: 'review',
      title: 'Task list uses different status wording',
      screens: ['fe-hub']
    })

    expect(judgePair(a, b)).toBeNull()
  })

  test('a shared screen with similar wording fires', () => {
    const a = shape('a.json', {
      slice: 'hub',
      title: 'The phase banner is missing from the hub',
      screens: ['fe-hub']
    })
    const b = shape('b.json', {
      slice: 'service-wide',
      title: 'The phase banner is missing from every page',
      screens: ['fe-hub']
    })

    const result = judgePair(a, b)

    expect(result.rules).toContain('screen-and-wording')
    expect(result.crossSlice).toBe(true)
  })

  test('a shared screen and a shared control fires whatever the wording', () => {
    const a = shape('a.json', {
      slice: 'documents',
      title: 'No document type is asked for',
      screens: ['fe-documents'],
      controls: ['accompanyingDocumentType']
    })
    const b = shape('b.json', {
      slice: 'review',
      title: 'Uploads are inferred from the filename instead',
      screens: ['fe-documents'],
      controls: [{ kind: 'field', name: 'accompanyingDocumentType' }]
    })

    const result = judgePair(a, b)

    expect(result.rules).toEqual(['screen-and-control'])
    expect(result.sharedControls).toEqual(['accompanyingdocumenttype'])
  })

  test('near-identical wording fires with no screen in common at all', () => {
    const a = shape('a.json', {
      slice: 'addresses',
      title: 'Address rows show only the party name',
      screens: ['fe-addresses']
    })
    const b = shape('b.json', {
      slice: 'contact',
      title: 'Address rows show only the party name',
      screens: ['fe-contact']
    })

    expect(judgePair(a, b).rules).toContain('wording')
  })
})

describe('runDuplicates', () => {
  test('reports only cross-slice pairs by default', () => {
    writeFinding('a.json', {
      slice: 'hub',
      title: 'Phase banner missing from every page',
      screens: ['fe-hub']
    })
    writeFinding('b.json', {
      slice: 'hub',
      title: 'Phase banner missing from every screen',
      screens: ['fe-hub']
    })

    const result = runDuplicates({ profile: profile() })

    expect(result.candidates).toEqual([])
    expect(result.compared).toBe('pairs from different slices')
  })

  test('--all brings the same-slice pairs in too', () => {
    writeFinding('a.json', {
      slice: 'hub',
      title: 'Phase banner missing from every page',
      screens: ['fe-hub']
    })
    writeFinding('b.json', {
      slice: 'hub',
      title: 'Phase banner missing from every screen',
      screens: ['fe-hub']
    })

    const result = runDuplicates({ profile: profile(), all: true })

    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].crossSlice).toBe(false)
  })

  test('ranks cross-slice candidates above same-slice ones', () => {
    writeFinding('a.json', {
      slice: 'hub',
      title: 'Exit details row is inert',
      screens: ['fe-hub']
    })
    writeFinding('b.json', {
      slice: 'hub',
      title: 'Exit details row is inert on the hub',
      screens: ['fe-hub']
    })
    writeFinding('c.json', {
      slice: 'service-wide',
      title: 'Exit details row is inert',
      screens: ['fe-hub']
    })

    const result = runDuplicates({ profile: profile(), all: true })

    expect(result.candidates[0].crossSlice).toBe(true)
  })
})

describe('renderDuplicates', () => {
  test('says a clean result is not proof, because this measures sentences', () => {
    writeFinding('a.json', { slice: 'hub', title: 'One thing', screens: ['x'] })

    const text = renderDuplicates(runDuplicates({ profile: profile() }))

    expect(text).toContain('not proof there are none')
  })

  test('prints both titles so a person can judge rather than a count', () => {
    writeFinding('a.json', {
      slice: 'hub',
      title: 'Phase banner missing from every page',
      screens: ['fe-hub']
    })
    writeFinding('b.json', {
      slice: 'service-wide',
      title: 'Phase banner missing from every screen',
      screens: ['fe-hub']
    })

    const text = renderDuplicates(runDuplicates({ profile: profile() }))

    expect(text).toContain('ACROSS SLICES')
    expect(text).toContain('"Phase banner missing from every page"')
    expect(text).toContain('nothing here should be struck by a count')
  })
})
