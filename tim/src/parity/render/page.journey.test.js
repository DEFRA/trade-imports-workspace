import { describe, test, expect } from 'vitest'
import { renderPage } from './page.js'

const sides = [{ id: 'frontend', label: 'Frontend', column: 'left' }]

const finding = (overrides = {}) => ({
  kind: 'increment',
  id: 'inc-001',
  anchor: 'inc-001',
  title: 'Finding inc-001',
  domain: 'dashboard',
  type: 'add-field',
  band: 'frontend-work',
  confidence: 'high',
  milestone: 'M0',
  status: 'todo',
  gate: null,
  screens: ['fe-dashboard'],
  detail: 'Something differs.',
  sections: { frontend: null, prototype: null, difference: null, body: null },
  decision: null,
  decisionRequired: null,
  relatedTo: [],
  notes: [],
  citations: [],
  resolvedCitations: [],
  assets: [],
  dependsOn: [],
  dependents: [],
  visual: [],
  ...overrides
})

const args = (overrides = {}) => ({
  corpus: 'dr1',
  meta: { pins: {}, captures: {}, schemaVersion: 1 },
  counts: {
    findings: 0,
    awaitingRuling: 0,
    ruled: 0,
    corrected: 0,
    notes: 0,
    withdrawn: 0,
    candidates: 0,
    pageModels: { total: 0 },
    citations: 0,
    citationsQueued: 0,
    screens: 0
  },
  bands: [
    { id: 'frontend-work', label: 'Frontend work', blurb: 'Just build it.' },
    { id: 'disputed', label: 'Disputed', blurb: 'The finding may be wrong.' }
  ],
  findings: [],
  withdrawn: [],
  candidates: [],
  journey: null,
  joinReport: { matched: 0, increments: 0, ordinalAgreement: 0 },
  sides,
  runId: 'EUDPA-328-DR1',
  target: 'local',
  stamp: {
    timVersion: 'test',
    backlogSha: 'abc',
    backlogMtime: '2026-08-19T00:00:00.000Z',
    generatedAt: '2026-08-19T00:00:00.000Z'
  },
  ...overrides
})

const dashboard = finding({
  id: 'inc-dashboard',
  anchor: 'inc-dashboard',
  screens: ['fe-dashboard']
})
const origin = finding({
  id: 'inc-origin',
  anchor: 'inc-origin',
  screens: ['fe-origin']
})
const signOut = finding({
  id: 'inc-sign-out',
  anchor: 'inc-sign-out',
  screens: ['fe-sign-out']
})

const journey = [
  {
    id: 'journey-start',
    title: 'Start',
    pages: [
      {
        id: 'page-fe-dashboard',
        screen: 'fe-dashboard',
        title: 'Dashboard',
        items: [dashboard]
      },
      {
        id: 'page-fe-start',
        screen: 'fe-start',
        title: 'Start now',
        items: []
      }
    ]
  },
  {
    id: 'journey-consignment',
    title: 'Consignment',
    pages: [
      {
        id: 'page-fe-origin',
        screen: 'fe-origin',
        title: 'Origin of the import',
        items: [origin]
      }
    ]
  },
  {
    id: 'journey-review',
    title: 'Check your answers',
    pages: [
      { id: 'page-fe-review', screen: 'fe-review', title: 'Review', items: [] }
    ]
  },
  {
    id: 'beside-the-journey',
    title: 'Beside the journey',
    pages: [
      {
        id: 'page-fe-sign-out',
        screen: 'fe-sign-out',
        title: 'Sign out',
        items: [signOut]
      }
    ]
  }
]

const idsOf = (html, className) =>
  [
    ...html.matchAll(
      new RegExp(`<section class="section ${className}" id="([^"]+)"`, 'g')
    )
  ].map((match) => match[1])

const optionValuesIn = (html, filter) => {
  const select = html.match(
    new RegExp(`<select data-filter="${filter}"[^>]*>(.*?)</select>`)
  )
  if (!select) return null
  return [...select[1].matchAll(/<option value="([^"]*)"/g)]
    .map((match) => match[1])
    .filter(Boolean)
}

const optionLabelsIn = (html, filter) => {
  const select = html.match(
    new RegExp(`<select data-filter="${filter}"[^>]*>(.*?)</select>`)
  )
  if (!select) return null
  return [...select[1].matchAll(/<option value="[^"]*">([^<]*)</g)].map(
    (match) => match[1]
  )
}

const journeySectionIn = (html, id) => {
  const rest = html.slice(
    html.indexOf(`<section class="section section--journey" id="${id}"`) + 1
  )
  const next = rest.indexOf('<section class="section section--journey"')
  return next === -1 ? rest : rest.slice(0, next)
}

describe('a corpus that knows the journey its findings sit on', () => {
  const html = renderPage(
    args({ journey, findings: [dashboard, origin, signOut] })
  )

  test('renders one section per journey group, in the order the journey gives them', () => {
    expect(idsOf(html, 'section--journey')).toEqual([
      'journey-start',
      'journey-consignment',
      'beside-the-journey'
    ])
  })

  test('nests every page group inside the journey section that holds it', () => {
    const start = journeySectionIn(html, 'journey-start')
    expect(start).toContain('id="page-fe-dashboard"')
    expect(start).toContain('id="inc-dashboard"')
    expect(start).not.toContain('id="inc-origin"')
  })

  test('counts the whole journey section, not just its first page', () => {
    expect(journeySectionIn(html, 'journey-start')).toContain(
      'Start <span class="section__count">1</span>'
    )
  })

  test('renders nothing for a page group with no findings', () => {
    expect(html).not.toContain('page-fe-start')
    expect(html).not.toContain('Start now')
  })

  test('renders nothing for a journey section whose pages are all empty', () => {
    expect(html).not.toContain('journey-review')
    expect(html).not.toContain('Check your answers')
  })

  test('shows each finding once, under its page rather than under its band', () => {
    expect(html.match(/id="inc-dashboard"/g)).toHaveLength(1)
    expect(html).not.toContain('<section class="section" id="frontend-work"')
    expect(html).not.toContain('<section class="section" id="unbanded"')
  })

  test('tags each card with the page and the journey section holding it', () => {
    expect(html).toContain(
      'data-page="fe-origin" data-journey-section="journey-consignment"'
    )
    expect(html).toContain(
      'data-page="fe-sign-out" data-journey-section="beside-the-journey"'
    )
  })

  test('offers the journey sections as a filter, in journey order', () => {
    expect(optionValuesIn(html, 'journeySection')).toEqual([
      'journey-start',
      'journey-consignment',
      'beside-the-journey'
    ])
  })

  test('offers the pages as a filter, in journey order rather than alphabetically', () => {
    expect(optionValuesIn(html, 'page')).toEqual([
      'fe-dashboard',
      'fe-origin',
      'fe-sign-out'
    ])
  })

  test('leaves out a page nobody could filter to, because it holds nothing', () => {
    expect(optionValuesIn(html, 'page')).not.toContain('fe-start')
  })

  test('keeps the band, domain, type and ruling filters and the batch control', () => {
    expect(optionValuesIn(html, 'band')).toEqual(['frontend-work', 'disputed'])
    expect(html).toContain('data-filter="domain"')
    expect(html).toContain('data-filter="type"')
    expect(html).toContain('data-filter="ruled"')
    expect(html).toContain('id="copy-batch"')
  })
})

describe('a corpus with no journey', () => {
  const html = renderPage(
    args({ journey: null, findings: [dashboard, origin] })
  )

  test('falls back to the band sections, in the order the corpus declared them', () => {
    expect(idsOf(html, 'section--journey')).toEqual([])
    expect(html).toContain('<section class="section" id="frontend-work"')
    expect(html).toContain('Frontend work')
  })

  test('offers neither of the journey filters', () => {
    expect(html).not.toContain('data-filter="journeySection"')
    expect(html).not.toContain('data-filter="page"')
  })
})

describe('a finding whose band is a typo, on a corpus grouped by journey', () => {
  const typo = finding({
    id: 'inc-typo',
    anchor: 'inc-typo',
    band: 'frontend-wrok',
    screens: ['fe-origin']
  })
  const html = renderPage(
    args({
      journey: [
        {
          id: 'journey-consignment',
          title: 'Consignment',
          pages: [
            {
              id: 'page-fe-origin',
              screen: 'fe-origin',
              title: 'Origin of the import',
              items: [origin, typo]
            }
          ]
        }
      ],
      findings: [origin, typo]
    })
  )

  test('still reaches the band filter under its raw name', () => {
    expect(optionValuesIn(html, 'band')).toEqual([
      'frontend-work',
      'disputed',
      'frontend-wrok'
    ])
  })

  test('keeps its raw band as its chip label', () => {
    expect(html).toContain('>frontend-wrok</span>')
  })
})

describe('the sections that belong to no page group', () => {
  const candidate = finding({
    id: 'cand-001',
    anchor: 'cand-001',
    kind: 'candidate',
    band: null,
    type: null,
    gate: null,
    screens: []
  })
  const html = renderPage(
    args({
      journey,
      findings: [dashboard, origin, signOut],
      candidates: [candidate]
    })
  )

  test('keeps the deferred candidates at the end, outside the journey', () => {
    expect(html).toContain('<section class="section" id="deferred"')
    expect(html.indexOf('id="deferred"')).toBeGreaterThan(
      html.indexOf('id="beside-the-journey"')
    )
  })

  test('leaves a candidate with no page and no journey section', () => {
    expect(html).toContain('data-page="" data-journey-section=""')
  })
})

describe('a page group holding findings that name no screen', () => {
  const nowhere = finding({
    id: 'inc-nowhere',
    anchor: 'inc-nowhere',
    screens: []
  })
  const html = renderPage(
    args({
      journey: [
        ...journey,
        {
          id: 'journey-no-screen',
          title: 'Not on the journey',
          pages: [
            {
              id: 'page-no-screen',
              screen: null,
              title: 'No screen to look at',
              items: [nowhere]
            }
          ]
        }
      ],
      findings: [dashboard, origin, signOut, nowhere]
    })
  )

  test('leaves the page out of the page filter, because picking it could only empty the page', () => {
    expect(optionLabelsIn(html, 'page')).toEqual([
      'All pages',
      'Dashboard',
      'Origin of the import',
      'Sign out'
    ])
  })

  test('still renders the section and the cards it holds', () => {
    expect(html).toContain('id="page-no-screen"')
    expect(html).toContain('id="inc-nowhere"')
    expect(html).toContain(
      'data-page="" data-journey-section="journey-no-screen"'
    )
  })
})
