import { describe, test, expect } from 'vitest'
import {
  RULED_STATUSES,
  requirementsV2Increments
} from './profiles/requirements-v2-increments.js'
import {
  EFFECT_STATUS,
  applyEffect,
  revertEffect,
  clearNeedEffects,
  builtWorkGuard
} from './effects.js'

const baseBacklog = () => ({
  requirements: [
    {
      id: 'req-001',
      status: 'proposed',
      needs: ['q-x', 'q-y'],
      supersededBy: null,
      provenance: { verifiedBy: null }
    },
    {
      id: 'req-002',
      status: 'proposed',
      needs: [],
      supersededBy: null,
      provenance: null
    }
  ],
  increments: [
    { id: 'inc-001', status: 'todo', statusNote: null, members: ['req-001'] },
    { id: 'inc-002', status: 'done', statusNote: null, members: ['req-002'] }
  ],
  assumptions: [{ id: 'as-x', default: null, decision: null }]
})

const atomIn = (backlog, id) =>
  backlog.requirements.find((row) => row.id === id)
const incIn = (backlog, id) => backlog.increments.find((row) => row.id === id)
const assumptionIn = (backlog, id) =>
  backlog.assumptions.find((row) => row.id === id)

describe('applyEffect / revertEffect (T-E1, T-E10b)', () => {
  test('adopt sets adopted and records the prior status; provenance (object) is untouched', () => {
    const backlog = baseBacklog()
    const { backlog: next, applied } = applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-001' },
      decisionId: 'd-001'
    })

    expect(atomIn(next, 'req-001').status).toBe('adopted')
    expect(atomIn(next, 'req-001').provenance).toEqual({ verifiedBy: null })
    expect(applied.prior).toBe('proposed')
  })

  test('adopt leaves provenance: null untouched', () => {
    const backlog = baseBacklog()
    const { backlog: next } = applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-002' },
      decisionId: 'd-001'
    })

    expect(atomIn(next, 'req-002').provenance).toBeNull()
  })

  test('revert restores the prior status', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-001' },
      decisionId: 'd-001'
    })

    const reverted = revertEffect({
      backlog: applied.backlog,
      effect: applied.applied,
      decisionId: 'd-001'
    })

    expect(atomIn(reverted.backlog, 'req-001').status).toBe('proposed')
  })

  test('T-E10b: reverting an adopted atom whose provenance alone changed (new verifiedBy) is not refused', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-001' },
      decisionId: 'd-001'
    })
    const withNewProvenance = {
      ...applied.backlog,
      requirements: applied.backlog.requirements.map((row) =>
        row.id === 'req-001'
          ? { ...row, provenance: { verifiedBy: { phase: 'verify' } } }
          : row
      )
    }

    const reverted = revertEffect({
      backlog: withNewProvenance,
      effect: applied.applied,
      decisionId: 'd-001'
    })

    expect(atomIn(reverted.backlog, 'req-001').status).toBe('proposed')
  })

  test('T-E10b: reverting an adopted atom whose provenance was replaced by null is not refused', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-001' },
      decisionId: 'd-001'
    })
    const withNullProvenance = {
      ...applied.backlog,
      requirements: applied.backlog.requirements.map((row) =>
        row.id === 'req-001' ? { ...row, provenance: null } : row
      )
    }

    expect(() =>
      revertEffect({
        backlog: withNullProvenance,
        effect: applied.applied,
        decisionId: 'd-001'
      })
    ).not.toThrow()
  })

  test('T-E10b: reverting a supersede whose target or by atom has only had its provenance changed is not refused', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'supersede', target: 'req-001', by: 'req-002' },
      decisionId: 'd-001'
    })
    const withNewProvenance = {
      ...applied.backlog,
      requirements: applied.backlog.requirements.map((row) => {
        if (row.id === 'req-001') {
          return { ...row, provenance: { verifiedBy: { phase: 'verify' } } }
        }
        if (row.id === 'req-002') return { ...row, provenance: null }
        return row
      })
    }

    const reverted = revertEffect({
      backlog: withNewProvenance,
      effect: applied.applied,
      decisionId: 'd-001'
    })

    expect(atomIn(reverted.backlog, 'req-001').status).toBe('proposed')
    expect(atomIn(reverted.backlog, 'req-001').supersededBy).toBeNull()
    expect(atomIn(reverted.backlog, 'req-002').status).toBe('proposed')
  })
})

describe('park and reject (T-E2)', () => {
  test('park sets parked and reverts', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'park', target: 'req-001' },
      decisionId: 'd-001'
    })
    expect(atomIn(applied.backlog, 'req-001').status).toBe('parked')

    const reverted = revertEffect({
      backlog: applied.backlog,
      effect: applied.applied,
      decisionId: 'd-001'
    })
    expect(atomIn(reverted.backlog, 'req-001').status).toBe('proposed')
  })

  test('reject sets rejected and reverts', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'reject', target: 'req-001' },
      decisionId: 'd-001'
    })
    expect(atomIn(applied.backlog, 'req-001').status).toBe('rejected')

    const reverted = revertEffect({
      backlog: applied.backlog,
      effect: applied.applied,
      decisionId: 'd-001'
    })
    expect(atomIn(reverted.backlog, 'req-001').status).toBe('proposed')
  })
})

describe('supersede (T-E3, T-E4)', () => {
  test('sets superseded + supersededBy, adopts by, records priorSupersededBy and byPrior; provenance untouched', () => {
    const backlog = baseBacklog()
    const { backlog: next, applied } = applyEffect({
      backlog,
      effect: { op: 'supersede', target: 'req-001', by: 'req-002' },
      decisionId: 'd-001'
    })

    expect(atomIn(next, 'req-001').status).toBe('superseded')
    expect(atomIn(next, 'req-001').supersededBy).toBe('req-002')
    expect(atomIn(next, 'req-002').status).toBe('adopted')
    expect(applied.prior).toBe('proposed')
    expect(applied.priorSupersededBy).toBeNull()
    expect(applied.byPrior).toBe('proposed')
    expect(atomIn(next, 'req-001').provenance).toEqual({ verifiedBy: null })
    expect(atomIn(next, 'req-002').provenance).toBeNull()
  })

  test('revert restores the target status and supersededBy, and the by atom status', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'supersede', target: 'req-001', by: 'req-002' },
      decisionId: 'd-001'
    })

    const reverted = revertEffect({
      backlog: applied.backlog,
      effect: applied.applied,
      decisionId: 'd-001'
    })

    expect(atomIn(reverted.backlog, 'req-001').status).toBe('proposed')
    expect(atomIn(reverted.backlog, 'req-001').supersededBy).toBeNull()
    expect(atomIn(reverted.backlog, 'req-002').status).toBe('proposed')
  })

  test('an unknown by is refused, naming it', () => {
    const backlog = baseBacklog()

    expect(() =>
      applyEffect({
        backlog,
        effect: { op: 'supersede', target: 'req-001', by: 'req-999' },
        decisionId: 'd-001'
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('req-999')
      })
    )
  })

  test('by equal to target is refused, naming it', () => {
    const backlog = baseBacklog()

    expect(() =>
      applyEffect({
        backlog,
        effect: { op: 'supersede', target: 'req-001', by: 'req-001' },
        decisionId: 'd-001'
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('req-001')
      })
    )
  })
})

describe('clear-need (T-E5)', () => {
  test('removes only the named question and records the whole previous list; revert puts the list back', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'clear-need', target: 'req-001', value: 'q-x' },
      decisionId: 'd-001',
      questionId: 'q-x'
    })

    expect(atomIn(applied.backlog, 'req-001').needs).toEqual(['q-y'])
    expect(applied.applied.prior).toEqual(['q-x', 'q-y'])

    const reverted = revertEffect({
      backlog: applied.backlog,
      effect: applied.applied,
      decisionId: 'd-001'
    })
    expect(atomIn(reverted.backlog, 'req-001').needs).toEqual(['q-x', 'q-y'])
  })

  test('defaults to questionId when the effect carries no explicit value', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'clear-need', target: 'req-001' },
      decisionId: 'd-001',
      questionId: 'q-y'
    })

    expect(atomIn(applied.backlog, 'req-001').needs).toEqual(['q-x'])
  })
})

describe('set-assumption (T-E6)', () => {
  test('writes default and decision, never a stray value key, and records the previous default', () => {
    const backlog = baseBacklog()
    const { backlog: next, applied } = applyEffect({
      backlog,
      effect: { op: 'set-assumption', target: 'as-x', value: 'B' },
      decisionId: 'd-001'
    })

    expect(assumptionIn(next, 'as-x')).toEqual({
      id: 'as-x',
      default: 'B',
      decision: 'd-001'
    })
    expect(applied.prior).toBeNull()
  })
})

describe('defer-increment and drop-increment (T-E7)', () => {
  test('defer-increment writes deferred and a status note naming the decision', () => {
    const backlog = baseBacklog()
    const { backlog: next } = applyEffect({
      backlog,
      effect: { op: 'defer-increment', target: 'inc-001' },
      decisionId: 'd-001'
    })

    expect(incIn(next, 'inc-001').status).toBe('deferred')
    expect(incIn(next, 'inc-001').statusNote).toBe('Deferred by d-001.')
    expect(RULED_STATUSES.has('deferred')).toBe(true)
    expect(requirementsV2Increments.isRuled(incIn(next, 'inc-001'), {})).toBe(
      true
    )
  })

  test('drop-increment writes dropped and a status note naming the decision', () => {
    const backlog = baseBacklog()
    const { backlog: next } = applyEffect({
      backlog,
      effect: { op: 'drop-increment', target: 'inc-001' },
      decisionId: 'd-001'
    })

    expect(incIn(next, 'inc-001').status).toBe('dropped')
    expect(incIn(next, 'inc-001').statusNote).toBe('Dropped by d-001.')
    expect(RULED_STATUSES.has('dropped')).toBe(true)
    expect(requirementsV2Increments.isRuled(incIn(next, 'inc-001'), {})).toBe(
      true
    )
  })

  test('T-E10b: revert of the live d-005 shape (prior status, no priorNote) restores the status and a defined statusNote without crashing', () => {
    const backlog = baseBacklog()
    // Shaped exactly like the live decisions d-005/d-006: an applied effect
    // with `prior` but no `priorNote` key at all, and the target's current
    // statusNote holding hand-authored prose rather than rule's own
    // template.
    const liveShapedEffect = {
      op: 'defer-increment',
      target: 'inc-001',
      prior: 'todo'
    }
    const backlogWithLiveNote = {
      ...backlog,
      increments: backlog.increments.map((row) =>
        row.id === 'inc-001'
          ? {
              ...row,
              status: 'deferred',
              statusNote:
                'Deferred by d-005, the default of q-house-rules-source (option A): the rules stay where they are.'
            }
          : row
      )
    }

    const reverted = revertEffect({
      backlog: backlogWithLiveNote,
      effect: liveShapedEffect,
      decisionId: 'd-005'
    })

    expect(incIn(reverted.backlog, 'inc-001').status).toBe('todo')
    expect(incIn(reverted.backlog, 'inc-001').statusNote).toBeNull()
  })
})

describe('unsupported ops (T-E8)', () => {
  test.each(['split', 'add-invariant', 'strip-dependency', 'set-delivery'])(
    '%s is refused, naming the op',
    (op) => {
      const backlog = baseBacklog()

      expect(() =>
        applyEffect({
          backlog,
          effect: { op, target: 'req-001' },
          decisionId: 'd-001'
        })
      ).toThrowError(
        expect.objectContaining({
          code: 'USAGE',
          message: expect.stringContaining(
            `"rule" cannot apply "${op}" effects yet`
          )
        })
      )
    }
  )
})

describe('unknown target (T-E9)', () => {
  test('an unknown target id is refused, naming it', () => {
    const backlog = baseBacklog()

    expect(() =>
      applyEffect({
        backlog,
        effect: { op: 'adopt', target: 'req-999' },
        decisionId: 'd-001'
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('req-999')
      })
    )
  })
})

describe('revert refuses a moved-on target (T-E10)', () => {
  test('a deferred increment that is now done', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'defer-increment', target: 'inc-001' },
      decisionId: 'd-001'
    })
    const movedOn = {
      ...applied.backlog,
      increments: applied.backlog.increments.map((row) =>
        row.id === 'inc-001' ? { ...row, status: 'done' } : row
      )
    }

    expect(() =>
      revertEffect({
        backlog: movedOn,
        effect: applied.applied,
        decisionId: 'd-001'
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('inc-001')
      })
    )
  })

  test('an assumption whose default changed', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'set-assumption', target: 'as-x', value: 'B' },
      decisionId: 'd-001'
    })
    const movedOn = {
      ...applied.backlog,
      assumptions: applied.backlog.assumptions.map((row) =>
        row.id === 'as-x' ? { ...row, default: 'C' } : row
      )
    }

    expect(() =>
      revertEffect({
        backlog: movedOn,
        effect: applied.applied,
        decisionId: 'd-001'
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('an adopted atom now parked', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-001' },
      decisionId: 'd-001'
    })
    const movedOn = {
      ...applied.backlog,
      requirements: applied.backlog.requirements.map((row) =>
        row.id === 'req-001' ? { ...row, status: 'parked' } : row
      )
    }

    expect(() =>
      revertEffect({
        backlog: movedOn,
        effect: applied.applied,
        decisionId: 'd-001'
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('a superseded atom whose supersededBy now names a different atom', () => {
    const backlog = baseBacklog()
    backlog.requirements.push({
      id: 'req-003',
      status: 'proposed',
      needs: [],
      supersededBy: null,
      provenance: null
    })
    const applied = applyEffect({
      backlog,
      effect: { op: 'supersede', target: 'req-001', by: 'req-002' },
      decisionId: 'd-001'
    })
    const movedOn = {
      ...applied.backlog,
      requirements: applied.backlog.requirements.map((row) =>
        row.id === 'req-001' ? { ...row, supersededBy: 'req-003' } : row
      )
    }

    expect(() =>
      revertEffect({
        backlog: movedOn,
        effect: applied.applied,
        decisionId: 'd-001'
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('a by atom no longer adopted', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'supersede', target: 'req-001', by: 'req-002' },
      decisionId: 'd-001'
    })
    const movedOn = {
      ...applied.backlog,
      requirements: applied.backlog.requirements.map((row) =>
        row.id === 'req-002' ? { ...row, status: 'parked' } : row
      )
    }

    expect(() =>
      revertEffect({
        backlog: movedOn,
        effect: applied.applied,
        decisionId: 'd-001'
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })
})

describe('clearNeedEffects', () => {
  test('builds one unapplied clear-need effect per atom whose needs names the question', () => {
    const backlog = baseBacklog()

    expect(clearNeedEffects({ backlog, questionId: 'q-x' })).toEqual([
      { op: 'clear-need', target: 'req-001', value: 'q-x' }
    ])
  })
})

describe('builtWorkGuard (T-E11)', () => {
  test('refuses an effect on an atom that is a member of a done increment, naming both ids', () => {
    const backlog = baseBacklog()

    expect(() =>
      builtWorkGuard({
        backlog,
        effect: { op: 'adopt', target: 'req-002' },
        startedIds: new Set()
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringMatching(/req-002.*inc-002/s)
      })
    )
  })

  test('refuses an effect on an increment that has started, naming it', () => {
    const backlog = baseBacklog()

    expect(() =>
      builtWorkGuard({
        backlog,
        effect: { op: 'defer-increment', target: 'inc-001' },
        startedIds: new Set(['inc-001'])
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('inc-001')
      })
    )
  })

  test('lets clear-need through for a member of a done increment', () => {
    const backlog = baseBacklog()

    expect(() =>
      builtWorkGuard({
        backlog,
        effect: { op: 'clear-need', target: 'req-002', value: 'q-x' },
        startedIds: new Set()
      })
    ).not.toThrow()
  })

  test('lets an effect through when its target is not built work', () => {
    const backlog = baseBacklog()

    expect(() =>
      builtWorkGuard({
        backlog,
        effect: { op: 'adopt', target: 'req-001' },
        startedIds: new Set()
      })
    ).not.toThrow()
  })

  test('refuses a supersede whose by atom is a member of a done increment, naming both ids', () => {
    const backlog = baseBacklog()

    expect(() =>
      builtWorkGuard({
        backlog,
        effect: { op: 'supersede', target: 'req-999', by: 'req-002' },
        startedIds: new Set()
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringMatching(/req-002.*inc-002/s)
      })
    )
  })

  test('refuses an effect on an atom whose owning increment has started (not done), naming both ids', () => {
    const backlog = baseBacklog()

    expect(() =>
      builtWorkGuard({
        backlog,
        effect: { op: 'adopt', target: 'req-001' },
        startedIds: new Set(['inc-001'])
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringMatching(/req-001.*inc-001/s)
      })
    )
  })
})

describe('no function mutates its input (T-E12)', () => {
  test('applyEffect leaves the given backlog unchanged', () => {
    const backlog = baseBacklog()
    const copy = JSON.parse(JSON.stringify(backlog))

    applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-001' },
      decisionId: 'd-001'
    })

    expect(backlog).toEqual(copy)
  })

  test('revertEffect leaves the given backlog unchanged', () => {
    const backlog = baseBacklog()
    const applied = applyEffect({
      backlog,
      effect: { op: 'adopt', target: 'req-001' },
      decisionId: 'd-001'
    })
    const copy = JSON.parse(JSON.stringify(applied.backlog))

    revertEffect({
      backlog: applied.backlog,
      effect: applied.applied,
      decisionId: 'd-001'
    })

    expect(applied.backlog).toEqual(copy)
  })
})

test('EFFECT_STATUS maps the six applied ops to their literal status', () => {
  expect(EFFECT_STATUS).toEqual({
    adopt: 'adopted',
    park: 'parked',
    reject: 'rejected',
    supersede: 'superseded',
    'defer-increment': 'deferred',
    'drop-increment': 'dropped'
  })
})
