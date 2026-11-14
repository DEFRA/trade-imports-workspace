import { execa } from 'execa'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const recordPushScript = 'scripts/sonar/sonar-record-push.sh'
export const checkPendingScript = 'scripts/sonar/sonar-check-pending.sh'
export const checksFolder = '.sonar-checks'

export const FIXED_NOW = 1763100000

const sonarFixturePath = (name) =>
  fileURLToPath(
    new URL(`../../test-support/fixtures/sonar/${name}`, import.meta.url)
  )

const FIXED_GIT_ENV = {
  GIT_AUTHOR_NAME: 'tim-test',
  GIT_AUTHOR_EMAIL: 'tim-test@example.invalid',
  GIT_AUTHOR_DATE: '2026-11-14T07:00:00Z',
  GIT_COMMITTER_NAME: 'tim-test',
  GIT_COMMITTER_EMAIL: 'tim-test@example.invalid',
  GIT_COMMITTER_DATE: '2026-11-14T07:00:00Z'
}

const git = (cwd, ...args) =>
  execa('git', args, { cwd, env: FIXED_GIT_ENV, extendEnv: true })

const writeExecutable = (path, body) =>
  writeFileSync(path, `#!/bin/sh\n${body}\n`, { mode: 0o755 })

const stageStandInCommands = (home) => {
  const bin = join(home, 'bin')
  mkdirSync(bin)
  writeExecutable(join(bin, 'date'), `echo ${FIXED_NOW}`)
  writeExecutable(
    join(bin, 'sonar'),
    [
      'case "$*" in',
      `  "api get /api/project_pull_requests/list?project=DEFRA_trade-imports-animals-frontend") cat '${sonarFixturePath('pull-requests.json')}' ;;`,
      '  "api get "*) echo \'{"pullRequests":[]}\' ;;',
      `  *"--pull-request 484 "*) cat '${sonarFixturePath('issues-pull-request.json')}' ;;`,
      '  *) echo \'{"issues":[]}\' ;;',
      'esac'
    ].join('\n')
  )
  return bin
}

/**
 * A staged workspace holding both sonar hook scripts, with the stand-in
 * commands first on PATH and CLAUDE_PROJECT_DIR pointing at the workspace.
 */
export const stageSonarHookWorkspace = () => {
  const staged = stageBashWorkspace({
    scripts: [recordPushScript, checkPendingScript]
  })
  const bin = stageStandInCommands(staged.home)
  return {
    ...staged,
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      CLAUDE_PROJECT_DIR: staged.root
    }
  }
}

const createPushedRepo = async (root, repoName, branch) => {
  const remote = join(root, 'remotes', `${repoName}.git`)
  const repo = join(root, 'repos', repoName)
  await execa('git', ['init', '--quiet', '--bare', '-b', 'main', remote])
  await execa('git', ['init', '--quiet', '-b', 'main', repo])
  writeFileSync(join(repo, 'README.md'), `# ${repoName}\n`)
  await git(repo, 'add', 'README.md')
  await git(repo, 'commit', '--quiet', '-m', 'initial commit')
  await git(repo, 'remote', 'add', 'origin', remote)
  if (branch !== 'main') await git(repo, 'switch', '--quiet', '-c', branch)
  await git(repo, 'push', '--quiet', '-u', 'origin', branch)
  return repo
}

const headOf = async (repo) => (await git(repo, 'rev-parse', 'HEAD')).stdout

/**
 * Repos the push recorder walks: the frontend's feature branch is pushed,
 * so it is the one recorded; the admin repo is on main; the backend has a
 * commit it has not pushed; the gateway's pushed commit is already seen.
 *
 * @returns {Promise<{project: string, sha: string, branch: string}>} the commit the recorder should record
 */
export const stagePushedRepos = async (root) => {
  const frontend = await createPushedRepo(
    root,
    'trade-imports-animals-frontend',
    'feat/EUDPA-1-pushed'
  )
  await createPushedRepo(root, 'trade-imports-animals-admin', 'main')
  const backend = await createPushedRepo(
    root,
    'trade-imports-animals-backend',
    'feat/EUDPA-2-not-pushed'
  )
  writeFileSync(join(backend, 'local.txt'), 'local\n')
  await git(backend, 'add', 'local.txt')
  await git(backend, 'commit', '--quiet', '-m', 'local commit')
  const gateway = await createPushedRepo(
    root,
    'trade-imports-dynamics-gateway',
    'feat/EUDPA-3-seen'
  )
  mkdirSync(join(root, checksFolder), { recursive: true })
  writeFileSync(
    join(
      root,
      checksFolder,
      `seen__DEFRA_trade-imports-dynamics-gateway__${await headOf(gateway)}`
    ),
    ''
  )
  return {
    project: 'DEFRA_trade-imports-animals-frontend',
    sha: await headOf(frontend),
    branch: 'feat/EUDPA-1-pushed'
  }
}

const frontend = 'DEFRA_trade-imports-animals-frontend'

/**
 * Pending checks covering every way the check hook settles one: analysed
 * with issues, analysed and clean, a pull request whose analysed commit is
 * older, fresh, exactly 45 minutes old, and with no push time.
 */
export const pendingCheckFiles = {
  [`seen__${frontend}__dddddddddddddddddddddddddddddddddddddddd`]: '',
  [`pending__${frontend}__8ac42f0992109ab3f8202bde47e1c39514b1649f`]: `feat/EUDPA-696-overview-and-review\n${FIXED_NOW - 600}\n`,
  [`pending__${frontend}__d7cf87ef31461d549759443b9fa1b9bb5ae59deb`]: `chore/NO_JIRA-bash-to-tim\n${FIXED_NOW - 600}\n`,
  [`pending__${frontend}__eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`]: `feat/EUDPA-696-overview-and-review\n${FIXED_NOW - 60}\n`,
  [`pending__${frontend}__aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`]: `feat/fresh\n${FIXED_NOW - 2699}\n`,
  [`pending__${frontend}__bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`]: `feat/stale\n${FIXED_NOW - 2700}\n`,
  'pending__DEFRA_trade-imports-animals-admin__cccccccccccccccccccccccccccccccccccccccc':
    'feat/no-push-time\n'
}

/**
 * Writes {@link pendingCheckFiles} into the workspace's checks folder.
 */
export const stagePendingChecks = (root) => {
  const folder = join(root, checksFolder)
  mkdirSync(folder, { recursive: true })
  for (const [fileName, content] of Object.entries(pendingCheckFiles)) {
    writeFileSync(join(folder, fileName), content)
  }
  return folder
}

export const goldenPath = '__fixtures__/__golden__/sonar-hooks.json'
