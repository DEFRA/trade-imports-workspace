import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { stageApplyRepos } from './__fixtures__/govuk-apply.js'
import {
  ADMIN,
  RUN_ID,
  stageGovukWorkspace
} from './__fixtures__/govuk-workspace.js'
import { applyVersion } from './apply.js'

let staged

afterEach(() => staged?.remove())

const stageWithRepos = () => {
  staged = stageGovukWorkspace()
  stageApplyRepos(staged)
}

const applyCollecting = async (version, repo = ADMIN) => {
  const lines = { said: [], warned: [] }
  const result = await applyVersion({
    workspaceRoot: staged.root,
    runId: RUN_ID,
    repo,
    version,
    say: (line) => lines.said.push(line),
    warn: (line) => lines.warned.push(line)
  })
  return { result, ...lines }
}

const adminPackageJson = () =>
  readFileSync(join(staged.root, 'repos', ADMIN, 'package.json'), 'utf8')

describe('#applyVersion', () => {
  test('Should only mark an intermediate noop done, leaving package.json alone', async () => {
    stageWithRepos()
    const before = adminPackageJson()

    const applied = await applyCollecting('5.5.0')

    expect(applied).toEqual({
      result: { outcome: 'noop', repo: ADMIN, version: '5.5.0' },
      said: [
        'Version 5.5.0 classified as noop — recording completion without commit.',
        `Marked ${ADMIN}@5.5.0 as done`
      ],
      warned: []
    })
    expect(adminPackageJson()).toBe(before)
  })

  test('Should warn and change nothing for a version already done', async () => {
    stageWithRepos()

    const applied = await applyCollecting('5.6.0')

    expect(applied).toEqual({
      result: { outcome: 'already-done', repo: ADMIN, version: '5.6.0' },
      said: [],
      warned: ['Version 5.6.0 already done.']
    })
  })

  test('Should refuse a version nobody has classified', async () => {
    stageWithRepos()

    await expect(applyCollecting('5.10.0')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message:
        'Version 5.10.0 is unplanned (classification null) — run Phase 2 first.'
    })
  })

  test('Should refuse a repo that is not cloned', async () => {
    stageWithRepos()

    await expect(
      applyCollecting('6.0.0-beta.1', 'trade-imports-ins-frontend')
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Not a git repo: ${join(staged.root, 'repos', 'trade-imports-ins-frontend')}`
    })
  })
})
