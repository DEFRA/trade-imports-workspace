import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  REPOS,
  repoPath,
  repoUrl,
  REPOS_DIR,
  upstreamOf
} from '../../constants/repos.js'
import { run } from '../../exec/exec.js'
import {
  assertGitSupportsNegativeRefspecs,
  excludeGhPagesFromFetch,
  needsGhPagesExclusion,
  pruneGhPagesObjects
} from '../../exec/git-exclude-gh-pages.js'
import { runAcross } from '../../exec/parallel.js'
import { lastLines, makeTaskAction } from './_task-output.js'

const failure = (repo, label, execResult, action) => ({
  repo,
  label,
  exitCode: execResult.exitCode,
  action,
  stderrTail: lastLines(execResult.stderr)
})

// One-off migration for clones born before the exclusion refspec: pin
// the config, refetch, then gc to drop the already-fetched gh-pages
// packs. gc only removes unreachable objects — local branches and
// stashes survive.
const healTask = async (repo, dir) => {
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
  return {
    repo,
    label: `${repo} — gh-pages excluded (one-off heal)`,
    exitCode: 0,
    action: 'healed',
    stderrTail: null
  }
}

// git has no "all branches except X" clone flag, so bootstrap is
// clone-narrow then widen behind the exclusion refspec.
const cloneLight = async (repo, label, dir) => {
  const clone = await run('git', [
    'clone',
    '--single-branch',
    repoUrl(repo),
    dir
  ])
  if (clone.exitCode !== 0) {
    return failure(repo, label, clone, 'failed')
  }
  const exclude = await excludeGhPagesFromFetch(dir)
  if (exclude.exitCode !== 0) {
    return failure(
      repo,
      `${repo} — exclude gh-pages`,
      exclude,
      'exclude-failed'
    )
  }
  const widen = await run('git', ['-C', dir, 'fetch', '--quiet', 'origin'])
  if (widen.exitCode !== 0) {
    return failure(repo, `${repo} — git fetch`, widen, 'fetch-failed')
  }
  return {
    repo,
    label,
    exitCode: 0,
    action: 'cloned',
    stderrTail: lastLines(clone.stderr)
  }
}

const UPSTREAM_REMOTE = 'upstream'
const UPSTREAM_FETCH_REFSPEC = '+refs/heads/main:refs/remotes/upstream/main'
const UPSTREAM_TAG_OPT = '--no-tags'
const UPSTREAM_PUSH_URL = 'DISABLED'

const readGitConfigAll = async (dir, key) => {
  const result = await run('git', ['-C', dir, 'config', '--get-all', key])
  return result.exitCode === 0 ? result.stdout.split('\n').filter(Boolean) : []
}

const readGitConfigLast = async (dir, key) => {
  const values = await readGitConfigAll(dir, key)
  return values.at(-1) ?? null
}

const setGitConfig = (dir, key, value) =>
  run('git', ['-C', dir, 'config', '--replace-all', key, value])

const upstreamRemoteState = async (dir) => ({
  url: await readGitConfigLast(dir, `remote.${UPSTREAM_REMOTE}.url`),
  fetch: await readGitConfigAll(dir, `remote.${UPSTREAM_REMOTE}.fetch`),
  tagOpt: await readGitConfigLast(dir, `remote.${UPSTREAM_REMOTE}.tagOpt`),
  pushurl: await readGitConfigLast(dir, `remote.${UPSTREAM_REMOTE}.pushurl`)
})

const upstreamRemoteIsCorrect = (state, url) =>
  state.url === url &&
  state.fetch.length === 1 &&
  state.fetch[0] === UPSTREAM_FETCH_REFSPEC &&
  state.tagOpt === UPSTREAM_TAG_OPT &&
  state.pushurl === UPSTREAM_PUSH_URL

/**
 * Ensure the repo's `upstream` remote (when `repos.json` declares one)
 * fetches only `main`, carries no tags, and cannot be pushed to — a
 * designer's prototype clone pulls upstream changes but never
 * accidentally pushes to the real service's repo. Idempotent: reads the
 * current config first and writes only what's wrong, so a
 * correctly-configured remote is left untouched.
 *
 * @returns {Promise<{exitCode: 0, action: 'none'|'unchanged'|'added'|'corrected'} | ReturnType<typeof failure>>}
 */
const ensureUpstreamRemote = async (repo, dir) => {
  const upstreamRepo = upstreamOf(repo)
  if (!upstreamRepo) return { exitCode: 0, action: 'none' }

  const url = repoUrl(upstreamRepo)
  const before = await upstreamRemoteState(dir)

  if (before.url && upstreamRemoteIsCorrect(before, url)) {
    return { exitCode: 0, action: 'unchanged' }
  }

  if (!before.url) {
    const add = await run('git', [
      '-C',
      dir,
      'remote',
      'add',
      UPSTREAM_REMOTE,
      url
    ])
    if (add.exitCode !== 0) {
      return failure(repo, `${repo} — add upstream remote`, add, 'failed')
    }
  } else if (before.url !== url) {
    const setUrl = await run('git', [
      '-C',
      dir,
      'remote',
      'set-url',
      UPSTREAM_REMOTE,
      url
    ])
    if (setUrl.exitCode !== 0) {
      return failure(
        repo,
        `${repo} — correct upstream remote url`,
        setUrl,
        'failed'
      )
    }
  }

  if (before.fetch.length !== 1 || before.fetch[0] !== UPSTREAM_FETCH_REFSPEC) {
    const fetch = await setGitConfig(
      dir,
      `remote.${UPSTREAM_REMOTE}.fetch`,
      UPSTREAM_FETCH_REFSPEC
    )
    if (fetch.exitCode !== 0) {
      return failure(
        repo,
        `${repo} — set upstream fetch refspec`,
        fetch,
        'failed'
      )
    }
  }

  if (before.tagOpt !== UPSTREAM_TAG_OPT) {
    const tagOpt = await setGitConfig(
      dir,
      `remote.${UPSTREAM_REMOTE}.tagOpt`,
      UPSTREAM_TAG_OPT
    )
    if (tagOpt.exitCode !== 0) {
      return failure(repo, `${repo} — set upstream tagOpt`, tagOpt, 'failed')
    }
  }

  if (before.pushurl !== UPSTREAM_PUSH_URL) {
    const pushurl = await setGitConfig(
      dir,
      `remote.${UPSTREAM_REMOTE}.pushurl`,
      UPSTREAM_PUSH_URL
    )
    if (pushurl.exitCode !== 0) {
      return failure(
        repo,
        `${repo} — disable upstream pushurl`,
        pushurl,
        'failed'
      )
    }
  }

  return { exitCode: 0, action: before.url ? 'corrected' : 'added' }
}

const UPSTREAM_ACTION_NOTE = {
  added: 'upstream remote added',
  corrected: 'upstream remote corrected'
}

const withUpstreamRemote = async (repo, dir, base) => {
  if (base.exitCode !== 0) return base
  const upstream = await ensureUpstreamRemote(repo, dir)
  if (upstream.exitCode !== 0) return upstream
  const note = UPSTREAM_ACTION_NOTE[upstream.action]
  return note ? { ...base, label: `${base.label}, ${note}` } : base
}

const cloneTask = (workspaceRoot, repo) => {
  const dir = repoPath(workspaceRoot, repo)
  const alreadyCloned = existsSync(join(dir, '.git'))
  const label = alreadyCloned
    ? `${repo} — already cloned`
    : `${repo} — git clone (excluding gh-pages)`
  const task = { id: repo, repo, label }
  task.needsNegativeRefspecs = async () =>
    alreadyCloned ? needsGhPagesExclusion(dir) : true
  task.run = async () => {
    const base = await (async () => {
      if (alreadyCloned) {
        if (await needsGhPagesExclusion(dir)) return healTask(repo, dir)
        return {
          repo,
          label,
          exitCode: 0,
          action: 'exists',
          stderrTail: null
        }
      }
      mkdirSync(join(workspaceRoot, REPOS_DIR), { recursive: true })
      return cloneLight(repo, label, dir)
    })()
    return withUpstreamRemote(repo, dir, base)
  }
  return task
}

export const buildSetupTasks = (workspaceRoot) =>
  REPOS.map((repo) => cloneTask(workspaceRoot, repo))

export const setupAll = async (workspaceRoot) => {
  const tasks = buildSetupTasks(workspaceRoot)
  const needs = await Promise.all(
    tasks.map((task) => task.needsNegativeRefspecs())
  )
  if (needs.some(Boolean)) await assertGitSupportsNegativeRefspecs()
  return runAcross(tasks, (task) => task.run())
}

export const register = (parent, { timVersion }) => {
  parent
    .command('setup')
    .description(
      'Clone any missing repos from github.com/DEFRA into repos/. Clones exclude the gh-pages branch; existing clones get the exclusion applied once.'
    )
    .action(makeTaskAction({ runTasks: setupAll, timVersion }))
}
