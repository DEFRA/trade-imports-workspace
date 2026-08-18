import { esc, renderProse, markersIn } from './prose.js'

/**
 * One labelled block of prose. Returns nothing at all when the slot is empty,
 * so a card degrades by omitting a block rather than by printing a heading with
 * nothing under it.
 *
 * @param {object} args
 * @param {string} args.label
 * @param {object|null} args.section - {text, source}
 * @param {Map} args.citations
 * @param {string} args.idPrefix
 * @param {string} [args.modifier] - falsifier | correction | note
 * @returns {string}
 */
export const proseBlock = ({
  label,
  section,
  citations,
  idPrefix,
  modifier
}) => {
  if (!section) return ''
  const cls = modifier ? `block block--${modifier}` : 'block'
  return `<div class="${cls}">
  <span class="block__label">${esc(label)}</span>
  ${renderProse({ text: section.text, citations, idPrefix })}
</div>`
}

const stateLabel = {
  resolved: 'at the pinned commit',
  dead: 'file not at that commit',
  unresolved: 'could not resolve',
  'too-long': 'too long to inline',
  capture: 'captured page model',
  unpinned: 'repo not pinned'
}

const snippetHtml = (snippet) => {
  if (!snippet?.lines?.length) return ''
  const lines = snippet.lines
    .map(
      (line) =>
        `<div class="snippet__line ${line.focus ? 'snippet__line--focus' : 'snippet__line--context'}"><span class="snippet__n">${line.n}</span><span>${esc(line.text)}</span></div>`
    )
    .join('')
  const body = `<div class="snippet">${lines}</div>`
  return snippet.state === 'collapsed'
    ? `<details class="source__more"><summary>Show ${snippet.span} lines</summary>${body}</details>`
    : body
}

/**
 * One source entry: the reference, a permalink, and the code it points at.
 *
 * The point of the strip is that a claim is checked without leaving the
 * paragraph. Every citation the old page rendered was inert <code> with no link
 * and no snippet, so checking anything meant leaving the page.
 *
 * @param {object} args
 * @param {object} args.citation - The stored citation
 * @param {object|null} args.resolved - Its entry in evidence.json
 * @param {string} args.idPrefix
 * @returns {string}
 */
export const sourceEntry = ({ citation, resolved, idPrefix }) => {
  const state = resolved?.state ?? 'unresolved'
  const classes = [
    'source',
    state === 'dead' ? 'source--dead' : '',
    state === 'unresolved' ? 'source--unresolved' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const path = citation.path ?? citation.asWritten
  const linked = resolved?.url
    ? `<a class="source__path" href="${esc(resolved.url)}">${esc(path)}</a>`
    : `<span class="source__path">${esc(path)}</span>`

  const why = resolved?.why ?? citation.why
  const candidates = citation.candidates?.length
    ? `<div class="source__head"><span class="plate__meta">Candidates: ${citation.candidates.map((c) => `<code>${esc(c)}</code>`).join(' ')}</span></div>`
    : ''

  return `<div class="${classes}" id="${esc(idPrefix)}-src-${esc(citation.ref)}">
  <div class="source__head">
    <span class="source__n">${esc(citation.ref.slice(1))}</span>
    ${linked}
    <span class="source__state">${esc(stateLabel[state] ?? state)}</span>
  </div>
  ${why ? `<div class="source__head"><span class="plate__meta">${esc(why)}</span></div>` : ''}
  ${candidates}
  ${snippetHtml(resolved?.snippet)}
</div>`
}

/**
 * The sources strip for one column, holding only the citations that column's
 * prose actually cites, numbered as the prose numbers them.
 *
 * @param {object} args
 * @param {string[]} args.texts - The prose blocks in this column
 * @param {object[]} args.citations
 * @param {Map} args.resolved
 * @param {string} args.idPrefix
 * @returns {string}
 */
export const sourcesStrip = ({
  texts,
  citations,
  resolved,
  idPrefix,
  extraRefs = []
}) => {
  const refs = []
  for (const text of texts) {
    for (const ref of markersIn(text)) {
      if (!refs.includes(ref)) refs.push(ref)
    }
  }
  // The two evidence pointers are the finding's own answer to "where do I
  // look", and 11 of the 96 findings cite nothing inside their prose at all.
  // Without this they would be the only citations on the page with no strip.
  for (const ref of extraRefs) if (!refs.includes(ref)) refs.push(ref)
  if (refs.length === 0) return ''
  const byRef = new Map(citations.map((citation) => [citation.ref, citation]))
  const entries = refs
    .map((ref) => byRef.get(ref))
    .filter(Boolean)
    .map((citation) =>
      sourceEntry({ citation, resolved: resolved.get(citation.ref), idPrefix })
    )
  return `<div class="sources">${entries.join('')}</div>`
}

/**
 * The verification prose, collapsed and labelled as a verbatim audit record.
 *
 * 97 entries of dense adversarial prose — the best-written text in the corpus —
 * that the page this replaces has never rendered at all.
 *
 * @param {object} args
 * @returns {string}
 */
export const auditBlock = ({ section, citations, idPrefix }) => {
  if (!section) return ''
  return `<details class="audit">
  <summary>How this was checked</summary>
  <div class="audit__body">
    ${renderProse({ text: section.text, citations, idPrefix })}
    <p class="audit__note">Verbatim audit record, written by an adversarial reader whose instruction was to refute the finding. Never rewritten.</p>
  </div>
</details>`
}
