import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

describe('tim prototype --help', () => {
  test('lists the setup subcommand', async () => {
    const { stdout } = await execa('node', [cliPath, 'prototype', '--help'], {
      reject: false
    })
    expect(stdout).toContain('setup')
    expect(stdout).toContain('designer')
  })
})
