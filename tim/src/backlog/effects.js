import { TimError } from '../errors.js'
import { APPLICABLE_OPS } from './profiles/requirements-v2.ledger.js'

/**
 * The literal status each op writes (DESIGN 3.7 D7). `supersede`'s `by`
 * atom always goes to `adopted`, which is not in this map because it is not
 * keyed by an op of its own.
 */
export const EFFECT_STATUS = {
  adopt: 'adopted',
  park: 'parked',
  reject: 'rejected',
  supersede: 'superseded',
  'defer-increment': 'deferred',
  'drop-increment': 'dropped'
}

const ADOPTED_STATUS = 'adopted'

const ATOMS = 'requirements'
const INCREMENTS = 'increments'
const ASSUMPTIONS = 'assumptions'

const findIndex = (rows, id) => rows.findIndex((row) => row.id === id)

const requireRow = ({ backlog, collection, id, effect, field = 'target' }) => {
  const rows = backlog[collection] ?? []
  const index = findIndex(rows, id)
  if (index === -1) {
    throw new TimError(
      'USAGE',
      `"${id}" is not in ${collection}[]. The "${effect.op}" effect names an unknown ${field}.`
    )
  }
  return { index, row: rows[index] }
}

const replaceRow = (backlog, collection, index, row) => ({
  ...backlog,
  [collection]: backlog[collection].map((existing, position) =>
    position === index ? row : existing
  )
})

const movedOn = ({ target, decisionId, op }) => {
  throw new TimError(
    'USAGE',
    `"${target}" has moved on since ${decisionId} applied its "${op}" effect. Nothing changed.`
  )
}

/**
 * Apply one decision effect to the backlog, recording the target's prior
 * state so a later supersession can revert it (DESIGN 3.7). No function
 * here writes or reads an atom's `provenance` (D23) — `adopt` and
 * `supersede` write `status` (and `supersededBy`) only.
 *
 * @param {object} args
 * @param {object} args.backlog
 * @param {object} args.effect - `{op, target, ...}`, no `prior` yet
 * @param {string} args.decisionId - The decision this effect belongs to
 * @param {string} [args.questionId] - The ruled question; `clear-need`'s
 *   default target when the effect carries no explicit `value`
 * @returns {{backlog: object, applied: object}}
 * @throws {TimError} USAGE — an unknown target, a `supersede` with no `by`
 *   or `by` equal to `target`, a `clear-need` with no resolvable question
 *   id, or an op outside `APPLICABLE_OPS`
 */
export const applyEffect = ({ backlog, effect, decisionId, questionId }) => {
  switch (effect.op) {
    case 'adopt':
    case 'park':
    case 'reject': {
      const { index, row } = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.target,
        effect
      })
      const applied = { ...effect, prior: row.status }
      return {
        backlog: replaceRow(backlog, ATOMS, index, {
          ...row,
          status: EFFECT_STATUS[effect.op]
        }),
        applied
      }
    }
    case 'supersede': {
      if (!effect.by) {
        throw new TimError(
          'USAGE',
          `"supersede" needs "by", naming the atom that replaces "${effect.target}".`
        )
      }
      if (effect.by === effect.target) {
        throw new TimError(
          'USAGE',
          `"supersede" cannot name "${effect.target}" as its own "by".`
        )
      }
      const target = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.target,
        effect
      })
      const byBefore = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.by,
        effect,
        field: 'by'
      })
      const applied = {
        ...effect,
        prior: target.row.status,
        priorSupersededBy: target.row.supersededBy ?? null,
        byPrior: byBefore.row.status
      }
      const afterTarget = replaceRow(backlog, ATOMS, target.index, {
        ...target.row,
        status: EFFECT_STATUS.supersede,
        supersededBy: effect.by
      })
      const byNow = requireRow({
        backlog: afterTarget,
        collection: ATOMS,
        id: effect.by,
        effect,
        field: 'by'
      })
      return {
        backlog: replaceRow(afterTarget, ATOMS, byNow.index, {
          ...byNow.row,
          status: ADOPTED_STATUS
        }),
        applied
      }
    }
    case 'clear-need': {
      const { index, row } = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.target,
        effect
      })
      const value = effect.value ?? questionId
      if (!value) {
        throw new TimError(
          'USAGE',
          '"clear-need" needs a question id to clear ("value", or the question being ruled).'
        )
      }
      const prior = row.needs ?? []
      const applied = { ...effect, value, prior }
      return {
        backlog: replaceRow(backlog, ATOMS, index, {
          ...row,
          needs: prior.filter((need) => need !== value)
        }),
        applied
      }
    }
    case 'set-assumption': {
      const { index, row } = requireRow({
        backlog,
        collection: ASSUMPTIONS,
        id: effect.target,
        effect
      })
      const applied = {
        ...effect,
        prior: row.default ?? null,
        priorDecision: row.decision ?? null
      }
      return {
        backlog: replaceRow(backlog, ASSUMPTIONS, index, {
          ...row,
          default: effect.value,
          decision: decisionId
        }),
        applied
      }
    }
    case 'defer-increment':
    case 'drop-increment': {
      const { index, row } = requireRow({
        backlog,
        collection: INCREMENTS,
        id: effect.target,
        effect
      })
      const verb = effect.op === 'defer-increment' ? 'Deferred' : 'Dropped'
      const applied = {
        ...effect,
        prior: row.status,
        priorNote: row.statusNote ?? null
      }
      return {
        backlog: replaceRow(backlog, INCREMENTS, index, {
          ...row,
          status: EFFECT_STATUS[effect.op],
          statusNote: `${verb} by ${decisionId}.`
        }),
        applied
      }
    }
    default: {
      if (!APPLICABLE_OPS.includes(effect.op)) {
        throw new TimError(
          'USAGE',
          `"rule" cannot apply "${effect.op}" effects yet. Nothing was written.`
        )
      }
      throw new TimError('USAGE', `Unknown effect op "${effect.op}".`)
    }
  }
}

/**
 * Revert one applied decision effect, restoring its target to `prior`.
 *
 * Refused when the target has moved on since the effect applied — compared
 * on exactly the fields D13 names for each op, and never on `provenance`
 * (D23), so an ingest refreshing an atom's `provenance` can never trip a
 * revert. `defer-increment` and `drop-increment` compare `status` only:
 * the live backlog's bootstrap decisions (d-005, d-006) carry hand-authored
 * prose in `statusNote` rather than the literal template `rule` itself
 * writes, so comparing the note text would treat every hand-authored
 * ruling as "moved on" and refuse a clean revert.
 *
 * @param {object} args
 * @param {object} args.backlog
 * @param {object} args.effect - An applied effect, carrying `prior` (and
 *   `byPrior`, `priorSupersededBy`, `priorNote` where D7 records them)
 * @param {string} args.decisionId - The decision this effect belongs to,
 *   named in a "moved on" refusal
 * @returns {{backlog: object}}
 * @throws {TimError} USAGE — an unknown target, or a target that moved on
 */
export const revertEffect = ({ backlog, effect, decisionId }) => {
  switch (effect.op) {
    case 'adopt':
    case 'park':
    case 'reject': {
      const { index, row } = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.target,
        effect
      })
      if (row.status !== EFFECT_STATUS[effect.op]) {
        movedOn({ target: effect.target, decisionId, op: effect.op })
      }
      return {
        backlog: replaceRow(backlog, ATOMS, index, {
          ...row,
          status: effect.prior
        })
      }
    }
    case 'supersede': {
      const target = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.target,
        effect
      })
      const byRow = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.by,
        effect,
        field: 'by'
      })
      if (
        target.row.status !== EFFECT_STATUS.supersede ||
        target.row.supersededBy !== effect.by
      ) {
        movedOn({ target: effect.target, decisionId, op: effect.op })
      }
      if (byRow.row.status !== ADOPTED_STATUS) {
        movedOn({ target: effect.by, decisionId, op: effect.op })
      }
      const afterTarget = replaceRow(backlog, ATOMS, target.index, {
        ...target.row,
        status: effect.prior,
        supersededBy: effect.priorSupersededBy ?? null
      })
      const byNow = requireRow({
        backlog: afterTarget,
        collection: ATOMS,
        id: effect.by,
        effect,
        field: 'by'
      })
      return {
        backlog: replaceRow(afterTarget, ATOMS, byNow.index, {
          ...byNow.row,
          status: effect.byPrior
        })
      }
    }
    case 'clear-need': {
      const { index, row } = requireRow({
        backlog,
        collection: ATOMS,
        id: effect.target,
        effect
      })
      const currentNeeds = row.needs ?? []
      const prior = effect.prior ?? []
      const expectedCurrent = prior.filter((need) => need !== effect.value)
      if (JSON.stringify(currentNeeds) !== JSON.stringify(expectedCurrent)) {
        movedOn({ target: effect.target, decisionId, op: effect.op })
      }
      return {
        backlog: replaceRow(backlog, ATOMS, index, { ...row, needs: prior })
      }
    }
    case 'set-assumption': {
      const { index, row } = requireRow({
        backlog,
        collection: ASSUMPTIONS,
        id: effect.target,
        effect
      })
      if (row.default !== effect.value || row.decision !== decisionId) {
        movedOn({ target: effect.target, decisionId, op: effect.op })
      }
      return {
        backlog: replaceRow(backlog, ASSUMPTIONS, index, {
          ...row,
          default: effect.prior ?? null,
          decision: effect.priorDecision ?? null
        })
      }
    }
    case 'defer-increment':
    case 'drop-increment': {
      const { index, row } = requireRow({
        backlog,
        collection: INCREMENTS,
        id: effect.target,
        effect
      })
      if (row.status !== EFFECT_STATUS[effect.op]) {
        movedOn({ target: effect.target, decisionId, op: effect.op })
      }
      return {
        backlog: replaceRow(backlog, INCREMENTS, index, {
          ...row,
          status: effect.prior,
          statusNote: effect.priorNote ?? null
        })
      }
    }
    default:
      throw new TimError(
        'USAGE',
        `Cannot revert an unrecognised effect op "${effect.op}".`
      )
  }
}

/**
 * Every `clear-need` effect a ruling on `questionId` must apply (D8): one
 * per atom whose `needs` names the question, unapplied (no `prior` yet —
 * `applyEffect` adds it).
 *
 * @param {object} args
 * @param {object} args.backlog
 * @param {string} args.questionId
 * @returns {object[]}
 */
export const clearNeedEffects = ({ backlog, questionId }) =>
  (backlog.requirements ?? [])
    .filter((atom) => (atom.needs ?? []).includes(questionId))
    .map((atom) => ({ op: 'clear-need', target: atom.id, value: questionId }))

/**
 * Refuse an effect (or its revert) whose target is built work (D14): an
 * increment that has started or is `done`, or an atom that is a member of
 * one. `clear-need` is exempt — clearing or restoring a need changes no
 * behaviour by itself (D9's recompute skips a started increment's own
 * status instead, so restoring a need can never flip it to `blocked`).
 * `set-assumption` is exempt too: its target is an assumption, never built
 * work on its own.
 *
 * @param {object} args
 * @param {object} args.backlog
 * @param {object} args.effect
 * @param {Set<string>} args.startedIds
 * @throws {TimError} USAGE, naming the atom (or increment) and the
 *   increment that has started or is done
 */
export const builtWorkGuard = ({ backlog, effect, startedIds }) => {
  if (effect.op === 'clear-need' || effect.op === 'set-assumption') return

  const doneIds = new Set(
    (backlog.increments ?? [])
      .filter((increment) => increment.status === 'done')
      .map((increment) => increment.id)
  )
  const isBuilt = (incrementId) =>
    (startedIds?.has(incrementId) ?? false) || doneIds.has(incrementId)

  const refuseBuilt = (label, incrementId) => {
    throw new TimError(
      'USAGE',
      `"${effect.op}" would change built work: ${label} — ${incrementId} has started or is done. Nothing was written.`
    )
  }

  if (effect.op === 'defer-increment' || effect.op === 'drop-increment') {
    if (isBuilt(effect.target)) refuseBuilt(effect.target, effect.target)
    return
  }

  const owningIncrementOf = (atomId) =>
    (backlog.increments ?? []).find((increment) =>
      (increment.members ?? []).includes(atomId)
    )

  const checkAtom = (atomId) => {
    const owner = owningIncrementOf(atomId)
    if (owner && isBuilt(owner.id)) refuseBuilt(atomId, owner.id)
  }

  checkAtom(effect.target)
  if (effect.op === 'supersede' && effect.by) checkAtom(effect.by)
}
