import { execa } from 'execa'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { repoPath } from '../constants/repos.js'
import { createCliWorkspace } from './tim-cli.js'

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=tim-test@example.invalid'
]

export const nightlyJob = (overrides = {}) => ({
  name: 'digest',
  skill: 'nightly-digest',
  prompt: 'Run the nightly-digest skill unattended.',
  cron: '53 5 * * *',
  enabled: true,
  purpose: 'Write the morning digest.',
  ...overrides
})

export const writeNightlyJobs = (workspaceRoot, registry) => {
  mkdirSync(join(workspaceRoot, 'config'), { recursive: true })
  writeFileSync(
    join(workspaceRoot, 'config', 'nightly-jobs.json'),
    typeof registry === 'string' ? registry : JSON.stringify(registry)
  )
}

export const writeStopFile = (workspaceRoot, text) => {
  mkdirSync(join(workspaceRoot, 'workareas', 'nightly'), { recursive: true })
  writeFileSync(join(workspaceRoot, 'workareas', 'nightly', 'STOP'), text)
}

const commitAll = async (root, message) => {
  await execa('git', ['-C', root, 'add', '.'])
  await execa('git', [
    ...IDENTITY,
    '-C',
    root,
    'commit',
    '--quiet',
    '-m',
    message
  ])
}

const initCommittedRepo = async (root, message) => {
  await execa('git', ['init', '--quiet', '-b', 'main', root])
  await commitAll(root, message)
}

export const writeWorkspaceFile = (root, relativePath, text) => {
  mkdirSync(dirname(join(root, relativePath)), { recursive: true })
  writeFileSync(join(root, relativePath), text)
}

export const commitWorkspaceFile = async (root, relativePath, text) => {
  writeWorkspaceFile(root, relativePath, text)
  await commitAll(root, relativePath)
}

/**
 * A committed, clean workspace repo holding `config/nightly-jobs.json` with
 * the given jobs, ignoring `repos/`, and `workareas/` apart from
 * `workareas/shared/`, as the real workspace does.
 *
 * @param {object[]} [jobs]
 * @returns {Promise<string>} The workspace root
 */
export const createNightlyWorkspace = async (jobs = [nightlyJob()]) => {
  const root = createCliWorkspace('tim-nightly-')
  writeNightlyJobs(root, { jobs })
  writeFileSync(
    join(root, '.gitignore'),
    '/repos/\nworkareas/*\n!workareas/shared/\n'
  )
  await initCommittedRepo(root, 'workspace')
  return root
}

/**
 * A committed, clean repo cloned at `repos/<repo>` in the workspace.
 *
 * @param {string} workspaceRoot
 * @param {string} repo - A repo named in the roster
 * @returns {Promise<string>} The repo's path
 */
export const createNightlyRepo = async (workspaceRoot, repo) => {
  const path = repoPath(workspaceRoot, repo)
  writeWorkspaceFile(path, 'README.md', `${repo}\n`)
  await initCommittedRepo(path, repo)
  return path
}
