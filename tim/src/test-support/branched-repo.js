import { execa } from 'execa'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=tim-test@example.invalid'
]

export const BRANCH = 'feat/x'

export const git = (dir, ...args) =>
  execa('git', [...IDENTITY, ...args], { cwd: dir })

export const writeFiles = (dir, files) => {
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), contents)
  }
}

export const commitAll = async (dir, message) => {
  await git(dir, 'add', '--all')
  await git(dir, 'commit', '--quiet', '-m', message)
}

export const createRepoOnBranchFromMain = async (dir, files) => {
  await execa('git', ['init', '--quiet', '-b', 'main', dir])
  writeFiles(dir, files)
  await commitAll(dir, 'main')
  await git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD')
  await git(dir, 'switch', '--quiet', '-c', BRANCH)
}
