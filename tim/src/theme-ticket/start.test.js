import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { createGitWorkspace } from './__fixtures__/theme-ticket-workspace.js'
import { modeOfTrigger, renderStartText, startThemeTicket } from './start.js'

let workspace

afterEach(() => workspace?.remove())

const stageWorkarea = async () => {
  workspace = await createGitWorkspace()
  workspace.write({
    'workareas/release/themes/beta/README.md': 'x\n',
    'workareas/release/themes/alpha/README.md': 'x\n',
    'workareas/release/tickets/zebra/ticket.created.json':
      '{"key":"EUDPA-2"}\n',
    'workareas/release/tickets/apple/ticket.created.json': '{"key":null}\n',
    'workareas/release/tickets/notes.md': 'not a folder\n'
  })
  await workspace.commit('chore: start')
}

describe('#modeOfTrigger', () => {
  test.each([
    ['Which theme tickets are STALE', 'STALE'],
    ['is it out of date', 'STALE'],
    ['stub the theme', 'STUB'],
    ['it was split right off', 'STUB'],
    ['origin has merged', 'MERGE'],
    ['the build loop is starting on origin', 'START'],
    ['the build is starting', 'START'],
    ['write the theme ticket', 'WRITE']
  ])('Should read "%s" as %s', (trigger, mode) => {
    expect(modeOfTrigger(trigger)).toBe(mode)
  })
})

describe('#startThemeTicket', () => {
  test('Should name the mode, the paths and the branch, and list ticket folders in code point order with their keys', async () => {
    await stageWorkarea()

    const started = await startThemeTicket({
      workspaceRoot: workspace.root,
      workarea: 'release',
      theme: 'alpha',
      mode: 'merge'
    })

    expect(started).toEqual({
      mode: 'MERGE',
      workarea: 'release',
      theme: 'alpha',
      branch: 'main',
      workareaDir: `${workspace.root}/workareas/release`,
      ticketsDir: `${workspace.root}/workareas/release/tickets`,
      existingTickets: [
        { folder: 'apple', key: '' },
        { folder: 'zebra', key: 'EUDPA-2' }
      ]
    })
  })

  test('Should make the tickets folder when the workarea has none', async () => {
    workspace = await createGitWorkspace()
    workspace.write({ 'workareas/fresh/README.md': 'x\n' })
    await workspace.commit('chore: start')

    await startThemeTicket({
      workspaceRoot: workspace.root,
      workarea: 'fresh',
      trigger: 'which are stale'
    })

    expect(existsSync(join(workspace.root, 'workareas/fresh/tickets'))).toBe(
      true
    )
  })

  test('Should refuse a mode that needs a theme without one, listing the themes', async () => {
    await stageWorkarea()

    await expect(
      startThemeTicket({ workspaceRoot: workspace.root, workarea: 'release' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'tim theme-ticket start: --theme is required for mode WRITE\nThemes in this workarea:\nalpha\nbeta'
    })
  })

  test('Should refuse an unknown mode as a usage error', async () => {
    await stageWorkarea()

    await expect(
      startThemeTicket({
        workspaceRoot: workspace.root,
        workarea: 'release',
        theme: 'alpha',
        mode: 'later'
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'tim theme-ticket start: unknown --mode LATER (STUB, START, WRITE, MERGE, STALE)'
    })
  })

  test('Should refuse a workarea that is not there', async () => {
    await stageWorkarea()

    await expect(
      startThemeTicket({ workspaceRoot: workspace.root, workarea: 'gone' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `tim theme-ticket start: no workarea at ${workspace.root}/workareas/gone`
    })
  })
})

describe('#renderStartText', () => {
  test('Should print the mode line, then the payload as indented JSON', () => {
    const started = { mode: 'STALE', workarea: 'release', theme: null }

    expect(renderStartText(started)).toBe(
      'MODE: STALE\n{\n  "mode": "STALE",\n  "workarea": "release",\n  "theme": null\n}'
    )
  })
})
