import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { distilCoverage } from './coverage.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const coverage = () =>
  distilCoverage({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA
  })

const problemsOf = () => {
  try {
    coverage()
  } catch (error) {
    return error.message.split('\n').slice(1)
  }
  throw new Error('Expected coverage to refuse, and it passed.')
}

const editRequirement = (id, edit) =>
  workspace.editJson(workspace.layout.requirements, (file) => ({
    requirements: file.requirements.map((requirement) =>
      requirement.id === id ? edit(requirement) : requirement
    )
  }))

const editConflict = (id, edit) =>
  workspace.editJson(workspace.layout.conflicts, (file) => ({
    conflicts: file.conflicts.map((conflict) =>
      conflict.id === id ? edit(conflict) : conflict
    )
  }))

const editIncrement = (id, edit) =>
  workspace.editJson(workspace.layout.backlog, (backlog) => ({
    ...backlog,
    increments: backlog.increments.map((increment) =>
      increment.id === id ? edit(increment) : increment
    )
  }))

describe('distilCoverage', () => {
  test('passes the demo workarea with its counts, questions and backlog', () => {
    workspace = makeDistilWorkspace()

    expect(coverage()).toEqual({
      requirements: {
        total: 6,
        byStatus: { adopted: 4, question: 1, 'out-of-scope': 1 },
        byDelta: { new: 4, change: 1, exists: 1 }
      },
      conflicts: { total: 2, precedence: 1, question: 1 },
      questions: [
        {
          id: 'c-002',
          about:
            'Which tiers and scenario shapes run in which environment, and how often',
          question:
            'Which tiers and scenarios should run in each environment, and on what schedule?',
          default:
            'Local Docker: the tier-1 smoke run on every pull request. CDP perf-test: per release, tiers 2 to 5, with the tier-4 conformance run at owner-agreed rates.',
          requirements: ['req-002', 'req-004']
        }
      ],
      blocked: [],
      sources: [
        { id: 'ruling:sam-2026-09-29c', claims: 1, cited: 1 },
        { id: 'repo:tests', claims: 4, cited: 4 },
        { id: 'confluence:6608160092', claims: 6, cited: 6 }
      ],
      unavailable: [],
      backlog: { path: workspace.layout.backlog, increments: 2, covered: 4 }
    })
  })

  describe('a source that backs nothing', () => {
    const dropRulingCitations = () => {
      editRequirement('req-001', (requirement) => ({
        ...requirement,
        claims: requirement.claims.filter((claimId) => claimId !== 'sam3-001')
      }))
    }

    test('refuses a verified source none of whose claims is cited', () => {
      workspace = makeDistilWorkspace()
      dropRulingCitations()

      expect(problemsOf()).toEqual([
        'ruling:sam-2026-09-29c backs no requirement or conflict: none of its 1 held or missed claims is cited. Weigh every one: cite each where it shows what the service does today or must do, and record any the goal excludes in an out-of-scope requirement.'
      ])
    })

    test('counts a claim cited only by an out-of-scope requirement as used', () => {
      workspace = makeDistilWorkspace()
      dropRulingCitations()
      editRequirement('req-005', (requirement) => ({
        ...requirement,
        claims: [...requirement.claims, 'sam3-001']
      }))

      expect(coverage().sources[0]).toEqual({
        id: 'ruling:sam-2026-09-29c',
        claims: 1,
        cited: 1
      })
    })
  })

  describe('a requirement blocked by somebody outside the programme', () => {
    const BLOCKER =
      'CDP raises the ingress request-body cap to at least 50MB (EUDPA-518).'

    test('lists it among the blocked requirements', () => {
      workspace = makeDistilWorkspace()
      rmSync(workspace.layout.backlog)
      editRequirement('req-006', (requirement) => ({
        ...requirement,
        blockedBy: BLOCKER
      }))

      expect(coverage().blocked).toEqual([
        { id: 'req-006', blockedBy: BLOCKER }
      ])
    })

    test('refuses a blocker on a requirement that is not adopted', () => {
      workspace = makeDistilWorkspace()
      rmSync(workspace.layout.backlog)
      editRequirement('req-004', (requirement) => ({
        ...requirement,
        blockedBy: BLOCKER
      }))

      expect(problemsOf()).toEqual([
        'req-004 is question but carries blockedBy. Only an adopted requirement waits on a blocker: a design choice is a question.'
      ])
    })

    test('refuses a todo row that covers it', () => {
      workspace = makeDistilWorkspace()
      const todoRow = workspace
        .readJson(workspace.layout.backlog)
        .increments.find(
          (increment) =>
            (increment.status ?? 'todo') === 'todo' &&
            increment.requirements.includes('req-006')
        )
      editRequirement('req-006', (requirement) => ({
        ...requirement,
        blockedBy: BLOCKER
      }))

      expect(problemsOf()).toEqual([
        `${todoRow.id} is todo but covers req-006, which is blocked by: ${BLOCKER} Make the row blocked, with the blocker in its openQuestions, or move req-006 to a blocked row.`
      ])
    })
  })

  describe('a challenge verdict', () => {
    const challengePath = (conflictId) =>
      join(workspace.layout.challengeDir, `${conflictId}.json`)

    const SETTLED = {
      conflict: 'c-002',
      verdict: 'precedence',
      rule: 'ruling:sam-2026-09-29c claim 3 says which tiers run where.',
      claims: ['sam3-001'],
      outcome: 'The tier-1 smoke run locally; tiers 2 to 5 in CDP perf-test.'
    }

    test('refuses a settling verdict that was not applied', () => {
      workspace = makeDistilWorkspace()
      workspace.writeJson(challengePath('c-002'), SETTLED)

      expect(problemsOf()).toEqual([
        `distil/challenge/c-002.json settled it by precedence (${SETTLED.rule}), but distil/conflicts.json still has c-002 as a question. Rewrite it as precedence with the verdict's outcome and overruled claims, and adopt the requirements that cite it.`
      ])
    })

    test('needs nothing applied when it keeps the question', () => {
      workspace = makeDistilWorkspace()
      workspace.writeJson(challengePath('c-002'), {
        ...SETTLED,
        verdict: 'question',
        why: 'No ruling or source says how often the tiers run.'
      })

      expect(coverage().questions.map((question) => question.id)).toEqual([
        'c-002'
      ])
    })

    test('refuses a blocked verdict whose requirements are still questions and carry no blocker', () => {
      workspace = makeDistilWorkspace()
      workspace.writeJson(challengePath('c-002'), {
        ...SETTLED,
        verdict: 'blocked',
        blocker: 'CDP provisions the perf-test environment.'
      })
      editConflict('c-002', ({ question, default: _default, ...conflict }) => ({
        ...conflict,
        resolution: 'precedence',
        outcome: SETTLED.outcome
      }))

      expect(problemsOf()).toEqual(
        expect.arrayContaining([
          `distil/challenge/c-002.json found it waits on a blocker, not a design choice (${SETTLED.rule}), but req-004 is still a question. Adopt it with blockedBy: "CDP provisions the perf-test environment.".`,
          `distil/challenge/c-002.json found it waits on a blocker, not a design choice (${SETTLED.rule}), but no requirement citing c-002 carries blockedBy. Give each one it holds back blockedBy: "CDP provisions the perf-test environment.".`
        ])
      )
    })
  })

  test('passes before any backlog exists', () => {
    workspace = makeDistilWorkspace()
    rmSync(workspace.layout.backlog)

    expect(coverage().backlog).toBeNull()
  })

  test('refuses a claim verification refuted, and one nobody holds', () => {
    workspace = makeDistilWorkspace()
    editRequirement('req-003', (requirement) => ({
      ...requirement,
      claims: ['tests-010', 'tests-404']
    }))

    expect(problemsOf()).toEqual([
      'req-003 cites tests-010, which verification refuted. Cite a claim that held.',
      'req-003 cites tests-404, which no extract or verification holds.'
    ])
  })

  test('names once each unverified source that requirements cite', () => {
    workspace = makeDistilWorkspace()
    rmSync(join(workspace.layout.verifyDir, 'confluence-6608160092.json'))

    expect(problemsOf()).toEqual([
      'confluence:6608160092 is extracted, not verified (No verification yet.), so its claims are not in the working set. They are cited by req-002, req-004, req-005, req-006, c-001 position, c-002 position.',
      'req-005 cites dr5-001-m1, which no extract or verification holds.'
    ])
  })

  test('says what a stale source needs when one requirement cites it', () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(
      join(workspace.layout.extractDir, 'ruling-sam-2026-09-29c.json'),
      ({ scopeHash, ...extract }) => extract
    )

    expect(problemsOf()).toEqual([
      'ruling:sam-2026-09-29c is stale, not verified (The extract records no scope hash.), so its claims are not in the working set. They are cited by req-001.'
    ])
  })

  test('refuses a conflict position resting on a claim verification refuted', () => {
    workspace = makeDistilWorkspace()
    editConflict('c-001', (conflict) => ({
      ...conflict,
      positions: [
        { ...conflict.positions[0], claim: 'tests-010' },
        conflict.positions[1]
      ]
    }))

    expect(problemsOf()).toEqual([
      'c-001 position cites tests-010, which verification refuted. Cite a claim that held.'
    ])
  })

  test('refuses a requirement citing a conflict that does not exist', () => {
    workspace = makeDistilWorkspace()
    editRequirement('req-003', (requirement) => ({
      ...requirement,
      conflicts: ['c-009']
    }))

    expect(problemsOf()).toEqual([
      'req-003 cites c-009, which is not in distil/conflicts.json.'
    ])
  })

  test('refuses a conflict no requirement cites', () => {
    workspace = makeDistilWorkspace()
    editRequirement('req-001', (requirement) => ({
      ...requirement,
      conflicts: []
    }))
    editRequirement('req-006', (requirement) => ({
      ...requirement,
      conflicts: []
    }))

    expect(problemsOf()).toEqual(['c-001 is cited by no requirement.'])
  })

  test('refuses a question with no default', () => {
    workspace = makeDistilWorkspace()
    editConflict('c-002', ({ default: fallback, ...conflict }) => conflict)

    expect(problemsOf()).toEqual([
      'c-002 is a question but has no "default": what will be built if nobody answers.'
    ])
  })

  test('refuses a precedence conflict that carries a question', () => {
    workspace = makeDistilWorkspace()
    editConflict('c-001', (conflict) => ({
      ...conflict,
      question: 'Which one?'
    }))

    expect(problemsOf()).toEqual([
      'c-001 was settled by precedence, so it takes no question or default. Make it a question, or drop them.'
    ])
  })

  test('refuses a position from a source that is not in sources.json', () => {
    workspace = makeDistilWorkspace()
    editConflict('c-001', (conflict) => ({
      ...conflict,
      positions: [
        ...conflict.positions,
        {
          source: 'CDP platform convention',
          says: 'Perf-test is stubbed.',
          claim: 'dr5-018'
        }
      ]
    }))

    expect(problemsOf()).toEqual([
      'c-001 has a position from CDP platform convention, which is not in sources.json.'
    ])
  })

  test('refuses a question requirement that cites no question', () => {
    workspace = makeDistilWorkspace()
    editRequirement('req-004', (requirement) => ({
      ...requirement,
      conflicts: ['c-001']
    }))

    expect(problemsOf()).toEqual([
      'req-004 is a question but cites no question conflict. Cite the conflict that carries its question and default.'
    ])
  })

  test('refuses an adopted exists requirement that names nothing meeting it', () => {
    workspace = makeDistilWorkspace()
    editRequirement('req-003', (requirement) => ({
      ...requirement,
      deltaNote: ''
    }))

    expect(problemsOf()).toEqual([
      'req-003 is adopted as exists but its deltaNote is empty: name what already meets it.'
    ])
  })

  test('refuses an adopted requirement to build that sits in no increment', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-001', (increment) => ({
      ...increment,
      requirements: ['req-001']
    }))

    expect(problemsOf()).toEqual([
      'req-006 is adopted as new but sits in no increment.'
    ])
  })

  test('refuses a requirement in two increments', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-002', (increment) => ({
      ...increment,
      requirements: [...increment.requirements, 'req-001']
    }))

    expect(problemsOf()).toEqual([
      'req-001 sits in 2 increments: inc-001, inc-002. Each requirement sits in one.'
    ])
  })

  test('refuses an increment covering a requirement that is already met', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-002', (increment) => ({
      ...increment,
      requirements: [...increment.requirements, 'req-003']
    }))

    expect(problemsOf()).toEqual([
      'inc-002 covers req-003, which is already met, so it goes in the report and never in an increment.'
    ])
  })

  test('lets a done increment keep a requirement that has since turned out already met', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-002', (increment) => ({
      ...increment,
      status: 'done',
      requirements: [...increment.requirements, 'req-003']
    }))

    expect(coverage().backlog.covered).toBe(5)
  })

  test('lets a done increment keep a requirement that is now out of scope', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-002', (increment) => ({
      ...increment,
      status: 'done',
      requirements: [...increment.requirements, 'req-005']
    }))

    expect(coverage().backlog.increments).toBe(2)
  })

  test('counts a done increment as covering its requirements', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-001', (increment) => ({ ...increment, status: 'done' }))

    expect(coverage().backlog.covered).toBe(4)
  })

  test('counts a dropped increment as covering nothing', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-001', (increment) => ({
      ...increment,
      status: 'dropped'
    }))

    expect(problemsOf()).toEqual([
      'req-001 is adopted as change but sits in no increment.',
      'req-006 is adopted as new but sits in no increment.'
    ])
  })

  test('refuses a blocked increment covering a requirement that is now out of scope', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-002', (increment) => ({
      ...increment,
      status: 'blocked',
      requirements: [...increment.requirements, 'req-005']
    }))

    expect(problemsOf()).toEqual([
      'inc-002 covers req-005, which is out of scope.'
    ])
  })

  test('refuses a precedence conflict whose positions all come from one source', () => {
    workspace = makeDistilWorkspace()
    editConflict('c-001', (conflict) => ({
      ...conflict,
      positions: [
        conflict.positions[1],
        {
          source: 'confluence:6608160092',
          says: 'Tier 1 runs on every pull request.',
          claim: 'dr5-038'
        }
      ]
    }))

    expect(problemsOf()).toEqual([
      'c-001 was settled by precedence, but every position comes from confluence:6608160092. Precedence settles a disagreement between sources: merge the claims into one requirement, or make it a question.'
    ])
  })

  test('refuses a conflict overruling a claim none of its positions rests on', () => {
    workspace = makeDistilWorkspace()
    editConflict('c-001', (conflict) => ({
      ...conflict,
      overruled: ['dr5-038']
    }))

    expect(problemsOf()).toEqual([
      'c-001 overrules dr5-038, which none of its positions rests on.'
    ])
  })

  test('refuses a conflict overruling a source ranked above every position it keeps', () => {
    workspace = makeDistilWorkspace()
    editRequirement('req-001', (requirement) => ({
      ...requirement,
      claims: ['sam3-001', 'tests-001', 'tests-005']
    }))
    editConflict('c-001', (conflict) => ({
      ...conflict,
      overruled: ['tests-001-m1']
    }))

    expect(problemsOf()).toEqual([
      'c-001 overrules tests-001-m1 from repo:tests, which ranks above every position it keeps. Precedence keeps the higher-ranked source.'
    ])
  })

  test('refuses a conflict that overrules every position', () => {
    workspace = makeDistilWorkspace()
    editRequirement('req-001', (requirement) => ({
      ...requirement,
      claims: ['sam3-001', 'tests-001', 'tests-005']
    }))
    editRequirement('req-006', (requirement) => ({
      ...requirement,
      status: 'out-of-scope'
    }))
    editIncrement('inc-001', (increment) => ({
      ...increment,
      requirements: ['req-001']
    }))
    editConflict('c-001', (conflict) => ({
      ...conflict,
      overruled: ['tests-001-m1', 'dr5-018']
    }))

    expect(problemsOf()).toEqual([
      'c-001 overrules every position. Keep the position precedence settled on.'
    ])
  })

  test('refuses a question that overrules a claim before it is answered', () => {
    workspace = makeDistilWorkspace()
    editConflict('c-002', (conflict) => ({
      ...conflict,
      overruled: ['dr5-060']
    }))

    expect(problemsOf()).toEqual([
      'c-002 is a question, so it overrules nothing until it is answered. Drop "overruled".'
    ])
  })

  describe('a claim a later ruling withdrew', () => {
    // repo:tests ranks above confluence:6608160092, so c-001 may set aside
    // the page's claim.
    const withdrawDr5018 = () =>
      editConflict('c-001', (conflict) => ({
        ...conflict,
        overruled: ['dr5-018']
      }))

    test('refuses an adopted requirement that still rests on it', () => {
      workspace = makeDistilWorkspace()
      withdrawDr5018()

      expect(problemsOf()).toEqual([
        'req-006 rests on dr5-018, which c-001 overruled. Take it out of claims, and reword the requirement to what the conflict adopted.'
      ])
    })

    test('refuses a todo or blocked row that still names it', () => {
      workspace = makeDistilWorkspace()
      withdrawDr5018()
      editRequirement('req-006', (requirement) => ({
        ...requirement,
        claims: ['tests-001-m1']
      }))
      editIncrement('inc-001', (increment) => ({
        ...increment,
        status: 'blocked',
        openQuestions: ['Waits on CDP perf-test.'],
        acceptanceCriteria: [
          ...increment.acceptanceCriteria,
          'Real integrations answer in perf-test. (confluence:6608160092 dr5-018)'
        ]
      }))

      expect(problemsOf()).toEqual([
        'inc-001 still names dr5-018, which c-001 overruled. Rewrite the row to what c-001 adopted, and take the claim out of it.'
      ])
    })

    test('lets a done row keep it, and never matches a longer claim id', () => {
      workspace = makeDistilWorkspace()
      withdrawDr5018()
      editRequirement('req-006', (requirement) => ({
        ...requirement,
        claims: ['tests-001-m1']
      }))
      editIncrement('inc-001', (increment) => ({
        ...increment,
        status: 'done',
        detail: `${increment.detail} (dr5-018)`
      }))
      editIncrement('inc-002', (increment) => ({
        ...increment,
        detail: `${increment.detail} (dr5-018-m1)`
      }))

      expect(coverage().conflicts.precedence).toBe(1)
    })
  })

  test('names a missing requirements file and a schema problem in conflicts.json', () => {
    workspace = makeDistilWorkspace()
    rmSync(workspace.layout.requirements)
    editConflict('c-001', (conflict) => ({ ...conflict, resolution: 'vote' }))

    expect(problemsOf()).toEqual([
      'distil/requirements.json does not exist yet.',
      'distil/conflicts.json conflicts[c-001].resolution is "vote". Use one of: precedence, question.'
    ])
  })
})
