import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from './io.js'
import { findingsDir, verificationOf } from './ingest.js'
import {
  readSlices,
  slicesPath,
  ownership,
  manifestScreensBySide
} from './slices.js'

/**
 * How far under the middle of the pack a slice may sit before it is worth
 * asking about.
 *
 * An agent that ran out of context and truncated looks exactly like a slice
 * with little to report, and nothing else in this pipeline tells them apart.
 * The number is a prompt to ask, not a verdict: a service really does have
 * quiet corners, and a declaration page with one finding on it is not a
 * failure. Two-fifths of the median is low enough that a normal spread does
 * not trip it and high enough that half a run's output going missing does.
 */
export const THIN_FRACTION = 0.4

/**
 * Every authored finding, read raw.
 *
 * Raw rather than validated, because this command has to be able to report on a
 * batch that has not been made ingestible yet — that is most of the time it is
 * useful. A malformed file is counted and named rather than stopping the run.
 *
 * @param {string} dir
 * @returns {{findings: object[], unreadable: object[], found: boolean}}
 */
export const readAuthored = (dir) => {
  if (!existsSync(dir)) return { findings: [], unreadable: [], found: false }
  const findings = []
  const unreadable = []
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    try {
      findings.push({ file, raw: readJsonFile(join(dir, file)) })
    } catch (error) {
      unreadable.push({ file, why: error.message })
    }
  }
  return { findings, unreadable, found: true }
}

const median = (numbers) => {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * What each slice produced, against the screens it owns.
 *
 * @param {object} args
 * @param {Array<{id: string, screens: string[], chrome: boolean}>} args.slices
 * @param {object[]} args.findings - From readAuthored
 * @param {number} args.fraction
 * @returns {object[]}
 */
export const perSlice = ({ slices, findings, fraction }) => {
  const rows = slices.map((slice) => {
    const mine = findings.filter((finding) => finding.raw?.slice === slice.id)
    const verified = mine.filter((finding) => verificationOf(finding.raw))
    return {
      slice: slice.id,
      chrome: slice.chrome,
      screens: slice.screens.length,
      findings: mine.length,
      verified: verified.length,
      unverified: mine
        .filter((finding) => !verificationOf(finding.raw))
        .map((finding) => finding.file),
      corrected: mine.filter(
        (finding) => finding.raw?.finding?.correction ?? finding.raw?.correction
      ).length,
      perScreen: slice.screens.length
        ? mine.length / slice.screens.length
        : null
    }
  })

  // Only slices that own screens set the expectation. A slice given no screens
  // has no denominator, so including it would drag the middle of the pack
  // toward zero and stop the check firing on the run it exists for.
  //
  // The chrome slice is left out of the expectation and never flagged, because
  // its denominator is a lie. It owns a handful of screens and its SCOPE is the
  // furniture on every screen in the corpus, so its findings-per-screen is
  // whatever its screen list happens to be — on the run this was written for,
  // 0.25 against a middle of 1.29, which flagged the one slice that had done
  // the most cross-cutting work. Counting it also dragged the middle down and
  // made every other slice harder to flag.
  const measured = rows.filter((row) => row.perScreen !== null && !row.chrome)
  const middle = median(measured.map((row) => row.perScreen))
  const floor = middle * fraction

  return rows.map((row) => ({
    ...row,
    thin: row.chrome
      ? false
      : row.perScreen !== null && middle > 0
        ? row.perScreen < floor
        : row.screens > 0 && row.findings === 0,
    expected: middle,
    floor
  }))
}

/**
 * Findings filed under a slice nobody was given, and findings whose screens
 * belong to somebody else.
 *
 * Both are the same failure seen from two ends: an agent working outside its
 * brief. The first is cheap to spot and the second is the one that produces a
 * duplicate, because the slice that actually owns those screens is writing
 * about them too.
 *
 * @param {object} args
 * @param {object[]} args.findings
 * @param {Set<string>} args.sliceIds
 * @param {Map<string, string[]>} args.owner
 * @param {string} [args.chrome] - The slice that owns the chrome, if any
 * @returns {{homeless: object[], strayed: object[]}}
 */
export const misfiled = ({ findings, sliceIds, owner, chrome }) => {
  const homeless = []
  const strayed = []

  for (const { file, raw } of findings) {
    const slice = raw?.slice
    if (typeof slice !== 'string' || !sliceIds.has(slice)) {
      homeless.push({ file, slice: slice ?? null })
      continue
    }
    // The chrome slice cannot stray. Its subject is the furniture on every
    // screen in the corpus, so a chrome finding names whichever screens show
    // the difference best — which are almost never the handful it was given.
    // Flagging that reported the one slice doing its job as the one working
    // outside its brief.
    if (slice === chrome) continue

    const screens = Array.isArray(raw?.screens) ? raw.screens : []
    const owners = screens.flatMap((screen) => owner.get(screen) ?? [])
    // Only when NO screen it names is its own. A finding spanning two slices'
    // screens is ordinary — the pairing splits some pairs — but a finding none
    // of whose screens the author owns was written by the wrong agent.
    if (owners.length && !owners.includes(slice)) {
      strayed.push({ file, slice, screens, owners: [...new Set(owners)] })
    }
  }
  return { homeless, strayed }
}

/**
 * Did every slice deliver, and was every finding looked at by somebody?
 *
 * Two questions the rest of the pipeline cannot answer. A verifier that found
 * nothing and a verifier that looked at nothing leave the same trace — none —
 * so the verification slot is required rather than inferred, and this is where
 * a missing one is cheap to fix. After the first ingest it is not: `detail` is
 * frozen from that moment, over whatever prose was there.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {string} [args.file] - A slicing somewhere other than the workarea
 * @param {number} [args.fraction] - Override THIN_FRACTION
 * @returns {object}
 */
export const runYield = ({ profile, file, fraction = THIN_FRACTION }) => {
  const path = file ?? slicesPath(profile)
  const slices = readSlices(path)
  const dir = findingsDir(profile)
  const { findings, unreadable, found } = readAuthored(dir)

  const captured = manifestScreensBySide(profile)
  const { owner } = ownership({ slices, captured: captured.screens })
  const rows = perSlice({ slices, findings, fraction })
  const { homeless, strayed } = misfiled({
    findings,
    sliceIds: new Set(slices.map((slice) => slice.id)),
    owner,
    chrome: slices.find((slice) => slice.chrome)?.id
  })

  const unverified = rows.flatMap((row) => row.unverified)
  const thin = rows.filter((row) => row.thin).map((row) => row.slice)

  return {
    path,
    findingsDir: dir,
    findingsDirFound: found,
    total: findings.length,
    slices: rows,
    thin,
    unverified,
    homeless,
    strayed,
    unreadable,
    // Ingest freezes detail over whatever is there. Everything above has to be
    // clear before that, and this is the one line that says so.
    readyToIngest:
      found &&
      findings.length > 0 &&
      unverified.length === 0 &&
      homeless.length === 0 &&
      unreadable.length === 0,
    exitNonZero: false
  }
}

/**
 * @param {object} result - From runYield
 * @returns {string}
 */
export const renderYield = (result) => {
  if (!result.findingsDirFound) {
    return `No findings at ${result.findingsDir} yet. Nothing to weigh.`
  }

  const lines = [
    `${result.total} findings across ${result.slices.length} slices.`,
    'slice                 screens  findings  per screen  verified  corrected'
  ]
  const chrome = result.slices.find((row) => row.chrome)
  if (chrome) {
    lines.push(
      `* ${chrome.slice} owns the chrome, so its per-screen figure is not comparable and it is never flagged: its scope is the furniture on every screen, not the ${chrome.screens} it holds.`
    )
  }
  for (const row of result.slices) {
    lines.push(
      [
        `  ${row.slice}${row.chrome ? ' *' : ''}`.padEnd(22),
        String(row.screens).padStart(7),
        String(row.findings).padStart(10),
        (row.perScreen === null ? '-' : row.perScreen.toFixed(2)).padStart(12),
        String(row.verified).padStart(10),
        String(row.corrected).padStart(11),
        row.thin ? '   THIN' : ''
      ].join('')
    )
  }

  if (result.thin.length) {
    lines.push(
      `${result.thin.join(', ')} came in under ${(result.slices[0]?.floor ?? 0).toFixed(2)} findings per screen, against a middle of ${(result.slices[0]?.expected ?? 0).toFixed(2)}. Ask each one what it covered. An agent that ran out of context and truncated looks exactly like a slice with little to report.`
    )
  }

  if (result.unverified.length) {
    lines.push(
      `${result.unverified.length} findings carry no verification record, so nothing says whether a verifier found nothing or looked at nothing:`
    )
    for (const file of result.unverified.slice(0, 20)) {
      lines.push(`  ${file}`)
    }
    if (result.unverified.length > 20) {
      lines.push(`  … and ${result.unverified.length - 20} more`)
    }
  }

  for (const entry of result.homeless) {
    lines.push(
      `  no such slice  ${entry.file} is filed under "${entry.slice ?? 'nothing'}", which the slicing does not name`
    )
  }
  for (const entry of result.strayed) {
    lines.push(
      `  wrong slice    ${entry.file} is filed under "${entry.slice}" but every screen it names belongs to ${entry.owners.join(', ')}`
    )
  }
  for (const entry of result.unreadable) {
    lines.push(`  unreadable     ${entry.file}: ${entry.why}`)
  }

  lines.push(
    result.readyToIngest
      ? 'Every finding carries a verification record and is filed under a slice that exists. Safe to ingest.'
      : 'Not ready to ingest. Ingest composes detail from the prose and freezes it permanently, so everything above has to be clear first.'
  )
  return lines.join('\n')
}
