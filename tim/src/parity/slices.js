import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from './io.js'
import { loadPairs } from './assets/pairs.js'
import { TimError } from '../errors.js'

/** Where a corpus keeps the slicing an authoring pass was fanned out over. */
export const SLICES_FILE = 'slices.json'

/**
 * Where this corpus's slicing lives.
 *
 * Derived from the workarea rather than declared in corpora.json, for the same
 * reason the findings directory is: a corpus cannot name a slicing that sits
 * somewhere other than beside its findings and its specs.
 *
 * @param {object} profile - A loaded corpus profile
 * @returns {string}
 */
export const slicesPath = (profile) =>
  join(profile.paths.workarea, SLICES_FILE)

/**
 * Read the slicing and check it is the shape the rest of this file assumes.
 *
 * Every refusal names the slice and the field. A slicing that half-parses is
 * worse than one that does not parse at all: the checks below would then report
 * a clean set difference over a slice list missing an entry.
 *
 * @param {string} path
 * @returns {Array<{id: string, screens: string[], chrome: boolean, note?: string}>}
 * @throws {TimError} NOT_FOUND when nothing is there, PARSE for a bad file
 */
export const readSlices = (path) => {
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `No slicing at ${path}. Write one before spawning any authoring agent: a "slices" list, each with an "id" and the "screens" it owns, and exactly one carrying "chrome": true.`
    )
  }
  const raw = readJsonFile(path)
  const slices = raw?.slices
  if (!Array.isArray(slices) || slices.length === 0) {
    throw new TimError('PARSE', `${path}: "slices" names no slice.`)
  }
  return slices.map((slice, index) => {
    const where = slice?.id ? `slice "${slice.id}"` : `slice ${index + 1}`
    if (typeof slice?.id !== 'string' || slice.id.trim() === '') {
      throw new TimError('PARSE', `${path}: ${where} has no "id".`)
    }
    if (!Array.isArray(slice.screens)) {
      throw new TimError(
        'PARSE',
        `${path}: ${where} has no "screens" list. A slice that owns no screen owns nothing.`
      )
    }
    for (const screen of slice.screens) {
      if (typeof screen !== 'string' || screen.trim() === '') {
        throw new TimError(
          'PARSE',
          `${path}: ${where} holds an entry in "screens" that is not a screen id.`
        )
      }
    }
    return {
      id: slice.id.trim(),
      screens: slice.screens,
      chrome: slice.chrome === true,
      note: typeof slice.note === 'string' ? slice.note : undefined
    }
  })
}

/**
 * Every screen each side photographed, read from the manifest.
 *
 * The manifest is the index — a directory listing counts files no run claims —
 * and a side with no manifest is reported as having none rather than as having
 * zero screens, because those two say opposite things about whether the check
 * below can run at all.
 *
 * @param {object} profile
 * @returns {{screens: string[], sides: object[], checkable: boolean}}
 */
export const manifestScreensBySide = (profile) => {
  const sides = profile.sides.map((side) => {
    if (!side.manifest || !existsSync(side.manifest)) {
      return { side: side.id, found: false, screens: [] }
    }
    const rows = readJsonFile(side.manifest).rows ?? []
    return {
      side: side.id,
      found: true,
      screens: rows.map((row) => row.screen).filter(Boolean)
    }
  })
  return {
    sides,
    screens: sides.flatMap((side) => side.screens),
    checkable: sides.some((side) => side.found)
  }
}

/**
 * Which slice owns each screen, and where that answer is not exactly one.
 *
 * This is the whole point of the command. On the run this check was written
 * for, nothing proved the slicing before ten agents were spawned, and one
 * finding was disowned by two slices and written by a third — caught by the
 * verification pass, which is not what the verification pass is for.
 *
 * The two failures are not symmetrical and the briefing leans one way for a
 * reason. A gap is one missing row in a work list. A duplicate is two
 * increments, two ids, two sets of citations, and somebody three months later
 * working out whether they are the same change.
 *
 * @param {object} args
 * @param {Array<{id: string, screens: string[]}>} args.slices
 * @param {string[]} args.captured - Every screen id in any manifest
 * @returns {{owner: Map<string, string[]>, duplicated: object[], uncovered: string[], unknown: object[]}}
 */
export const ownership = ({ slices, captured }) => {
  const shot = new Set(captured)
  const owner = new Map()

  for (const slice of slices) {
    for (const screen of slice.screens) {
      if (!owner.has(screen)) owner.set(screen, [])
      owner.get(screen).push(slice.id)
    }
  }

  const duplicated = [...owner]
    .filter(([, owners]) => owners.length > 1)
    .map(([screen, owners]) => ({ screen, slices: owners }))
    .sort((a, b) => a.screen.localeCompare(b.screen))

  const uncovered = [...shot].filter((screen) => !owner.has(screen)).sort()

  const unknown = [...owner]
    .filter(([screen]) => !shot.has(screen))
    .map(([screen, owners]) => ({ screen, slices: owners }))
    .sort((a, b) => a.screen.localeCompare(b.screen))

  return { owner, duplicated, uncovered, unknown }
}

/**
 * Pairs whose two screens are owned by different slices.
 *
 * Not a failure. Many-to-one pairing is legitimate and a screen can only sit in
 * one slice, so some pairs must split — one requirements screen answering five
 * frontend pages cannot follow all five. What a split pair does mean is that
 * whoever owns one half is reading half a comparison, so each one is named and
 * left for a person to accept rather than counted and forgotten.
 *
 * @param {object} args
 * @param {object} args.pairing - From loadPairs
 * @param {Map<string, string[]>} args.owner
 * @returns {object[]}
 */
export const splitPairs = ({ pairing, owner }) =>
  pairing.pairs
    .map((pair) => ({
      pair,
      left: owner.get(pair.frontend)?.[0] ?? null,
      right: owner.get(pair.prototype)?.[0] ?? null
    }))
    .filter(({ left, right }) => left && right && left !== right)
    .map(({ pair, left, right }) => ({
      frontend: pair.frontend,
      prototype: pair.prototype,
      slices: [left, right]
    }))

/**
 * The screens one side has and the other does not, with the slice that owns
 * each.
 *
 * A screen one side has and the other does not is the largest kind of gap a
 * comparison contains, so its owner is printed rather than implied. The
 * exactly-once check already covers these — they are in a manifest like any
 * other screen — but "covered" and "deliberately assigned" are different
 * claims and only one of them is worth making.
 *
 * @param {object} args
 * @param {object} args.pairing
 * @param {Map<string, string[]>} args.owner
 * @returns {object[]}
 */
export const oneSided = ({ pairing, owner }) =>
  [
    ...pairing.onlyFrontend.map((entry) => ({ ...entry, side: 'frontend' })),
    ...pairing.onlyPrototype.map((entry) => ({ ...entry, side: 'prototype' }))
  ].map((entry) => ({
    screen: entry.screen,
    side: entry.side,
    slice: owner.get(entry.screen)?.[0] ?? null
  }))

/**
 * Prove the slicing before anything is spawned.
 *
 * Every screen in every manifest must appear in exactly one slice, and exactly
 * one slice must own the chrome. Ten agents left to themselves write the phase
 * banner finding ten times, so one slice is named as its owner and every other
 * slice is told in as many words not to raise one.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {string} [args.file] - A slicing somewhere other than the workarea
 * @returns {object}
 * @throws {TimError} NOT_FOUND, PARSE
 */
export const runSlices = ({ profile, file }) => {
  const path = file ?? slicesPath(profile)
  const slices = readSlices(path)
  const captured = manifestScreensBySide(profile)

  if (!captured.checkable) {
    throw new TimError(
      'NOT_FOUND',
      `No side of this corpus has a capture manifest yet, so there is nothing to check the slicing against. Capture both sides first: ${profile.sides.map((side) => side.captureCommand ?? side.id).join(', ')}.`
    )
  }

  const { owner, duplicated, uncovered, unknown } = ownership({
    slices,
    captured: captured.screens
  })
  const pairing = loadPairs(profile.paths.pairingModule)
  const chrome = slices.filter((slice) => slice.chrome).map((slice) => slice.id)

  const sound =
    duplicated.length === 0 &&
    uncovered.length === 0 &&
    unknown.length === 0 &&
    chrome.length === 1

  return {
    path,
    slices: slices.map((slice) => ({
      id: slice.id,
      screens: slice.screens.length,
      chrome: slice.chrome,
      note: slice.note
    })),
    sides: captured.sides.map((side) => ({
      side: side.side,
      found: side.found,
      screens: side.screens.length
    })),
    captured: captured.screens.length,
    assigned: owner.size,
    duplicated,
    uncovered,
    unknown,
    chrome,
    splitPairs: splitPairs({ pairing, owner }),
    oneSided: oneSided({ pairing, owner }),
    sound,
    exitNonZero: false
  }
}

/**
 * @param {object} result - From runSlices
 * @returns {string}
 */
export const renderSlices = (result) => {
  const lines = [
    `${result.slices.length} slices over ${result.captured} captured screens.`,
    ...result.sides.map((side) =>
      side.found
        ? `  ${side.side}: ${side.screens} screens`
        : `  ${side.side}: no capture manifest, so none of its screens are being checked`
    )
  ]

  if (result.chrome.length === 1) {
    lines.push(
      `Chrome is owned by "${result.chrome[0]}". Tell every other slice, in as many words, not to raise a chrome finding.`
    )
  } else if (result.chrome.length === 0) {
    lines.push(
      'No slice owns the chrome. The phase banner, the service navigation, the caption, the back link, the footer, the page title and the button pattern appear on every screen, so without an owner every slice writes the same finding. Set "chrome": true on one slice.'
    )
  } else {
    lines.push(
      `${result.chrome.length} slices claim the chrome: ${result.chrome.join(', ')}. Exactly one may.`
    )
  }

  for (const entry of result.duplicated) {
    lines.push(
      `  in two slices  ${entry.screen.padEnd(44)} ${entry.slices.join(', ')}`
    )
  }
  for (const screen of result.uncovered) {
    lines.push(
      `  in no slice    ${screen.padEnd(44)} captured, and no slice owns it`
    )
  }
  for (const entry of result.unknown) {
    lines.push(
      `  no such screen ${entry.screen.padEnd(44)} named by ${entry.slices.join(', ')}, in no manifest`
    )
  }

  if (result.oneSided.length) {
    lines.push(
      'One-sided screens, which are the largest gaps the comparison holds:'
    )
    for (const entry of result.oneSided) {
      lines.push(
        `  ${entry.side.padEnd(10)} ${entry.screen.padEnd(44)} ${entry.slice ?? 'OWNED BY NO SLICE'}`
      )
    }
  }

  if (result.splitPairs.length) {
    lines.push(
      `${result.splitPairs.length} pairs are split across two slices, so each owner reads half a comparison. Legitimate where one screen answers several, worth reading otherwise:`
    )
    for (const entry of result.splitPairs) {
      lines.push(
        `  ${entry.frontend} / ${entry.prototype}  ${entry.slices.join(' | ')}`
      )
    }
  }

  lines.push(
    result.sound
      ? 'Every captured screen is owned by exactly one slice. Safe to spawn.'
      : 'The slicing is not sound. Fix it before spawning anything — a finding disowned by two slices is caught, if at all, by a pass that exists for something else.'
  )
  return lines.join('\n')
}
