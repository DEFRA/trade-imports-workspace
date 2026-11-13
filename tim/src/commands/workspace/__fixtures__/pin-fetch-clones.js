import { execa } from 'execa'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  createBareRepo,
  createFatClone
} from '../../../test-support/git-fixtures.js'

export const PULL_REQUEST_NUMBER = '7'

const git = async (dir, ...args) =>
  (await execa('git', ['-C', dir, ...args], { reject: false })).stdout

/**
 * A bare origin with main, a feature branch, gh-pages and a pull request
 * ref, as GitHub serves a product repo.
 *
 * @param {string} baseDir
 * @returns {Promise<{barePath: string}>}
 */
export const createPullRequestOrigin = async (baseDir) => {
  const fixture = await createBareRepo(baseDir, 'product')
  await git(
    fixture.barePath,
    'update-ref',
    `refs/pull/${PULL_REQUEST_NUMBER}/head`,
    fixture.shas.feature
  )
  return fixture
}

const createReviewClone = async (barePath, dir) => {
  mkdirSync(dir, { recursive: true })
  await execa('git', ['init', '--quiet', dir])
  await git(dir, 'remote', 'add', 'origin', `file://${barePath}`)
}

const cloneMakers = {
  dev: createFatClone,
  review: createReviewClone
}

/**
 * The cases a pin-fetch run is recorded on. `clone` is a full clone with
 * git's default refspec (`dev`) or an empty repo with only an origin
 * (`review`); `runs` lists each run's flags, written for the Bash script
 * and for tim; only the last run is recorded.
 */
export const pinFetchCases = [
  {
    name: 'excludes gh-pages from a full clone',
    clone: 'dev',
    runs: [{ bash: ['--exclude-gh-pages'], tim: ['--exclude-gh-pages'] }]
  },
  {
    name: 'excludes gh-pages a second time with the same result',
    clone: 'dev',
    runs: [
      { bash: ['--exclude-gh-pages'], tim: ['--exclude-gh-pages'] },
      { bash: ['--exclude-gh-pages'], tim: ['--exclude-gh-pages'] }
    ]
  },
  {
    name: 'pins a review clone to the pull request ref',
    clone: 'review',
    runs: [
      {
        bash: ['--pr-only', '<DIR>', PULL_REQUEST_NUMBER],
        tim: ['--pr', PULL_REQUEST_NUMBER]
      }
    ]
  },
  {
    name: 'pins a review clone to the pull request ref and main',
    clone: 'review',
    runs: [
      {
        bash: ['--pr-only', '<DIR>', PULL_REQUEST_NUMBER, '--include-main'],
        tim: ['--pr', PULL_REQUEST_NUMBER, '--include-main']
      }
    ]
  },
  {
    name: 'pins a review clone to the pull request ref a second time with the same result',
    clone: 'review',
    runs: [
      {
        bash: ['--pr-only', '<DIR>', PULL_REQUEST_NUMBER, '--include-main'],
        tim: ['--pr', PULL_REQUEST_NUMBER, '--include-main']
      },
      {
        bash: ['--pr-only', '<DIR>', PULL_REQUEST_NUMBER],
        tim: ['--pr', PULL_REQUEST_NUMBER]
      }
    ]
  },
  {
    name: 'pins a full clone to the pull request ref and drops its gh-pages ref',
    clone: 'dev',
    runs: [
      {
        bash: ['--pr-only', '<DIR>', PULL_REQUEST_NUMBER],
        tim: ['--pr', PULL_REQUEST_NUMBER]
      }
    ]
  },
  {
    name: 'refuses a folder that is not a git repo',
    clone: null,
    runs: [{ bash: ['--exclude-gh-pages'], tim: ['--exclude-gh-pages'] }]
  }
]

/**
 * Bash args for one run, with the clone folder put where the script reads
 * it: in place of `<DIR>`, or last.
 *
 * @param {string[]} args
 * @param {string} dir
 * @returns {string[]}
 */
export const bashArgsFor = (args, dir) =>
  args.includes('<DIR>')
    ? args.map((arg) => (arg === '<DIR>' ? dir : arg))
    : [...args, dir]

/**
 * Sets up the folder a case runs in under `baseDir`.
 *
 * @param {{clone: 'dev'|'review'|null, name: string}} pinFetchCase
 * @param {string} barePath
 * @param {string} baseDir
 * @param {number} index
 * @returns {Promise<string>} The folder
 */
export const prepareCaseFolder = async (
  pinFetchCase,
  barePath,
  baseDir,
  index
) => {
  const dir = join(baseDir, `case-${index}`)
  if (pinFetchCase.clone === null) {
    mkdirSync(dir, { recursive: true })
    return dir
  }
  await cloneMakers[pinFetchCase.clone](barePath, dir)
  return dir
}

/**
 * The fetch refspecs a clone ends with, and its remote-tracking refs after
 * a bare `git fetch`.
 *
 * @param {string} dir
 * @returns {Promise<{refspecs: string[], remoteRefs: string[]}>}
 */
export const readPinnedState = async (dir) => {
  const refspecs = await git(dir, 'config', '--get-all', 'remote.origin.fetch')
  await git(dir, 'fetch', '--quiet', 'origin')
  const remoteRefs = await git(
    dir,
    'for-each-ref',
    '--format=%(refname)',
    'refs/remotes'
  )
  const lines = (text) => text.split('\n').filter(Boolean)
  return { refspecs: lines(refspecs), remoteRefs: lines(remoteRefs) }
}
