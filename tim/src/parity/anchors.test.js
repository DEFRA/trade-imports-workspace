import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadAnchors, resolveAnchor } from './capture/screens.js'
import { runAnchors, anchorKey, toAnchor } from './anchors.js'

let root
let profile

const buildProfile = (dir) => {
  const sides = ['frontend', 'prototype'].map((id) => ({
    id,
    repo: id,
    screenPrefix: id === 'frontend' ? 'fe-' : 'dr1-',
    evidenceRoot: 'evidence',
    modelDir: join(dir, 'model', id),
    htmlDir: join(dir, 'html', id)
  }))
  mkdirSync(join(dir, 'evidence'), { recursive: true })
  mkdirSync(join(dir, 'run'), { recursive: true })
  return {
    id: 'dr1',
    runId: 'EUDPA-328-DR1',
    workspaceRoot: dir,
    sides,
    sideIds: sides.map((side) => side.id),
    sideById: Object.fromEntries(sides.map((side) => [side.id, side])),
    repos: { frontend: {}, prototype: {} },
    captures: {},
    bands: [],
    paths: {
      workarea: join(dir, 'workarea'),
      backlog: join(dir, 'run', 'backlog.json')
    }
  }
}

const increment = (overrides = {}) => ({
  id: 'inc-001',
  type: 'add-field',
  milestone: null,
  domain: 'documents',
  title: 'A finding.',
  detail: 'Frozen.',
  screens: ['fe-documents', 'dr1-upload-documents'],
  controls: ['accompanyingDocumentType'],
  evidence: {},
  confidence: 'high',
  band: 'frontend-work',
  gate: null,
  dependsOn: [],
  status: 'todo',
  commit: null,
  failure_reason: null,
  ...overrides
})

const writeBacklog = (increments) =>
  writeFileSync(
    profile.paths.backlog,
    JSON.stringify({
      run_id: 'EUDPA-328-DR1',
      target: 'live-animals-frontend',
      increments
    })
  )

const sideNamed = (result, id) => result.sides.find((side) => side.side === id)

const fakeLocator = (selector, matches) => ({
  selector,
  count: async () => matches,
  filter: () => fakeLocator(selector, matches)
})

/** A page where only a name-attribute selector matches anything. */
const fakePage = () => {
  const locator = (selector) =>
    fakeLocator(selector, selector.startsWith('[name=') ? 1 : 0)
  return {
    locator,
    getByLabel: (text) => fakeLocator(`label=${text}`, 0),
    getByText: (pattern) => fakeLocator(`text=${pattern}`, 0)
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-parity-anchors-'))
  profile = buildProfile(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('anchorKey', () => {
  test('strips a field name down to its letters and digits', () => {
    expect(anchorKey({ kind: 'field', name: 'arrivalDateAtPort' })).toBe(
      'field-arrivaldateatport'
    )
  })

  test('hyphenates a label', () => {
    expect(anchorKey({ kind: 'label', text: 'Port of entry' })).toBe(
      'label-port-of-entry'
    )
  })
})

describe('toAnchor', () => {
  test('reads a single word as a field name', () => {
    expect(toAnchor('countryOfOrigin', 'inc-001')).toEqual({
      kind: 'field',
      name: 'countryOfOrigin',
      key: 'field-countryoforigin'
    })
  })

  test('reads a phrase as a visible label', () => {
    expect(toAnchor('Port of entry', 'inc-001')).toEqual({
      kind: 'label',
      text: 'Port of entry',
      key: 'label-port-of-entry'
    })
  })

  test('takes the kind as written when the author states it', () => {
    expect(toAnchor({ kind: 'field', name: 'q' }, 'inc-001')).toEqual({
      kind: 'field',
      name: 'q',
      key: 'field-q'
    })
  })

  test('names the increment when a control names nothing', () => {
    expect(() => toAnchor({ kind: 'button' }, 'inc-007')).toThrow(/inc-007/)
  })
})

describe('runAnchors', () => {
  test('writes anchors the capture stage can read back, keyed by screen', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile, write: true })

    const anchors = loadAnchors(sideNamed(result, 'frontend').path)
    expect(Object.keys(anchors)).toEqual(['fe-documents'])
    expect(anchors['fe-documents']).toEqual([
      {
        kind: 'field',
        name: 'accompanyingDocumentType',
        key: 'field-accompanyingdocumenttype',
        why: 'named by inc-001'
      }
    ])
  })

  test('writes an anchor the capture stage resolves to a locator', async () => {
    writeBacklog([increment()])
    runAnchors({ profile, write: true })

    const [anchor] = loadAnchors(
      join(root, 'evidence', 'anchors.frontend.json')
    )['fe-documents']
    const resolved = await resolveAnchor(fakePage(), anchor)

    expect(resolved.locator.selector).toContain(
      '[name="accompanyingDocumentType"]'
    )
  })

  test('files each side’s screens under that side', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile, write: true })

    expect(
      Object.keys(loadAnchors(sideNamed(result, 'prototype').path))
    ).toEqual(['dr1-upload-documents'])
  })

  test('counts and names the findings that named no control', () => {
    writeBacklog([
      increment(),
      increment({ id: 'inc-002', controls: [] }),
      increment({ id: 'inc-003', controls: [], screens: ['fe-origin'] })
    ])

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').withoutControls).toEqual([
      'inc-002',
      'inc-003'
    ])
    expect(sideNamed(result, 'prototype').withoutControls).toEqual(['inc-002'])
  })

  test('names one control once when two findings share it', () => {
    writeBacklog([increment(), increment({ id: 'inc-002' })])

    const result = runAnchors({ profile, write: true })

    const anchors = loadAnchors(sideNamed(result, 'frontend').path)
    expect(anchors['fe-documents']).toHaveLength(1)
    expect(anchors['fe-documents'][0].why).toBe('named by inc-001, inc-002')
  })

  test('keeps the same order and the same file on a second run', () => {
    writeBacklog([
      increment({ controls: ['second', 'first'] }),
      increment({ id: 'inc-002', controls: ['third'] })
    ])

    const first = runAnchors({ profile, write: true })
    const second = runAnchors({ profile, write: true })

    expect(second.sides[0].file).toEqual(first.sides[0].file)
    expect(
      loadAnchors(sideNamed(second, 'frontend').path)['fe-documents'].map(
        (anchor) => anchor.key
      )
    ).toEqual(['field-second', 'field-first', 'field-third'])
  })

  test('reports the totals per side', () => {
    writeBacklog([
      increment({ controls: ['one', 'two'] }),
      increment({ id: 'inc-002', screens: ['fe-origin'], controls: ['three'] })
    ])

    const result = runAnchors({ profile })

    expect({
      screens: sideNamed(result, 'frontend').screens,
      anchors: sideNamed(result, 'frontend').anchors
    }).toEqual({ screens: 2, anchors: 3 })
  })

  test('writes nothing without --write', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile })

    expect(existsSync(join(root, 'evidence', 'anchors.frontend.json'))).toBe(
      false
    )
    expect(result.written).toBe(false)
  })

  test('builds just the side asked for', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile, side: 'prototype', write: true })

    expect(result.sides.map((side) => side.side)).toEqual(['prototype'])
    expect(existsSync(join(root, 'evidence', 'anchors.frontend.json'))).toBe(
      false
    )
  })

  test('names the sides it has when asked for one it does not', () => {
    writeBacklog([increment()])

    expect(() => runAnchors({ profile, side: 'backend' })).toThrow(
      /frontend, prototype/
    )
  })
})

const writePage = (side, screen, body) => {
  const dir = join(root, 'html', side)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, `${screen}.html`),
    `<!DOCTYPE html><html><body><main>${body}</main></body></html>`
  )
}

const formGroup = (name, label) =>
  `<div class="govuk-form-group"><label class="govuk-label" for="${name}">${label}</label><input class="govuk-input" id="${name}" name="${name}"></div>`

const anchorsOn = (result, side, screen) =>
  sideNamed(result, side).file.screens[screen]

const bothSides = (frontend, prototype) => {
  writePage('frontend', 'fe-documents', frontend)
  writePage('prototype', 'dr1-upload-documents', prototype)
}

describe('runAnchors against the captured pages', () => {
  test('a field still resolves by its name attribute', () => {
    writeBacklog([increment({ controls: ['species'] })])
    bothSides(formGroup('species', 'Species'), formGroup('species', 'Species'))

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')).toEqual([
      {
        kind: 'field',
        name: 'species',
        key: 'field-species',
        role: 'field',
        why: 'named by inc-001'
      }
    ])
  })

  test('a compound field name resolves from its stem', () => {
    writeBacklog([increment({ controls: ['exitDate'] })])
    bothSides(
      formGroup('exitDate-day', 'Day'),
      formGroup('exitDate-day', 'Day')
    )

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0].role).toBe('field')
    expect(sideNamed(result, 'frontend').unresolved).toEqual([])
  })

  test('a control named by its label resolves against that label', () => {
    writeBacklog([increment({ controls: ['Port of entry'] })])
    bothSides(
      formGroup('portOfEntry', 'Port of entry'),
      formGroup('portOfEntry', 'Port of entry')
    )

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0]).toEqual({
      kind: 'label',
      text: 'Port of entry',
      key: 'label-port-of-entry',
      role: 'label',
      why: 'named by inc-001'
    })
  })

  test('a button resolves by the text a person reads on it', () => {
    writeBacklog([increment({ controls: ['Save and add another'] })])
    bothSides(
      '<button class="govuk-button">Save and add another</button>',
      '<button class="govuk-button">Save and add another</button>'
    )

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0]).toMatchObject({
      key: 'label-save-and-add-another',
      role: 'action'
    })
  })

  test('a heading resolves by its text', () => {
    writeBacklog([increment({ controls: ['At a glance'] })])
    bothSides(
      '<h2 class="govuk-heading-m">At a glance</h2>',
      '<h2 class="govuk-heading-m">At a glance</h2>'
    )

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0]).toMatchObject({
      key: 'label-at-a-glance',
      role: 'heading'
    })
  })

  test('a status tag resolves by its text', () => {
    writeBacklog([increment({ controls: ['Draft'] })])
    bothSides(
      '<strong class="govuk-tag govuk-tag--blue">Draft</strong>',
      '<strong class="govuk-tag govuk-tag--blue">Draft</strong>'
    )

    const result = runAnchors({ profile })

    // Written as one word, so it was read as a name attribute. The ladder
    // still finds it, because no field answers to it and a tag does.
    expect(anchorsOn(result, 'frontend', 'fe-documents')[0]).toMatchObject({
      kind: 'field',
      key: 'field-draft',
      role: 'status'
    })
  })

  test('a link wins over a paragraph that merely says the same word', () => {
    writeBacklog([increment({ controls: ['Continue'] })])
    bothSides(
      '<p class="govuk-body">Continue</p><a class="govuk-button" href="/next">Continue</a>',
      '<a class="govuk-button" href="/next">Continue</a>'
    )

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0].role).toBe('action')
  })

  test('a summary-list key resolves as a row', () => {
    writeBacklog([increment({ controls: ['Means of transport'] })])
    const row =
      '<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Means of transport</dt><dd class="govuk-summary-list__value">Road</dd></div>'
    bothSides(row, row)

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0].role).toBe('row')
  })

  test('a sentence in the body resolves on the last rung', () => {
    writeBacklog([
      increment({ controls: ['Each health certificate needs its own.'] })
    ])
    const sentence =
      '<p class="govuk-body">Each health certificate needs its own.</p>'
    bothSides(sentence, sentence)

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0].role).toBe('text')
  })

  test('a control on no side is counted and named rather than dropped', () => {
    writeBacklog([increment({ controls: ['unweanedAnimals'] })])
    bothSides(formGroup('species', 'Species'), formGroup('species', 'Species'))

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').unresolved).toEqual([
      {
        increment: 'inc-001',
        anchor: 'field-unweanedanimals',
        named: 'unweanedAnimals',
        screen: 'fe-documents'
      }
    ])
    expect(anchorsOn(result, 'frontend', 'fe-documents')).toBeUndefined()
  })

  test('an uncaptured screen keeps its anchors and says it went unchecked', () => {
    writeBacklog([increment()])
    writePage(
      'prototype',
      'dr1-upload-documents',
      formGroup('accompanyingDocumentType', 'Document type')
    )

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').uncaptured).toEqual(['fe-documents'])
    expect(anchorsOn(result, 'frontend', 'fe-documents')).toHaveLength(1)
    expect(sideNamed(result, 'frontend').unresolved).toEqual([])
  })
})

describe('runAnchors on an ambiguous name', () => {
  const sixTags = [
    '<ul class="govuk-task-list">',
    ...['a', 'b', 'c'].map(
      (id) =>
        `<li class="govuk-task-list__item"><div class="govuk-task-list__name-and-hint"><a href="/${id}">Task ${id}</a></div><div class="govuk-task-list__status"><strong class="govuk-tag">Not yet started</strong></div></li>`
    ),
    '</ul>'
  ].join('')

  // This used to crop the first of the three and carry the count out so the
  // report could say the crop was one of several. Against a real corpus that
  // produced crops of the wrong thing, so an ambiguous name now writes no
  // anchor at all and the card falls back to the whole page.
  test('writes no anchor for a name that lands in several places', () => {
    writeBacklog([increment({ controls: ['Not yet started'] })])
    bothSides(sixTags, sixTags)

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').ambiguous).toEqual([
      {
        increment: 'inc-001',
        anchor: 'label-not-yet-started',
        named: 'Not yet started',
        screen: 'fe-documents',
        role: 'status',
        places: 3,
        cropped: false
      }
    ])
    expect(anchorsOn(result, 'frontend', 'fe-documents') ?? []).toHaveLength(0)
  })

  test('a radio group is one place, not eight', () => {
    writeBacklog([increment({ controls: ['reason'] })])
    const radios =
      '<div class="govuk-form-group"><fieldset><legend>Reason</legend><div class="govuk-radios">' +
      '<input type="radio" name="reason" value="a"><input type="radio" name="reason" value="b">' +
      '</div></fieldset></div>'
    bothSides(radios, radios)

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').ambiguous).toEqual([])
    expect(anchorsOn(result, 'frontend', 'fe-documents')).toHaveLength(1)
  })

  test('refuses on the last rung, where nothing says which one was meant', () => {
    writeBacklog([increment({ controls: ['Not provided'] })])
    const twice =
      '<div class="govuk-grid-row"><p class="govuk-body">Not provided</p></div>' +
      '<div class="govuk-grid-row"><span class="govuk-body">Not provided</span></div>'
    bothSides(twice, twice)

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').ambiguous).toEqual([
      {
        increment: 'inc-001',
        anchor: 'label-not-provided',
        named: 'Not provided',
        screen: 'fe-documents',
        role: 'text',
        places: 2,
        cropped: false
      }
    ])
    expect(anchorsOn(result, 'frontend', 'fe-documents')).toBeUndefined()
  })
})

describe('runAnchors across a finding’s own screens', () => {
  test('a control on another of this finding’s screens is not called missing', () => {
    writeBacklog([
      increment({
        screens: [
          'fe-origin',
          'fe-destination-country',
          'dr1-origin-of-the-import'
        ],
        controls: ['countryOfOrigin', 'destinationCountry']
      })
    ])
    writePage('frontend', 'fe-origin', formGroup('countryOfOrigin', 'Country'))
    writePage(
      'frontend',
      'fe-destination-country',
      formGroup('destinationCountry', 'Destination')
    )
    writePage(
      'prototype',
      'dr1-origin-of-the-import',
      formGroup('countryOfOrigin', 'Country') +
        formGroup('destinationCountry', 'Destination')
    )

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').unresolved).toEqual([])
    expect(sideNamed(result, 'frontend').onOtherScreens).toEqual([
      {
        increment: 'inc-001',
        anchor: 'field-destinationcountry',
        named: 'destinationCountry',
        screen: 'fe-origin',
        cropped: 'fe-destination-country'
      },
      {
        increment: 'inc-001',
        anchor: 'field-countryoforigin',
        named: 'countryOfOrigin',
        screen: 'fe-destination-country',
        cropped: 'fe-origin'
      }
    ])
  })

  test('each screen keeps only the control it actually has', () => {
    writeBacklog([
      increment({
        screens: [
          'fe-origin',
          'fe-destination-country',
          'dr1-origin-of-the-import'
        ],
        controls: ['countryOfOrigin', 'destinationCountry']
      })
    ])
    writePage('frontend', 'fe-origin', formGroup('countryOfOrigin', 'Country'))
    writePage(
      'frontend',
      'fe-destination-country',
      formGroup('destinationCountry', 'Destination')
    )
    writePage(
      'prototype',
      'dr1-origin-of-the-import',
      formGroup('countryOfOrigin', 'Country') +
        formGroup('destinationCountry', 'Destination')
    )

    const result = runAnchors({ profile })

    expect(
      anchorsOn(result, 'frontend', 'fe-origin').map((anchor) => anchor.key)
    ).toEqual(['field-countryoforigin'])
    expect(
      anchorsOn(result, 'frontend', 'fe-destination-country').map(
        (anchor) => anchor.key
      )
    ).toEqual(['field-destinationcountry'])
  })
})

describe('runAnchors on a one-sided control', () => {
  test('a field only the other side has becomes an insertion on this one', () => {
    writeBacklog([increment()])
    bothSides(
      formGroup('species', 'Species') + formGroup('quantity', 'Quantity'),
      formGroup('species', 'Species') +
        formGroup('accompanyingDocumentType', 'Document type') +
        formGroup('quantity', 'Quantity')
    )

    const result = runAnchors({ profile })

    const [anchor] = anchorsOn(result, 'frontend', 'fe-documents')
    expect(anchor).toMatchObject({ key: 'field-species' })
    expect(anchor.insertions).toEqual([
      {
        missing: ['accompanyingDocumentType'],
        relation: 'after',
        named: 'Species',
        caption: 'This side has no Document type. It would sit after Species.'
      }
    ])
    expect({
      anchors: sideNamed(result, 'frontend').anchors,
      insertions: sideNamed(result, 'frontend').insertions
    }).toEqual({ anchors: 0, insertions: 1 })
  })

  test('a heading only the other side has is placed too', () => {
    writeBacklog([increment({ controls: ['Consignment parties'] })])
    bothSides(
      '<h2>Your commodities</h2><h2>Movement</h2>',
      '<h2>Your commodities</h2><h2>Consignment parties</h2><h2>Movement</h2>'
    )

    const result = runAnchors({ profile })

    const [anchor] = anchorsOn(result, 'frontend', 'fe-documents')
    expect(anchor.insertions[0]).toMatchObject({
      relation: 'after',
      named: 'Your commodities',
      caption:
        'This side has no Consignment parties. It would sit after Your commodities.'
    })
  })

  test('the caption stays honest where the two pages share nothing', () => {
    writeBacklog([increment({ controls: ['cphNumber-county'] })])
    bothSides(
      formGroup('countyParishHoldingCph', 'CPH'),
      formGroup('cphNumber-county', 'County') +
        formGroup('cphNumber-parish', 'Parish')
    )

    const result = runAnchors({ profile })

    const [anchor] = anchorsOn(result, 'frontend', 'fe-documents')
    expect(anchor.key).toBe('field-countyparishholdingcph')
    expect(anchor.insertions[0].caption).toContain(
      'rather than where the missing one would go'
    )
    expect(anchor.insertions[0].caption).not.toContain('would sit')
  })

  test('a landmark that is itself a finding keeps its own reason', () => {
    writeBacklog([
      increment(),
      increment({ id: 'inc-002', controls: ['species'] })
    ])
    bothSides(
      formGroup('species', 'Species'),
      formGroup('species', 'Species') +
        formGroup('accompanyingDocumentType', 'Document type')
    )

    const result = runAnchors({ profile })

    const [anchor] = anchorsOn(result, 'frontend', 'fe-documents')
    expect(anchor.why).toBe('named by inc-002')
    expect(anchor.insertions[0].caption).toContain('no Document type')
  })
})
