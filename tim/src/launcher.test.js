import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { execa } from 'execa'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cliToRun, workspaceFlagValue } from './launcher.js'
import { markWorkspaceRoot } from './test-support/workspace-marker.js'

const timRoot = fileURLToPath(new URL('..', import.meta.url))
const launcherPath = join(timRoot, 'src', 'launcher.js')
const ownCli = join(timRoot, 'src', 'cli.js')

const isNotTestFile = (source) => !source.endsWith('.test.js')

const writeRoster = (workspaceRoot, repoNames) =>
  writeFileSync(
    join(workspaceRoot, 'repos.json'),
    JSON.stringify({
      reposDir: 'repos',
      githubOrg: 'DEFRA',
      repos: repoNames.map((name) => ({ name, stack: 'node' }))
    })
  )

const makeWorkspace = (base, name) => {
  const workspaceRoot = join(base, name)
  mkdirSync(join(workspaceRoot, 'repos'), { recursive: true })
  markWorkspaceRoot(workspaceRoot)
  return workspaceRoot
}

const copyTimInto = (workspaceRoot, version) => {
  const timFolder = join(workspaceRoot, 'tim')
  cpSync(join(timRoot, 'src'), join(timFolder, 'src'), {
    recursive: true,
    filter: isNotTestFile
  })
  writeFileSync(
    join(timFolder, 'package.json'),
    JSON.stringify({ name: 'tim', version, type: 'module' })
  )
  symlinkSync(join(timRoot, 'node_modules'), join(timFolder, 'node_modules'))
}

const writeStubTim = (workspaceRoot, { withDependencies }) => {
  const srcFolder = join(workspaceRoot, 'tim', 'src')
  mkdirSync(srcFolder, { recursive: true })
  writeFileSync(
    join(srcFolder, 'cli.js'),
    'process.stdout.write(process.argv[1])\n'
  )
  if (withDependencies) mkdirSync(join(workspaceRoot, 'tim', 'node_modules'))
}

const runGlobalTim = (globalTim, args, cwd) =>
  execa('node', [globalTim, ...args], {
    cwd,
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: '' }
  })

describe('#workspaceFlagValue', () => {
  test('Should read the path after a separate --workspace flag', () => {
    expect(workspaceFlagValue(['status', '--workspace', '/ws', '--json'])).toBe(
      '/ws'
    )
  })

  test('Should read the path joined to --workspace with an equals sign', () => {
    expect(workspaceFlagValue(['status', '--workspace=/ws'])).toBe('/ws')
  })

  test('Should give undefined when no --workspace flag is passed', () => {
    expect(workspaceFlagValue(['status', '--json'])).toBeUndefined()
  })
})

describe('#cliToRun', () => {
  let base

  beforeAll(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'tim-launcher-unit-')))
  })

  afterAll(() => {
    rmSync(base, { recursive: true, force: true })
  })

  test('Should pick the cli.js of the clone the current folder sits in', () => {
    const clone = makeWorkspace(base, 'clone-by-cwd')
    writeRoster(clone, ['fixture-a'])
    writeStubTim(clone, { withDependencies: true })
    mkdirSync(join(clone, 'repos', 'deep'), { recursive: true })

    const cliPath = cliToRun({
      args: ['hello'],
      env: {},
      cwd: join(clone, 'repos', 'deep'),
      ownCli
    })

    expect(cliPath).toBe(join(clone, 'tim', 'src', 'cli.js'))
  })

  test('Should pick the clone named by --workspace over the current folder', () => {
    const named = makeWorkspace(base, 'clone-by-flag')
    const standingIn = makeWorkspace(base, 'clone-standing-in')
    for (const clone of [named, standingIn]) {
      writeRoster(clone, ['fixture-a'])
      writeStubTim(clone, { withDependencies: true })
    }

    const cliPath = cliToRun({
      args: ['workspace', 'status', '--workspace', named],
      env: {},
      cwd: standingIn,
      ownCli
    })

    expect(cliPath).toBe(join(named, 'tim', 'src', 'cli.js'))
  })

  test('Should pick the clone named by TIM_WORKSPACE over the current folder', () => {
    const named = makeWorkspace(base, 'clone-by-env')
    const standingIn = makeWorkspace(base, 'clone-env-standing-in')
    for (const clone of [named, standingIn]) {
      writeRoster(clone, ['fixture-a'])
      writeStubTim(clone, { withDependencies: true })
    }

    const cliPath = cliToRun({
      args: ['hello'],
      env: { TIM_WORKSPACE: named },
      cwd: standingIn,
      ownCli
    })

    expect(cliPath).toBe(join(named, 'tim', 'src', 'cli.js'))
  })

  test('Should keep its own cli.js for a workspace that holds no tim', () => {
    const workspaceRoot = makeWorkspace(base, 'no-tim')
    writeRoster(workspaceRoot, ['fixture-a'])

    const cliPath = cliToRun({
      args: ['hello'],
      env: {},
      cwd: workspaceRoot,
      ownCli
    })

    expect(cliPath).toBe(realpathSync(ownCli))
  })

  test('Should keep its own cli.js for a workspace with no repos.json', () => {
    const workspaceRoot = makeWorkspace(base, 'no-roster')
    writeStubTim(workspaceRoot, { withDependencies: true })

    const cliPath = cliToRun({
      args: ['hello'],
      env: {},
      cwd: workspaceRoot,
      ownCli
    })

    expect(cliPath).toBe(realpathSync(ownCli))
  })
})

describe('global tim launched from one of several clones', () => {
  let base
  let globalTim
  let cloneOne
  let cloneTwo

  beforeAll(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'tim-launcher-clones-')))
    mkdirSync(join(base, 'bin'))
    globalTim = join(base, 'bin', 'tim')
    symlinkSync(launcherPath, globalTim)

    cloneOne = makeWorkspace(base, 'clone-one')
    writeRoster(cloneOne, ['clone-one-web', 'clone-one-admin'])
    copyTimInto(cloneOne, '1.0.0')

    cloneTwo = makeWorkspace(base, 'clone-two')
    writeRoster(cloneTwo, ['clone-two-web'])
    copyTimInto(cloneTwo, '2.0.0')
  })

  afterAll(() => {
    rmSync(base, { recursive: true, force: true })
  })

  test.each([
    ['clone-one', () => cloneOne, '1.0.0'],
    ['clone-two', () => cloneTwo, '2.0.0']
  ])('Should run the tim code inside %s', async (_name, cloneOf, version) => {
    const { stdout, exitCode } = await runGlobalTim(
      globalTim,
      ['hello', '--json'],
      cloneOf()
    )

    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout).tim_version).toBe(version)
  })

  test.each([
    ['clone-one', () => cloneOne, ['clone-one-web', 'clone-one-admin']],
    ['clone-two', () => cloneTwo, ['clone-two-web']]
  ])(
    'Should list the repos in the repos.json of %s',
    async (_name, cloneOf, repoNames) => {
      const { stdout, exitCode } = await runGlobalTim(
        globalTim,
        ['workspace', 'status', '--json'],
        join(cloneOf(), 'repos')
      )

      expect(exitCode).toBe(0)
      expect(JSON.parse(stdout).result.map(({ repo }) => repo)).toEqual(
        repoNames
      )
    }
  )

  test('Should run the clone cli.js as the script path', async () => {
    const stubClone = makeWorkspace(base, 'stub-clone')
    writeRoster(stubClone, ['fixture-a'])
    writeStubTim(stubClone, { withDependencies: true })

    const { stdout, exitCode } = await runGlobalTim(
      globalTim,
      ['hello'],
      stubClone
    )

    expect(exitCode).toBe(0)
    expect(stdout).toBe(join(stubClone, 'tim', 'src', 'cli.js'))
  })

  test('Should refuse a clone whose tim has no dependencies installed', async () => {
    const bareClone = makeWorkspace(base, 'bare-clone')
    writeRoster(bareClone, ['fixture-a'])
    writeStubTim(bareClone, { withDependencies: false })

    const { stderr, stdout, exitCode } = await runGlobalTim(
      globalTim,
      ['hello'],
      bareClone
    )

    expect(exitCode).toBe(2)
    expect(stdout).toBe('')
    expect(stderr).toBe(
      `The tim in ${join(bareClone, 'tim')} has no dependencies installed. Run npm ci in that folder, then try again.`
    )
  })
})
