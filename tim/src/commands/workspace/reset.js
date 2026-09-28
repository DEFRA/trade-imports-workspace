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
import { runAcross } from '../../exec/parallel.js'
import {
  OK,
  USAGE,
  ERROR,
  USER_ABORT,
  PARTIAL_FAILURE
} from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'
import { lastLines, renderTaskText, renderTaskJson } from './_task-output.js'

const collect = (value, previous) => previous.concat([value])

/**
 * Split the repo roster into the ones this run should touch and the ones
 * it should leave alone — a repo opts out via `workspaceBranchSync: false`
 * (see `isWorkspaceBranchSynced`) unless `include` names it explicitly.
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

const SCHEMA_VERSION = 1

const resetTask = (workspaceRoot, repo) => {
  const dir = repoPath(workspaceRoot, repo)
  const cloned = existsSync(join(dir, '.git'))
  const label = cloned
    ? `${repo} — git reset --hard origin/main`
    : `${repo} — (not cloned, skipping)`
  const task = { id: repo, repo, label }
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
    const fetch = await run('git', ['-C', dir, 'fetch', 'origin'])
    if (fetch.exitCode !== 0) {
      return {
        repo,
        label: `${repo} — git fetch`,
        exitCode: fetch.exitCode,
        action: 'fetch-failed',
        stderrTail: lastLines(fetch.stderr)
      }
    }
    const checkout = await run('git', ['-C', dir, 'checkout', 'main'])
    if (checkout.exitCode !== 0) {
      return {
        repo,
        label: `${repo} — git checkout main`,
        exitCode: checkout.exitCode,
        action: 'checkout-failed',
        stderrTail: lastLines(checkout.stderr)
      }
    }
    const reset = await run('git', [
      '-C',
      dir,
      'reset',
      '--hard',
      'origin/main'
    ])
    return {
      repo,
      label,
      exitCode: reset.exitCode,
      action: reset.exitCode === 0 ? 'reset' : 'reset-failed',
      stderrTail: lastLines(reset.stderr)
    }
  }
  return task
}

export const buildResetTasks = (workspaceRoot, { include = [] } = {}) =>
  partitionSyncTargets(include).targets.map((repo) =>
    resetTask(workspaceRoot, repo)
  )

export const resetAll = async (workspaceRoot, { include = [] } = {}) => {
  const { targets, skipped } = partitionSyncTargets(include)
  const results = await runAcross(
    targets.map((repo) => resetTask(workspaceRoot, repo)),
    (task) => task.run()
  )
  return { results, skipped }
}

const promptYes = async () => {
  if (!process.stdin.isTTY) return false
  process.stderr.write(
    'This will discard ALL local changes in every repo and hard-reset to origin/main.\nType "yes" to continue: '
  )
  return new Promise((resolve) => {
    process.stdin.once('data', (chunk) => {
      resolve(chunk.toString().trim().toLowerCase() === 'yes')
    })
  })
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
    .command('reset')
    .description(
      'Hard-reset every cloned repo to origin/main. Discards uncommitted work.'
    )
    .option(
      '--yes',
      'Skip the interactive confirmation (required in --json mode)'
    )
    .option(
      '--include <repo>',
      'Also reset a repo that normally sits out of workspace-wide resets (such as the plants prototype). Repeatable.',
      collect,
      []
    )
    .action(async function resetAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })

        const confirmed = opts.yes || (await promptYes())
        if (!confirmed) {
          if (globalOpts.json) {
            emit(
              JSON.stringify({
                ok: false,
                schema_version: SCHEMA_VERSION,
                tim_version: timVersion,
                result: null,
                errors: [
                  {
                    code: 'USER_ABORT',
                    message: 'Reset cancelled. Use --yes to skip the prompt.'
                  }
                ]
              })
            )
          } else {
            emitError('Reset cancelled. Use --yes to skip the prompt.')
          }
          process.exit(USER_ABORT)
        }

        const { results, skipped } = await resetAll(workspaceRoot, {
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
              schema_version: SCHEMA_VERSION,
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
