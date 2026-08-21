import { describe, test, expect } from 'vitest'
import { renderPage, CONTROLS_SCRIPT, ASSET_CSS, ASSET_JS } from './page.js'

const args = (target) => ({
  corpus: 'dr21',
  meta: { pins: {}, captures: {}, schemaVersion: 1 },
  counts: {
    findings: 1,
    awaitingRuling: 1,
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
  findings: [],
  withdrawn: [],
  candidates: [],
  joinReport: { matched: 0, increments: 0, ordinalAgreement: 0 },
  sides: [{ id: 'frontend', label: 'Frontend', column: 'left' }],
  runId: 'EUDPA-328',
  target,
  stamp: {
    timVersion: 'test',
    backlogSha: 'abc',
    backlogMtime: '2026-08-19T00:00:00.000Z',
    generatedAt: '2026-08-19T00:00:00.000Z'
  }
})

const finding = (id) => ({
  kind: 'increment',
  id,
  anchor: id,
  title: `Finding ${id}`,
  domain: 'dashboard',
  type: 'add-field',
  band: 'frontend-only',
  confidence: 'high',
  milestone: 'M0',
  status: 'todo',
  gate: null,
  screens: ['dashboard'],
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
  visual: []
})

describe('the local build is a static app', () => {
  const html = renderPage(args('local'))

  test('links its stylesheet and script rather than inlining them', () => {
    expect(html).toContain(`<link rel="stylesheet" href="${ASSET_CSS}">`)
    expect(html).toContain(`<script src="${ASSET_JS}"></script>`)
    expect(html).not.toContain('<style>')
  })

  test('references them relatively, so the folder can be moved or copied', () => {
    expect(html).not.toMatch(/(href|src)="(\/|https?:|file:)/)
  })
})

describe('the page opens off the filesystem with no server', () => {
  // This is the whole reason there is no `tim parity serve`. A file:// page
  // may not fetch, and may not load an ES module — both are blocked as
  // cross-origin. Everything else works.
  test('the script never fetches', () => {
    expect(CONTROLS_SCRIPT).not.toMatch(/\bfetch\s*\(/)
    expect(CONTROLS_SCRIPT).not.toMatch(/XMLHttpRequest/)
  })

  test('the script is not a module', () => {
    expect(CONTROLS_SCRIPT).not.toMatch(/^\s*import\s/m)
    expect(CONTROLS_SCRIPT).not.toMatch(/^\s*export\s/m)
    expect(renderPage(args('local'))).not.toContain('type="module"')
  })
})

describe('the artifact stays one file', () => {
  const html = renderPage(args('artifact'))

  test('carries its stylesheet and script inline', () => {
    // It exists to be sent to someone. A second and third file that had to
    // travel with it would defeat the point.
    expect(html).toContain('<style>')
    expect(html).not.toContain(`href="${ASSET_CSS}"`)
    expect(html).not.toContain(`src="${ASSET_JS}"`)
    expect(html).toContain(CONTROLS_SCRIPT)
  })
})

describe('the report shows findings in words, never in pictures', () => {
  const html = renderPage({
    ...args('local'),
    findings: [finding('inc-001'), finding('inc-002')]
  })

  test('renders no image markup at all', () => {
    expect(html).not.toContain('<img')
    expect(html).not.toContain('class="shot')
    expect(html).not.toContain('class="frame')
    expect(html).not.toContain('class="plate--')
    expect(html).not.toContain('class="ribbon')
  })
})
