import { execa } from 'execa'
import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  dryRunCases,
  ghCommentCalls,
  gitCaseArgs,
  gitCases,
  makeWorkspaceRepo,
  observeGit,
  shareEnv,
  shareScripts,
  sharedFiles,
  stageShareWorkspace,
  withBodies
} from './__fixtures__/review-share.js'

const SHARE_SCRIPT = 'tools/review/share-review.sh'

const recordDryRun = async (shareCase) => {
  const staged = stageShareWorkspace({ scripts: shareScripts })
  try {
    const run = await recordBashRun(staged, SHARE_SCRIPT, shareCase.args, {
      env: shareEnv(staged, shareCase),
      exactOutput: true
    })
    const files =
      shareCase.watch === undefined
        ? {}
        : { files: sharedFiles(staged, shareCase.watch) }
    return {
      case: shareCase.name,
      input: shareCase.args,
      ...withBodies(run),
      ...files
    }
  } finally {
    staged.remove()
  }
}

const noteLines = (stdout) =>
  stdout.split('\n').filter((line) => line.startsWith('No changes to commit'))

const recordGitCase = async (gitCase) => {
  const staged = stageShareWorkspace({ scripts: shareScripts })
  try {
    const env = shareEnv(staged)
    await makeWorkspaceRepo(staged, env)
    const gitIn = (...args) =>
      execa('git', args, { cwd: staged.root, env, extendEnv: true })
    await gitCase.before?.(staged, gitIn)
    const runs = []
    for (let share = 0; share < gitCase.shares; share++) {
      const run = await recordBashRun(
        staged,
        SHARE_SCRIPT,
        gitCaseArgs(gitCase),
        { env }
      )
      runs.push({
        exitCode: run.exitCode,
        notes: noteLines(run.stdout),
        refusal: run.exitCode === 0 ? '' : run.stderr
      })
    }
    return {
      case: gitCase.name,
      runs,
      git: await observeGit(staged, 'chore/EUDPA-201'),
      comments: ghCommentCalls(staged)
    }
  } finally {
    staged.remove()
  }
}

test.skipIf(!shareScripts.every(workspaceScriptExists))(
  'share-review.sh --dry-run gives the recorded output, exit code, comment bodies and shared copy for every case',
  async () => {
    const recordings = []
    for (const shareCase of dryRunCases) {
      recordings.push(await recordDryRun(shareCase))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/review-share.json'
    )
  },
  300_000
)

test.skipIf(!shareScripts.every(workspaceScriptExists))(
  'share-review.sh leaves the recorded handoff branch, origin and comments for every git state',
  async () => {
    const recordings = []
    for (const gitCase of gitCases) {
      recordings.push(await recordGitCase(gitCase))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/review-share-git.json'
    )
  },
  300_000
)
