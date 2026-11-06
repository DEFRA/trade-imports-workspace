import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
  readFileSync,
  existsSync
} from 'node:fs'
import { once } from 'node:events'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { keepAwakeCommand, keepSystemAwakeWhile } from './keep-awake.js'

let sandbox

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'tim-keep-awake-'))
})

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true })
})

const binWithRecordingCaffeinate = () => {
  const bin = join(sandbox, 'bin')
  const recorded = join(sandbox, 'caffeinate-args')
  mkdirSync(bin)
  writeFileSync(join(bin, 'caffeinate'), `#!/bin/sh\necho "$@" > ${recorded}\n`)
  chmodSync(join(bin, 'caffeinate'), 0o755)
  return { env: { PATH: `${bin}:/bin:/usr/bin` }, recorded }
}

describe('#keepAwakeCommand', () => {
  test('holds a Mac out of idle and system sleep until the process ends', () => {
    expect(keepAwakeCommand({ pid: 4242, platform: 'darwin' })).toEqual({
      command: 'caffeinate',
      args: ['-s', '-i', '-w', '4242']
    })
  })

  test('has no command on Linux', () => {
    expect(keepAwakeCommand({ pid: 4242, platform: 'linux' })).toBeNull()
  })
})

describe('#keepSystemAwakeWhile', () => {
  test('starts caffeinate waiting on the given process on a Mac', async () => {
    const { env, recorded } = binWithRecordingCaffeinate()

    const holder = keepSystemAwakeWhile({ pid: 4242, platform: 'darwin', env })
    await once(holder, 'exit')

    expect(readFileSync(recorded, 'utf8')).toBe('-s -i -w 4242\n')
  })

  test('starts nothing on Linux', () => {
    const { env, recorded } = binWithRecordingCaffeinate()

    const holder = keepSystemAwakeWhile({ pid: 4242, platform: 'linux', env })

    expect(holder).toBeNull()
    expect(existsSync(recorded)).toBe(false)
  })

  test('says why when caffeinate cannot start, and carries on', async () => {
    const emptyBin = join(sandbox, 'empty')
    mkdirSync(emptyBin)
    const warnings = []

    const holder = keepSystemAwakeWhile({
      pid: 4242,
      platform: 'darwin',
      env: { PATH: emptyBin },
      warn: (message) => warnings.push(message)
    })
    await new Promise((resolve) => holder.on('close', resolve))

    expect(warnings).toEqual([
      "Can't stop the machine sleeping while process 4242 runs: spawn caffeinate ENOENT. A machine that sleeps freezes the stack and every test running against it."
    ])
  })
})
