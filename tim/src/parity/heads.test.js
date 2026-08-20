import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { run } from '../exec/exec.js'
import {
  headOf,
  compareHeads,
  runHeads,
  renderHeads,
  headsPath
} from './heads.js'

let root
let workarea

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-heads-'))
  workarea = join(root, 'workarea')
  mkdirSync(workarea, { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const makeRepo = async (name) => {
  const path = join(root, name)
  mkdirSync(path, { recursive: true })
  await run('git', ['-C', path, 'init', '--initial-branch', 'main'])
  await run('git', ['-C', path, 'config', 'user.email', 'test@example.com'])
  await run('git', ['-C', path, 'config', 'user.name', 'Test'])
  writeFileSync(join(path, 'a.txt'), 'one')
  await run('git', ['-C', path, 'add', '.'])
  await run('git', ['-C', path, 'commit', '-m', 'one'])
  return path
}

const commitTo = async (path, text) => {
  writeFileSync(join(path, 'a.txt'), text)
  await run('git', ['-C', path, 'add', '.'])
  await run('git', ['-C', path, 'commit', '-m', text])
}

const profileFor = (repos) => ({
  id: 'test-corpus',
  runId: 'EUDPA-999',
  repos,
  paths: { workarea }
})

describe('headOf', () => {
  test('reads the sha and branch of a real checkout', async () => {
    const path = await makeRepo('frontend')

    const head = await headOf(path)

    expect(head.found).toBe(true)
    expect(head.sha).toMatch(/^[0-9a-f]{40}$/)
    expect([head.branch, head.dirty]).toEqual(['main', false])
  })

  test('reports an uncommitted change as dirty rather than refusing', async () => {
    const path = await makeRepo('frontend')
    writeFileSync(join(path, 'a.txt'), 'edited')

    expect((await headOf(path)).dirty).toBe(true)
  })

  test('says a directory is not a checkout rather than reporting no movement', async () => {
    const path = join(root, 'plain')
    mkdirSync(path)

    const head = await headOf(path)

    expect(head.found).toBe(false)
    expect(head.why).toContain('not a git checkout')
  })

  test('says so when the path does not exist at all', async () => {
    expect((await headOf(join(root, 'absent'))).why).toContain('No checkout at')
  })
})

describe('compareHeads', () => {
  const recorded = {
    frontend: { sha: 'a'.repeat(40), dirty: false },
    prototype: { sha: 'b'.repeat(40), dirty: false }
  }

  test('names the repo that moved, and both shas', () => {
    const result = compareHeads({
      recorded,
      current: {
        frontend: { sha: 'c'.repeat(40), dirty: false },
        prototype: { sha: 'b'.repeat(40), dirty: false }
      }
    })

    expect(result.map((entry) => [entry.repo, entry.verdict])).toEqual([
      ['frontend', 'moved'],
      ['prototype', 'same']
    ])
    expect(result[0].why).toContain('describe different trees')
  })

  test('a worktree that has become dirty is its own verdict, not a move', () => {
    const result = compareHeads({
      recorded,
      current: {
        frontend: { sha: 'a'.repeat(40), dirty: true },
        prototype: { sha: 'b'.repeat(40), dirty: false }
      }
    })

    expect(result[0].verdict).toBe('dirty')
    expect(result[0].why).toContain('the moment somebody commits')
  })

  test('a worktree already dirty when recorded is not reported again', () => {
    const result = compareHeads({
      recorded: { frontend: { sha: 'a'.repeat(40), dirty: true } },
      current: { frontend: { sha: 'a'.repeat(40), dirty: true } }
    })

    expect(result[0].verdict).toBe('same')
  })

  test('a repo nobody recorded is unrecorded rather than unchanged', () => {
    const result = compareHeads({
      recorded: {},
      current: { backend: { sha: 'd'.repeat(40), dirty: false } }
    })

    expect(result[0].verdict).toBe('unrecorded')
    expect(result[0].why).toContain('never recorded')
  })
})

describe('runHeads', () => {
  test('records every repo the comparison reads, not only the two compared', async () => {
    const profile = profileFor({
      frontend: { absolutePath: await makeRepo('frontend') },
      prototype: { absolutePath: await makeRepo('prototype') },
      backend: { absolutePath: await makeRepo('backend') }
    })

    const result = await runHeads({ profile, write: true })

    expect(result.written).toBe(true)
    expect(result.repos.map((entry) => entry.repo)).toEqual([
      'backend',
      'frontend',
      'prototype'
    ])
  })

  test('refuses to re-record over a run in progress, and says what that would erase', async () => {
    const profile = profileFor({
      frontend: { absolutePath: await makeRepo('frontend') }
    })
    await runHeads({ profile, write: true })

    await expect(runHeads({ profile, write: true })).rejects.toThrow(
      /erase the only evidence that anything moved/
    )
  })

  test('--force starts the clock again', async () => {
    const profile = profileFor({
      frontend: { absolutePath: await makeRepo('frontend') }
    })
    await runHeads({ profile, write: true })

    expect(
      (await runHeads({ profile, write: true, force: true })).written
    ).toBe(true)
  })

  test('catches a commit made to an application while the run was open', async () => {
    const path = await makeRepo('frontend')
    const profile = profileFor({ frontend: { absolutePath: path } })
    await runHeads({ profile, write: true })

    await commitTo(path, 'two')
    const result = await runHeads({ profile })

    expect([result.steady, result.moved]).toEqual([false, ['frontend']])
  })

  test('reports a still application as steady', async () => {
    const profile = profileFor({
      frontend: { absolutePath: await makeRepo('frontend') }
    })
    await runHeads({ profile, write: true })

    expect((await runHeads({ profile })).steady).toBe(true)
  })

  test('says a run never recorded anything rather than calling it steady', async () => {
    const profile = profileFor({
      frontend: { absolutePath: await makeRepo('frontend') }
    })

    const result = await runHeads({ profile })

    expect([result.neverRecorded, result.steady]).toEqual([true, false])
    expect(headsPath(profile)).toBe(join(workarea, 'run-heads.json'))
  })
})

describe('renderHeads', () => {
  test('tells the reader when to run it again', async () => {
    const profile = profileFor({
      frontend: { absolutePath: await makeRepo('frontend') }
    })

    const text = renderHeads(await runHeads({ profile, write: true }))

    expect(text).toContain('before the ingest and before the report')
  })

  test('a move is not a reason to re-run everything, and says so', async () => {
    const path = await makeRepo('frontend')
    const profile = profileFor({ frontend: { absolutePath: path } })
    await runHeads({ profile, write: true })
    await commitTo(path, 'two')

    const text = renderHeads(await runHeads({ profile }))

    expect(text).toContain('not a reason to re-run everything')
  })

  test('an unrecorded run is told what it can no longer know', async () => {
    const profile = profileFor({
      frontend: { absolutePath: await makeRepo('frontend') }
    })

    const text = renderHeads(await runHeads({ profile }))

    expect(text).toContain('may already describe different trees')
  })
})
