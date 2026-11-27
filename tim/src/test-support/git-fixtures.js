import { execa } from 'execa'
import { chmodSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=tim-test@example.invalid'
]

const git = (cwd, ...args) => execa('git', [...IDENTITY, ...args], { cwd })

const commitFile = async (workPath, fileName, contents, message) => {
  writeFileSync(join(workPath, fileName), contents)
  await git(workPath, 'add', fileName)
  await git(workPath, 'commit', '--quiet', '-m', message)
  const { stdout } = await git(workPath, 'rev-parse', 'HEAD')
  return stdout.trim()
}

/**
 * Build a local bare "origin" shaped like a product repo: main with a
 * tag, a feature branch, and (optionally) an orphan gh-pages branch of
 * published artifacts — the shape the gh-pages truncate job produces.
 * Bare path is `<baseDir>/<repoName>.git` so tests can point
 * `TIM_GITHUB_BASE_URL=file://<baseDir>` at it.
 *
 * @returns {Promise<{barePath: string, workPath: string, shas: {main: string, feature: string, ghPages: string|null}}>}
 */
export const createBareRepo = async (
  baseDir,
  repoName,
  { withGhPages = true } = {}
) => {
  const workPath = join(baseDir, `${repoName}-work`)
  const barePath = join(baseDir, `${repoName}.git`)
  const shas = { main: null, feature: null, ghPages: null }

  await execa('git', ['init', '--quiet', '-b', 'main', workPath])
  shas.main = await commitFile(
    workPath,
    'README.md',
    `# ${repoName}\n`,
    'initial commit'
  )
  await git(workPath, 'tag', 'v1.0.0')

  await git(workPath, 'switch', '--quiet', '-c', 'feature/example')
  shas.feature = await commitFile(
    workPath,
    'feature.txt',
    'feature work\n',
    'feature commit'
  )

  if (withGhPages) {
    await git(workPath, 'switch', '--quiet', '--orphan', 'gh-pages')
    shas.ghPages = await commitFile(
      workPath,
      'report.html',
      '<html>report</html>\n',
      'publish report'
    )
  }

  await git(workPath, 'switch', '--quiet', 'main')
  await execa('git', ['clone', '--quiet', '--bare', workPath, barePath])
  await git(workPath, 'remote', 'add', 'origin', barePath)
  return { barePath, workPath, shas }
}

/**
 * Commit to a branch in the fixture work repo and push it to the bare
 * origin — simulates upstream activity (a colleague's push, a pages
 * publish) between tim runs.
 *
 * @returns {Promise<string>} The new commit's sha
 */
export const pushCommit = async (workPath, branch, fileName) => {
  await git(workPath, 'switch', '--quiet', branch)
  const sha = await commitFile(
    workPath,
    fileName,
    `${fileName}\n`,
    `update ${fileName}`
  )
  await git(workPath, 'push', '--quiet', 'origin', branch)
  await git(workPath, 'switch', '--quiet', 'main')
  return sha
}

/**
 * Give a clone a committer name and email, so a commit made in it by the code
 * under test does not depend on the machine's own git identity.
 */
export const configureIdentity = async (dir) => {
  await git(dir, 'config', 'user.name', 'tim-test')
  await git(dir, 'config', 'user.email', 'tim-test@example.invalid')
}

/**
 * Install a pre-commit hook in a clone that refuses every commit, writing
 * `message` to stderr.
 */
export const installRefusingPreCommitHook = (dir, message) => {
  const hook = join(dir, '.git', 'hooks', 'pre-commit')
  writeFileSync(hook, `#!/bin/sh\necho "${message}" >&2\nexit 1\n`)
  chmodSync(hook, 0o755)
}

/**
 * Full clone with git's default fetch refspec — the pre-exclusion
 * state of a long-lived dev clone, gh-pages objects and all.
 */
export const createFatClone = async (barePath, dir) => {
  await execa('git', ['clone', '--quiet', `file://${barePath}`, dir])
}

/**
 * Ref names with `origin/HEAD` left out, so a recording holds the branches
 * a run left and not git's pointer at the remote's default branch. Whether
 * a fetch writes that pointer when it is missing differs between git
 * versions, and `tim workspace branch` leaves it out of a branch list for
 * the same reason.
 *
 * @param {string[]} refNames
 * @returns {string[]}
 */
export const branchRefsOnly = (refNames) =>
  refNames.filter(
    (refName) =>
      refName !== 'refs/remotes/origin/HEAD' && refName !== 'origin/HEAD'
  )
