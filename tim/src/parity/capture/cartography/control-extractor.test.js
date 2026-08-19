import { describe, test, expect, afterEach } from 'vitest'
import { CONTROL_EXTRACTOR } from './control-extractor.js'
import { el, installDocument } from '../../../test-support/mini-dom.js'

let takeDown = null

afterEach(() => {
  if (takeDown) takeDown()
  takeDown = null
})

const read = (main) => {
  takeDown = installDocument(main)
  return CONTROL_EXTRACTOR()
}

const visible = (controls) =>
  controls.filter((control) => control.kind !== 'hidden')

describe('CONTROL_EXTRACTOR', () => {
  test('closes over nothing, so Playwright can serialise it into the page', () => {
    expect(String(CONTROL_EXTRACTOR)).not.toMatch(/\brequire\(|\bimport\b/)
  })

  test('a form called "search" is a layout choice, not a type-ahead', () => {
    const controls = read(
      el('main', {}, [
        el('form', { class: 'search-form' }, [
          el('input', { type: 'hidden', name: '_csrf', value: 'abc' }),
          el('label', { for: 'reference' }, ['Reference']),
          el('input', { id: 'reference', name: 'reference' }),
          el('label', { for: 'holding' }, ['Holding']),
          el('input', { id: 'holding', name: 'holding' })
        ])
      ])
    )

    expect(visible(controls).map((control) => control.kind)).toEqual([
      'text',
      'text'
    ])
  })

  test('reads a real accessible-autocomplete as a type-ahead', () => {
    const controls = read(
      el('main', {}, [
        el('form', { class: 'search-form' }, [
          el('div', { class: 'autocomplete__wrapper' }, [
            el('input', { type: 'hidden', name: '_csrf', value: 'abc' }),
            el('input', { type: 'hidden', name: 'countryCode' }),
            el('label', { for: 'country' }, ['Country of origin']),
            el('input', {
              id: 'country',
              name: 'country',
              role: 'combobox',
              'aria-autocomplete': 'list'
            }),
            el('ul', { class: 'autocomplete__menu' }, [
              el('li', { class: 'autocomplete__option', role: 'option' }, [
                'France'
              ])
            ])
          ])
        ])
      ])
    )

    expect(visible(controls)).toEqual([
      expect.objectContaining({
        kind: 'typeahead',
        name: 'country',
        label: 'Country of origin',
        widget: {
          shape: 'bespoke',
          hiddenName: 'countryCode',
          optionSelector: '.autocomplete__option'
        }
      })
    ])
  })

  test('reads a three-box date as a date, even inside a widget wrapper', () => {
    const controls = read(
      el('main', {}, [
        el('div', { class: 'filter-autocomplete' }, [
          el('input', { type: 'hidden', name: 'filter' }),
          el('ul', {}, [
            el('li', { class: 'results__option', role: 'option' }, ['Dover'])
          ]),
          el('fieldset', {}, [
            el('legend', {}, ['When did it arrive?']),
            el('input', { id: 'arrival-date-day', name: 'arrival-date-day' }),
            el('input', {
              id: 'arrival-date-month',
              name: 'arrival-date-month'
            }),
            el('input', { id: 'arrival-date-year', name: 'arrival-date-year' })
          ])
        ])
      ])
    )

    expect(visible(controls)).toEqual([
      expect.objectContaining({
        kind: 'date',
        name: 'arrival-date',
        shape: 'three-inputs',
        legend: 'When did it arrive?'
      })
    ])
  })

  test('reads a datepicker as a date, not as a type-ahead', () => {
    const controls = read(
      el('main', {}, [
        el('div', { class: 'moj-datepicker autocomplete-panel' }, [
          el('input', { type: 'hidden', name: 'arrivalIso' }),
          el('label', { for: 'arrival' }, ['Arrival date']),
          el('input', { id: 'arrival', name: 'arrival' }),
          el('ul', {}, [
            el('li', { class: 'calendar__option', role: 'option' }, ['1'])
          ])
        ])
      ])
    )

    expect(visible(controls).map((control) => control.kind)).toEqual(['date'])
  })

  test('groups a radio set once, with its options and its legend', () => {
    const controls = read(
      el('main', {}, [
        el('fieldset', {}, [
          el('legend', {}, ['Why are you importing?']),
          el('div', { class: 'govuk-radios' }, [
            el('input', {
              type: 'radio',
              id: 'reason',
              name: 'reason',
              value: 'market'
            }),
            el('label', { for: 'reason' }, ['Internal market']),
            el('input', {
              type: 'radio',
              id: 'reason-2',
              name: 'reason',
              value: 'transit'
            }),
            el('label', { for: 'reason-2' }, ['Transit'])
          ])
        ])
      ])
    )

    expect(visible(controls)).toEqual([
      expect.objectContaining({
        kind: 'radios',
        name: 'reason',
        legend: 'Why are you importing?',
        options: [
          expect.objectContaining({
            value: 'market',
            label: 'Internal market'
          }),
          expect.objectContaining({ value: 'transit', label: 'Transit' })
        ]
      })
    ])
  })
})
