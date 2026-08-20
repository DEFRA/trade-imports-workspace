import { describe, test, expect } from 'vitest'
import { parseDocument } from './dom.js'
import {
  MIN_PREFIX_LENGTH,
  RESOLUTION_ORDER,
  cropContainerOf,
  landmarkFor,
  landmarksIn,
  matchStrength,
  resolveOnPage,
  selectorFor,
  textPattern
} from './resolution.js'

const page = (body) =>
  parseDocument(`<!DOCTYPE html><html><body><main>${body}</main></body></html>`)

const resolve = (body, control) => {
  const anchor = /\s/.test(control)
    ? { kind: 'label', text: control }
    : { kind: 'field', name: control }
  return resolveOnPage({ doc: page(body), anchor })
}

const formGroup = (name, label) =>
  `<div class="govuk-form-group"><label for="${name}">${label}</label><input id="${name}" name="${name}"></div>`

describe('RESOLUTION_ORDER', () => {
  test('runs from the most specific rung to the least', () => {
    expect(RESOLUTION_ORDER.map((rung) => rung.role)).toEqual([
      'field',
      'label',
      'action',
      'heading',
      'row',
      'status',
      'text'
    ])
  })

  test('the two rungs that are not about an element type carry no selector', () => {
    expect([selectorFor('field'), selectorFor('label')]).toEqual([null, null])
  })
})

describe('matchStrength', () => {
  test.each([
    ['Continue', 'Continue', 'exact'],
    ['  Continue  ', 'continue', 'exact'],
    ['Change exit details', 'Change', 'prefix'],
    ['Your file must be: a CSV', 'Your file must be:', 'prefix'],
    ['Changes', 'Change', null],
    ['Save and continue', 'continue', null],
    ['CPH number', 'CPH', null]
  ])('%s against %s', (found, wanted, expected) => {
    expect(matchStrength(found, wanted)).toBe(expected)
  })

  test('a name too short to prefix-match still matches exactly', () => {
    expect('CPH'.length).toBeLessThan(MIN_PREFIX_LENGTH)
    expect(matchStrength('CPH', 'CPH')).toBe('exact')
  })
})

describe('textPattern', () => {
  test('an exact pattern will not match a longer string', () => {
    expect(textPattern('Change', { exact: true }).test('Change details')).toBe(
      false
    )
    expect(textPattern('Change', { exact: true }).test('  Change  ')).toBe(true)
  })

  test('a prefix pattern needs a word break', () => {
    expect(textPattern('Change').test('Change details')).toBe(true)
    expect(textPattern('Change').test('Changes')).toBe(false)
  })

  test('relaxes whitespace, because the DOM keeps its indentation', () => {
    expect(
      textPattern('Save and add another', { exact: true }).test(
        '\n  Save and\n  add another\n'
      )
    ).toBe(true)
  })
})

describe('resolveOnPage', () => {
  test('a field is found by its name attribute', () => {
    expect(
      resolve(formGroup('portOfExit', 'Port of exit'), 'portOfExit')
    ).toMatchObject({
      role: 'field',
      places: 1
    })
  })

  test('a field is found by the compound names built from it', () => {
    expect(resolve(formGroup('exitDate-day', 'Day'), 'exitDate').role).toBe(
      'field'
    )
  })

  test('a control is found by its label', () => {
    expect(
      resolve(formGroup('portOfExit', 'Port of exit'), 'Port of exit').role
    ).toBe('label')
  })

  test('a button is found by the text on it', () => {
    expect(
      resolve(
        '<button class="govuk-button">Save and add another</button>',
        'Save and add another'
      ).role
    ).toBe('action')
  })

  test('a submit input is found by its value', () => {
    expect(
      resolve('<input type="submit" value="Continue">', 'Continue').role
    ).toBe('action')
  })

  test('a heading is found by its text', () => {
    expect(resolve('<h2>At a glance</h2>', 'At a glance').role).toBe('heading')
  })

  test('a summary-list key is found as a row', () => {
    expect(
      resolve(
        '<dt class="govuk-summary-list__key">Arrival at destination</dt>',
        'Arrival at destination'
      ).role
    ).toBe('row')
  })

  test('a tag is found as a status', () => {
    expect(
      resolve(
        '<strong class="govuk-tag">Cannot start yet</strong>',
        'Cannot start yet'
      ).role
    ).toBe('status')
  })

  test('a sentence in the body is found on the last rung', () => {
    expect(
      resolve('<p>Your file must be:</p>', 'Your file must be:').role
    ).toBe('text')
  })

  test('the button beats the paragraph that happens to say the same word', () => {
    const found = resolve(
      '<p>Select continue when you are ready.</p><button>Continue</button>',
      'Continue'
    )
    expect(found.role).toBe('action')
    expect(found.node.tag).toBe('button')
  })

  test('an exact match beats a longer one on the same rung', () => {
    const found = resolve(
      '<a href="/a">Change number of animals</a><a href="/b">Change</a>',
      'Change'
    )
    expect(found.node.attrs.href).toBe('/b')
  })

  test('skips the submit trap a form hides for the Enter key', () => {
    const found = resolve(
      '<button class="govuk-visually-hidden" aria-hidden="true">Save and finish</button>' +
        '<button class="govuk-button" id="real">Save and finish</button>',
      'Save and finish'
    )

    expect(found.node.attrs.id).toBe('real')
    expect(found.places).toBe(1)
  })

  test('skips a field a form hides from readers', () => {
    expect(
      resolve(
        '<div aria-hidden="true">' +
          formGroup('portOfExit', 'Port of exit') +
          '</div>',
        'portOfExit'
      )
    ).toBeNull()
  })

  test('a name attribute is never matched against a phrase', () => {
    expect(
      resolve('<input name="Save and finish">', 'Save and finish')
    ).toBeNull()
  })

  test('answers nothing when the page does not have it', () => {
    expect(resolve('<h2>Something else</h2>', 'At a glance')).toBeNull()
  })
})

describe('resolveOnPage on a repeated name', () => {
  const threeRows = ['a', 'b', 'c']
    .map(
      (id) =>
        `<li class="govuk-task-list__item"><a href="/${id}">Task ${id}</a><strong class="govuk-tag">Optional</strong></li>`
    )
    .join('')

  test('counts places rather than elements, and crops the first', () => {
    const found = resolve(threeRows, 'Optional')

    expect(found).toMatchObject({ role: 'status', places: 3, refused: false })
    expect(cropContainerOf(found.node).attrs.class).toContain(
      'govuk-task-list__item'
    )
  })

  test('a radio group is one place, however many inputs it holds', () => {
    const found = resolve(
      '<div class="govuk-form-group"><fieldset><legend>Reason</legend><input type="radio" name="reason" value="a"><input type="radio" name="reason" value="b"></fieldset></div>',
      'reason'
    )

    expect(found.places).toBe(1)
  })

  test('the last rung refuses rather than guessing', () => {
    const found = resolve(
      '<div class="govuk-inset-text"><p>Not applicable</p></div><div class="govuk-details"><p>Not applicable</p></div>',
      'Not applicable'
    )

    expect(found).toEqual({ role: 'text', places: 2, refused: true })
  })

  test('the last rung keeps the smallest element that says it', () => {
    const found = resolve('<div><p><span>Alpha</span></p></div>', 'Alpha')

    expect(found.node.tag).toBe('span')
  })
})

describe('landmarksIn', () => {
  test('reads fields, headings, links and tags in document order', () => {
    const doc = page(
      '<h2>Your commodities</h2>' +
        formGroup('species', 'Species') +
        '<a href="/x">View details</a><strong class="govuk-tag">Draft</strong>'
    )

    expect(landmarksIn(doc).map((entry) => entry.key)).toEqual([
      'heading:your commodities',
      'field:species',
      'action:view details',
      'status:draft'
    ])
  })

  test('leaves out the chrome every page of both applications carries', () => {
    const doc = parseDocument(
      '<!DOCTYPE html><html><body>' +
        '<a class="govuk-skip-link" href="#main-content">Skip to main content</a>' +
        '<header><a href="/">Import notification service</a></header>' +
        '<main><h1>Overview</h1></main>' +
        '<footer><a href="/help">Help</a></footer>' +
        '</body></html>'
    )

    expect(landmarksIn(doc).map((entry) => entry.key)).toEqual([
      'heading:overview'
    ])
  })

  test('leaves out a masked value, which is on no live page', () => {
    const doc = page(
      '<h2>Overview</h2><strong class="govuk-tag">GBN-XX-00-REFERENCE</strong>'
    )

    expect(landmarksIn(doc).map((entry) => entry.key)).toEqual([
      'heading:overview'
    ])
  })

  test('leaves out the machinery and the prose', () => {
    const doc = page(
      '<input type="hidden" name="crumb"><p>' +
        'A separate notification is required for each health certificate, and consignments that do not require one must still be notified.' +
        '</p>'
    )

    expect(landmarksIn(doc)).toEqual([])
  })
})

describe('landmarkFor', () => {
  test('a resolved field is named by its label', () => {
    const doc = page(formGroup('portOfExit', 'Port of exit'))
    const found = resolveOnPage({
      doc,
      anchor: { kind: 'field', name: 'portOfExit' }
    })

    expect(landmarkFor({ doc, found })).toEqual({
      key: 'field:portOfExit',
      anchor: { kind: 'field', name: 'portOfExit', role: 'field' },
      label: 'Port of exit'
    })
  })

  test('a resolved heading is a landmark too', () => {
    const doc = page('<h2>At a glance</h2>')
    const found = resolveOnPage({
      doc,
      anchor: { kind: 'label', text: 'At a glance' }
    })

    expect(landmarkFor({ doc, found })).toEqual({
      key: 'heading:at a glance',
      anchor: { kind: 'label', text: 'At a glance', role: 'heading' },
      label: 'At a glance'
    })
  })

  test('a refusal is not a landmark', () => {
    expect(
      landmarkFor({ doc: page(''), found: { role: 'text', refused: true } })
    ).toBeNull()
  })
})
