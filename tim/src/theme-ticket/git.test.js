import { afterEach, describe, expect, test } from 'vitest'
import { createGitWorkspace } from './__fixtures__/theme-ticket-workspace.js'
import { currentBranch, gitOutput } from './git.js'

let workspace

afterEach(() => workspace?.remove())

describe('#currentBranch', () => {
  test('Should name the checked-out branch', async () => {
    workspace = await createGitWorkspace()
    await workspace.commit('chore: start')
    await workspace.git('checkout', '-q', '-b', 'feat/KEY-1-flow')

    expect(await currentBranch(workspace.root)).toBe('feat/KEY-1-flow')
  })
})

describe('#gitOutput', () => {
  test('Should refuse with git’s own reason when git fails', async () => {
    workspace = await createGitWorkspace()
    await workspace.commit('chore: start')

    await expect(
      gitOutput(workspace.root, ['log', 'nope'])
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: expect.stringMatching(/^git log nope failed: fatal: .*nope/)
    })
  })
})
