import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  REPOS,
  repoPath,
  isWorkspaceBranchSynced,
  workspaceSyncSkipLine
} from '../../constants/repos.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { run } from '../../exec/exec.js'
import {
  assertGitSupportsNegativeRefspecs,
  excludeGhPagesFromFetch,
  needsGhPagesExclusion,
  pruneGhPagesObjects
} from '../../exec/git-exclude-gh-pages.js'
import { runAcross } from '../../exec/parallel.js'
import { OK, USAGE, ERROR, PARTIAL_FAILURE } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'
import { lastLines, renderTaskText, renderTaskJson } from './_task-output.js'

const collect = (value, previous) => previous.concat([value])

/**
 * Split the repo roster into the ones this run should touch and the ones
 * it should leave alone — a repo opts out via `workspaceBranchSync: false`
 * unless `include` names it explicitly.
 *
 * @param {string[]} [include]
 * @returns {{targets: string[], skipped: string[]}}
 */
export const partitionSyncTargets = (include = []) => {
  const included = new Set(include)
  const targets = []
  const skipped = []
  for (const repo of REPOS) {
    if (isWorkspaceBranchSynced(repo) || included.has(repo)) targets.push(repo)
    else skipped.push(repo)
  }
  return { targets, skipped }
}

const failure = (repo, label, execResult, action) => ({
  repo,
  label,
  exitCode: execResult.exitCode,
  action,
  stderrTail: lastLines(execResult.stderr)
})

// One-off migration for clones born before the exclusion refspec: pin
// the config, refetch, then gc to drop the already-fetched gh-pages
// packs. Returns null when healthy so the caller can fall through to
// the pull.
const healIfNeeded = async (repo, dir) => {
  if (!(await needsGhPagesExclusion(dir))) return null
  const exclude = await excludeGhPagesFromFetch(dir)
  if (exclude.exitCode !== 0) {
    return failure(
      repo,
      `${repo} — exclude gh-pages`,
      exclude,
      'exclude-failed'
    )
  }
  const fetch = await run('git', ['-C', dir, 'fetch', '--quiet', 'origin'])
  if (fetch.exitCode !== 0) {
    return failure(repo, `${repo} — git fetch`, fetch, 'fetch-failed')
  }
  const prune = await pruneGhPagesObjects(dir)
  if (prune.exitCode !== 0) {
    return failure(repo, `${repo} — git gc`, prune, 'gc-failed')
  }
  return { healed: true }
}

const updateTask = (workspaceRoot, repo) => {
  const dir = repoPath(workspaceRoot, repo)
  const cloned = existsSync(join(dir, '.git'))
  const label = cloned
    ? `${repo} — git pull --rebase`
    : `${repo} — (not cloned, skipping)`
  const task = { id: repo, repo, label }
  task.needsNegativeRefspecs = async () =>
    cloned ? needsGhPagesExclusion(dir) : false
  task.run = async () => {
    if (!cloned) {
      return {
        repo,
        label,
        exitCode: 0,
        action: 'skipped',
        stderrTail: null
      }
    }
    const heal = await healIfNeeded(repo, dir)
    if (heal && !heal.healed) return heal
    const result = await run('git', ['-C', dir, 'pull', '--rebase'])
    return {
      repo,
      label: heal?.healed
        ? `${repo} — gh-pages excluded (one-off heal) + git pull --rebase`
        : label,
      exitCode: result.exitCode,
      action: result.exitCode === 0 ? 'pulled' : 'failed',
      stderrTail: lastLines(result.stderr)
    }
  }
  return task
}

export const buildUpdateTasks = (workspaceRoot, { include = [] } = {}) =>
  partitionSyncTargets(include).targets.map((repo) =>
    updateTask(workspaceRoot, repo)
  )

export const updateAll = async (workspaceRoot, { include = [] } = {}) => {
  const { targets, skipped } = partitionSyncTargets(include)
  const tasks = targets.map((repo) => updateTask(workspaceRoot, repo))
  const needs = await Promise.all(
    tasks.map((task) => task.needsNegativeRefspecs())
  )
  if (needs.some(Boolean)) await assertGitSupportsNegativeRefspecs()
  const results = await runAcross(tasks, (task) => task.run())
  return { results, skipped }
}

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const emitResultsWithSkips = ({ results, skipped, json, timVersion }) => {
  if (json) {
    const payload = JSON.parse(renderTaskJson(results, timVersion))
    payload.skipped = skipped
    emit(JSON.stringify(payload))
    return
  }
  const lines = [renderTaskText(results)]
  for (const repo of skipped) lines.push(workspaceSyncSkipLine(repo))
  emit(lines.join('\n'))
}

export const register = (parent, { timVersion }) => {
  parent
    .command('update')
    .description(
      'Run `git pull --rebase` in every cloned repo. Clones still fetching gh-pages get the exclusion applied once first.'
    )
    .option(
      '--include <repo>',
      'Also update a repo that normally sits out of workspace-wide updates (such as the plants prototype). Repeatable.',
      collect,
      []
    )
    .action(async function updateAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const { results, skipped } = await updateAll(workspaceRoot, {
          include: opts.include
        })
        emitResultsWithSkips({
          results,
          skipped,
          json: globalOpts.json,
          timVersion
        })
        const someFailed = results.some((r) => !r.ok)
        process.exit(someFailed ? PARTIAL_FAILURE : OK)
      } catch (error) {
        if (isTimError(error) && globalOpts.json) {
          emit(
            JSON.stringify({
              ok: false,
              schema_version: 1,
              tim_version: timVersion,
              result: null,
              errors: [{ code: error.code, message: error.message }]
            })
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(
          isTimError(error) && error.code === 'USAGE' ? USAGE : ERROR
        )
      }
    })
}
