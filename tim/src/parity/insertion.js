/**
 * A hidden crumb or sort field is machinery, not something on the page, so it
 * is never an insertion point and never a shared landmark.
 *
 * @param {{kind?: string, name?: string}} field
 * @returns {boolean}
 */
export const isVisibleControl = (field) =>
  field.kind !== 'hidden' && field.name !== 'crumb'

const visible = isVisibleControl

const key = (field) => field.name ?? `unnamed:${field.label ?? ''}`

const anchorFor = (field) =>
  field.name && !field.name.startsWith('unnamed:')
    ? { kind: 'field', name: field.name }
    : { kind: 'label', text: field.label ?? '' }

// The same key the crop files on disk are named by — see anchorKey in
// anchors.js. A field keeps only its letters and digits, so a crop of
// `cphNumber-county` is looked up under the one name both stages compute.
const anchorKey = (anchor) =>
  anchor.kind === 'field'
    ? `field-${String(anchor.name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')}`
    : `label-${String(anchor.text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`

/**
 * Where on the empty side a one-sided control would sit.
 *
 * "The prototype has X and we do not" is only half a finding. The other half
 * is where X would go, and a reader cannot see an absence: a crop of the
 * missing control plus a crop of the place it belongs is what makes the claim
 * legible.
 *
 * The answer is derived from the two page models, and its confidence is part
 * of the answer. A landmark that appears on both sides pins the position
 * exactly. Where the page shares no landmark at all, the honest answer is
 * weaker and says so, rather than inventing a position.
 *
 * @param {object} args
 * @param {object} args.missing - The field delta, from the side that has it
 * @param {object} args.sourceModel - Page model of the side that has it
 * @param {object} args.targetModel - Page model of the side that does not
 * @returns {object|null}
 */
export const insertionPoint = ({ missing, sourceModel, targetModel }) => {
  const source = (sourceModel?.allFields ?? []).filter(visible)
  const target = (targetModel?.allFields ?? []).filter(visible)
  if (target.length === 0) {
    return {
      relation: 'page',
      anchor: null,
      why: 'The page on this side has no fields at all, so there is nowhere on it to point.'
    }
  }

  const shared = new Set(target.map(key))
  const at = source.findIndex((field) => key(field) === key(missing))

  if (at >= 0) {
    for (let i = at - 1; i >= 0; i -= 1) {
      if (shared.has(key(source[i]))) {
        return landmark({ target, field: source[i], relation: 'after' })
      }
    }
    for (let i = at + 1; i < source.length; i += 1) {
      if (shared.has(key(source[i]))) {
        return landmark({ target, field: source[i], relation: 'before' })
      }
    }
  }

  // Nothing on this page appears on both sides, so the position cannot be
  // derived. Pointing at where the page's fields begin is still worth more
  // than a whole-page shot, as long as the caption does not pretend it is the
  // insertion point.
  const first = target[0]
  return {
    relation: 'at',
    anchor: { ...anchorFor(first), key: anchorKey(anchorFor(first)) },
    named: first.label ?? first.name,
    why: "No field on this page appears on both sides, so this crop shows where the page's own fields begin rather than where the missing one would go."
  }
}

const landmark = ({ target, field, relation }) => {
  const match = target.find((candidate) => key(candidate) === key(field))
  const anchor = anchorFor(match ?? field)
  return {
    relation,
    anchor: { ...anchor, key: anchorKey(anchor) },
    named: match?.label ?? match?.name ?? field.name,
    why: null
  }
}

/**
 * A list of names as a person would say it.
 *
 * One anchor routinely carries several absences — the prototype's County,
 * Parish and Holding number all land on the frontend's single CPH field — and
 * three near-identical captions under one crop is three times the reading for
 * one fact.
 *
 * @param {string[]} names
 * @returns {string}
 */
export const listOf = (names) => {
  // Deduplicated: two controls with different `name` attributes and the same
  // visible label are one thing to a reader, and "no Keyword or reference or
  // Keyword or reference" is not a sentence.
  const unique = [...new Set(names.filter(Boolean))]
  return unique.length <= 1
    ? (unique[0] ?? '')
    : `${unique.slice(0, -1).join(', ')} or ${unique[unique.length - 1]}`
}

/**
 * How the card says it.
 *
 * @param {object} args
 * @param {object} args.point
 * @param {string|string[]} args.missingLabel
 * @returns {string}
 */
export const insertionCaption = ({ point, missingLabel }) => {
  const missing = listOf([missingLabel].flat())
  if (!point || point.relation === 'page') {
    return `This side has no ${missing}, and no field on this page to place it against.`
  }
  if (point.relation === 'at') {
    return `This side has no ${missing}. ${point.why}`
  }
  return `This side has no ${missing}. It would sit ${point.relation} ${point.named}.`
}

/**
 * Collapse one anchor's absences into the captions a reader would want.
 *
 * Grouped by where they would go, so three fields that all land in the same
 * place read as one sentence, and two that land in different places stay two.
 *
 * @param {object} anchor - Mutated in place
 */
export const summarise = (anchor) => {
  const groups = new Map()
  for (const insertion of anchor.insertions) {
    const at = `${insertion.point.relation} ${insertion.point.named ?? ''}`
    groups.set(at, [...(groups.get(at) ?? []), insertion])
  }
  anchor.insertions = [...groups.values()].map((group) => ({
    missing: group.map((entry) => entry.missing),
    relation: group[0].point.relation,
    named: group[0].point.named,
    caption: insertionCaption({
      point: group[0].point,
      missingLabel: group.map((entry) => entry.missingLabel)
    })
  }))
}

/**
 * Fold insertion anchors into the anchors already declared for a screen.
 *
 * An anchor that is already there keeps its own reason and gains the
 * insertions, because a control can be both a difference in its own right and
 * the landmark another finding's absence is measured from.
 *
 * @param {Record<string, object[]>} existing
 * @param {Record<string, object[]>} extra
 * @returns {Record<string, object[]>}
 */
export const mergeAnchors = (existing, extra) => {
  const out = { ...existing }
  for (const [screen, list] of Object.entries(extra)) {
    const current = [...(out[screen] ?? [])]
    for (const anchor of list) {
      const at = current.findIndex((entry) => entry.key === anchor.key)
      if (at >= 0) {
        current[at] = { ...current[at], insertions: anchor.insertions }
      } else {
        current.push(anchor)
      }
    }
    out[screen] = current
  }
  return out
}
