import { describe, expect, test } from 'vitest'
import {
  compareOutcomes,
  outcomesOf,
  suiteScriptFor,
  verifyDomain,
  verifyLines
} from './domain-verify.js'

const reportOf = (specs, stats = {}) => ({
  suites: [
    {
      file: 'tests/animals-admin/e2e/features/dlq-events.spec.ts',
      specs: specs.map(({ title, ok, ran = true }) => ({
        title,
        ok,
        tests: [{ status: ran ? (ok ? 'expected' : 'unexpected') : 'skipped' }]
      }))
    }
  ],
  stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0, ...stats }
})

const DLQ_SPEC =
  'tests/animals-admin/e2e/features/dlq-events.spec.ts > starts a replay'
const OUTBOX_SPEC =
  'tests/animals-admin/e2e/features/dlq-events.spec.ts > records an outbox event'

const passing = (titles) =>
  outcomesOf(reportOf(titles.map((title) => ({ title, ok: true }))))

describe('#suiteScriptFor', () => {
  test('Should name the npm script that runs one domain suite', () => {
    expect(suiteScriptFor('plants')).toBe('test:docker-compose:plants')
  })
})

describe('#outcomesOf', () => {
  test('Should count each outcome from the report stats', () => {
    const report = reportOf([{ title: 'starts a replay', ok: true }], {
      expected: 34,
      unexpected: 1,
      skipped: 7
    })

    expect(outcomesOf(report).counts).toEqual({
      passed: 34,
      failed: 1,
      flaky: 0,
      skipped: 7
    })
  })

  test('Should name each spec by its file and title, sorted', () => {
    const report = reportOf([
      { title: 'starts a replay', ok: true },
      { title: 'records an outbox event', ok: false }
    ])

    expect(outcomesOf(report).specs).toEqual([
      { id: OUTBOX_SPEC, status: 'failed' },
      { id: DLQ_SPEC, status: 'passed' }
    ])
  })

  test('Should call a spec that never ran skipped, whatever its ok flag says', () => {
    const report = reportOf([
      { title: 'starts a replay', ok: true, ran: false }
    ])

    expect(outcomesOf(report).specs).toEqual([
      { id: DLQ_SPEC, status: 'skipped' }
    ])
  })

  test('Should find specs nested in inner suites', () => {
    const report = {
      suites: [
        {
          file: 'tests/plants/e2e/origin.spec.ts',
          suites: [
            {
              specs: [{ title: 'saves the origin', ok: true, tests: [{}] }]
            }
          ]
        }
      ]
    }

    expect(outcomesOf(report).specs).toEqual([
      {
        id: 'tests/plants/e2e/origin.spec.ts > saves the origin',
        status: 'passed'
      }
    ])
  })

  test('Should read an empty report as no specs and no counts', () => {
    expect(outcomesOf({})).toEqual({
      counts: { passed: 0, failed: 0, flaky: 0, skipped: 0 },
      specs: []
    })
  })
})

describe('#compareOutcomes', () => {
  test('Should call the services enough when every spec passed', () => {
    const subset = passing(['starts a replay', 'records an outbox event'])

    expect(compareOutcomes({ subset })).toEqual({
      sufficient: true,
      failed: [],
      onlyOnFullStack: [],
      brokenOnBoth: []
    })
  })

  test('Should name a failing spec, and not call the services enough', () => {
    const subset = outcomesOf(
      reportOf([
        { title: 'starts a replay', ok: false },
        { title: 'records an outbox event', ok: true }
      ])
    )

    expect(compareOutcomes({ subset })).toEqual({
      sufficient: false,
      failed: [DLQ_SPEC],
      onlyOnFullStack: [],
      brokenOnBoth: []
    })
  })

  test('Should blame the domain for a spec that passes on the whole stack', () => {
    const subset = outcomesOf(
      reportOf([{ title: 'starts a replay', ok: false }])
    )
    const full = passing(['starts a replay'])

    expect(compareOutcomes({ subset, full })).toEqual({
      sufficient: false,
      failed: [DLQ_SPEC],
      onlyOnFullStack: [DLQ_SPEC],
      brokenOnBoth: []
    })
  })

  test('Should clear the domain of a spec that fails on the whole stack too', () => {
    const subset = outcomesOf(
      reportOf([{ title: 'starts a replay', ok: false }])
    )
    const full = outcomesOf(reportOf([{ title: 'starts a replay', ok: false }]))

    expect(compareOutcomes({ subset, full })).toEqual({
      sufficient: true,
      failed: [DLQ_SPEC],
      onlyOnFullStack: [],
      brokenOnBoth: [DLQ_SPEC]
    })
  })
})

describe('#verifyDomain', () => {
  test('Should run only the domain suite when no control is asked for', async () => {
    const phases = []

    const result = await verifyDomain({
      domain: 'plants',
      runPhase: (phase) => {
        phases.push(phase)
        return Promise.resolve(
          reportOf([{ title: 'saves the origin', ok: true }])
        )
      }
    })

    expect({ phases, sufficient: result.comparison.sufficient }).toEqual({
      phases: [{ domain: 'plants', script: 'test:docker-compose:plants' }],
      sufficient: true
    })
  })

  test('Should run the control against the whole stack with --against-full', async () => {
    const phases = []

    await verifyDomain({
      domain: 'ins',
      againstFull: true,
      runPhase: (phase) => {
        phases.push(phase)
        return Promise.resolve(reportOf([{ title: 'signs in', ok: true }]))
      }
    })

    expect(phases).toEqual([
      { domain: 'ins', script: 'test:docker-compose:ins' },
      { domain: null, script: 'test:docker-compose:ins' }
    ])
  })

  test('Should report the services the domain starts', async () => {
    const result = await verifyDomain({
      domain: 'plants',
      runPhase: () => Promise.resolve(reportOf([]))
    })

    expect(result.services).toHaveLength(10)
  })

  test('Should refuse a domain it does not know', async () => {
    await expect(
      verifyDomain({ domain: 'germinal', runPhase: () => Promise.resolve({}) })
    ).rejects.toThrow(
      "unknown domain 'germinal'; valid: animals, animals-admin, ins, plants"
    )
  })
})

describe('#verifyLines', () => {
  test('Should say the services are enough when every spec passed', () => {
    const lines = verifyLines({
      domain: 'plants',
      services: servicesOfLength(10),
      comparison: {
        sufficient: true,
        failed: [],
        onlyOnFullStack: [],
        brokenOnBoth: []
      },
      ranAgainstFull: false
    })

    expect(lines).toEqual([
      'Domain plants: 10 services',
      'Every spec passed. The plants services are enough for its suite.'
    ])
  })

  test('Should ask for the control run when a spec failed without one', () => {
    const lines = verifyLines({
      domain: 'animals-admin',
      services: servicesOfLength(12),
      comparison: {
        sufficient: false,
        failed: [DLQ_SPEC],
        onlyOnFullStack: [],
        brokenOnBoth: []
      },
      ranAgainstFull: false
    })

    expect(lines.at(-1)).toBe(
      'Run again with --against-full to find out whether the domain or the spec is at fault.'
    )
  })

  test('Should name the file to edit when the whole stack passes a failing spec', () => {
    const lines = verifyLines({
      domain: 'animals-admin',
      services: servicesOfLength(12),
      comparison: {
        sufficient: false,
        failed: [DLQ_SPEC],
        onlyOnFullStack: [DLQ_SPEC],
        brokenOnBoth: []
      },
      ranAgainstFull: true
    })

    expect(lines).toContain(
      'Add it to DOMAIN_SERVICES in tim/src/stack/definition.js.'
    )
  })
})

function servicesOfLength(count) {
  return Array.from({ length: count }, (_, index) => `service-${index}`)
}
