import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  FRONTEND,
  INS,
  stageStartWorkspace
} from './__fixtures__/govuk-start.js'
import { ensureBranch } from './ensure-branch.js'

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const branchOf = (repo) =>
  execFileSync('git', ['branch', '--show-current'], {
    cwd: join(staged.root, 'repos', repo),
    encoding: 'utf8'
  }).trim()

const ensure = async (repo, branch) => {
  const said = []
  const result = await ensureBranch({
    workspaceRoot: staged.root,
    repo,
    branch,
    say: (line) => said.push(line)
  })
  return { result, said, current: branchOf(repo) }
}

describe('#ensureBranch', () => {
  test.each([
    [ADMIN, 'created', `${ADMIN}: created and switched to chore/EUDPA-500`],
    [
      FRONTEND,
      'switched to existing branch',
      `${FRONTEND}: switched to existing branch chore/EUDPA-500`
    ],
    [
      INS,
      'tracking origin',
      `${INS}: switched to chore/EUDPA-500, tracking origin/chore/EUDPA-500`
    ]
  ])(
    'Should put %s on the branch with the outcome %s',
    async (repo, outcome, line) => {
      staged = stageStartWorkspace()

      const ensured = await ensure(repo, 'chore/EUDPA-500')

      expect(ensured.result).toEqual({
        repo,
        branch: 'chore/EUDPA-500',
        outcome
      })
      expect(ensured.said.at(-1)).toBe(line)
      expect(ensured.current).toBe('chore/EUDPA-500')
    }
  )

  test('Should leave a repo already on the branch where it is', async () => {
    staged = stageStartWorkspace()

    const ensured = await ensure(ADMIN, 'main')

    expect(ensured).toEqual({
      result: { repo: ADMIN, branch: 'main', outcome: 'already on' },
      said: [`${ADMIN}: already on main`],
      current: 'main'
    })
  })

  test('Should refuse a folder that is not a git repo', async () => {
    staged = stageStartWorkspace()
    mkdirSync(join(staged.root, 'repos', 'not-cloned'))

    await expect(
      ensureBranch({
        workspaceRoot: staged.root,
        repo: 'not-cloned',
        branch: 'main'
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Not a git repo: ${join(staged.root, 'repos', 'not-cloned')}`
    })
  })
})
