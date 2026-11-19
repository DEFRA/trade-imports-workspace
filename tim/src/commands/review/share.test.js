import { execa } from 'execa'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  dryRunCases,
  gitCaseArgs,
  gitCases,
  makeWorkspaceRepo,
  observeGit,
  postCommandsIn,
  REVIEWER,
  shareEnv,
  sharedFiles,
  stageShareWorkspace,
  timArgsFor,
  withBodies
} from '../../review/__fixtures__/review-share.js'

const goldenOf = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../../review/__fixtures__/__golden__/${name}`, import.meta.url),
      'utf8'
    )
  )

const dryRunGolden = goldenOf('review-share.json')
const gitGolden = goldenOf('review-share-git.json')

const runDryRunCase = async (shareCase) => {
  const staged = stageShareWorkspace()
  try {
    const run = await recordTimRun(staged, timArgsFor(shareCase), {
      env: shareEnv(staged, shareCase)
    })
    const files =
      shareCase.watch === undefined
        ? {}
        : { files: sharedFiles(staged, shareCase.watch) }
    return { ...withBodies(run), ...files }
  } finally {
    staged.remove()
  }
}

const resultWithoutReviewer = (stdout) => {
  const { reviewer: _reviewer, ...result } = JSON.parse(stdout).result
  return result
}

const BASH_COMMIT_LINE = 'Posted by tools/review/share-review.sh.'
const BASH_NAME = 'running share-review.sh'

const asTimRecords = (recorded) =>
  JSON.parse(
    JSON.stringify(recorded)
      .replaceAll(BASH_COMMIT_LINE, 'Posted by tim review share.')
      .replaceAll(BASH_NAME, 'running tim review share')
  )

const runGitCase = async (gitCase) => {
  const staged = stageShareWorkspace()
  try {
    const env = shareEnv(staged)
    await makeWorkspaceRepo(staged, env)
    const gitIn = (...args) =>
      execa('git', args, { cwd: staged.root, env, extendEnv: true })
    await gitCase.before?.(staged, gitIn)
    const runs = []
    const comments = []
    for (let share = 0; share < gitCase.shares; share++) {
      const run = await recordTimRun(
        staged,
        ['review', 'share', ...gitCaseArgs(gitCase), '--reviewer', REVIEWER],
        { env }
      )
      runs.push({
        exitCode: run.exitCode,
        notes: run.stdout
          .split('\n')
          .filter((line) => line.startsWith('No changes to commit')),
        refusal: run.exitCode === 0 ? '' : run.stderr.trimEnd()
      })
      comments.push(...postCommandsIn(run.stdout))
    }
    return {
      case: gitCase.name,
      runs,
      git: await observeGit(staged, 'chore/EUDPA-201'),
      comments
    }
  } finally {
    staged.remove()
  }
}

describe('tim review share --dry-run', () => {
  test.each(dryRunCases.map((shareCase, index) => [shareCase.name, index]))(
    'Should give the bodies, output and exit code share-review.sh gave: %s',
    async (_name, index) => {
      const shareCase = dryRunCases[index]
      const recorded = dryRunGolden[index]

      const run = await runDryRunCase(shareCase)

      expect(run.exitCode).toBe(recorded.exitCode)
      if (shareCase.usage) {
        expect(run.stderr).toMatch(/^Usage: tim review share EUDPA-XXXXX/)
        return
      }
      expect(run.bodies).toEqual(recorded.bodies)
      expect(run.stderr).toBe(recorded.stderr)
      expect(run.files).toEqual(recorded.files)
      if (shareCase.args.includes('--json')) {
        expect(resultWithoutReviewer(run.stdout)).toEqual(
          JSON.parse(recorded.stdout)
        )
      } else {
        expect(run.stdout).toBe(recorded.stdout)
      }
    },
    60_000
  )
})

describe('tim review share handoff', () => {
  test.each(gitCases.map((gitCase, index) => [gitCase.name, index]))(
    'Should leave the branch, origin and comments share-review.sh left: %s',
    async (_name, index) => {
      const recorded = asTimRecords(gitGolden[index])

      const result = await runGitCase(gitCases[index])

      expect(result).toEqual(recorded)
    },
    60_000
  )
})
