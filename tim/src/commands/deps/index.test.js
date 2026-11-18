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
  test('lists the dependabot, policy and evidence subcommands', async () => {
    const stdout = await helpOf('deps')

    expect(stdout).toContain('dependabot [options] <repo>')
    expect(stdout).toContain('policy [options] <package>')
    expect(stdout).toContain('evidence')
    expect(stdout).toContain('config/dependency-sets.json')
  })

  test('lists the count, check and render evidence subcommands', async () => {
    const stdout = await helpOf('deps', 'evidence')

    expect(stdout).toContain('count <repo> <pattern>')
    expect(stdout).toContain('check [options]')
    expect(stdout).toContain('render [options]')
  })
})
