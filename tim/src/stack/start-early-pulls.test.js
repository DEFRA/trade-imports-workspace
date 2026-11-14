import { execa } from 'execa'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { stageStackWorkspace } from '../test-support/fake-docker.js'
import { TIM_CLI_PATH } from '../test-support/tim-cli.js'
import { markWorkspaceRoot } from '../test-support/workspace-marker.js'
import { logOutput } from './services.js'
import { startStack } from './start.js'

let workspace

beforeEach(() => {
  workspace = stageStackWorkspace()
  markWorkspaceRoot(workspace.root)
})

afterEach(() => {
  for (const name of ['pull.pid', 'mongo.pid']) {
    const path = join(workspace.root, name)
    if (existsSync(path)) killQuietly(Number(readFileSync(path, 'utf8')))
  }
  workspace.remove()
})

const isRunning = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const killQuietly = (pid) => {
  if (isRunning(pid)) process.kill(pid, 'SIGKILL')
}

const waitFor = async (check, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (check()) return true
    await pause(50)
  }
  return false
}

// A docker whose download of redis runs until it is stopped, recording its
// pid, and whose start of mongo fails, or runs until stopped when asked to.
const writeSlowPullDocker = ({ mongoHangs }) => {
  const bin = join(workspace.root, 'fake-bin')
  mkdirSync(bin)
  const pid = (name) => join(workspace.root, name)
  writeFileSync(
    join(bin, 'docker'),
    [
      '#!/usr/bin/env bash',
      'case " $* " in',
      '  *" config --services "*) printf "mongodb\\nredis\\n" ;;',
      `  *" pull "*" redis "*) echo $$ > '${pid('pull.pid')}'; exec sleep 30 ;;`,
      mongoHangs
        ? `  *" up "*" mongodb "*) echo $$ > '${pid('mongo.pid')}'; exec sleep 30 ;;`
        : '  *" up "*" mongodb "*) exit 1 ;;',
      '  *) exit 0 ;;',
      'esac'
    ].join('\n')
  )
  chmodSync(join(bin, 'docker'), 0o755)
  return `${bin}:${process.env.PATH}`
}

const pullPid = () =>
  Number(readFileSync(join(workspace.root, 'pull.pid'), 'utf8'))

describe('#startStack early downloads', () => {
  test('Should stop a download still running when the start fails', async () => {
    const path = writeSlowPullDocker({ mongoHangs: false })

    const result = await startStack({
      workspaceRoot: workspace.root,
      env: { PATH: path, MONGO_UP_ATTEMPTS: '1' },
      output: logOutput({
        logPath: join(workspace.root, 'start.log'),
        commandLine: 'tim docker up',
        cwd: workspace.root
      })
    })

    expect({
      exitCode: result.exitCode,
      downloadStopped: await waitFor(() => !isRunning(pullPid()))
    }).toEqual({ exitCode: 1, downloadStopped: true })
  }, 30_000)

  test('Should stop a download still running when tim is told to stop', async () => {
    const path = writeSlowPullDocker({ mongoHangs: true })
    const tim = execa(
      'node',
      [TIM_CLI_PATH, '--workspace', workspace.root, 'docker', 'up'],
      {
        env: {
          PATH: path,
          TIM_NO_AUTO_PULL: '1',
          TIM_STACK_LEASE: join(workspace.root, 'stack-lease.json')
        },
        reject: false
      }
    )
    await waitFor(
      () =>
        existsSync(join(workspace.root, 'pull.pid')) &&
        existsSync(join(workspace.root, 'mongo.pid'))
    )

    tim.kill('SIGTERM')
    const exited = await tim

    expect({
      signal: exited.signal,
      downloadStopped: await waitFor(() => !isRunning(pullPid()))
    }).toEqual({ signal: 'SIGTERM', downloadStopped: true })
  }, 30_000)
})
