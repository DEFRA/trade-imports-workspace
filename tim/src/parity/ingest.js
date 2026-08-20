import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { parseBacklog, parseIncrement } from './schema.js'
import { TimError } from '../errors.js'

/** Where a corpus keeps the finding files agents author, one file per finding. */
export const FINDINGS_DIR = 'findings'

/**
 * The status a finding is born with.
 *
 * Read from the corpus rather than invented: the build loop keys on this exact
 * word, and a backlog whose unstarted work says "new" would be skipped by
 * every loop script without anything failing.
 */
export const INITIAL_STATUS = 'todo'

/** The shapes of work a finding may be. Anything else is a typo. */
export const FINDING_TYPES = [
  'add-page',
  'add-section',
  'add-collection',
  'add-field',
  'obligation-change',
  'flow-change',
  'copy-change'
]

export const CONFIDENCES = ['high', 'medium', 'low']

/** The four prose slots every finding file must carry. */
export const PROSE_SLOTS = [
  'frontend',
  'prototype',
  'difference',
  'falsifiedBy'
]

/**
 * Where this corpus's finding files live.
 *
 * Derived from the workarea rather than declared in corpora.json, so a corpus
 * cannot name a findings directory that is not beside its specs and its
 * evidence.
 *
 * @param {object} profile - A loaded corpus profile
 * @returns {string}
 */
export const findingsDir = (profile) =>
  join(profile.paths.workarea, FINDINGS_DIR)

const fail = (file, message) => {
  throw new TimError('PARSE', `${file}: ${message}`)
}

const requireText = (value, field, file) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(file, `"${field}" is missing or empty.`)
  }
  return value.trim()
}

const optionalText = (value, field, file) => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') fail(file, `"${field}" must be text.`)
  return value.trim()
}

/**
 * What a verifier wrote against one finding, wherever it wrote it.
 *
 * The record of having looked lives under `finding.verification`, and older
 * files put it at the top level, so both are read. Exported because the check
 * that runs before an ingest and the ingest itself have to agree exactly on
 * what counts as verified — two readings of that would let a finding pass one
 * and fail the other.
 *
 * @param {object} raw - A finding file as parsed
 * @returns {string|null}
 */
export const verificationOf = (raw) => {
  const value = raw?.finding?.verification ?? raw?.verification
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

const requireFrom = (value, field, allowed, file) => {
  if (!allowed.includes(value)) {
    fail(
      file,
      `"${field}" is "${value ?? 'missing'}". This corpus allows: ${allowed.join(', ')}.`
    )
  }
  return value
}

/**
 * Every screen id the corpus has a picture of, across all sides.
 *
 * A finding naming a screen nobody photographed renders as a broken promise —
 * the report reads the manifest and nothing else — so the ingest refuses it.
 * When no side has a manifest yet the check cannot run at all, and saying so is
 * more honest than rejecting every finding in the directory.
 *
 * @param {object} profile
 * @returns {{known: Set<string>, sides: object[], checkable: boolean}}
 */
export const manifestScreens = (profile) => {
  const known = new Set()
  const sides = profile.sides.map((side) => {
    if (!side.manifest || !existsSync(side.manifest)) {
      return { side: side.id, found: false, screens: 0 }
    }
    const rows = readJsonFile(side.manifest).rows ?? []
    for (const row of rows) if (row.screen) known.add(row.screen)
    return { side: side.id, found: true, screens: rows.length }
  })
  return { known, sides, checkable: sides.some((side) => side.found) }
}

/**
 * Read and validate one authored finding file.
 *
 * Every refusal names the file and the field. A finding silently dropped for a
 * misspelt band is a difference nobody ever sees again, which is worse than a
 * build that stops and says which file to fix.
 *
 * @param {object} args
 * @param {object} args.raw - The parsed finding file
 * @param {string} args.file - Its file name, for the error message
 * @param {string[]} args.bands - The band ids this corpus declares
 * @param {{known: Set<string>, checkable: boolean}} args.screens
 * @returns {object} The finding, normalised
 * @throws {TimError} PARSE, naming the file and the field
 */
export const validateFinding = ({ raw, file, bands, screens }) => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail(file, 'is not a finding object.')
  }

  const slice = requireText(raw.slice, 'slice', file)
  const title = requireText(raw.title, 'title', file)
  const domain = requireText(raw.domain, 'domain', file)
  const type = requireFrom(raw.type, 'type', FINDING_TYPES, file)
  const band = requireFrom(raw.band, 'band', bands, file)
  const confidence = requireFrom(
    raw.confidence,
    'confidence',
    CONFIDENCES,
    file
  )

  if (!Array.isArray(raw.screens) || raw.screens.length === 0) {
    fail(file, '"screens" names no screen. A finding nobody can look at.')
  }
  for (const screen of raw.screens) {
    if (typeof screen !== 'string' || screen.trim() === '') {
      fail(file, '"screens" holds an entry that is not a screen id.')
    }
    if (screens.checkable && !screens.known.has(screen)) {
      fail(
        file,
        `"${screen}" is in no side's capture manifest, so nothing can show it.`
      )
    }
  }

  const controls = raw.controls ?? []
  if (!Array.isArray(controls)) {
    fail(file, '"controls" must be a list, or absent for a whole-page finding.')
  }

  const evidence = raw.evidence ?? {}
  if (
    typeof evidence !== 'object' ||
    evidence === null ||
    Array.isArray(evidence)
  ) {
    fail(file, '"evidence" must be an object of side to path.')
  }

  const finding = raw.finding
  if (typeof finding !== 'object' || finding === null) {
    fail(file, '"finding" is missing. It carries the four prose slots.')
  }
  const slots = Object.fromEntries(
    PROSE_SLOTS.map((slot) => [
      slot,
      requireText(finding[slot], `finding.${slot}`, file)
    ])
  )

  if (raw.relatedTo !== undefined && !Array.isArray(raw.relatedTo)) {
    fail(file, '"relatedTo" must be a list.')
  }

  // Type-checked here, where every other field is, and then read back through
  // the one function that decides what counts as verified — so the gate below
  // and the check that runs before it can never disagree about a finding.
  optionalText(finding.verification ?? raw.verification, 'verification', file)

  return {
    file,
    slice,
    title,
    domain,
    type,
    band,
    confidence,
    screens: raw.screens,
    controls,
    evidence,
    slots,
    // A verifier writes these onto the file rather than editing the author's
    // prose, so they are authored input like any other slot — but they are not
    // part of the composed detail, which is why a correction can be added after
    // the first ingest without tripping the freeze.
    correction: optionalText(
      finding.correction ?? raw.correction,
      'correction',
      file
    ),
    verification: verificationOf(raw) ?? undefined,
    relatedTo: raw.relatedTo,
    carriedFrom: optionalText(raw.carriedFrom, 'carriedFrom', file)
  }
}

/**
 * Every finding file in the directory, validated, in the order they will be
 * numbered: slice, then file name.
 *
 * @param {object} args
 * @param {string} args.dir
 * @param {string[]} args.bands
 * @param {{known: Set<string>, checkable: boolean}} args.screens
 * @returns {object[]}
 * @throws {TimError} NOT_FOUND when the directory does not exist
 */
export const readFindings = ({ dir, bands, screens }) => {
  if (!existsSync(dir)) {
    throw new TimError(
      'NOT_FOUND',
      `No findings at ${dir}. An agent writes one JSON file per finding there; see FINDING-CONTRACT.md in the same workarea.`
    )
  }
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()

  const findings = files.map((file) =>
    validateFinding({
      raw: readJsonFile(join(dir, file)),
      file,
      bands,
      screens
    })
  )

  // Slice first, file name second. Both are on disk and neither changes when a
  // finding is added, so the order two runs see is the same order.
  return findings.sort(
    (a, b) => a.slice.localeCompare(b.slice) || a.file.localeCompare(b.file)
  )
}

/**
 * The frozen oracle, composed from the four authored slots.
 *
 * `detail` proves a later language pass lost nothing: the invariants compare
 * every rewritten slot back against it. That only works while it is the text
 * the finding was born with, so it is written once and never again — and a
 * re-ingest that would change one refuses rather than quietly re-baselining the
 * thing the check is measured against.
 *
 * @param {{frontend: string, prototype: string, difference: string, falsifiedBy: string}} slots
 * @returns {string}
 */
export const composeDetail = (slots) =>
  [
    slots.frontend,
    slots.prototype,
    slots.difference,
    `FALSIFIED BY: ${slots.falsifiedBy}`
  ].join('\n\n')

const numberOf = (id) => {
  const match = /^inc-(\d+)$/.exec(id ?? '')
  return match ? Number(match[1]) : 0
}

const idFor = (n) => `inc-${String(n).padStart(3, '0')}`

/**
 * Give every finding file an id, and never move one.
 *
 * An id is what a ruling, a citation and a build-loop commit are attached to.
 * Numbering by position alone would renumber half the backlog the moment an
 * agent adds a finding whose file sorts early, and every ruling already made
 * would then be attached to a different finding — silently, because the shape
 * still validates. So a file that already has an id keeps it, and only a file
 * nobody has seen before takes the next number.
 *
 * @param {object} args
 * @param {object[]} args.findings - In slice-then-file order
 * @param {object[]} args.existing - Increments already in the backlog
 * @param {boolean} [args.replace] - Renumber from one, ignoring what is there
 * @returns {Map<string, string>} File name to increment id
 */
export const assignIds = ({ findings, existing, replace }) => {
  if (replace) {
    return new Map(findings.map((finding, i) => [finding.file, idFor(i + 1)]))
  }
  const known = new Map(
    existing
      .filter((increment) => typeof increment.source === 'string')
      .map((increment) => [increment.source, increment.id])
  )
  let next = existing.reduce((max, i) => Math.max(max, numberOf(i.id)), 0)
  return new Map(
    findings.map((finding) => {
      const held = known.get(finding.file)
      if (held) return [finding.file, held]
      next += 1
      return [finding.file, idFor(next)]
    })
  )
}

/** An id this tool already assigned, rather than a file slug an author wrote. */
const INCREMENT_ID = /^inc-\d+$/

/** The name a finding file is cross-referred by: its file name without .json. */
const slugOf = (file) => file.replace(/\.json$/, '')

/**
 * Point every relatedTo at the increment it means.
 *
 * An author writes a cross-reference before any increment id exists — this run
 * is what hands them out — so the contract has them name the other finding by
 * its file slug. Turning that into an id here, in the same pass that assigns
 * the ids, is what lets a finding refer to one written later in the same batch.
 *
 * A slug that resolves to nothing stops the run and names the file and the
 * slug. The alternatives are both worse: a dangling id surfaces three commands
 * later as a failing contract test, and a dropped entry is a link the report
 * never shows and nobody ever misses.
 *
 * A finding naming itself is rejected rather than dropped, for the same reason
 * every other malformed field is. Dropping it would leave the author believing
 * they had written a cross-reference, and the slug they meant is unrecoverable
 * — only they know which other finding it was.
 *
 * @param {object} args
 * @param {object} args.finding - A validated finding
 * @param {string} args.id - The increment id this run gave it
 * @param {Map<string, string>} args.slugs - Every slug in the run, to its id
 * @returns {object[] | undefined} relatedTo with ids resolved, shape untouched
 * @throws {TimError} PARSE, naming the file and the slug
 */
export const resolveRelatedTo = ({ finding, id, slugs }) => {
  if (!finding.relatedTo) return undefined
  return finding.relatedTo.map((relation) => {
    if (typeof relation?.id !== 'string' || relation.id.trim() === '') {
      fail(
        finding.file,
        '"relatedTo" holds an entry with no "id". Name the other finding by its file slug.'
      )
    }
    const named = relation.id.trim()
    // An id that is already resolved passes straight through, so re-ingesting a
    // merged backlog resolves the same field twice to the same answer.
    const resolved = INCREMENT_ID.test(named) ? named : slugs.get(named)
    if (!resolved) {
      fail(
        finding.file,
        `"relatedTo" names "${named}", which is no finding in this run. Use the other finding's file name without ".json".`
      )
    }
    if (resolved === id) {
      fail(
        finding.file,
        `"relatedTo" names "${named}", which is this finding itself.`
      )
    }
    return { ...relation, id: resolved }
  })
}

const authoredFields = ({ finding, id, corpus }) => ({
  id,
  slice: finding.slice,
  // The file this increment came from. Identity lives here rather than in the
  // id, because the id has to be able to stay still while the sort order moves.
  source: finding.file,
  type: finding.type,
  domain: finding.domain,
  title: finding.title,
  screens: finding.screens,
  controls: finding.controls,
  evidence: finding.evidence,
  confidence: finding.confidence,
  band: finding.band,
  corpus,
  ...(finding.carriedFrom ? { carriedFrom: finding.carriedFrom } : {})
})

const authoredFinding = (finding) => ({
  frontend: finding.slots.frontend,
  prototype: finding.slots.prototype,
  difference: finding.slots.difference,
  falsifiedBy: finding.slots.falsifiedBy,
  ...(finding.correction ? { correction: finding.correction } : {}),
  ...(finding.verification ? { verification: finding.verification } : {}),
  ...(finding.relatedTo ? { relatedTo: finding.relatedTo } : {})
})

const born = ({ finding, id, corpus }) => ({
  ...authoredFields({ finding, id, corpus }),
  milestone: null,
  detail: composeDetail(finding.slots),
  gate: null,
  dependsOn: [],
  status: INITIAL_STATUS,
  commit: null,
  failure_reason: null,
  finding: authoredFinding(finding)
})

/**
 * Fold an authored file back onto an increment that already exists.
 *
 * Spread the old one first and the authored fields over the top, so anything
 * this tool does not own — the ruling, the commit, the citations, the gate, the
 * visual frames, a key some later tool added — survives untouched. That is what
 * makes re-running safe once work has started.
 *
 * @param {object} args
 * @returns {object}
 */
const refreshed = ({ increment, finding, id, corpus }) => ({
  ...increment,
  ...authoredFields({ finding, id, corpus }),
  detail: increment.detail || composeDetail(finding.slots),
  finding: { ...(increment.finding ?? {}), ...authoredFinding(finding) }
})

/**
 * The rulings that make a rebuild destructive.
 *
 * @param {object[]} increments
 * @returns {string[]} Increment ids
 */
export const ruled = (increments) =>
  increments
    .filter(
      (increment) =>
        (increment.decision ?? null) !== null ||
        increment.status !== INITIAL_STATUS
    )
    .map((increment) => increment.id)

const readExisting = (path) =>
  existsSync(path) ? parseBacklog(readJsonFile(path)) : null

/**
 * The build-loop target the backlog names.
 *
 * The backlog already on disk wins, because changing it under a run in flight
 * would point the loop at another codebase. Otherwise the one place the default
 * is written down.
 *
 * @param {object} args
 * @returns {string}
 * @throws {TimError} USAGE when nothing names one
 */
const resolveTarget = ({ workspaceRoot, existing, explicit }) => {
  if (explicit) return explicit
  if (existing?.target) return existing.target
  const path = join(workspaceRoot, 'tools', 'journey-builder', 'targets.json')
  const fallback = existsSync(path) ? readJsonFile(path).default : null
  if (fallback) return fallback
  throw new TimError(
    'USAGE',
    'Nothing names a build-loop target for this backlog. Pass --target.'
  )
}

const tally = (findings, key) =>
  findings.reduce(
    (counts, finding) => ({
      ...counts,
      [finding[key]]: (counts[finding[key]] ?? 0) + 1
    }),
    {}
  )

/**
 * Assemble backlog.json from the finding files an agent wrote.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {string} args.workspaceRoot
 * @param {boolean} [args.replace] - Rebuild from scratch rather than merging
 * @param {boolean} [args.dryRun] - Report and write nothing
 * @param {string} [args.target] - Override the build-loop target
 * @returns {object} A summary of what was written
 * @throws {TimError} PARSE for a bad finding file, USAGE for a destructive rebuild
 */
export const runIngest = ({
  profile,
  workspaceRoot,
  replace = false,
  dryRun = false,
  target
}) => {
  const dir = findingsDir(profile)
  const screens = manifestScreens(profile)
  const bands = profile.bands.map((band) => band.id)
  const findings = readFindings({ dir, bands, screens })

  const backlogPath = profile.paths.backlog
  const existing = readExisting(backlogPath)
  const existingIncrements = existing?.increments ?? []

  if (replace && existingIncrements.length) {
    const blocked = ruled(existingIncrements)
    if (blocked.length) {
      throw new TimError(
        'USAGE',
        `--replace would discard rulings on ${blocked.length} increments: ${blocked.join(', ')}. Re-run without it to merge, or move the backlog aside first.`
      )
    }
  }

  const ids = assignIds({
    findings,
    existing: existingIncrements,
    replace
  })
  const byId = new Map(existingIncrements.map((i) => [i.id, i]))
  const slugs = new Map(
    [...ids].map(([file, incrementId]) => [slugOf(file), incrementId])
  )

  // A finding whose file has gone leaves the backlog with it — striking a
  // finding is a deliberate act. Striking one somebody has already ruled on or
  // built is not, so that stops the run and says which file to put back.
  const present = new Set(findings.map((finding) => finding.file))
  const dropped = existingIncrements.filter(
    (increment) => increment.source && !present.has(increment.source)
  )
  const droppedRulings = ruled(dropped)
  if (droppedRulings.length) {
    throw new TimError(
      'USAGE',
      `These increments hold a ruling but their finding files are no longer in ${dir}: ${droppedRulings.join(', ')}. Put the files back, or clear the rulings first.`
    )
  }

  const frozen = []
  const increments = findings.map((authored) => {
    const id = ids.get(authored.file)
    const finding = {
      ...authored,
      relatedTo: resolveRelatedTo({ finding: authored, id, slugs })
    }
    const previous = replace ? undefined : byId.get(id)
    if (!previous) return born({ finding, id, corpus: profile.id })
    const wouldBe = composeDetail(finding.slots)
    if (previous.detail && previous.detail !== wouldBe) {
      frozen.push(`${id} (${finding.file})`)
    }
    return refreshed({ increment: previous, finding, id, corpus: profile.id })
  })

  if (frozen.length) {
    throw new TimError(
      'USAGE',
      `detail is frozen at first ingest and these findings would change it: ${frozen.join(', ')}. It is the oracle a later language pass is measured against, so edit the prose with "tim parity set-slot" instead, which leaves detail alone.`
    )
  }

  // The verify-before-ingest gate. Until a corpus asks for it this rule was
  // held by reading order alone, and one command run early froze a corpus over
  // unverified prose permanently. A corpus that does not declare
  // requireVerification is untouched: the corpora that predate the flag ingested
  // without one and re-ingesting them must stay a no-op.
  if (profile.requireVerification) {
    const unverified = findings
      .filter((finding) => !byId.has(ids.get(finding.file)) || replace)
      .filter((finding) => !finding.verification)
      .map((finding) => finding.file)
    if (unverified.length) {
      throw new TimError(
        'USAGE',
        `${unverified.length} findings carry no verification record and this corpus requires one before a first ingest: ${unverified.join(', ')}. A verifier that found nothing and a verifier that looked at nothing leave the same trace, so the record is what tells them apart — and ingest freezes detail permanently, so it has to exist first. Run "tim parity yield ${profile.runId}" for the whole list.`
      )
    }
  }

  const backlog = {
    ...(existing ?? {}),
    run_id: profile.runId,
    target: resolveTarget({ workspaceRoot, existing, explicit: target }),
    corpus: profile.id,
    increments: increments.map((increment, index) =>
      parseIncrement(increment, index)
    )
  }

  const write = dryRun ? null : writeJsonAtomic(backlogPath, backlog)

  // A rebuild has no history to be new against: every increment in it was
  // written by this run, whatever number it happens to carry.
  const isNew = (finding) => replace || !byId.has(ids.get(finding.file))
  return {
    path: backlogPath,
    findingsDir: dir,
    written: Boolean(write),
    total: findings.length,
    new: findings.filter(isNew).length,
    refreshed: findings.filter((finding) => !isNew(finding)).length,
    carriedOver: findings.filter((finding) => finding.carriedFrom).length,
    dropped: dropped.map((increment) => increment.id),
    byBand: tally(findings, 'band'),
    byDomain: tally(findings, 'domain'),
    byType: tally(findings, 'type'),
    screensCheckable: screens.checkable,
    assignment: findings.map((finding) => ({
      id: ids.get(finding.file),
      file: finding.file,
      slice: finding.slice,
      isNew: isNew(finding)
    }))
  }
}
