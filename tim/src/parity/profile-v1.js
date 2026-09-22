import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
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

const tally = (items, key) =>
  items.reduce(
    (counts, item) => ({
      ...counts,
      [item[key]]: (counts[item[key]] ?? 0) + 1
    }),
    {}
  )

const slotFinding = ({ slots, correction, verification, relatedTo }) => ({
  frontend: slots.frontend,
  prototype: slots.prototype,
  difference: slots.difference,
  falsifiedBy: slots.falsifiedBy,
  ...(correction ? { correction } : {}),
  ...(verification ? { verification } : {}),
  ...(relatedTo ? { relatedTo } : {})
})

/**
 * The `parity-v1` profile definition: today's finding-writer behaviour,
 * expressed as the hooks the generic core in `backlog/ingest.js` calls.
 * Every hook here is the hardcoded expression it replaces, moved rather than
 * rewritten — see DESIGN section 4.1's hook table.
 */
export const parityV1 = {
  key: 'parity-v1',
  collection: 'findings',
  itemsKey: 'increments',
  idPrefix: 'inc-',
  identityField: 'source',
  identityOf: (item) => item.file,
  slugOf: (item) => item.file.replace(/\.json$/, ''),
  itemsDir: findingsDir,
  context: (profile) => ({
    bands: profile.bands.map((band) => band.id),
    screens: manifestScreens(profile)
  }),
  validateItem: ({ raw, file, context }) =>
    validateFinding({
      raw,
      file,
      bands: context.bands,
      screens: context.screens
    }),
  sortKey: (item) => [item.slice, item.file],
  references: [
    { field: 'relatedTo', shape: 'object', scope: 'batch', verifyIds: false }
  ],
  frozen: { field: 'detail', compose: (item) => composeDetail(item.slots) },
  bornStatus: () => INITIAL_STATUS,
  isRuled: (row) =>
    (row.decision ?? null) !== null || row.status !== INITIAL_STATUS,
  requireVerification: (profile) => profile.requireVerification === true,
  rowFrom: ({ item, id, profile }) => ({
    id,
    slice: item.slice,
    // The file this increment came from. Identity lives here rather than in
    // the id, because the id has to be able to stay still while the sort
    // order moves.
    source: item.file,
    type: item.type,
    domain: item.domain,
    title: item.title,
    screens: item.screens,
    controls: item.controls,
    evidence: item.evidence,
    confidence: item.confidence,
    band: item.band,
    corpus: profile.id,
    ...(item.carriedFrom ? { carriedFrom: item.carriedFrom } : {}),
    finding: slotFinding(item)
  }),
  bornExtras: () => ({
    milestone: null,
    gate: null,
    dependsOn: [],
    commit: null,
    failure_reason: null
  }),
  // Spread the old finding sub-object first and the authored one over the
  // top, so anything this tool does not own — a citation, a decisionRequired,
  // a hand resolution written by a later pass — survives a re-ingest.
  foldOnto: ({ row, authored }) => ({
    finding: { ...(row.finding ?? {}), ...(authored.finding ?? {}) }
  }),
  header: ({ existing, profile, workspaceRoot, options }) => ({
    run_id: profile.runId,
    target: resolveTarget({
      workspaceRoot,
      existing,
      explicit: options.target
    }),
    corpus: profile.id
  }),
  parseBacklog,
  parseItem: parseIncrement,
  summary: ({ items, dir, context }) => ({
    findingsDir: dir,
    carriedOver: items.filter((item) => item.carriedFrom).length,
    byBand: tally(items, 'band'),
    byDomain: tally(items, 'domain'),
    byType: tally(items, 'type'),
    screensCheckable: context.screens.checkable
  }),
  messages: {
    itemsDirMissing: (dir) =>
      `No findings at ${dir}. An agent writes one JSON file per finding there; see FINDING-CONTRACT.md in the same workarea.`,
    replaceBlocked: (ids) =>
      `--replace would discard rulings on ${ids.length} increments: ${ids.join(', ')}. Re-run without it to merge, or move the backlog aside first.`,
    droppedRuling: ({ dir, rows }) =>
      `These increments hold a ruling but their finding files are no longer in ${dir}: ${rows.map((row) => row.id).join(', ')}. Put the files back, or clear the rulings first.`,
    frozenChanged: (entries) =>
      `detail is frozen at first ingest and these findings would change it: ${entries.join(', ')}. It is the oracle a later language pass is measured against, so edit the prose with "tim parity set-slot" instead, which leaves detail alone.`,
    unverified: (files, profile) =>
      `${files.length} findings carry no verification record and this corpus requires one before a first ingest: ${files.join(', ')}. A verifier that found nothing and a verifier that looked at nothing leave the same trace, so the record is what tells them apart — and ingest freezes detail permanently, so it has to exist first. Run "tim parity yield ${profile.runId}" for the whole list.`,
    referenceNoId: (field) =>
      `"${field}" holds an entry with no "id". Name the other finding by its file slug.`,
    referenceUnknown: (field, named) =>
      `"${field}" names "${named}", which is no finding in this run. Use the other finding's file name without ".json".`,
    referenceSelf: (field, named) =>
      `"${field}" names "${named}", which is this finding itself.`
  }
}
