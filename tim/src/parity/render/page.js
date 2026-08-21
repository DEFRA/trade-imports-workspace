import { esc } from './prose.js'
import { DEFAULT_BANDS } from '../corpus-profile.js'
import { renderCard } from './card.js'
import { THEME_CSS } from './theme.js'

/**
 * The static app's own files, beside the page. Named here and written by the
 * renderer, so nothing has to agree about them across two modules by
 * convention.
 */
export const ASSET_CSS = 'app.css'
export const ASSET_JS = 'app.js'

const TYPE_ORDER = [
  'add-page',
  'add-section',
  'add-collection',
  'add-field',
  'obligation-change',
  'flow-change',
  'copy-change'
]

const figure = (n, label) =>
  `<div class="figure"><span class="figure__n">${esc(n)}</span><span class="figure__label">${esc(label)}</span></div>`

const optionOf = ({ value, label }) =>
  `<option value="${esc(value)}">${esc(label)}</option>`

const uniqueByValue = (entries) => [
  ...new Map(entries.map((entry) => [entry.value, entry])).values()
]

const optionsOf = (entries) => uniqueByValue(entries).map(optionOf).join('')

const selectOf = ({ filter, label, all, entries }) =>
  `<select data-filter="${esc(filter)}" aria-label="${esc(label)}"><option value="">${esc(all)}</option>${optionsOf(entries)}</select>`

const pinCard = (
  key,
  pin
) => `<div class="pin${pin.pushed ? '' : ' pin--unpushed'}">
  <span class="pin__repo">${esc(key)}</span>
  <span class="pin__sha">${esc(pin.short)}</span>
  ${pin.pushed ? '' : '<span class="pin__sha"> · not pushed, so its permalinks will 404</span>'}
  <span class="pin__why">${esc(pin.subject ?? '')}</span>
  <span class="pin__why">${esc(pin.why ?? '')}</span>
</div>`

/**
 * One section. The only place a section and a card are produced, whether the
 * page is grouped by band or by journey, and whether the section holds cards
 * or holds other sections.
 *
 * @param {object} args
 * @returns {string}
 */
const sectionOf = ({
  id,
  title,
  blurb,
  items = [],
  sides,
  runId,
  bands,
  page,
  journeySection,
  children,
  count,
  modifier = '',
  heading = 'h2'
}) => {
  const body =
    children ??
    items
      .map((item) =>
        renderCard({ item, sides, runId, bands, page, journeySection })
      )
      .join('')
  if (!body) return ''
  return `<section class="section${modifier ? ` ${modifier}` : ''}" id="${esc(id)}">
  <div class="section__head">
    <${heading} class="section__title">${esc(title)} <span class="section__count">${count ?? items.length}</span></${heading}>
    ${blurb ? `<p class="section__blurb">${esc(blurb)}</p>` : ''}
  </div>
  ${body}
</section>`
}

const pageGroupOf = ({ group, page, sides, runId, bands }) =>
  sectionOf({
    id: page.id,
    title: page.title,
    items: page.items,
    sides,
    runId,
    bands,
    page: page.screen,
    journeySection: group.id,
    modifier: 'section--page',
    heading: 'h3'
  })

const journeySectionOf = ({ group, sides, runId, bands }) =>
  sectionOf({
    id: group.id,
    title: group.title,
    blurb: group.blurb,
    count: group.pages.reduce((total, page) => total + page.items.length, 0),
    children: group.pages
      .map((page) => pageGroupOf({ group, page, sides, runId, bands }))
      .join(''),
    modifier: 'section--journey'
  })

const rank = (item) => {
  const i = TYPE_ORDER.indexOf(item.type)
  return i === -1 ? TYPE_ORDER.length : i
}

export const byGateThenType = (a, b) => {
  const gate =
    Number(Boolean(b.gate && !b.decision)) -
    Number(Boolean(a.gate && !a.decision))
  return gate || rank(a) - rank(b) || a.title.localeCompare(b.title)
}

export const CONTROLS_SCRIPT = `
const cards = [...document.querySelectorAll('.card')]
const search = document.getElementById('q')
const filters = [...document.querySelectorAll('[data-filter]')]
const count = document.getElementById('count')

const apply = () => {
  const term = search.value.trim().toLowerCase()
  const active = Object.fromEntries(filters.map((f) => [f.dataset.filter, f.value]))
  let shown = 0
  for (const card of cards) {
    const matchesTerm = !term || card.dataset.search.includes(term)
    const matchesFilters = Object.entries(active).every(
      ([key, value]) => !value || card.dataset[key] === value
    )
    const show = matchesTerm && matchesFilters
    card.classList.toggle('hidden', !show)
    if (show) shown += 1
  }
  for (const section of document.querySelectorAll('.section')) {
    const any = [...section.querySelectorAll('.card')].some((c) => !c.classList.contains('hidden'))
    section.classList.toggle('hidden', !any)
  }
  count.textContent = shown + ' of ' + cards.length + ' shown'
  const params = new URLSearchParams()
  if (term) params.set('q', term)
  for (const [key, value] of Object.entries(active)) if (value) params.set(key, value)
  const query = params.toString()
  history.replaceState(null, '', query ? '?' + query : location.pathname)
}

const restore = () => {
  const params = new URLSearchParams(location.search)
  if (params.get('q')) search.value = params.get('q')
  for (const filter of filters) {
    const value = params.get(filter.dataset.filter)
    if (value) filter.value = value
  }
}

restore()
search.addEventListener('input', apply)
for (const filter of filters) filter.addEventListener('change', apply)
apply()

// Batch ruling. Collecting the argument strings in the page and applying them
// in one go is the whole point of the report being the ruling surface: 49
// decisions read in one pass, not 49 trips through next-decision.sh.
const batch = new Map()
document.addEventListener('click', (event) => {
  const button = event.target.closest('.decision__rule')
  if (button) {
    const inc = button.dataset.inc
    const ruling = button.dataset.ruling
    const already = batch.get(inc) === ruling
    for (const sibling of document.querySelectorAll('.decision__rule[data-inc="' + inc + '"]')) {
      sibling.setAttribute('aria-pressed', 'false')
    }
    if (already) batch.delete(inc)
    else {
      batch.set(inc, ruling)
      button.setAttribute('aria-pressed', 'true')
    }
    const cmd = document.querySelector('.decision__cmd[data-cmd-for="' + inc + '"]')
    cmd.textContent = batch.has(inc)
      ? 'tools/parity/rule-decision.sh ' + RUN_ID + ' ' + inc + ' ' + ruling + ' --note "…"'
      : 'tools/parity/rule-decision.sh ' + RUN_ID + ' ' + inc + ' <ruling> --note "…"'
    document.getElementById('batch-count').textContent = batch.size
    return
  }
  if (event.target.id === 'copy-batch') {
    const lines = [...batch.entries()].map(
      ([inc, ruling]) => 'tools/parity/rule-decision.sh ' + RUN_ID + ' ' + inc + ' ' + ruling + ' --note ""'
    )
    navigator.clipboard.writeText(lines.join('\\n'))
    event.target.textContent = 'copied ' + lines.length
    setTimeout(() => { event.target.textContent = 'copy batch' }, 1500)
  }
})
`

/**
 * Render the whole page.
 *
 * Every number here is derived. The page this replaces hardcoded its masthead
 * facts and got two of them wrong — 103 page models against a real 104, and 60
 * corrections against a real 39.
 *
 * @param {object} args
 * @param {object[]|null} [args.journey] - Ordered journey sections, each
 *   holding its page groups and their findings. Null groups by band instead.
 * @returns {string}
 */
export const renderPage = ({
  corpus,
  bands = DEFAULT_BANDS,
  meta,
  counts,
  findings,
  withdrawn,
  candidates,
  joinReport,
  journey = null,
  sides,
  runId,
  target,
  stamp
}) => {
  const domains = [...new Set(findings.map((item) => item.domain))].sort()
  const types = [...new Set(findings.map((item) => item.type))].sort()

  // A band the corpus never declared is how a typo shows itself. Under journey
  // grouping it has no section of its own to surface it, so the filter carries
  // the signal instead.
  const undeclaredBands = [...new Set(findings.map((item) => item.band))]
    .filter((band) => band && !bands.some((declared) => declared.id === band))
    .sort()

  const bandEntries = [
    ...bands.map((band) => ({ value: band.id, label: band.label })),
    ...undeclaredBands.map((band) => ({ value: band, label: band }))
  ]

  // A group that renders no section offers no filter option either: choosing
  // it could only ever empty the page.
  const pagesWithFindings = (group) =>
    group.pages.filter((page) => page.items.length > 0)

  const journeyEntries = (journey ?? [])
    .filter((group) => pagesWithFindings(group).length > 0)
    .map((group) => ({ value: group.id, label: group.title }))

  const pageEntries = (journey ?? []).flatMap((group) =>
    pagesWithFindings(group)
      .filter((page) => page.screen)
      .map((page) => ({
        value: page.screen,
        label: page.title
      }))
  )

  const bandSections = journey
    ? ''
    : bands
        .map((band) =>
          sectionOf({
            id: band.id,
            title: band.label,
            blurb: band.blurb,
            items: findings
              .filter((item) => item.band === band.id)
              .sort(byGateThenType),
            sides,
            runId,
            bands
          })
        )
        .join('')

  const journeySections = (journey ?? [])
    .map((group) => journeySectionOf({ group, sides, runId, bands }))
    .join('')

  const unbanded = journey
    ? []
    : findings.filter((item) => !bands.some((band) => band.id === item.band))

  // The local build is a static app: the stylesheet and the script sit beside
  // the page as their own files, so they are diffable, cacheable and readable
  // on their own. The artifact is one file by definition — it exists to be
  // sent to someone — so it carries both inline.
  const standalone = target === 'artifact'
  const head = standalone
    ? `<style>${THEME_CSS}</style>`
    : `<link rel="stylesheet" href="${ASSET_CSS}">`

  return `<title>${esc(runId)} findings — ${esc(corpus)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
<div class="wrap">
  <header class="masthead">
    <span class="masthead__eyebrow">${esc(runId)} · corpus ${esc(corpus)}</span>
    <h1 class="masthead__title">${counts.findings} findings, ${counts.awaitingRuling} of them waiting on a decision</h1>
    <p class="masthead__standfirst">
      Each finding names what the frontend does, what the requirements source does, and what
      differs. The falsifier under every one is how you say no. The audit record under every
      one is how it was checked. Nothing on this page is typed in: every number is counted
      from the backlog at build time.
    </p>
    ${
      target === 'artifact'
        ? `<p class="masthead__note">This is the shareable copy: one file you can send to somebody, with the stylesheet and the script inside it. The ruling controls write to a backlog this copy cannot reach; rule from the local build.</p>`
        : ''
    }
  </header>

  <div class="figures">
    ${figure(counts.findings, 'findings')}
    ${figure(counts.awaitingRuling, 'awaiting a ruling')}
    ${figure(counts.ruled, 'already ruled')}
    ${figure(counts.corrected, 'corrected by verification')}
    ${figure(counts.notes, 'revalidation notes')}
    ${figure(counts.pageModels.total, 'page models')}
    ${figure(counts.deltas ?? '—', 'mechanical deltas')}
    ${figure(counts.deferredCandidates, 'deferred candidates')}
    ${figure(counts.withdrawn, 'withdrawn')}
    ${figure(counts.citations, 'citations')}
    ${figure(counts.citationsQueued, 'queued for a human')}
  </div>

  <div class="pins">
    ${Object.entries(meta?.pins ?? {})
      .map(([key, pin]) => pinCard(key, pin))
      .join('')}
  </div>

  <div class="controls">
    <input type="search" id="q" placeholder="Search every finding…" aria-label="Search findings">
    ${
      journey
        ? selectOf({
            filter: 'journeySection',
            label: 'Journey section',
            all: 'All journey sections',
            entries: journeyEntries
          })
        : ''
    }
    ${
      journey
        ? selectOf({
            filter: 'page',
            label: 'Page',
            all: 'All pages',
            entries: pageEntries
          })
        : ''
    }
    ${selectOf({
      filter: 'band',
      label: 'Band',
      all: 'All bands',
      entries: bandEntries
    })}
    <select data-filter="domain" aria-label="Domain"><option value="">All domains</option>${domains
      .map((d) => `<option value="${esc(d)}">${esc(d)}</option>`)
      .join('')}</select>
    <select data-filter="type" aria-label="Type"><option value="">All types</option>${types
      .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
      .join('')}</select>
    <select data-filter="ruled" aria-label="Ruling"><option value="">Ruled or not</option><option value="no">Not yet ruled</option><option value="yes">Ruled</option></select>
    <button type="button" id="copy-batch">copy batch</button>
    <span class="controls__count"><span id="batch-count">0</span> queued · <span id="count"></span></span>
  </div>

  ${journeySections}

  ${bandSections}

  ${sectionOf({
    id: 'unbanded',
    title: 'Not in a band',
    blurb:
      'Findings whose band is not one this corpus declares. Nothing is dropped: a band the taxonomy does not name lands here, under its raw name.',
    items: unbanded,
    sides,
    runId,
    bands
  })}

  ${sectionOf({
    id: 'deferred',
    title: 'Deferred candidates',
    blurb:
      'Prototype capabilities the corpus never saw, carrying prototype-side evidence only. They have not had the frontend page model, the both-sides diff, the band or the adversarial verifier that every finding above has had, so they are shown separately and counted in no total.',
    items: candidates,
    sides,
    runId,
    bands
  })}

  ${sectionOf({
    id: 'withdrawn',
    title: 'Withdrawn',
    blurb:
      'Findings closed by evidence rather than by a person. Kept in the record so nobody re-raises them the next time the corpus runs.',
    items: withdrawn,
    sides,
    runId,
    bands
  })}

  <footer class="footer">
    <span>corpus <code>${esc(corpus)}</code> · run <code>${esc(runId)}</code> · schema <code>${esc(meta?.schemaVersion ?? '?')}</code> · tim <code>${esc(stamp.timVersion)}</code></span>
    <span>backlog <code>${esc(stamp.backlogSha.slice(0, 12))}</code>, ${esc(stamp.backlogMtime)}</span>
    <span>pins: ${Object.entries(meta?.pins ?? {})
      .map(([key, pin]) => `${esc(key)} <code>${esc(pin.short)}</code>`)
      .join(' · ')}</span>
    ${
      // A corpus whose findings were authored directly has no upstream file to
      // join to, and "0 of 133 matched" reads as a fault rather than as a
      // corpus that never had one.
      joinReport
        ? `<span>join: ${joinReport.matched} of ${joinReport.increments} increments matched a finding by title; an ordinal join would have matched ${joinReport.ordinalAgreement}.</span>`
        : ''
    }
    <span>generated ${esc(stamp.generatedAt)}</span>
  </footer>
</div>
<script>const RUN_ID = ${JSON.stringify(runId)};</script>
${
  standalone
    ? `<script>${CONTROLS_SCRIPT}</script>`
    : `<script src="${ASSET_JS}"></script>`
}
`
}
