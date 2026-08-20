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
 * One page model's fields as the ordered landmarks this module works in.
 *
 * A page model is a fixed vocabulary, so it can only ever offer fields. The
 * captured DOM offers headings, buttons, rows and tags as well, and those
 * arrive already in this shape from `landmarksIn` in resolution.js. Both go
 * through the same algorithm below.
 *
 * @param {object|null} model
 * @returns {Array<{key: string, anchor: object, label: string}>}
 */
export const landmarksFromModel = (model) =>
  (model?.allFields ?? []).filter(visible).map((field) => ({
    key: key(field),
    anchor: anchorFor(field),
    label: field.label ?? field.name ?? ''
  }))

const asLandmark = (entry) =>
  entry !== null && entry !== undefined && entry.key !== undefined
    ? entry
    : {
        key: key(entry ?? {}),
        anchor: anchorFor(entry ?? {}),
        label: entry?.label ?? entry?.name ?? ''
      }

/**
 * Where on the empty side a one-sided control would sit.
 *
 * "The prototype has X and we do not" is only half a finding. The other half
 * is where X would go, and a reader cannot see an absence: a crop of the
 * missing control plus a crop of the place it belongs is what makes the claim
 * legible.
 *
 * The answer is derived from the two pages, and its confidence is part of the
 * answer. A landmark that appears on both sides pins the position exactly.
 * Where the page shares no landmark at all, the honest answer is weaker and
 * says so, rather than inventing a position.
 *
 * Give it either two page models or two landmark lists. The lists are what the
 * captured DOM produces and they carry more than fields, so an absent heading
 * or button can be placed as precisely as an absent input.
 *
 * @param {object} args
 * @param {object} args.missing - The thing that is absent, from the side that has it
 * @param {object} [args.sourceModel] - Page model of the side that has it
 * @param {object} [args.targetModel] - Page model of the side that does not
 * @param {object[]} [args.sourceLandmarks] - In place of sourceModel
 * @param {object[]} [args.targetLandmarks] - In place of targetModel
 * @returns {object|null}
 */
export const insertionPoint = ({
  missing,
  sourceModel,
  targetModel,
  sourceLandmarks,
  targetLandmarks
}) => {
  const source = sourceLandmarks ?? landmarksFromModel(sourceModel)
  const target = targetLandmarks ?? landmarksFromModel(targetModel)
  if (target.length === 0) {
    return {
      relation: 'page',
      anchor: null,
      why: 'The page on this side has nothing on it to point at, so there is nowhere to place what is missing.'
    }
  }

  const wanted = asLandmark(missing)
  const shared = new Set(target.map((entry) => entry.key))
  const at = source.findIndex((entry) => entry.key === wanted.key)

  if (at >= 0) {
    for (let index = at - 1; index >= 0; index -= 1) {
      if (shared.has(source[index].key)) {
        return landmark({ target, entry: source[index], relation: 'after' })
      }
    }
    for (let index = at + 1; index < source.length; index += 1) {
      if (shared.has(source[index].key)) {
        return landmark({ target, entry: source[index], relation: 'before' })
      }
    }
  }

  // Nothing on this page appears on both sides, so the position cannot be
  // derived. Pointing at where the page's own content begins is still worth
  // more than a whole-page shot, as long as the caption does not pretend it is
  // the insertion point.
  const [first] = target
  return {
    relation: 'at',
    anchor: { ...first.anchor, key: anchorKey(first.anchor) },
    named: first.label,
    why: "Nothing on this page appears on both sides, so this crop shows where the page's own content begins rather than where the missing one would go."
  }
}

const landmark = ({ target, entry, relation }) => {
  const match = target.find((candidate) => candidate.key === entry.key)
  const anchor = (match ?? entry).anchor
  return {
    relation,
    anchor: { ...anchor, key: anchorKey(anchor) },
    named: (match ?? entry).label,
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
    return `This side has no ${missing}, and nothing on this page to place it against.`
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
