import { describe, test, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  containsAnchor,
  interpolatedFrom,
  capturedPageReader,
  classifyAnchors
} from './anchor-check.js'

const source = (cited, file = cited) => ({ cited, file })

describe('containsAnchor', () => {
  test('finds a string wrapped across lines and indented', () => {
    expect(
      containsAnchor(
        '  hint: "Select all countries the\n    consignment will travel through"',
        'Select all countries the consignment will travel through'
      )
    ).toBe(true)
  })

  test('finds a sentence broken by a link in the middle of it', () => {
    expect(
      containsAnchor(
        '<p>You can find your CPH number on documents from the <a class="govuk-link" href="#">Animal and Plant Health Agency (APHA)</a> or by checking your holding details on GOV.UK.</p>',
        'You can find your CPH number on documents from the Animal and Plant Health Agency (APHA) or by checking your holding details on GOV.UK.'
      )
    ).toBe(true)
  })

  test('finds a doc comment the formatter wrapped behind asterisks', () => {
    expect(
      containsAnchor(
        '/** Addresses have no type in the address book (D3) — the same record\n * may be a consignor on one notification and a consignee on the next. */',
        'Addresses have no type in the address book (D3) — the same record may be a consignor on one notification and a consignee on the next.'
      )
    ).toBe(true)
  })

  test('does not find a string that is not there', () => {
    expect(containsAnchor('const total = 1', 'subtotal')).toBe(false)
  })
})

describe('interpolatedFrom', () => {
  test('names the literal run a template shares with the rendered sentence', () => {
    expect(
      interpolatedFrom(
        `maxDocuments: (max) => \`You can add a maximum of \${max} documents\``,
        'You can add a maximum of 10 documents'
      )
    ).toBe('You can add a maximum of ')
  })

  test('refuses a template that shares nothing with the anchor', () => {
    expect(
      interpolatedFrom(
        '<p>{{ section.selectedAddress.name }}</p>',
        'Green Valley Farm'
      )
    ).toBeNull()
  })

  test('refuses a source that interpolates nothing', () => {
    expect(
      interpolatedFrom(
        'const label = "You can add a maximum of 10 documents"',
        'You can add a maximum of 10 documents'
      )
    ).toBeNull()
  })
})

describe('classifyAnchors', () => {
  test('passes an anchor the cited lines hold', () => {
    const result = classifyAnchors({
      anchors: ['MAX_FILE_SIZE_MB'],
      own: source('const MAX_FILE_SIZE_MB = 20')
    })

    expect(result).toMatchObject({ ok: true, inRange: ['MAX_FILE_SIZE_MB'] })
  })

  test('calls an anchor out of range when the file holds it and the lines do not', () => {
    const result = classifyAnchors({
      anchors: ['handleSubmit'],
      own: source('const other = 1', 'const handleSubmit = () => {}')
    })

    expect(result).toMatchObject({ ok: false, outOfRange: ['handleSubmit'] })
  })

  test('finds an anchor in a sibling citation of the same finding', () => {
    const result = classifyAnchors({
      anchors: ['rowGatePasses'],
      own: source('const rows = []'),
      siblings: [{ ref: 'c2', ...source('const rowGatePasses = (row) => {}') }]
    })

    expect(result.inSibling).toEqual([{ anchor: 'rowGatePasses', ref: 'c2' }])
  })

  test('a sibling match is not a warning', () => {
    const result = classifyAnchors({
      anchors: ['rowGatePasses'],
      own: source('const rows = []'),
      siblings: [{ ref: 'c2', ...source('const rowGatePasses = (row) => {}') }]
    })

    expect(result.ok).toBe(true)
  })

  test('names a string the source builds at runtime as interpolated', () => {
    const result = classifyAnchors({
      anchors: ['You can add a maximum of 10 documents'],
      own: source(
        `maxDocuments: (max) => \`You can add a maximum of \${max} documents\``
      )
    })

    expect(result.interpolated).toEqual([
      {
        anchor: 'You can add a maximum of 10 documents',
        shared: 'You can add a maximum of '
      }
    ])
  })

  test('names a string quoted off the rendered page as rendered', () => {
    const result = classifyAnchors({
      anchors: ['Green Valley Farm'],
      own: source('<p>{{ section.selectedAddress.name }}</p>'),
      pages: ['<html><p>Green Valley Farm</p></html>']
    })

    expect(result.rendered).toEqual(['Green Valley Farm'])
  })

  test('reports an anchor nothing holds as missing', () => {
    const result = classifyAnchors({
      anchors: ['NotificationFulfilments'],
      own: source('const rows = []'),
      siblings: [{ ref: 'c2', ...source('const other = 1') }],
      pages: ['<html></html>']
    })

    expect(result).toMatchObject({
      ok: false,
      missingFromFile: ['NotificationFulfilments']
    })
  })
})

describe('capturedPageReader', () => {
  test('reads only the screens belonging to each side', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tim-pages-'))
    mkdirSync(join(dir, 'fe'))
    writeFileSync(join(dir, 'fe', 'fe-dashboard.html'), '<p>Frontend</p>')

    const read = capturedPageReader([
      { screenPrefix: 'fe-', htmlDir: join(dir, 'fe') },
      { screenPrefix: 'dr1-', htmlDir: join(dir, 'missing') }
    ])

    expect(read(['fe-dashboard', 'dr1-dashboard'])).toEqual(['<p>Frontend</p>'])

    rmSync(dir, { recursive: true, force: true })
  })
})
