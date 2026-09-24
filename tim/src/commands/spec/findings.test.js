import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let root

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

const runTim = (args) =>
  execa('node', [cliPath, '--json', ...args, '--workspace', root], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedWorkspace = async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-findings-cli-'))
  const repoDir = join(root, 'repos', 'trade-imports-x')
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
  return repoSha
}

const payloadPath = (name, body) => {
  const path = join(root, name)
  writeFileSync(path, JSON.stringify(body))
  return path
}

describe('tim spec findings seed', () => {
  test('writes a catch-up run and report from a payload file', async () => {
    await seedWorkspace()
    const file = payloadPath('payload.json', {
      date: '2026-09-24',
      findings: [
        {
          id: 'F-001',
          verdict: 'stale-link',
          capability: 'live-animals/addresses',
          judgement: 'The behaviour is unchanged and only the test moved.',
          proposal: {
            file: 'openspec/coverage/live-animals/addresses/coverage.json',
            diff: '-old\n+new'
          }
        }
      ],
      noActionBucket: { capabilities: 0 }
    })

    const result = await runTim([
      'spec',
      'findings',
      'seed',
      '--skill',
      'catchup',
      '--file',
      file
    ])

    expect(result.exitCode).toBe(0)
    const payload = JSON.parse(result.stdout.trim())
    expect(payload.result.run).toBe('workareas/spec-catchup/2026-09-24')
    expect(
      readFileSync(join(root, payload.result.report), 'utf8')
    ).toContain('Spec catch-up — 2026-09-24')
  })

  test('refuses to overwrite a ruled run without --force', async () => {
    await seedWorkspace()
    const file = payloadPath('payload.json', {
      date: '2026-09-24',
      findings: [
        {
          id: 'F-001',
          verdict: 'stale-link',
          capability: 'x',
          judgement: 'The behaviour is unchanged and only the test moved.'
        }
      ]
    })

    const seeded = await runTim([
      'spec',
      'findings',
      'seed',
      '--skill',
      'catchup',
      '--file',
      file
    ])
    expect(seeded.exitCode).toBe(0)

    const ruled = await runTim([
      'spec',
      'findings',
      'rule',
      'F-001',
      '--skill',
      'catchup',
      '--accept'
    ])
    expect(ruled.exitCode).toBe(0)
    expect(JSON.parse(ruled.stdout.trim()).result.status).toBe('accepted')

    const onDisk = JSON.parse(
      readFileSync(
        join(root, 'workareas', 'spec-catchup', '2026-09-24', 'findings.json'),
        'utf8'
      )
    )
    expect(onDisk.findings[0].disposition).toBe('accept')

    const second = await runTim([
      'spec',
      'findings',
      'seed',
      '--skill',
      'catchup',
      '--file',
      file
    ])

    expect(second.exitCode).not.toBe(0)
    const envelope = JSON.parse(second.stdout.trim())
    expect(envelope.ok).toBe(false)
    expect(envelope.errors[0].message).toMatch(/already has rulings/)
  })
})

describe('tim spec baseline --advance --require-ruled', () => {
  test('refuses until the catch-up run is ruled and applied, then advances', async () => {
    await seedWorkspace()
    const file = payloadPath('payload.json', {
      date: '2026-09-24',
      findings: [
        {
          id: 'F-001',
          verdict: 'stale-link',
          capability: 'x',
          judgement: 'The behaviour is unchanged and only the test moved.'
        }
      ],
      noActionBucket: { capabilities: 0 }
    })

    await runTim([
      'spec',
      'findings',
      'seed',
      '--skill',
      'catchup',
      '--file',
      file
    ])

    const blocked = await runTim([
      'spec',
      'baseline',
      '--advance',
      '--require-ruled'
    ])
    expect(blocked.exitCode).not.toBe(0)
    expect(JSON.parse(blocked.stdout.trim()).errors[0].message).toMatch(
      /Can't advance the baseline yet/
    )

    const accepted = await runTim([
      'spec',
      'findings',
      'rule',
      'F-001',
      '--skill',
      'catchup',
      '--accept'
    ])
    expect(accepted.exitCode).toBe(0)

    const applied = await runTim([
      'spec',
      'findings',
      'applied',
      'F-001',
      '--skill',
      'catchup'
    ])
    expect(applied.exitCode).toBe(0)

    const advanced = await runTim([
      'spec',
      'baseline',
      '--advance',
      '--require-ruled'
    ])
    expect(advanced.exitCode).toBe(0)
    const body = JSON.parse(advanced.stdout.trim()).result
    expect(body.after.verifiedAt).toBe(new Date().toISOString().slice(0, 10))
    expect(body.ruledRun).toContain('spec-catchup/2026-09-24')
  })
})
