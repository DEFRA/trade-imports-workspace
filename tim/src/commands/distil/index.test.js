import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../../test-support/distil-workspace.js'

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
      '--stage must be one of: extract, verify, all.'
    )
  })

  test('refuses a chunk that is not a whole number above 0', async () => {
    workspace = makeDistilWorkspace()

    const run = await runTim(['check', DEMO_WORKAREA, '--chunk', '0'])

    expect(envelopeOf(run).errors[0].message).toBe(
      '--chunk must be a whole number above 0.'
    )
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
      covered: 4
    })
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
      changed: []
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
      /^playwright trace snapshot 1 -- eval document\.title failed with exit 1: /
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
