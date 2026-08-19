import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from './io.js'
import { TimError } from '../errors.js'

const require = createRequire(import.meta.url)

/**
 * Load a corpus's screen enumerator.
 *
 * "Which screens does this application have" is per-application knowledge —
 * the prototype answers it from a views directory, a route table and a session
 * flag; the frontend answers it from its journey definition. That belongs in
 * the corpus beside the comparison, not in tim, so the enumerator is a
 * hand-authored CommonJS module the way `pairs.js` is.
 *
 * It reads the source tree. It does not open a browser, and it must not: the
 * whole point is an answer that costs nothing and cannot be wrong about a
 * screen it failed to reach, because it never had to reach one.
 *
 * @param {string} path - Absolute path to the enumerator module
 * @returns {Record<string, Function>} Side id to enumerator, empty if none
 */
export const loadEnumerators = (path) => {
  if (!path || !existsSync(path)) return {}
  const module = require(path)
  return module.enumerators ?? {}
}

/**
 * Every screen a side's capture actually recorded.
 *
 * Read from the manifest rather than by globbing, for the same reason the
 * report reads it: the manifest is the index, and a directory listing counts
 * files that no run claims.
 *
 * @param {string} captureDir
 * @returns {{screens: string[], path: string, found: boolean}}
 */
export const capturedScreens = (captureDir) => {
  const path = captureDir ? join(captureDir, 'manifest.json') : null
  if (!path || !existsSync(path)) {
    return { screens: [], path, found: false }
  }
  const rows = readJsonFile(path).rows ?? []
  return {
    screens: rows.map((row) => row.screen).filter(Boolean),
    path,
    found: true
  }
}

/**
 * The set differences that answer "did we get everything".
 *
 * Three answers, not two, because a captured screen the enumeration did not
 * predict means one of two quite different things.
 *
 * Most of them are states rather than pages — an error variant, a populated
 * list, a conditional reveal — which a static read of the views cannot know
 * about and which a spec is right to have captured. Those are named
 * `<screen>-<state>`, so they can be attributed to their page mechanically and
 * counted rather than listed.
 *
 * What is left over is a screen nothing in the source accounts for. That is
 * either a spec photographing something it should not, or a gap in the
 * enumerator, and it is the only part of this list worth reading line by line.
 *
 * @param {object} args
 * @param {Array<{screen: string, why?: string}>} args.expected
 * @param {string[]} args.captured
 * @returns {{missing: object[], states: object[], unexplained: string[], both: string[]}}
 */
export const compareCoverage = ({ expected, captured }) => {
  const shot = new Set(captured)
  const named = expected.map((entry) => entry.screen)
  const isNamed = new Set(named)

  const unaccounted = captured.filter((screen) => !isNamed.has(screen)).sort()
  const states = []
  const unexplained = []

  for (const screen of unaccounted) {
    // Longest first, so `reason-for-import-transit` is attributed to
    // `reason-for-import-transit` rather than to `reason-for-import`.
    const of = named
      .filter((page) => screen.startsWith(`${page}-`))
      .sort((a, b) => b.length - a.length)[0]
    if (of) states.push({ screen, of })
    else unexplained.push(screen)
  }

  return {
    missing: expected.filter((entry) => !shot.has(entry.screen)),
    states,
    unexplained,
    both: expected
      .filter((entry) => shot.has(entry.screen))
      .map((entry) => entry.screen)
  }
}

/**
 * Coverage for one side: what the source says it has, against what was shot.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {object} args.side - A side from the corpus profile
 * @param {Record<string, Function>} args.enumerators
 * @returns {object}
 */
export const coverageForSide = ({ profile, side, enumerators }) => {
  const enumerate = enumerators[side.id]
  if (!enumerate) {
    return {
      side: side.id,
      enumerated: false,
      why: `The corpus enumerator names no "${side.id}". Add it to the module ${profile.paths.enumeratorModule ?? 'the corpus points enumeratorModule at'}, or this side cannot be checked for coverage.`
    }
  }

  const repoPath = profile.repos[side.repo]?.absolutePath ?? null
  const expected = enumerate({ repoPath, side }) ?? []

  // Which pictures count is the corpus's statement, not a directory listing.
  // Capture ids are immutable — a capture at a new commit writes a new
  // directory rather than overwriting the old one — so several may sit side by
  // side, and only `captures` says which one the comparison rests on.
  const declared = profile.captures?.[side.id]?.sha ?? null
  const captureDir =
    side.evidenceRoot && declared
      ? join(profile.workspaceRoot, side.evidenceRoot, `${side.id}@${declared}`)
      : side.captureDir

  const { screens, path, found } = capturedScreens(captureDir)
  const why = declared
    ? found
      ? null
      : `The corpus declares a capture at ${declared} but there is no manifest at ${path}.`
    : 'The corpus declares no capture for this side, so nothing here counts as captured yet. Run the capture, then record its sha under "captures" in tools/parity/corpora.json.'
  const { missing, states, unexplained, both } = compareCoverage({
    expected,
    captured: screens
  })

  return {
    side: side.id,
    enumerated: true,
    declared,
    manifest: path,
    manifestFound: found,
    why,
    expected: expected.length,
    captured: screens.length,
    covered: both.length,
    missing,
    states,
    unexplained,
    // A side whose enumeration is fully covered is the only honest way to say
    // the comparison is complete for it. Everything else is a stated gap.
    complete: found && missing.length === 0
  }
}

/**
 * Coverage across every side of a comparison.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} [args.side] - Just one side
 * @returns {{sides: object[], complete: boolean}}
 * @throws {TimError} NOT_FOUND for an unknown side
 */
export const runCoverage = ({ profile, side: only }) => {
  if (only && !profile.sideById[only]) {
    throw new TimError(
      'NOT_FOUND',
      `Unknown side "${only}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }
  const enumerators = loadEnumerators(profile.paths.enumeratorModule)
  const sides = profile.sides
    .filter((side) => !only || side.id === only)
    .map((side) => coverageForSide({ profile, side, enumerators }))

  return {
    sides,
    complete: sides.every((entry) => entry.complete),
    exitNonZero: false
  }
}
