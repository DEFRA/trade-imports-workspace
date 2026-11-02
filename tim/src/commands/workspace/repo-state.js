import { existsSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { z } from 'zod'
import { run } from '../../exec/exec.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { TimError } from '../../errors.js'
import { makeRunAction } from '../_run-action.js'
import { parseOptions } from '../backlog/shared.js'

const git = (dir, args) => run('git', ['-C', dir, ...args])

const succeeds = async (dir, args) => (await git(dir, args)).exitCode === 0

const REPO_ENTRY = /^([a-z][a-z0-9-]*):(.+)$/

const STATUS_PREFIX_LENGTH = 3

const hasSourceEntry = (status) => /[RC]/.test(status)

/**
 * Each entry of `git status --porcelain -z` as `{status, path}`, a rename or
 * copy as one entry naming its new path and the path it came from.
 *
 * @param {string} stdout
 * @returns {{status: string, path: string, from?: string}[]}
 */
export const parseStatusEntries = (stdout) => {
  const entries = stdout.split('\0').filter((entry) => entry.length > 0)
  const changed = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    const status = entry.slice(0, 2)
    const path = entry.slice(STATUS_PREFIX_LENGTH)
    if (hasSourceEntry(status)) {
      index += 1
      changed.push({ status, path, from: entries[index] })
    } else {
      changed.push({ status, path })
    }
  }
  return changed
}

/**
 * The `key:path` pairs of `--repos`, each path resolved against the
 * workspace root unless it is absolute.
 *
 * @param {string} list - Such as `frontend:repos/trade-imports-plants-frontend,workspace:.`
 * @param {string} workspaceRoot
 * @returns {{key: string, path: string}[]}
 * @throws {TimError} USAGE when an entry is not `key:path`, or a key repeats
 */
export const parseRepoList = (list, workspaceRoot) => {
  const entries = list
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  const repos = entries.map((entry) => {
    const match = entry.match(REPO_ENTRY)
    if (!match) {
      throw new TimError(
        'USAGE',
        `Write each repo as key:path, such as frontend:repos/trade-imports-plants-frontend. "${entry}" is not.`
      )
    }
    const [, key, path] = match
    return { key, path: isAbsolute(path) ? path : join(workspaceRoot, path) }
  })
  const keys = repos.map(({ key }) => key)
  const repeated = keys.find((key, index) => keys.indexOf(key) !== index)
  if (repeated) {
    throw new TimError('USAGE', `${repeated} is named twice in --repos.`)
  }
  return repos
}

const shaOf = async (dir, ref) => {
  const result = await git(dir, ['rev-parse', '--verify', '--quiet', ref])
  return result.exitCode === 0 ? result.stdout.trim() : null
}

const counted = async (dir, ref) => {
  if (!(await shaOf(dir, ref))) return { ahead: null, behind: null }
  const { stdout } = await git(dir, [
    'rev-list',
    '--left-right',
    '--count',
    `${ref}...HEAD`
  ])
  const [behind, ahead] = stdout.trim().split(/\s+/).map(Number)
  return { ahead, behind }
}

const nonEmptyLines = (text) =>
  text.split('\n').filter((line) => line.trim().length > 0)

const stateOf = async ({ key, path }, { branch, base, fetch }) => {
  if (!existsSync(join(path, '.git'))) return { key, path, cloned: false }
  const fetched = fetch
    ? await succeeds(path, ['fetch', '--quiet', 'origin'])
    : null
  const current = (await git(path, ['branch', '--show-current'])).stdout.trim()
  const changed = parseStatusEntries(
    (await git(path, ['status', '--porcelain', '-z'])).stdout
  )
  const merging = (await shaOf(path, 'MERGE_HEAD')) !== null
  const unresolved = merging
    ? nonEmptyLines(
        (await git(path, ['diff', '--name-only', '--diff-filter=U'])).stdout
      )
    : []
  const againstOrigin = current
    ? await counted(path, `refs/remotes/origin/${current}`)
    : { ahead: null, behind: null }
  return {
    key,
    path,
    cloned: true,
    branch: current || null,
    head: await shaOf(path, 'HEAD'),
    dirty: changed.length > 0,
    changed,
    staged: changed.filter(({ status }) => /^[^ ?]/.test(status)).length,
    merging,
    unresolved,
    origin: current ? `origin/${current}` : null,
    ...againstOrigin,
    ...(fetch ? { fetched } : {}),
    ...(branch
      ? {
          expectedBranch: branch,
          onBranch: current === branch,
          branchHead: await shaOf(path, `refs/heads/${branch}`)
        }
      : {}),
    ...(base
      ? await counted(path, `refs/remotes/origin/${base}`).then(
          ({ ahead, behind }) => ({
            base: `origin/${base}`,
            aheadOfBase: ahead,
            behindBase: behind
          })
        )
      : {})
  }
}

/**
 * The state of each repo, read from local git: its current branch (null when
 * detached), HEAD, whether it has uncommitted changes and each changed path
 * with its two status letters, how many are staged, whether a merge is in
 * progress and the paths it left unresolved, and how far HEAD is ahead of and
 * behind origin/<current branch> (null when origin has no such branch). With
 * `branch`, whether the repo is on it and the SHA that branch points at
 * locally. With `base`, how far HEAD is ahead of and behind origin/<base>.
 * With `fetch`, each repo fetches origin first.
 *
 * @param {object} args
 * @param {{key: string, path: string}[]} args.repos
 * @param {string} [args.branch]
 * @param {string} [args.base]
 * @param {boolean} [args.fetch]
 * @returns {Promise<{repos: object[]}>}
 */
export const readRepoStates = async ({
  repos,
  branch,
  base,
  fetch = false
}) => ({
  repos: await Promise.all(
    repos.map((repo) => stateOf(repo, { branch, base, fetch }))
  )
})

const describeCounts = (ahead, behind, against) =>
  ahead === null
    ? `no ${against}`
    : `${ahead} ahead, ${behind} behind ${against}`

const describeRepo = (state) => {
  if (!state.cloned) return `${state.key}: not cloned at ${state.path}`
  const lines = [
    `${state.key}: on ${state.branch ?? 'no branch (detached)'}${state.expectedBranch && !state.onBranch ? `, not ${state.expectedBranch}` : ''}; ${state.dirty ? `${state.changed.length} changed, ${state.staged} staged` : 'clean'}; ${describeCounts(state.ahead, state.behind, state.origin ?? 'origin branch')}${state.base ? `; ${describeCounts(state.aheadOfBase, state.behindBase, state.base)}` : ''}`,
    ...(state.merging
      ? [`  merge in progress, ${state.unresolved.length} unresolved`]
      : []),
    ...state.changed.map(({ status, path }) => `  ${status} ${path}`)
  ]
  return lines.join('\n')
}

/**
 * The plain-text report of `tim workspace repo-state`.
 *
 * @param {{repos: object[]}} outcome
 * @returns {string}
 */
export const renderRepoStateText = ({ repos }) =>
  repos.map(describeRepo).join('\n')

const repoStateOptionsSchema = z.object({
  repos: z
    .string({
      message:
        'Name the repos with --repos key:path,…, such as frontend:repos/trade-imports-plants-frontend,workspace:.'
    })
    .trim()
    .min(1, 'Name at least one repo with --repos.'),
  branch: z.string().trim().min(1).optional(),
  base: z.string().trim().min(1).optional(),
  fetch: z.boolean().optional(),
  workspace: z.string().optional()
})

/**
 * `tim workspace repo-state`: each named repo's branch, changes and position
 * against origin, as one report a script or an agent reads instead of
 * reading `git status` for itself.
 *
 * @param {import('commander').Command} parent
 * @param {{timVersion: string}} options
 */
export const register = (parent, { timVersion }) =>
  parent
    .command('repo-state')
    .description(
      'Report the state of each repo you name, from local git: its current branch (null when detached) and HEAD, whether it is dirty and every changed path with its two `git status --porcelain` letters (an untracked folder is one entry), how many changes are staged, whether a merge is in progress and which paths it left unresolved, and how far HEAD is ahead of and behind origin/<its branch> (null when origin has no such branch). --branch adds onBranch and branchHead, the SHA that branch points at locally. --base adds aheadOfBase and behindBase against origin/<base>. Reads local refs only, unless --fetch. Changes nothing else. Exits 0 whatever it finds.'
    )
    .requiredOption(
      '--repos <list>',
      'Comma-separated key:path pairs; a path is relative to the workspace root unless absolute, and "." is the workspace repo itself'
    )
    .option('--branch <name>', 'The branch each repo should be on')
    .option('--base <name>', 'Also count commits against origin/<base>')
    .option('--fetch', 'Fetch origin in each repo first')
    .addHelpText(
      'after',
      '\nExamples:\n  tim workspace repo-state --repos frontend:repos/trade-imports-plants-frontend,workspace:. --json\n  tim workspace repo-state --repos tests:repos/trade-imports-ins-tests --branch feat/EUDPA-1-x --base main --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => parseOptions(repoStateOptionsSchema, opts),
        run: (_context, parsed) =>
          readRepoStates({
            repos: parseRepoList(
              parsed.repos,
              resolveWorkspaceRoot({ explicit: parsed.workspace })
            ),
            branch: parsed.branch,
            base: parsed.base,
            fetch: parsed.fetch === true
          }),
        renderText: renderRepoStateText,
        timVersion
      })
    )
