import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  REPOS,
  repoPath,
  repoUrl,
  REPOS_DIR,
  upstreamFor
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

/**
 * Ensure the read-only upstream remote a repo's `repos.json` entry
 * declares exists, adding it with a disabled push URL when it doesn't.
 * Idempotent — a repo that already has the remote is left untouched.
 * A `dir` that is not a working git checkout (nothing to list remotes on)
 * is left alone rather than treated as a failure.
 *
 * @param {string} repo
 * @param {string} dir - Absolute path to the cloned repo
 * @returns {Promise<{status: 'not-configured'|'already-set-up'|'added'|'failed', name?: string, stderrTail?: string}>}
 */
export const ensureUpstreamRemote = async (repo, dir) => {
  const upstream = upstreamFor(repo)
  if (!upstream) return { status: 'not-configured' }
  const listing = await run('git', ['-C', dir, 'remote'])
  if (listing.exitCode !== 0) return { status: 'not-configured' }
  const existing = listing.stdout
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean)
  if (existing.includes(upstream.name)) {
    return { status: 'already-set-up', name: upstream.name }
  }
  const add = await run('git', [
    '-C',
    dir,
    'remote',
    'add',
    upstream.name,
    upstream.url
  ])
  if (add.exitCode !== 0) {
    return {
      status: 'failed',
      name: upstream.name,
      stderrTail: lastLines(add.stderr)
    }
  }
  if (upstream.push === 'DISABLED') {
    await run('git', [
      '-C',
      dir,
      'remote',
      'set-url',
      '--push',
      upstream.name,
      'DISABLED'
    ])
  }
  return { status: 'added', name: upstream.name }
}

const UPSTREAM_SUFFIX = {
  'not-configured': '',
  'already-set-up': '; upstream already set up',
  added: '; upstream remote added (fetch-only)'
}

const withUpstreamCheck = async (repo, dir, base) => {
  if (base.exitCode !== 0) return base
  const upstream = await ensureUpstreamRemote(repo, dir)
  if (upstream.status === 'failed') {
    return {
      ...base,
      label: `${base.label}; FAILED to add upstream remote`,
      exitCode: 1,
      action: 'upstream-failed',
      stderrTail: upstream.stderrTail
    }
  }
  return { ...base, label: `${base.label}${UPSTREAM_SUFFIX[upstream.status]}` }
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
    if (alreadyCloned) {
      const base = (await needsGhPagesExclusion(dir))
        ? await healTask(repo, dir)
        : { repo, label, exitCode: 0, action: 'exists', stderrTail: null }
      return withUpstreamCheck(repo, dir, base)
    }
    mkdirSync(join(workspaceRoot, REPOS_DIR), { recursive: true })
    const cloned = await cloneLight(repo, label, dir)
    return withUpstreamCheck(repo, dir, cloned)
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
      'Clone any missing repos from github.com/DEFRA into repos/. Clones exclude the gh-pages branch; existing clones get the exclusion applied once. A repo that declares an upstream (such as the plants prototype) also gets a fetch-only remote to it.'
    )
    .action(makeTaskAction({ runTasks: setupAll, timVersion }))
}
