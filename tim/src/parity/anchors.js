import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile, writeJsonAtomic } from './io.js'

/**
 * The delta files carry the element identifiers no finding currently points at.
 * A field delta names the control, and the extractor normalises every control
 * kind to `name` on both codebases — which makes the name the one anchor that
 * transfers, where a CSS selector would not.
 *
 * A hidden field is machinery, not something on the page, so it is never an
 * anchor.
 */
const USABLE = (delta) =>
  delta.controlKind !== 'hidden' && delta.name !== 'crumb'

const keyFor = (anchor) =>
  `${anchor.kind}-${(anchor.name ?? anchor.text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`

/**
 * Turn one delta file's field deltas into anchors per side.
 *
 * @param {object} delta - A parsed delta file
 * @param {{frontend: string, prototype: string}} pair - The two screen ids
 * @returns {Record<string, Array<object>>} side to anchors
 */
export const anchorsFromDelta = (delta, pair) => {
  const out = { frontend: [], prototype: [] }
  const add = (side, anchor) => {
    const withKey = { ...anchor, key: keyFor(anchor) }
    if (!out[side].some((existing) => existing.key === withKey.key)) {
      out[side].push(withKey)
    }
  }

  for (const item of delta.deltas ?? []) {
    if (!item.kind?.startsWith('field') || !USABLE(item)) continue

    // A prototype control the extractor could not name — the search inputs are
    // the common case. Anchor it by its label instead, which is what a person
    // would look for.
    const unnamed = item.name?.startsWith('unnamed:')
    const anchor = unnamed
      ? {
          kind: 'label',
          text: item.label ?? item.name.slice('unnamed:'.length)
        }
      : { kind: 'field', name: item.name }

    if (item.kind === 'field-changed') {
      add('frontend', { ...anchor, why: changeSummary(item) })
      add('prototype', { ...anchor, why: changeSummary(item) })
    }
    if (item.kind === 'field-only-frontend') {
      add('frontend', { ...anchor, why: 'only on this side' })
    }
    if (item.kind === 'field-only-prototype') {
      add('prototype', { ...anchor, why: 'only on this side' })
    }
  }

  return { [pair.frontend]: out.frontend, [pair.prototype]: out.prototype }
}

const changeSummary = (item) =>
  (item.changes ?? []).map((change) => change.attr).join(', ') || 'differs'

/**
 * Build the anchor files.
 *
 * Emitting anchors as data is what stops a spec edit ever being needed again:
 * the capture helper loads the file for its side and shoots everything declared
 * for the screen it was called with, so adding element evidence to a finding is
 * a data change forever after.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {boolean} [args.write]
 * @returns {object}
 */
export const runSeedAnchors = ({ profile, write }) => {
  const dir = profile.paths.deltasDir
  if (!existsSync(dir)) {
    return { sides: {}, written: false, why: `No delta files at ${dir}.` }
  }

  const bySide = Object.fromEntries(profile.sideIds.map((id) => [id, {}]))

  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue
    const [frontend, prototype] = name.replace(/\.json$/, '').split('__')
    if (!frontend || !prototype) continue

    const anchors = anchorsFromDelta(readJsonFile(join(dir, name)), {
      frontend,
      prototype
    })
    for (const [screen, list] of Object.entries(anchors)) {
      if (list.length === 0) continue
      const side = profile.sides.find((s) => screen.startsWith(s.screenPrefix))
      if (!side) continue
      bySide[side.id][screen] = [...(bySide[side.id][screen] ?? []), ...list]
    }
  }

  const written = []
  for (const side of profile.sides) {
    if (!side.evidenceRoot) continue
    const path = join(
      profile.workspaceRoot,
      side.evidenceRoot,
      `anchors.${side.id}.json`
    )
    const payload = {
      side: side.id,
      builtFrom: 'compare/deltas — field deltas, hidden controls excluded',
      screens: bySide[side.id]
    }
    if (write) writeJsonAtomic(path, payload)
    written.push({
      side: side.id,
      screens: Object.keys(bySide[side.id]).length,
      anchors: Object.values(bySide[side.id]).reduce(
        (n, list) => n + list.length,
        0
      ),
      path
    })
  }

  return { sides: written, written: Boolean(write) }
}
