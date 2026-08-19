import { describe, it, expect } from 'vitest'
import {
  RUNGS,
  EMAIL,
  mineExample,
  fromPattern,
  dateDirection,
  dateParts,
  formatDate,
  clampLength,
  seededValue,
  firstUsableOption,
  isExclusive,
  deriveValue,
  mineErrorFormat,
  matchErrorToControl
} from './values.js'

const TODAY = new Date('2026-08-19T00:00:00Z')

describe('mineExample', () => {
  it('reads the format a GDS hint states about its own field', () => {
    expect(
      mineExample('For example, 12/345/6789. You can find it on the tag.')
    ).toBe('12/345/6789')
  })

  it('finds nothing in a hint that gives no example', () => {
    expect(mineExample('You can change this later.')).toBeNull()
  })
})

describe('fromPattern', () => {
  it('generates a value for a counted character class', () => {
    expect(fromPattern('^[A-Z]{2}[0-9]{4}$')).toBe('AA1111')
  })

  it('refuses a pattern with alternation rather than inventing one', () => {
    expect(fromPattern('^(cat|dog)$')).toBeNull()
  })
})

describe('dateDirection', () => {
  it('puts an expected arrival in the future', () => {
    expect(dateDirection('Expected date of arrival')).toBe('future')
  })

  it('puts a date of birth in the past', () => {
    expect(dateDirection('Date of birth')).toBe('past')
  })

  it('leaves a date with no wording either way at today', () => {
    expect(dateDirection('Date')).toBe('today')
  })
})

describe('dateParts', () => {
  it('takes a future date thirty days out', () => {
    expect(dateParts('future', TODAY)).toEqual({
      day: '18',
      month: '9',
      year: '2026'
    })
  })

  it('takes a past date thirty days back', () => {
    expect(dateParts('past', TODAY)).toEqual({
      day: '20',
      month: '7',
      year: '2026'
    })
  })
})

describe('formatDate', () => {
  it('follows the ISO example the hint shows', () => {
    expect(
      formatDate(
        { day: '9', month: '3', year: '2026' },
        'For example, 2026-03-09'
      )
    ).toBe('2026-03-09')
  })

  it('falls back to the GDS day/month/year order', () => {
    expect(formatDate({ day: '9', month: '3', year: '2026' })).toBe('9/3/2026')
  })
})

describe('clampLength', () => {
  it('cuts a value down to the maximum length the field allows', () => {
    expect(clampLength('ABCDEFGH', { maxlength: 4 })).toBe('ABCD')
  })

  it('pads a value up to the minimum length the field demands', () => {
    expect(clampLength('AB', { minlength: 4 })).toBe('ABBB')
  })
})

describe('seededValue', () => {
  it('prefers a value seeded for this field on this route', () => {
    const value = seededValue({
      control: { name: 'cph' },
      routeTemplate: '/holding',
      hints: {
        fields: { cph: '11/111/1111' },
        routes: { '/holding': { cph: '12/345/6789' } }
      }
    })

    expect(value).toBe('12/345/6789')
  })

  it('falls back to a label pattern when the field is not named', () => {
    const value = seededValue({
      control: { name: 'q1', label: 'County parish holding number' },
      hints: { labels: { 'county parish': '12/345/6789' } }
    })

    expect(value).toBe('12/345/6789')
  })

  it('finds nothing when the corpus has no hints file', () => {
    expect(seededValue({ control: { name: 'cph' } })).toBeNull()
  })
})

describe('firstUsableOption', () => {
  it('skips a negative option, which ends the journey early', () => {
    const option = firstUsableOption([
      { value: 'none', label: 'None of these' },
      { value: 'cattle', label: 'Cattle' }
    ])

    expect(option.value).toBe('cattle')
  })

  it('skips a select placeholder', () => {
    const option = firstUsableOption([
      { value: '', label: 'Choose a country' },
      { value: 'FR', label: 'France' }
    ])

    expect(option.value).toBe('FR')
  })

  it('marks the none-of-the-above box as exclusive from its wording alone', () => {
    expect(isExclusive({ label: 'None of the above' })).toBe(true)
  })
})

describe('deriveValue', () => {
  it('takes a seeded value at rung one and says so', () => {
    const derived = deriveValue({
      control: { kind: 'text', name: 'cph' },
      hints: { fields: { cph: '12/345/6789' } }
    })

    expect(derived).toEqual({
      value: '12/345/6789',
      rung: RUNGS.SEED,
      confidence: 'high',
      why: 'seeded in hints'
    })
  })

  it('takes an option the page itself offers at rung two', () => {
    const derived = deriveValue({
      control: {
        kind: 'radios',
        name: 'importKind',
        options: [{ value: 'live-animals', label: 'Live animals' }]
      }
    })

    expect(derived).toMatchObject({
      value: 'live-animals',
      rung: RUNGS.ENUMERATED,
      why: 'the page offers "Live animals"'
    })
  })

  it('mines the hint at rung three when the page states its own format', () => {
    const derived = deriveValue({
      control: {
        kind: 'text',
        name: 'cph',
        label: 'CPH number',
        hint: 'For example, 12/345/6789'
      }
    })

    expect(derived).toMatchObject({ value: '12/345/6789', rung: RUNGS.MINED })
  })

  it('sends an email field to a reserved domain', () => {
    const derived = deriveValue({ control: { kind: 'email', name: 'email' } })

    expect(derived.value).toBe(EMAIL)
  })

  it('answers "how many" with two, so repeat-entry screens are discovered', () => {
    const derived = deriveValue({
      control: { kind: 'number', name: 'count', label: 'How many animals?' }
    })

    expect(derived.value).toBe('2')
  })

  it('records a low confidence when nothing on the page said what the field wants', () => {
    const derived = deriveValue({ control: { kind: 'text', name: 'q1' } })

    expect(derived).toMatchObject({ rung: RUNGS.GENERIC, confidence: 'low' })
  })

  it('refuses to answer a question whose every option is a negative', () => {
    const derived = deriveValue({
      control: {
        kind: 'radios',
        name: 'q',
        options: [{ value: 'none', label: 'None of these' }]
      }
    })

    expect(derived.value).toBeNull()
  })

  it('puts an expected arrival date in the future and names the rule', () => {
    const derived = deriveValue({
      control: {
        kind: 'date',
        name: 'arrival',
        legend: 'Expected arrival date'
      },
      today: TODAY
    })

    expect(derived).toMatchObject({
      value: '18/9/2026',
      why: 'a date the wording puts in the future'
    })
  })
})

describe('mineErrorFormat', () => {
  it('takes the format the error message states', () => {
    const mined = mineErrorFormat('Enter a CPH in the format 12/345/6789')

    expect(mined.value).toBe('12/345/6789')
  })

  it('builds a value of the length the error demands', () => {
    const mined = mineErrorFormat('The reference must be 6 characters')

    expect(mined.value).toBe('AAAAAA')
  })

  it('re-derives a date the error says must be in the future', () => {
    const mined = mineErrorFormat('The date must be in the future', TODAY)

    expect(mined.value).toBe('18/9/2026')
  })

  it('finds nothing in an error that states no constraint', () => {
    expect(mineErrorFormat('Something went wrong')).toBeNull()
  })
})

describe('matchErrorToControl', () => {
  it('links an error back to the field it names', () => {
    const control = matchErrorToControl(
      'Enter the county parish holding number',
      [
        { name: 'cph', label: 'County parish holding number' },
        { name: 'email', label: 'Email address' }
      ]
    )

    expect(control.name).toBe('cph')
  })

  it('refuses to guess when two fields match equally well', () => {
    const control = matchErrorToControl('Enter the arrival date', [
      { name: 'a', label: 'Arrival date' },
      { name: 'b', label: 'Arrival date' }
    ])

    expect(control).toBeNull()
  })
})
