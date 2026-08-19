import { describe, test, expect } from 'vitest'
import { renderCard, decisionBlock, shot } from './card.js'

const sides = [
  { id: 'frontend', label: 'Frontend', repo: 'frontend' },
  { id: 'prototype', label: 'Design release 2.1', repo: 'prototype' }
]

const item = (overrides = {}) => ({
  kind: 'increment',
  id: 'inc-001',
  anchor: 'inc-001',
  title: 'The frontend renders no phase banner.',
  domain: 'dashboard',
  type: 'add-section',
  band: 'needs-design-decision',
  confidence: 'medium',
  milestone: 'M0',
  status: 'blocked',
  gate: 'sam',
  screens: ['fe-dashboard-empty', 'dr21-dashboard'],
  evidence: {},
  detail: 'The layout renders no banner.',
  sections: {
    frontend: null,
    prototype: null,
    difference: null,
    body: {
      text: 'The layout renders no banner [[c1]].',
      source: 'sentinel-split'
    },
    correction: null,
    falsifiedBy: {
      text: 'A prior decision to omit it.',
      source: 'sentinel-split'
    },
    verification: { text: 'Confirmed on both sides.', source: 'upstream' }
  },
  decision: null,
  decisionRequired: null,
  relatedTo: [],
  notes: [],
  citations: [
    {
      ref: 'c1',
      kind: 'code',
      side: 'frontend',
      repo: 'frontend',
      path: 'src/server/app/shared/layout.njk',
      asWritten: 'layout.njk:41-53',
      resolution: 'explicit',
      fields: ['detail']
    }
  ],
  resolvedCitations: [
    {
      ref: 'c1',
      state: 'resolved',
      url: 'https://github.com/DEFRA/x/blob/abc/src/server/app/shared/layout.njk#L41-L53',
      snippet: {
        state: 'inline',
        span: 2,
        lines: [{ n: 41, text: '{% block beforeContent %}', focus: true }]
      }
    }
  ],
  prose: {},
  visual: [],
  assets: [],
  dependsOn: [],
  dependents: ['inc-003'],
  ...overrides
})

const render = (overrides) =>
  renderCard({ item: item(overrides), sides, runId: 'EUDPA-328' })

describe('renderCard', () => {
  test('anchors the card on its own id so one finding can be linked', () => {
    expect(render()).toContain('id="inc-001"')
  })

  test('renders the falsifier where it cannot be missed', () => {
    expect(render()).toContain('This finding is wrong if')
  })

  test('renders the verification prose, collapsed and labelled an audit record', () => {
    const html = render()
    expect(html).toContain('How this was checked')
    expect(html).toContain('Verbatim audit record')
  })

  test('renders both columns even when neither has prose yet', () => {
    const html = render()
    expect(html).toContain('Frontend')
    expect(html).toContain('Design release 2.1')
  })

  test('puts a citation in the column its side owns, once', () => {
    const html = render()
    expect(html.match(/id="inc-001-src-c1"/g)).toHaveLength(1)
  })

  test('links a resolved citation to its permalink and shows the code', () => {
    const html = render()
    expect(html).toContain('https://github.com/DEFRA/x/blob/abc/')
    expect(html).toContain('{% block beforeContent %}')
  })

  test('does not repeat the prose citations under the undivided block', () => {
    // The body carries the prose; the columns carry the sources.
    const html = render()
    expect(html.match(/class="sources"/g)).toHaveLength(1)
  })

  test('carries the search text every filter reads', () => {
    expect(render()).toContain('data-search=')
  })

  test('marks a withdrawn card as withdrawn without dropping its content', () => {
    const html = renderCard({
      item: item({ kind: 'withdrawn' }),
      sides,
      runId: 'EUDPA-328'
    })
    expect(html).toContain('card--withdrawn')
    expect(html).toContain('This finding is wrong if')
  })

  test('omits the two columns on a deferred candidate, which has one side only', () => {
    const html = renderCard({
      item: item({ kind: 'candidate', gate: null }),
      sides,
      runId: 'EUDPA-328'
    })
    expect(html).toContain('card--candidate')
    expect(html).not.toContain('class="columns"')
  })
})

describe('decisionBlock', () => {
  const citations = new Map()

  test('asks for a ruling and offers the exact argument string', () => {
    const html = decisionBlock({
      item: item({
        decisionRequired: {
          question: 'Should every page carry a phase banner?',
          source: 'authored',
          options: ['Yes', 'No'],
          consequence: 'Blocks inc-003.'
        }
      }),
      runId: 'EUDPA-328',
      citations
    })
    expect(html).toContain('Should every page carry a phase banner?')
    expect(html).toContain('tools/parity/rule-decision.sh EUDPA-328 inc-001')
    expect(html).toContain('Blocks inc-003.')
  })

  test('labels an authored question so the reader knows whose reading it is', () => {
    const html = decisionBlock({
      item: item({
        decisionRequired: { question: 'Q?', source: 'authored' }
      }),
      runId: 'EUDPA-328',
      citations
    })
    expect(html).toContain('Drafted from the falsifier')
  })

  test('does not label an extracted question as drafted', () => {
    const html = decisionBlock({
      item: item({
        decisionRequired: { question: 'Q?', source: 'extracted' }
      }),
      runId: 'EUDPA-328',
      citations
    })
    expect(html).not.toContain('Drafted from the falsifier')
  })

  test('says so plainly when no question has been written yet', () => {
    const html = decisionBlock({ item: item(), runId: 'EUDPA-328', citations })
    expect(html).toContain('No question has been written')
  })

  test('shows the ruling instead of the ask once one has been made', () => {
    const html = decisionBlock({
      item: item({
        decision: {
          ruling: 'falsified',
          note: 'Closed by 662dd323.',
          by: 'sam'
        }
      }),
      runId: 'EUDPA-328',
      citations
    })
    expect(html).toContain('Ruled falsified')
    expect(html).not.toContain('Decision needed')
  })

  test('renders nothing at all for an ungated finding with no ruling', () => {
    expect(
      decisionBlock({ item: item({ gate: null }), runId: 'X', citations })
    ).toBe('')
  })
})

describe('shot', () => {
  const side = { id: 'prototype', label: 'Design release 2.1' }

  test('renders an image when there is one', () => {
    const html = shot({
      asset: { state: 'page', screen: 'dr21-dashboard', href: 'assets/x.png' },
      side
    })
    expect(html).toContain('<img')
    expect(html).toContain('assets/x.png')
  })

  test('renders a page-model plate rather than a broken image', () => {
    const html = shot({
      asset: {
        state: 'model',
        screen: 'fe-dashboard',
        plate: { rows: [{ kind: 'h1', text: 'Import notification service' }] }
      },
      side
    })
    expect(html).not.toContain('<img')
    expect(html).toContain('Import notification service')
    expect(html).toContain('Page model only')
  })

  test('names the capture command when there is nothing at all', () => {
    const html = shot({
      asset: {
        state: 'absent',
        screen: 'dr21-x',
        why: 'nothing captured',
        command: 'tools/parity/capture-screens.sh --side prototype'
      },
      side
    })
    expect(html).not.toContain('<img')
    expect(html).toContain('capture-screens.sh')
  })

  test('keeps the slot and says why when the side has no screen', () => {
    const html = shot({
      asset: { state: 'absent', screen: null, why: 'no counterpart' },
      side
    })
    expect(html).toContain('no counterpart')
  })

  test('flags an image that changed since the reader last saw it', () => {
    const html = shot({
      asset: {
        state: 'page',
        screen: 'x',
        href: 'assets/x.png',
        drifted: true,
        driftKind: 'image-changed',
        driftedFrom: 'full page of x'
      },
      side
    })
    expect(html).toContain('changed since you last looked')
    // The old frame is the same words as the new one here, so saying it would
    // read as though nothing had moved.
    expect(html).not.toContain('was: full page of x')
  })

  test('says when the frame changed rather than the pixels', () => {
    const html = shot({
      asset: {
        state: 'page',
        screen: 'x',
        href: 'assets/x.png',
        drifted: true,
        driftKind: 'frame-changed',
        driftedFrom: 'crop of field-file on x'
      },
      side
    })
    expect(html).toContain('different frame since you last looked')
    expect(html).toContain('was: crop of field-file on x')
  })
})
