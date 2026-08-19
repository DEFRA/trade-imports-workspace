import { existsSync, readdirSync } from 'node:fs'
import { readJsonFile } from './io.js'
import { parseBacklog, parseDeferred } from './schema.js'

/**
 * Statuses that mean the finding is no longer in play. A withdrawn finding
 * stays in the file as a recorded decision, and must never be counted among
 * the findings the report presents.
 */
export const WITHDRAWN_STATUSES = new Set(['dropped'])

const tally = (values) => {
  const out = {}
  for (const value of values) {
    const key = value ?? 'none'
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

const countFiles = (dir, suffix) =>
  existsSync(dir)
    ? readdirSync(dir).filter((name) => name.endsWith(suffix)).length
    : 0

/**
 * Is this increment still a live finding, or has it been withdrawn?
 *
 * @param {object} increment
 * @returns {boolean}
 */
export const isWithdrawn = (increment) =>
  WITHDRAWN_STATUSES.has(increment.status) ||
  increment.decision?.ruling === 'falsified'

/**
 * Every number the report puts on the page, derived from the data. Nothing
 * here is ever hardcoded into a template: the page this replaces claimed 103
 * page models against a real 104, and 60 corrections against a real 39.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @returns {{counts: object}}
 */
export const runCounts = ({ profile }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const live = backlog.increments.filter((inc) => !isWithdrawn(inc))
  const withdrawn = backlog.increments.filter(isWithdrawn)

  const deferred = existsSync(profile.paths.deferred)
    ? parseDeferred(readJsonFile(profile.paths.deferred))
    : { candidates: [] }

  const deltaSummaryPath = `${profile.paths.deltasDir}/_summary.json`
  const deltaSummary = existsSync(deltaSummaryPath)
    ? readJsonFile(deltaSummaryPath)
    : null

  const models = Object.fromEntries(
    profile.sides.map((side) => [side.id, countFiles(side.modelDir, '.json')])
  )
  const screenshots = Object.fromEntries(
    profile.sides.map((side) => [
      side.id,
      side.screensDir ? countFiles(side.screensDir, '.png') : 0
    ])
  )

  return {
    counts: {
      findings: live.length,
      withdrawn: withdrawn.length,
      inFile: backlog.increments.length,
      deferredCandidates: deferred.candidates.length,

      byBand: tally(live.map((inc) => inc.band)),
      byDomain: tally(live.map((inc) => inc.domain)),
      byType: tally(live.map((inc) => inc.type)),
      byConfidence: tally(live.map((inc) => inc.confidence)),
      byStatus: tally(live.map((inc) => inc.status)),
      byGate: tally(live.map((inc) => inc.gate)),

      gated: live.filter((inc) => inc.gate).length,
      ruled: live.filter((inc) => inc.decision).length,
      awaitingRuling: live.filter((inc) => inc.gate && !inc.decision).length,
      withNotes: backlog.increments.filter((inc) => inc.notes?.length).length,
      notes: backlog.increments.reduce(
        (n, inc) => n + (inc.notes?.length ?? 0),
        0
      ),

      corrected: live.filter(
        (inc) =>
          (inc.finding?.correction ?? '').trim().length > 0 ||
          inc.detail.includes('CORRECTED DURING VERIFICATION:')
      ).length,

      pageModels: {
        ...models,
        total: Object.values(models).reduce((a, b) => a + b, 0)
      },
      screenshots,
      deltas: deltaSummary?.totalDeltas ?? null,
      pairsCompared: deltaSummary?.pairsCompared ?? null,

      migrated: live.filter((inc) => inc.finding?.frontend).length,
      withCitations: live.filter((inc) => inc.citations?.length).length,
      citations: backlog.increments.reduce(
        (n, inc) => n + (inc.citations?.length ?? 0),
        0
      ),
      // Citations the resolver refused to guess at. Shown on the page because a
      // queue nobody can see is a queue nobody works.
      citationsQueued: backlog.increments.reduce(
        (n, inc) =>
          n +
          (inc.citations ?? []).filter(
            (citation) => citation.resolution === 'unresolved'
          ).length,
        0
      ),
      withVisual: live.filter((inc) => inc.visual?.length).length
    }
  }
}
