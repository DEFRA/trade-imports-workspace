import { describe, test, expect, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkChallenge, clearChallenges, listChallenges } from './challenge.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const challengePath = (conflictId) =>
  join(workspace.layout.challengeDir, `${conflictId}.json`)

const VERDICT = {
  conflict: 'c-002',
  verdict: 'precedence',
  rule: 'ruling:sam-2026-09-29c claim 3 says which tiers run where.',
  claims: ['sam3-001'],
  outcome: 'The tier-1 smoke run locally; tiers 2 to 5 in CDP perf-test.'
}

const check = (conflictId = 'c-002') =>
  checkChallenge({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA,
    conflictId
  })

const problemsOf = () => {
  try {
    check()
  } catch (error) {
    return error.message.split('\n').slice(1)
  }
  throw new Error('Expected the check to refuse, and it passed.')
}

describe('listChallenges', () => {
  test('lists every question conflict with the requirements that cite it', () => {
    workspace = makeDistilWorkspace()

    const { questions } = listChallenges({ layout: workspace.layout })

    expect(
      questions.map(({ id, requirements }) => ({ id, requirements }))
    ).toEqual([{ id: 'c-002', requirements: ['req-002', 'req-004'] }])
  })

  test('lists each verdict already written', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(challengePath('c-002'), VERDICT)

    expect(listChallenges({ layout: workspace.layout }).verdicts).toEqual([
      { conflict: 'c-002', verdict: 'precedence' }
    ])
  })
})

describe('checkChallenge', () => {
  test('passes a verdict in shape', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(challengePath('c-002'), VERDICT)

    expect(check()).toEqual({
      conflict: 'c-002',
      verdict: 'precedence',
      path: challengePath('c-002')
    })
  })

  test('refuses a verdict named for another conflict', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(challengePath('c-002'), {
      ...VERDICT,
      conflict: 'c-001'
    })

    expect(problemsOf()).toEqual([
      'distil/challenge/c-002.json is about c-001. Name the file for its conflict: distil/challenge/c-001.json.'
    ])
  })

  test('refuses a refuted claim and an overruled claim that is no position', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(challengePath('c-002'), {
      ...VERDICT,
      claims: ['tests-010'],
      overruled: ['tests-001']
    })

    expect(problemsOf()).toEqual([
      'distil/challenge/c-002.json rests on tests-010, which verification refuted.',
      "distil/challenge/c-002.json overrules tests-001, which none of c-002's positions rests on."
    ])
  })

  test('asks a blocked verdict to name its blocker', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(challengePath('c-002'), {
      ...VERDICT,
      verdict: 'blocked'
    })

    expect(problemsOf()).toEqual([
      'distil/challenge/c-002.json finds a blocker but has no "blocker": say who must do what before it can be built.'
    ])
  })

  test('refuses a question that still overrules a claim', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(challengePath('c-002'), {
      ...VERDICT,
      verdict: 'question',
      why: 'Nothing settles the schedule.',
      overruled: ['dr5-060']
    })

    expect(problemsOf()).toEqual([
      'distil/challenge/c-002.json keeps it a question, so it overrules nothing and names no blocker. Drop "overruled" and "blocker".'
    ])
  })

  test('names a verdict that has not been written', () => {
    workspace = makeDistilWorkspace()

    expect(() => check('c-009')).toThrow(
      `Can't find ${challengePath('c-009')}. The challenger for c-009 writes it.`
    )
  })
})

describe('clearChallenges', () => {
  test('removes every verdict', () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(challengePath('c-002'), VERDICT)

    const result = clearChallenges({ layout: workspace.layout })

    expect({
      removed: result.removed,
      left: existsSync(workspace.layout.challengeDir)
    }).toEqual({ removed: [challengePath('c-002')], left: false })
  })
})
