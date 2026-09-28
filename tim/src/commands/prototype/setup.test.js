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
import {
  PROTOTYPE_REPO,
  CLAUDE_LOCAL_MD,
  upsertDesignerNote,
  removeDesignerNote,
  runPrototypeSetup
} from './setup.js'
import {
  createBareRepo,
  createFatClone
} from '../../test-support/git-fixtures.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const fakeReadinessProbe = () =>
  Promise.resolve([
    { service: 'github', ok: true, user: { login: 'sam' } },
    {
      service: 'jira',
      ok: false,
      error: { code: 'USAGE', message: 'Set JIRA_USER and JIRA_TOKEN.' }
    }
  ])

describe('upsertDesignerNote', () => {
  test('writes the block into empty content', () => {
    const result = upsertDesignerNote('')
    expect(result).toContain('<!-- tim:designer-note start -->')
    expect(result).toContain('Route every request')
    expect(result).toContain('<!-- tim:designer-note end -->')
  })

  test('appends the block after existing content, keeping it', () => {
    const result = upsertDesignerNote('# My workspace notes\n\nSome text.\n')
    expect(result).toContain('# My workspace notes')
    expect(result).toContain('Some text.')
    expect(result).toContain('<!-- tim:designer-note start -->')
  })

  test('is a no-op on its own output — the block is not duplicated', () => {
    const once = upsertDesignerNote('# Notes\n')
    const twice = upsertDesignerNote(once)
    expect(twice).toBe(once)
    expect(twice.match(/tim:designer-note start/g)).toHaveLength(1)
  })
})

describe('removeDesignerNote', () => {
  test('removes the block and keeps everything else', () => {
    const withBlock = upsertDesignerNote('# Notes\n\nKeep this.\n')
    const removed = removeDesignerNote(withBlock)
    expect(removed).not.toContain('tim:designer-note')
    expect(removed).toContain('# Notes')
    expect(removed).toContain('Keep this.')
  })

  test('is a no-op when the block is not present', () => {
    expect(removeDesignerNote('# Notes\n')).toBe('# Notes\n')
  })
})

let workspace
let fixturesDir

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-prototype-setup-'))
  fixturesDir = mkdtempSync(join(tmpdir(), 'tim-prototype-setup-fixtures-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
  rmSync(fixturesDir, { recursive: true, force: true })
})

const seedNpmPkg = (dir) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: PROTOTYPE_REPO, version: '0.0.0' })
  )
  writeFileSync(
    join(dir, 'package-lock.json'),
    JSON.stringify({
      name: PROTOTYPE_REPO,
      version: '0.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: { '': { name: PROTOTYPE_REPO, version: '0.0.0' } }
    })
  )
}

describe('runPrototypeSetup', () => {
  test('writes the note and reports the prototype as not cloned when it has not been', async () => {
    const result = await runPrototypeSetup(workspace, {
      readinessProbe: fakeReadinessProbe
    })

    expect(result.ok).toBe(true)
    expect(result.note.changed).toBe(true)
    expect(readFileSync(join(workspace, CLAUDE_LOCAL_MD), 'utf8')).toContain(
      'tim:designer-note'
    )
    expect(result.upstream).toEqual({ status: 'not-cloned' })
    expect(result.install).toEqual([])
    expect(result.readiness).toEqual(await fakeReadinessProbe())
  })

  test('adds the upstream remote and installs when the prototype is cloned, then no-ops on a second run', async () => {
    const { barePath } = await createBareRepo(fixturesDir, PROTOTYPE_REPO, {
      withGhPages: false
    })
    const dir = join(workspace, 'repos', PROTOTYPE_REPO)
    await createFatClone(barePath, dir)
    seedNpmPkg(dir)

    const first = await runPrototypeSetup(workspace, {
      readinessProbe: fakeReadinessProbe
    })
    expect(first.ok).toBe(true)
    expect(first.upstream.status).toBe('added')
    expect(first.install).toHaveLength(1)
    expect(first.install[0].ok).toBe(true)

    const second = await runPrototypeSetup(workspace, {
      readinessProbe: fakeReadinessProbe
    })
    expect(second.upstream.status).toBe('already-set-up')
    expect(second.note.changed).toBe(false)
  }, 60_000)

  test('--remove removes the note and leaves upstream/install/readiness untouched', async () => {
    await runPrototypeSetup(workspace, { readinessProbe: fakeReadinessProbe })

    const result = await runPrototypeSetup(workspace, {
      remove: true,
      readinessProbe: fakeReadinessProbe
    })

    expect(result.ok).toBe(true)
    expect(result.note.removed).toBe(true)
    expect(result.upstream).toBeNull()
    expect(result.install).toBeNull()
    expect(
      readFileSync(join(workspace, CLAUDE_LOCAL_MD), 'utf8')
    ).not.toContain('tim:designer-note')
  })

  test('preserves other CLAUDE.local.md content that a designer already has', async () => {
    writeFileSync(
      join(workspace, CLAUDE_LOCAL_MD),
      '# My local notes\n\nDo not touch this.\n'
    )

    await runPrototypeSetup(workspace, { readinessProbe: fakeReadinessProbe })
    const afterAdd = readFileSync(join(workspace, CLAUDE_LOCAL_MD), 'utf8')
    expect(afterAdd).toContain('Do not touch this.')

    await runPrototypeSetup(workspace, {
      remove: true,
      readinessProbe: fakeReadinessProbe
    })
    const afterRemove = readFileSync(join(workspace, CLAUDE_LOCAL_MD), 'utf8')
    expect(afterRemove).toContain('Do not touch this.')
    expect(afterRemove).not.toContain('tim:designer-note')
  })
})

describe('tim prototype setup --help', () => {
  test('describes --remove in plain English', async () => {
    const { stdout } = await execa(
      'node',
      [cliPath, 'prototype', 'setup', '--help'],
      { reject: false }
    )
    expect(stdout).toContain('--remove')
    expect(stdout).toContain('CLAUDE.local.md')
  })
})
