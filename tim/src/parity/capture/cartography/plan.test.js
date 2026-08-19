import { describe, it, expect } from 'vitest'
import { planScreen, acceptedFile } from './plan.js'

const TODAY = new Date('2026-08-19T00:00:00Z')

const plan = (controls, over = {}) =>
  planScreen({ controls, today: TODAY, routeTemplate: '/x', ...over })

describe('acceptedFile', () => {
  it('takes the mime type from a file extension the input accepts', () => {
    expect(acceptedFile('.pdf,.png')).toEqual({
      mimeType: 'application/pdf',
      extension: 'pdf'
    })
  })

  it('defaults to a PDF when the input accepts anything', () => {
    expect(acceptedFile()).toEqual({
      mimeType: 'application/pdf',
      extension: 'pdf'
    })
  })
})

describe('planScreen radios', () => {
  const radios = [
    {
      kind: 'radios',
      name: 'importReason',
      legend: 'Why are you importing?',
      options: [
        {
          value: 'internal-market',
          label: 'Internal market',
          conditional: true
        },
        { value: 'transit', label: 'Transit' },
        { value: 'return', label: 'Returned goods' }
      ]
    }
  ]

  it('takes the first option and pushes the rest onto the frontier', () => {
    const result = plan(radios)

    expect(result.actions).toEqual([
      { kind: 'choose', name: 'importReason', value: 'internal-market' }
    ])
    expect(result.branches.map((branch) => branch.value)).toEqual([
      'transit',
      'return'
    ])
  })

  it('flags a conditional option so the reveal is mapped as its own screen', () => {
    const result = plan(radios)

    expect(result.reveals).toEqual([
      { control: 'importReason', value: 'internal-market' }
    ])
  })

  it('records the rung that chose the value', () => {
    const result = plan(radios)

    expect(result.records[0]).toMatchObject({
      name: 'importReason',
      rung: 2,
      confidence: 'high'
    })
  })
})

describe('planScreen checkboxes', () => {
  it('ticks one box and leaves the rest, including the exclusive one, on the frontier', () => {
    const result = plan([
      {
        kind: 'checkboxes',
        name: 'species',
        options: [
          { value: 'cattle', label: 'Cattle' },
          { value: 'sheep', label: 'Sheep' },
          { value: 'none', label: 'None of these', exclusive: true }
        ]
      }
    ])

    expect(result.actions).toEqual([
      { kind: 'choose', name: 'species', value: 'cattle' }
    ])
    expect(result.branches.map((branch) => branch.kind)).toEqual([
      'checkbox-option',
      'exclusive-option',
      'multiple'
    ])
  })
})

describe('planScreen select', () => {
  it('picks the first real option and skips the placeholder', () => {
    const result = plan([
      {
        kind: 'select',
        name: 'country',
        label: 'Country of origin',
        options: [
          { value: '', label: 'Choose a country' },
          { value: 'FR', label: 'France' },
          { value: 'DE', label: 'Germany' }
        ]
      }
    ])

    expect(result.actions).toEqual([
      { kind: 'select', name: 'country', value: 'FR' }
    ])
  })

  it('drives a type-ahead by the label of the option the hidden select carries', () => {
    const result = plan([
      {
        kind: 'select',
        name: 'country',
        widget: 'accessible-autocomplete',
        options: [{ value: 'FR', label: 'France' }]
      }
    ])

    expect(result.actions[0]).toMatchObject({
      kind: 'typeahead',
      value: 'FR',
      label: 'France'
    })
  })
})

describe('planScreen dates', () => {
  it('fills a three-box date one part at a time', () => {
    const result = plan([
      {
        kind: 'date',
        name: 'arrival',
        legend: 'Expected date of arrival',
        shape: 'three-inputs',
        parts: {
          day: { name: 'arrival-day' },
          month: { name: 'arrival-month' },
          year: { name: 'arrival-year' }
        }
      }
    ])

    expect(result.actions).toEqual([
      { kind: 'fill', name: 'arrival-day', value: '18' },
      { kind: 'fill', name: 'arrival-month', value: '9' },
      { kind: 'fill', name: 'arrival-year', value: '2026' }
    ])
  })

  it('shuts the picker calendar in the same step that fills it', () => {
    const result = plan([
      { kind: 'date', name: 'arrival', label: 'Arrival date', shape: 'picker' }
    ])

    expect(result.actions[0].dismissOverlay).toBe(true)
  })
})

describe('planScreen files', () => {
  it('synthesises a file of the type the input accepts', () => {
    const result = plan([
      { kind: 'file', name: 'certificate', accept: 'application/pdf' }
    ])

    expect(result.actions).toEqual([
      {
        kind: 'upload',
        name: 'certificate',
        fileName: 'cartographer.pdf',
        mimeType: 'application/pdf'
      }
    ])
  })
})

describe('planScreen honesty', () => {
  it('leaves an already-answered question alone', () => {
    const result = plan([
      {
        kind: 'radios',
        name: 'importReason',
        answered: true,
        options: [{ value: 'transit', label: 'Transit' }]
      }
    ])

    expect(result.actions).toEqual([])
  })

  it('skips a control the page is not showing', () => {
    const result = plan([
      { kind: 'text', name: 'hiddenQuestion', visible: false }
    ])

    expect(result.actions).toEqual([])
  })

  it('records a field it could not fill rather than dropping it', () => {
    const result = plan([
      {
        kind: 'select',
        name: 'country',
        options: [{ value: '', label: 'Choose a country' }]
      }
    ])

    expect(result.unfilled).toEqual([
      {
        name: 'country',
        why: 'every option this page offers is a placeholder or a negative'
      }
    ])
  })
})
