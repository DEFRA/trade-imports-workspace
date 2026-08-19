import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { parseBacklog } from './schema.js'
import { resolveCapturePaths } from './capture/run.js'
import {
  insertionPoint,
  isVisibleControl,
  mergeAnchors,
  summarise
} from './insertion.js'
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
 * Read a side's page models, each one once.
 *
 * A screen with no model on disk is not the same thing as a screen whose model
 * holds no such control: the first is uncaptured and the second is the absence
 * a finding is about. A missing file returns null so the two stay apart.
 *
 * @returns {(side: object, screen: string) => object|null}
 */
export const pageModelReader = () => {
  const models = new Map()
  return (side, screen) => {
    if (!side.modelDir) return null
    const path = join(side.modelDir, `${screen}.json`)
    if (!models.has(path)) {
      models.set(path, existsSync(path) ? readJsonFile(path) : null)
    }
    return models.get(path)
  }
}

const labelsOf = (field) =>
  [
    field.label,
    field.legend,
    ...(field.options ?? []).map((option) => option.label)
  ].filter(Boolean)

/**
 * Whether one field in a page model is what an anchor points at.
 *
 * Mirrors `resolveAnchor` in capture/screens.js — a field anchor matches its
 * own name and the compound names built from it, a label anchor matches any
 * label containing those words. Looser than the locator and this calls a
 * control present that the crop stage cannot find; tighter and it calls a
 * control missing that is on the page.
 *
 * @param {{kind: string, name?: string, text?: string}} anchor
 * @param {object} field - A page model's field
 * @returns {boolean}
 */
export const anchorMatches = (anchor, field) => {
  if (anchor.kind === 'field') {
    const name = field.name ?? ''
    return (
      name === anchor.name ||
      name.startsWith(`${anchor.name}-`) ||
      name.startsWith(`${anchor.name}[`)
    )
  }
  const wanted = anchor.text.toLowerCase()
  return labelsOf(field).some((label) => label.toLowerCase().includes(wanted))
}

/**
 * The field an anchor resolves to on one page, or nothing.
 *
 * @param {object} anchor
 * @param {object|null} model - A captured page model
 * @returns {object|undefined}
 */
export const fieldFor = (anchor, model) =>
  (model?.allFields ?? [])
    .filter(isVisibleControl)
    .find((field) => anchorMatches(anchor, field))

const labelOf = (field) => field.label ?? field.legend ?? field.name

/**
 * The side that does have the control, and the page it is on.
 *
 * Only the screens the same finding names are searched. A control that turns up
 * on some unrelated page is not the one this finding is about, and a caption
 * written from it would place the absence against the wrong page.
 *
 * @param {object} args
 * @returns {{side: string, screen: string, model: object, field: object}|null}
 */
const resolvedElsewhere = ({ anchor, increment, sides, side, readModel }) => {
  for (const other of sides) {
    if (other.id === side.id || !other.screenPrefix) continue
    for (const screen of screensOn(increment, other.screenPrefix)) {
      const model = readModel(other, screen)
      const field = fieldFor(anchor, model)
      if (field) return { side: other.id, screen, model, field }
    }
  }
  return null
}

/**
 * Build one side's anchors from the controls the findings name.
 *
 * Each named control either resolves against this screen's page model or it
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
 * @param {Function} [args.readModel] - From {@link pageModelReader}
 * @returns {object}
 */
export const anchorsForSide = ({
  increments,
  side,
  sides = [side],
  readModel = pageModelReader()
}) => {
  const ordinary = new Map()
  const insertions = new Map()
  const withoutControls = []
  const unresolved = []
  const withoutPlacement = []
  const uncaptured = new Set()
  const seenUnresolved = new Set()

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

  const noteInsertion = ({ screen, point, field, increment }) => {
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
      missing: field.name ?? labelOf(field),
      missingLabel: labelOf(field),
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
      named: anchor.name ?? anchor.text,
      screen
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
      const model = readModel(side, screen)
      if (!model) uncaptured.add(screen)
      for (const control of controls) {
        const anchor = toAnchor(control, increment.id)
        // Nothing was captured for this screen, so there is no page model to
        // ask. The anchor stands and the crop stage answers it.
        if (!model || fieldFor(anchor, model)) {
          noteOrdinary({ screen, anchor, increment: increment.id })
          continue
        }
        const found = resolvedElsewhere({
          anchor,
          increment,
          sides,
          side,
          readModel
        })
        if (!found) {
          noteUnresolved({ anchor, increment: increment.id, screen })
          continue
        }
        const point = insertionPoint({
          missing: found.field,
          sourceModel: found.model,
          targetModel: model
        })
        if (!point.anchor) {
          withoutPlacement.push({
            increment: increment.id,
            named: labelOf(found.field),
            screen,
            why: point.why
          })
          continue
        }
        noteInsertion({
          screen,
          point,
          field: found.field,
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
  const readModel = pageModelReader()

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
      readModel
    })
    const { anchorsPath } = resolveCapturePaths({
      profile,
      side: sideProfile.id,
      sha: profile.captures?.[sideProfile.id]?.sha ?? 'pending'
    })
    const file = {
      side: sideProfile.id,
      builtFrom:
        'the controls[] each finding names, and for a control this side does not have, where it would go — tim parity anchors',
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
      withoutControls: built.withoutControls,
      withoutPlacement: built.withoutPlacement,
      uncaptured: built.uncaptured,
      written: Boolean(result),
      file
    }
  })

  return { sides, written: write }
}
