import { readFileSync } from 'node:fs'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { parseBacklog } from './schema.js'
import { parseLineSpec } from './citations/parse.js'
import { TimError } from '../errors.js'

export const SLOTS = [
  'frontend',
  'prototype',
  'difference',
  'correction',
  'falsifiedBy',
  'verification',
  'longBecause'
]

const findIncrement = (backlog, id) => {
  const increment = backlog.increments.find((entry) => entry.id === id)
  if (!increment) {
    throw new TimError('NOT_FOUND', `${id} is not in this backlog.`)
  }
  return increment
}

const writeIncrement = (profile, backlog, id, mutate) => {
  const increments = backlog.increments.map((increment) =>
    increment.id === id ? mutate(increment) : increment
  )
  return writeJsonAtomic(profile.paths.backlog, { ...backlog, increments })
}

/**
 * Set one prose slot on one increment, from a file.
 *
 * Fan-out workers never edit the JSON. They write a slot file and call this, so
 * a worker cannot reformat the whole backlog, cannot touch a second increment,
 * and cannot edit `detail` — which is the migration's only oracle and is frozen
 * forever.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.id
 * @param {string} args.slot
 * @param {string} args.file - Path to a file holding the new text
 * @returns {object}
 */
export const setSlot = ({ profile, id, slot, file, pass }) => {
  if (!SLOTS.includes(slot)) {
    throw new TimError(
      'USAGE',
      `"${slot}" is not a prose slot. Choose one of: ${SLOTS.join(', ')}.`
    )
  }
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  findIncrement(backlog, id)
  const text = readFileSync(file, 'utf8').trim()

  const result = writeIncrement(profile, backlog, id, (increment) => ({
    ...increment,
    finding: {
      ...(increment.finding ?? {}),
      [slot]: text,
      // Which pass this finding has had. The word budgets are a Pass B target,
      // so the checker has to be able to tell a finding whose prose was moved
      // from one whose prose was rewritten.
      ...(pass ? { pass } : {})
    }
  }))

  return {
    id,
    slot,
    pass: pass ?? null,
    words: text.split(/\s+/).filter(Boolean).length,
    ...result
  }
}

/**
 * Set many slots across many increments in one atomic write.
 *
 * The per-slot setter is what a fan-out worker uses, because a worker touching
 * one slot at a time cannot corrupt the file. This is for a single writer
 * migrating a batch: one read, one write, and the same refusals — an unknown
 * slot name, an unknown increment id, and never `detail`.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {Record<string, Record<string, string>>} args.slots - id to slot to text
 * @param {string} [args.pass]
 * @returns {object}
 */
export const setSlots = ({ profile, slots, pass }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const known = new Set(backlog.increments.map((increment) => increment.id))

  for (const [id, values] of Object.entries(slots)) {
    if (!known.has(id)) {
      throw new TimError('NOT_FOUND', `${id} is not in this backlog.`)
    }
    for (const slot of Object.keys(values)) {
      if (!SLOTS.includes(slot)) {
        throw new TimError(
          'USAGE',
          `${id}: "${slot}" is not a prose slot. Choose one of: ${SLOTS.join(', ')}.`
        )
      }
    }
  }

  const increments = backlog.increments.map((increment) => {
    const values = slots[increment.id]
    if (!values) return increment
    const trimmed = Object.fromEntries(
      Object.entries(values).map(([slot, text]) => [slot, String(text).trim()])
    )
    return {
      ...increment,
      finding: {
        ...(increment.finding ?? {}),
        ...trimmed,
        ...(pass ? { pass } : {})
      }
    }
  })

  const result = writeJsonAtomic(profile.paths.backlog, {
    ...backlog,
    increments
  })
  return {
    increments: Object.keys(slots).length,
    slots: Object.values(slots).reduce(
      (n, values) => n + Object.keys(values).length,
      0
    ),
    pass: pass ?? null,
    ...result
  }
}

/**
 * Set the decision question on one increment.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.id
 * @param {object} args.decisionRequired
 * @returns {object}
 */
export const setDecisionRequired = ({ profile, id, decisionRequired }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const increment = findIncrement(backlog, id)
  if (!increment.gate) {
    throw new TimError(
      'USAGE',
      `${id} is not gated, so it has no decision to ask about.`
    )
  }
  const result = writeIncrement(profile, backlog, id, (entry) => ({
    ...entry,
    finding: {
      ...(entry.finding ?? {}),
      decisionRequired: {
        audience: entry.gate,
        ...decisionRequired
      }
    }
  }))
  return { id, ...result }
}

/**
 * Resolve one queued citation by hand, or correct one that is already resolved.
 *
 * The setter exists so a human resolution is recorded the same way a machine
 * one is — with a repo, a path and a resolution of "human" — rather than by
 * hand-editing JSON, where nothing would record that a person decided it.
 *
 * WHY THIS NOW AMENDS A RESOLVED CITATION
 *
 * It used to refuse outright, on the rule that "a citation is frozen from the
 * moment it stops being queued". That rule was written to stop a regeneration
 * silently replacing a person's judgement with the parser's original failure,
 * and that job now belongs to the carry-forward in citations/carry-forward.js,
 * which reattaches every `human` resolution after `tim parity citations
 * --write` has rebuilt the list. What the refusal did instead was leave no
 * supported way at all to correct a line range somebody had just proved wrong
 * by opening the file — six such corrections in the DR1 corpus could not be
 * applied.
 *
 * So the guard is narrowed rather than removed. Correcting a resolved citation
 * takes an explicit `why`: a person has to say what they read. The previous
 * repo, path and ranges are kept on the citation in `amendedFrom`, so the file
 * still shows what it used to claim and who changed it. A regeneration still
 * cannot touch any of it.
 *
 * @param {object} args
 * @returns {object}
 */
export const setCitation = ({ profile, id, ref, repo, path, lines, why }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const increment = findIncrement(backlog, id)
  const citation = (increment.citations ?? []).find(
    (entry) => entry.ref === ref
  )
  if (!citation) {
    throw new TimError('NOT_FOUND', `${id} has no citation ${ref}.`)
  }
  const amending = citation.resolution !== 'unresolved'
  if (amending && !why) {
    throw new TimError(
      'USAGE',
      `${id}/${ref} is already resolved (${citation.resolution}). Correcting it needs --why, saying what you read in the file.`
    )
  }

  const ranges = lines ? parseRanges(lines, id, ref) : null
  const audit = {
    repo: citation.repo ?? null,
    path: citation.path ?? null,
    lines: citation.lines ?? null,
    ranges: citation.ranges ?? null,
    resolution: citation.resolution,
    why: citation.why ?? null
  }

  const result = writeIncrement(profile, backlog, id, (entry) => ({
    ...entry,
    citations: entry.citations.map((c) =>
      c.ref === ref
        ? {
            ...c,
            repo,
            path,
            ...(ranges
              ? { lines: ranges.length === 1 ? ranges[0] : null, ranges }
              : {}),
            resolution: 'human',
            needsHuman: false,
            why: why ?? `Resolved by hand: ${c.why ?? 'was ambiguous'}`,
            candidates: undefined,
            ...(amending
              ? { amendedFrom: [...(c.amendedFrom ?? []), audit] }
              : {})
          }
        : c
    )
  }))
  return {
    id,
    ref,
    repo,
    path,
    lines: ranges?.length === 1 ? ranges[0] : null,
    ranges,
    amended: amending,
    ...result
  }
}

const parseRanges = (spec, id, ref) => {
  const ranges = parseLineSpec(String(spec))
  if (
    ranges.length === 0 ||
    ranges.some((range) => !Number.isFinite(range.start))
  ) {
    throw new TimError(
      'USAGE',
      `${id}/${ref}: "${spec}" is not a line, a line range or a list of them, like 41, 41-53 or 27,54,68.`
    )
  }
  return ranges
}
