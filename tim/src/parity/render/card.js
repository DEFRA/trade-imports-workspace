import { esc, renderProse, markersIn } from './prose.js'
import { proseBlock, sourcesStrip, auditBlock } from './sections.js'

const BAND_LABEL = {
  'frontend-only': 'Buildable now',
  'needs-design-decision': 'Needs a decision',
  'needs-backend': 'Needs backend'
}

const chip = (text, modifier) =>
  text
    ? `<span class="chip${modifier ? ` ${modifier}` : ''}">${esc(text)}</span>`
    : ''

/**
 * The exact argument string that applies a ruling, with a copy control.
 *
 * This is the report becoming the batch ruling surface Sam asked for: read all
 * the gated findings in one page, collect the strings, apply them in one go.
 * next-decision.sh stays for the ones that need discussion.
 *
 * @param {object} args
 * @param {object} args.item
 * @param {string} args.runId
 * @returns {string}
 */
export const rulingControls = ({ item, runId }) => {
  const rulings = ['accept', 'reject', 'defer', 'falsified']
  const buttons = rulings
    .map(
      (ruling) =>
        `<button type="button" class="decision__rule" data-inc="${esc(item.id)}" data-ruling="${esc(ruling)}" aria-pressed="false">${esc(ruling)}</button>`
    )
    .join('')
  return `<div class="decision__apply">
  ${buttons}
  <code class="decision__cmd" data-cmd-for="${esc(item.id)}">tools/parity/rule-decision.sh ${esc(runId)} ${esc(item.id)} &lt;ruling&gt; --note "…"</code>
</div>`
}

/**
 * The decision block: one question, the options where the prose names them,
 * what stays blocked if it is not settled, and the argument string.
 *
 * @param {object} args
 * @returns {string}
 */
export const decisionBlock = ({ item, runId, citations }) => {
  if (item.decision) {
    return `<div class="ruling">
  <div class="ruling__head">Ruled ${esc(item.decision.ruling)}${item.decision.by ? ` by ${esc(item.decision.by)}` : ''}${item.decision.ruledAt ? ` · ${esc(item.decision.ruledAt.slice(0, 10))}` : ''}</div>
  ${renderProse({ text: item.decision.note, citations, idPrefix: item.id })}
</div>`
  }
  if (!item.gate) return ''

  const required = item.decisionRequired
  const question = required?.question
  const options = required?.options?.length
    ? `<ul class="decision__options">${required.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>`
    : ''
  const consequence = required?.consequence
    ? `<p class="decision__consequence">${esc(required.consequence)}</p>`
    : `<p class="decision__consequence">Stays blocked until it is settled${item.dependents.length ? `, and blocks ${item.dependents.map((d) => `<code>${esc(d)}</code>`).join(', ')}` : ''}.</p>`
  const source =
    required?.source === 'authored'
      ? '<p class="decision__source">Drafted from the falsifier during the migration — check this is the right question.</p>'
      : ''

  return `<div class="decision">
  <span class="decision__label">Decision needed · ${esc(item.gate)}</span>
  ${
    question
      ? `<p class="decision__question">${esc(question)}</p>`
      : `<p class="decision__question">No question has been written for this finding yet. Read the falsifier below — it always encodes the counterfactual.</p>`
  }
  ${options}
  ${consequence}
  ${source}
  ${rulingControls({ item, runId })}
</div>`
}

const plateRow = (row) => {
  const meta = []
  if (row.control) meta.push(row.control)
  if (row.name) meta.push(row.name)
  if (row.optionCount) meta.push(`${row.optionCount} options`)
  if (row.status) meta.push(row.status)
  const sample = row.options?.length
    ? `<span class="plate__meta"> — ${esc(row.options.join(', '))}${row.optionCount > row.options.length ? ', …' : ''}</span>`
    : ''
  return `<li class="plate__row">
  <span class="plate__kind">${esc(row.kind)}</span>
  <span class="plate__text">${esc(row.text)}${meta.length ? ` <span class="plate__meta">(${esc(meta.join(' · '))})</span>` : ''}${sample}</span>
</li>`
}

/**
 * One side of one picture row, at whatever state the evidence reached.
 *
 * @param {object} args
 * @param {object} args.asset
 * @param {object} args.side
 * @returns {string}
 */
export const shot = ({ asset, side }) => {
  const head = `<div class="shot__label"><span>${esc(side.label)}</span><span>${esc(asset.screen ?? '—')}</span></div>`

  if (asset.state === 'crop' || asset.state === 'page') {
    const caption =
      asset.state === 'crop'
        ? `Element crop · ${esc(asset.anchorKey ?? '')}`
        : 'Full page'
    // The tooltip only names the old frame on a reframe. On a re-capture the
    // old frame is the same words as the new one, and a tooltip that repeats
    // the caption reads as though nothing moved.
    const reframed = asset.driftKind === 'frame-changed'
    const drift = asset.drifted
      ? `<span class="ribbon"${reframed && asset.driftedFrom ? ` title="was: ${esc(asset.driftedFrom)}"` : ''}>${
          reframed
            ? 'different frame since you last looked'
            : 'changed since you last looked'
        }</span>`
      : ''
    // An insertion crop is a picture of something that is present, standing in
    // for something that is not. Outlined and captioned, because without both
    // it reads as a crop of the wrong control.
    const insertions = asset.insertions ?? []
    const figureClass = insertions.length
      ? 'shot__figure shot__figure--insertion'
      : 'shot__figure'

    const alt = `${esc(side.label)} — ${esc(asset.screen)}`
    // In the artifact the picture is declared once and pointed at, so it is a
    // labelled box rather than an img. Everywhere else it stays an img with an
    // anchor, because a full-resolution original is one click away.
    const picture = asset.spriteId
      ? `<div class="sprite" role="img" aria-label="${alt}" style="background-image:var(--${esc(asset.spriteId)})${asset.aspect ? `;aspect-ratio:${esc(asset.aspect)}` : ''}"></div>`
      : `<a href="${esc(asset.href)}"><img loading="lazy" src="${esc(asset.href)}" alt="${alt}"></a>`

    return `<div class="shot">${head}
  <figure class="${figureClass}" style="position:relative">${drift}
    ${picture}
    ${insertions
      .map(
        (insertion) =>
          `<p class="shot__insertion">${esc(insertion.caption)}</p>`
      )
      .join('')}
    <figcaption class="shot__caption">${insertions.length ? 'Where it would go' : caption}${asset.dsf ? ` · ${esc(asset.dsf)}x` : ''}</figcaption>
  </figure>
</div>`
  }

  // The artifact target carries element crops and not full pages. Saying so
  // beats shipping a downsized page shot nobody can read, and beats leaving
  // the column empty — which would claim there is nothing on this side.
  if (asset.state === 'page-link') {
    return `<div class="shot">${head}
  <div class="plate plate--elsewhere">
    <strong>Full page, not carried here</strong>
    <span>This screen has a full-page screenshot. It is 1 to 3 MB and there are dozens of them, so this copy of the report links to it rather than shrinking it to something unreadable.</span>
    <a href="${esc(asset.href)}"><code>${esc(asset.path)}</code></a>
  </div>
</div>`
  }

  if (asset.state === 'model') {
    const from = asset.modelsFrom
    return `<div class="shot">${head}
  <div class="plate">
    <ul class="plate__rows">${asset.plate.rows.map(plateRow).join('')}</ul>
  </div>
  <span class="shot__caption">Page model only — no screenshot exists for this screen yet. This is every heading, field and row the capture recorded, in document order.${
    from
      ? ` Read at <code>${esc(from.sha)}</code>, ${esc(from.how)}.${from.why ? ` ${esc(from.why)}` : ''}`
      : ''
  }</span>
</div>`
  }

  return `<div class="shot">${head}
  <div class="plate plate--absent">
    <span>${esc(asset.why ?? 'No evidence captured for this side.')}</span>
    ${asset.command ? `<code>${esc(asset.command)}</code>` : ''}
  </div>
</div>`
}

const frames = ({ item, sides }) => {
  if (!item.assets?.length) return ''
  const rows = item.assets
    .map(
      (row) =>
        `<div class="frame">${sides.map((side) => shot({ asset: row[side.id], side })).join('')}</div>`
    )
    .join('')
  return `<div class="frames">${rows}</div>`
}

const notesBlock = ({ item, citations }) => {
  if (!item.notes.length) return ''
  const body = item.notes
    .map(
      (note) =>
        `${renderProse({ text: note.note, citations, idPrefix: item.id })}<p class="audit__note">Recorded ${esc(note.at?.slice(0, 10) ?? '')}</p>`
    )
    .join('')
  return `<div class="block block--note">
  <span class="block__label">Since the corpus was captured</span>
  ${body}
</div>`
}

const relatedBlock = ({ item }) => {
  if (!item.relatedTo.length) return ''
  const rows = item.relatedTo
    .map(
      (relation) =>
        `<li><a href="#${esc(relation.id)}"><code>${esc(relation.id)}</code></a> — ${esc(relation.relation)}: ${esc(relation.why)}</li>`
    )
    .join('')
  return `<div class="block">
  <span class="block__label">Related findings</span>
  <ul class="decision__options">${rows}</ul>
</div>`
}

/**
 * Render one card. One renderer, three kinds — a live finding, a withdrawn one
 * and a deferred candidate — differing by which blocks they carry, never by
 * having a second renderer.
 *
 * @param {object} args
 * @param {object} args.item
 * @param {object[]} args.sides
 * @param {string} args.runId
 * @returns {string}
 */
export const renderCard = ({ item, sides, runId }) => {
  const citations = new Map(
    item.resolvedCitations.map((entry) => [entry.ref, entry])
  )
  for (const citation of item.citations) {
    const existing = citations.get(citation.ref) ?? {}
    citations.set(citation.ref, { ...citation, ...existing })
  }
  const resolved = new Map(
    item.resolvedCitations.map((entry) => [entry.ref, entry])
  )

  const idPrefix = item.id
  const s = item.sections

  // Every citation belongs to exactly one column, so a source is shown once.
  // A citation says which side it is about, or names a repo one side owns;
  // anything that answers to neither — a backend class, a captured page model —
  // goes to a strip of its own rather than being pushed into a side it is not
  // about.
  const sideOfCitation = (citation) => {
    if (citation.side && sides.some((side) => side.id === citation.side)) {
      return citation.side
    }
    return sides.find((side) => side.repo === citation.repo)?.id ?? null
  }

  const refsForSide = (sideId) =>
    item.citations
      .filter((citation) => sideOfCitation(citation) === sideId)
      .map((citation) => citation.ref)

  const unsidedRefs = item.citations
    .filter((citation) => sideOfCitation(citation) === null)
    .map((citation) => citation.ref)

  const columnFor = (side, section) => {
    const texts = section ? [section.text] : []
    return `<div class="column">
  <span class="column__label">${esc(side.label)}</span>
  ${section ? renderProse({ text: section.text, citations, idPrefix }) : '<p class="plate__meta">Not described separately yet. The sources below are what this finding points at on this side.</p>'}
  ${sourcesStrip({ texts, citations: item.citations, resolved, idPrefix, extraRefs: refsForSide(side.id) })}
</div>`
  }

  // Two fixed columns, always both, whether or not the prose has been split.
  // Collapsing to one would read as a claim that there is nothing on that side.
  const twoColumn = `<div class="columns">${sides
    .map((side) => columnFor(side, s[side.id]))
    .join('')}</div>`

  const otherSources = unsidedRefs.length
    ? `<div class="block">
  <span class="block__label">Other sources</span>
  ${sourcesStrip({ texts: [], citations: item.citations, resolved, idPrefix, extraRefs: unsidedRefs })}
</div>`
    : ''

  // Before the structure migration runs, the finding is one block describing
  // both sides. Rendering it as one block is honest; splitting it into two
  // columns would claim a split that has not happened. Its citations are shown
  // once, under the column they belong to, rather than again here.
  const unsplit = s.body
    ? `<div class="block">
  ${renderProse({ text: s.body.text, citations, idPrefix })}
</div>`
    : ''

  const chips = [
    chip(
      BAND_LABEL[item.band] ?? item.band,
      item.band ? `chip--band chip--band-${item.band}` : ''
    ),
    chip(item.type),
    chip(item.domain),
    chip(item.milestone),
    chip(item.confidence ? `${item.confidence} confidence` : null),
    item.gate && !item.decision
      ? chip(`awaiting ${item.gate}`, 'chip--gate')
      : '',
    item.decision ? chip(`ruled ${item.decision.ruling}`, 'chip--ruled') : '',
    item.kind === 'candidate' ? chip('deferred candidate') : '',
    item.kind === 'withdrawn' ? chip('withdrawn') : ''
  ]
    .filter(Boolean)
    .join('')

  const searchText = [
    item.id,
    item.title,
    item.domain,
    item.type,
    item.band,
    item.detail
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return `<article class="card card--${esc(item.kind)}" id="${esc(item.anchor)}"
  data-kind="${esc(item.kind)}" data-band="${esc(item.band ?? '')}" data-type="${esc(item.type ?? '')}"
  data-domain="${esc(item.domain ?? '')}" data-gate="${esc(item.gate ?? '')}"
  data-ruled="${item.decision ? 'yes' : 'no'}" data-search="${esc(searchText)}">
  <header class="card__head">
    <div class="card__idline">
      <a class="card__id" href="#${esc(item.anchor)}">${esc(item.id)}</a>
    </div>
    <h3 class="card__title">${esc(item.title)}</h3>
    <div class="chips">${chips}</div>
  </header>
  <div class="card__body">
    ${decisionBlock({ item, runId, citations })}
    ${unsplit}
    ${item.kind === 'candidate' ? '' : twoColumn}
    ${otherSources}
    ${frames({ item, sides })}
    ${proseBlock({ label: 'What differs', section: s.difference, citations, idPrefix })}
    ${proseBlock({ label: 'Corrected by verification', section: s.correction, citations, idPrefix, modifier: 'correction' })}
    ${notesBlock({ item, citations })}
    ${proseBlock({ label: 'This finding is wrong if', section: s.falsifiedBy, citations, idPrefix, modifier: 'falsifier' })}
    ${relatedBlock({ item })}
    ${auditBlock({ section: s.verification, citations, idPrefix })}
    ${meta({ item })}
  </div>
</article>`
}

const meta = ({ item }) => {
  const rows = []
  if (item.screens.length) {
    rows.push(
      `<span class="plate__meta">Screens: ${item.screens.map((s) => `<code>${esc(s)}</code>`).join(' ')}</span>`
    )
  }
  if (item.dependsOn.length) {
    rows.push(
      `<span class="plate__meta">Depends on: ${item.dependsOn.map((d) => `<a href="#${esc(d)}"><code>${esc(d)}</code></a>`).join(' ')}</span>`
    )
  }
  if (item.dependents.length) {
    rows.push(
      `<span class="plate__meta">Blocks: ${item.dependents.map((d) => `<a href="#${esc(d)}"><code>${esc(d)}</code></a>`).join(' ')}</span>`
    )
  }
  if (rows.length === 0) return ''
  return `<div class="block">${rows.join('<br>')}</div>`
}

export const unusedMarkers = (item) =>
  markersIn(item.detail ?? '').filter(
    (ref) => !item.citations.some((citation) => citation.ref === ref)
  )
