import { execaSync } from 'execa'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  StepFailed,
  hasTrackedChanges,
  lastLinesOf,
  repoCommands
} from './repo-commands.js'

const folders = []

afterEach(() => {
  folders
    .splice(0)
    .forEach((folder) => rmSync(folder, { recursive: true, force: true }))
})

const committedRepo = () => {
  const repo = mkdtempSync(join(tmpdir(), 'tim-repo-commands-'))
  folders.push(repo)
  const env = {
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.com',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.com',
    GIT_CONFIG_GLOBAL: '/dev/null'
  }
  writeFileSync(join(repo, 'package.json'), '{}\n')
  execaSync('git', ['init', '--quiet'], { cwd: repo, env })
  execaSync('git', ['add', '.'], { cwd: repo, env })
  execaSync('git', ['commit', '--quiet', '-m', 'Fixture'], { cwd: repo, env })
  return repo
}

describe('#lastLinesOf', () => {
  test('Should keep the last lines and the final newline', () => {
    expect(lastLinesOf('one\ntwo\nthree\n', 2)).toBe('two\nthree\n')
  })

  test('Should keep a last line that has no newline', () => {
    expect(lastLinesOf('one\ntwo\nthree', 2)).toBe('two\nthree')
  })

  test('Should give nothing for an empty log', () => {
    expect(lastLinesOf('', 5)).toBe('')
  })
})

describe('#hasTrackedChanges', () => {
  test('Should be false on a clean checkout with an untracked file', async () => {
    const repo = committedRepo()
    writeFileSync(join(repo, 'notes.txt'), 'untracked\n')

    expect(await hasTrackedChanges(repoCommands(), repo)).toBe(false)
  })

  test('Should be true when a tracked file has changed', async () => {
    const repo = committedRepo()
    writeFileSync(join(repo, 'package.json'), '{ "name": "changed" }\n')

    expect(await hasTrackedChanges(repoCommands(), repo)).toBe(true)
  })
})

describe('#repoCommands mustGit', () => {
  test('Should stop with git exit code when git fails', async () => {
    const repo = committedRepo()

    const failure = await repoCommands()
      .mustGit(repo, ['checkout', 'HEAD', '--', 'missing.json'])
      .catch((error) => error)

    expect(failure).toBeInstanceOf(StepFailed)
    expect(failure.exitCode).toBe(1)
  })
})
