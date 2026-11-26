import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repoPath, rosterOf } from '../constants/repos.js'
import { isTimError } from '../errors.js'
import { readRepoStates } from '../commands/workspace/repo-state.js'
import { readNightlyJobs, NIGHTLY_JOBS_FILE } from './jobs.js'

export const STOP_FILE = join('workareas', 'nightly', 'STOP')

/**
 * Whether the nightly kill switch is on: `workareas/nightly/STOP` exists.
 * `reason` is the file's trimmed text, or null when it is empty or absent.
 *
 * @param {string} workspaceRoot
 * @returns {{stopped: boolean, path: string, reason: string|null}}
 */
export const readStopFile = (workspaceRoot) => {
  const path = join(workspaceRoot, STOP_FILE)
  if (!existsSync(path)) return { stopped: false, path, reason: null }
  const reason = readFileSync(path, 'utf8').trim()
  return { stopped: true, path, reason: reason.length > 0 ? reason : null }
}

const isSet = (value) => typeof value === 'string' && value.trim().length > 0

const sonarTokenCheck = (env) =>
  isSet(env.SONAR_TOKEN)
    ? { name: 'sonar-token', ok: true, detail: 'SONAR_TOKEN is set' }
    : {
        name: 'sonar-token',
        ok: false,
        detail:
          'SONAR_TOKEN is not set, so the Sonar push gate would skip. Set it in ~/.zshrc and restart the session.'
      }

const anthropicApiKeyCheck = (env) =>
  isSet(env.ANTHROPIC_API_KEY)
    ? {
        name: 'no-anthropic-api-key',
        ok: false,
        detail:
          'ANTHROPIC_API_KEY is set, so the session would bill the API. Unset it and restart the session.'
      }
    : {
        name: 'no-anthropic-api-key',
        ok: true,
        detail: 'ANTHROPIC_API_KEY is not set'
      }

const detachedSessionCheck = (env) => {
  if (isSet(env.TMUX)) {
    return { name: 'detached-session', ok: true, detail: 'Running inside tmux' }
  }
  if (isSet(env.STY)) {
    return {
      name: 'detached-session',
      ok: true,
      detail: 'Running inside screen'
    }
  }
  return {
    name: 'detached-session',
    ok: false,
    detail:
      'This session is not running inside tmux or screen, so it ends when the SSH connection closes. Start claude inside tmux new -s nightly or screen -S nightly.'
  }
}

const stopFileCheck = (stop) =>
  stop.stopped
    ? {
        name: 'stop-file',
        ok: false,
        detail: `${STOP_FILE} exists${stop.reason ? `: ${stop.reason}` : ''}. Remove it to let the jobs run.`
      }
    : { name: 'stop-file', ok: true, detail: `${STOP_FILE} is absent` }

const loadJobs = (workspaceRoot) => {
  try {
    const jobs = readNightlyJobs(workspaceRoot)
    return {
      jobs,
      check: {
        name: 'jobs-config',
        ok: true,
        detail: `${NIGHTLY_JOBS_FILE} lists ${jobs.length} jobs, ${jobs.filter(({ enabled }) => enabled).length} turned on`
      }
    }
  } catch (error) {
    if (!isTimError(error)) throw error
    return {
      jobs: [],
      check: { name: 'jobs-config', ok: false, detail: error.message }
    }
  }
}

const WORKSPACE_KEY = 'workspace'

const checkoutsOf = (workspaceRoot) => [
  { key: WORKSPACE_KEY, path: workspaceRoot },
  ...rosterOf(workspaceRoot).repos.map((repo) => ({
    key: repo,
    path: repoPath(workspaceRoot, repo)
  }))
]

const isWorkareaChange = ({ path, from }) =>
  [path, from]
    .filter((changedPath) => changedPath !== undefined)
    .every((changedPath) => changedPath.startsWith('workareas/'))

const ignoreWorkspaceWorkareaChanges = (state) => {
  if (state.key !== WORKSPACE_KEY || !state.cloned) return state
  const changed = state.changed.filter((change) => !isWorkareaChange(change))
  return { ...state, changed, dirty: changed.length > 0 }
}

const cleanCheckoutsCheck = (states) => {
  const dirty = states.filter(({ dirty }) => dirty).map(({ key }) => key)
  return dirty.length === 0
    ? {
        name: 'clean-checkouts',
        ok: true,
        detail:
          'The workspace, outside workareas/, and every cloned repo are clean'
      }
    : {
        name: 'clean-checkouts',
        ok: false,
        detail: `Uncommitted changes in: ${dirty.join(', ')}`
      }
}

const fetchCheck = (states) => {
  const failed = states
    .filter(({ cloned, fetched }) => cloned && !fetched)
    .map(({ key }) => key)
  return failed.length === 0
    ? {
        name: 'fetch',
        ok: true,
        detail: 'Fetched origin in the workspace and every cloned repo'
      }
    : {
        name: 'fetch',
        ok: false,
        detail: `Fetching origin failed in: ${failed.join(', ')}`
      }
}

const repoSummaryOf = ({ key, cloned, branch = null, dirty = false }) => ({
  key,
  cloned,
  branch,
  dirty
})

/**
 * Whether this session is ready to run the nightly jobs unattended, from
 * checks that need no GitHub: SONAR_TOKEN set, ANTHROPIC_API_KEY not set, the
 * session inside tmux (TMUX set) or screen (STY set), the stop file absent,
 * `config/nightly-jobs.json` valid, and the workspace and every cloned repo
 * clean. Changes under the workspace's `workareas/`, tracked or untracked,
 * do not count, and the workspace's entry in `repos` leaves them out too.
 * With `fetch`, each fetches origin first and a failed fetch fails the check.
 *
 * @param {string} workspaceRoot
 * @param {object} [options]
 * @param {Record<string, string|undefined>} [options.env]
 * @param {boolean} [options.fetch]
 * @returns {Promise<{ready: boolean, checks: {name: string, ok: boolean, detail: string}[], jobs: object[], repos: object[]}>}
 */
export const checkNightlyReadiness = async (
  workspaceRoot,
  { env = process.env, fetch = false } = {}
) => {
  const { jobs, check: jobsCheck } = loadJobs(workspaceRoot)
  const { repos } = await readRepoStates({
    repos: checkoutsOf(workspaceRoot),
    fetch
  })
  const states = repos.map(ignoreWorkspaceWorkareaChanges)
  const checks = [
    sonarTokenCheck(env),
    anthropicApiKeyCheck(env),
    detachedSessionCheck(env),
    stopFileCheck(readStopFile(workspaceRoot)),
    jobsCheck,
    cleanCheckoutsCheck(states),
    ...(fetch ? [fetchCheck(states)] : [])
  ]
  return {
    ready: checks.every(({ ok }) => ok),
    checks,
    jobs,
    repos: states.map(repoSummaryOf)
  }
}
