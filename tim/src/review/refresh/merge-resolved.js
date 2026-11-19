import { assertGitRepo } from '../../exec/git-pin-fetch.js'
import { run } from '../../exec/exec.js'

const linesOf = (text) => text.split('\n').filter((line) => line.length > 0)

const conflictedFilesIn = (message) => {
  const files = []
  let inConflicts = false
  for (const line of message.split('\n')) {
    if (line.startsWith('# Conflicts:')) {
      inConflicts = true
    } else if (inConflicts && line.startsWith('#\t')) {
      files.push(line.slice(2))
    } else if (inConflicts && !line.startsWith('#')) {
      inConflicts = false
    }
  }
  return files
}

const mergeCommitsIn = async (repoDir, window) => {
  const { stdout } = await run(
    'git',
    ['-C', repoDir, 'log', '--merges', '--format=%H', window],
    { stderr: 'inherit' }
  )
  return linesOf(stdout)
}

const conflictsOfMerge = async (repoDir, merge) => {
  const { stdout } = await run('git', [
    '-C',
    repoDir,
    'log',
    '--format=%B',
    '-1',
    merge
  ])
  return conflictedFilesIn(stdout).map((file) => ({ merge, file }))
}

const isUnchangedIn = async (repoDir, window, file) => {
  const { exitCode } = await run('git', [
    '-C',
    repoDir,
    'diff',
    '--quiet',
    window,
    '--',
    file
  ])
  return exitCode === 0
}

/**
 * The files a merge commit in `prior..head` lists under `# Conflicts:`,
 * each with its merge, leaving out a file whose `prior..head` diff is
 * empty. Merges come newest first, files in the order the message lists
 * them. A bad SHA lists nothing, and git's message goes to stderr.
 *
 * @param {object} args
 * @param {string} args.repoDir
 * @param {string} args.prior
 * @param {string} args.head
 * @returns {Promise<{merge: string, file: string}[]>}
 * @throws {TimError} USAGE when `repoDir` is not a git repo
 */
export const listMergeResolved = async ({ repoDir, prior, head }) => {
  assertGitRepo(repoDir)
  const window = `${prior}..${head}`
  const conflicts = []
  for (const merge of await mergeCommitsIn(repoDir, window)) {
    conflicts.push(...(await conflictsOfMerge(repoDir, merge)))
  }
  const resolved = []
  for (const conflict of conflicts) {
    if (!(await isUnchangedIn(repoDir, window, conflict.file))) {
      resolved.push(conflict)
    }
  }
  return resolved
}

/**
 * @param {{merge: string, file: string}[]} resolved
 * @returns {string | null} One `<merge>\t<file>` line each; null when there are none
 */
export const renderMergeResolvedTsv = (resolved) =>
  resolved.length === 0
    ? null
    : resolved.map(({ merge, file }) => `${merge}\t${file}`).join('\n')
