import { existsSync } from 'node:fs'
import { readJsonFile, writeJsonAtomic } from './io.js'

/**
 * A seal is the picture a reader was last shown for one side of one finding.
 *
 * The failure mode this exists to stop is the one that would discredit the
 * whole report: a reader opens the page, thinks about a finding, someone
 * re-captures, and the ruling lands against a picture nobody looked at. Pixels
 * must never move silently under a pending decision.
 *
 * It lives in its own file rather than on the frames in backlog.json, because
 * a seal is neither judgement nor derived. It cannot be recomputed — it records
 * what a person has already seen — so evidence.json is the wrong home; and it
 * is written by the build rather than by a human, so backlog.json is too. A
 * hand-curated frame's own `curatedAgainst` still wins where one exists.
 */
export const SEALS_NOTE = [
  'What the report last showed. Written by `tim parity report`, compared on',
  'every rebuild, and cleared deliberately with `--reseal`. A finding whose',
  'picture has moved since its seal is listed in the drift panel and carries a',
  'ribbon, so nobody rules under a picture that was swapped without them.'
]

/**
 * What one asset is, reduced to the facts a seal compares.
 *
 * The frame is part of it, not just the bytes. Swapping a page shot for a crop
 * of one field changes what the reader is being asked about just as much as
 * re-capturing the same frame would.
 *
 * @param {object} asset - A resolved asset
 * @returns {object|null} Null for an asset with no picture
 */
export const sealOf = (asset) => {
  if (asset.state !== 'crop' && asset.state !== 'page') return null
  return {
    state: asset.state,
    screen: asset.screen,
    anchor: asset.anchorKey ?? null,
    sha256: asset.sha256 ?? null
  }
}

/**
 * The seals one report render would write.
 *
 * @param {object[]} items - Report items carrying resolved assets
 * @param {object[]} sides
 * @returns {Record<string, object>} increment id to side to seal
 */
export const sealsFrom = (items, sides) => {
  const out = {}
  for (const item of items) {
    const rows = item.assets ?? []
    const perSide = {}
    for (const side of sides) {
      // One seal per side per row, indexed by row, so a finding showing two
      // screens can drift on one of them and say which.
      const seals = rows.map((row) => sealOf(row[side.id] ?? {}))
      if (seals.some(Boolean)) perSide[side.id] = seals
    }
    if (Object.keys(perSide).length) out[item.id] = perSide
  }
  return out
}

const describe = (seal) => {
  if (!seal) return 'no picture'
  if (seal.state === 'crop') return `crop of ${seal.anchor} on ${seal.screen}`
  return `full page of ${seal.screen}`
}

/**
 * Compare what the report is about to show against what it last showed.
 *
 * @param {object} args
 * @param {object} args.sealed - The stored seals
 * @param {object} args.current - The seals this render would write
 * @returns {object[]} One entry per side of one finding that moved
 */
export const diffSeals = ({ sealed, current }) => {
  const drift = []
  for (const [id, sides] of Object.entries(current)) {
    const before = sealed[id]
    // A finding nobody has been shown yet cannot have drifted under them.
    if (!before) continue
    // The union, not the current sides. A picture that has disappeared —
    // a capture directory repointed, a crop that stopped resolving — leaves no
    // entry to iterate, and silence is exactly what this must not produce.
    const sideIds = new Set([...Object.keys(sides), ...Object.keys(before)])
    for (const sideId of sideIds) {
      const wasList = before[sideId] ?? []
      const seals = sides[sideId] ?? wasList.map(() => null)
      seals.forEach((now, index) => {
        const was = wasList[index] ?? null
        if (!was && !now) return
        if (
          was &&
          now &&
          was.sha256 === now.sha256 &&
          was.state === now.state
        ) {
          if (was.anchor === now.anchor && was.screen === now.screen) return
        }
        drift.push({
          id,
          side: sideId,
          row: index,
          kind: framesDiffer(was, now) ? 'frame-changed' : 'image-changed',
          was: describe(was),
          now: describe(now),
          wasSha: was?.sha256 ?? null,
          nowSha: now?.sha256 ?? null
        })
      })
    }
  }
  return drift
}

const framesDiffer = (was, now) =>
  !was ||
  !now ||
  was.state !== now.state ||
  was.screen !== now.screen ||
  was.anchor !== now.anchor

/**
 * Read the seal store, or start an empty one.
 *
 * @param {string} path
 * @returns {object}
 */
export const readSeals = (path) =>
  existsSync(path) ? (readJsonFile(path).seals ?? {}) : {}

/**
 * Write the seal store.
 *
 * Sealing is additive by default: a finding that has moved keeps the seal it
 * drifted from until someone clears it, so the drift panel does not erase its
 * own evidence on the next rebuild. `--reseal` is the deliberate clear.
 *
 * @param {object} args
 * @param {string} args.path
 * @param {object} args.sealed - What is on disk now
 * @param {object} args.current - What this render would write
 * @param {boolean} [args.reseal] - Accept the current state for everything
 * @param {string} [args.at] - Timestamp to stamp
 * @returns {object} The seals written
 */
export const writeSeals = ({ path, sealed, current, reseal, at }) => {
  const next = reseal ? { ...current } : { ...sealed }
  if (!reseal) {
    for (const [id, sides] of Object.entries(current)) {
      if (!sealed[id]) next[id] = sides
    }
  }
  writeJsonAtomic(path, {
    _note: SEALS_NOTE,
    sealedAt: at ?? new Date().toISOString(),
    seals: next
  })
  return next
}
