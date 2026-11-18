import { statSync } from 'node:fs'

const SPACE = '[ \\t\\n\\v\\f\\r]'
const NOT_SPACE = '[^ \\t\\n\\v\\f\\r]'

const GIT_WITH_OPTIONS_THEN_PUSH = new RegExp(
  `(^|[^A-Za-z0-9_./-])git(${SPACE}+${NOT_SPACE}+)*${SPACE}+push(${SPACE}|$)`
)
const GIT_C_FOLDER = new RegExp(`git${SPACE}+-C${SPACE}+(${NOT_SPACE}+)`)
const GIT_DIR_OR_WORK_TREE_FOLDER = new RegExp(
  `--(?:git-dir|work-tree)=(${NOT_SPACE}+)`
)

/**
 * Whether a shell command pushes with git: `git push` anywhere in it, or
 * `git` followed by options and then `push`, such as `git -C <path> push`.
 * Loose on purpose, so an `echo` that mentions `git push` counts too.
 *
 * @param {string} command
 * @returns {boolean}
 */
export const isGitPush = (command) =>
  command.includes('git push') || GIT_WITH_OPTIONS_THEN_PUSH.test(command)

const stripOne = (text, quote) => {
  const withoutEnd = text.endsWith(quote) ? text.slice(0, -1) : text
  return withoutEnd.startsWith(quote) ? withoutEnd.slice(1) : withoutEnd
}

const namedFolderIn = (command) =>
  command.match(GIT_C_FOLDER)?.[1] ??
  command.match(GIT_DIR_OR_WORK_TREE_FOLDER)?.[1]

const absoluteFolder = (folder, { cwd, home }) => {
  if (folder.startsWith('~/')) return `${home}/${folder.slice(2)}`
  if (folder.startsWith('/')) return folder
  return `${cwd}/${folder}`
}

/**
 * The folder a push command works in, before it is narrowed to its repo:
 * the path after `git -C`, else after `--git-dir=` or `--work-tree=`, else
 * `cwd`. One pair of wrapping quotes is dropped, `~/` is `home`, and a
 * relative path is taken from `cwd`.
 *
 * @param {string} command
 * @param {object} where
 * @param {string} where.cwd - the shell's folder when the command runs
 * @param {string} where.home
 * @returns {string}
 */
export const pushFolderOf = (command, { cwd, home }) => {
  const named = namedFolderIn(command) ?? cwd
  const unquoted = stripOne(stripOne(named, '"'), "'")
  return absoluteFolder(unquoted, { cwd, home })
}

const stringOrEmpty = (value) => (typeof value === 'string' ? value : '')

const parsedOrEmpty = (input) => {
  try {
    return JSON.parse(input) ?? {}
  } catch {
    return {}
  }
}

const isFolder = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * The push a Claude Code PreToolUse hook was called for: the Bash command
 * and the folder it runs in. Null when the input is not JSON, the command
 * does not push, or its folder is missing.
 *
 * @param {string} input - the hook's stdin
 * @returns {{command: string, cwd: string} | null}
 */
export const hookPushOf = (input) => {
  const hookCall = parsedOrEmpty(input)
  const command = stringOrEmpty(hookCall.tool_input?.command)
  const cwd = stringOrEmpty(hookCall.cwd)
  if (!isGitPush(command)) return null
  if (!cwd || !isFolder(cwd)) return null
  return { command, cwd }
}
