import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execa } from 'execa'
import { afterEach, describe, expect, test } from 'vitest'
import { fetchOrigin } from './fetch-origin.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const git = (cwd, ...args) =>
  execa(
    'git',
    ['-c', 'user.name=tim', '-c', 'user.email=tim@example.test', ...args],
    { cwd }
  )

const cloneWithOrigin = async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-fetch-origin-'))
  const origin = join(root, 'origin.git')
  const seed = join(root, 'seed')
  const clone = join(root, 'clone')
  mkdirSync(origin)
  mkdirSync(seed)
  await git(origin, 'init', '--quiet', '--bare', '--initial-branch=main')
  await git(seed, 'init', '--quiet', '--initial-branch=main')
  await git(seed, 'commit', '--quiet', '--allow-empty', '-m', 'first')
  await git(seed, 'remote', 'add', 'origin', origin)
  await git(seed, 'push', '--quiet', 'origin', 'main')
  await git(root, 'clone', '--quiet', origin, clone)
  return { origin, seed, clone }
}

const headOf = async (cwd, ref) =>
  (await git(cwd, 'rev-parse', ref)).stdout.trim()

describe('#fetchOrigin', () => {
  test('Should bring origin/main up to what origin has now and say it succeeded', async () => {
    const { seed, clone } = await cloneWithOrigin()
    await git(seed, 'commit', '--quiet', '--allow-empty', '-m', 'second')
    await git(seed, 'push', '--quiet', 'origin', 'main')

    const fetched = await fetchOrigin(clone)

    expect({
      fetched,
      originMain: await headOf(clone, 'origin/main')
    }).toEqual({ fetched: true, originMain: await headOf(seed, 'HEAD') })
  })

  test('Should say it failed when origin cannot be reached', async () => {
    const { origin, clone } = await cloneWithOrigin()
    rmSync(origin, { recursive: true, force: true })

    expect(await fetchOrigin(clone)).toBe(false)
  })
})
