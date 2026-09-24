import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execa } from 'execa'
import { printBaseline, advanceBaseline } from './baseline.js'

let root
let repoDir

const git = (dir, args) =>
  execa('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', ...args], {
    cwd: dir
  })

const gitInit = async (dir) => {
  await execa('git', ['init', '--quiet', '-b', 'main', dir])
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', '-m', 'initial'])
}

const commit = async (dir, message) => {
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', '-m', message])
}

const headSha = async (dir) =>
  (await execa('git', ['-C', dir, 'rev-parse', 'HEAD'])).stdout.trim()

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-baseline-'))
  repoDir = join(root, 'repos', 'trade-imports-x')
  mkdirSync(repoDir, { recursive: true })
  writeFileSync(join(repoDir, 'a.js'), 'x')
  await gitInit(repoDir)
  const oldRepoSha = await headSha(repoDir)

  mkdirSync(join(root, 'openspec'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'baseline.json'),
    JSON.stringify({
      verifiedAt: '2026-09-01',
      verifiedBy: 'oldsha01',
      repos: { 'trade-imports-x': oldRepoSha }
    })
  )
  await gitInit(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('printBaseline', () => {
  test('reads the current baseline unchanged', () => {
    expect(printBaseline(root)).toMatchObject({
      verifiedAt: '2026-09-01',
      verifiedBy: 'oldsha01'
    })
  })
})

describe('advanceBaseline', () => {
  test('moves a repo whose HEAD moved on to its new sha', async () => {
    writeFileSync(join(repoDir, 'a.js'), 'y')
    await commit(repoDir, 'a later commit')
    const newSha = await headSha(repoDir)

    const { after } = await advanceBaseline({ workspaceRoot: root })

    expect(after.repos['trade-imports-x']).toBe(newSha)
  })

  test('sets verifiedAt to today and verifiedBy to the workspace HEAD, short', async () => {
    const workspaceSha = await headSha(root)

    const { after } = await advanceBaseline({ workspaceRoot: root })

    expect(after.verifiedAt).toBe(new Date().toISOString().slice(0, 10))
    expect(after.verifiedBy).toBe(workspaceSha.slice(0, 8))
  })

  test('writes the new baseline to disk', async () => {
    const { path, after } = await advanceBaseline({ workspaceRoot: root })

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(after)
  })

  test('is idempotent: running it twice with nothing landed writes the same result', async () => {
    const first = await advanceBaseline({ workspaceRoot: root })
    const second = await advanceBaseline({ workspaceRoot: root })

    expect(second.after).toEqual(first.after)
  })

  test('keeps the previous sha for a repo that is not cloned', async () => {
    rmSync(repoDir, { recursive: true, force: true })

    const { after } = await advanceBaseline({ workspaceRoot: root })

    expect(after.repos['trade-imports-x']).toMatch(/^[0-9a-f]{40}$/)
  })

  test('--require-ruled refuses when there is no catch-up run', async () => {
    await expect(
      advanceBaseline({ workspaceRoot: root, requireRuled: true })
    ).rejects.toThrow(/Run spec-catchup first/)
  })

  test('--require-ruled advances after a fully settled catch-up run', async () => {
    const runDir = join(root, 'workareas', 'spec-catchup', '2026-09-24')
    mkdirSync(runDir, { recursive: true })
    writeFileSync(
      join(runDir, 'findings.json'),
      JSON.stringify({
        skill: 'catchup',
        date: '2026-09-24',
        baseline: { verifiedAt: '2026-09-01', verifiedBy: 'oldsha01' },
        findings: [
          {
            id: 'F-001',
            verdict: 'stale-link',
            capability: 'x',
            judgement: 'The behaviour is unchanged and only the test moved.',
            disposition: 'accept',
            status: 'applied'
          }
        ],
        noActionBucket: {
          capabilities: 0,
          disposition: null,
          status: 'pending'
        }
      })
    )

    const { after, ruledRun } = await advanceBaseline({
      workspaceRoot: root,
      requireRuled: true
    })

    expect(after.verifiedAt).toBe(new Date().toISOString().slice(0, 10))
    expect(ruledRun).toBe(runDir)
  })
})
