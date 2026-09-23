import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { sha256Of } from './write.js'
import {
  isHedged,
  applyRuling,
  recordRuling,
  changesBetween,
  reverseCommandsFor
} from './rule.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixturePath = join(here, '__fixtures__', 'ledger', 'backlog.json')
const fixture = () => JSON.parse(readFileSync(fixturePath, 'utf8'))

const AT = '2026-09-21T10:00:00Z'

describe('isHedged (T-R4)', () => {
  test.each([
    ['maybe B?', true],
    ['B?', true],
    ['Probably A', true],
    ['not sure, C', true],
    ['perhaps', true]
  ])('%s is hedged', (words, expected) => {
    expect(isHedged(words)).toBe(expected)
  })

  test.each([
    ['B', false],
    ['B. Why not?', false],
    ['Is this right? A.', false],
    ['Maybelline', false],
    ['A. Is that OK?', false],
    ['B, check with PIMS?', false]
  ])('%s is not hedged (whole words only)', (words, expected) => {
    expect(isHedged(words)).toBe(expected)
  })

  test('a known false positive is pinned: a capital letter followed by "?" is a hedge, even mid-sentence (DESIGN 6.4)', () => {
    expect(isHedged('Why not use A? It is fine')).toBe(true)
  })
})

describe('applyRuling (T-R1, T-R3, T-R5 to T-R10)', () => {
  test('T-R1: ruling A on the blocking question applies effects, clears needs, and resets combining', () => {
    const backlog = fixture()

    const result = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'Own org only.',
      note: 'Security: a cross-org list is a data-isolation failure.'
    })

    expect(result.decision).toMatchObject({
      id: 'd-001',
      question: 'q-notification-list-scope',
      chosen: 'A',
      status: 'current',
      decidedBy: 'sam',
      decidedAt: AT
    })
    expect(
      result.decision.effects.every((effect) => Object.hasOwn(effect, 'prior'))
    ).toBe(true)

    const req001 = result.backlog.requirements.find(
      (row) => row.id === 'req-001'
    )
    const req002 = result.backlog.requirements.find(
      (row) => row.id === 'req-002'
    )
    const req003 = result.backlog.requirements.find(
      (row) => row.id === 'req-003'
    )
    expect(req001.status).toBe('superseded')
    expect(req001.supersededBy).toBe('req-002')
    expect(req002.status).toBe('adopted')
    expect(req003.status).toBe('rejected')

    const inc001 = result.backlog.increments.find((row) => row.id === 'inc-001')
    expect(inc001.status).toBe('todo')
    expect(inc001.needs).toEqual([])

    expect(result.question.status).toBe('ruled')
    expect(result.question.decision).toBe('d-001')
    expect(result.combineReset).toBe(true)
    expect(result.backlog.combination.basis.atomsSha).toBeNull()
  })

  test('T-R3: a tentative ruling (flag) changes only the decisions list and the question status', () => {
    const backlog = fixture()

    const result = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'B',
      note: 'Thinking about it.',
      tentative: true
    })

    expect(result.decision.status).toBe('tentative')
    expect(result.decision.effects).toEqual([])
    expect(result.question.status).toBe('outstanding')
    expect(result.combineReset).toBe(false)

    const withoutDecisionsAndStatus = (value) => {
      const { decisions, ...rest } = value
      return {
        ...rest,
        questions: rest.questions.map((question) =>
          question.id === 'q-notification-list-scope'
            ? { ...question, status: backlog.questions[0].status }
            : question
        )
      }
    }
    expect(withoutDecisionsAndStatus(result.backlog)).toEqual(
      withoutDecisionsAndStatus(backlog)
    )
  })

  test('T-R3 (words hedge): "maybe B?" is recorded tentative with a note, with no --tentative flag', () => {
    const backlog = fixture()

    const result = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'maybe B?',
      note: 'Thinking about it.'
    })

    expect(result.decision.status).toBe('tentative')
    expect(result.notes).toEqual([
      'Recorded as tentative because your words hedge. Rule again without the hedge to apply it.'
    ])
  })

  test('T-R3c: a hedge on a question that already has a decision in force is refused (F44)', () => {
    const backlog = fixture()
    const ruled = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'Decided.'
    })

    expect(() =>
      applyRuling({
        backlog: ruled.backlog,
        questionId: 'q-notification-list-scope',
        option: 'B',
        by: 'sam',
        at: AT,
        words: 'maybe B?',
        note: 'Reconsidering.'
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('q-notification-list-scope')
      })
    )
  })

  test('T-R3d: --supersedes on a tentative ruling has no effect and is noted (F45)', () => {
    const backlog = fixture()

    const result = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'B',
      note: 'Thinking about it.',
      tentative: true,
      supersedes: 'd-999'
    })

    expect(result.decision.status).toBe('tentative')
    expect(result.notes).toContain(
      '"--supersedes" has no effect on a tentative ruling; nothing was superseded.'
    )
  })

  test('T-R5: ruling by slug after questions[] is reversed lands on the named question', () => {
    const backlog = fixture()
    backlog.questions = [...backlog.questions].reverse()

    const result = applyRuling({
      backlog,
      questionId: 'q-panel-authority',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'B',
      note: 'Prefer more visibility.'
    })

    expect(result.decision.question).toBe('q-panel-authority')
    expect(result.decision.effects).toEqual([
      {
        op: 'set-assumption',
        target: 'as-panel-authority',
        value: 'B',
        prior: null,
        priorDecision: null
      }
    ])
    const other = result.backlog.questions.find(
      (row) => row.id === 'q-house-rules-source'
    )
    expect(other.status).toBe('open')
  })

  test('T-R6: --by default writes a defaulted decision, runs its effects, and leaves the question open with decision: null', () => {
    const backlog = fixture()

    const result = applyRuling({
      backlog,
      questionId: 'q-house-rules-source',
      by: 'default',
      at: AT
    })

    expect(result.decision.status).toBe('defaulted')
    expect(result.decision.decidedBy).toBe('default')
    expect(result.decision.chosen).toBe('A')
    expect(result.question.status).toBe('open')
    expect(result.question.decision).toBeNull()

    const inc002 = result.backlog.increments.find((row) => row.id === 'inc-002')
    expect(inc002.status).toBe('deferred')
    const assumption = result.backlog.assumptions.find(
      (row) => row.id === 'as-house-rules-by-path'
    )
    expect(assumption.default).toBe('A')
  })

  test('T-R7: --by default on the must-answer question is refused, naming it', () => {
    const backlog = fixture()

    expect(() =>
      applyRuling({
        backlog,
        questionId: 'q-notification-list-scope',
        by: 'default',
        at: AT
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('q-notification-list-scope')
      })
    )
  })

  test('T-R7: --by default with --tentative is refused', () => {
    const backlog = fixture()

    expect(() =>
      applyRuling({
        backlog,
        questionId: 'q-house-rules-source',
        by: 'default',
        at: AT,
        tentative: true
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('T-R7: --by default with a different option is refused', () => {
    const backlog = fixture()

    expect(() =>
      applyRuling({
        backlog,
        questionId: 'q-house-rules-source',
        by: 'default',
        option: 'B',
        at: AT
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('T-R7: --by default on a question with a default already in force is refused', () => {
    const backlog = fixture()
    const firstDefault = applyRuling({
      backlog,
      questionId: 'q-house-rules-source',
      by: 'default',
      at: AT
    })

    expect(() =>
      applyRuling({
        backlog: firstDefault.backlog,
        questionId: 'q-house-rules-source',
        by: 'default',
        at: AT
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('T-R8: a person ruling over a default reverts its effects first, then applies its own', () => {
    const backlog = fixture()
    const defaulted = applyRuling({
      backlog,
      questionId: 'q-house-rules-source',
      by: 'default',
      at: AT
    })

    const overruled = applyRuling({
      backlog: defaulted.backlog,
      questionId: 'q-house-rules-source',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'B',
      note: 'Move it now.',
      supersedes: defaulted.decision.id
    })

    expect(overruled.decision.status).toBe('current')
    expect(overruled.decision.supersedes).toBe(defaulted.decision.id)
    const oldDecision = overruled.backlog.decisions.find(
      (row) => row.id === defaulted.decision.id
    )
    expect(oldDecision.status).toBe('superseded')
    expect(oldDecision.supersededBy).toBe(overruled.decision.id)

    const inc002 = overruled.backlog.increments.find(
      (row) => row.id === 'inc-002'
    )
    expect(inc002.status).toBe('todo')
    const req004 = overruled.backlog.requirements.find(
      (row) => row.id === 'req-004'
    )
    expect(req004.status).toBe('adopted')
  })

  test('T-R9: ruling an already-ruled question without --supersedes is refused, naming the decision', () => {
    const backlog = fixture()
    const first = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'First ruling.'
    })

    expect(() =>
      applyRuling({
        backlog: first.backlog,
        questionId: 'q-notification-list-scope',
        option: 'B',
        by: 'sam',
        at: AT,
        words: 'B',
        note: 'Changed my mind.'
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining(first.decision.id)
      })
    )
  })

  test('T-R9: the wrong --supersedes id is refused', () => {
    const backlog = fixture()
    const first = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'First ruling.'
    })

    expect(() =>
      applyRuling({
        backlog: first.backlog,
        questionId: 'q-notification-list-scope',
        option: 'B',
        by: 'sam',
        at: AT,
        words: 'B',
        note: 'Changed my mind.',
        supersedes: 'd-999'
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('T-R9: the right --supersedes id reverts and applies', () => {
    const backlog = fixture()
    const first = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'First ruling.'
    })

    const second = applyRuling({
      backlog: first.backlog,
      questionId: 'q-notification-list-scope',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'B',
      note: 'Changed my mind.',
      supersedes: first.decision.id
    })

    const req001 = second.backlog.requirements.find(
      (row) => row.id === 'req-001'
    )
    expect(req001.status).toBe('superseded')
    expect(req001.supersededBy).toBe('req-003')
    const req002 = second.backlog.requirements.find(
      (row) => row.id === 'req-002'
    )
    expect(req002.status).toBe('rejected')
  })

  test('T-R10: a later ruling marks earlier tentative decisions superseded', () => {
    const backlog = fixture()
    const tentative = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'maybe B?',
      note: 'Thinking.'
    })

    const ruled = applyRuling({
      backlog: tentative.backlog,
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'Decided.'
    })

    const oldTentative = ruled.backlog.decisions.find(
      (row) => row.id === tentative.decision.id
    )
    expect(oldTentative.status).toBe('superseded')
    expect(oldTentative.supersededBy).toBe(ruled.decision.id)
  })

  test('T-R11: decision ids continue from the highest existing number, and decidedAt is exactly --at', () => {
    const backlog = fixture()
    backlog.decisions = [
      {
        id: 'd-008',
        question: null,
        subject: { kind: 'design', id: 'x' },
        status: 'current',
        note: 'n',
        decidedBy: 'sam',
        decidedAt: '2026-09-19',
        chosen: null,
        effects: []
      }
    ]

    const result = applyRuling({
      backlog,
      questionId: 'q-panel-authority',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'Fine as is.'
    })

    expect(result.decision.id).toBe('d-009')
    expect(result.decision.decidedAt).toBe(AT)
  })

  test('an unknown question is refused with NOT_FOUND, naming the slug', () => {
    const backlog = fixture()

    expect(() =>
      applyRuling({
        backlog,
        questionId: 'q-does-not-exist',
        option: 'A',
        by: 'sam',
        at: AT
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.stringContaining('q-does-not-exist')
      })
    )
  })
})

describe('changesBetween (T-R12)', () => {
  test('lists each changed field with before and after, and nothing unchanged', () => {
    const backlog = fixture()
    const result = applyRuling({
      backlog,
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'n'
    })

    const changes = changesBetween(backlog, result.backlog)

    expect(changes).toContainEqual({
      target: 'req-001',
      field: 'status',
      before: 'adopted',
      after: 'superseded'
    })
    expect(changes).toContainEqual({
      target: 'inc-001',
      field: 'needs',
      before: ['q-notification-list-scope'],
      after: []
    })
    expect(changes).toContainEqual({
      target: 'combination',
      field: 'basis.atomsSha',
      before:
        'sha256:placeholder0000000000000000000000000000000000000000000000000',
      after: null
    })
    for (const change of changes) {
      expect(change.before).not.toEqual(change.after)
    }
  })
})

describe('reverseCommandsFor (T-R13)', () => {
  test("gives one command per other option, in DESIGN 6.3's exact form", () => {
    const question = {
      id: 'q-house-rules-source',
      options: [{ id: 'A' }, { id: 'B' }]
    }

    expect(
      reverseCommandsFor({
        programme: 'requirements-pipeline',
        question,
        chosen: 'A'
      })
    ).toEqual([
      'tim backlog rule requirements-pipeline q-house-rules-source --option B --by sam --at <now> --words "<your words>" --note "<why>"'
    ])
  })
})

describe('recordRuling (T-R2, T-R14)', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tim-rule-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const writeBacklog = () => {
    const path = join(dir, 'backlog.json')
    writeFileSync(path, `${JSON.stringify(fixture(), null, 2)}\n`)
    return path
  }

  const profileAt = (backlogPath) => ({
    id: 'fixture-ledger',
    profileKey: 'requirements-v2',
    paths: {
      backlog: backlogPath,
      state: join(dir, 'build', 'state.json'),
      opsLog: join(dir, '.backlog-ops.jsonl'),
      journal: join(dir, 'build', 'journal.jsonl')
    }
  })

  test('T-R2: writes once, and the file sha equals result.sha256', () => {
    const backlogPath = writeBacklog()

    const result = recordRuling({
      profile: profileAt(backlogPath),
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'Own org only.',
      note: 'Security.'
    })

    const bytes = readFileSync(backlogPath, 'utf8')
    expect(result.sha256).toBe(sha256Of(bytes))
    const written = JSON.parse(bytes)
    expect(
      written.questions.find((row) => row.id === 'q-notification-list-scope')
        .status
    ).toBe('ruled')
  })

  test('T-R14: refused with USAGE on a profile other than requirements-v2', () => {
    expect(() =>
      recordRuling({
        profile: { id: 'alpha', profileKey: 'some-other-profile', paths: {} },
        questionId: 'q-x',
        option: 'A',
        by: 'sam',
        at: AT
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
  })

  test('T-R14: refused with NOT_FOUND on an unknown question, naming the slug', () => {
    const backlogPath = writeBacklog()

    expect(() =>
      recordRuling({
        profile: profileAt(backlogPath),
        questionId: 'q-does-not-exist',
        option: 'A',
        by: 'sam',
        at: AT
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.stringContaining('q-does-not-exist')
      })
    )
  })
})
