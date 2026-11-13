import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { autoPullWorkspace } from './auto-pull.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', 'cli.js')

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=tim-test@example.invalid'
]

const git = (cwd, ...args) => execa('git', [...IDENTITY, ...args], { cwd })

let baseDir
let upstream
let workspace

const headSha = async (dir) => {
  const { stdout } = await git(dir, 'rev-parse', '--short', 'HEAD')
  return stdout.trim()
}

const pushUpstreamCommit = async (fileName) => {
  writeFileSync(join(upstream, fileName), `${fileName}\n`)
  await git(upstream, 'add', fileName)
  await git(upstream, 'commit', '--quiet', '-m', `add ${fileName}`)
  await git(upstream, 'push', '--quiet', 'origin', 'main')
}

beforeEach(async () => {
  baseDir = mkdtempSync(join(tmpdir(), 'tim-autopull-'))
  upstream = join(baseDir, 'upstream')
  workspace = join(baseDir, 'workspace')
  const bare = join(baseDir, 'origin.git')

  await execa('git', ['init', '--quiet', '-b', 'main', upstream])
  mkdirSync(join(upstream, 'repos'), { recursive: true })
  writeFileSync(join(upstream, 'repos', '.gitkeep'), '')
  await git(upstream, 'add', '.')
  await git(upstream, 'commit', '--quiet', '-m', 'initial commit')
  await execa('git', ['clone', '--quiet', '--bare', upstream, bare])
  await git(upstream, 'remote', 'add', 'origin', bare)
  await execa('git', ['clone', '--quiet', `file://${bare}`, workspace])
})

afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true })
})

const collectNotes = () => {
  const notes = []
  return { notes, warn: (message) => notes.push(message) }
}

describe('autoPullWorkspace', () => {
  test('fast-forwards the workspace when it is on main and behind', async () => {
    await pushUpstreamCommit('new-file.txt')
    const before = await headSha(workspace)
    const { warn } = collectNotes()

    const result = await autoPullWorkspace({ workspaceRoot: workspace, warn })

    expect(result.action).toBe('updated')
    expect(await headSha(workspace)).toBe(await headSha(upstream))
    expect(await headSha(workspace)).not.toBe(before)
  }, 30_000)

  test('names the old and new revision in the update note', async () => {
    await pushUpstreamCommit('new-file.txt')
    const before = await headSha(workspace)
    const { notes, warn } = collectNotes()

    await autoPullWorkspace({ workspaceRoot: workspace, warn })

    expect(notes).toEqual([
      `Workspace updated: ${before} → ${await headSha(workspace)}`
    ])
  }, 30_000)

  test('reports up-to-date and says nothing when there is no new commit', async () => {
    const { notes, warn } = collectNotes()

    const result = await autoPullWorkspace({ workspaceRoot: workspace, warn })

    expect(result.action).toBe('up-to-date')
    expect(notes).toEqual([])
  }, 30_000)

  test('leaves the workspace untouched on any branch other than main', async () => {
    await pushUpstreamCommit('new-file.txt')
    await git(workspace, 'switch', '--quiet', '-c', 'spike/wip')
    const before = await headSha(workspace)
    const { warn } = collectNotes()

    const result = await autoPullWorkspace({ workspaceRoot: workspace, warn })

    expect(result).toMatchObject({
      action: 'skipped-branch',
      branch: 'spike/wip'
    })
    expect(await headSha(workspace)).toBe(before)
  }, 30_000)

  test('does nothing when TIM_NO_AUTO_PULL is set', async () => {
    await pushUpstreamCommit('new-file.txt')
    const before = await headSha(workspace)
    const { warn } = collectNotes()

    const result = await autoPullWorkspace({
      workspaceRoot: workspace,
      warn,
      env: { TIM_NO_AUTO_PULL: '1' }
    })

    expect(result.action).toBe('disabled')
    expect(await headSha(workspace)).toBe(before)
  }, 30_000)

  test('reports a failure rather than throwing when the remote is gone', async () => {
    await git(workspace, 'remote', 'remove', 'origin')
    const { notes, warn } = collectNotes()

    const result = await autoPullWorkspace({ workspaceRoot: workspace, warn })

    expect(result.action).toBe('failed')
    expect(notes[0]).toMatch(/Could not update the workspace/)
  }, 30_000)

  test('refuses to move a branch that has diverged from its upstream', async () => {
    await pushUpstreamCommit('theirs.txt')
    writeFileSync(join(workspace, 'mine.txt'), 'mine\n')
    await git(workspace, 'add', 'mine.txt')
    await git(workspace, 'commit', '--quiet', '-m', 'local work')
    const before = await headSha(workspace)
    const { warn } = collectNotes()

    const result = await autoPullWorkspace({ workspaceRoot: workspace, warn })

    expect(result.action).toBe('failed')
    expect(await headSha(workspace)).toBe(before)
  }, 30_000)
})

describe('tim CLI auto-pull', () => {
  test('updates the workspace before running the command', async () => {
    await pushUpstreamCommit('new-file.txt')

    await execa('node', [cliPath, 'hello', '--workspace', workspace], {
      reject: false
    })

    expect(await headSha(workspace)).toBe(await headSha(upstream))
  }, 30_000)

  test('keeps --json stdout parseable and puts the note on stderr', async () => {
    await pushUpstreamCommit('new-file.txt')

    const { stdout, stderr } = await execa(
      'node',
      [cliPath, 'hello', '--workspace', workspace, '--json'],
      { reject: false }
    )

    expect(JSON.parse(stdout.trim()).ok).toBe(true)
    expect(stderr).toMatch(/Workspace updated/)
  }, 30_000)

  test('runs the command even when the workspace cannot be updated', async () => {
    await git(workspace, 'remote', 'remove', 'origin')

    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'hello', '--workspace', workspace],
      { reject: false }
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain('Hello from tim')
  }, 30_000)

  test('runs commands that need no workspace at all', async () => {
    const { stdout, exitCode } = await execa('node', [cliPath, 'hello'], {
      reject: false,
      cwd: tmpdir(),
      env: { TIM_WORKSPACE: '', TIM_NO_AUTO_PULL: '1' }
    })

    expect(exitCode).toBe(0)
    expect(stdout).toContain('Hello from tim')
  }, 30_000)
})
