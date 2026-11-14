import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { stageStackWorkspace } from '../test-support/fake-docker.js'
import { logOutput } from './services.js'
import { startStack } from './start.js'

let workspace

beforeEach(() => {
  workspace = stageStackWorkspace()
})

afterEach(() => workspace.remove())

const writeExecutable = (path, body) => {
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

// A Docker Desktop that has quit: docker answers only once `open -a Docker`
// has run, and then names one service and starts it.
const dockerThatQuit = () => {
  const bin = join(workspace.root, 'fake-bin')
  mkdirSync(bin)
  const running = join(workspace.root, 'docker-running')
  writeExecutable(
    join(bin, 'docker'),
    [
      `if [ ! -f "${running}" ]; then echo "Cannot connect to the Docker daemon. Is the docker daemon running?" >&2; exit 1; fi`,
      'case " $* " in',
      '  *" config --services "*) echo redis ;;',
      '  *" up "*) echo "redis started" ;;',
      'esac'
    ].join('\n')
  )
  writeExecutable(join(bin, 'open'), `touch "${running}"`)
  return {
    PATH: `${bin}:${process.env.PATH}`,
    TIM_DOCKER_START_POLL_MS: '10',
    TIM_DOCKER_START_WAIT_MS: '2000'
  }
}

describe.runIf(process.platform === 'darwin')('#startStack', () => {
  test('Should start Docker Desktop when it has quit, then start the stack', async () => {
    const logPath = join(workspace.root, 'up.log')

    const result = await startStack({
      workspaceRoot: workspace.root,
      env: dockerThatQuit(),
      output: logOutput({
        logPath,
        commandLine: 'tim docker up',
        cwd: workspace.root
      })
    })

    expect({
      exitCode: result.exitCode,
      started: readFileSync(logPath, 'utf8').includes('redis started')
    }).toEqual({ exitCode: 0, started: true })
  })
})
