import { existsSync } from 'node:fs'
import { readJsonFile } from './io.js'
import { parseBacklog, parseDeferred } from './schema.js'
import { isWithdrawn } from './counts.js'
import { joinFindings } from './join.js'

export const FALSIFIED_SENTINEL = 'FALSIFIED BY:'
export const CORRECTED_SENTINEL = 'CORRECTED DURING VERIFICATION:'

/**
 * Split the flattened detail back into its parts.
 *
 * build-increments.js joined three fields into one string with sentinel
 * markers; build-page.js splits them back out with indexOf. This does the same
 * thing so the report renders the unmigrated backlog on day one, which is what
 * lets it ship before the 97-item content pass finishes.
 *
 * @param {string} detail
 * @returns {{body: string, correction: string|null, falsifiedBy: string|null}}
 */
export const splitSentinels = (detail) => {
  const text = detail ?? ''
  const correctedAt = text.indexOf(CORRECTED_SENTINEL)
  const falsifiedAt = text.indexOf(FALSIFIED_SENTINEL)

  const cut = (from, to) => text.slice(from, to === -1 ? undefined : to).trim()

  const firstMarker = [correctedAt, falsifiedAt].filter((n) => n !== -1)
  const bodyEnd = firstMarker.length ? Math.min(...firstMarker) : -1

  return {
    body: cut(0, bodyEnd),
    correction:
      correctedAt === -1
        ? null
        : cut(
            correctedAt + CORRECTED_SENTINEL.length,
            falsifiedAt > correctedAt ? falsifiedAt : -1
          ),
    falsifiedBy:
      falsifiedAt === -1
        ? null
        : cut(
            falsifiedAt + FALSIFIED_SENTINEL.length,
            correctedAt > falsifiedAt ? correctedAt : -1
          )
  }
}

const section = (text, source) =>
  text && text.trim().length ? { text: text.trim(), source } : null

/**
 * Build the six prose sections for one increment.
 *
 * Where the migration has run, finding.* wins. Where it has not, three of the
 * six come from splitting the sentinels and one — verification, the best-written
 * text in the corpus and the only one the old page never rendered at all —
 * comes from the upstream findings file through the title join.
 *
 * @param {object} increment
 * @param {object|null} finding - The joined upstream finding
 * @returns {object}
 */
export const buildSections = (increment, finding, prose = {}) => {
  // Prefer the [[cN]]-marked copy of the prose where evidence.json has one, so
  // the day-one page carries live citations without the migration having run.
  const split = splitSentinels(prose.detail ?? increment.detail)
  const migrated = increment.finding ?? {}

  return {
    frontend: section(migrated.frontend, 'finding'),
    prototype: section(migrated.prototype, 'finding'),
    difference: section(migrated.difference, 'finding'),
    // The unmigrated body is one block describing both sides. Rendering it in
    // the difference slot is honest — it is what the analyst wrote — and it
    // keeps the two columns from claiming a split that has not happened yet.
    body:
      migrated.frontend || migrated.prototype
        ? null
        : section(split.body, 'sentinel-split'),
    correction:
      section(migrated.correction, 'finding') ??
      section(split.correction, 'sentinel-split') ??
      section(finding?.correction, 'upstream'),
    falsifiedBy:
      section(migrated.falsifiedBy, 'finding') ??
      section(split.falsifiedBy, 'sentinel-split') ??
      section(finding?.falsifiedBy, 'upstream'),
    verification:
      section(migrated.verification, 'finding') ??
      section(finding?.verification, 'upstream')
  }
}

/**
 * Everything the renderer needs about one card, in one shape, whatever kind of
 * thing it is. Cards degrade by omitting blocks, never by rendering an empty
 * label.
 *
 * @param {object} args
 * @returns {object}
 */
const toItem = ({ increment, finding, evidence, kind }) => ({
  kind,
  id: increment.id,
  anchor: increment.id,
  title: increment.title,
  domain: increment.domain,
  type: increment.type,
  band: increment.band,
  confidence: increment.confidence,
  milestone: increment.milestone,
  status: increment.status,
  gate: increment.gate,
  screens: increment.screens ?? [],
  evidence: increment.evidence ?? {},
  detail: increment.detail,
  sections: buildSections(increment, finding, evidence?.prose ?? {}),
  decision: increment.decision ?? null,
  decisionRequired: increment.finding?.decisionRequired ?? null,
  relatedTo: increment.finding?.relatedTo ?? [],
  notes: increment.notes ?? [],
  citations: increment.citations ?? [],
  resolvedCitations: evidence?.citations ?? [],
  prose: evidence?.prose ?? {},
  visual: increment.visual ?? [],
  dependsOn: increment.dependsOn ?? [],
  dependents: []
})

const candidateItem = (candidate) => ({
  kind: 'candidate',
  id: candidate.id,
  anchor: candidate.id,
  title: candidate.title,
  domain: candidate.domain,
  type: null,
  band: null,
  confidence: null,
  milestone: null,
  status: null,
  gate: null,
  screens: [],
  evidence: candidate.evidence ?? {},
  detail: candidate.detail,
  sections: {
    frontend: null,
    prototype: null,
    difference: null,
    body: section(candidate.detail, 'candidate'),
    correction: null,
    falsifiedBy: null,
    verification: null
  },
  decision: null,
  decisionRequired: null,
  relatedTo: [],
  notes: [],
  citations: [],
  resolvedCitations: [],
  prose: {},
  visual: [],
  dependsOn: [],
  dependents: [],
  verified: candidate.verified
})

/**
 * Load a corpus into one flat list of report items plus the derived facts the
 * page shell needs.
 *
 * @param {object} args
 * @param {object} args.profile
 * @returns {object}
 */
export const loadCorpus = ({ profile }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))

  const findings = existsSync(profile.paths.upstreamFindings)
    ? readJsonFile(profile.paths.upstreamFindings)
    : { survived: [] }
  const { byId, report: joinReport } = joinFindings(
    backlog.increments,
    findings
  )

  const evidence = existsSync(profile.paths.evidence)
    ? readJsonFile(profile.paths.evidence)
    : { increments: {} }

  const meta = existsSync(profile.paths.meta)
    ? readJsonFile(profile.paths.meta)
    : null

  const deferred = existsSync(profile.paths.deferred)
    ? parseDeferred(readJsonFile(profile.paths.deferred))
    : { candidates: [] }

  const items = backlog.increments.map((increment) =>
    toItem({
      increment,
      finding: byId.get(increment.id) ?? null,
      evidence: evidence.increments?.[increment.id],
      kind: isWithdrawn(increment) ? 'withdrawn' : 'increment'
    })
  )

  const byIdItem = new Map(items.map((item) => [item.id, item]))
  for (const item of items) {
    for (const dependency of item.dependsOn) {
      byIdItem.get(dependency)?.dependents.push(item.id)
    }
  }

  const candidates = deferred.candidates.map(candidateItem)

  return {
    backlog,
    meta,
    deferred,
    joinReport,
    findings: items.filter((item) => item.kind === 'increment'),
    withdrawn: items.filter((item) => item.kind === 'withdrawn'),
    candidates,
    all: [...items, ...candidates],
    evidence
  }
}
