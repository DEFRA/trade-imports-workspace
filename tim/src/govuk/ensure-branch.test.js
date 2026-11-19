import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  FRONTEND,
  INS,
  commitLocally,
  giveEveryRepoAnOrigin,
  stageStartWorkspace,
  startEnv
} from './__fixtures__/govuk-start.js'
import { ensureBranch, reposWithUncommittedChanges } from './ensure-branch.js'

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

const gitIn = (repo, args) =>
  execFileSync('git', args, {
    cwd: join(staged.root, 'repos', repo),
    env: { ...process.env, ...startEnv(staged) },
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

  test('Should create a missing branch from the start point, not from HEAD, without tracking it', async () => {
    staged = stageStartWorkspace()
    giveEveryRepoAnOrigin(staged)
    commitLocally(staged, ADMIN, 'local.txt')
    const branch = 'chore/EUDPA-802-govuk-frontend-5.10.0'

    const said = []
    const result = await ensureBranch({
      workspaceRoot: staged.root,
      repo: ADMIN,
      branch,
      startPoint: 'origin/main',
      say: (line) => said.push(line)
    })

    expect(result.outcome).toBe('created from start point')
    expect(said.at(-1)).toBe(
      `${ADMIN}: created ${branch} from origin/main and switched to it`
    )
    expect(gitIn(ADMIN, ['rev-parse', 'HEAD'])).toBe(
      gitIn(ADMIN, ['rev-parse', 'origin/main'])
    )
    expect(
      gitIn(ADMIN, [
        'for-each-ref',
        '--format=%(upstream)',
        `refs/heads/${branch}`
      ])
    ).toBe('')
  })

  test('Should fetch origin before choosing, so a start point pushed since the last fetch is used', async () => {
    staged = stageStartWorkspace()
    giveEveryRepoAnOrigin(staged)
    const pushed = commitLocally(staged, ADMIN, 'pushed.txt')
    gitIn(ADMIN, ['push', '--quiet', 'origin', 'HEAD:refs/heads/main'])
    gitIn(ADMIN, ['update-ref', 'refs/remotes/origin/main', 'HEAD~1'])

    await ensureBranch({
      workspaceRoot: staged.root,
      repo: ADMIN,
      branch: 'chore/NO_JIRA-govuk-frontend-5.10.0',
      startPoint: 'origin/main'
    })

    expect(gitIn(ADMIN, ['rev-parse', 'HEAD'])).toBe(pushed)
  })

  test('Should refuse with UNKNOWN when origin cannot be fetched', async () => {
    staged = stageStartWorkspace()

    await expect(
      ensureBranch({
        workspaceRoot: staged.root,
        repo: ADMIN,
        branch: 'chore/NO_JIRA-govuk-frontend-5.10.0',
        startPoint: 'origin/main'
      })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: `Can't fetch origin in ${join(staged.root, 'repos', ADMIN)}.`
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

describe('#reposWithUncommittedChanges', () => {
  test('Should list the repos with a changed tracked file or an untracked file, in the order given', async () => {
    staged = stageStartWorkspace()
    writeFileSync(join(staged.root, 'repos', INS, 'package.json'), '{}\n')
    writeFileSync(join(staged.root, 'repos', ADMIN, 'notes.txt'), 'Draft\n')

    const dirty = await reposWithUncommittedChanges(staged.root, [
      INS,
      FRONTEND,
      ADMIN
    ])

    expect(dirty).toEqual([INS, ADMIN])
  })
})
