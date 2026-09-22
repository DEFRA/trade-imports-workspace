import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkLedger,
  isAwaitingRuling,
  hasDefault,
  decisionInForce,
  defaultInForce,
  blockingIncrementIds
} from './requirements-v2.ledger.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixturePath = join(here, '..', '__fixtures__', 'ledger', 'backlog.json')

const fixture = () => JSON.parse(readFileSync(fixturePath, 'utf8'))

describe('checkLedger', () => {
  test('the captured fixture passes and returns without throwing (T-Q1)', () => {
    const backlog = fixture()

    expect(checkLedger(backlog)).toBe(backlog)
  })

  test('a question id "Q3" is refused, naming the bad id (T-Q2)', () => {
    const backlog = fixture()
    backlog.questions[0].id = 'Q3'

    expect(() => checkLedger(backlog)).toThrow(/"Q3".*not a valid question id/s)
  })

  test('a question id "3" is refused, naming the bad id (T-Q2)', () => {
    const backlog = fixture()
    backlog.questions[0].id = '3'

    expect(() => checkLedger(backlog)).toThrow(/"3".*not a valid question id/s)
  })

  test('an empty headline is refused, naming the question (T-Q3)', () => {
    const backlog = fixture()
    backlog.questions[0].headline = '   '

    expect(() => checkLedger(backlog)).toThrow(
      /q-notification-list-scope.*"headline" is empty/s
    )
  })

  test('an option with no sources key is refused, naming the question and the option (T-Q4)', () => {
    const backlog = fixture()
    delete backlog.questions[0].options[0].sources

    expect(() => checkLedger(backlog)).toThrow(
      /q-notification-list-scope.*option A.*"sources"/s
    )
  })

  test('an empty sources list passes (T-Q4)', () => {
    const backlog = fixture()
    backlog.questions[0].options[0].sources = []

    expect(() => checkLedger(backlog)).not.toThrow()
  })

  test('one option only is refused (T-Q5)', () => {
    const backlog = fixture()
    backlog.questions[0].options = [backlog.questions[0].options[0]]

    expect(() => checkLedger(backlog)).toThrow(
      /q-notification-list-scope.*at least two options/s
    )
  })

  test('duplicate option ids are refused (T-Q5)', () => {
    const backlog = fixture()
    backlog.questions[0].options[1] = {
      ...backlog.questions[0].options[1],
      id: 'A'
    }

    expect(() => checkLedger(backlog)).toThrow(
      /q-notification-list-scope.*duplicate option id "A"/s
    )
  })

  test('ifNobodyAnswers.option naming no option is refused (T-Q6)', () => {
    const backlog = fixture()
    backlog.questions[1].ifNobodyAnswers.option = 'Z'

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*"ifNobodyAnswers\.option" names no option \("Z"\)/s
    )
  })

  test('a missing consequence is refused (T-Q6)', () => {
    const backlog = fixture()
    delete backlog.questions[1].ifNobodyAnswers.consequence

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*"ifNobodyAnswers\.consequence" is missing/s
    )
  })

  test('an unknown category is refused (T-Q7)', () => {
    const backlog = fixture()
    backlog.questions[1].category = 'made-up'

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*"category" is "made-up"/s
    )
  })

  test('an unknown status is refused (T-Q7)', () => {
    const backlog = fixture()
    backlog.questions[1].status = 'made-up'

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*"status" is "made-up"/s
    )
  })

  test('a stored class disagreeing with its derivation is refused (T-Q8)', () => {
    const backlog = fixture()
    backlog.questions[0].class = 'defaulted'

    expect(() => checkLedger(backlog)).toThrow(
      /q-notification-list-scope.*"class" is "defaulted"/s
    )
  })

  test('a stored mustAnswer disagreeing with its derivation is refused (T-Q8)', () => {
    const backlog = fixture()
    backlog.questions[0].mustAnswer = false

    expect(() => checkLedger(backlog)).toThrow(
      /q-notification-list-scope.*"mustAnswer" is false/s
    )
  })

  test('each must-answer category with a non-null default is refused, naming the question and saying it cannot take a default (T-Q9)', () => {
    for (const category of [
      'security',
      'access-control',
      'data-integrity',
      'legal',
      'policy'
    ]) {
      const backlog = fixture()
      backlog.questions[0].category = category
      backlog.questions[0].ifNobodyAnswers = {
        option: 'A',
        consequence: 'ignored',
        defaultWhy: null
      }

      expect(() => checkLedger(backlog)).toThrow(
        /q-notification-list-scope.*cannot take a default/s
      )
    }
  })

  test('an option effect carrying prior is refused (T-Q10)', () => {
    const backlog = fixture()
    backlog.questions[1].options[0].effects[0] = {
      ...backlog.questions[1].options[0].effects[0],
      prior: 'A'
    }

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*carries "prior"/s
    )
  })

  test('duplicate question ids are refused (T-Q11 sibling)', () => {
    const backlog = fixture()
    backlog.questions[1].id = backlog.questions[0].id

    expect(() => checkLedger(backlog)).toThrow(/duplicate question id/)
  })

  const rulingFixture = () => {
    const backlog = fixture()
    backlog.decisions = [
      {
        id: 'd-001',
        question: 'q-house-rules-source',
        subject: null,
        chosen: 'A',
        answer: null,
        words: 'Default applied: option A.',
        note: 'Applied by the default rule.',
        decidedBy: 'default',
        decidedAt: '2026-09-21T10:00:00Z',
        sealedEvidence: [],
        appliesTo: ['inc-002'],
        constraints: [],
        revisitWhen: 'a person rules q-house-rules-source',
        effects: [
          {
            op: 'set-assumption',
            target: 'as-house-rules-by-path',
            value: 'A',
            prior: null
          },
          { op: 'defer-increment', target: 'inc-002', prior: 'todo' }
        ],
        supersedes: null,
        supersededBy: null,
        reopens: false,
        status: 'defaulted'
      }
    ]
    backlog.questions[1].status = 'open'
    backlog.questions[1].decision = null
    return backlog
  }

  test('decisions: duplicate ids are refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions.push({ ...backlog.decisions[0] })

    expect(() => checkLedger(backlog)).toThrow(/d-001.*duplicate decision id/s)
  })

  test('decisions: both question and subject is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].subject = { kind: 'design', id: 'x' }

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*names both "question" and "subject"/s
    )
  })

  test('decisions: neither question nor subject is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].question = null

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*names both "question" and "subject", or neither/s
    )
  })

  test('decisions: an unknown question is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].question = 'q-does-not-exist'

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*"question" names "q-does-not-exist"/s
    )
  })

  test('decisions: a chosen letter not among the options is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].chosen = 'Z'

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*"chosen" \("Z"\) is not one of/s
    )
  })

  test('decisions: a defaulted status with decidedBy sam is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].decidedBy = 'sam'

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*status "defaulted" needs "decidedBy": "default"/s
    )
  })

  test('decisions: an applied effect with no prior is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    delete backlog.decisions[0].effects[0].prior

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*applied effect "set-assumption".*carries no "prior"/s
    )
  })

  test('decisions: a supersedes naming no decision is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].supersedes = 'd-999'

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*"supersedes" names "d-999"/s
    )
  })

  test('decisions: a supersededBy naming no decision is refused (T-Q11, F37)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].supersededBy = 'd-999'

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*"supersededBy" names "d-999"/s
    )
  })

  test('questions: a decision naming an unknown decision id is refused (T-Q11, F37)', () => {
    const backlog = rulingFixture()
    backlog.questions[1].decision = 'd-999'

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*"decision" names "d-999", which is not in decisions/s
    )
  })

  test('questions: a decision naming a different question is refused (T-Q11, F37)', () => {
    const backlog = rulingFixture()
    backlog.questions[1].decision = 'd-001'
    backlog.decisions[0].question = 'q-panel-authority'

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*"decision" \(d-001\) names a different question/s
    )
  })

  test('decisions: two decisions in force for one question is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions.push({
      ...backlog.decisions[0],
      id: 'd-002',
      decidedBy: 'default'
    })

    expect(() => checkLedger(backlog)).toThrow(
      /q-house-rules-source.*more than one decision is in force/s
    )
  })

  test('decisions: a decidedAt of "yesterday" is refused (T-Q11)', () => {
    const backlog = rulingFixture()
    backlog.decisions[0].decidedAt = 'yesterday'

    expect(() => checkLedger(backlog)).toThrow(
      /d-001.*"decidedAt" \("yesterday"\) is not an ISO/s
    )
  })

  test("an atom's needs naming a present question that has a default is refused, naming the atom and the question (T-Q12)", () => {
    const backlog = fixture()
    backlog.requirements[0].needs = ['q-house-rules-source']

    expect(() => checkLedger(backlog)).toThrow(
      /req-001.*"needs" names "q-house-rules-source".*has a default/s
    )
  })

  test('naming a present ruled question is refused (T-Q12)', () => {
    const backlog = fixture()
    backlog.questions[0].status = 'ruled'
    backlog.questions[0].ifNobodyAnswers.option = null

    expect(() => checkLedger(backlog)).toThrow(
      /req-001.*"needs" names "q-notification-list-scope".*no longer awaiting a ruling/s
    )
  })

  test('naming an absent question passes (T-Q12)', () => {
    const backlog = fixture()
    backlog.requirements[0].needs = ['q-nothing-here']

    expect(() => checkLedger(backlog)).not.toThrow()
  })

  test('a backlog with no questions, decisions or assumptions key passes (T-Q14)', () => {
    const backlog = fixture()
    delete backlog.questions
    delete backlog.decisions
    delete backlog.assumptions

    expect(() => checkLedger(backlog)).not.toThrow()
  })
})

describe('defaultInForce and blockingIncrementIds (T-Q13)', () => {
  test('defaultInForce returns the in-force defaulted decision and ignores superseded ones', () => {
    const backlog = {
      decisions: [
        {
          id: 'd-001',
          question: 'q-x',
          status: 'superseded',
          supersededBy: 'd-002'
        },
        {
          id: 'd-002',
          question: 'q-x',
          status: 'defaulted',
          supersededBy: null
        }
      ]
    }

    expect(defaultInForce(backlog, 'q-x')?.id).toBe('d-002')
  })

  test('defaultInForce returns null when the decision in force is not defaulted', () => {
    const backlog = {
      decisions: [
        { id: 'd-001', question: 'q-x', status: 'current', supersededBy: null }
      ]
    }

    expect(defaultInForce(backlog, 'q-x')).toBeNull()
  })

  test('blockingIncrementIds returns the sorted ids whose needs name the question', () => {
    const backlog = {
      increments: [
        { id: 'inc-003', needs: ['q-x'] },
        { id: 'inc-001', needs: ['q-x'] },
        { id: 'inc-002', needs: [] }
      ]
    }

    expect(blockingIncrementIds(backlog, 'q-x')).toEqual(['inc-001', 'inc-003'])
  })
})

describe('isAwaitingRuling and hasDefault', () => {
  test.each([
    ['open', true],
    ['outstanding', true],
    ['ruled', false],
    ['superseded', false],
    ['withdrawn', false]
  ])('isAwaitingRuling(%s) is %s', (status, expected) => {
    expect(isAwaitingRuling({ status })).toBe(expected)
  })

  test('hasDefault is true when ifNobodyAnswers.option is set', () => {
    expect(hasDefault({ ifNobodyAnswers: { option: 'A' } })).toBe(true)
  })

  test('hasDefault is false when ifNobodyAnswers.option is null', () => {
    expect(hasDefault({ ifNobodyAnswers: { option: null } })).toBe(false)
  })
})

describe('decisionInForce', () => {
  test('returns null when nothing is in force', () => {
    expect(decisionInForce({ decisions: [] }, 'q-x')).toBeNull()
  })
})
