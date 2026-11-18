import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { stageStackWorkspace } from '../test-support/fake-docker.js'
import { logOutput } from './services.js'
import { startStack } from './start.js'

const REPO_SERVICES = [
  'trade-imports-animals-frontend',
  'trade-imports-animals-backend',
  'trade-imports-animals-admin'
]
const CLONED_REPOS = [
  'trade-imports-animals-backend',
  'trade-imports-dynamics-gateway',
  'trade-imports-ins-backend'
]
const PROBES_AND_THIRD_PARTY_PULL = [
  ...REPO_SERVICES.map((repo) => `probe-${repo}`),
  'pull-redis'
]
const CLONES = CLONED_REPOS.map((repo) => `clone-${repo}`)

let workspace

beforeEach(() => {
  workspace = stageStackWorkspace()
})

afterEach(() => {
  workspace.remove()
})

// Each call marked with waitForAll records "<mark> overlapped" once every
// mark it names has been made while it waits, or "<mark> alone" after
// 5 seconds without them. A repeated call with the same mark returns at once.
const waitForAllFunction = (marks, log) => [
  'waitForAll() {',
  '  own=$1; shift',
  `  [ -e '${marks}'/"$own" ] && return 0`,
  `  touch '${marks}'/"$own"`,
  '  for _ in $(seq 100); do',
  '    missing=0',
  `    for mark in "$@"; do [ -e '${marks}'/"$mark" ] || missing=1; done`,
  `    if [ $missing = 0 ]; then echo "$own overlapped" >> '${log}'; return 0; fi`,
  '    sleep 0.05',
  '  done',
  `  echo "$own alone" >> '${log}'`,
  '}',
  'repoOf() {',
  '  for arg; do case $arg in https://*) basename "$arg" .git ;; esac; done',
  '}'
]

const writeFakeTools = ({ services }) => {
  const bin = join(workspace.root, 'fake-bin')
  const marks = join(workspace.root, 'marks')
  const log = join(workspace.root, 'side-by-side.log')
  mkdirSync(bin)
  mkdirSync(marks)
  writeFileSync(log, '')
  const header = ['#!/usr/bin/env bash', ...waitForAllFunction(marks, log)]
  writeFileSync(
    join(bin, 'docker'),
    [
      ...header,
      'case " $* " in',
      `  *" config --services "*) printf '${services.join('\\n')}\\n' ;;`,
      `  *" pull "*" redis "*) waitForAll pull-redis ${PROBES_AND_THIRD_PARTY_PULL.join(' ')} ;;`,
      '  *" manifest inspect "*) exit 1 ;;',
      '  *) exit 0 ;;',
      'esac'
    ].join('\n')
  )
  writeFileSync(
    join(bin, 'git'),
    [
      ...header,
      'case " $* " in',
      `  *" ls-remote "*) waitForAll "probe-$(repoOf "$@")" ${PROBES_AND_THIRD_PARTY_PULL.join(' ')} ;;`,
      '  *" clone "*)',
      `    waitForAll "clone-$(repoOf "$@")" ${CLONES.join(' ')}`,
      '    for clone; do :; done',
      '    mkdir -p "$clone/compose" "$clone/servicebus" "$clone/floci"',
      '    touch "$clone/compose/start-floci.sh" "$clone/servicebus/setup-notification-pipeline.sh" "$clone/servicebus/servicebus-config.json" "$clone/floci/setup-ins-backend-pipeline.sh" ;;',
      '  *) exit 0 ;;',
      'esac'
    ].join('\n')
  )
  chmodSync(join(bin, 'docker'), 0o755)
  chmodSync(join(bin, 'git'), 0o755)
  return {
    path: `${bin}:${process.env.PATH}`,
    overlaps: () => readFileSync(log, 'utf8').split('\n').filter(Boolean).sort()
  }
}

const startWith = ({ path, args }) =>
  startStack({
    workspaceRoot: workspace.root,
    args,
    env: { PATH: path },
    output: logOutput({
      logPath: join(workspace.root, 'start.log'),
      commandLine: 'tim docker up',
      cwd: workspace.root
    })
  })

describe('#startStack side by side', () => {
  test('Should look for every branch image while the third-party download runs', async () => {
    const fake = writeFakeTools({
      services: ['mongodb', 'redis', ...REPO_SERVICES]
    })

    await startWith({
      path: fake.path,
      args: ['--branch', 'feat/side-by-side']
    })

    expect(fake.overlaps()).toEqual(
      PROBES_AND_THIRD_PARTY_PULL.map((mark) => `${mark} overlapped`).sort()
    )
  }, 30_000)

  test('Should clone every repo missing from repos/ at the same time', async () => {
    rmSync(join(workspace.root, 'repos'), { recursive: true, force: true })
    const fake = writeFakeTools({ services: ['mongodb'] })

    await startWith({ path: fake.path, args: [] })

    expect(fake.overlaps()).toEqual(
      CLONES.map((mark) => `${mark} overlapped`).sort()
    )
  }, 30_000)
})
