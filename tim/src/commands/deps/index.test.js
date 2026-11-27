import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'

const helpOf = async (...command) => {
  const { stdout } = await execa('node', [TIM_CLI_PATH, ...command, '--help'], {
    reject: false
  })
  return stdout
}

describe('tim deps --help', () => {
  test('lists the dependabot, policy, evidence, hold, holds, lift, drift and versions subcommands', async () => {
    const stdout = await helpOf('deps')

    expect(stdout).toContain('dependabot [options] <repo>')
    expect(stdout).toContain('policy [options] <package>')
    expect(stdout).toContain('evidence')
    expect(stdout).toContain('hold [options] <package>')
    expect(stdout).toMatch(/^ {2}holds\b/m)
    expect(stdout).toMatch(/^ {2}lift (\[options\] )?<package>/m)
    expect(stdout).toMatch(/^ {2}drift \[options\]/m)
    expect(stdout).toMatch(/^ {2}versions (\[options\] )?<package>/m)
    expect(stdout).toContain('config/dependency-sets.json')
  })

  test('lists the count, check and render evidence subcommands', async () => {
    const stdout = await helpOf('deps', 'evidence')

    expect(stdout).toContain('count <repo> <pattern>')
    expect(stdout).toContain('check [options]')
    expect(stdout).toContain('render [options]')
  })
})
