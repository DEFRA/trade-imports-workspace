import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { createRepo } from '../__fixtures__/push-check.js'
import { removeNewUntracked, untrackedPaths } from './artefacts.js'

const env = { PATH: process.env.PATH, HOME: tmpdir() }

const inRepo = async (act) => {
  const home = mkdtempSync(join(tmpdir(), 'tim-artefacts-'))
  try {
    return await act(await createRepo(join(home, 'service')), home)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
}

describe('#untrackedPaths', () => {
  test('lists the untracked paths and not the changed or ignored ones', () =>
    inRepo(async (repo) => {
      writeFileSync(join(repo, 'README.md'), '# changed\n')
      writeFileSync(join(repo, 'notes.txt'), 'mine\n')
      mkdirSync(join(repo, '.cache'))
      writeFileSync(join(repo, '.cache', 'log'), 'ignored\n')
      mkdirSync(join(repo, 'report'))
      writeFileSync(join(repo, 'report', 'a.txt'), 'new\n')

      const paths = await untrackedPaths(repo, env)

      expect(paths).toEqual(['notes.txt', 'report/'])
    }))

  test('is empty outside a repo', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'tim-artefacts-'))

    const paths = await untrackedPaths(folder, env)
    rmSync(folder, { recursive: true, force: true })

    expect(paths).toEqual([])
  })
})

describe('#removeNewUntracked', () => {
  test('deletes only the untracked paths that were not there before', () =>
    inRepo(async (repo) => {
      writeFileSync(join(repo, 'notes.txt'), 'mine\n')
      const before = await untrackedPaths(repo, env)
      writeFileSync(join(repo, 'lint-cache.json'), '{}\n')
      mkdirSync(join(repo, '.scannerwork'))
      writeFileSync(join(repo, '.scannerwork', 'task.txt'), 'task\n')
      writeFileSync(join(repo, 'README.md'), '# changed\n')

      const removed = await removeNewUntracked(repo, before, env)

      expect({
        removed,
        left: [
          'notes.txt',
          'lint-cache.json',
          '.scannerwork',
          'README.md'
        ].filter((path) => existsSync(join(repo, path)))
      }).toEqual({
        removed: ['.scannerwork/', 'lint-cache.json'],
        left: ['notes.txt', 'README.md']
      })
    }))

  test('never deletes a path that climbs out of the repo', () =>
    inRepo(async (repo) => {
      writeFileSync(join(repo, 'a..b'), 'dots\n')

      const removed = await removeNewUntracked(repo, [], env)

      expect({ removed, kept: existsSync(join(repo, 'a..b')) }).toEqual({
        removed: [],
        kept: true
      })
    }))
})
