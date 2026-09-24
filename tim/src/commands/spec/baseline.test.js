import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderBaselineText, renderAdvanceText } from './baseline.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

describe('renderBaselineText', () => {
  test('reports the verified date and each repo sha', () => {
    const text = renderBaselineText({
      verifiedAt: '2026-09-16',
      verifiedBy: '8932fbf9',
      repos: { 'trade-imports-x': 'a'.repeat(40) }
    })

    expect(text).toContain(
      'Behaviour Spec baseline: verified 2026-09-16 (8932fbf9).'
    )
    expect(text).toContain('trade-imports-x')
  })
})

describe('renderAdvanceText', () => {
  test('names each repo that moved, and leaves unchanged repos alone', () => {
    const text = renderAdvanceText(
      {
        before: {
          verifiedAt: '2026-09-01',
          verifiedBy: 'oldsha01',
          repos: { a: '1'.repeat(40), b: '2'.repeat(40) }
        },
        after: {
          verifiedAt: '2026-09-23',
          verifiedBy: 'newsha01',
          repos: { a: '9'.repeat(40), b: '2'.repeat(40) }
        }
      },
      '/workspace'
    )

    expect(text).toContain('2026-09-01 (oldsha01) -> 2026-09-23 (newsha01)')
    expect(text).toMatch(/a\s+1{12} -> 9{12}/)
    expect(text).toMatch(/b\s+unchanged/)
    expect(text).toContain('commit it yourself')
  })

  test('names the catch-up run when --require-ruled checked one', () => {
    const text = renderAdvanceText(
      {
        before: {
          verifiedAt: '2026-09-01',
          verifiedBy: 'oldsha01',
          repos: { a: '1'.repeat(40) }
        },
        after: {
          verifiedAt: '2026-09-23',
          verifiedBy: 'newsha01',
          repos: { a: '9'.repeat(40) }
        },
        ruledRun: '/workspace/workareas/spec-catchup/2026-09-24'
      },
      '/workspace'
    )

    expect(text).toContain(
      'Checked against catch-up run workareas/spec-catchup/2026-09-24.'
    )
  })
})

let root
let repoDir

const git = (dir, args) =>
  execa('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', ...args], {
    cwd: dir
  })

const gitInit = async (dir) => {
  await execa('git', ['init', '--quiet', '-b', 'main', dir])
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', '-m', 'initial'])
}

const headSha = async (dir) =>
  (await execa('git', ['-C', dir, 'rev-parse', 'HEAD'])).stdout.trim()

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const runTim = (args) =>
  execa('node', [cliPath, ...args, '--workspace', root], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

describe('tim spec baseline --advance CLI', () => {
  test('writes a new baseline and running it again is idempotent', async () => {
    root = mkdtempSync(join(tmpdir(), 'tim-spec-baseline-cli-'))
    repoDir = join(root, 'repos', 'trade-imports-x')
    mkdirSync(repoDir, { recursive: true })
    writeFileSync(join(repoDir, 'a.js'), 'x')
    await gitInit(repoDir)
    const repoSha = await headSha(repoDir)

    mkdirSync(join(root, 'openspec'), { recursive: true })
    writeFileSync(
      join(root, 'openspec', 'baseline.json'),
      JSON.stringify({
        verifiedAt: '2026-09-01',
        verifiedBy: 'oldsha01',
        repos: { 'trade-imports-x': repoSha }
      })
    )
    await gitInit(root)

    const first = await runTim(['spec', 'baseline', '--advance', '--json'])
    const second = await runTim(['spec', 'baseline', '--advance', '--json'])

    expect(first.exitCode).toBe(0)
    expect(second.exitCode).toBe(0)
    expect(JSON.parse(second.stdout.trim()).result.after).toEqual(
      JSON.parse(first.stdout.trim()).result.after
    )
  })
})
