import { readFileSync } from 'node:fs'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { parseBacklog } from './schema.js'
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
 * Resolve one queued citation by hand.
 *
 * The setter exists so a human resolution is recorded the same way a machine
 * one is — with a repo, a path and a resolution of "human" — rather than by
 * hand-editing JSON, where nothing would record that a person decided it.
 *
 * @param {object} args
 * @returns {object}
 */
export const setCitation = ({ profile, id, ref, repo, path, why }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const increment = findIncrement(backlog, id)
  const citation = (increment.citations ?? []).find(
    (entry) => entry.ref === ref
  )
  if (!citation) {
    throw new TimError('NOT_FOUND', `${id} has no citation ${ref}.`)
  }
  const result = writeIncrement(profile, backlog, id, (entry) => ({
    ...entry,
    citations: entry.citations.map((c) =>
      c.ref === ref
        ? {
            ...c,
            repo,
            path,
            resolution: 'human',
            needsHuman: false,
            why: why ?? `Resolved by hand: ${c.why ?? 'was ambiguous'}`,
            candidates: undefined
          }
        : c
    )
  }))
  return { id, ref, repo, path, ...result }
}
