import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'

/** Where a corpus records where each application stood when the run began. */
export const HEADS_FILE = 'run-heads.json'

/**
 * @param {object} profile - A loaded corpus profile
 * @returns {string}
 */
export const headsPath = (profile) => join(profile.paths.workarea, HEADS_FILE)

/**
 * Where one checkout stands right now.
 *
 * A dirty worktree is recorded rather than refused. Editing an application
 * mid-run is sometimes exactly the point — a capture spec is being written
 * against it — and what matters is that the report can say the pictures and the
 * citations describe different trees, not that a tool stopped somebody working.
 *
 * @param {string} path - A checkout
 * @returns {Promise<{found: boolean, sha: string|null, branch: string|null, dirty: boolean, why?: string}>}
 */
export const headOf = async (path) => {
  if (!path || !existsSync(path)) {
    return {
      found: false,
      sha: null,
      branch: null,
      dirty: false,
      why: `No checkout at ${path ?? 'no path'}.`
    }
  }
  const sha = await run('git', ['-C', path, 'rev-parse', 'HEAD'])
  if (sha.exitCode !== 0) {
    return {
      found: false,
      sha: null,
      branch: null,
      dirty: false,
      why: `${path} is not a git checkout, so nothing can say whether it moved.`
    }
  }
  const branch = await run('git', [
    '-C',
    path,
    'rev-parse',
    '--abbrev-ref',
    'HEAD'
  ])
  const status = await run('git', ['-C', path, 'status', '--porcelain'])
  return {
    found: true,
    sha: sha.stdout.trim(),
    branch: branch.exitCode === 0 ? branch.stdout.trim() : null,
    dirty: status.stdout.trim() !== ''
  }
}

/**
 * Every repo the comparison reads, as it stands now.
 *
 * Every repo, not just the two being compared. A finding on the implementation
 * side routinely cites the backend, and a citation resolving against a repo
 * that moved is as wrong as a picture of one that did.
 *
 * @param {object} profile
 * @returns {Promise<Record<string, object>>}
 */
export const currentHeads = async (profile) => {
  const entries = await Promise.all(
    Object.entries(profile.repos).map(async ([key, repo]) => [
      key,
      { ...(await headOf(repo.absolutePath)), path: repo.absolutePath }
    ])
  )
  return Object.fromEntries(entries)
}

/**
 * What has moved since the run began.
 *
 * The four verdicts are deliberately not one boolean. A repo that moved
 * invalidates a comparison between its pictures and its citations. A repo that
 * has merely become dirty does not yet, but will the moment somebody commits.
 * A repo nobody recorded cannot be judged at all, and saying so beats reporting
 * it as unchanged.
 *
 * @param {object} args
 * @param {Record<string, object>} args.recorded
 * @param {Record<string, object>} args.current
 * @returns {object[]}
 */
export const compareHeads = ({ recorded, current }) =>
  Object.keys(current)
    .sort()
    .map((key) => {
      const then = recorded?.[key]
      const now = current[key]
      if (!then?.sha || !now.sha) {
        return {
          repo: key,
          verdict: 'unrecorded',
          was: then?.sha ?? null,
          now: now.sha,
          why: then?.sha
            ? `${key} was recorded at ${then.sha.slice(0, 8)} and cannot be read now: ${now.why ?? 'no HEAD'}`
            : `${key} was never recorded, so nothing here can say whether it moved.`
        }
      }
      if (then.sha !== now.sha) {
        return {
          repo: key,
          verdict: 'moved',
          was: then.sha,
          now: now.sha,
          why: `${key} moved from ${then.sha.slice(0, 8)} to ${now.sha.slice(0, 8)} while the run was open. Every picture taken before it and every citation resolved after it describe different trees.`
        }
      }
      if (now.dirty && !then.dirty) {
        return {
          repo: key,
          verdict: 'dirty',
          was: then.sha,
          now: now.sha,
          why: `${key} is on the same commit but has uncommitted changes it did not have at the start. Nothing is wrong yet; it will be the moment somebody commits.`
        }
      }
      return { repo: key, verdict: 'same', was: then.sha, now: now.sha }
    })

/**
 * Hold the applications still for the length of a run, or say what moved.
 *
 * Nothing can stop somebody committing to an application mid-run, and this does
 * not try to. What it does is make the movement visible while the run is still
 * open, rather than afterwards when the only remaining question is which of the
 * findings to re-verify.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {boolean} [args.write] - Record the current heads as the run's start
 * @returns {Promise<object>}
 * @throws {TimError} USAGE when asked to re-record over a run in progress
 */
export const runHeads = async ({ profile, write = false, force = false }) => {
  const path = headsPath(profile)
  const held = existsSync(path) ? readJsonFile(path) : null
  const current = await currentHeads(profile)

  if (write) {
    // Re-recording silently is the one way this tool could make things worse:
    // it would erase the evidence that anything moved and report a clean run.
    if (held && !force) {
      throw new TimError(
        'USAGE',
        `This run already recorded where each application stood, on ${held.recordedAt}. Re-recording would erase the only evidence that anything moved since. Read "tim parity heads ${profile.runId}" first, and pass --force if you genuinely mean to start the clock again.`
      )
    }
    const recorded = {
      runId: profile.runId,
      corpus: profile.id,
      recordedAt: new Date().toISOString(),
      repos: current
    }
    writeJsonAtomic(path, recorded)
    return {
      path,
      written: true,
      recordedAt: recorded.recordedAt,
      repos: compareHeads({ recorded: current, current }),
      moved: [],
      steady: true,
      exitNonZero: false
    }
  }

  if (!held) {
    return {
      path,
      written: false,
      recordedAt: null,
      repos: compareHeads({ recorded: {}, current }),
      moved: [],
      steady: false,
      neverRecorded: true,
      exitNonZero: false
    }
  }

  const repos = compareHeads({ recorded: held.repos ?? {}, current })
  const moved = repos.filter((entry) => entry.verdict === 'moved')
  return {
    path,
    written: false,
    recordedAt: held.recordedAt,
    repos,
    moved: moved.map((entry) => entry.repo),
    steady: moved.length === 0,
    exitNonZero: false
  }
}

/**
 * @param {object} result - From runHeads
 * @returns {string}
 */
export const renderHeads = (result) => {
  if (result.written) {
    return [
      `Recorded where ${result.repos.length} checkouts stood at ${result.recordedAt}.`,
      ...result.repos.map(
        (entry) =>
          `  ${entry.repo.padEnd(16)} ${entry.now?.slice(0, 8) ?? 'no HEAD'}`
      ),
      'Run this again without --write before the ingest and before the report, and read what moved.'
    ].join('\n')
  }

  if (result.neverRecorded) {
    return [
      'This run never recorded where the applications stood when it began, so nothing can say whether either has moved under it.',
      ...result.repos.map(
        (entry) =>
          `  ${entry.repo.padEnd(16)} ${entry.now?.slice(0, 8) ?? 'no HEAD'}`
      ),
      'Record them now with --write if the run is still starting. If it is not, the captures and the citations may already describe different trees.'
    ].join('\n')
  }

  const lines = [`Recorded at ${result.recordedAt}.`]
  for (const entry of result.repos) {
    lines.push(`  ${entry.repo.padEnd(16)} ${entry.verdict}`)
    if (entry.why) lines.push(`    ${entry.why}`)
  }
  lines.push(
    result.steady
      ? 'Nothing moved. The pictures and the citations describe the same trees.'
      : 'Re-verify every finding that cites a repo above, or re-capture it. A moved application is not a reason to re-run everything — it is a reason to know which findings rest on the part that moved.'
  )
  return lines.join('\n')
}
