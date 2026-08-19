import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from './io.js'
import { loadCorpus } from './load.js'
import { loadPairs, indexPairs, screenPairsFor } from './assets/pairs.js'
import { readSeals } from './seals.js'

/**
 * Is the evidence file still about the commits the corpus is pinned to?
 *
 * evidence.json records the pins it was generated from. A pin that has moved
 * since means every URL, blob id and snippet in it is of code the report is no
 * longer talking about — which is the one failure the whole pinning design
 * exists to make impossible to miss.
 *
 * @param {object} args
 * @param {object} args.evidence
 * @param {object} args.meta
 * @returns {object[]} One entry per repo whose pin moved
 */
export const pinDrift = ({ evidence, meta }) => {
  const was = evidence?.generatedFrom?.pins ?? {}
  const now = Object.fromEntries(
    Object.entries(meta?.pins ?? {}).map(([repo, pin]) => [
      repo,
      pin.sha ?? pin
    ])
  )
  return Object.keys({ ...was, ...now })
    .filter((repo) => was[repo] !== now[repo])
    .map((repo) => ({
      repo,
      was: was[repo] ?? null,
      now: now[repo] ?? null
    }))
}

/**
 * Does the capture on disk say it is of the commit the corpus claims?
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {object} args.meta
 * @returns {object[]}
 */
export const captureIntegrity = ({ profile, meta }) =>
  profile.sides.map((side) => {
    const declared = meta?.captures?.[side.id]?.sha ?? null
    const dir =
      side.evidenceRoot && declared
        ? join(
            profile.workspaceRoot,
            side.evidenceRoot,
            `${side.id}@${declared}`
          )
        : null
    const manifestPath = dir ? join(dir, 'manifest.json') : null
    if (!manifestPath || !existsSync(manifestPath)) {
      return {
        side: side.id,
        declared,
        ok: false,
        why: declared
          ? `No manifest at ${manifestPath}. The pictures the corpus claims have not been captured, or were captured somewhere else.`
          : 'The corpus declares no capture for this side.',
        regenerate: side.captureCommand ?? null
      }
    }
    const manifest = readJsonFile(manifestPath)
    const appSha = manifest.appSha ?? ''
    return {
      side: side.id,
      declared,
      rows: manifest.rows?.length ?? 0,
      crops: (manifest.rows ?? []).reduce(
        (n, row) => n + (row.crops ?? []).filter((crop) => crop.file).length,
        0
      ),
      deviceScaleFactor: manifest.deviceScaleFactor ?? null,
      ok: appSha.startsWith(declared),
      why: appSha.startsWith(declared)
        ? null
        : `The manifest says it is of ${appSha.slice(0, 8)}, the corpus says ${declared}.`,
      regenerate: side.captureCommand ?? null
    }
  })

/**
 * Screens a finding points at that no manifest has a row for.
 *
 * @param {object} args
 * @param {object[]} args.items
 * @param {object} args.pairIndex
 * @param {object[]} args.sides
 * @param {Record<string, Set<string>>} args.captured
 * @returns {object[]}
 */
export const missingRows = ({ items, pairIndex, sides, captured }) => {
  const wanted = Object.fromEntries(sides.map((side) => [side.id, new Map()]))
  for (const item of items) {
    for (const row of screenPairsFor({
      screens: item.screens,
      pairIndex,
      sides
    })) {
      for (const side of sides) {
        const screen = row[side.id]?.screen
        if (!screen) continue
        const seen = wanted[side.id].get(screen) ?? []
        wanted[side.id].set(screen, [...seen, item.id])
      }
    }
  }
  return sides.flatMap((side) =>
    [...wanted[side.id].entries()]
      .filter(([screen]) => !captured[side.id]?.has(screen))
      .map(([screen, cited]) => ({ side: side.id, screen, cited }))
  )
}

/**
 * Anchors declared for a screen that matched nothing when it was shot.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {object} args.meta
 * @returns {object[]}
 */
export const unresolvedAnchors = ({ profile, meta }) =>
  profile.sides.flatMap((side) => {
    const declared = meta?.captures?.[side.id]?.sha
    if (!side.evidenceRoot || !declared) return []
    const path = join(
      profile.workspaceRoot,
      side.evidenceRoot,
      `${side.id}@${declared}`,
      'manifest.json'
    )
    if (!existsSync(path)) return []
    return (readJsonFile(path).rows ?? []).flatMap((row) =>
      (row.crops ?? [])
        .filter((crop) => !crop.file)
        .map((crop) => ({
          side: side.id,
          screen: row.screen,
          anchor: crop.anchor,
          why: crop.why
        }))
    )
  })

/**
 * Citations whose target has moved, split by what a person would have to do.
 *
 * @param {object} evidence
 * @returns {object}
 */
export const citationHealth = (evidence) => {
  const rows = Object.entries(evidence?.increments ?? {}).flatMap(
    ([id, item]) =>
      Object.entries(item.citations ?? {}).map(([ref, citation]) => ({
        id,
        ref,
        ...citation
      }))
  )
  return {
    total: rows.length,
    queued: rows.filter((row) => row.state === 'unresolved').length,
    notPushed: rows
      .filter((row) => row.pushed === false)
      .map((row) => `${row.id}/${row.ref}`),
    // The identifier is in the file but outside the cited lines: widen it.
    outOfRange: rows
      .filter((row) => row.anchorCheck?.outOfRange?.length)
      .map((row) => ({
        at: `${row.id}/${row.ref}`,
        anchors: row.anchorCheck.outOfRange
      })),
    // The identifier is not in the file at all: the claim's premise has moved
    // and the finding needs re-verifying, not the line range nudging.
    missingFromFile: rows
      .filter((row) => row.anchorCheck?.missingFromFile?.length)
      .map((row) => ({
        at: `${row.id}/${row.ref}`,
        anchors: row.anchorCheck.missingFromFile
      }))
  }
}

/**
 * Everything the evidence pipeline can say about its own state.
 *
 * The point of gathering it in one command is that no single check is enough:
 * a green coverage number over a stale pin, or a clean citation list against a
 * capture nobody re-ran, both read as "the evidence is fine" when it is not.
 *
 * @param {object} args
 * @param {object} args.profile
 * @returns {object}
 */
export const runCheckEvidence = ({ profile }) => {
  const corpus = loadCorpus({ profile })
  const evidence = existsSync(profile.paths.evidence)
    ? readJsonFile(profile.paths.evidence)
    : null
  const meta = corpus.meta

  const captures = captureIntegrity({ profile, meta })
  const captured = Object.fromEntries(
    captures.map((capture) => {
      const side = profile.sideById[capture.side]
      const declared = meta?.captures?.[capture.side]?.sha
      if (!side?.evidenceRoot || !declared) return [capture.side, new Set()]
      const path = join(
        profile.workspaceRoot,
        side.evidenceRoot,
        `${side.id}@${declared}`,
        'manifest.json'
      )
      if (!existsSync(path)) return [capture.side, new Set()]
      return [
        capture.side,
        new Set((readJsonFile(path).rows ?? []).map((row) => row.screen))
      ]
    })
  )

  const pairIndex = indexPairs(loadPairs(profile.paths.pairingModule))
  const items = [...corpus.findings, ...corpus.withdrawn]

  const seals = readSeals(profile.paths.seals)

  return {
    corpus: profile.id,
    evidencePresent: Boolean(evidence),
    pinDrift: evidence ? pinDrift({ evidence, meta }) : [],
    captures,
    missingRows: missingRows({
      items,
      pairIndex,
      sides: profile.sides,
      captured
    }),
    unresolvedAnchors: unresolvedAnchors({ profile, meta }),
    citations: evidence
      ? citationHealth(evidence)
      : {
          total: 0,
          queued: 0,
          notPushed: [],
          outOfRange: [],
          missingFromFile: []
        },
    sealed: Object.keys(seals).length,
    regenerate: regenerationCommands({ profile, evidence, meta })
  }
}

/**
 * The exact commands that would produce what is absent.
 *
 * Naming the command is the difference between a report someone acts on and a
 * report someone reads. Nothing here is run: a capture takes a stack and a
 * running application, and guessing that they are up would be worse than
 * printing the line.
 *
 * @param {object} args
 * @returns {string[]}
 */
export const regenerationCommands = ({ profile, evidence, meta }) => {
  const out = []
  if (!evidence) {
    out.push(`tim parity evidence ${profile.runId} --write`)
  } else if (pinDrift({ evidence, meta }).length) {
    out.push(
      `tim parity meta ${profile.runId} --write   # re-read the pins`,
      `tim parity evidence ${profile.runId} --write   # re-resolve every citation at them`
    )
  }
  for (const side of profile.sides) {
    if (side.captureCommand) out.push(side.captureCommand)
  }
  out.push(`tim parity report ${profile.runId}`)
  return out
}

const bullet = (line) => `  - ${line}`

/**
 * @param {object} result
 * @returns {string}
 */
export const renderCheckEvidence = (result) => {
  const lines = [`evidence check — ${result.corpus}`, '']

  if (!result.evidencePresent) {
    lines.push('evidence.json is missing. Nothing below is trustworthy.', '')
  }

  lines.push('pins')
  lines.push(
    result.pinDrift.length === 0
      ? bullet('every repo is at the commit the evidence was generated from.')
      : result.pinDrift
          .map((entry) =>
            bullet(
              `${entry.repo} moved: evidence is of ${String(entry.was).slice(0, 8)}, the corpus is pinned to ${String(entry.now).slice(0, 8)}.`
            )
          )
          .join('\n')
  )

  lines.push('', 'captures')
  for (const capture of result.captures) {
    lines.push(
      bullet(
        capture.ok
          ? `${capture.side} @ ${capture.declared}: ${capture.rows} screens, ${capture.crops} crops, ${capture.deviceScaleFactor}x.`
          : `${capture.side}: ${capture.why}`
      )
    )
  }

  lines.push('', 'screens with no picture')
  lines.push(
    result.missingRows.length === 0
      ? bullet('none — every cited screen has a manifest row.')
      : result.missingRows
          .map((row) =>
            bullet(
              `${row.side}/${row.screen} — cited by ${row.cited.join(', ')}`
            )
          )
          .join('\n')
  )

  lines.push('', 'anchors that matched nothing')
  lines.push(
    result.unresolvedAnchors.length === 0
      ? bullet('none.')
      : result.unresolvedAnchors
          .map((entry) =>
            bullet(
              `${entry.side}/${entry.screen} ${entry.anchor}: ${entry.why}`
            )
          )
          .join('\n')
  )

  lines.push('', 'citations')
  lines.push(bullet(`${result.citations.total} resolved to a permalink.`))
  if (result.citations.queued) {
    lines.push(bullet(`${result.citations.queued} still queued for a human.`))
  }
  if (result.citations.notPushed.length) {
    lines.push(
      bullet(
        `${result.citations.notPushed.length} point at commits that are not pushed, so their links 404 for anyone else.`
      )
    )
  }
  lines.push(
    bullet(
      `${result.citations.outOfRange.length} name an identifier that is in the file but outside the cited lines — widen the range.`
    )
  )
  lines.push(
    bullet(
      `${result.citations.missingFromFile.length} name an identifier that is not in the file at all — re-verify the finding, do not nudge the lines.`
    )
  )

  lines.push('', `${result.sealed} findings have a sealed picture.`)
  lines.push('', 'to regenerate')
  lines.push(...result.regenerate.map(bullet))

  return lines.join('\n')
}

/**
 * What makes this check fail rather than merely report.
 *
 * A moved pin and a missing capture invalidate the page. A citation whose
 * anchor has drifted does not: that is a finding to re-verify, and it is the
 * expected yield of pinning to HEAD rather than a fault in the pipeline.
 *
 * @param {object} result
 * @returns {string[]}
 */
export const blockers = (result) => {
  const out = []
  if (!result.evidencePresent) out.push('evidence.json is missing')
  for (const entry of result.pinDrift) {
    out.push(`${entry.repo} pin moved since the evidence was generated`)
  }
  for (const capture of result.captures.filter((c) => !c.ok)) {
    out.push(`${capture.side} capture: ${capture.why}`)
  }
  return out
}
