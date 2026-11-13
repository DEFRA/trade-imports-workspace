import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'

describe('tim deps --help', () => {
  test('lists the dependabot subcommand', async () => {
    const { stdout } = await execa('node', [TIM_CLI_PATH, 'deps', '--help'], {
      reject: false
    })

    expect(stdout).toContain('dependabot [options] <repo>')
    expect(stdout).toContain('config/dependency-sets.json')
  })
})
