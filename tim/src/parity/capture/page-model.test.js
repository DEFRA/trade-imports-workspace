import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { EXTRACTOR, capturePageModel, stable } from './page-model.js'
import { parsePageModel } from '../page-model-schema.js'
import { el, installDocument } from '../../test-support/mini-dom.js'

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-capture-model-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const model = {
  url: '/notifications/9f1c2b30-4a5e-11ef-9c2d-0242ac120002/tasks',
  title: 'Tasks',
  h1: 'Your notification',
  headings: [{ level: 'h1', text: 'Your notification' }],
  allFields: [{ kind: 'input:text', name: 'reference' }],
  summaryRows: [
    {
      key: 'Reference',
      value: 'GBN-GB-26-A1B2C3',
      source: 'govuk-summary-list'
    }
  ],
  taskItems: [{ title: 'Origin', href: '/origin', status: 'Completed' }],
  links: [{ text: 'Origin', href: '/origin' }]
}

describe('stable', () => {
  test('replaces the generated notification reference', () => {
    expect(stable(model)).toContain('GBN-XX-00-REFERENCE')
    expect(stable(model)).not.toContain('GBN-GB-26-A1B2C3')
  })

  test('replaces every UUID, wherever it appears', () => {
    expect(stable(model)).toContain('/notifications/UUID/tasks')
  })

  test('gives two runs of the same page identical text', () => {
    const second = JSON.parse(
      JSON.stringify(model).replace(
        '9f1c2b30-4a5e-11ef-9c2d-0242ac120002',
        '00000000-1111-2222-3333-444444444444'
      )
    )
    expect(stable(second)).toBe(stable(model))
  })

  test('leaves everything else exactly as it was', () => {
    expect(JSON.parse(stable(model)).h1).toBe('Your notification')
  })
})

describe('capturePageModel', () => {
  // The page is the browser boundary, so the test drives it through a stand-in
  // that returns what the extractor would have returned.
  const page = { evaluate: async (fn) => (fn === EXTRACTOR ? model : null) }

  test('writes the normalised model under the screen id', async () => {
    const result = await capturePageModel(page, 'fe-hub', dir)
    expect(result.file).toBe(join(dir, 'fe-hub.json'))
    expect(readFileSync(result.file, 'utf8')).toBe(`${stable(model)}\n`)
  })

  test('creates the model directory when nothing has written there yet', async () => {
    const nested = join(dir, 'deep', 'model')
    const result = await capturePageModel(page, 'fe-hub', nested)
    expect(readFileSync(result.file, 'utf8')).toContain('Your notification')
  })

  test('reports the counts the manifest row carries', async () => {
    const result = await capturePageModel(page, 'fe-hub', dir)
    expect(result).toMatchObject({ fields: 1, headings: 1 })
  })

  test('writes a model the shared schema accepts', async () => {
    const { file } = await capturePageModel(page, 'fe-hub', dir)
    expect(() =>
      parsePageModel(JSON.parse(readFileSync(file, 'utf8')), 'frontend/fe-hub')
    ).not.toThrow()
  })
})

describe('EXTRACTOR', () => {
  test('closes over nothing, so Playwright can serialise it into the page', () => {
    expect(String(EXTRACTOR)).not.toMatch(/\brequire\(|\bimport\b/)
  })
})

describe('EXTRACTOR hints', () => {
  let uninstall

  afterEach(() => uninstall?.())

  const extract = (main) => {
    uninstall = installDocument(main, { title: 'Test page' })
    return EXTRACTOR()
  }

  const radioItem = (id, name, value, label, attrs = {}) =>
    el('div', { class: 'govuk-radios__item' }, [
      el('input', {
        class: 'govuk-radios__input',
        id,
        name,
        type: 'radio',
        value,
        ...attrs
      }),
      el('label', { class: 'govuk-label govuk-radios__label', for: id }, [
        label
      ])
    ])

  test('reads a radio group hint from inside the fieldset that describes it', () => {
    const model = extract(
      el('main', {}, [
        el('div', { class: 'govuk-form-group' }, [
          el(
            'fieldset',
            {
              class: 'govuk-fieldset',
              'aria-describedby': 'animalsCertifiedFor-hint'
            },
            [
              el('legend', { class: 'govuk-fieldset__legend' }, [
                'What are the animals certified for?'
              ]),
              el(
                'div',
                { id: 'animalsCertifiedFor-hint', class: 'govuk-hint' },
                ["You'll find this on the health certificate."]
              ),
              el('div', { class: 'govuk-radios' }, [
                radioItem(
                  'animalsCertifiedFor',
                  'animalsCertifiedFor',
                  'further-keeping',
                  'Further keeping'
                ),
                radioItem(
                  'animalsCertifiedFor-2',
                  'animalsCertifiedFor',
                  'slaughter',
                  'Slaughter'
                )
              ])
            ]
          )
        ])
      ])
    )

    expect(model.allFields[0]).toMatchObject({
      kind: 'radios',
      name: 'animalsCertifiedFor',
      legend: 'What are the animals certified for?',
      hint: "You'll find this on the health certificate."
    })
  })

  test('leaves the options of a described group without a hint of their own', () => {
    const model = extract(
      el('main', {}, [
        el('div', { class: 'govuk-form-group' }, [
          el(
            'fieldset',
            {
              class: 'govuk-fieldset',
              'aria-describedby': 'containsUnweanedAnimals-hint'
            },
            [
              el(
                'div',
                { id: 'containsUnweanedAnimals-hint', class: 'govuk-hint' },
                ['These are animals that are still feeding from their mother.']
              ),
              el('div', { class: 'govuk-radios' }, [
                radioItem(
                  'containsUnweanedAnimals',
                  'containsUnweanedAnimals',
                  'yes',
                  'Yes'
                ),
                radioItem(
                  'containsUnweanedAnimals-2',
                  'containsUnweanedAnimals',
                  'no',
                  'No'
                )
              ])
            ]
          )
        ])
      ])
    )

    expect(model.allFields[0].hint).toBe(
      'These are animals that are still feeding from their mother.'
    )
    expect(model.allFields[0].options.map((option) => option.hint)).toEqual([
      null,
      null
    ])
  })

  test('keeps each option its own hint alongside the group hint', () => {
    const model = extract(
      el('main', {}, [
        el('div', { class: 'govuk-form-group' }, [
          el(
            'fieldset',
            {
              class: 'govuk-fieldset',
              'aria-describedby': 'contactAddress-hint'
            },
            [
              el('div', { id: 'contactAddress-hint', class: 'govuk-hint' }, [
                'Choose the address to contact about this notification.'
              ]),
              el('div', { class: 'govuk-radios' }, [
                radioItem(
                  'contactAddress',
                  'contactAddress',
                  'astra-rosales',
                  'Astra Rosales',
                  { 'aria-describedby': 'contactAddress-item-hint' }
                ),
                el(
                  'div',
                  { id: 'contactAddress-item-hint', class: 'govuk-hint' },
                  ['43 East Hague Extension, Bern, 30055, Switzerland']
                ),
                radioItem(
                  'contactAddress-2',
                  'contactAddress',
                  'tech-imports-ltd',
                  'Tech Imports Ltd',
                  { 'aria-describedby': 'contactAddress-2-item-hint' }
                ),
                el(
                  'div',
                  { id: 'contactAddress-2-item-hint', class: 'govuk-hint' },
                  ['18 Dockside Road, London, E14 9GE, United Kingdom']
                )
              ])
            ]
          )
        ])
      ])
    )

    expect(model.allFields[0].hint).toBe(
      'Choose the address to contact about this notification.'
    )
    expect(model.allFields[0].options.map((option) => option.hint)).toEqual([
      '43 East Hague Extension, Bern, 30055, Switzerland',
      '18 Dockside Road, London, E14 9GE, United Kingdom'
    ])
  })

  test('reads a date input hint from the fieldset that describes the three boxes', () => {
    const dateBox = (id, label) =>
      el('div', { class: 'govuk-date-input__item' }, [
        el('label', { class: 'govuk-label', for: id }, [label]),
        el('input', { class: 'govuk-input', id, name: id, type: 'text' })
      ])

    const model = extract(
      el('main', {}, [
        el('div', { class: 'govuk-form-group' }, [
          el(
            'fieldset',
            {
              class: 'govuk-fieldset',
              role: 'group',
              'aria-describedby': 'cph-number-hint'
            },
            [
              el('div', { id: 'cph-number-hint', class: 'govuk-hint' }, [
                'For example, 12/345/6789.'
              ]),
              el('div', { class: 'govuk-date-input' }, [
                dateBox('cph-county', 'County'),
                dateBox('cph-parish', 'Parish'),
                dateBox('cph-holding', 'Holding')
              ])
            ]
          )
        ])
      ])
    )

    expect(model.allFields.map((field) => field.hint)).toEqual([
      'For example, 12/345/6789.',
      'For example, 12/345/6789.',
      'For example, 12/345/6789.'
    ])
  })

  test('does not lend one control its neighbour hint inside a shared form group', () => {
    const checkboxItem = (id, value, label) =>
      el('div', { class: 'govuk-checkboxes__item' }, [
        el('input', {
          class: 'govuk-checkboxes__input',
          id,
          name: 'commodity-selection',
          type: 'checkbox',
          value
        }),
        el('label', { class: 'govuk-label', for: id }, [label])
      ])

    const model = extract(
      el('main', {}, [
        el('div', { class: 'govuk-form-group' }, [
          el('label', { class: 'govuk-label', for: 'commodity-search' }, [
            'Search for what you are importing'
          ]),
          el('div', { id: 'commodity-search-hint', class: 'govuk-hint' }, [
            'You can search by common name, commodity code, or Latin name.'
          ]),
          el('input', {
            id: 'commodity-search',
            name: 'commoditySearch',
            type: 'search',
            'aria-describedby': 'commodity-search-hint'
          }),
          el('div', { class: 'govuk-checkboxes' }, [
            checkboxItem('cattle', 'species:cattle', 'Cattle (Bos spp)'),
            checkboxItem('bison', 'species:bison', 'Bison (Bison spp)')
          ])
        ])
      ])
    )

    const [search, commodities] = model.allFields
    expect(search.hint).toBe(
      'You can search by common name, commodity code, or Latin name.'
    )
    expect(commodities.hint).toBeNull()
    expect(commodities.options.map((option) => option.hint)).toEqual([
      null,
      null
    ])
  })

  test('still reads a hint that is a plain child of the form group', () => {
    const model = extract(
      el('main', {}, [
        el('div', { class: 'govuk-form-group' }, [
          el('label', { class: 'govuk-label', for: 'packageCount' }, [
            'Number of packages'
          ]),
          el('div', { class: 'govuk-hint' }, ['For example, 1, 25 or 5000.']),
          el('input', {
            id: 'packageCount',
            name: 'packageCount',
            type: 'text'
          })
        ])
      ])
    )

    expect(model.allFields[0]).toMatchObject({
      kind: 'input:text',
      name: 'packageCount',
      label: 'Number of packages',
      hint: 'For example, 1, 25 or 5000.'
    })
  })

  test('reads a select hint from the id the select points at', () => {
    const model = extract(
      el('main', {}, [
        el('div', { class: 'govuk-form-group' }, [
          el('label', { class: 'govuk-label', for: 'countryCode' }, [
            'Country of origin'
          ]),
          el('div', { id: 'countryCode-hint', class: 'govuk-hint' }, [
            'Start typing to search by country name.'
          ]),
          el(
            'select',
            {
              class: 'govuk-select',
              id: 'countryCode',
              name: 'countryCode',
              'aria-describedby': 'countryCode-hint'
            },
            [el('option', { value: 'DE' }, ['Germany'])]
          )
        ])
      ])
    )

    expect(model.allFields[0]).toMatchObject({
      kind: 'select',
      name: 'countryCode',
      hint: 'Start typing to search by country name.'
    })
  })
})
