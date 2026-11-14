import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { npmArgsInCheckout } from './npm-exec.js'

const roots = []

afterEach(() => {
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
})

const workspaceWith = (...folders) => {
  const root = mkdtempSync(join(tmpdir(), 'tim-npm-exec-'))
  roots.push(root)
  folders.forEach((folder) =>
    mkdirSync(join(root, folder), { recursive: true })
  )
  return root
}

describe('#npmArgsInCheckout', () => {
  test('Should point npm at the real path of a symlinked repo', () => {
    const root = workspaceWith('elsewhere/app', 'repos')
    symlinkSync(join(root, 'elsewhere/app'), join(root, 'repos/app'))

    const args = npmArgsInCheckout({
      workspaceRoot: root,
      repo: 'app',
      npmArgs: ['test']
    })

    expect(args).toEqual([
      '--prefix',
      realpathSync(join(root, 'elsewhere/app')),
      'test'
    ])
  })

  test('Should point npm at a clone under workareas/clones', () => {
    const root = workspaceWith('workareas/clones/app')

    const args = npmArgsInCheckout({
      workspaceRoot: root,
      clone: 'app',
      npmArgs: ['ci']
    })

    expect(args).toEqual([
      '--prefix',
      realpathSync(join(root, 'workareas/clones/app')),
      'ci'
    ])
  })

  test('Should refuse both a repo and a clone', () => {
    const root = workspaceWith('repos/app')

    expect(() =>
      npmArgsInCheckout({
        workspaceRoot: root,
        repo: 'app',
        clone: 'app',
        npmArgs: ['ci']
      })
    ).toThrow('Give --repo or --clone, not both')
  })

  test('Should refuse a run with no npm subcommand', () => {
    const root = workspaceWith('repos/app')

    expect(() =>
      npmArgsInCheckout({ workspaceRoot: root, repo: 'app', npmArgs: [] })
    ).toThrow('Missing npm subcommand')
  })

  test('Should name the checkout it cannot find', () => {
    const root = workspaceWith()

    expect(() =>
      npmArgsInCheckout({ workspaceRoot: root, repo: 'app', npmArgs: ['ci'] })
    ).toThrow(`Repo not found: ${join(root, 'repos/app')}`)
  })
})
