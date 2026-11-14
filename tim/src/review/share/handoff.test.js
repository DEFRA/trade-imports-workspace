import { execa } from 'execa'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  makeWorkspaceRepo,
  observeGit,
  shareEnv,
  stageShareWorkspace
} from '../__fixtures__/review-share.js'
import { pushHandoffBranch } from './handoff.js'
import { copyReviewWithoutClones } from './shared-copy.js'

const BRANCH = 'chore/EUDPA-201'

const stagedRepo = async () => {
  const staged = stageShareWorkspace()
  await makeWorkspaceRepo(staged, shareEnv(staged))
  const git = (...args) => execa('git', args, { cwd: staged.root })
  await git('config', 'user.name', 'Fixture Author')
  await git('config', 'user.email', 'fixture@example.com')
  const sharedDir = join(staged.root, 'workareas/shared/EUDPA-201')
  copyReviewWithoutClones(
    join(staged.root, 'workareas/reviews/EUDPA-201'),
    sharedDir
  )
  return { staged, git, sharedDir }
}

describe('#pushHandoffBranch', () => {
  test('Should return to the starting branch with the commit kept when the push fails', async () => {
    const { staged, git, sharedDir } = await stagedRepo()
    try {
      await git('remote', 'set-url', 'origin', join(staged.home, 'missing.git'))

      const pushing = pushHandoffBranch({
        workspaceRoot: staged.root,
        ticket: 'EUDPA-201',
        branch: BRANCH,
        sharedDir
      })

      await expect(pushing).rejects.toMatchObject({
        code: 'UNKNOWN',
        message: expect.stringMatching(
          /^git push --quiet -u origin chore\/EUDPA-201 failed: /
        )
      })
      const state = await observeGit(staged, BRANCH)
      expect({
        current: state.current,
        commits: state.commits[0],
        pushed: state.pushed
      }).toEqual({
        current: 'main',
        commits: 'review(EUDPA-201): handoff artefacts',
        pushed: false
      })
    } finally {
      staged.remove()
    }
  })

  test('Should put the shared copy back and stay on the starting branch when the checkout fails', async () => {
    const { staged, sharedDir } = await stagedRepo()
    try {
      const checkingOut = pushHandoffBranch({
        workspaceRoot: staged.root,
        ticket: 'EUDPA-201',
        branch: 'bad..name',
        sharedDir
      })

      await expect(checkingOut).rejects.toMatchObject({ code: 'UNKNOWN' })
      const state = await observeGit(staged, 'bad..name')
      expect({
        current: state.current,
        shared: state.status.filter((line) => line.endsWith('review-index.md'))
      }).toEqual({
        current: 'main',
        shared: ['?? workareas/shared/EUDPA-201/review-index.md']
      })
    } finally {
      staged.remove()
    }
  })
})
