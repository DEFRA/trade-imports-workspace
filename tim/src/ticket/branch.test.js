import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isBranchTicket, setUpTicketBranch } from './branch.js'

describe('#isBranchTicket', () => {
  test.each([
    ['EUDPA-12', true],
    ['NO_JIRA', true],
    ['ABC-1', false],
    ['no_jira', false],
    ['eudpa-12', false]
  ])('Should take %s as a ticket branch key: %s', (ticket, accepted) => {
    expect(isBranchTicket(ticket)).toBe(accepted)
  })
})

describe('#setUpTicketBranch', () => {
  test('Should refuse a repo folder that is not a git checkout', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-ticket-branch-'))
    writeFileSync(
      join(workspaceRoot, 'repos.json'),
      '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n'
    )
    mkdirSync(join(workspaceRoot, 'repos', 'trade-imports-stub'), {
      recursive: true
    })

    const settingUp = setUpTicketBranch({
      workspaceRoot,
      ticket: 'EUDPA-1',
      repo: 'trade-imports-stub',
      slug: 'thing'
    })

    await expect(settingUp).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Error: repo not found or not a git checkout: ${join(workspaceRoot, 'repos', 'trade-imports-stub')}`
    })
  })
})
