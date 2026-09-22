import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  rmSync,
  realpathSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir, hostname } from 'node:os'
import { projectSlug } from '../../backlog/standards/claude-chain.js'
import { sha256File } from '../../backlog/io.js'

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

const resultOf = (run) => JSON.parse(run.stdout.trim()).result

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

const adoptEveryAtom = (programmeDir) => {
  const backlogPath = join(programmeDir, 'backlog.json')
  const currentBacklog = JSON.parse(readFileSync(backlogPath, 'utf8'))
  const adopted = {
    ...currentBacklog,
    requirements: currentBacklog.requirements.map((row) => ({
      ...row,
      status: 'adopted'
    }))
  }
  writeFileSync(backlogPath, JSON.stringify(adopted))
}

const writeIncrement = (programmeDir, key, body) => {
  const incrementsDir = join(programmeDir, 'distil', 'increments')
  mkdirSync(incrementsDir, { recursive: true })
  writeFileSync(
    join(incrementsDir, `${key}.json`),
    JSON.stringify({
      key,
      title: 'An increment',
      outcome: 'Something true when done.',
      why: 'Why it ships.',
      members: ['alpha--second'],
      class: 'feat',
      milestone: null,
      checkpoint: null,
      size: { class: 'S', basis: '1 criterion, 1 atom' },
      combination: { why: 'One reason.', rules: [] },
      ...body
    })
  )
}

const seedParityCorpus = () => {
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
}

const writeState = (programmeDir, body) => {
  const buildDir = join(programmeDir, 'build')
  mkdirSync(buildDir, { recursive: true })
  writeFileSync(join(buildDir, 'state.json'), JSON.stringify(body))
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
    seedParityCorpus()
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
    const parityResult = resultOf(viaParity)
    const backlogResult = resultOf(viaBacklog)
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
    seedParityCorpus()

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

const trackedFixtureDir = join(fixtureAtomsDir, '..', '..')

describe('tim backlog ingest --atoms / --increments (D2, D27)', () => {
  const registerTrackedFixture = () =>
    writeRegistry({
      programmes: {
        'fixture-requirements': {
          profile: 'requirements-v2',
          workarea: trackedFixtureDir
        }
      }
    })

  const seedProgramme = () => {
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
    return programmeDir
  }

  test('--increments --dry-run --json over the tracked fixture: exit 0, collection increments, two assignments, written false', async () => {
    registerTrackedFixture()
    const { stdout, exitCode } = await runTim(
      [
        'backlog',
        'ingest',
        'fixture-requirements',
        '--increments',
        '--dry-run',
        '--json'
      ],
      workspace
    )

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.collection).toBe('increments')
    expect(payload.result.total).toBe(2)
    expect(payload.result.written).toBe(false)
  })

  test('--atoms given explicitly: exit 0, collection atoms, the same counts as the flagless run', async () => {
    registerTrackedFixture()
    const { stdout, exitCode } = await runTim(
      [
        'backlog',
        'ingest',
        'fixture-requirements',
        '--atoms',
        '--dry-run',
        '--json'
      ],
      workspace
    )

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.collection).toBe('atoms')
    expect(payload.result.total).toBe(3)
  })

  test('both flags at once: exit 2, stderr naming the two flags', async () => {
    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'fixture-requirements', '--atoms', '--increments'],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toContain('--atoms')
    expect(stderr).toContain('--increments')
  })

  test('--atoms on a parity-v1 programme: exit 2, stderr naming findings', async () => {
    seedParityCorpus()

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'alpha', '--atoms'],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toContain('findings')
  })

  test('req-010 ac-1: an authored increment carrying filesToTouch: exit 1, stderr matching filesToTouch and plan owns files', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'core-and-registry', {
      filesToTouch: ['a.js']
    })

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/filesToTouch/)
    expect(stderr).toMatch(/plan owns files/)
  })

  test('req-010 ac-2: an authored increment carrying executor: exit 1, stderr matching executor and build/run.json', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'core-and-registry', { executor: 'codex' })

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/executor/)
    expect(stderr).toMatch(/build\/run\.json/)
  })

  // req-011 ac-1's witness (D27) is the existing "re-ingests after an atom
  // is inserted ahead" case above, unchanged — no new case needed here.

  test('req-012 ac-1: two authored increments naming each other in dependsOn: exit 2, stderr naming both keys, no increments key written', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'a', {
      members: ['alpha--second'],
      dependsOn: ['b']
    })
    writeIncrement(programmeDir, 'b', {
      members: ['alpha--third'],
      dependsOn: ['a']
    })

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toMatch(/a/)
    expect(stderr).toMatch(/b/)
    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    expect(written.increments).toBeUndefined()
  })

  test('req-013 ac-1: three atoms adopted, one increment claiming two: exit 0, membership covered === adopted, a solo row written', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    adoptEveryAtom(programmeDir)
    writeIncrement(programmeDir, 'core-and-registry', {
      members: ['alpha--second', 'alpha--third']
    })

    const { stdout, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments', '--json'],
      workspace
    )

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.membership).toEqual({
      adopted: 3,
      covered: 3,
      solo: 1,
      combined: 1
    })
    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    const solo = written.increments.find((row) => row.key.startsWith('solo--'))
    expect(solo.key).toBe('solo--beta--first')
    expect(solo.title).toBeUndefined()
    expect(solo.outcome).toBeUndefined()
  })

  test('req-014 ac-1: a started increment left out by a re-combine: exit 2, stderr naming the key, the row still in backlog.json', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'core-and-registry')
    await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )
    writeState(programmeDir, {
      increments: { 'inc-001': { attempts: [{ n: 1 }] } }
    })
    rmSync(join(programmeDir, 'distil', 'increments', 'core-and-registry.json'))

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toContain('core-and-registry')
    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    expect(written.increments).toHaveLength(1)
  })

  test('the same removal with no state.json: exit 0, the row is gone', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'core-and-registry')
    await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )
    rmSync(join(programmeDir, 'distil', 'increments', 'core-and-registry.json'))

    const { exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(0)
    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    expect(written.increments).toHaveLength(0)
  })

  test('a backlog.json hand-edited to add executor to an atom row: exit 1, stderr naming executor and build/run.json, the file unchanged (D8, D26)', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    const backlogPath = join(programmeDir, 'backlog.json')
    const held = JSON.parse(readFileSync(backlogPath, 'utf8'))
    held.requirements[0] = { ...held.requirements[0], executor: 'codex' }
    writeFileSync(backlogPath, JSON.stringify(held))
    const before = readFileSync(backlogPath, 'utf8')

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id'],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain('executor')
    expect(stderr).toContain('build/run.json')
    expect(readFileSync(backlogPath, 'utf8')).toBe(before)
  })

  test('an authored increment with members: ["req-999"] over the three fixture atoms: exit 1, stderr naming the file, members and req-999', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'core-and-registry', { members: ['req-999'] })

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain('core-and-registry.json')
    expect(stderr).toContain('members')
    expect(stderr).toContain('req-999')
    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    expect(written.increments).toBeUndefined()
  })

  test('the regroup guard through the CLI: a started increment losing a member: exit 2, stderr naming its key and id, backlog.json unchanged', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'core-and-registry', {
      members: ['alpha--second', 'alpha--third']
    })
    await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )
    writeState(programmeDir, {
      increments: { 'inc-001': { attempts: [{ n: 1 }] } }
    })
    writeIncrement(programmeDir, 'core-and-registry', {
      members: ['alpha--second']
    })
    const before = readFileSync(join(programmeDir, 'backlog.json'), 'utf8')

    const { stderr, exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toContain('core-and-registry')
    expect(stderr).toContain('inc-001')
    expect(readFileSync(join(programmeDir, 'backlog.json'), 'utf8')).toBe(
      before
    )
  })

  test('the same edit with no state.json: exit 0, the smaller members is written under the same id', async () => {
    const programmeDir = seedProgramme()
    await runTim(['backlog', 'ingest', 'not-a-ticket-id'], workspace)
    writeIncrement(programmeDir, 'core-and-registry', {
      members: ['alpha--second', 'alpha--third']
    })
    await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )
    writeIncrement(programmeDir, 'core-and-registry', {
      members: ['alpha--second']
    })

    const { exitCode } = await runTim(
      ['backlog', 'ingest', 'not-a-ticket-id', '--increments'],
      workspace
    )

    expect(exitCode).toBe(0)
    const written = JSON.parse(
      readFileSync(join(programmeDir, 'backlog.json'), 'utf8')
    )
    expect(written.increments[0].id).toBe('inc-001')
    expect(written.increments[0].members).toHaveLength(1)
  })
})

describe('tim backlog standards', () => {
  const writeStandardsFile = (relPath, content = '// file\n') => {
    const abs = join(workspace, relPath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }

  const writeJson = (relPath, value) =>
    writeStandardsFile(relPath, JSON.stringify(value))

  /**
   * Rules, docs and both routing files — the minimum every `tim backlog
   * standards` test builds on. `node` and `java` topics/technologies so a
   * two-repo, two-language run (S-8) needs no bespoke routing of its own.
   */
  const seedStandardsWorkspace = () => {
    writeFileSync(join(workspace, 'CLAUDE.md'), '# Root\n')
    writeJson('.claude/skills/code-style/assets/routing.json', {
      schemaVersion: 1,
      patternSyntax: 'shell-case',
      fileTopics: [
        { patterns: ['*.js'], topics: ['node'] },
        { patterns: ['*.java'], topics: ['java'] }
      ],
      topics: {
        node: { bestPractice: ['docs/best-practices/node/style.md'] },
        java: { bestPractice: ['docs/best-practices/java/style.md'] }
      },
      unknownTopicHint: 'node|java'
    })
    writeJson('.claude/skills/review/assets/routing.json', {
      schemaVersion: 1,
      manifestDirs: ['service', 'app', 'src'],
      technologies: [
        {
          name: 'hapi',
          when: {
            fileContains: { file: 'package.json', pattern: '"@hapi/hapi"' }
          },
          bestPractice: ['docs/best-practices/node/style.md']
        },
        {
          name: 'springboot',
          when: {
            fileContains: { file: 'pom.xml', pattern: 'spring-boot' }
          },
          bestPractice: ['docs/best-practices/java/style.md']
        }
      ]
    })
    writeStandardsFile('docs/best-practices/node/style.md', 'hello\n')
    writeStandardsFile('docs/best-practices/java/style.md', 'Java style.\n')
    mkdirSync(join(workspace, '.claude', 'rules'), { recursive: true })
    writeFileSync(
      join(workspace, '.claude', 'rules', 'node.md'),
      [
        '---',
        'paths:',
        "  - '**/*.js'",
        '---',
        '',
        '- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/node/`',
        '- Key files: `style.md`.',
        ''
      ].join('\n')
    )
  }

  test('S-1 req-040 ac-1: a new rule is picked up with no code change', async () => {
    seedStandardsWorkspace()
    writeStandardsFile('db/q.sql')

    const before = await runTim(
      ['backlog', 'standards', '--files', 'workspace:db/q.sql', '--json'],
      workspace
    )

    expect(resultOf(before).files[0].rules).toEqual([])

    writeStandardsFile('docs/best-practices/sql/style.md', 'SQL style.\n')
    writeFileSync(
      join(workspace, '.claude', 'rules', 'sql.md'),
      [
        '---',
        'paths:',
        "  - '**/*.sql'",
        '---',
        '',
        '- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/sql/`',
        '- Key files: `style.md`.',
        ''
      ].join('\n')
    )

    const after = await runTim(
      ['backlog', 'standards', '--files', 'workspace:db/q.sql', '--json'],
      workspace
    )
    const afterResult = resultOf(after)

    expect(afterResult.files[0].rules.map((r) => r.path)).toEqual([
      '.claude/rules/sql.md'
    ])
    expect(afterResult.files[0].rules[0].pointsTo).toEqual([
      'docs/best-practices/sql/style.md'
    ])
  })

  test('S-2 req-041 ac-1: --lint exits 1 and names the rule and the missing file', async () => {
    seedStandardsWorkspace()
    rmSync(join(workspace, 'docs', 'best-practices', 'node', 'style.md'))

    const { stderr, exitCode } = await runTim(
      ['backlog', 'standards', '--lint'],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain('.claude/rules/node.md')
    expect(stderr).toContain('docs/best-practices/node/style.md')
  })

  test('S-3 --lint --json: ok:false, code LINT, naming both', async () => {
    seedStandardsWorkspace()
    rmSync(join(workspace, 'docs', 'best-practices', 'node', 'style.md'))

    const { stdout, exitCode } = await runTim(
      ['backlog', 'standards', '--lint', '--json'],
      workspace
    )

    expect(exitCode).toBe(1)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].code).toBe('LINT')
    expect(payload.errors[0].message).toContain('.claude/rules/node.md')
    expect(payload.errors[0].message).toContain(
      'docs/best-practices/node/style.md'
    )
  })

  test('S-4 resolving a matching file with a dead pointer exits 1 without --lint', async () => {
    seedStandardsWorkspace()
    rmSync(join(workspace, 'docs', 'best-practices', 'node', 'style.md'))
    writeStandardsFile('a.js')

    const { stderr, exitCode } = await runTim(
      ['backlog', 'standards', '--files', 'workspace:a.js'],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain('.claude/rules/node.md')
    expect(stderr).toContain('docs/best-practices/node/style.md')
  })

  test('S-5 a clean workspace lints clean', async () => {
    seedStandardsWorkspace()

    const run = await runTim(
      ['backlog', 'standards', '--lint', '--json'],
      workspace
    )

    expect(run.exitCode).toBe(0)
    expect(resultOf(run).lint.problems).toEqual([])
  })

  test('S-6 req-042 ac-1: the chain, its imports and the memory index are listed', async () => {
    seedStandardsWorkspace()
    writeFileSync(
      join(workspace, 'CLAUDE.md'),
      '# Root\n@docs/best-practices/node/style.md\n'
    )
    mkdirSync(join(workspace, 'pkg'), { recursive: true })
    writeFileSync(join(workspace, 'pkg', 'CLAUDE.md'), '# Pkg\n')
    writeStandardsFile('pkg/src/a.js')

    const claudeConfigDir = join(workspace, '.claude-config-6')
    const realWorkspace = realpathSync(workspace)
    const memoryPath = join(
      claudeConfigDir,
      'projects',
      projectSlug(realWorkspace),
      'memory',
      'MEMORY.md'
    )
    mkdirSync(dirname(memoryPath), { recursive: true })
    writeFileSync(memoryPath, '# Memory\n')

    const run = await execa(
      'node',
      [
        cliPath,
        'backlog',
        'standards',
        '--files',
        'workspace:pkg/src/a.js',
        '--json',
        '--workspace',
        workspace
      ],
      {
        env: { ...process.env, CLAUDE_CONFIG_DIR: claudeConfigDir },
        reject: false
      }
    )

    expect(run.exitCode).toBe(0)
    const [entry] = resultOf(run).files
    expect(entry.claudeMd).toEqual(['CLAUDE.md', 'pkg/CLAUDE.md'])
    expect(entry.imports).toEqual(['docs/best-practices/node/style.md'])
    expect(entry.memory).toEqual([memoryPath])
    expect(Object.keys(entry.shas)).toEqual(
      expect.arrayContaining([memoryPath])
    )
  })

  test('S-7 req-043 ac-1: a new topic in the code-style routing is picked up with no code change', async () => {
    seedStandardsWorkspace()
    writeStandardsFile('db/q.sql')

    const before = await runTim(
      ['backlog', 'standards', '--files', 'workspace:db/q.sql', '--json'],
      workspace
    )

    expect(resultOf(before).files[0].topics).toEqual([])

    const routingPath = join(
      workspace,
      '.claude',
      'skills',
      'code-style',
      'assets',
      'routing.json'
    )
    const routing = JSON.parse(readFileSync(routingPath, 'utf8'))
    routing.fileTopics.push({ patterns: ['*.sql'], topics: ['sql'] })
    routing.topics.sql = { bestPractice: ['docs/best-practices/sql/style.md'] }
    writeFileSync(routingPath, JSON.stringify(routing))
    writeStandardsFile('docs/best-practices/sql/style.md', 'SQL.\n')

    const after = await runTim(
      ['backlog', 'standards', '--files', 'workspace:db/q.sql', '--json'],
      workspace
    )
    const afterResult = resultOf(after)

    expect(afterResult.files[0].topics).toEqual(['sql'])
    expect(afterResult.files[0].bestPractice).toEqual([
      'docs/best-practices/sql/style.md'
    ])
    expect(afterResult.standards.map((s) => s.path)).toEqual(
      expect.arrayContaining(['docs/best-practices/sql/style.md'])
    )
  })

  test('S-8 req-043 ac-2: two repos through --programme, every path hashed', async () => {
    seedStandardsWorkspace()
    writeRegistry({
      programmes: {
        'two-repo': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/two-repo'
        }
      }
    })
    writeJson('workareas/shared/two-repo/backlog.json', {
      repos: { web: { path: 'repos/web' }, api: { path: 'repos/api' } }
    })
    writeStandardsFile('repos/web/src/a.js')
    writeJson('repos/web/package.json', {
      dependencies: { '@hapi/hapi': '^21.0.0' }
    })
    writeStandardsFile('repos/api/src/B.java')
    writeStandardsFile(
      'repos/api/pom.xml',
      '<project><dependency>spring-boot-starter</dependency></project>\n'
    )

    const run = await runTim(
      [
        'backlog',
        'standards',
        '--programme',
        'two-repo',
        '--files',
        'web:src/a.js',
        '--files',
        'api:src/B.java',
        '--repo-level',
        'web',
        '--repo-level',
        'api',
        '--json'
      ],
      workspace
    )

    expect(run.exitCode).toBe(0)
    const result = resultOf(run)

    expect(result.files.map((f) => f.topics)).toEqual([['node'], ['java']])
    const web = result.repos.find((r) => r.repoKey === 'web')
    const api = result.repos.find((r) => r.repoKey === 'api')
    expect(web.technologies).toEqual(['hapi'])
    expect(api.technologies).toEqual(['springboot'])

    for (const entry of [...result.files, ...result.repos]) {
      for (const sha of Object.values(entry.shas)) {
        expect(sha).toMatch(/^[0-9a-f]{40}$/)
      }
    }
    expect(
      result.standards.find(
        (s) => s.path === 'docs/best-practices/node/style.md'
      ).sha
    ).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })

  test('S-9 req-122 ac-2: succeeds with PATH empty, proving no subprocess routing step', async () => {
    seedStandardsWorkspace()
    writeStandardsFile('a.js')
    const claudeConfigDir = join(workspace, '.claude-config-9')
    const isolatedHome = join(workspace, '.home-9')
    mkdirSync(isolatedHome, { recursive: true })

    const result = await execa(
      process.execPath,
      [
        cliPath,
        'backlog',
        'standards',
        '--files',
        'workspace:a.js',
        '--json',
        '--workspace',
        workspace
      ],
      {
        env: {
          PATH: '',
          HOME: isolatedHome,
          CLAUDE_CONFIG_DIR: claudeConfigDir
        },
        extendEnv: false,
        reject: false
      }
    )

    expect(result.exitCode).toBe(0)
    const payload = resultOf(result)

    for (const entry of payload.standards) {
      expect(entry.sha).toMatch(/^[0-9a-f]{40}$/)
    }
  })

  test('S-10 no --files, --repo-level or --lint exits 2, naming the flags', async () => {
    seedStandardsWorkspace()

    const { stderr, exitCode } = await runTim(
      ['backlog', 'standards'],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toContain(
      'Name at least one file with --files, a repo with --repo-level, or run --lint.'
    )
  })

  test('S-11 a malformed --files spec exits 2, naming it', async () => {
    seedStandardsWorkspace()

    const noColon = await runTim(
      ['backlog', 'standards', '--files', 'nocolon'],
      workspace
    )

    expect(noColon.exitCode).toBe(2)
    expect(noColon.stderr).toContain('nocolon')

    const escaping = await runTim(
      ['backlog', 'standards', '--files', 'workspace:../x.js'],
      workspace
    )

    expect(escaping.exitCode).toBe(2)
    expect(escaping.stderr).toContain('workspace:../x.js')
  })

  test('S-12 an unknown repo key exits 2; a backlog naming no repos exits 2 NOT_FOUND', async () => {
    seedStandardsWorkspace()

    const unknown = await runTim(
      ['backlog', 'standards', '--files', 'nope:a.js'],
      workspace
    )

    expect(unknown.exitCode).toBe(2)
    expect(unknown.stderr).toContain('nope')

    writeRegistry({
      programmes: {
        'no-repos': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/no-repos'
        }
      }
    })
    writeJson('workareas/shared/no-repos/backlog.json', {})

    const noRepos = await runTim(
      [
        'backlog',
        'standards',
        '--programme',
        'no-repos',
        '--files',
        'web:a.js'
      ],
      workspace
    )

    expect(noRepos.exitCode).toBe(2)
  })
})

describe('tim backlog ingest --op-id / --expect-sha, and tim backlog state (req-015, req-016, req-023)', () => {
  const programmeKey = 'write-safety'
  let programmeDir

  const seedProgramme = () => {
    programmeDir = join(workspace, 'workareas', 'shared', programmeKey)
    copyFixtureAtoms(join(programmeDir, 'distil', 'atoms'))
    writeRegistry({
      programmes: {
        [programmeKey]: {
          profile: 'requirements-v2',
          workarea: `workareas/shared/${programmeKey}`
        }
      }
    })
  }

  const addAtom = (name) =>
    writeFileSync(
      join(programmeDir, 'distil', 'atoms', name),
      JSON.stringify({
        key: name.replace('.json', ''),
        slice: 'gamma',
        kind: 'capability',
        title: 'A new requirement',
        statement: 'The service MUST do a new thing.',
        why: 'Because the new thing matters.',
        acceptance: [
          {
            id: 'ac-1',
            text: 'Given a thing, when it happens, then it is observed.',
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
              seal: 'git-blob:z'
            },
            confidence: 'stated',
            role: 'requirement'
          }
        ],
        surface: { service: 's', area: 'a', repos: ['workspace'] }
      })
    )

  const writeMinimalIncrement = () => {
    const incrementsDir = join(programmeDir, 'distil', 'increments')
    mkdirSync(incrementsDir, { recursive: true })
    writeFileSync(
      join(incrementsDir, 'core.json'),
      JSON.stringify({
        key: 'core',
        title: 'An increment',
        outcome: 'Something true when done.',
        why: 'Why it ships.',
        members: ['alpha--second'],
        class: 'feat',
        milestone: null,
        checkpoint: null,
        size: { class: 'S', basis: '1 criterion, 1 atom' },
        combination: { why: 'One reason.', rules: [] }
      })
    )
  }

  const seedWithIncrement = async () => {
    seedProgramme()
    await runTim(['backlog', 'ingest', programmeKey], workspace)
    writeMinimalIncrement()
    await runTim(['backlog', 'ingest', programmeKey, '--increments'], workspace)
  }

  test('E1 req-015 e2e, concurrent: two racing ingest --expect-sha S0 --json processes give exits [0, 3], the loser LOST_UPDATE, and the winner sha differs from S0', async () => {
    seedProgramme()
    await runTim(['backlog', 'ingest', programmeKey], workspace)
    const backlogPath = join(programmeDir, 'backlog.json')
    const baselineSha = sha256File(backlogPath)
    // A racer that reads the same baseline sha must produce different bytes
    // from it, or both racers would see current === baseline and both
    // succeed.
    addAtom('gamma--first.json')

    const [racerOne, racerTwo] = await Promise.all([
      execa(
        'node',
        [
          cliPath,
          'backlog',
          'ingest',
          programmeKey,
          '--expect-sha',
          baselineSha,
          '--json',
          '--workspace',
          workspace
        ],
        { reject: false }
      ),
      execa(
        'node',
        [
          cliPath,
          'backlog',
          'ingest',
          programmeKey,
          '--expect-sha',
          baselineSha,
          '--json',
          '--workspace',
          workspace
        ],
        { reject: false }
      )
    ])

    expect([racerOne.exitCode, racerTwo.exitCode].sort()).toEqual([0, 3])
    const winner = racerOne.exitCode === 0 ? racerOne : racerTwo
    const loser = racerOne.exitCode === 0 ? racerTwo : racerOne
    const winnerResult = resultOf(winner)
    const loserErrors = JSON.parse(loser.stdout.trim()).errors
    expect(loserErrors[0].code).toBe('LOST_UPDATE')
    expect(winnerResult.sha256).not.toBe(baselineSha)
    expect(sha256File(backlogPath)).toBe(winnerResult.sha256)
  })

  test('E2 req-015 e2e, sequential: a second write against the same, now-stale --expect-sha exits 3, and the bytes are unchanged from the first write', async () => {
    seedProgramme()
    await runTim(['backlog', 'ingest', programmeKey], workspace)
    const backlogPath = join(programmeDir, 'backlog.json')
    const baselineSha = sha256File(backlogPath)
    addAtom('gamma--first.json')

    const first = await runTim(
      [
        'backlog',
        'ingest',
        programmeKey,
        '--expect-sha',
        baselineSha,
        '--json'
      ],
      workspace
    )
    expect(first.exitCode).toBe(0)
    const afterFirst = readFileSync(backlogPath, 'utf8')

    const second = await runTim(
      [
        'backlog',
        'ingest',
        programmeKey,
        '--expect-sha',
        baselineSha,
        '--json'
      ],
      workspace
    )

    expect(second.exitCode).toBe(3)
    expect(JSON.parse(second.stdout.trim()).errors[0].code).toBe('LOST_UPDATE')
    expect(readFileSync(backlogPath, 'utf8')).toBe(afterFirst)
  })

  test('E3 req-016 e2e: state note, replayed, gives one journal line, one ops entry and an equal result', async () => {
    await seedWithIncrement()
    const notePath = join(workspace, 'note.txt')
    writeFileSync(notePath, 'Started the increment.')

    const first = await runTim(
      [
        'backlog',
        'state',
        'note',
        programmeKey,
        'inc-001',
        '--file',
        notePath,
        '--op-id',
        'r1:inc-001:1:plan:t1:note',
        '--json'
      ],
      workspace
    )
    expect(first.exitCode).toBe(0)

    const replay = await runTim(
      [
        'backlog',
        'state',
        'note',
        programmeKey,
        'inc-001',
        '--file',
        notePath,
        '--op-id',
        'r1:inc-001:1:plan:t1:note',
        '--json'
      ],
      workspace
    )

    expect(replay.exitCode).toBe(0)
    expect(resultOf(replay)).toEqual(resultOf(first))
    expect(
      readFileSync(join(programmeDir, 'build', 'journal.jsonl'), 'utf8')
        .trim()
        .split('\n')
    ).toHaveLength(1)
    expect(
      readFileSync(join(programmeDir, '.backlog-ops.jsonl'), 'utf8')
        .trim()
        .split('\n')
    ).toHaveLength(1)
  })

  test('E4 req-016 e2e: replaying state set op A after op B leaves phase as implement, and the output equals As first result', async () => {
    await seedWithIncrement()

    const opASet = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"plan"',
        '--op-id',
        'op-a',
        '--json'
      ],
      workspace
    )
    await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"implement"',
        '--op-id',
        'op-b',
        '--json'
      ],
      workspace
    )

    const replayA = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"plan"',
        '--op-id',
        'op-a',
        '--json'
      ],
      workspace
    )

    expect(replayA.exitCode).toBe(0)
    expect(resultOf(replayA)).toEqual(resultOf(opASet))
    const state = JSON.parse(
      readFileSync(join(programmeDir, 'build', 'state.json'), 'utf8')
    )
    expect(state.increments['inc-001'].phase).toBe('implement')
  })

  test('E5 req-016 e2e: an ingest --op-id replay after adding an atom leaves the bytes unchanged and prints an equal result', async () => {
    seedProgramme()
    const backlogPath = join(programmeDir, 'backlog.json')

    const first = await runTim(
      ['backlog', 'ingest', programmeKey, '--op-id', 'ingest-op-1', '--json'],
      workspace
    )
    const afterFirst = readFileSync(backlogPath, 'utf8')

    addAtom('gamma--first.json')
    const replay = await runTim(
      ['backlog', 'ingest', programmeKey, '--op-id', 'ingest-op-1', '--json'],
      workspace
    )

    expect(replay.exitCode).toBe(0)
    expect(resultOf(replay)).toEqual(resultOf(first))
    expect(readFileSync(backlogPath, 'utf8')).toBe(afterFirst)
  })

  test('E6 req-023 e2e: a bad heads sha over an existing state exits 1 with PARSE, naming the path, and the state and build/ folder are otherwise untouched', async () => {
    await seedWithIncrement()
    await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"plan"'
      ],
      workspace
    )
    const statePath = join(programmeDir, 'build', 'state.json')
    const before = readFileSync(statePath, 'utf8')

    const { stdout, exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'heads',
        '--value',
        '{"workspace":{"sha":"nope","branch":"b","dirty":false}}',
        '--json'
      ],
      workspace
    )

    expect(exitCode).toBe(1)
    const payload = JSON.parse(stdout.trim())
    expect(payload.errors[0].code).toBe('PARSE')
    expect(payload.errors[0].message).toContain(statePath)
    expect(readFileSync(statePath, 'utf8')).toBe(before)
    expect(readdirSync(join(programmeDir, 'build'))).toEqual(['state.json'])
  })

  test('E7 req-023 e2e: the same bad value with no state file exits 1 and creates no build/ folder', async () => {
    await seedWithIncrement()

    const { exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'heads',
        '--value',
        '{"workspace":{"sha":"nope","branch":"b","dirty":false}}',
        '--json'
      ],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(existsSync(join(programmeDir, 'build'))).toBe(false)
  })

  test('E8 req-023 e2e: a hand-edited unknown key in state makes state set phase exit 1, and the file is unchanged', async () => {
    await seedWithIncrement()
    const buildDir = join(programmeDir, 'build')
    mkdirSync(buildDir, { recursive: true })
    const statePath = join(buildDir, 'state.json')
    writeFileSync(
      statePath,
      JSON.stringify({ increments: { 'inc-001': { phse: 'plan' } } })
    )
    const before = readFileSync(statePath, 'utf8')

    const { exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"plan"'
      ],
      workspace
    )

    expect(exitCode).toBe(1)
    expect(readFileSync(statePath, 'utf8')).toBe(before)
  })

  test('E9 D7: distil/atoms as a file gives one JSON line, ok:false, code UNKNOWN, exit 1', async () => {
    const badProgrammeDir = join(
      workspace,
      'workareas',
      'shared',
      'atoms-is-a-file'
    )
    mkdirSync(join(badProgrammeDir, 'distil'), { recursive: true })
    writeFileSync(join(badProgrammeDir, 'distil', 'atoms'), 'not a directory')
    writeRegistry({
      programmes: {
        'atoms-is-a-file': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/atoms-is-a-file'
        }
      }
    })

    const { stdout, exitCode } = await runTim(
      ['backlog', 'ingest', 'atoms-is-a-file', '--json'],
      workspace
    )

    const lines = stdout.trim().split('\n')
    expect(lines).toHaveLength(1)
    const payload = JSON.parse(lines[0])
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].code).toBe('UNKNOWN')
    expect(exitCode).toBe(1)
  })

  test('E10 LOCKED e2e: a lock planted with this process and host makes state set --json exit 4 with code LOCKED, and no state.json is written', async () => {
    await seedWithIncrement()
    const buildDir = join(programmeDir, 'build')
    mkdirSync(buildDir, { recursive: true })
    writeFileSync(
      join(buildDir, '.state.lock'),
      JSON.stringify({
        pid: process.pid,
        host: hostname(),
        command: 'holder',
        at: new Date().toISOString()
      })
    )

    const { stdout, exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"plan"',
        '--json'
      ],
      workspace
    )

    expect(exitCode).toBe(4)
    const payload = JSON.parse(stdout.trim())
    expect(payload.errors[0].code).toBe('LOCKED')
    expect(existsSync(join(buildDir, 'state.json'))).toBe(false)
  })

  test('E11a usage refusal: an unknown field exits 2, naming the allowed fields, with nothing written', async () => {
    await seedWithIncrement()

    const { exitCode, stderr } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'bogus',
        '--value',
        '"x"'
      ],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toContain('phase')
    expect(existsSync(join(programmeDir, 'build', 'state.json'))).toBe(false)
  })

  test('E11b usage refusal: a bad --value exits 2 with nothing written', async () => {
    await seedWithIncrement()

    const { exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        'not-json'
      ],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(existsSync(join(programmeDir, 'build', 'state.json'))).toBe(false)
  })

  test('E11c usage refusal: a bad --op-id exits 2 with nothing written', async () => {
    await seedWithIncrement()

    const { exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"plan"',
        '--op-id',
        'has space'
      ],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(existsSync(join(programmeDir, 'build', 'state.json'))).toBe(false)
  })

  test('E11d usage refusal: a bad --expect-sha exits 2 with nothing written', async () => {
    await seedWithIncrement()

    const { exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'inc-001',
        'phase',
        '--value',
        '"plan"',
        '--expect-sha',
        'abc'
      ],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(existsSync(join(programmeDir, 'build', 'state.json'))).toBe(false)
  })

  test('E11e usage refusal: ingest --dry-run --op-id exits 2', async () => {
    await seedWithIncrement()

    const { exitCode, stderr } = await runTim(
      ['backlog', 'ingest', programmeKey, '--dry-run', '--op-id', 'x'],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(stderr).toContain('dry run')
  })

  test('E11f usage refusal: a malformed <id> positional on state set exits 2 with nothing written', async () => {
    await seedWithIncrement()

    const { exitCode } = await runTim(
      [
        'backlog',
        'state',
        'set',
        programmeKey,
        'not-an-id',
        'phase',
        '--value',
        '"plan"'
      ],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(existsSync(join(programmeDir, 'build', 'state.json'))).toBe(false)
  })

  test("E11g usage refusal: state note's --file naming a missing path exits 2 with NOT_FOUND, naming the path, with nothing written", async () => {
    await seedWithIncrement()

    const { exitCode, stdout } = await runTim(
      [
        'backlog',
        'state',
        'note',
        programmeKey,
        'inc-001',
        '--file',
        join(workspace, 'no-such-note.txt'),
        '--json'
      ],
      workspace
    )

    expect(exitCode).toBe(2)
    const payload = JSON.parse(stdout.trim())
    expect(payload.errors[0].code).toBe('NOT_FOUND')
    expect(payload.errors[0].message).toContain('no-such-note.txt')
    expect(existsSync(join(programmeDir, 'build', 'journal.jsonl'))).toBe(false)
  })

  test('E12: state set on a parity-v1 corpus key exits 2 with USAGE', async () => {
    seedParityCorpus()

    const { exitCode, stdout } = await runTim(
      [
        'backlog',
        'state',
        'set',
        'alpha',
        'inc-001',
        'phase',
        '--value',
        '"plan"',
        '--json'
      ],
      workspace
    )

    expect(exitCode).toBe(2)
    expect(JSON.parse(stdout.trim()).errors[0].code).toBe('USAGE')
  })
})
