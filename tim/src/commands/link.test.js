import { markWorkspaceRoot } from '../test-support/workspace-marker.js'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  rmSync,
  existsSync,
  readlinkSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { planLink, applyLink, renderText } from './link.js'

let dir
let workspace
let canonical
let other

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-link-'))
  workspace = join(dir, 'checkout')
  mkdirSync(workspace)
  markWorkspaceRoot(workspace)
  mkdirSync(join(workspace, 'repos'))
  canonical = join(dir, 'canonical')
  other = join(dir, 'other-checkout')
  mkdirSync(other)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('#planLink', () => {
  test('already-canonical: workspace IS canonical, no action needed', () => {
    const plan = planLink(workspace, workspace)
    expect(plan).toMatchObject({ ok: true, action: 'already-canonical' })
  })

  test('already-linked: canonical is a symlink already pointing at this checkout', () => {
    symlinkSync(workspace, canonical)
    const plan = planLink(workspace, canonical)
    expect(plan).toMatchObject({
      ok: true,
      action: 'already-linked',
      to: workspace
    })
  })

  test('wrong-symlink: canonical points somewhere else — refuse', () => {
    symlinkSync(other, canonical)
    const plan = planLink(workspace, canonical)
    expect(plan).toMatchObject({
      ok: false,
      action: 'wrong-symlink',
      to: other
    })
    expect(plan.message).toContain('Remove it manually')
  })

  test('blocked-by-non-symlink: canonical exists as a real directory — refuse', () => {
    mkdirSync(canonical)
    const plan = planLink(workspace, canonical)
    expect(plan).toMatchObject({
      ok: false,
      action: 'blocked-by-non-symlink'
    })
    expect(plan.message).toContain('Refusing to clobber')
  })

  test('create: canonical does not exist — plan a new symlink', () => {
    const plan = planLink(workspace, canonical)
    expect(plan).toMatchObject({ ok: true, action: 'create', to: workspace })
  })
})

describe('applyLink', () => {
  test('create plan results in an actual symlink and changes action to "created"', () => {
    const plan = planLink(workspace, canonical)
    const result = applyLink(plan)
    expect(result.action).toBe('created')
    expect(existsSync(canonical)).toBe(true)
    expect(readlinkSync(canonical)).toBe(workspace)
  })

  test('non-create plans are returned unchanged', () => {
    const plan = { ok: true, action: 'already-canonical' }
    expect(applyLink(plan)).toEqual(plan)
  })

  test('creates parent directories as needed', () => {
    const deepCanonical = join(dir, 'nested', 'deep', 'canonical')
    const plan = planLink(workspace, deepCanonical)
    applyLink(plan)
    expect(existsSync(deepCanonical)).toBe(true)
  })
})

describe('renderText', () => {
  test('shapes a friendly message per action', () => {
    expect(renderText({ action: 'already-canonical' })).toContain(
      'Already at canonical path'
    )
    expect(
      renderText({ action: 'already-linked', from: '/a', to: '/b' })
    ).toContain('Already linked')
    expect(renderText({ action: 'created', from: '/a', to: '/b' })).toContain(
      'Linked /a -> /b'
    )
    expect(
      renderText({ action: 'wrong-symlink', message: 'wrong target' })
    ).toBe('wrong target')
  })
})
