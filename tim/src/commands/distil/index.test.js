import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace,
  splitExtractIntoParts
} from '../../test-support/distil-workspace.js'
import {
  reconciledFor,
  writeDemoAreas
} from '../../test-support/distil-areas.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const runTim = (args, { json = true } = {}) =>
  execa(
    'node',
    [
      cliPath,
      'distil',
      ...args,
      '--workspace',
      workspace.root,
      ...(json ? ['--json'] : [])
    ],
    { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
  )

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

describe('tim distil status', () => {
  test('prints the work list in the JSON envelope', async () => {
    workspace = makeDistilWorkspace()
    rmSync(join(workspace.layout.verifyDir, 'repo-tests.json'))

    const run = await runTim(['status', DEMO_WORKAREA])

    expect(run.exitCode).toBe(0)
    expect(envelopeOf(run)).toMatchObject({
      ok: true,
      schema_version: 1,
      result: {
        counts: { pending: 0, extracted: 1, verified: 2, stale: 0, invalid: 0 },
        work: [
          {
            id: 'repo:tests',
            slug: 'repo-tests',
            kind: 'repo',
            state: 'extracted',
            next: 'verify'
          }
        ]
      }
    })
  })

  test('prints one line per source in text', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['status', DEMO_WORKAREA], { json: false })

    expect(run.stdout.trim().split('\n')).toEqual([
      'verified  ruling:sam-2026-09-29c  Extracted and verified.',
      'verified  repo:tests  Extracted and verified.',
      'verified  confluence:6608160092  Extracted and verified.',
      '0 of 3 sources need work: 0 pending, 0 extracted, 3 verified, 0 stale, 0 invalid.'
    ])
  })

  test('refuses a workarea outside workareas/ with exit 2', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['status', '../elsewhere'])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      'Workarea "../elsewhere" must be a path inside workareas/, such as shared/my-programme.'
    )
  })

  test('names a workarea with no sources.json', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['status', 'shared/nothing-here'])

    expect(envelopeOf(run).errors[0]).toEqual({
      code: 'NOT_FOUND',
      message: `Can't find ${join(workspace.root, 'workareas', 'shared', 'nothing-here', 'sources.json')}.`
    })
  })
})

describe('tim distil check', () => {
  test('passes one source at one stage, with its verify ranges', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim([
      'check',
      DEMO_WORKAREA,
      '--source',
      'repo:tests',
      '--stage',
      'extract',
      '--chunk',
      '2'
    ])

    expect(
      envelopeOf(run).result.sources[0].chunks.map((chunk) => [
        chunk.from,
        chunk.to
      ])
    ).toEqual([
      ['tests-001', 'tests-002'],
      ['tests-005', 'tests-010']
    ])
  })

  test('exits 1 with LINT and every problem when a file is out of shape', async () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(
      join(workspace.layout.extractDir, 'repo-tests.json'),
      ({ structure, ...extract }) => extract
    )

    const run = await runTim(['check', DEMO_WORKAREA, '--stage', 'extract'])

    expect(run.exitCode).toBe(1)
    expect(envelopeOf(run).errors[0]).toEqual({
      code: 'LINT',
      message: `1 problem in ${workspace.workareaDir}:\ndistil/extract/repo-tests.json has no "structure".`
    })
  })

  test('refuses an unknown stage with exit 2 before reading anything', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['check', DEMO_WORKAREA, '--stage', 'reconcile'])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      '--stage must be one of: partition, extract, verify, all.'
    )
  })

  test('checks a partition and clears the old extract parts', async () => {
    workspace = makeDistilWorkspace()
    const { partPath } = splitExtractIntoParts(workspace)

    const run = await runTim(
      [
        'check',
        DEMO_WORKAREA,
        '--source',
        'repo:tests',
        '--stage',
        'partition',
        '--clear-parts'
      ],
      { json: false }
    )

    expect(run.stdout.trim().split('\n')).toEqual([
      'repo:tests: 2 parts. In shape.',
      '  part 1, Suite layout and config: repo-tests-p1-001 on',
      '  part 2, Fixtures: repo-tests-p2-001 on',
      `Removed 2 part files: ${partPath(1)}, ${partPath(2)}`
    ])
  })

  test('checks one extract part', async () => {
    workspace = makeDistilWorkspace()
    splitExtractIntoParts(workspace)

    const run = await runTim(
      [
        'check',
        DEMO_WORKAREA,
        '--source',
        'repo:tests',
        '--stage',
        'extract',
        '--part',
        '2'
      ],
      { json: false }
    )

    expect(run.stdout.trim()).toBe(
      'repo:tests: part 2 in shape.\n  part 2, Fixtures: 1 claim, tests-010 to tests-010'
    )
  })

  test('refuses a chunk that is not a whole number above 0', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['check', DEMO_WORKAREA, '--chunk', '0'])

    expect(envelopeOf(run).errors[0].message).toBe(
      '--chunk must be a whole number above 0.'
    )
  })

  test('refuses a part that is not a whole number above 0', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['check', DEMO_WORKAREA, '--part', 'two'])

    expect(envelopeOf(run).errors[0].message).toBe(
      '--part must be a whole number above 0.'
    )
  })
})

describe('tim distil merge-extract', () => {
  test('merges the parts and prints each part', async () => {
    workspace = makeDistilWorkspace()
    const { extractPath } = splitExtractIntoParts(workspace)

    const run = await runTim(
      ['merge-extract', DEMO_WORKAREA, '--source', 'repo:tests'],
      { json: false }
    )

    expect(run.stdout.trim().split('\n')).toEqual([
      `Merged 2 parts into ${extractPath}: 4 claims, stamped with scope hash ${workspace.readJson(extractPath).scopeHash}.`,
      '  part 1, Suite layout and config: 3 claims, tests-001 to tests-005',
      '  part 2, Fixtures: 1 claim, tests-010 to tests-010',
      'Kept the partition and the part files.'
    ])
  })

  test('exits 1 with LINT when a part is missing', async () => {
    workspace = makeDistilWorkspace()
    const { partPath } = splitExtractIntoParts(workspace)
    rmSync(partPath(1))

    const run = await runTim([
      'merge-extract',
      DEMO_WORKAREA,
      '--source',
      'repo:tests'
    ])

    expect(run.exitCode).toBe(1)
    expect(envelopeOf(run).errors[0].code).toBe('LINT')
  })
})

describe('tim distil reset', () => {
  test('moves the named sources aside and prints where', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim([
      'reset',
      DEMO_WORKAREA,
      '--source',
      'repo:tests',
      '--source',
      'ruling:sam-2026-09-29c'
    ])

    expect(envelopeOf(run).result).toMatchObject({
      superseded: expect.stringMatching(
        /\/distil\/superseded\/\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d{3}Z$/
      ),
      moved: 4,
      sources: [{ id: 'ruling:sam-2026-09-29c' }, { id: 'repo:tests' }]
    })
  })

  test('leaves the reset sources pending for the next launch', async () => {
    workspace = makeDistilWorkspace()
    await runTim(['reset', DEMO_WORKAREA, '--all'])

    const run = await runTim(['status', DEMO_WORKAREA])

    expect(envelopeOf(run).result.counts.pending).toBe(3)
  })

  test('refuses with exit 2 when given neither sources nor --all', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['reset', DEMO_WORKAREA])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      'Name the sources to reset with --source, once for each, or reset every source with --all. Not both.'
    )
  })

  test('resets the reconcile stage, keeping every verified extract', async () => {
    workspace = makeDistilWorkspace()
    await runTim(['reset', DEMO_WORKAREA, '--stage', 'reconcile'])

    const run = await runTim(['status', DEMO_WORKAREA])

    expect({
      verified: envelopeOf(run).result.counts.verified,
      requirements: existsSync(workspace.layout.requirements),
      backlog: existsSync(workspace.layout.backlog)
    }).toEqual({ verified: 3, requirements: false, backlog: false })
  })

  test('refuses a reconcile reset that names sources, with exit 2', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim([
      'reset',
      DEMO_WORKAREA,
      '--stage',
      'reconcile',
      '--all'
    ])

    expect({
      exitCode: run.exitCode,
      message: envelopeOf(run).errors[0].message
    }).toEqual({
      exitCode: 2,
      message:
        '--stage reconcile resets the later stages for the whole workarea, so it takes no --source and no --all.'
    })
  })
})

describe('tim distil areas', () => {
  test('writes every area working set with --write and prints the counts', async () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)

    const run = await runTim(['areas', DEMO_WORKAREA, '--write'])

    expect(envelopeOf(run).result).toMatchObject({
      total: 13,
      areas: [
        { id: 'suite', claims: 6 },
        { id: 'tiers', claims: 7 }
      ]
    })
  })

  test('refuses --write with --area, with exit 2', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim([
      'areas',
      DEMO_WORKAREA,
      '--write',
      '--area',
      'suite'
    ])

    expect(run.exitCode).toBe(2)
  })
})

describe('tim distil merge-reconcile', () => {
  test("checks one area's file and writes nothing", async () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)
    await runTim(['areas', DEMO_WORKAREA, '--write'])
    workspace.writeJson(
      join(workspace.layout.areasDir, 'suite', 'reconciled.json'),
      reconciledFor(workspace, 'suite')
    )

    const run = await runTim([
      'merge-reconcile',
      DEMO_WORKAREA,
      '--area',
      'suite'
    ])

    expect(envelopeOf(run).result).toEqual({
      areas: [
        {
          id: 'suite',
          requirements: 2,
          newRequirements: 0,
          conflicts: 1,
          newConflicts: 0
        }
      ]
    })
  })

  test('exits 1 with LINT when an area has not been reconciled', async () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)
    await runTim(['areas', DEMO_WORKAREA, '--write'])

    const run = await runTim(['merge-reconcile', DEMO_WORKAREA])

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code
    }).toEqual({ exitCode: 1, code: 'LINT' })
  })
})

describe('tim distil challenge', () => {
  test('lists the question conflicts to challenge', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['challenge', DEMO_WORKAREA])

    expect(
      envelopeOf(run).result.questions.map((question) => question.id)
    ).toEqual(['c-002'])
  })

  test('checks one verdict', async () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(join(workspace.layout.challengeDir, 'c-002.json'), {
      conflict: 'c-002',
      verdict: 'question',
      rule: 'No ruling says how often the tiers run.',
      claims: ['dr5-060'],
      outcome: 'Tier 1 on every pull request.',
      why: 'The schedule is a cost the owner weighs.'
    })

    const run = await runTim([
      'challenge',
      DEMO_WORKAREA,
      '--conflict',
      'c-002'
    ])

    expect(envelopeOf(run).result).toMatchObject({
      conflict: 'c-002',
      verdict: 'question'
    })
  })
})

describe('tim distil merge-verify', () => {
  test('asks for a source', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['merge-verify', DEMO_WORKAREA])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      'Name a source with --source, such as repo:tests.'
    )
  })

  test('merges the parts and prints the counts', async () => {
    workspace = makeDistilWorkspace()
    const verifyPath = join(
      workspace.layout.verifyDir,
      'ruling-sam-2026-09-29c.json'
    )
    workspace.writeJson(
      join(workspace.layout.verifyDir, 'ruling-sam-2026-09-29c.part1.json'),
      workspace.readJson(verifyPath)
    )
    rmSync(verifyPath)

    const run = await runTim(
      ['merge-verify', DEMO_WORKAREA, '--source', 'ruling:sam-2026-09-29c'],
      { json: false }
    )

    expect(run.stdout.trim()).toBe(
      `Merged 1 part into ${verifyPath}: 1 verdict (1 held, 0 refuted), 0 missed.\nRemoved the part files.`
    )
  })
})

describe('tim distil working-set', () => {
  test('writes the working set with --write and prints its counts', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['working-set', DEMO_WORKAREA, '--write'])

    expect(envelopeOf(run).result).toMatchObject({
      path: workspace.layout.workingSet,
      total: 11,
      unavailable: []
    })
    expect(existsSync(workspace.layout.workingSet)).toBe(true)
  })
})

describe('tim distil coverage', () => {
  test('passes the demo workarea', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['coverage', DEMO_WORKAREA])

    expect(run.exitCode).toBe(0)
    expect(envelopeOf(run).result.backlog).toEqual({
      path: workspace.layout.backlog,
      increments: 2,
      covered: 4,
      coveredBySplitOff: 0,
      splitOff: []
    })
  })

  test('says which requirements a theme split off early covers, and what its branch has to pick up', async () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(workspace.layout.backlog, (backlog) => ({
      ...backlog,
      splitOff: [
        {
          theme: 'smoke-gate',
          title: 'The smoke run gates pull requests',
          touches: ['tests:k6/smoke'],
          dependsOn: [],
          branch: 'feat/NO_JIRA-demo-smoke-gate',
          workarea: `${DEMO_WORKAREA}/themes/smoke-gate`,
          backlog: 'themes/smoke-gate/backlog.json',
          increments: ['inc-002'],
          requirements: ['req-002'],
          pickUp: ['req-006'],
          at: '2026-10-09T12:00:00.000Z'
        }
      ],
      increments: [{ ...backlog.increments[0], requirements: ['req-001'] }]
    }))

    const run = await runTim(['coverage', DEMO_WORKAREA], { json: false })

    expect(run.stdout).toContain(
      '1 increments cover 1 requirements.\n2 more requirements are covered by 1 theme split off early, each built on its own branch:\n  smoke-gate on feat/NO_JIRA-demo-smoke-gate. For that branch: to pick up, adopted since the split: req-006'
    )
  })
})

describe('tim distil coverage, refusing', () => {
  test('groups each problem by the step that fixes it', async () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(workspace.layout.requirements, (file) => ({
      requirements: file.requirements.map((requirement) =>
        requirement.id === 'req-003'
          ? { ...requirement, claims: ['tests-010'] }
          : requirement
      )
    }))
    workspace.editJson(workspace.layout.backlog, (backlog) => ({
      ...backlog,
      increments: backlog.increments.map((increment) =>
        increment.id === 'inc-001'
          ? { ...increment, requirements: ['req-001'] }
          : increment
      )
    }))

    const run = await runTim(['coverage', DEMO_WORKAREA])

    expect(run.exitCode).toBe(1)
    expect(envelopeOf(run).errors[0].problems).toEqual([
      {
        scope: 'reconcile',
        message:
          'req-003 cites tests-010, which verification refuted. Cite a claim that held.'
      },
      {
        scope: 'backlog',
        message: 'req-006 is adopted as new but sits in no increment.'
      }
    ])
  })
})

describe('tim distil check --clear-parts', () => {
  test('lists the part files it removed', async () => {
    workspace = makeDistilWorkspace()
    const part = join(workspace.layout.verifyDir, 'repo-tests.part1.json')
    workspace.writeJson(part, {})

    const run = await runTim([
      'check',
      DEMO_WORKAREA,
      '--source',
      'repo:tests',
      '--stage',
      'extract',
      '--clear-parts'
    ])

    expect(envelopeOf(run).result.removedParts).toEqual([part])
    expect(existsSync(part)).toBe(false)
  })
})

describe('tim distil adopt', () => {
  test('records both hashes for a source distilled by hand', async () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(
      join(workspace.layout.extractDir, 'repo-tests.json'),
      ({ scopeHash, ...extract }) => extract
    )
    workspace.editJson(
      join(workspace.layout.verifyDir, 'repo-tests.json'),
      ({ extractHash, ...verify }) => verify
    )

    const run = await runTim(
      ['adopt', DEMO_WORKAREA, '--source', 'repo:tests'],
      { json: false }
    )

    expect(run.stdout.trim().split('\n')).toEqual([
      `Recorded the scope hash in ${join(workspace.layout.extractDir, 'repo-tests.json')}.`,
      `Recorded the extract hash in ${join(workspace.layout.verifyDir, 'repo-tests.json')}.`,
      'repo:tests is now verified.'
    ])
  })
})

describe('tim distil backlog-snapshot', () => {
  test('saves a snapshot, then reports a removed row against it', async () => {
    workspace = makeDistilWorkspace()
    await runTim(['backlog-snapshot', DEMO_WORKAREA, '--save', 'before'])
    workspace.editJson(workspace.layout.backlog, (backlog) => ({
      ...backlog,
      increments: backlog.increments.slice(0, 1)
    }))

    const run = await runTim([
      'backlog-snapshot',
      DEMO_WORKAREA,
      '--compare-to',
      'before'
    ])

    expect(envelopeOf(run).result.compared).toEqual({
      tag: 'before',
      removed: ['inc-002'],
      changed: [],
      splitOffChanged: []
    })
  })

  test('refuses a tag with a folder in it', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim([
      'backlog-snapshot',
      DEMO_WORKAREA,
      '--save',
      '../x'
    ])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      'A snapshot tag is lower-case letters, digits and hyphens, such as before or after-1.'
    )
  })
})

describe('tim distil trace', () => {
  test('passes everything after -- to playwright trace, including a -- of its own', async () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(workspace.layout.sources, (sources) => ({
      ...sources,
      sources: [
        ...sources.sources,
        {
          id: 'trace:journey',
          kind: 'trace',
          locator: 'traces/',
          scope: 'every trace',
          role: 'what the service does today'
        }
      ],
      precedence: [...sources.precedence, 'trace:journey']
    }))

    const run = await execa(
      'node',
      [
        cliPath,
        'distil',
        'trace',
        DEMO_WORKAREA,
        '--source',
        'trace:journey',
        '--workspace',
        workspace.root,
        '--json',
        '--',
        'snapshot',
        '1',
        '--',
        'eval',
        'document.title'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(envelopeOf(run).errors[0].message).toMatch(
      /^playwright trace snapshot 1 -- eval document\.title failed with exit 1, using Playwright [0-9.]+ \(tim\): /
    )
  })
})

describe('tim distil stamp', () => {
  test('says when the extract already has the current hash', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(
      ['stamp', DEMO_WORKAREA, '--source', 'repo:tests'],
      { json: false }
    )

    expect(run.stdout.trim()).toMatch(
      /already has scope hash [0-9a-f]{64}\. Nothing written\.$/
    )
  })
})
