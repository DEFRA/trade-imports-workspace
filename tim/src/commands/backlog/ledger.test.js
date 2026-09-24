import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { applyRuling } from '../../backlog/rule.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const ledgerFixtureDir = join(
  here,
  '..',
  '..',
  'backlog',
  '__fixtures__',
  'ledger'
)

const runTim = (args, workspaceRoot) =>
  execa('node', [cliPath, ...args, '--workspace', workspaceRoot], {
    reject: false
  })

const envelopeOf = (run) => JSON.parse(run.stdout.trim())
const resultOf = (run) => envelopeOf(run).result
const sha256Of = (text) =>
  createHash('sha256').update(text, 'utf8').digest('hex')

/**
 * A printed reversal hint, e.g. `tim backlog rule ... --words "<your
 * words>"`, with its placeholders filled in and quote-aware tokenising
 * applied, ready to pass to `runTim`.
 *
 * @param {string} hint - `result.reverse[0]`, still carrying `tim `
 * @param {Record<string, string>} replacements - Placeholder text to value
 * @returns {string[]}
 */
const parseReversalCommand = (hint, replacements) => {
  const filled = Object.entries(replacements).reduce(
    (text, [placeholder, value]) => text.replaceAll(placeholder, value),
    hint.replace('tim ', '')
  )
  return filled
    .match(/(?:[^\s"]+|"[^"]*")+/g)
    .map((token) => token.replace(/^"|"$/g, ''))
}

const PROGRAMME = 'fixture-ledger'
const AT = '2026-09-21T10:00:00Z'

let workspace

const programmeDir = () => join(workspace, 'workareas', 'shared', PROGRAMME)
const backlogPath = () => join(programmeDir(), 'backlog.json')

const seedWorkspaceRoot = () => {
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'), { recursive: true })
}

const writeRegistry = (body) => {
  mkdirSync(join(workspace, 'tools', 'backlog'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'backlog', 'registry.json'),
    JSON.stringify(body)
  )
}

const registerProgramme = (
  key = PROGRAMME,
  workarea = `workareas/shared/${PROGRAMME}`
) => {
  const raw = JSON.parse(
    readFileSync(join(workspace, 'tools', 'backlog', 'registry.json'), 'utf8')
  )
  writeRegistry({
    programmes: {
      ...raw.programmes,
      [key]: { profile: 'requirements-v2', workarea }
    }
  })
}

const ledgerFixtureBacklog = () =>
  JSON.parse(readFileSync(join(ledgerFixtureDir, 'backlog.json'), 'utf8'))

const writeBacklog = (backlog, dir = programmeDir()) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'backlog.json'),
    `${JSON.stringify(backlog, null, 2)}\n`
  )
}

const copyLedgerDir = (subpath, destDir) => {
  const sourceDir = join(ledgerFixtureDir, 'distil', subpath)
  mkdirSync(destDir, { recursive: true })
  for (const name of readdirSync(sourceDir)) {
    writeFileSync(join(destDir, name), readFileSync(join(sourceDir, name)))
  }
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-ledger-cli-'))
  seedWorkspaceRoot()
  writeRegistry({ programmes: {} })
  registerProgramme()
  writeBacklog(ledgerFixtureBacklog())
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const ruleArgs = (question, extra) => [
  'backlog',
  'rule',
  PROGRAMME,
  question,
  ...extra,
  '--json'
]

describe('tim backlog rule', () => {
  test('T-L1: req-028 ac-1 — the decision, the cleared need and the todo increment are all in the one write', async () => {
    const run = await runTim(
      ruleArgs('q-notification-list-scope', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'Own org only.',
        '--note',
        'Security: a cross-org list is a data-isolation failure.'
      ]),
      workspace
    )

    expect(run.exitCode).toBe(0)
    const result = resultOf(run)
    expect(result.decision.status).toBe('current')
    expect(
      result.decision.effects.every((effect) => Object.hasOwn(effect, 'prior'))
    ).toBe(true)
    expect(result.question.status).toBe('ruled')
    expect(result.question.decision).toBe(result.decision.id)
    expect(result.combineReset).toBe(true)

    const bytes = readFileSync(backlogPath(), 'utf8')
    expect(sha256Of(bytes)).toBe(result.sha256)
    const written = JSON.parse(bytes)
    expect(
      written.requirements.find((row) => row.id === 'req-001').status
    ).toBe('superseded')
    expect(
      written.requirements.find((row) => row.id === 'req-002').status
    ).toBe('adopted')
    const inc001 = written.increments.find((row) => row.id === 'inc-001')
    expect(inc001.status).toBe('todo')
    expect(inc001.needs).toEqual([])
    expect(written.combination.basis.atomsSha).toBeNull()
  })

  test('T-L1b: without --json, the CLI prints the rendered rule text', async () => {
    const run = await runTim(
      [
        'backlog',
        'rule',
        PROGRAMME,
        'q-notification-list-scope',
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'Own org only.',
        '--note',
        'Security: a cross-org list is a data-isolation failure.'
      ],
      workspace
    )

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toContain(
      'recorded for q-notification-list-scope: option A, current.'
    )
    expect(run.stdout).toContain('Written to')
  })

  test('T-L2: hedged words with no --tentative flag are recorded tentative', async () => {
    const run = await runTim(
      ruleArgs('q-notification-list-scope', [
        '--option',
        'B',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'maybe B?',
        '--note',
        'Thinking about it.'
      ]),
      workspace
    )

    expect(run.exitCode).toBe(0)
    const result = resultOf(run)
    expect(result.decision.status).toBe('tentative')
    expect(result.question.status).toBe('outstanding')
    expect(result.notes).toContain(
      'Recorded as tentative because your words hedge. Rule again without the hedge to apply it.'
    )

    const written = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    const inc001 = written.increments.find((row) => row.id === 'inc-001')
    expect(inc001.status).toBe('blocked')
    expect(inc001.needs).toEqual(['q-notification-list-scope'])
    const req001 = written.requirements.find((row) => row.id === 'req-001')
    expect(req001.status).toBe('adopted')
    expect(req001.needs).toEqual(['q-notification-list-scope'])
    const req005 = written.requirements.find((row) => row.id === 'req-005')
    expect(req005.status).toBe('adopted')
    expect(req005.needs).toEqual(['q-notification-list-scope'])
  })

  test('T-L2b: --tentative with plain words also records tentative', async () => {
    const run = await runTim(
      ruleArgs('q-notification-list-scope', [
        '--option',
        'B',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'B',
        '--note',
        'Thinking about it.',
        '--tentative'
      ]),
      workspace
    )

    expect(run.exitCode).toBe(0)
    expect(resultOf(run).decision.status).toBe('tentative')

    const written = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    const inc001 = written.increments.find((row) => row.id === 'inc-001')
    expect(inc001.status).toBe('blocked')
    expect(inc001.needs).toEqual(['q-notification-list-scope'])
    const req001 = written.requirements.find((row) => row.id === 'req-001')
    expect(req001.status).toBe('adopted')
    expect(req001.needs).toEqual(['q-notification-list-scope'])
  })

  test('T-L3: reversing questions[] then ruling by slug lands on the intended question each time', async () => {
    const backlog = ledgerFixtureBacklog()
    backlog.questions = [...backlog.questions].reverse()
    writeBacklog(backlog)

    const first = await runTim(
      ruleArgs('q-panel-authority', [
        '--option',
        'B',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'B',
        '--note',
        'Prefer visibility.'
      ]),
      workspace
    )
    expect(first.exitCode).toBe(0)
    expect(resultOf(first).decision.question).toBe('q-panel-authority')

    const second = await runTim(
      ruleArgs('q-house-rules-source', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'Keep as is.'
      ]),
      workspace
    )
    expect(second.exitCode).toBe(0)
    const result = resultOf(second)
    expect(result.decision.question).toBe('q-house-rules-source')
    expect(result.decision.effects.map((effect) => effect.op)).toContain(
      'defer-increment'
    )

    const written = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    const panel = written.questions.find(
      (row) => row.id === 'q-panel-authority'
    )
    expect(panel.status).toBe('ruled')
  })

  test('T-L3b: a positional reference (not a slug) exits 2 and writes nothing', async () => {
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(
      ruleArgs('1', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'n'
      ]),
      workspace
    )

    expect(run.exitCode).toBe(2)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('T-L5: req-031 ac-1 — an open access-control question keeps its increment blocked while an unrelated increment stays buildable', async () => {
    const run = await runTim(
      ruleArgs('q-panel-authority', ['--by', 'default', '--at', AT]),
      workspace
    )

    expect(run.exitCode).toBe(0)
    const written = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    const inc001 = written.increments.find((row) => row.id === 'inc-001')
    expect(inc001.status).toBe('blocked')
    expect(inc001.needs).toEqual(['q-notification-list-scope'])
    const inc003 = written.increments.find((row) => row.id === 'inc-003')
    expect(inc003.status).toBe('todo')
    expect(inc003.needs).toEqual([])
  })

  test('T-L5b: --by default on the access-control question exits 2, naming it, nothing written', async () => {
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(
      ruleArgs('q-notification-list-scope', ['--by', 'default', '--at', AT]),
      workspace
    )

    expect(run.exitCode).toBe(2)
    const payload = envelopeOf(run)
    expect(payload.errors[0].message).toMatch(/q-notification-list-scope/)
    expect(payload.errors[0].message).toMatch(/must be answered/)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('T-L5c: a backlog whose access-control question carries a default refuses the next write, exit 1, naming it, file unchanged', async () => {
    const backlog = ledgerFixtureBacklog()
    backlog.questions[0].ifNobodyAnswers = {
      option: 'A',
      consequence: 'ignored',
      defaultWhy: null
    }
    writeBacklog(backlog)
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(
      ruleArgs('q-panel-authority', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'n'
      ]),
      workspace
    )

    expect(run.exitCode).toBe(1)
    const payload = envelopeOf(run)
    expect(payload.errors[0].code).toBe('PARSE')
    expect(payload.errors[0].message).toMatch(/q-notification-list-scope/)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('T-L6: req-031 ac-2 — a default applies, prints a reversal, and the reversal actually reverses it', async () => {
    const defaultRun = await runTim(
      ruleArgs('q-house-rules-source', ['--by', 'default', '--at', AT]),
      workspace
    )

    expect(defaultRun.exitCode).toBe(0)
    const result = resultOf(defaultRun)
    expect(result.decision.status).toBe('defaulted')
    expect(result.decision.decidedBy).toBe('default')
    expect(result.decision.effects.map((effect) => effect.op).sort()).toEqual(
      ['defer-increment', 'set-assumption'].sort()
    )
    expect(result.reverse).toHaveLength(1)
    expect(result.reverse[0]).toContain('--option B')
    expect(result.reverse[0]).toContain(PROGRAMME)
    expect(result.reverse[0]).toContain('q-house-rules-source')

    const afterDefault = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    expect(
      afterDefault.increments.find((row) => row.id === 'inc-002').status
    ).toBe('deferred')
    expect(
      afterDefault.assumptions.find(
        (row) => row.id === 'as-house-rules-by-path'
      ).default
    ).toBe('A')

    const reversalArgs = parseReversalCommand(result.reverse[0], {
      '<now>': AT,
      '<your words>': 'Move it now.',
      '<why>': 'Sam wants it tracked.'
    })

    const reversal = await runTim([...reversalArgs, '--json'], workspace)

    expect(reversal.exitCode).toBe(0)
    const reversed = resultOf(reversal)
    expect(reversed.decision.status).toBe('current')
    expect(reversed.decision.supersedes).toBe(result.decision.id)

    const afterReversal = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    const oldDecision = afterReversal.decisions.find(
      (row) => row.id === result.decision.id
    )
    expect(oldDecision.status).toBe('superseded')
    expect(oldDecision.supersededBy).toBe(reversed.decision.id)
    expect(
      afterReversal.increments.find((row) => row.id === 'inc-002').status
    ).toBe('todo')
    expect(
      afterReversal.assumptions.find(
        (row) => row.id === 'as-house-rules-by-path'
      ).default
    ).toBe('B')
  })

  test('T-L7: D-inc-009 — replaying the same --op-id gives one decision, unchanged bytes and an equal result', async () => {
    const args = ruleArgs('q-notification-list-scope', [
      '--option',
      'A',
      '--by',
      'sam',
      '--at',
      AT,
      '--words',
      'A',
      '--note',
      'n',
      '--op-id',
      'r1:inc-009:1:test:t1:rule'
    ])

    const first = await runTim(args, workspace)
    expect(first.exitCode).toBe(0)
    const bytesAfterFirst = readFileSync(backlogPath(), 'utf8')

    const second = await runTim(args, workspace)
    expect(second.exitCode).toBe(0)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(bytesAfterFirst)
    expect(resultOf(second)).toEqual(resultOf(first))

    const opsLog = readFileSync(
      join(programmeDir(), '.backlog-ops.jsonl'),
      'utf8'
    )
      .trim()
      .split('\n')
    expect(opsLog).toHaveLength(1)

    const written = JSON.parse(bytesAfterFirst)
    expect(written.decisions).toHaveLength(1)
  })

  test('T-L8: a stale --expect-sha exits 3 and the file is unchanged', async () => {
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(
      ruleArgs('q-notification-list-scope', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'n',
        '--expect-sha',
        'a'.repeat(64)
      ]),
      workspace
    )

    expect(run.exitCode).toBe(3)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('T-L9: an option effect on a member of a done increment exits 2, naming both ids, file unchanged', async () => {
    const backlog = ledgerFixtureBacklog()
    backlog.increments = backlog.increments.map((row) =>
      row.id === 'inc-001' ? { ...row, status: 'done', doneBy: 'build' } : row
    )
    writeBacklog(backlog)
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(
      ruleArgs('q-notification-list-scope', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'n'
      ]),
      workspace
    )

    expect(run.exitCode).toBe(2)
    const payload = envelopeOf(run)
    expect(payload.errors[0].message).toMatch(/req-001/)
    expect(payload.errors[0].message).toMatch(/inc-001/)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('T-L10: an option carrying "split" exits 2, naming the op, file unchanged', async () => {
    const backlog = ledgerFixtureBacklog()
    backlog.questions = backlog.questions.map((question) =>
      question.id === 'q-panel-authority'
        ? {
            ...question,
            options: question.options.map((option, index) =>
              index === 0
                ? {
                    ...option,
                    effects: [
                      ...option.effects,
                      { op: 'split', target: 'inc-001', into: [] }
                    ]
                  }
                : option
            )
          }
        : question
    )
    writeBacklog(backlog)
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(
      ruleArgs('q-panel-authority', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'n'
      ]),
      workspace
    )

    expect(run.exitCode).toBe(2)
    const payload = envelopeOf(run)
    expect(payload.errors[0].message).toMatch(/"split"/)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('T-L11: rule on a programme nobody registered exits 2, naming the key', async () => {
    const run = await runTim(
      [
        'backlog',
        'rule',
        'alpha',
        'q-x',
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'n',
        '--json'
      ],
      workspace
    )

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toContain(
      'No programme registered under "alpha"'
    )
  })

  test.each([
    ['no --by', ['--option', 'A', '--at', AT, '--words', 'A', '--note', 'n']],
    [
      'no --at',
      ['--option', 'A', '--by', 'sam', '--words', 'A', '--note', 'n']
    ],
    [
      '--at yesterday',
      [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        'yesterday',
        '--words',
        'A',
        '--note',
        'n'
      ]
    ],
    [
      '--option AB',
      [
        '--option',
        'AB',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'n'
      ]
    ],
    [
      "no --words for a person's ruling",
      ['--option', 'A', '--by', 'sam', '--at', AT, '--note', 'n']
    ],
    ['--by default --tentative', ['--by', 'default', '--at', AT, '--tentative']]
  ])('T-L12: %s exits 2 with nothing written', async (_label, extra) => {
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(ruleArgs('q-house-rules-source', extra), workspace)

    expect(run.exitCode).toBe(2)
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('T-L13: survey 2.11 and D23 end to end — a re-ingest after a ruling leaves every touched atom row, including provenance, unchanged', async () => {
    copyLedgerDir('atoms', join(programmeDir(), 'distil', 'atoms'))
    copyLedgerDir('increments', join(programmeDir(), 'distil', 'increments'))

    const firstAtoms = await runTim(
      ['backlog', 'ingest', PROGRAMME, '--atoms'],
      workspace
    )
    expect(firstAtoms.exitCode).toBe(0)
    const firstIncrements = await runTim(
      ['backlog', 'ingest', PROGRAMME, '--increments'],
      workspace
    )
    expect(firstIncrements.exitCode).toBe(0)

    const ruling = await runTim(
      ruleArgs('q-notification-list-scope', [
        '--option',
        'A',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'A',
        '--note',
        'Security.'
      ]),
      workspace
    )
    expect(ruling.exitCode).toBe(0)
    const rulingResult = resultOf(ruling)

    const afterRuling = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    const capturedAtoms = new Map(
      afterRuling.requirements.map((row) => [row.id, row])
    )
    const capturedIncrements = new Map(
      afterRuling.increments.map((row) => [row.id, row])
    )

    const secondAtoms = await runTim(
      ['backlog', 'ingest', PROGRAMME, '--atoms'],
      workspace
    )
    expect(secondAtoms.exitCode).toBe(0)
    const secondIncrements = await runTim(
      ['backlog', 'ingest', PROGRAMME, '--increments'],
      workspace
    )
    expect(secondIncrements.exitCode).toBe(0)

    const reIngested = JSON.parse(readFileSync(backlogPath(), 'utf8'))

    for (const row of reIngested.requirements) {
      const captured = capturedAtoms.get(row.id)
      if (!captured) continue
      expect(row).toEqual(captured)
    }
    const touchedAtomIds = ['req-001', 'req-002', 'req-003']
    for (const id of touchedAtomIds) {
      const row = reIngested.requirements.find((entry) => entry.id === id)
      expect(row.provenance.verifiedBy).toBeNull()
    }

    for (const [id, captured] of capturedIncrements) {
      const row = reIngested.increments.find((entry) => entry.id === id)
      expect(row).toBeDefined()
      expect(row.status).toBe(captured.status)
      expect(row.needs).toEqual(captured.needs)
      expect(row.statusNote).toBe(captured.statusNote)
    }

    const supersede = await runTim(
      ruleArgs('q-notification-list-scope', [
        '--option',
        'B',
        '--by',
        'sam',
        '--at',
        AT,
        '--words',
        'B',
        '--note',
        'Changed my mind.',
        '--supersedes',
        rulingResult.decision.id
      ]),
      workspace
    )
    expect(supersede.exitCode).toBe(0)

    const afterSupersede = JSON.parse(readFileSync(backlogPath(), 'utf8'))
    // Option B's own effects supersede req-001 again (this time by req-003)
    // and reject req-002, having first reverted option A's effects cleanly —
    // proving the revert ran, not that nothing changed.
    const req001 = afterSupersede.requirements.find(
      (row) => row.id === 'req-001'
    )
    const req002 = afterSupersede.requirements.find(
      (row) => row.id === 'req-002'
    )
    const req003 = afterSupersede.requirements.find(
      (row) => row.id === 'req-003'
    )
    expect(req001.status).toBe('superseded')
    expect(req001.supersededBy).toBe('req-003')
    expect(req002.status).toBe('rejected')
    expect(req003.status).toBe('adopted')

    // The superseded decision (option A) is itself marked superseded, which
    // only happens once its effects have actually been reverted first
    // (D13) — proof the revert ran, not merely that option B's own effects
    // happened to leave the same end state.
    const oldDecision = afterSupersede.decisions.find(
      (row) => row.id === rulingResult.decision.id
    )
    const newDecision = resultOf(supersede).decision
    expect(oldDecision.status).toBe('superseded')
    expect(oldDecision.supersededBy).toBe(newDecision.id)
    expect(newDecision.supersedes).toBe(rulingResult.decision.id)
  })
})

describe('tim backlog question check-page', () => {
  const rulingAppliedBacklog = () => {
    const houseRules = applyRuling({
      backlog: ledgerFixtureBacklog(),
      questionId: 'q-house-rules-source',
      by: 'default',
      at: AT
    })
    const panel = applyRuling({
      backlog: houseRules.backlog,
      questionId: 'q-panel-authority',
      by: 'default',
      at: AT
    })
    return panel.backlog
  }

  const pageFixture = () =>
    readFileSync(join(ledgerFixtureDir, 'decisions-page.md'), 'utf8')

  const writePage = (markdown) => {
    const path = join(workspace, 'decisions-page.md')
    writeFileSync(path, markdown)
    return path
  }

  test('T-L4: a matching page exits 0 with the JSON envelope carrying ok: true', async () => {
    writeBacklog(rulingAppliedBacklog())
    const pagePath = writePage(pageFixture())

    const run = await runTim(
      [
        'backlog',
        'question',
        'check-page',
        PROGRAMME,
        '--page',
        pagePath,
        '--json'
      ],
      workspace
    )

    expect(run.exitCode).toBe(0)
    const payload = envelopeOf(run)
    expect(payload.ok).toBe(true)
    expect(payload.result.matched).toBe(3)
  })

  test.each([
    [
      'wrong default letter',
      (markdown) =>
        markdown.replace(
          'default in force: A (d-001)',
          'default in force: B (d-001)'
        ),
      'q-house-rules-source'
    ],
    [
      'wrong decision id',
      (markdown) =>
        markdown.replace(
          'default in force: A (d-001)',
          'default in force: A (d-999)'
        ),
      'q-house-rules-source'
    ],
    [
      'a missing question',
      (markdown) =>
        markdown
          .split('\n')
          .filter((line) => !line.includes('q-panel-authority'))
          .join('\n'),
      'q-panel-authority'
    ],
    [
      'an unknown question',
      (markdown) =>
        `${markdown}\n\n### Not real\n\n\`q-not-real\` · process · default in force: A (d-999)\n`,
      'q-not-real'
    ],
    [
      'a wrong blocked list',
      (markdown) => markdown.replace('blocks inc-001', 'blocks inc-999'),
      'q-notification-list-scope'
    ]
  ])(
    'T-L4: %s exits 1, LINT, naming the question',
    async (_label, mutate, expectedQuestionId) => {
      writeBacklog(rulingAppliedBacklog())
      const pagePath = writePage(mutate(pageFixture()))

      const run = await runTim(
        [
          'backlog',
          'question',
          'check-page',
          PROGRAMME,
          '--page',
          pagePath,
          '--json'
        ],
        workspace
      )

      expect(run.exitCode).toBe(1)
      const payload = envelopeOf(run)
      expect(payload.ok).toBe(false)
      expect(payload.errors[0].code).toBe('LINT')
      expect(payload.errors[0].message).toContain(expectedQuestionId)
    }
  )

  test('T-L4d: without --json, the CLI prints the rendered match count', async () => {
    writeBacklog(rulingAppliedBacklog())
    const pagePath = writePage(pageFixture())

    const run = await runTim(
      ['backlog', 'question', 'check-page', PROGRAMME, '--page', pagePath],
      workspace
    )

    expect(run.exitCode).toBe(0)
    expect(run.stdout.trim()).toBe(
      'The page matches backlog.json for 3 questions.'
    )
  })

  test('T-L4e: a single matching question is worded "one question" (F47)', async () => {
    // Real (not defaulted) rulings move a question's status to `ruled`, out
    // of `isAwaitingRuling` — a defaulted question stays `open` and would
    // still have to appear on the page, so it cannot be used to get to one.
    const houseRules = applyRuling({
      backlog: ledgerFixtureBacklog(),
      questionId: 'q-house-rules-source',
      option: 'B',
      by: 'sam',
      at: AT,
      words: 'B',
      note: 'Move it now.'
    })
    const panel = applyRuling({
      backlog: houseRules.backlog,
      questionId: 'q-panel-authority',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'Keep it.'
    })
    writeBacklog(panel.backlog)

    const pagePath = writePage(
      [
        '### Notification list scope',
        '',
        '`q-notification-list-scope` · process · blocks inc-001'
      ].join('\n')
    )

    const run = await runTim(
      ['backlog', 'question', 'check-page', PROGRAMME, '--page', pagePath],
      workspace
    )

    expect(run.exitCode).toBe(0)
    expect(run.stdout.trim()).toBe(
      'The page matches backlog.json for one question.'
    )
  })
})
