import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'

const require = createRequire(import.meta.url)

/**
 * Load the hand-authored screen pairing.
 *
 * pairs.js is CommonJS and stays that way: it is judgement rather than reusable
 * code, and its own header says a wrong pairing produces a confident diff of two
 * unrelated pages. Reading it through createRequire keeps that file untouched.
 *
 * @param {string} path - Absolute path to pairs.js
 * @returns {{pairs: object[], onlyFrontend: object[], onlyPrototype: object[]}}
 */
export const loadPairs = (path) => {
  if (!existsSync(path)) {
    return { pairs: [], onlyFrontend: [], onlyPrototype: [] }
  }
  const module = require(path)
  return {
    pairs: module.pairs ?? [],
    onlyFrontend: module.onlyFrontend ?? [],
    onlyPrototype: module.onlyPrototype ?? []
  }
}

/**
 * Index every screen name to the screens it is paired with on the other sides.
 *
 * screens[] on an increment is not enough on its own: it gives a matched pair
 * for only 21 of the 49 gated findings, and until Pass 0 ran, 4 of its entries
 * were two screen names in one string.
 *
 * @param {object} pairing - From loadPairs
 * @returns {Map<string, Record<string, string[]>>}
 */
export const indexPairs = (pairing) => {
  const index = new Map()
  const add = (screen, side, other) => {
    if (!index.has(screen)) index.set(screen, {})
    const entry = index.get(screen)
    entry[side] = entry[side] ?? []
    if (other && !entry[side].includes(other)) entry[side].push(other)
  }

  for (const pair of pairing.pairs) {
    add(pair.frontend, 'prototype', pair.prototype)
    add(pair.prototype, 'frontend', pair.frontend)
  }
  for (const entry of pairing.onlyFrontend) add(entry.screen, 'prototype', null)
  for (const entry of pairing.onlyPrototype) add(entry.screen, 'frontend', null)
  return index
}

/**
 * Work out which screen each side should show for one finding.
 *
 * A finding's screens[] may name one side, both, or neither. Where it names
 * one, the pairing supplies the other; where the pairing says there is no
 * counterpart, the other side is deliberately absent, which is itself the
 * finding.
 *
 * @param {object} args
 * @param {string[]} args.screens
 * @param {object} args.pairIndex - From indexPairs
 * @param {object[]} args.sides - From the corpus profile
 * @returns {Array<Record<string, {screen: string|null, why: string}>>}
 */
export const screenPairsFor = ({ screens, pairIndex, sides }) => {
  const rows = []
  const claimed = new Set()

  for (const screen of screens) {
    if (claimed.has(screen)) continue
    const side = sides.find((s) => screen.startsWith(s.screenPrefix))
    if (!side) continue

    const row = {}
    row[side.id] = { screen, why: 'named by the finding' }
    claimed.add(screen)

    for (const other of sides) {
      if (other.id === side.id) continue
      const named = screens.find(
        (candidate) =>
          candidate !== screen && candidate.startsWith(other.screenPrefix)
      )
      if (named && !claimed.has(named)) {
        row[other.id] = { screen: named, why: 'named by the finding' }
        claimed.add(named)
        continue
      }
      const paired = pairIndex.get(screen)?.[other.id] ?? []
      row[other.id] = paired.length
        ? { screen: paired[0], why: 'paired in pairs.js' }
        : {
            screen: null,
            why: pairIndex.has(screen)
              ? 'pairs.js records no counterpart on this side'
              : 'this screen is not in pairs.js'
          }
    }
    rows.push(row)
  }

  return rows
}
