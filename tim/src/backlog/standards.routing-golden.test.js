import { test, beforeAll, afterAll, expect } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  fixturePaths,
  bakeCases,
  fixtureRepos,
  bestPracticeStubs,
  materialise
} from './__fixtures__/standards/routing-fixtures.js'

/**
 * Captures the three bash routers' (`file-topics.sh`, `bake-rules-bundle.sh`,
 * `detect-tech.sh`) output against a fixed fixture set, in a temporary HOME
 * so the routers' hardcoded `$HOME/git/defra/trade-imports-workspace` path
 * resolves into an isolated tree.
 *
 * Run once with `--update` on the UNMODIFIED scripts (inc-012 plan step
 * S1) — that snapshot is req-122 ac-1's "before". After the routing moves
 * into data, this test runs again with no update flag: an unchanged
 * snapshot is the "after" half of the same claim. Every occurrence of the
 * temporary HOME in a script's own stdout/stderr is replaced with
 * `<HOME>` first, so the snapshot does not embed a path unique to one
 * test run.
 */

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(here, '..', '..', '..')

const FILE_TOPICS_SCRIPT = 'tools/style/file-topics.sh'
const BAKE_RULES_BUNDLE_SCRIPT = 'tools/style/bake-rules-bundle.sh'
const DETECT_TECH_SCRIPT = 'tools/review/detect-tech.sh'

let tmpHome
let root

const stageRouterScripts = () => {
  for (const rel of [
    FILE_TOPICS_SCRIPT,
    BAKE_RULES_BUNDLE_SCRIPT,
    DETECT_TECH_SCRIPT
  ]) {
    const dest = join(root, rel)
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(join(workspaceRoot, rel), dest)
  }
}

const stageSkillAssets = () => {
  cpSync(
    join(workspaceRoot, '.claude', 'skills', 'code-style', 'assets'),
    join(root, '.claude', 'skills', 'code-style', 'assets'),
    { recursive: true }
  )
  cpSync(
    join(workspaceRoot, '.claude', 'skills', 'review', 'assets'),
    join(root, '.claude', 'skills', 'review', 'assets'),
    { recursive: true }
  )
}

const stubBestPractices = () => {
  for (const rel of bestPracticeStubs) {
    const dest = join(root, rel)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, `stub: ${rel}\n`)
  }
}

const materialiseFixtureRepos = () => {
  for (const [name, files] of Object.entries(fixtureRepos)) {
    const repoDir = join(tmpHome, 'fixture-repos', name)
    mkdirSync(repoDir, { recursive: true })
    materialise(repoDir, files)
  }
}

beforeAll(() => {
  tmpHome = mkdtempSync(join(tmpdir(), 'tim-standards-golden-'))
  root = join(tmpHome, 'git', 'defra', 'trade-imports-workspace')
  mkdirSync(root, { recursive: true })

  stageRouterScripts()
  stageSkillAssets()
  stubBestPractices()
  materialiseFixtureRepos()
})

afterAll(() => {
  rmSync(tmpHome, { recursive: true, force: true })
})

const redactHome = (text) => (text ?? '').split(tmpHome).join('<HOME>')

const runScript = async (relScript, args) => {
  const result = await execa('/bin/bash', [join(root, relScript), ...args], {
    env: { HOME: tmpHome },
    extendEnv: true,
    reject: false
  })
  return {
    recorded: {
      exitCode: result.exitCode,
      stdout: redactHome(result.stdout),
      stderr: redactHome(result.stderr)
    },
    rawStdout: result.stdout ?? ''
  }
}

test('file-topics.sh over every fixture path, unmodified', async () => {
  const cases = []
  for (const path of fixturePaths) {
    const { recorded } = await runScript(FILE_TOPICS_SCRIPT, [path])
    cases.push({ input: path, ...recorded })
  }
  const noArg = await runScript(FILE_TOPICS_SCRIPT, [])
  cases.push({ input: null, ...noArg.recorded })

  await expect(JSON.stringify(cases, null, 2) + '\n').toMatchFileSnapshot(
    '__fixtures__/standards/__golden__/file-topics.json'
  )
})

test('bake-rules-bundle.sh over every topic, unmodified', async () => {
  const cases = []
  for (const args of bakeCases) {
    const { recorded, rawStdout } = await runScript(
      BAKE_RULES_BUNDLE_SCRIPT,
      args
    )
    const entry = { input: args, ...recorded }
    if (recorded.exitCode === 0) {
      entry.bundle = readFileSync(rawStdout.trim(), 'utf8')
    }
    cases.push(entry)
  }

  await expect(JSON.stringify(cases, null, 2) + '\n').toMatchFileSnapshot(
    '__fixtures__/standards/__golden__/bake-rules-bundle.json'
  )
})

test('detect-tech.sh over every fixture repo, unmodified', async () => {
  const cases = []
  for (const name of Object.keys(fixtureRepos)) {
    const { recorded } = await runScript(DETECT_TECH_SCRIPT, [
      join(tmpHome, 'fixture-repos', name)
    ])
    cases.push({ input: name, ...recorded })
  }
  const missing = await runScript(DETECT_TECH_SCRIPT, [
    join(tmpHome, 'fixture-repos', 'does-not-exist')
  ])
  cases.push({ input: 'does-not-exist', ...missing.recorded })
  const noArg = await runScript(DETECT_TECH_SCRIPT, [])
  cases.push({ input: null, ...noArg.recorded })

  await expect(JSON.stringify(cases, null, 2) + '\n').toMatchFileSnapshot(
    '__fixtures__/standards/__golden__/detect-tech.json'
  )
})
