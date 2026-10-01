import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import MainMenu from './MainMenu.js'

const createFakeWorkspace = async () => {
  const root = await mkdtemp(join(tmpdir(), 'tim-mm-'))
  await mkdir(join(root, 'repos'))
  await writeFile(join(root, 'Makefile'), '# fake workspace\n')
  return root
}

const ARROW_DOWN = String.fromCharCode(27) + '[B'

let fakeRoot

beforeAll(async () => {
  fakeRoot = await createFakeWorkspace()
})

afterAll(async () => {
  await rm(fakeRoot, { recursive: true, force: true })
})

describe('MainMenu', () => {
  test('opens on the top-level menu with every command group listed', () => {
    const { lastFrame } = render(
      createElement(MainMenu, { workspaceRoot: fakeRoot })
    )

    const frame = lastFrame()
    expect(frame).toContain('tim')
    expect(frame).toContain('Workspace')
    expect(frame).toContain('Quit')
  })

  test('drives Workspace → Status all the way to the rendered status output', async () => {
    const { stdin, lastFrame } = render(
      createElement(MainMenu, { workspaceRoot: fakeRoot })
    )

    stdin.write('\r')
    await vi.waitFor(() => expect(lastFrame()).toContain('Workspace'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toContain('Workspace status'))
    expect(lastFrame()).toContain('trade-imports-animals-frontend')
    expect(lastFrame()).toContain('Not cloned')
  })

  test('pressing Enter on the status output returns the user to the top-level menu', async () => {
    const { stdin, lastFrame } = render(
      createElement(MainMenu, { workspaceRoot: fakeRoot })
    )

    stdin.write('\r')
    await vi.waitFor(() => expect(lastFrame()).toContain('Workspace'))
    await new Promise((resolve) => setTimeout(resolve, 30))
    stdin.write('\r')
    await vi.waitFor(() => expect(lastFrame()).toContain('Workspace status'))

    await new Promise((resolve) => setTimeout(resolve, 30))
    stdin.write('\r')
    await vi.waitFor(() => expect(lastFrame()).toContain('command group'))
  })

  test('selecting Auth drives the probe and renders the auth results', async () => {
    const probe = async () => [
      { service: 'github', ok: true, user: { login: 'sam' } },
      { service: 'jira', ok: true, user: { displayName: 'Sam F' } },
      { service: 'confluence', ok: true, user: { user: 'sam' } }
    ]
    const { stdin, lastFrame } = render(
      createElement(MainMenu, { workspaceRoot: fakeRoot, probe })
    )

    // Workspace, Docker, Start, Auth — three down arrows
    for (let i = 0; i < 3; i++) {
      stdin.write(ARROW_DOWN)
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toContain('signed in'))
    expect(lastFrame()).toContain('github')
    expect(lastFrame()).toContain('jira')
    expect(lastFrame()).toContain('confluence')
  })

  test('selecting Jira and submitting a ticket id renders the ticket result end-to-end', async () => {
    const getTicket = async (id) => ({
      id,
      summary: 'Plan the rollout',
      status: 'In Dev',
      type: 'Story',
      assignee: 'Sam',
      priority: 'High',
      description: 'Get it shipped.'
    })

    const { stdin, lastFrame } = render(
      createElement(MainMenu, { workspaceRoot: fakeRoot, getTicket })
    )

    // Workspace, Docker, Start, Auth, Jira — four down arrows
    for (let i = 0; i < 4; i++) {
      stdin.write(ARROW_DOWN)
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Look up a ticket/i))
    await new Promise((resolve) => setTimeout(resolve, 30))
    stdin.write('\r')
    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('EUDPA-200')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toContain('Plan the rollout'))
    expect(lastFrame()).toContain('In Dev')
  })

  test('selecting Docker > Dev launches run-stack.sh with -d via the injected launcher', async () => {
    const captured = []
    const launchStackScript = async (spec) => captured.push(spec)
    const { stdin, lastFrame } = render(
      createElement(MainMenu, {
        workspaceRoot: fakeRoot,
        launchStackScript
      })
    )

    // Workspace, Docker — one down
    stdin.write(ARROW_DOWN)
    await new Promise((resolve) => setTimeout(resolve, 30))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toMatch(/run-stack\.sh/))

    // Docker submenu: Up (0), Dev (1) — one down
    stdin.write(ARROW_DOWN)
    await new Promise((resolve) => setTimeout(resolve, 30))
    stdin.write('\r')

    await vi.waitFor(() => expect(captured).toHaveLength(1))
    expect(captured[0]).toEqual({
      workspaceRoot: fakeRoot,
      script: 'run-stack.sh',
      args: ['-d']
    })
  })
})
