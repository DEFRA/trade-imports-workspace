import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { run } from './exec.js'
import { nvmDirOf, onRepoNode } from './nvm.js'

const folders = []

afterEach(() => {
  folders
    .splice(0)
    .forEach((folder) => rmSync(folder, { recursive: true, force: true }))
})

const tempFolder = () => {
  const folder = mkdtempSync(join(tmpdir(), 'tim-nvm-'))
  folders.push(folder)
  return folder
}

const stageNvm = () => {
  const nvmDir = join(tempFolder(), 'nvm')
  mkdirSync(nvmDir)
  writeFileSync(
    join(nvmDir, 'nvm.sh'),
    'nvm() { echo "nvm says hello"; export NODE_CHOSEN="$1 $(cat .nvmrc)"; }\n'
  )
  return nvmDir
}

const runIn = async (repo, env) => {
  const {
    command,
    args,
    env: nvmEnv
  } = onRepoNode('printenv', ['NODE_CHOSEN'], env)
  return run(command, args, {
    cwd: repo,
    env: { ...nvmEnv, NODE_CHOSEN: 'none' }
  })
}

describe('#nvmDirOf', () => {
  test('Should use NVM_DIR when it is set', () => {
    expect(nvmDirOf({ NVM_DIR: '/opt/nvm', HOME: '/home/sam' })).toBe(
      '/opt/nvm'
    )
  })

  test('Should fall back to .nvm in HOME', () => {
    expect(nvmDirOf({ HOME: '/home/sam' })).toBe('/home/sam/.nvm')
  })
})

describe('#onRepoNode', () => {
  test('Should run the command after nvm use, in the folder whose .nvmrc it reads', async () => {
    const repo = tempFolder()
    writeFileSync(join(repo, '.nvmrc'), 'v24.22.1\n')

    const result = await runIn(repo, { NVM_DIR: stageNvm() })

    expect(result).toMatchObject({ exitCode: 0, stdout: 'use v24.22.1' })
  })

  test('Should run the command as it is when nvm is not installed', async () => {
    const repo = tempFolder()

    const result = await runIn(repo, { NVM_DIR: join(repo, 'no-nvm') })

    expect(result).toMatchObject({ exitCode: 0, stdout: 'none' })
  })
})
