import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'
import { ADMIN, FRONTEND, RUN_ID } from './govuk-workspace.js'

export const APPLY_SCRIPTS = [
  'tools/govuk/apply-version.sh',
  'tools/govuk/version-mark-implemented.sh',
  'tools/govuk/version-mark-failed.sh'
]

const STUB = 'trade-imports-stub'

/**
 * What apply-version.sh did on every case, as the golden test recorded it.
 *
 * @returns {object[]}
 */
export const readGovukApplyGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/govuk-apply-version.json', import.meta.url),
      'utf8'
    )
  )

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const packageJsons = {
  [ADMIN]: {
    name: ADMIN,
    version: '0.0.0',
    scripts: { test: 'vitest' },
    dependencies: { 'govuk-frontend': '^5.4.0', '@hapi/hapi': '21.4.0' },
    devDependencies: { vitest: '3.2.4' }
  },
  [FRONTEND]: {
    name: FRONTEND,
    version: '0.0.0',
    devDependencies: { 'govuk-frontend': '~5.9.0', vitest: '3.2.4' }
  },
  [STUB]: {
    name: STUB,
    dependencies: { 'govuk-frontend': '5.4.0' }
  }
}

const STUB_NPM = `#!/bin/sh
echo "npm $*"
case "$3" in
  install)
    printf '{\\n  "lockfileVersion": 3\\n}\\n' > "$2/package-lock.json"
    [ "$STUB_NPM_FAIL" = install ] && echo "npm ERR! stub install failure" && exit 1 ;;
  test)
    [ "$STUB_NPM_FAIL" = test ] && echo "FAIL header snapshot" && exit 1 ;;
esac
exit 0
`

/**
 * The environment every apply run gets: the stub `npm` first on PATH and a
 * git identity, clock and config that make every commit SHA the same on
 * every run.
 *
 * @param {{home: string}} staged
 * @returns {Record<string, string>}
 */
export const applyEnv = (staged) => ({
  PATH: `${join(staged.home, 'stub-bin')}:${process.env.PATH}`,
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_AUTHOR_DATE: '1780000000 +0000',
  GIT_COMMITTER_DATE: '1780000000 +0000',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1'
})

const git = (staged, cwd, args) =>
  execFileSync('git', args, {
    cwd,
    env: { ...process.env, ...applyEnv(staged) },
    encoding: 'utf8'
  })

const stageRepo = (staged, repo) => {
  const dir = join(staged.root, 'repos', repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), jsonText(packageJsons[repo]))
  git(staged, dir, ['init', '--quiet', '-b', 'main'])
  git(staged, dir, ['add', '-A'])
  git(staged, dir, ['commit', '--quiet', '-m', 'Initial commit'])
}

/**
 * Adds to a staged govuk workspace the stub `npm` and three repos as real
 * git repos: the admin repo with govuk-frontend in dependencies, the
 * frontend with it in devDependencies, and a repo with no state file.
 *
 * @param {{home: string, root: string}} staged - From `stageGovukWorkspace`
 */
export const stageApplyRepos = (staged) => {
  const bin = join(staged.home, 'stub-bin')
  mkdirSync(bin, { recursive: true })
  writeFileSync(join(bin, 'npm'), STUB_NPM)
  chmodSync(join(bin, 'npm'), 0o755)
  ;[ADMIN, FRONTEND, STUB].forEach((repo) => stageRepo(staged, repo))
}

const statePath = (staged, repo) =>
  join(
    staged.root,
    'workareas',
    'govuk-upgrades',
    RUN_ID,
    repo,
    `versions.${repo}.json`
  )

const classifyTargetAsNoop = (staged) => {
  const path = statePath(staged, ADMIN)
  const state = JSON.parse(readFileSync(path, 'utf8'))
  const versions = state.versions.map((entry) =>
    entry.version === state.target_version
      ? { ...entry, classification: 'noop' }
      : entry
  )
  writeFileSync(path, jsonText({ ...state, versions }))
}

const applyArgs = (repo, version) => [
  '--run-id',
  RUN_ID,
  '--repo',
  repo,
  '--version',
  version
]

/**
 * Each case runs once on a fresh workspace from `stageGovukWorkspace` plus
 * {@link stageApplyRepos}, after its `setUp`. Arguments are the Bash
 * script's: tim takes `--govuk-version` for `--version`.
 */
export const applyCases = [
  { name: 'intermediate todo', repo: ADMIN, args: applyArgs(ADMIN, '5.9.1') },
  {
    name: 'intermediate todo marked final',
    repo: ADMIN,
    args: [...applyArgs(ADMIN, '5.9.1'), '--final']
  },
  {
    name: 'final noop found from the target',
    repo: ADMIN,
    args: applyArgs(ADMIN, '5.10.0'),
    setUp: classifyTargetAsNoop
  },
  {
    name: 'intermediate noop',
    repo: ADMIN,
    args: applyArgs(ADMIN, '5.5.0')
  },
  {
    name: 'failed version applied again',
    repo: ADMIN,
    args: applyArgs(ADMIN, '5.7.0')
  },
  {
    name: 'govuk-frontend in devDependencies',
    repo: FRONTEND,
    args: applyArgs(FRONTEND, '5.9.1')
  },
  {
    name: 'npm install fails',
    repo: ADMIN,
    args: applyArgs(ADMIN, '5.8.0'),
    env: { STUB_NPM_FAIL: 'install' }
  },
  {
    name: 'npm test fails',
    repo: ADMIN,
    args: applyArgs(ADMIN, '5.8.0'),
    env: { STUB_NPM_FAIL: 'test' }
  },
  { name: 'already done', repo: ADMIN, args: applyArgs(ADMIN, '5.6.0') },
  { name: 'unplanned', repo: ADMIN, args: applyArgs(ADMIN, '5.10.0') },
  { name: 'unknown version', repo: ADMIN, args: applyArgs(ADMIN, '4.0.0') },
  {
    name: 'repo with no state file',
    repo: STUB,
    args: applyArgs(STUB, '5.9.1')
  },
  {
    name: 'repo not cloned',
    repo: 'trade-imports-ins-frontend',
    args: applyArgs('trade-imports-ins-frontend', '6.0.0-beta.1')
  }
]

const LOG_PATH = /\/tmp\/govuk-(?:install|test)-[^\s]+?\.txt/g

const COMPACT_TIMESTAMP = /\d{8}T\d{6}Z/g

const normalise = (text, staged) =>
  normaliseRecordedText(text, staged.home).replace(COMPACT_TIMESTAMP, '<STAMP>')

const takeLogs = (staged, run) => {
  const paths = [
    ...new Set([...`${run.stdout}${run.stderr}`.matchAll(LOG_PATH)].flat())
  ]
  const logs = Object.fromEntries(
    paths.map((path) => [
      normalise(path, staged),
      normalise(readFileSync(path, 'utf8'), staged)
    ])
  )
  paths.forEach((path) => rmSync(path, { force: true }))
  return logs
}

const readIfThere = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : null

const repoRecord = (staged, repo) => {
  const dir = join(staged.root, 'repos', repo)
  if (!existsSync(dir)) return null
  return {
    packageJson: readIfThere(join(dir, 'package.json')),
    packageLock: readIfThere(join(dir, 'package-lock.json')),
    log: git(staged, dir, ['log', '--format=%H %s']),
    status: git(staged, dir, ['status', '--porcelain'])
  }
}

/**
 * Sets a case up, runs it and records what it did: exit code, stdout,
 * stderr, the npm logs it wrote (then deletes them), the repo's state file
 * and the repo's package files, git log and status.
 *
 * @param {{home: string, root: string}} staged
 * @param {object} applyCase - One of {@link applyCases}
 * @param {(args: string[], env: Record<string, string>) => Promise<{exitCode: number, stdout: string, stderr: string}>} runApply
 * @returns {Promise<object>}
 */
export const recordApplyCase = async (staged, applyCase, runApply) => {
  applyCase.setUp?.(staged)
  const run = await runApply(applyCase.args, {
    ...applyEnv(staged),
    ...applyCase.env
  })
  return {
    case: applyCase.name,
    input: applyCase.args,
    exitCode: run.exitCode,
    stdout: normalise(run.stdout, staged),
    stderr: normalise(run.stderr, staged),
    logs: takeLogs(staged, run),
    state: normalise(readIfThere(statePath(staged, applyCase.repo)), staged),
    repo: repoRecord(staged, applyCase.repo)
  }
}
