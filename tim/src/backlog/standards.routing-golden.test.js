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
import { TIM_CLI_PATH } from '../test-support/tim-cli.js'
import {
  fixturePaths,
  bakeCases,
  fixtureRepos,
  bestPracticeStubs,
  materialise
} from './__fixtures__/standards/routing-fixtures.js'

/**
 * The file-topics and bake-rules-bundle goldens hold what the Bash routers
 * printed and wrote over a fixed fixture set, in a temporary HOME, with
 * the HOME written as `<HOME>`. `tim style topics` and `tim style bundle`
 * must give the same, apart from the usage line. A deliberate change to
 * `.claude/skills/code-style/assets/routing.json` moves these goldens:
 * edit them to match and read the diff as a change-log entry.
 */

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(here, '..', '..', '..')

let tmpHome
let root

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
  mkdirSync(join(root, 'repos'), { recursive: true })

  stageSkillAssets()
  stubBestPractices()
  materialiseFixtureRepos()
})

afterAll(() => {
  rmSync(tmpHome, { recursive: true, force: true })
})

const redactHome = (text) => (text ?? '').split(tmpHome).join('<HOME>')

const readGolden = (name) =>
  JSON.parse(
    readFileSync(
      join(here, '__fixtures__', 'standards', '__golden__', name),
      'utf8'
    )
  )

const runTimStyle = async (args) => {
  const result = await execa(
    'node',
    [TIM_CLI_PATH, '--workspace', root, 'style', ...args],
    {
      env: { TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined },
      extendEnv: true,
      reject: false
    }
  )
  return {
    exitCode: result.exitCode,
    stdout: redactHome(result.stdout),
    stderr: redactHome(result.stderr),
    rawStdout: result.stdout ?? ''
  }
}

const expectUsageRefused = (run, golden) => {
  expect(run.exitCode).toBe(golden.exitCode)
  expect(run.stdout).toBe('')
  expect(run.stderr).toMatch(/^Usage: tim style /)
}

test('tim style topics prints the frozen file-topics golden for every fixture path, and a usage line with no path', async () => {
  const golden = readGolden('file-topics.json')
  const noPath = golden.find(({ input }) => input === null)

  const runs = await Promise.all(
    fixturePaths.map(async (path) => ({
      path,
      run: await runTimStyle(['topics', path])
    }))
  )
  const noArg = await runTimStyle(['topics'])

  for (const { path, run } of runs) {
    const { exitCode, stdout, stderr } = run
    expect({ input: path, exitCode, stdout, stderr }).toEqual(
      golden.find(({ input }) => input === path)
    )
  }
  expectUsageRefused(noArg, noPath)
})

test('tim style bundle writes the frozen bake-rules-bundle golden for every topic, refuses an unknown one, and prints a usage line with no arguments', async () => {
  const golden = readGolden('bake-rules-bundle.json')

  for (const [index, args] of bakeCases.entries()) {
    const run = await runTimStyle(['bundle', ...args])
    const recorded = golden[index]
    if (args.length === 0) {
      expectUsageRefused(run, recorded)
      continue
    }
    const { exitCode, stdout, stderr, rawStdout } = run
    const entry = { input: args, exitCode, stdout, stderr }
    if (exitCode === 0) entry.bundle = readFileSync(rawStdout.trim(), 'utf8')
    expect(entry).toEqual(recorded)
  }
})

const runTimDetectTech = (args) =>
  execa(
    'node',
    [
      TIM_CLI_PATH,
      '--workspace',
      root,
      'review',
      'detect-tech',
      ...args,
      '--no-ui'
    ],
    {
      env: { TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined },
      extendEnv: true,
      reject: false
    }
  )

const detectTechCase = async (input) => {
  const args = input === null ? [] : [join(tmpHome, 'fixture-repos', input)]
  const result = await runTimDetectTech(args)
  return {
    input,
    exitCode: result.exitCode,
    stdout: redactHome(result.stdout),
    stderr: redactHome(result.stderr)
  }
}

test('tim review detect-tech prints the frozen detect-tech golden for every fixture repo, a missing path and no path', async () => {
  const inputs = [...Object.keys(fixtureRepos), 'does-not-exist', null]
  const golden = readFileSync(
    join(here, '__fixtures__', 'standards', '__golden__', 'detect-tech.json'),
    'utf8'
  )

  const cases = await Promise.all(inputs.map(detectTechCase))

  expect(JSON.stringify(cases, null, 2) + '\n').toBe(golden)
})
