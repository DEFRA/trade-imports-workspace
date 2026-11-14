import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { reviewDir } from './paths.js'

const DIFF_HEADER = 'diff --git '

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const headerNamesFile = (header, file) => {
  const fields = header.trim().split(/[ \t]+/)
  if (fields.length === 4) {
    return fields[2].slice(2) === file || fields[3].slice(2) === file
  }
  const literal = escapeRegExp(file)
  return (
    new RegExp(`a/${literal}[ \\t\\n\\r\\f\\v]`).test(header) &&
    new RegExp(`b/${literal}$`).test(header)
  )
}

/**
 * The `diff --git` blocks of a unified diff whose header names `file` on
 * either side, so a renamed file matches by its old path or its new one.
 * A header holding a path with a space matches when it has `a/<file>`
 * followed by a space and ends with `b/<file>`.
 *
 * @param {string} diff
 * @param {string} file
 * @returns {string} The matching blocks, each line ending in a newline; empty when none match
 */
export const fileHunksOf = (diff, file) => {
  const lines = diff.split('\n')
  if (lines.at(-1) === '') lines.pop()
  let inBlock = false
  const kept = []
  for (const line of lines) {
    if (line.startsWith(DIFF_HEADER)) inBlock = headerNamesFile(line, file)
    if (inBlock) kept.push(`${line}\n`)
  }
  return kept.join('')
}

/**
 * Where a review keeps a repo's pull request diff.
 *
 * @param {string} workspaceRoot
 * @param {string} reviewId
 * @param {string} repo
 * @returns {string}
 */
export const cachedDiffPath = (workspaceRoot, reviewId, repo) =>
  join(reviewDir(workspaceRoot, reviewId), '.diffs', `${repo}.diff`)

const readCachedDiff = (path) => {
  if (!((statSync(path, { throwIfNoEntry: false })?.size ?? 0) > 0)) {
    throw new TimError(
      'NOT_FOUND',
      `No cached diff at ${path}; pipe gh pr diff in with --stdin`
    )
  }
  return readFileSync(path, 'utf8')
}

/**
 * One file's blocks from a pull request diff: the review's cached diff for
 * the repo, or a diff piped in.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.file]
 * @param {string} [args.ticket] - A review id; with `repo`, reads the review's cached diff
 * @param {string} [args.repo]
 * @param {() => Promise<string>} [args.readStdin] - Given, filters the diff it reads instead
 * @returns {Promise<{repo: string | null, file: string, source: 'cache' | 'stdin', diff: string}>}
 * @throws {TimError} USAGE without a file, or without both --ticket and --repo or --stdin; NOT_FOUND when the cached diff is missing or empty
 */
export const readFileDiff = async ({
  workspaceRoot,
  file,
  ticket,
  repo,
  readStdin
}) => {
  if (!file || (!readStdin && (!ticket || !repo))) {
    throw new TimError(
      'USAGE',
      'Usage: tim review file-diff <file> (--ticket REVIEW-ID --repo REPO | --stdin)'
    )
  }
  if (readStdin) {
    return {
      repo: repo ?? null,
      file,
      source: 'stdin',
      diff: fileHunksOf(await readStdin(), file)
    }
  }
  const cached = readCachedDiff(cachedDiffPath(workspaceRoot, ticket, repo))
  return { repo, file, source: 'cache', diff: fileHunksOf(cached, file) }
}

/**
 * @param {{diff: string}} result - From {@link readFileDiff}
 * @returns {string | null} The blocks without their final newline; null when there are none
 */
export const renderFileDiffText = ({ diff }) =>
  diff === '' ? null : diff.replace(/\n$/, '')
