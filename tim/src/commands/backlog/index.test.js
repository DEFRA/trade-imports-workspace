import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const fixtureAtomsDir = join(
  here,
  '..',
  '..',
  'backlog',
  '__fixtures__',
  'fixture-requirements',
  'distil',
  'atoms'
)

const runTim = (args, workspaceRoot) =>
  execa('node', [cliPath, ...args, '--workspace', workspaceRoot], {
    reject: false
  })

let workspace

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

const writeCorpora = (body) => {
  mkdirSync(join(workspace, 'tools', 'parity'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'parity', 'corpora.json'),
    JSON.stringify(body)
  )
}

const copyFixtureAtoms = (destDir) => {
  mkdirSync(destDir, { recursive: true })
  for (const name of [
    'alpha--second.json',
    'alpha--third.json',
    'beta--first.json'
  ]) {
    writeFileSync(
      join(destDir, name),
      readFileSync(join(fixtureAtomsDir, name))
    )
  }
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-backlog-cli-'))
  seedWorkspaceRoot()
  writeCorpora({ default: 'nowhere', corpora: {} })
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim backlog registry', () => {
  test('list --json lists every registered programme with its key, profile and workarea', async () => {
    writeRegistry({
      programmes: {
        'not-a-ticket-id': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/not-a-ticket-id'
        }
      }
    })

    const { stdout, exitCode } = await runTim(
      ['backlog', 'registry', 'list', '--json'],
      workspace
    )

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.programmes).toEqual([
      {
        key: 'not-a-ticket-id',
        profile: 'requirements-v2',
        workarea: 'workareas/shared/not-a-ticket-id'
      }
    ])
  })

  test("show fixture-requirements --json prints that programme's paths", async () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/fixture-requirements'
        }
      }
    })

    const { stdout, exitCode } = await runTim(
      ['backlog', 'registry', 'show', 'fixture-requirements', '--json'],
      workspace
    )

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.profile).toBe('requirements-v2')
    expect(payload.result.paths.workarea).toContain('fixture-requirements')
    expect(payload.result.paths.backlog).toContain('backlog.json')
  })

  test('show nope --json exits 2 and names the known keys', async () => {
    writeRegistry({
      programmes: {
        somewhere: {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/somewhere'
        }
      }
    })

    const { stdout, exitCode } = await runTim(
      ['backlog', 'registry', 'show', 'nope', '--json'],
      workspace
    )

    expect(exitCode).toBe(2)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].message).toContain('somewhere')
  })
})

describe('tim backlog ingest', () => {
  test("ingests a fixture requirements-v2 programme found through the registry under a key that is not a ticket id, and writes backlog.json into that programme's workarea", async () => {
    const programmeDir = join(
      workspace,
      'workareas',
      'shared',
      'not-a-ticket-id'
    )
    copyFixtureAtoms(join(programmeDir, 'distil', 'atoms'))
    writeRegistry({
      programmes: {
        'not-a-ticket-id': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/not-a-ticket-id'
        }
      }
    })

    const { stdout, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--json'],
      workspace
    )

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.written).toBe(true)
    expect(payload.result.total).toBe(3)

    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    expect(written.requirements).toHaveLength(3)
  })

  test('re-ingests after an atom is inserted ahead: every existing id is unchanged, the new atom takes the next number, exit 0', async () => {
    const programmeDir = join(
      workspace,
      'workareas',
      'shared',
      'not-a-ticket-id'
    )
    const atomsDir = join(programmeDir, 'distil', 'atoms')
    copyFixtureAtoms(atomsDir)
    writeRegistry({
      programmes: {
        'not-a-ticket-id': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/not-a-ticket-id'
        }
      }
    })

    const first = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id'],
      workspace
    )
    expect(first.exitCode).toBe(0)
    const before = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    const beforeIds = Object.fromEntries(
      before.requirements.map((row) => [row.key, row.id])
    )

    writeFileSync(
      join(atomsDir, 'alpha--first.json'),
      JSON.stringify({
        key: 'alpha--first',
        slice: 'alpha',
        kind: 'capability',
        title: 'An atom that sorts ahead of the others',
        statement: 'The service MUST do a new thing.',
        why: 'Because the new thing matters.',
        acceptance: [
          {
            id: 'ac-1',
            text: 'Given the new thing, when it happens, then it is observed.',
            witness: 'e2e',
            confidence: 'stated',
            sources: ['s1'],
            scenario: null,
            resolvedBy: null
          }
        ],
        falsifiedBy: 'The new thing does not happen.',
        sources: [
          {
            id: 's1',
            source: 'sam-req',
            ref: 'line:1',
            quote: 'the new thing',
            readAt: {
              version: null,
              fetchedAt: '2026-09-21',
              seal: 'git-blob:y'
            },
            confidence: 'stated',
            role: 'requirement'
          }
        ],
        surface: { service: 's', area: 'a', repos: ['workspace'] }
      })
    )

    const { exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id'],
      workspace
    )

    expect(exitCode).toBe(0)
    const after = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    const afterByKey = Object.fromEntries(
      after.requirements.map((row) => [row.key, row.id])
    )
    expect(afterByKey['alpha--second']).toBe(beforeIds['alpha--second'])
    expect(afterByKey['alpha--third']).toBe(beforeIds['alpha--third'])
    expect(afterByKey['beta--first']).toBe(beforeIds['beta--first'])
    expect(afterByKey['alpha--first']).toBe('req-004')
  })

  test('an atom missing a required field: exit 1, and stderr names the file and the field', async () => {
    // Exit 1, not 2: a malformed authored item is a PARSE-coded refusal
    // (parity/profile-v1.js and backlog/profiles/requirements-v2.js both
    // raise PARSE for this, and D11 keeps the parity exit mapping —
    // USAGE/NOT_FOUND -> 2, everything else -> 1 — unchanged). Exit 2 is
    // reserved for a bad command line, such as an unknown programme key.
    const programmeDir = join(
      workspace,
      'workareas',
      'shared',
      'not-a-ticket-id'
    )
    const atomsDir = join(programmeDir, 'distil', 'atoms')
    mkdirSync(atomsDir, { recursive: true })
    writeFileSync(
      join(atomsDir, 'alpha--second.json'),
      JSON.stringify({ key: 'alpha--second', slice: 'alpha' })
    )
    writeRegistry({
      programmes: {
        'not-a-ticket-id': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/not-a-ticket-id'
        }
      }
    })

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id'],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain('alpha--second.json')
    expect(stderr).toContain('kind')
  })

  test('backlog ingest <parity key> --dry-run --json returns the same counts as parity ingest <runId> --dry-run --json (req-009 ac-1 across profiles)', async () => {
    writeCorpora({
      default: 'alpha',
      corpora: {
        alpha: {
          runId: 'RUN-1',
          backlog: 'workareas/journey-builder/RUN-1/backlog.json',
          workarea: 'workareas/shared/alpha',
          sides: [],
          repos: {}
        }
      }
    })
    mkdirSync(join(workspace, 'workareas', 'shared', 'alpha', 'findings'), {
      recursive: true
    })
    mkdirSync(join(workspace, 'tools', 'journey-builder'), { recursive: true })
    writeFileSync(
      join(workspace, 'tools', 'journey-builder', 'targets.json'),
      JSON.stringify({ default: 'fixture-target' })
    )

    const viaParity = await runTim(
      ['parity', 'ingest', 'RUN-1', '--dry-run', '--json'],
      workspace
    )
    const viaBacklog = await runTim(
      ['backlog', 'ingest', 'alpha', '--dry-run', '--json'],
      workspace
    )

    expect(viaParity.exitCode).toBe(0)
    expect(viaBacklog.exitCode).toBe(0)
    const parityResult = JSON.parse(viaParity.stdout.trim()).result
    const backlogResult = JSON.parse(viaBacklog.stdout.trim()).result
    expect(backlogResult).toEqual(parityResult)
  })

  test('without --json, prints each assigned item and where it wrote, and names any item that left the backlog', async () => {
    const programmeDir = join(
      workspace,
      'workareas',
      'shared',
      'not-a-ticket-id'
    )
    const atomsDir = join(programmeDir, 'distil', 'atoms')
    copyFixtureAtoms(atomsDir)
    writeRegistry({
      programmes: {
        'not-a-ticket-id': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/not-a-ticket-id'
        }
      }
    })

    const first = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id'],
      workspace
    )

    expect(first.exitCode).toBe(0)
    expect(first.stdout).toContain('3 items — 3 new, 0 refreshed.')
    expect(first.stdout).toContain('alpha--second.json')
    expect(first.stdout).toContain(
      `Written to ${join(programmeDir, 'backlog.json')}`
    )

    rmSync(join(atomsDir, 'beta--first.json'))
    const second = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id'],
      workspace
    )

    expect(second.exitCode).toBe(0)
    expect(second.stdout).toContain(
      '1 items left the backlog because their files are gone'
    )
    expect(second.stdout).toContain('req-003')
  })

  test('--replace renumbers every id from the sorted order, ignoring what a previous ingest assigned', async () => {
    const programmeDir = join(
      workspace,
      'workareas',
      'shared',
      'not-a-ticket-id'
    )
    const atomsDir = join(programmeDir, 'distil', 'atoms')
    copyFixtureAtoms(atomsDir)
    writeRegistry({
      programmes: {
        'not-a-ticket-id': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/not-a-ticket-id'
        }
      }
    })
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)

    writeFileSync(
      join(atomsDir, 'alpha--first.json'),
      JSON.stringify({
        key: 'alpha--first',
        slice: 'alpha',
        kind: 'capability',
        title: 'An atom that sorts ahead of the others',
        statement: 'The service MUST do a new thing.',
        why: 'Because the new thing matters.',
        acceptance: [
          {
            id: 'ac-1',
            text: 'Given the new thing, when it happens, then it is observed.',
            witness: 'e2e',
            confidence: 'stated',
            sources: ['s1'],
            scenario: null,
            resolvedBy: null
          }
        ],
        falsifiedBy: 'The new thing does not happen.',
        sources: [
          {
            id: 's1',
            source: 'sam-req',
            ref: 'line:1',
            quote: 'the new thing',
            readAt: {
              version: null,
              fetchedAt: '2026-09-21',
              seal: 'git-blob:y'
            },
            confidence: 'stated',
            role: 'requirement'
          }
        ],
        surface: { service: 's', area: 'a', repos: ['workspace'] }
      })
    )

    const { exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--replace'],
      workspace
    )

    expect(exitCode).toBe(0)
    const after = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    const afterByKey = Object.fromEntries(
      after.requirements.map((row) => [row.key, row.id])
    )
    expect(afterByKey['alpha--first']).toBe('req-001')
    expect(afterByKey['alpha--second']).toBe('req-002')
  })

  test('--target has no effect on a requirements-v2 backlog, which carries no target field', async () => {
    const programmeDir = join(
      workspace,
      'workareas',
      'shared',
      'not-a-ticket-id'
    )
    copyFixtureAtoms(join(programmeDir, 'distil', 'atoms'))
    writeRegistry({
      programmes: {
        'not-a-ticket-id': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/not-a-ticket-id'
        }
      }
    })

    const { exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--target', 'some-target'],
      workspace
    )

    expect(exitCode).toBe(0)
    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    expect(written.target).toBeUndefined()
  })

  test('--target round-trips into a parity-v1 backlog, overriding the build-loop target it would otherwise resolve', async () => {
    writeCorpora({
      default: 'alpha',
      corpora: {
        alpha: {
          runId: 'RUN-1',
          backlog: 'workareas/journey-builder/RUN-1/backlog.json',
          workarea: 'workareas/shared/alpha',
          sides: [],
          repos: {}
        }
      }
    })
    mkdirSync(join(workspace, 'workareas', 'shared', 'alpha', 'findings'), {
      recursive: true
    })

    const { exitCode } = await runTim(
      ['backlog', 'ingest', 'alpha', '--target', 'my-target'],
      workspace
    )

    expect(exitCode).toBe(0)
    const written = JSON.parse(
      readFileSync(
        join(
          workspace,
          'workareas',
          'journey-builder',
          'RUN-1',
          'backlog.json'
        ),
        'utf8'
      )
    )
    expect(written.target).toBe('my-target')
  })
})
