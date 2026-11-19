import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { run } from '../../exec/exec.js'
import { pinFetch } from '../../exec/git-pin-fetch.js'

const gitIn = async (dir, args, transcript) => {
  const result = await run('git', args, { cwd: dir, stripFinalNewline: false })
  transcript.raw(`${result.stdout}${result.stderr}`)
  return result.exitCode === 0
}

const everyStep = async (steps) => {
  for (const step of steps) {
    if (!(await step())) return false
  }
  return true
}

const hasCommit = async (dir, commit) =>
  (
    await run('git', ['cat-file', '-e', `${commit}^{commit}`], {
      cwd: dir
    })
  ).exitCode === 0

const checkOutInClone = async ({ dir, commit, transcript }) =>
  everyStep([
    async () =>
      (await hasCommit(dir, commit)) ||
      gitIn(
        dir,
        ['fetch', '--quiet', '--depth=1', 'origin', commit],
        transcript
      ),
    () => gitIn(dir, ['checkout', '--quiet', commit], transcript)
  ])

const shallowClone = ({ dir, repo, commit, transcript }) =>
  everyStep([
    () => gitIn(dir, ['init', '--quiet'], transcript),
    () =>
      gitIn(
        dir,
        ['remote', 'add', 'origin', `https://github.com/DEFRA/${repo}.git`],
        transcript
      ),
    () =>
      gitIn(
        dir,
        ['fetch', '--quiet', '--depth=1', 'origin', commit],
        transcript
      ),
    () => gitIn(dir, ['checkout', '--quiet', commit], transcript)
  ])

const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory()

/**
 * Puts a review clone at a pull request's commit: in a clone already there,
 * fetches the commit when it is missing and checks it out; otherwise
 * starts a clone of `https://github.com/DEFRA/<repo>.git` holding that one
 * commit, and removes the folder when that fails. Progress lines, and
 * anything git prints, go to the transcript.
 *
 * @param {object} args
 * @param {string} args.dir - The review clone's folder
 * @param {string} args.repo
 * @param {string} args.commit
 * @param {'merge' | 'head'} args.commitKind
 * @param {{line: (text: string) => void, raw: (text: string) => void}} args.transcript
 * @returns {Promise<boolean>} Whether the clone is at the commit
 */
export const checkOutPullRequestCommit = async ({
  dir,
  repo,
  commit,
  commitKind,
  transcript
}) => {
  if (isDirectory(dir)) {
    transcript.line(`  ${repo}: repo already present, fetching ${commit}...`)
    const checkedOut = await checkOutInClone({ dir, commit, transcript })
    if (!checkedOut) {
      transcript.line(`  Failed to checkout ${commit} in ${repo}`)
    }
    return checkedOut
  }
  transcript.line(`  ${repo}: shallow-cloning ${commit} (${commitKind})...`)
  mkdirSync(dir, { recursive: true })
  const cloned = await shallowClone({ dir, repo, commit, transcript })
  if (!cloned) {
    transcript.line(`  Failed to shallow-clone ${repo} at ${commit}`)
    rmSync(dir, { recursive: true, force: true })
  }
  return cloned
}

/**
 * Pins a review clone's fetch refspec to its pull request, and to main as
 * well for a merged one. A clone git cannot pin is left as it is, with
 * the reason in the transcript.
 *
 * @param {object} args
 * @param {string} args.dir
 * @param {number | string} args.pullRequest
 * @param {boolean} args.merged
 * @param {{line: (text: string) => void}} args.transcript
 */
export const pinReviewCloneFetch = async ({
  dir,
  pullRequest,
  merged,
  transcript
}) => {
  try {
    await pinFetch({
      dir,
      mode: 'pr-only',
      pullRequestNumber: String(pullRequest),
      includeMain: merged
    })
  } catch (error) {
    transcript.line(error.message)
  }
}
