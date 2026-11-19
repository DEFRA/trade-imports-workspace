import { execa } from 'execa'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

/**
 * A committed, clean workspace repo holding `config/nightly-jobs.json` with
 * the given jobs, and ignoring `workareas/` as the real workspace does.
 *
 * @param {object[]} [jobs]
 * @returns {Promise<string>} The workspace root
 */
export const createNightlyWorkspace = async (jobs = [nightlyJob()]) => {
  const root = createCliWorkspace('tim-nightly-')
  writeNightlyJobs(root, { jobs })
  writeFileSync(join(root, '.gitignore'), 'workareas/\n')
  await execa('git', ['init', '--quiet', '-b', 'main', root])
  await execa('git', ['-C', root, 'add', '.'])
  await execa('git', [
    ...IDENTITY,
    '-C',
    root,
    'commit',
    '--quiet',
    '-m',
    'workspace'
  ])
  return root
}
