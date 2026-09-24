import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

describe('tim spec', () => {
  test('registers lint and gaps as subcommands', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'spec', '--help'],
      {
        reject: false,
        env: { TIM_NO_AUTO_PULL: '1' }
      }
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain('lint')
    expect(stdout).toContain('gaps')
    expect(stdout).toContain('Behaviour Spec')
  })

  test('spec lint --help describes the check groups', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'spec', 'lint', '--help'],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain('--capability')
    expect(stdout).toContain('--root')
  })

  test('spec gaps --help describes the narrowing flags', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'spec', 'gaps', '--help'],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain('--none')
    expect(stdout).toContain('--partial')
  })
})
