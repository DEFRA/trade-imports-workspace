import { execFileSync } from 'node:child_process'
import { relative } from 'node:path'
import { readJsonFile } from './io.js'
import { parseBacklog } from './schema.js'
import { markersIn, wordCount } from './render/prose.js'
import { tokeniseIncrement } from './citations/parse.js'
import { isWithdrawn } from './counts.js'

const SLOTS = [
  'frontend',
  'prototype',
  'difference',
  'correction',
  'falsifiedBy',
  'verification'
]

export const BUDGETS = {
  frontend: 60,
  prototype: 60,
  difference: 90,
  falsifiedBy: 40,
  question: 25
}

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20
}

const HEDGES = [
  'may',
  'might',
  'appears to',
  'seems to',
  'some',
  'possibly',
  'perhaps',
  'largely',
  'generally',
  'usually'
]

const ABSOLUTES = [
  'no',
  'never',
  'only',
  'always',
  'exactly',
  'unconditionally',
  'every',
  'all',
  'none',
  'zero'
]

/**
 * Read a file at a git ref. The baseline for the first three invariants is the
 * pre-migration blob rather than a copy on disk, so the oracle cannot drift.
 *
 * @param {string} workspaceRoot
 * @param {string} ref
 * @param {string} path - Absolute
 * @returns {any|null}
 */
export const readAtRef = (workspaceRoot, ref, path) => {
  const relativePath = relative(workspaceRoot, path)
  try {
    return JSON.parse(
      execFileSync(
        'git',
        ['-C', workspaceRoot, 'show', `${ref}:${relativePath}`],
        {
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024
        }
      )
    )
  } catch {
    return null
  }
}

const slotsOf = (increment) =>
  Object.fromEntries(
    SLOTS.map((slot) => [slot, increment.finding?.[slot] ?? '']).filter(
      ([, value]) => typeof value === 'string'
    )
  )

const allSlotText = (increment) => Object.values(slotsOf(increment)).join('\n')

/** I1. detail is frozen forever — it is the only oracle that proves the
 * structure pass and the language pass lost nothing. */
export const checkDetailFrozen = (increments, baseline) => {
  if (!baseline) {
    return { id: 'I1', state: 'skipped', why: 'No baseline ref available.' }
  }
  const before = new Map(baseline.increments.map((inc) => [inc.id, inc.detail]))
  const changed = increments
    .filter((inc) => before.has(inc.id) && before.get(inc.id) !== inc.detail)
    .map((inc) => inc.id)
  return {
    id: 'I1',
    state: changed.length ? 'fail' : 'pass',
    detail: changed.length
      ? `detail changed on ${changed.join(', ')}`
      : `${increments.length} details byte-identical to baseline`
  }
}

/** I2. citations are immutable after Pass A. Markers may move between slots; a
 * citation may never be deleted or edited. */
export const checkCitationsImmutable = (increments, baseline) => {
  if (!baseline) {
    return { id: 'I2', state: 'skipped', why: 'No baseline ref available.' }
  }
  const before = new Map(
    baseline.increments.map((inc) => [inc.id, inc.citations ?? []])
  )
  const problems = []
  for (const increment of increments) {
    const was = before.get(increment.id)
    if (!was?.length) continue
    const now = new Map((increment.citations ?? []).map((c) => [c.ref, c]))
    for (const citation of was) {
      const current = now.get(citation.ref)
      if (!current) {
        problems.push(`${increment.id}/${citation.ref} deleted`)
        continue
      }
      if (
        current.path !== citation.path ||
        current.side !== citation.side ||
        JSON.stringify(current.ranges) !== JSON.stringify(citation.ranges)
      ) {
        problems.push(`${increment.id}/${citation.ref} edited`)
      }
    }
  }
  return {
    id: 'I2',
    state: problems.length ? 'fail' : 'pass',
    detail: problems.length
      ? problems.join('; ')
      : 'no citation deleted or edited'
  }
}

/** I3. every file:line token in the frozen detail and in evidence appears as
 * some citation's asWritten. */
export const checkTokensCovered = (increments) => {
  const missing = []
  let seen = 0
  for (const increment of increments) {
    const written = new Set(
      (increment.citations ?? []).flatMap((citation) => [
        citation.asWritten,
        ...(citation.alsoWritten ?? [])
      ])
    )
    // The tokeniser itself, not a second regex that has to be kept in step with
    // it. A duplicate pattern that read `path:74` where the tokeniser read
    // `path:74,76-77` reported the same citation as both present and missing.
    for (const token of tokeniseIncrement(increment)) {
      if (token.form !== 'named') continue
      seen += 1
      if (!written.has(token.asWritten)) {
        missing.push(`${increment.id}: ${token.asWritten}`)
      }
    }
  }
  return {
    id: 'I3',
    state: missing.length ? 'fail' : 'pass',
    detail: missing.length
      ? `${missing.length} of ${seen} tokens uncited: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`
      : `all ${seen} tokens carry a citation`
  }
}

/** I4. the markers in each slot match that slot's cites, and both are a subset
 * of citations[].ref. */
export const checkMarkers = (increments) => {
  const problems = []
  for (const increment of increments) {
    const refs = new Set((increment.citations ?? []).map((c) => c.ref))
    const cites = increment.finding?.cites ?? {}
    for (const [slot, text] of Object.entries(slotsOf(increment))) {
      const used = markersIn(text)
      for (const ref of used) {
        if (!refs.has(ref)) {
          problems.push(`${increment.id}/${slot}: [[${ref}]] is not a citation`)
        }
      }
      const declared = cites[slot]
      if (declared && declared.sort().join() !== [...used].sort().join()) {
        problems.push(
          `${increment.id}/${slot}: cites disagrees with the markers in the text`
        )
      }
    }
  }
  return {
    id: 'I4',
    state: problems.length ? 'fail' : 'pass',
    detail: problems.length
      ? problems.slice(0, 8).join('; ')
      : 'markers and cites agree'
  }
}

const QUOTED_SPAN = /"([^"]{5,})"/g
const BACKTICKED = /`([^`]+)`/g

// An invariant that compares the frozen detail against the migrated slots has
// nothing to say until at least one finding has been migrated. Saying "0 quoted
// spans survive" would read as a clean bill of health on work not yet done.
const notYetMigrated = (id) => ({
  id,
  state: 'skipped',
  why: 'No finding has been migrated into finding.* yet.'
})

/** I5. quote conservation. Every double-quoted span of five characters or
 * more, and every backticked identifier in the frozen detail, appears verbatim
 * in some slot. No escape hatch.
 *
 * This is the invariant that stops a copy editor silently correcting the typo
 * it is meant to be reporting: on the 26 copy-change findings the quoted UI
 * string IS the finding. */
export const checkQuotes = (increments) => {
  const problems = []
  let checked = 0
  const migrated = increments.filter((inc) => inc.finding)
  if (migrated.length === 0) return notYetMigrated('I5')
  for (const increment of increments) {
    const slots = allSlotText(increment)
    if (!slots.trim()) continue
    const wanted = new Set()
    for (const match of increment.detail.matchAll(QUOTED_SPAN)) {
      wanted.add(match[1])
    }
    for (const match of increment.detail.matchAll(BACKTICKED)) {
      wanted.add(match[1])
    }
    for (const value of wanted) {
      checked += 1
      if (!slots.includes(value)) {
        problems.push(`${increment.id}: "${value.slice(0, 48)}"`)
      }
    }
  }
  return {
    id: 'I5',
    state: problems.length ? 'fail' : 'pass',
    detail: problems.length
      ? `${problems.length} of ${checked} quoted spans lost: ${problems.slice(0, 6).join(', ')}`
      : `${checked} quoted spans and identifiers survive verbatim`
  }
}

const numbersIn = (text) => {
  const found = new Set()
  for (const match of text.matchAll(/\b(\d[\d,]*)\b/g)) {
    found.add(match[1].replace(/,/g, ''))
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) found.add(String(value))
  }
  return found
}

/** I6. number conservation, matched through a one-to-twenty word map so "five
 * items" and "5" both pass. Catches the other common softening: a dropped
 * count. */
export const checkNumbers = (increments) => {
  const problems = []
  let checked = 0
  if (increments.every((inc) => !inc.finding)) return notYetMigrated('I6')
  for (const increment of increments) {
    const slots = allSlotText(increment)
    if (!slots.trim()) continue
    // Line numbers belong to citations, not to the claim.
    const detail = increment.detail.replace(
      /[A-Za-z0-9_@.\-/]+\.[A-Za-z0-9]{1,6}:\d+(-\d+)?/g,
      ''
    )
    const after = numbersIn(slots)
    for (const value of numbersIn(detail)) {
      checked += 1
      if (!after.has(value)) problems.push(`${increment.id}: ${value}`)
    }
  }
  return {
    id: 'I6',
    state: problems.length ? 'fail' : 'pass',
    detail: problems.length
      ? `${problems.length} of ${checked} numbers lost: ${problems.slice(0, 8).join(', ')}`
      : `${checked} numeric claims survive`
  }
}

/** I7. the anchor check, read off evidence.json. */
export const checkAnchorsInvariant = (evidence) => {
  const misses = evidence?.anchorMisses ?? []
  return {
    id: 'I7',
    state: misses.length ? 'warn' : 'pass',
    detail: misses.length
      ? `${misses.length} citations whose snippet does not contain the identifier the prose attributes to it: ${misses
          .slice(0, 6)
          .map((m) => `${m.increment}/${m.ref}`)
          .join(', ')}`
      : 'every anchor appears in its resolved snippet'
  }
}

const STOPWORDS = new Set(
  'a an the and or but of to in on at is are was were be been being it its this that these those with for from as by not no so than then there their they them he she we you i if into over under between about which who whom whose what when where why how do does did done has have had will would can could should may might must new same also only just still yet each any all both more most other another such own too very s t'.split(
    ' '
  )
)

const tokensOf = (text) =>
  text
    .toLowerCase()
    .replace(/\[\[c\d+\]\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))

/** I8. word residue. detail minus citations minus stopwords; 98% or more of
 * tokens present across the slots. Disabled for Pass B by definition. */
export const checkResidue = (increments, threshold = 0.98) => {
  const rows = []
  if (increments.every((inc) => !inc.finding)) return notYetMigrated('I8')
  for (const increment of increments) {
    const slots = allSlotText(increment)
    if (!slots.trim()) continue
    const after = new Set(tokensOf(slots))
    const before = tokensOf(increment.detail)
    const missing = before.filter((word) => !after.has(word))
    const ratio = before.length ? 1 - missing.length / before.length : 1
    rows.push({ id: increment.id, ratio, missing: [...new Set(missing)] })
  }
  const failures = rows.filter((row) => row.ratio < threshold)
  return {
    id: 'I8',
    state: failures.length ? 'fail' : 'pass',
    detail: failures.length
      ? failures
          .map(
            (row) =>
              `${row.id} ${(row.ratio * 100).toFixed(1)}% — residue: ${row.missing.slice(0, 20).join(' ')}`
          )
          .join('\n    ')
      : `${rows.length} migrated findings at or above ${(threshold * 100).toFixed(0)}%`,
    rows
  }
}

/** I9. slot sanity, including the exact counts and the word budgets. */
export const checkSlots = (increments, expected) => {
  const problems = []
  const migrated = increments.filter((inc) => inc.finding)
  const nonEmpty = (slot) =>
    migrated.filter((inc) => (inc.finding?.[slot] ?? '').trim().length > 0)
      .length

  if (migrated.length) {
    for (const slot of [
      'frontend',
      'prototype',
      'difference',
      'falsifiedBy',
      'verification'
    ]) {
      if (nonEmpty(slot) !== migrated.length) {
        problems.push(
          `${slot} empty on ${migrated.length - nonEmpty(slot)} of ${migrated.length} migrated findings`
        )
      }
    }
    if (
      expected?.corrected !== undefined &&
      nonEmpty('correction') !== expected.corrected
    ) {
      problems.push(
        `correction on ${nonEmpty('correction')}, expected ${expected.corrected}`
      )
    }
  }

  const gated = increments.filter((inc) => inc.gate && !isWithdrawn(inc))
  const withQuestion = gated.filter(
    (inc) => inc.finding?.decisionRequired?.question
  )
  if (migrated.length && withQuestion.length !== gated.length) {
    problems.push(
      `${gated.length - withQuestion.length} of ${gated.length} gated findings have no decision question`
    )
  }

  for (const increment of migrated) {
    for (const [slot, budget] of Object.entries(BUDGETS)) {
      const text =
        slot === 'question'
          ? increment.finding?.decisionRequired?.question
          : increment.finding?.[slot]
      if (!text) continue
      const words = wordCount(text)
      if (words > budget && !increment.finding.longBecause) {
        problems.push(
          `${increment.id}/${slot}: ${words} words over a ${budget} budget with no longBecause`
        )
      }
    }
  }

  return {
    id: 'I9',
    state: problems.length ? 'fail' : 'pass',
    detail: problems.length
      ? problems.slice(0, 12).join('; ')
      : `${migrated.length} migrated findings, ${withQuestion.length} of ${gated.length} gated carry a question`
  }
}

/** I10. polarity list. Cannot be a gate: "always" legitimately becomes "on
 * every page". The only defence is the printed list plus an adversarial reader
 * who did not write the text. */
export const checkPolarity = (increments, baseline) => {
  const rows = []
  const before = baseline
    ? new Map(baseline.increments.map((inc) => [inc.id, inc]))
    : null
  for (const increment of increments) {
    const now = allSlotText(increment)
    if (!now.trim()) continue
    const was = before
      ? allSlotText(before.get(increment.id) ?? {})
      : increment.detail
    const has = (text, word) => new RegExp(`\\b${word}\\b`, 'i').test(text)
    const hedgesAdded = HEDGES.filter(
      (word) => has(now, word) && !has(was, word)
    )
    const absolutesLost = ABSOLUTES.filter(
      (word) => has(was, word) && !has(now, word)
    )
    if (hedgesAdded.length || absolutesLost.length) {
      rows.push({ id: increment.id, hedgesAdded, absolutesLost })
    }
  }
  return {
    id: 'I10',
    state: 'advisory',
    detail: rows.length
      ? rows
          .map(
            (row) =>
              `${row.id}${row.hedgesAdded.length ? ` +hedge: ${row.hedgesAdded.join(', ')}` : ''}${row.absolutesLost.length ? ` -absolute: ${row.absolutesLost.join(', ')}` : ''}`
          )
          .join('\n    ')
      : 'no hedge added and no absolute removed',
    rows
  }
}

const GATES = {
  a: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I8', 'I9'],
  b: ['I1', 'I2', 'I4', 'I5', 'I6', 'I9']
}

/**
 * Run the invariants.
 *
 * @param {object} args
 * @returns {object}
 */
export const runCheck = ({ profile, workspaceRoot, pass = 'a', baseline }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  // The baseline is data, not something a person has to remember. --baseline
  // overrides it for a one-off comparison.
  const baselineRef = baseline ?? profile.baselines?.passA ?? null
  const baselineBacklog = baselineRef
    ? readAtRef(workspaceRoot, baselineRef, profile.paths.backlog)
    : null
  let evidence = null
  try {
    evidence = readJsonFile(profile.paths.evidence)
  } catch {
    evidence = null
  }

  const meta = (() => {
    try {
      return readJsonFile(profile.paths.meta)
    } catch {
      return null
    }
  })()

  const results = [
    checkDetailFrozen(backlog.increments, baselineBacklog),
    checkCitationsImmutable(backlog.increments, baselineBacklog),
    checkTokensCovered(backlog.increments),
    checkMarkers(backlog.increments),
    checkQuotes(backlog.increments),
    checkNumbers(backlog.increments),
    checkAnchorsInvariant(evidence),
    pass === 'b'
      ? {
          id: 'I8',
          state: 'skipped',
          why: 'Disabled for Pass B by definition — the words change.'
        }
      : checkResidue(backlog.increments),
    checkSlots(backlog.increments, meta?.counts),
    checkPolarity(backlog.increments, baselineBacklog)
  ]

  const gates = GATES[pass] ?? GATES.a
  const failed = results.filter(
    (result) => gates.includes(result.id) && result.state === 'fail'
  )

  const text = [
    `Pass ${pass.toUpperCase()} · ${backlog.increments.length} increments`,
    baselineBacklog
      ? `baseline: ${baselineRef}${baseline ? '' : ' (from corpora.json)'}`
      : `baseline: ${baselineRef ?? 'none'} — not readable, so I1 and I2 are skipped`,
    '',
    ...results.map(
      (result) =>
        `  ${result.id.padEnd(4)} ${result.state.padEnd(9)} ${result.detail ?? result.why ?? ''}`
    ),
    '',
    failed.length
      ? `${failed.length} gating invariant${failed.length === 1 ? '' : 's'} failed: ${failed.map((f) => f.id).join(', ')}`
      : 'All gating invariants pass.'
  ].join('\n')

  return {
    pass,
    results,
    failed: failed.map((f) => f.id),
    text,
    exitNonZero: failed.length > 0
  }
}
