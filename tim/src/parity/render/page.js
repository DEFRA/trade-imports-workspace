import { esc } from './prose.js'
import { renderCard } from './card.js'
import { THEME_CSS } from './theme.js'
import { spriteStyles } from './artifact.js'

const BANDS = [
  {
    id: 'frontend-only',
    label: 'Buildable now',
    blurb:
      'No dependency on a ruling or on the backend. These can be scheduled today.'
  },
  {
    id: 'needs-design-decision',
    label: 'Needs a decision',
    blurb:
      'Blocked on a ruling, not on code. This is the section the report exists for.'
  },
  {
    id: 'needs-backend',
    label: 'Needs backend',
    blurb:
      'Blocked on an API or persistence change before the frontend work can start.'
  }
]

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

const captureCard = (
  side,
  capture
) => `<div class="pin${capture.matchesPin ? '' : ' pin--unpushed'}">
  <span class="pin__repo">${esc(side)} pictures</span>
  <span class="pin__sha">${esc(capture.sha ?? 'none')} · ${capture.screenshots} shots, ${capture.models} page models, ${capture.deviceScaleFactor}x</span>
  <span class="pin__why">${
    capture.matchesPin
      ? 'Taken at the commit the citations point at.'
      : 'Taken at a different commit from the one the citations point at, so a picture that contradicts its finding is a signal to re-verify the finding, not a fault in the capture.'
  }</span>
  ${capture.note ? `<span class="pin__why">${esc(capture.note)}</span>` : ''}
</div>`

const sectionOf = ({ title, blurb, items, sides, runId, id }) => {
  if (items.length === 0) return ''
  return `<section class="section" id="${esc(id)}">
  <div class="section__head">
    <h2 class="section__title">${esc(title)} <span class="section__count">${items.length}</span></h2>
    <p class="section__blurb">${esc(blurb)}</p>
  </div>
  ${items.map((item) => renderCard({ item, sides, runId })).join('')}
</section>`
}

const rank = (item) => {
  const i = TYPE_ORDER.indexOf(item.type)
  return i === -1 ? TYPE_ORDER.length : i
}

const byGateThenType = (a, b) => {
  const gate =
    Number(Boolean(b.gate && !b.decision)) -
    Number(Boolean(a.gate && !a.decision))
  return gate || rank(a) - rank(b) || a.title.localeCompare(b.title)
}

const short = (sha) => (sha ? sha.slice(0, 12) : 'nothing')

/**
 * What moved, said in the terms that actually differ.
 *
 * A re-capture of the same frame prints the two hashes, because the frame
 * description is identical on both sides of the arrow and would read as though
 * nothing had happened. A reframe prints the frames, because the hashes are
 * two unrelated files and comparing them says nothing.
 */
const driftRow = (entry, titleOf) => {
  const what =
    entry.kind === 'frame-changed'
      ? `${esc(entry.was)} → ${esc(entry.now)}`
      : `same frame, new pixels — ${esc(short(entry.wasSha))} → ${esc(short(entry.nowSha))}`
  return `<li><a href="#${esc(entry.id)}"><code>${esc(entry.id)}</code></a> ${esc(titleOf(entry.id) ?? '')}
    <span class="drift__what">${esc(entry.side)}: ${what}</span></li>`
}

/**
 * Every picture that moved since the reader last saw it.
 *
 * This is the most important thing on the page. A reader who rules on a
 * finding under a picture that was swapped without them has been misled by the
 * report itself, so the drift is named — which side, from what to what — above
 * anything they might be here to do.
 *
 * @param {object[]} drift - Entries from the seal store
 * @param {object[]} items - Report items, for their titles
 * @param {string} runId - Named so the panel can print the command that clears it
 * @returns {string}
 */
const driftPanel = (drift, items, runId) => {
  if (!drift?.length) return ''
  const titles = new Map(items.map((item) => [item.id, item.title]))
  const findings = new Set(drift.map((entry) => entry.id))
  const reframed = drift.filter((entry) => entry.kind === 'frame-changed')
  return `<div class="drift">
  <strong>${drift.length} ${drift.length === 1 ? 'picture has' : 'pictures have'} changed since ${findings.size === 1 ? 'this finding was' : 'these findings were'} last shown.</strong>
  <p>Nobody should be asked to rule under a picture that was swapped without them, so they are listed here before anything else. Each carries a ribbon on the image itself.${
    reframed.length
      ? ` ${reframed.length} of them ${reframed.length === 1 ? 'is' : 'are'} a different frame rather than a re-capture of the same one — a different control, or a page where there was a crop.`
      : ''
  }</p>
  <ul class="drift__list">${drift
    .map((entry) => driftRow(entry, (id) => titles.get(id)))
    .join('')}</ul>
  <p class="drift__accept">Once you have looked, <code>tim parity report ${esc(runId)} --reseal</code> accepts them and clears this panel.</p>
</div>`
}

const CONTROLS_SCRIPT = `
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
 * @returns {string}
 */
export const renderPage = ({
  corpus,
  meta,
  counts,
  findings,
  withdrawn,
  candidates,
  joinReport,
  sides,
  runId,
  drift,
  target,
  inlining,
  stamp
}) => {
  const domains = [...new Set(findings.map((item) => item.domain))].sort()
  const types = [...new Set(findings.map((item) => item.type))].sort()

  const bandSections = BANDS.map((band) =>
    sectionOf({
      id: band.id,
      title: band.label,
      blurb: band.blurb,
      items: findings
        .filter((item) => item.band === band.id)
        .sort(byGateThenType),
      sides,
      runId
    })
  ).join('')

  const unbanded = findings.filter(
    (item) => !BANDS.some((band) => band.id === item.band)
  )

  return `<title>${esc(runId)} findings — ${esc(corpus)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${THEME_CSS}</style>
${spriteStyles(inlining?.sprites)}
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
        ? `<p class="masthead__note">This is the shareable copy. It carries every element crop inside the file and links the full-page screenshots, which live on the machine that built it — so the evidence it does not carry is named rather than quietly dropped. The ruling controls write to a backlog this copy cannot reach; rule from the local build.</p>`
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
    ${Object.entries(meta?.captures ?? {})
      .map(([side, capture]) => captureCard(side, capture))
      .join('')}
  </div>

  ${driftPanel(drift, [...findings, ...withdrawn], runId)}

  <div class="controls">
    <input type="search" id="q" placeholder="Search every finding…" aria-label="Search findings">
    <select data-filter="band" aria-label="Band"><option value="">All bands</option>${BANDS.map(
      (band) => `<option value="${esc(band.id)}">${esc(band.label)}</option>`
    ).join('')}</select>
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

  ${bandSections}

  ${sectionOf({
    id: 'unbanded',
    title: 'Not in a band',
    blurb:
      'Findings whose band is not one of the three the report knows about.',
    items: unbanded,
    sides,
    runId
  })}

  ${sectionOf({
    id: 'deferred',
    title: 'Deferred candidates',
    blurb:
      'Prototype capabilities the corpus never saw, carrying prototype-side evidence only. They have not had the frontend page model, the both-sides diff, the band or the adversarial verifier that every finding above has had, so they are shown separately and counted in no total.',
    items: candidates,
    sides,
    runId
  })}

  ${sectionOf({
    id: 'withdrawn',
    title: 'Withdrawn',
    blurb:
      'Findings closed by evidence rather than by a person. Kept in the record so nobody re-raises them the next time the corpus runs.',
    items: withdrawn,
    sides,
    runId
  })}

  <footer class="footer">
    <span>corpus <code>${esc(corpus)}</code> · run <code>${esc(runId)}</code> · schema <code>${esc(meta?.schemaVersion ?? '?')}</code> · tim <code>${esc(stamp.timVersion)}</code></span>
    <span>backlog <code>${esc(stamp.backlogSha.slice(0, 12))}</code>, ${esc(stamp.backlogMtime)}</span>
    <span>pins: ${Object.entries(meta?.pins ?? {})
      .map(([key, pin]) => `${esc(key)} <code>${esc(pin.short)}</code>`)
      .join(' · ')}</span>
    <span>join: ${joinReport.matched} of ${joinReport.increments} increments matched a finding by title; an ordinal join would have matched ${joinReport.ordinalAgreement}.</span>
    <span>generated ${esc(stamp.generatedAt)}</span>
    ${
      inlining
        ? `<span>artifact copy: ${inlining.inlined} element crops carried inside this file as WebP (${(inlining.bytes / 1024 / 1024).toFixed(1)} MB), shown ${inlining.uses} times; ${inlining.linked} full-page screenshots left where they are and linked. Nothing was downsized to fit.</span>`
        : ''
    }
    ${stamp.coverage
      .map(
        (c) =>
          `<span>images: ${esc(c.side)} ${c.have}/${c.want} cited screens${c.byState.model ? `, ${c.byState.model} as page-model plates` : ''}</span>`
      )
      .join('')}
  </footer>
</div>
<script>const RUN_ID = ${JSON.stringify(runId)};${CONTROLS_SCRIPT}</script>
`
}
