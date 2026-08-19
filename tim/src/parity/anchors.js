import { readJsonFile, writeJsonAtomic } from './io.js'
import { parseBacklog } from './schema.js'
import { resolveCapturePaths } from './capture/run.js'
import { TimError } from '../errors.js'

/** The anchor kinds the capture stage knows how to resolve to a locator. */
export const ANCHOR_KINDS = ['field', 'label']

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * The key an anchor is filed and cropped under.
 *
 * Matches the keys already on disk from the previous run — a field's name with
 * everything but its letters and digits removed, a label's text hyphenated — so
 * a crop file name means the same thing across both corpora.
 *
 * @param {{kind: string, name?: string, text?: string}} anchor
 * @returns {string}
 */
export const anchorKey = (anchor) =>
  anchor.kind === 'field'
    ? `field-${String(anchor.name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')}`
    : `label-${slug(anchor.text)}`

/**
 * Turn one named control into an anchor descriptor.
 *
 * An author writes a bare string: the `name` attribute of the control, or the
 * label a user reads. A name attribute has no spaces in it and a visible label
 * almost always does, which is enough to tell them apart — and an author who
 * needs to be sure writes the object form instead.
 *
 * @param {string|{kind: string, name?: string, text?: string}} control
 * @param {string} increment - Which increment named it, for the error message
 * @returns {{kind: string, name?: string, text?: string, key: string}}
 * @throws {TimError} PARSE for a control that names nothing resolvable
 */
export const toAnchor = (control, increment) => {
  if (typeof control === 'string') {
    const text = control.trim()
    if (!text) {
      throw new TimError('PARSE', `${increment}: controls holds an empty name.`)
    }
    return /\s/.test(text)
      ? { kind: 'label', text, key: anchorKey({ kind: 'label', text }) }
      : {
          kind: 'field',
          name: text,
          key: anchorKey({ kind: 'field', name: text })
        }
  }
  if (typeof control !== 'object' || control === null) {
    throw new TimError(
      'PARSE',
      `${increment}: controls holds ${typeof control}, not a control name.`
    )
  }
  if (!ANCHOR_KINDS.includes(control.kind)) {
    throw new TimError(
      'PARSE',
      `${increment}: "${control.kind}" is not an anchor kind. Use ${ANCHOR_KINDS.join(' or ')}.`
    )
  }
  const value = control.kind === 'field' ? control.name : control.text
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TimError(
      'PARSE',
      `${increment}: a ${control.kind} anchor needs a ${control.kind === 'field' ? 'name' : 'text'}.`
    )
  }
  const anchor =
    control.kind === 'field'
      ? { kind: 'field', name: value.trim() }
      : { kind: 'label', text: value.trim() }
  return { ...anchor, key: anchorKey(anchor) }
}

/**
 * Which of an increment's screens are on this side.
 *
 * By prefix, because that is the one thing a screen id is guaranteed to carry:
 * the corpus stamps it at capture time from the side's `screenPrefix`.
 *
 * @param {object} increment
 * @param {string} prefix
 * @returns {string[]}
 */
const screensOn = (increment, prefix) =>
  (increment.screens ?? []).filter((screen) => screen.startsWith(prefix))

/**
 * Build one side's anchors from the controls the findings name.
 *
 * @param {object} args
 * @param {object[]} args.increments
 * @param {string} args.prefix - This side's screen prefix
 * @returns {{screens: Record<string, object[]>, anchors: number, withoutControls: string[]}}
 */
export const anchorsForSide = ({ increments, prefix }) => {
  const screens = new Map()
  const withoutControls = []

  for (const increment of increments) {
    const mine = screensOn(increment, prefix)
    if (mine.length === 0) continue

    const controls = increment.controls ?? []
    if (controls.length === 0) {
      // A finding about one control illustrated by a whole page is not
      // illustrated. Counted and named here so the gap is visible rather than
      // discovered in the report.
      withoutControls.push(increment.id)
      continue
    }

    for (const screen of mine) {
      if (!screens.has(screen)) screens.set(screen, new Map())
      const byKey = screens.get(screen)
      for (const control of controls) {
        const anchor = toAnchor(control, increment.id)
        const held = byKey.get(anchor.key)
        if (held) {
          held.namedBy.push(increment.id)
          continue
        }
        byKey.set(anchor.key, { ...anchor, namedBy: [increment.id] })
      }
    }
  }

  let anchors = 0
  const out = {}
  for (const screen of [...screens.keys()].sort()) {
    const list = [...screens.get(screen).values()].map(
      ({ namedBy, ...anchor }) => ({
        ...anchor,
        why: `named by ${namedBy.join(', ')}`
      })
    )
    anchors += list.length
    out[screen] = list
  }

  return { screens: out, anchors, withoutControls }
}

/**
 * Derive anchors.<side>.json from the backlog, for one side or for all of them.
 *
 * The authoring agent names the control its finding is about; this turns those
 * names into the crop instructions the capture stage reads. Nothing here infers
 * a control from prose — a guess that misses produces a crop of the wrong part
 * of the page, which reads as evidence.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {string} [args.side] - Just one side
 * @param {boolean} [args.write] - Write the files rather than reporting them
 * @returns {object}
 * @throws {TimError} NOT_FOUND for an unknown side
 */
export const runAnchors = ({ profile, side, write = false }) => {
  if (side && !profile.sideById[side]) {
    throw new TimError(
      'NOT_FOUND',
      `Unknown side "${side}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const wanted = side ? [profile.sideById[side]] : profile.sides

  const sides = wanted.map((sideProfile) => {
    if (!sideProfile.screenPrefix) {
      throw new TimError(
        'USAGE',
        `Side "${sideProfile.id}" names no screenPrefix in tools/parity/corpora.json, so there is no way to tell which screens are its own.`
      )
    }
    const built = anchorsForSide({
      increments: backlog.increments,
      prefix: sideProfile.screenPrefix
    })
    const { anchorsPath } = resolveCapturePaths({
      profile,
      side: sideProfile.id,
      sha: profile.captures?.[sideProfile.id]?.sha ?? 'pending'
    })
    const file = {
      side: sideProfile.id,
      builtFrom: 'the controls[] each finding names — tim parity anchors',
      screens: built.screens
    }
    const result = write ? writeJsonAtomic(anchorsPath, file) : null
    return {
      side: sideProfile.id,
      path: anchorsPath,
      screens: Object.keys(built.screens).length,
      anchors: built.anchors,
      withoutControls: built.withoutControls,
      written: Boolean(result),
      file
    }
  })

  return { sides, written: write }
}
