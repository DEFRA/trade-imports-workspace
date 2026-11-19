import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bundledRoster, timWorkspaceRoot } from '../../test-support/roster.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import { resolveBoardId } from './board-id.js'

const workspaces = []

const workspaceWithRoster = (roster) => {
  const root = mkdtempSync(join(tmpdir(), 'tim-board-id-'))
  markWorkspaceRoot(root)
  writeFileSync(join(root, 'repos.json'), JSON.stringify(roster))
  workspaces.push(root)
  return root
}

afterEach(() => {
  workspaces
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
})

describe('resolveBoardId', () => {
  test('takes --board when it is given', () => {
    expect(resolveBoardId({ board: ' 99 ', workspace: timWorkspaceRoot })).toBe(
      '99'
    )
  })

  test("takes the workspace's jiraBoard when --board is left out", () => {
    expect(resolveBoardId({ workspace: timWorkspaceRoot })).toBe(
      String(bundledRoster.jiraBoard)
    )
  })

  test('reads jiraBoard from the repos.json of the workspace it is given', () => {
    const workspace = workspaceWithRoster({
      reposDir: 'repos',
      githubOrg: 'FIXTURE-ORG',
      jiraBoard: 4242,
      repos: []
    })

    expect(resolveBoardId({ workspace })).toBe('4242')
  })

  test('refuses a board id that is not a number', () => {
    expect(() =>
      resolveBoardId({ board: 'abc', workspace: timWorkspaceRoot })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --board as a number, such as 13780.'
      })
    )
  })

  test('asks for --board when repos.json sets no jiraBoard', () => {
    const workspace = workspaceWithRoster({
      reposDir: 'repos',
      githubOrg: 'FIXTURE-ORG',
      repos: []
    })

    expect(() => resolveBoardId({ workspace })).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message:
          'Give --board <id>, such as 13780, or set jiraBoard in repos.json.'
      })
    )
  })
})
