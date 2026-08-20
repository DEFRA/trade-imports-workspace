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
  'ribbon, so nobody rules under a picture that was swapped without them.',
  '',
  'Each seal holds three facts about one picture: the frame it shows, the',
  'bytes of the picture, and the hash of the page that was photographed as the',
  'capture recorded it. A seal written before a capture recorded the page hash',
  'carries null there and is compared on its bytes alone, exactly as it was.'
]

/**
 * What one asset is, reduced to the facts a seal compares.
 *
 * The frame is part of it, not just the bytes. Swapping a page shot for a crop
 * of one field changes what the reader is being asked about just as much as
 * re-capturing the same frame would.
 *
 * Three signals, because the bytes alone cannot say what changed:
 *
 * - `sha256` — the picture. The only signal that sees a purely visual change:
 *   a CSS regression, a component swapped for one that renders the same words.
 * - `content` — the hash the capture recorded for the page it photographed:
 *   the rendered DOM, with the values that change run to run standardised. It
 *   says whether the page itself moved, and it is what separates "this page
 *   changed" from "these pixels changed".
 * - `volatile` — the fingerprint of the values that were standardised. It says
 *   whether a difference in the pixels is explained by a generated reference
 *   number rather than by the application.
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
    sha256: asset.sha256 ?? null,
    content: asset.contentSha ?? null,
    volatile: asset.volatileSha ?? null
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

const framesDiffer = (was, now) =>
  !was ||
  !now ||
  was.state !== now.state ||
  was.screen !== now.screen ||
  was.anchor !== now.anchor

const pageMoved = (was, now) =>
  Boolean(was.content) && Boolean(now.content) && was.content !== now.content

/**
 * The pixels moved and the page did not, and a value that changes run to run
 * did — so what moved is the reference number printed in the Draft tag, not the
 * application.
 *
 * Both fingerprints have to be known for this to be sayable. Where either side
 * was captured before the fingerprint existed, the difference is unexplained
 * and the panel says so rather than guessing in the reader's favour.
 */
const onlyGeneratedValuesMoved = (was, now) =>
  Boolean(was.content) &&
  was.content === now.content &&
  Boolean(was.volatile) &&
  Boolean(now.volatile) &&
  was.volatile !== now.volatile

/**
 * Whether one picture moved under its reader, and in what way.
 *
 * @param {object|null} was - The seal on disk
 * @param {object|null} now - The seal this render would write
 * @returns {string|null} The kind of drift, or null when nothing moved
 */
export const driftKind = (was, now) => {
  if (!was && !now) return null
  if (framesDiffer(was, now)) return 'frame-changed'
  // The reader was shown these bytes and these bytes are still here. Whatever
  // else has happened on the page, the picture in front of them has not moved.
  if (was.sha256 === now.sha256) return null
  if (pageMoved(was, now)) return 'content-changed'
  if (onlyGeneratedValuesMoved(was, now)) return null
  // The page is known to be identical, so this is a rendering change and
  // nothing else: styling, a font, a component that draws differently.
  if (was.content && was.content === now.content) return 'pixels-changed'
  return 'image-changed'
}

/**
 * Compare what the report is about to show against what it last showed.
 *
 * What this can detect: a different frame, a page whose rendered DOM moved, a
 * page that renders differently while its DOM is byte-identical, and — where
 * the capture recorded no page hash — any change in the bytes at all.
 *
 * What it cannot: a visual change on a page whose generated values also
 * changed in the same capture. There the pixel difference has two possible
 * causes and the seal will not invent one, so it stays quiet. Standardising
 * those values in the page before the shot is what removes the ambiguity —
 * see maskVolatileOnPage in capture/screens.js — and it is why that masking
 * and this comparison have to be maintained together. It also cannot see a
 * page-model plate: a finding with no picture on a side is not sealed on that
 * side at all, and its plate can change without a word.
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
        const kind = driftKind(was, now)
        if (!kind) return
        drift.push({
          id,
          side: sideId,
          row: index,
          kind,
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

/**
 * Read the seal store, or start an empty one.
 *
 * @param {string} path
 * @returns {object}
 */
export const readSeals = (path) =>
  existsSync(path) ? (readJsonFile(path).seals ?? {}) : {}

/**
 * Record what the capture knows about a picture already sealed, without
 * accepting anything.
 *
 * A store written before the page hash and the fingerprint existed holds
 * neither, so every seal in it is compared on its bytes alone and stays that
 * way for as long as it is kept — and it is kept until a person reseals, which
 * is deliberately not a thing a build does. This fills the two facts in on a
 * seal whose frame and bytes are exactly the picture in front of the render
 * now. It is the same picture, so nothing is being accepted: anything that
 * moved has a different frame or different bytes, is reported as drift, and
 * keeps the seal it drifted from untouched.
 *
 * @param {object|null} stored
 * @param {object|null} now
 * @returns {object|null}
 */
const annotate = (stored, now) => {
  if (!stored || !now) return stored
  // Nothing to add. A capture that records neither leaves the store exactly as
  // it found it, rather than stamping nulls through a file a person reads.
  if (!now.content && !now.volatile) return stored
  if (stored.content && stored.volatile) return stored
  if (framesDiffer(stored, now) || stored.sha256 !== now.sha256) return stored
  return {
    ...stored,
    content: stored.content ?? now.content ?? null,
    volatile: stored.volatile ?? now.volatile ?? null
  }
}

const annotateSides = (stored, now) =>
  Object.fromEntries(
    Object.entries(stored).map(([sideId, seals]) => [
      sideId,
      seals.map((seal, index) => annotate(seal, now?.[sideId]?.[index] ?? null))
    ])
  )

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
      else next[id] = annotateSides(sealed[id], sides)
    }
  }
  writeJsonAtomic(path, {
    _note: SEALS_NOTE,
    sealedAt: at ?? new Date().toISOString(),
    seals: next
  })
  return next
}
