import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareImplement } from './prepare-implement.js'
import { planningDir } from './workarea.js'

const workspaceWithPlan = ({ ticket, metaText }) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-ticket-implement-'))
  writeFileSync(
    join(workspaceRoot, 'repos.json'),
    '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n'
  )
  const directory = planningDir(workspaceRoot, ticket)
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'plan.md'), '# Plan\n')
  if (metaText !== undefined) {
    writeFileSync(join(directory, '.plan-meta.json'), metaText)
  }
  return workspaceRoot
}

describe('#prepareImplement', () => {
  test('Should write a meta naming no repos when the plan meta is not JSON', async () => {
    const workspaceRoot = workspaceWithPlan({
      ticket: 'EUDPA-9',
      metaText: '{ not json'
    })

    const { directory } = await prepareImplement({
      workspaceRoot,
      ticket: 'EUDPA-9',
      now: () => new Date('2026-11-14T09:30:00.999Z')
    })

    expect(
      JSON.parse(readFileSync(join(directory, '.implement-meta.json'), 'utf8'))
    ).toEqual({
      ticket: 'EUDPA-9',
      plan: 'plan.md',
      validated_at: '2026-11-14T09:30:00Z',
      repos: []
    })
  })

  test('Should refuse a ticket whose plan.md is a folder', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-ticket-implement-'))
    mkdirSync(join(planningDir(workspaceRoot, 'EUDPA-10'), 'plan.md'), {
      recursive: true
    })

    const preparing = prepareImplement({ workspaceRoot, ticket: 'EUDPA-10' })

    await expect(preparing).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Error: plan not found at ${join(planningDir(workspaceRoot, 'EUDPA-10'), 'plan.md')} — run PLANNER first`
    })
  })
})
