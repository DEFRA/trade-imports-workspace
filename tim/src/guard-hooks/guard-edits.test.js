import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  allowed,
  deniedWith,
  guardEditsCommand,
  runGuardHook
} from '../test-support/guard-hook.js'

const HOOKS =
  'Blocked: files under .claude/hooks/ are the security guard scripts and are protected from agent edits. The user must change them directly.'

const permissionConfig = (fileName) =>
  `Blocked: ${fileName} is the Claude Code permission config and is protected from agent edits. If a change is genuinely intended, the user must make it directly (e.g. open it themselves or run via !), not the agent.`

let baseDir

beforeEach(() => {
  baseDir = realpathSync(mkdtempSync(join(tmpdir(), 'tim-guard-edits-')))
  mkdirSync(join(baseDir, '.claude', 'hooks'), { recursive: true })
})

afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true })
})

const editOf = (filePath, options) =>
  runGuardHook(
    guardEditsCommand,
    { tool_input: { file_path: filePath } },
    options
  )

describe('guard-edits', () => {
  test('allows a hook input with no file path', async () => {
    const result = await runGuardHook(guardEditsCommand, { tool_input: {} })

    expect(result).toEqual(allowed)
  })

  test.each(['settings.json', 'settings.local.json'])(
    'denies an edit to .claude/%s',
    async (fileName) => {
      expect(await editOf(join(baseDir, '.claude', fileName))).toEqual(
        deniedWith(permissionConfig(fileName))
      )
    }
  )

  test('denies an edit to a file under .claude/hooks/', async () => {
    expect(await editOf(join(baseDir, '.claude', 'hooks', 'guard.sh'))).toEqual(
      deniedWith(HOOKS)
    )
  })

  test('denies a new file under a .claude/hooks/ folder that does not exist', async () => {
    expect(await editOf('/no/such/place/.claude/hooks/new.sh')).toEqual(
      deniedWith(HOOKS)
    )
  })

  test('denies a NotebookEdit under .claude/hooks/', async () => {
    const result = await runGuardHook(guardEditsCommand, {
      tool_input: {
        notebook_path: join(baseDir, '.claude', 'hooks', 'n.ipynb')
      }
    })

    expect(result).toEqual(deniedWith(HOOKS))
  })

  test('expands a ~/ path against HOME', async () => {
    const result = await editOf('~/.claude/settings.json', {
      env: { HOME: baseDir }
    })

    expect(result).toEqual(deniedWith(permissionConfig('settings.json')))
  })

  test('denies an edit through a symlinked parent folder', async () => {
    symlinkSync(join(baseDir, '.claude'), join(baseDir, 'config-link'))

    expect(await editOf(join(baseDir, 'config-link', 'settings.json'))).toEqual(
      deniedWith(permissionConfig('settings.json'))
    )
  })

  test.each([
    'tim/src/cli.js',
    '.claude/skills/ticket/SKILL.md',
    '.claude/settings.json.bak',
    '.claude/rules/node.md'
  ])('allows an edit to %s', async (relativePath) => {
    expect(await editOf(join(baseDir, relativePath))).toEqual(allowed)
  })
})
