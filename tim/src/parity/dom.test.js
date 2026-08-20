import { describe, test, expect } from 'vitest'
import {
  accessibleTextOf,
  classesOf,
  closestMatching,
  decodeEntities,
  elementsOf,
  findTagEnd,
  formControlsIn,
  labelIndex,
  matchesSelector,
  normaliseText,
  parseDocument,
  parseHtml,
  textOf
} from './dom.js'

const first = (html, tag) =>
  elementsOf(parseHtml(html)).find((node) => node.tag === tag)

describe('parseHtml', () => {
  test('builds a tree a browser would recognise', () => {
    const root = parseHtml('<div class="a"><p>Hello <b>there</b></p></div>')

    expect(elementsOf(root).map((node) => node.tag)).toEqual(['div', 'p', 'b'])
    expect(textOf(root)).toBe('Hello there')
  })

  test('leaves a void element childless', () => {
    const root = parseHtml('<p><input name="q"><span>after</span></p>')

    expect(
      first('<p><input name="q"><span>after</span></p>', 'input').children
    ).toEqual([])
    expect(elementsOf(root).map((node) => node.tag)).toEqual([
      'p',
      'input',
      'span'
    ])
  })

  test('never reads a script as markup', () => {
    const root = parseHtml(
      '<body><script>if (1 < 2) { go("<b>") }</script><p>Real</p></body>'
    )

    expect(elementsOf(root).map((node) => node.tag)).toEqual([
      'body',
      'script',
      'p'
    ])
    expect(textOf(root)).toBe('Real')
  })

  test('a doctype and a comment are not elements', () => {
    const root = parseHtml('<!DOCTYPE html><!-- note --><p>Body</p>')

    expect(elementsOf(root).map((node) => node.tag)).toEqual(['p'])
  })

  test('an attribute value holding a bracket does not split the tag', () => {
    const root = parseHtml('<meta content="a > b"><p>After</p>')

    expect(elementsOf(root).map((node) => node.tag)).toEqual(['meta', 'p'])
    expect(textOf(root)).toBe('After')
  })

  test('reads attributes quoted, single-quoted and bare', () => {
    const node = first('<input type=checkbox name="q" id=\'x\'>', 'input')

    expect(node.attrs).toEqual({ type: 'checkbox', name: 'q', id: 'x' })
  })
})

describe('findTagEnd', () => {
  test('skips a bracket inside a quoted value', () => {
    const html = '<meta content="a > b">rest'
    expect(findTagEnd(html, 0)).toBe(html.indexOf('>rest'))
  })
})

describe('decodeEntities', () => {
  test('turns entities back into what a person reads', () => {
    expect(decodeEntities('Fish &amp; chips &#8212; &pound;5')).toBe(
      'Fish & chips — £5'
    )
  })
})

describe('normaliseText', () => {
  test('collapses the indentation a browser never shows', () => {
    expect(normaliseText('  Save and\n   add another  ')).toBe(
      'Save and add another'
    )
  })
})

describe('textOf', () => {
  test('leaves out the text nobody sees', () => {
    const root = parseHtml(
      '<div><style>.a{}</style>Visible<script>x</script></div>'
    )
    expect(textOf(root)).toBe('Visible')
  })
})

describe('accessibleTextOf', () => {
  test('an aria-label wins over the text inside', () => {
    const node = first('<a href="/x" aria-label="Next page">Next</a>', 'a')
    expect(accessibleTextOf(node)).toBe('Next page')
  })

  test('a submit button is named by its value', () => {
    const node = first('<input type="submit" value="Continue">', 'input')
    expect(accessibleTextOf(node)).toBe('Continue')
  })
})

describe('matchesSelector', () => {
  const node = first(
    '<a href="/x" class="govuk-link app-link" id="go" role="button">Go</a>',
    'a'
  )

  test.each([
    ['a', true],
    ['*', true],
    ['.govuk-link', true],
    ['#go', true],
    ['[href]', true],
    ['[role="button"]', true],
    ['a[href]', true],
    ['button, [role="button"]', true],
    ['[name^="cph"]', false],
    ['button', false],
    ['.govuk-tag', false]
  ])('%s', (selector, expected) => {
    expect(matchesSelector(node, selector)).toBe(expected)
  })
})

describe('closestMatching', () => {
  test('walks up to the nearest matching ancestor', () => {
    const root = parseHtml(
      '<div class="govuk-form-group"><label>A</label><input name="a"></div>'
    )
    const input = elementsOf(root).find((node) => node.tag === 'input')

    expect(closestMatching(input, '.govuk-form-group').tag).toBe('div')
    expect(closestMatching(input, 'fieldset')).toBeNull()
  })
})

describe('formControlsIn', () => {
  test('leaves out the machinery a person never sees', () => {
    const doc = parseDocument(
      '<form><input type="hidden" name="crumb"><input name="q"><select name="s"></select></form>'
    )

    expect(formControlsIn(doc.elements).map((node) => node.attrs.name)).toEqual(
      ['q', 's']
    )
  })
})

describe('labelIndex', () => {
  test('binds a label to the control it names, by for and by nesting', () => {
    const doc = parseDocument(
      '<label for="a">Port of exit</label><input id="a" name="portOfExit">' +
        '<label>Exit date<input name="exitDate"></label>'
    )
    const labels = labelIndex(doc.elements)
    const named = (name) =>
      labels.get(doc.elements.find((node) => node.attrs.name === name))

    expect(named('portOfExit')).toEqual(['Port of exit'])
    expect(named('exitDate')).toEqual(['Exit date'])
  })

  test('a legend names every control in its fieldset', () => {
    const doc = parseDocument(
      '<fieldset><legend>Main reason for importing</legend>' +
        '<input type="radio" name="reason" value="a">' +
        '<input type="radio" name="reason" value="b"></fieldset>'
    )
    const labels = labelIndex(doc.elements)
    const radios = doc.elements.filter((node) => node.tag === 'input')

    expect(radios.map((node) => labels.get(node))).toEqual([
      ['Main reason for importing'],
      ['Main reason for importing']
    ])
  })
})

describe('classesOf', () => {
  test('reads the class attribute as a list', () => {
    const node = first(
      '<strong class="govuk-tag govuk-tag--blue">Draft</strong>',
      'strong'
    )
    expect(classesOf(node)).toEqual(['govuk-tag', 'govuk-tag--blue'])
  })
})
