import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { hookPushOf, isGitPush, pushFolderOf } from './hook-input.js'

describe('#isGitPush', () => {
  test.each([
    ['git push', true],
    ['git push -u origin feat/x', true],
    ['cd repo\ngit push', true],
    ['git -C repos/x push', true],
    ['git -C "~/x" push', true],
    ['git --work-tree=x push', true],
    ['git -c push.default=current push', true],
    ['git -C x push\n', true],
    ['echo "git push"', true],
    ['git status', false],
    ['gitpush', false],
    ['git pushx', true],
    ['mygit -C x push', false],
    ['git -C x pushy', false],
    ['', false]
  ])('%j is a push: %s', (command, expected) => {
    expect(isGitPush(command)).toBe(expected)
  })
})

describe('#pushFolderOf', () => {
  const where = { cwd: '/work', home: '/home/me' }

  test.each([
    ['git push', '/work'],
    ['git -C /repos/x push', '/repos/x'],
    ['git -C repos/x push', '/work/repos/x'],
    ['git -C "repos/x" push', '/work/repos/x'],
    ["git -C 'repos/x' push", '/work/repos/x'],
    ['git -C ~/x push', '/home/me/x'],
    ['git -C "~/x" push', '/home/me/x'],
    ['git --work-tree=x push', '/work/x'],
    ['git --git-dir=/repos/x/.git push', '/repos/x/.git'],
    ['git -C /a --work-tree=/b push', '/a']
  ])('%j works in %s', (command, folder) => {
    expect(pushFolderOf(command, where)).toBe(folder)
  })
})

describe('#hookPushOf', () => {
  const withFolder = (assert) => {
    const folder = mkdtempSync(join(tmpdir(), 'tim-hook-input-'))
    try {
      assert(folder)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  }

  test('gives the command and folder of a push', () =>
    withFolder((folder) => {
      const input = JSON.stringify({
        tool_input: { command: 'git push' },
        cwd: folder
      })

      expect(hookPushOf(input)).toEqual({ command: 'git push', cwd: folder })
    }))

  test.each([
    ['a command that does not push', { command: 'git status' }, 'folder'],
    ['a push with no folder', { command: 'git push' }, ''],
    ['a push from a folder that is gone', { command: 'git push' }, 'gone'],
    ['a command that is not text', { command: 7 }, 'folder']
  ])('is null for %s', (_title, toolInput, cwdKind) =>
    withFolder((folder) => {
      const cwd = { folder, '': '', gone: join(folder, 'gone') }[cwdKind]

      expect(hookPushOf(JSON.stringify({ tool_input: toolInput, cwd }))).toBe(
        null
      )
    })
  )

  test.each(['git push', 'null', '[]', ''])(
    'is null for input %j that is not a hook call',
    (input) => {
      expect(hookPushOf(input)).toBe(null)
    }
  )
})
