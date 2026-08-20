import {
  accessibleTextOf,
  closestMatching,
  elementsOf,
  formControlsIn,
  matchesSelector,
  normaliseText,
  textOf
} from './dom.js'

/**
 * Ancestors worth cropping to, nearest first.
 *
 * A crop of the bare input is not evidence — the label, the hint and the error
 * are the finding. Walking up to the form group gets all of it, and the wider
 * containers catch a control that sits outside one.
 *
 * Lives here rather than beside the screenshot code because it is also how
 * ambiguity is counted: two matches inside one form group are one place on the
 * page, and two matches in different task-list rows are two.
 */
export const CROP_ANCESTORS = [
  '.govuk-form-group',
  'fieldset',
  '.govuk-radios',
  '.govuk-checkboxes',
  '.govuk-summary-list__row',
  '.govuk-task-list__item',
  '.govuk-details',
  '.govuk-inset-text',
  '.govuk-notification-banner',
  '.govuk-error-summary',
  '.govuk-phase-banner',
  '.govuk-button-group',
  '.govuk-panel',
  '.govuk-warning-text',
  '.govuk-summary-card',
  '.govuk-pagination'
]

/**
 * How a named control is looked for, most specific first.
 *
 * A finding names a control the way a person would: `portOfExit`, or "Save and
 * add another", or "Cannot start yet". Every one of those is a legitimate name
 * for something on the page, and each is most likely to mean a different sort
 * of thing. The order below is the order of how much structural evidence a
 * match carries, and the first rung that matches anything wins.
 *
 * 1. `field` — a form control's `name`. An attribute, not prose. It is the one
 *    identifier on the page that cannot be coincidence.
 * 2. `label` — the text bound to a form control. A match here is a control,
 *    because the binding says so.
 * 3. `action` — a button or a link, by the text a person reads on it. This
 *    comes before every static rung on purpose: a finding that says "Continue"
 *    means the button, and a paragraph that happens to say "continue" is not
 *    the finding. A crop of the paragraph would be worse than no crop, because
 *    it reads as evidence.
 * 4. `heading` — a heading or a caption. A page landmark, and close to unique.
 * 5. `row` — a summary-list key or a task-list row. Repeated furniture, but
 *    each instance is still a labelled thing rather than loose prose.
 * 6. `status` — a tag or a task status. Repeated furniture with a small fixed
 *    vocabulary, which is exactly why it ranks below the rungs that identify
 *    one thing.
 * 7. `text` — any element whose own text is exactly the string. The rung with
 *    no structural evidence at all, so it is last, it is exact-match only, and
 *    it refuses to guess between several matches.
 */
export const RESOLUTION_ORDER = [
  { role: 'field', selector: null },
  { role: 'label', selector: null },
  {
    role: 'action',
    selector:
      'a[href], button, input[type="submit"], input[type="button"], [role="button"], [role="link"]'
  },
  {
    role: 'heading',
    selector:
      'h1, h2, h3, h4, h5, h6, [role="heading"], .govuk-caption-xl, .govuk-caption-l, .govuk-caption-m'
  },
  {
    role: 'row',
    selector:
      '.govuk-summary-list__key, .govuk-summary-list__row, .govuk-task-list__item, .govuk-task-list__name-and-hint, dt, th'
  },
  {
    role: 'status',
    selector: '.govuk-tag, .govuk-task-list__status, .app-tag'
  },
  { role: 'text', selector: '*' }
]

export const ROLES = RESOLUTION_ORDER.map((rung) => rung.role)

/**
 * The anchor kinds an author may write by hand.
 *
 * Two, not seven. A kind says how the string was meant — a `name` attribute or
 * something a person reads — and the ladder above decides what sort of thing
 * on the page answers to it. Asking an author to know whether "Continue" is a
 * button or a link would be asking them to hold the markup in their head while
 * they write prose about the design.
 */
export const ANCHOR_KINDS = ['field', 'label']

const selectorByRole = Object.fromEntries(
  RESOLUTION_ORDER.map((rung) => [rung.role, rung.selector])
)

/**
 * The selector one role is found by, or null for the two rungs that are not a
 * question about an element's type.
 *
 * @param {string} role
 * @returns {string|null}
 */
export const selectorFor = (role) => selectorByRole[role] ?? null

/**
 * Elements a person never reads.
 *
 * A form carries a visually hidden submit button so that pressing Enter does
 * the safe thing, and it is the first "Save and finish" in the markup. It is
 * one pixel square and marked aria-hidden, so it is not what a finding about
 * the Save and finish button means — but it comes first in document order,
 * which is exactly what makes it dangerous. A crop of it is a sliver of
 * whitespace filed under a real control's name.
 */
export const HIDDEN_FROM_READERS =
  '[aria-hidden="true"], .govuk-visually-hidden, .govuk-skip-link'

/**
 * Whether an element, or anything it sits inside, is hidden from readers.
 *
 * @param {object} node
 * @returns {boolean}
 */
export const isHiddenFromReaders = (node) =>
  closestMatching(node, HIDDEN_FROM_READERS) !== null

/**
 * The same selector with everything a reader never sees taken out of it.
 *
 * Used to build the live-browser locators, so the crop stage skips the same
 * elements the classifier does. It only excludes the element itself, not its
 * ancestors — CSS cannot say "not inside one of these" — but the elements that
 * cause the trouble carry the class themselves.
 *
 * @param {string} selector
 * @returns {string}
 */
export const excludingHidden = (selector) =>
  selector
    .split(',')
    .map(
      (part) =>
        `${part.trim()}:not([aria-hidden="true"]):not(.govuk-visually-hidden):not(.govuk-skip-link)`
    )
    .join(', ')

/**
 * A string short enough that matching its start would match half the page.
 *
 * "CPH" as a prefix hits "CPH number", "CPH numbers" and every sentence that
 * opens with it. Below this length only an exact match counts.
 */
export const MIN_PREFIX_LENGTH = 4

/**
 * How well one piece of text answers to a name.
 *
 * Exact is the whole text. Prefix is the text a component adds to — "Change"
 * on a link whose full text is "Change exit details", a task row whose text
 * carries its own hint — and it requires a word break, so "Change" never
 * matches "Changes".
 *
 * @param {string} found - The element's text
 * @param {string} wanted - The name the finding wrote
 * @returns {'exact'|'prefix'|null}
 */
export const matchStrength = (found, wanted) => {
  const actual = normaliseText(found).toLowerCase()
  const name = normaliseText(wanted).toLowerCase()
  if (name === '') return null
  if (actual === name) return 'exact'
  if (name.length < MIN_PREFIX_LENGTH) return null
  if (!actual.startsWith(name)) return null
  return /^[\s\W]/.test(actual.slice(name.length)) ? 'prefix' : null
}

/**
 * A regular expression the live browser can be asked the same question with.
 *
 * Whitespace in the name is relaxed, because the DOM's indentation is not part
 * of what a person reads and Playwright matches a regex against text that
 * still carries it.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.exact] - Anchor the end as well as the start
 * @returns {RegExp}
 */
export const textPattern = (text, { exact = false } = {}) => {
  const escaped = normaliseText(text)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/ /g, '\\s+')
  return new RegExp(`^\\s*${escaped}${exact ? '\\s*$' : '(?=[\\s\\W]|$)'}`, 'i')
}

const fieldNameMatches = (node, name) => {
  const actual = node.attrs.name ?? ''
  if (actual === '') return false
  return (
    actual === name ||
    actual.startsWith(`${name}-`) ||
    actual.startsWith(`${name}[`)
  )
}

/**
 * A hidden crumb or sort field is machinery, not something on the page.
 *
 * @param {object} node
 * @returns {boolean}
 */
const isMachinery = (node) =>
  node.attrs.name === 'crumb' || isHiddenFromReaders(node)

const candidatesForField = (doc, name) =>
  formControlsIn(doc.elements).filter(
    (node) =>
      fieldNameMatches(node, name) === true && isMachinery(node) === false
  )

const candidatesForLabel = (doc, text) => {
  const wanted = normaliseText(text).toLowerCase()
  return formControlsIn(doc.elements).filter(
    (node) =>
      isMachinery(node) === false &&
      (doc.labels.get(node) ?? []).some((label) =>
        label.toLowerCase().includes(wanted)
      )
  )
}

const innermostOnly = (nodes) => {
  const held = new Set(nodes)
  return nodes.filter(
    (node) => elementsOf(node).some((child) => held.has(child)) === false
  )
}

const candidatesForRole = (doc, role, text) => {
  const selector = selectorFor(role)
  const scored = doc.elements
    .filter(
      (node) =>
        matchesSelector(node, selector) === true &&
        isHiddenFromReaders(node) === false
    )
    .map((node) => ({
      node,
      strength: matchStrength(
        role === 'action' ? accessibleTextOf(node) : textOf(node),
        text
      )
    }))
    .filter((entry) => entry.strength !== null)

  // The last rung has no structural evidence, so it is exact-match only, and
  // it keeps the smallest element that says the string rather than every
  // ancestor that contains it.
  if (role === 'text') {
    const exact = scored.filter((entry) => entry.strength === 'exact')
    return innermostOnly(exact.map((entry) => entry.node))
  }

  const exact = scored.filter((entry) => entry.strength === 'exact')
  const chosen = exact.length > 0 ? exact : scored
  return chosen.map((entry) => entry.node)
}

/**
 * The place on the page a crop of this element would frame.
 *
 * Two matches inside one form group are one place; two matches in different
 * task-list rows are two. Counting places rather than elements is what stops a
 * radio group of eight inputs being reported as eight ambiguous matches.
 *
 * @param {object} node
 * @returns {object}
 */
export const cropContainerOf = (node) => {
  for (const selector of CROP_ANCESTORS) {
    const found = closestMatching(node, selector)
    if (found !== null) return found
  }
  return node
}

const distinctPlaces = (nodes) => new Set(nodes.map(cropContainerOf)).size

/**
 * Find the control a finding named, on one captured page.
 *
 * Walks {@link RESOLUTION_ORDER} and stops at the first rung that matches
 * anything, so a string that could be read several ways is read the most
 * specific way the page supports.
 *
 * **An ambiguous match is refused on every rung.** Where a name lands in more
 * than one place on the page, nothing here knows which one the finding meant,
 * and the crop that results is arbitrary.
 *
 * This used to refuse only on the last rung, on the argument that instances of
 * one role with one name are interchangeable — the seventh "Not yet started"
 * tag says nothing the first does not. That argument does not survive contact
 * with a real page: "Change" landed in 27 distinct places on one check-answers
 * screen and the finding was about one of them. Sam's report after reading a
 * corpus of them was that the crops "reliably caught the wrong things".
 *
 * A crop that is right by luck is not worth a crop that is wrong by luck, so
 * the ambiguous case now falls back to the whole page **and says why**. The
 * author's remedy is to name a control that resolves to one place; the count
 * is carried out either way so `anchors` can print what it refused and the
 * reader can see the difference between "no crop" and "no crop, because the
 * name means six things".
 *
 * A repeated `name` attribute is not ambiguity: {@link distinctPlaces} counts
 * crop containers, so a radio group's five inputs are one place and still crop.
 *
 * @param {object} args
 * @param {object} args.doc - From {@link parseDocument}
 * @param {{kind: string, name?: string, text?: string}} args.anchor
 * @returns {{role: string, node: object, places: number, refused: false}|{role: string, places: number, refused: true}|null}
 */
export const resolveOnPage = ({ doc, anchor }) => {
  const named = anchor.name ?? anchor.text ?? ''
  for (const { role } of RESOLUTION_ORDER) {
    // A name attribute is a thing only a field anchor can be asking about, and
    // a phrase with spaces in it is never one.
    if (role === 'field' && anchor.kind !== 'field') continue

    const found =
      role === 'field'
        ? candidatesForField(doc, named)
        : role === 'label'
          ? candidatesForLabel(doc, named)
          : candidatesForRole(doc, role, named)

    if (found.length === 0) continue
    const places = distinctPlaces(found)
    if (places > 1) return { role, places, refused: true }
    return { role, node: found[0], places, refused: false }
  }
  return null
}

/** Roles that pin a position on the page well enough to measure against. */
const LANDMARK_ROLES = ['action', 'heading', 'row', 'status']

/**
 * A name long enough to be prose rather than a name. Past this a landmark is
 * a paragraph, and no reader would point at it and call it a thing.
 */
export const MAX_LANDMARK_LENGTH = 80

/**
 * The stand-ins `maskVolatile` writes over values that change run to run — see
 * VOLATILE in capture/page-model.js.
 *
 * They keep the captured DOM's hash stable, which is what makes a changed hash
 * mean the application changed. But they are not on the live page: a landmark
 * named after one is a name the crop stage can never find, and it would arrive
 * as "no element matched this anchor" every single run.
 */
export const MASK_SENTINELS = ['GBN-XX-00-REFERENCE', 'UUID']

const isMasked = (text) =>
  MASK_SENTINELS.some((sentinel) => text.includes(sentinel))

/** Where a page's own content starts, as against the chrome around it. */
export const MAIN_CONTENT_SELECTOR = 'main, #main-content, [role="main"]'

/**
 * Every anchorable thing on one page, in document order.
 *
 * This is what an insertion point is measured against. It is deliberately
 * wider than the form controls: a heading the prototype has and the frontend
 * does not is an absence a reader can be shown, and it can only be placed if
 * the things either side of it are in the same list.
 *
 * Only the page's own content counts. The skip link, the GOV.UK header and the
 * footer are on every page of both applications, so counting them as landmarks
 * does two wrong things at once: it makes two pages that share nothing look as
 * though they share something, and it makes the skip link the first thing on
 * every page — which is what a crop points at when the position cannot be
 * derived. A blue rectangle off the top-left corner is not evidence.
 *
 * @param {object} doc - From {@link parseDocument}
 * @returns {Array<{key: string, anchor: object, label: string}>}
 */
export const landmarksIn = (doc) => {
  const main = doc.elements.find((node) =>
    matchesSelector(node, MAIN_CONTENT_SELECTOR)
  )
  const within = main === undefined ? doc.elements : elementsOf(main)
  const controls = new Set(formControlsIn(within))
  const out = []
  const seen = new Set()

  const push = (key, anchor, label) => {
    if (seen.has(key) || label === '') return
    seen.add(key)
    out.push({ key, anchor, label })
  }

  for (const node of within) {
    if (controls.has(node) && isMachinery(node) === false && node.attrs.name) {
      const labels = doc.labels.get(node) ?? []
      push(
        `field:${node.attrs.name}`,
        { kind: 'field', name: node.attrs.name, role: 'field' },
        labels[0] ?? node.attrs.name
      )
      continue
    }
    const role = LANDMARK_ROLES.find((candidate) =>
      matchesSelector(node, selectorFor(candidate))
    )
    if (role === undefined) continue
    const text = role === 'action' ? accessibleTextOf(node) : textOf(node)
    // A whole task-list row's text carries its hint too. Long strings are
    // prose, not names, and a landmark nobody could name is no use as one.
    if (text === '' || text.length > MAX_LANDMARK_LENGTH) continue
    if (isMasked(text)) continue
    push(`${role}:${text.toLowerCase()}`, { kind: 'label', text, role }, text)
  }

  return out
}

/**
 * The landmark one resolved element is, so an absence can be measured from it.
 *
 * Always answers for a resolved element, so a heading or a button the other
 * side has and this one does not is placed as precisely as an absent input.
 *
 * @param {object} args
 * @param {object} args.doc
 * @param {object} args.found - From {@link resolveOnPage}
 * @returns {{key: string, anchor: object, label: string}|null}
 */
export const landmarkFor = ({ doc, found }) => {
  if (!found || found.refused) return null
  const { node, role } = found
  const name = node.attrs.name
  if ((role === 'field' || role === 'label') && name) {
    return {
      key: `field:${name}`,
      anchor: { kind: 'field', name, role: 'field' },
      label: (doc.labels.get(node) ?? [])[0] ?? name
    }
  }
  const text =
    role === 'action' || role === 'label'
      ? accessibleTextOf(node)
      : textOf(node)
  return {
    key: `${role}:${text.toLowerCase()}`,
    anchor: { kind: 'label', text, role },
    label: text
  }
}
