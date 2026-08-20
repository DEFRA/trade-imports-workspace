import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { parseBacklog } from './schema.js'
import { resolveCapturePaths } from './capture/run.js'
import { insertionPoint, mergeAnchors, summarise } from './insertion.js'
import { parseDocument } from './dom.js'
import {
  ANCHOR_KINDS,
  RESOLUTION_ORDER,
  landmarkFor,
  landmarksIn,
  resolveOnPage
} from './resolution.js'
import { TimError } from '../errors.js'

export { ANCHOR_KINDS }

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
 * words a user reads. A name attribute has no spaces in it and visible text
 * almost always does, which is enough to tell them apart — and an author who
 * needs to be sure writes the object form instead.
 *
 * The guess is not load-bearing. A one-word string like "Draft" is read as a
 * field name here, and the ladder tries the name attribute first and the tag
 * text straight after, so it resolves either way.
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

/** The name a finding wrote, whichever kind it was read as. */
const namedIn = (anchor) => anchor.name ?? anchor.text

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
 * Read a side's captured pages, each one parsed once.
 *
 * The rendered DOM rather than the page model, because the model is a fixed
 * vocabulary and a fixed vocabulary decides in advance what a page can be said
 * to have. A finding about a status tag or a phase banner names something a
 * model has no slot for, and it is still on the page.
 *
 * A screen with no capture on disk is not the same thing as a screen whose
 * page holds no such control: the first is uncaptured and the second is the
 * absence a finding is about. A missing file returns null so the two stay
 * apart.
 *
 * @returns {(side: object, screen: string) => object|null}
 */
export const pageDocReader = () => {
  const docs = new Map()
  const marks = new Map()
  const read = (side, screen) => {
    if (!side.htmlDir) return null
    const path = join(side.htmlDir, `${screen}.html`)
    if (!docs.has(path)) {
      docs.set(
        path,
        existsSync(path) ? parseDocument(readFileSync(path, 'utf8')) : null
      )
    }
    return docs.get(path)
  }
  read.landmarks = (side, screen) => {
    const path = `${side.id}/${screen}`
    if (!marks.has(path)) {
      const doc = read(side, screen)
      marks.set(path, doc === null ? [] : landmarksIn(doc))
    }
    return marks.get(path)
  }
  return read
}

/**
 * The place on one captured page a named control resolves to, or nothing.
 *
 * @param {object} anchor
 * @param {object|null} doc - A parsed captured page
 * @returns {object|null} See resolveOnPage in resolution.js
 */
export const resolveHere = (anchor, doc) =>
  doc === null || doc === undefined ? null : resolveOnPage({ doc, anchor })

/**
 * Another of this finding's own screens, on this side, that has the control.
 *
 * A finding routinely names several controls across several pages: the country
 * list one, the destination one and the transit one. Each control is on one of
 * those pages and not the others, and a page that does not have it is not a
 * page the finding is making a claim about. Reporting that as "this control
 * resolves nowhere" would be false — it resolves, one screen along, and the
 * crop is taken there.
 *
 * @param {object} args
 * @returns {string|null} The screen it is on
 */
const resolvedOnAnotherScreen = ({
  anchor,
  increment,
  side,
  screen,
  readDoc
}) => {
  for (const other of screensOn(increment, side.screenPrefix)) {
    if (other === screen) continue
    const found = resolveHere(anchor, readDoc(side, other))
    if (found !== null && found.refused === false) return other
  }
  return null
}

/**
 * The side that does have the control, and the page it is on.
 *
 * Only the screens the same finding names are searched. A control that turns up
 * on some unrelated page is not the one this finding is about, and a caption
 * written from it would place the absence against the wrong page.
 *
 * @param {object} args
 * @returns {{side: string, screen: string, landmark: object}|null}
 */
const resolvedElsewhere = ({ anchor, increment, sides, side, readDoc }) => {
  for (const other of sides) {
    if (other.id === side.id || !other.screenPrefix) continue
    for (const screen of screensOn(increment, other.screenPrefix)) {
      const doc = readDoc(other, screen)
      const found = resolveHere(anchor, doc)
      if (found === null || found.refused) continue
      return {
        side: other.id,
        screen,
        landmark: landmarkFor({ doc, found }),
        landmarks: readDoc.landmarks(other, screen)
      }
    }
  }
  return null
}

/**
 * Build one side's anchors from the controls the findings name.
 *
 * Each named control either resolves against this screen's captured page or it
 * does not, and both facts are evidence. Where it resolves, the crop is of the
 * control itself. Where it does not but the other side has it, this side gets
 * an insertion anchor: a crop of a control that is there, captioned with what
 * is missing and where it would go — because a reader cannot see an absence,
 * and a whole-page shot under a finding about one control shows nothing.
 *
 * @param {object} args
 * @param {object[]} args.increments
 * @param {object} args.side - This side's profile
 * @param {object[]} [args.sides] - Every side, for the control's other home
 * @param {Function} [args.readDoc] - From {@link pageDocReader}
 * @returns {object}
 */
export const anchorsForSide = ({
  increments,
  side,
  sides = [side],
  readDoc = pageDocReader()
}) => {
  const ordinary = new Map()
  const insertions = new Map()
  const withoutControls = []
  const unresolved = []
  const ambiguous = []
  const onOtherScreens = []
  const withoutPlacement = []
  const uncaptured = new Set()
  const seenUnresolved = new Set()
  const seenAmbiguous = new Set()
  const seenOtherScreen = new Set()

  const noteOrdinary = ({ screen, anchor, increment }) => {
    const byKey = ordinary.get(screen) ?? new Map()
    ordinary.set(screen, byKey)
    const held = byKey.get(anchor.key)
    if (held) {
      held.namedBy.push(increment)
      return
    }
    byKey.set(anchor.key, { anchor, namedBy: [increment] })
  }

  const noteInsertion = ({ screen, point, missing, increment }) => {
    const byKey = insertions.get(screen) ?? new Map()
    insertions.set(screen, byKey)
    const held = byKey.get(point.anchor.key) ?? {
      anchor: point.anchor,
      namedBy: [],
      insertions: []
    }
    byKey.set(point.anchor.key, held)
    if (!held.namedBy.includes(increment)) held.namedBy.push(increment)
    held.insertions.push({
      missing: missing.anchor.name ?? missing.label,
      missingLabel: missing.label,
      point
    })
  }

  const noteUnresolved = ({ anchor, increment, screen }) => {
    const seen = `${increment}:${anchor.key}`
    if (seenUnresolved.has(seen)) return
    seenUnresolved.add(seen)
    unresolved.push({
      increment,
      anchor: anchor.key,
      named: namedIn(anchor),
      screen
    })
  }

  const noteOtherScreen = ({ anchor, increment, screen, cropped }) => {
    const seen = `${increment}:${anchor.key}:${screen}`
    if (seenOtherScreen.has(seen)) return
    seenOtherScreen.add(seen)
    onOtherScreens.push({
      increment,
      anchor: anchor.key,
      named: namedIn(anchor),
      screen,
      cropped
    })
  }

  const noteAmbiguous = ({ anchor, increment, screen, found }) => {
    const seen = `${increment}:${anchor.key}:${screen}`
    if (seenAmbiguous.has(seen)) return
    seenAmbiguous.add(seen)
    ambiguous.push({
      increment,
      anchor: anchor.key,
      named: namedIn(anchor),
      screen,
      role: found.role,
      places: found.places,
      cropped: found.refused === false
    })
  }

  for (const increment of increments) {
    const mine = screensOn(increment, side.screenPrefix)
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
      const doc = readDoc(side, screen)
      if (doc === null) uncaptured.add(screen)
      for (const control of controls) {
        const anchor = toAnchor(control, increment.id)

        // Nothing was captured for this screen, so there is no page to ask.
        // The anchor stands and the crop stage answers it.
        if (doc === null) {
          noteOrdinary({ screen, anchor, increment: increment.id })
          continue
        }

        const found = resolveHere(anchor, doc)
        if (found !== null && found.refused === false) {
          noteOrdinary({
            screen,
            anchor: { ...anchor, role: found.role },
            increment: increment.id
          })
          if (found.places > 1) {
            noteAmbiguous({ anchor, increment: increment.id, screen, found })
          }
          continue
        }
        if (found !== null) {
          // It is on the page several times over and nothing about the match
          // says which one the finding meant. Named rather than guessed at.
          noteAmbiguous({ anchor, increment: increment.id, screen, found })
          continue
        }

        const onAnotherScreen = resolvedOnAnotherScreen({
          anchor,
          increment,
          side,
          screen,
          readDoc
        })
        if (onAnotherScreen !== null) {
          noteOtherScreen({
            anchor,
            increment: increment.id,
            screen,
            cropped: onAnotherScreen
          })
          continue
        }

        const elsewhere = resolvedElsewhere({
          anchor,
          increment,
          sides,
          side,
          readDoc
        })
        if (elsewhere === null) {
          noteUnresolved({ anchor, increment: increment.id, screen })
          continue
        }
        const point = insertionPoint({
          missing: elsewhere.landmark,
          sourceLandmarks: elsewhere.landmarks,
          targetLandmarks: readDoc.landmarks(side, screen)
        })
        if (!point.anchor) {
          withoutPlacement.push({
            increment: increment.id,
            named: elsewhere.landmark.label,
            screen,
            why: point.why
          })
          continue
        }
        noteInsertion({
          screen,
          point,
          missing: elsewhere.landmark,
          increment: increment.id
        })
      }
    }
  }

  const named = {}
  let anchors = 0
  for (const screen of [...ordinary.keys()].sort()) {
    const list = [...ordinary.get(screen).values()].map(
      ({ anchor, namedBy }) => ({
        ...anchor,
        why: `named by ${namedBy.join(', ')}`
      })
    )
    anchors += list.length
    named[screen] = list
  }

  const absences = {}
  let insertionCount = 0
  for (const screen of [...insertions.keys()].sort()) {
    const list = [...insertions.get(screen).values()].map(
      ({ anchor, namedBy, insertions: found }) => {
        const entry = {
          ...anchor,
          why: `insertion point named by ${namedBy.join(', ')}`,
          insertions: found
        }
        summarise(entry)
        return entry
      }
    )
    insertionCount += list.length
    absences[screen] = list
  }

  return {
    screens: mergeAnchors(named, absences),
    anchors,
    insertions: insertionCount,
    unresolved,
    ambiguous,
    onOtherScreens,
    withoutControls,
    withoutPlacement,
    uncaptured: [...uncaptured].sort()
  }
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
  const readDoc = pageDocReader()

  const sides = wanted.map((sideProfile) => {
    if (!sideProfile.screenPrefix) {
      throw new TimError(
        'USAGE',
        `Side "${sideProfile.id}" names no screenPrefix in tools/parity/corpora.json, so there is no way to tell which screens are its own.`
      )
    }
    const built = anchorsForSide({
      increments: backlog.increments,
      side: sideProfile,
      sides: profile.sides,
      readDoc
    })
    const { anchorsPath } = resolveCapturePaths({
      profile,
      side: sideProfile.id,
      sha: profile.captures?.[sideProfile.id]?.sha ?? 'pending'
    })
    const file = {
      side: sideProfile.id,
      builtFrom:
        'the controls[] each finding names, resolved against the captured DOM in the order field, label, action, heading, row, status, text — tim parity anchors',
      resolutionOrder: RESOLUTION_ORDER.map((rung) => rung.role),
      screens: built.screens
    }
    const result = write ? writeJsonAtomic(anchorsPath, file) : null
    return {
      side: sideProfile.id,
      path: anchorsPath,
      screens: Object.keys(built.screens).length,
      anchors: built.anchors,
      insertions: built.insertions,
      unresolved: built.unresolved,
      ambiguous: built.ambiguous,
      onOtherScreens: built.onOtherScreens,
      withoutControls: built.withoutControls,
      withoutPlacement: built.withoutPlacement,
      uncaptured: built.uncaptured,
      written: Boolean(result),
      file
    }
  })

  return { sides, written: write }
}
