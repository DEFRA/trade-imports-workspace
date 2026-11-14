import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  REPO,
  RUN_FOLDER,
  RUN_ID,
  stageDiscoverWorkspace
} from './__fixtures__/npm-discover-workspace.js'
import { bakeBestPractices } from './best-practices.js'

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

describe('#bakeBestPractices', () => {
  test('Should take the testing guides in name order and leave out a guide that is missing', () => {
    staged = stageDiscoverWorkspace({ command: 'best-practices' })

    const { path } = bakeBestPractices({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repo: REPO
    })

    expect(path).toBe(join(staged.root, RUN_FOLDER, REPO, 'best-practices.md'))
    expect(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('## Source:'))
    ).toEqual([
      '## Source: `docs/best-practices/node/hapi.md`',
      '## Source: `docs/best-practices/node/govuk-frontend.md`',
      '## Source: `docs/best-practices/node/testing/backend.md`',
      '## Source: `docs/best-practices/node/testing/frontend.md`'
    ])
  })

  test.each([
    [{ repo: REPO }, '--run-id required'],
    [{ runId: RUN_ID }, '--repo required']
  ])('Should refuse %j with %s', (options, message) => {
    expect(() =>
      bakeBestPractices({ workspaceRoot: '/nowhere', ...options })
    ).toThrow(expect.objectContaining({ code: 'USAGE', message }))
  })
})
