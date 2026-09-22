import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
  readFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  stackScriptPath,
  runStackScript,
  runStackScriptToLog,
  stackContainers,
  STACK_PROJECT
} from './stack.js'

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-stack-'))
  mkdirSync(join(workspace, 'scripts', 'stack'), { recursive: true })
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const writeStackScript = (name, body) => {
  const path = join(workspace, 'scripts', 'stack', name)
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
  return path
}

describe('stackScriptPath', () => {
  test('returns the absolute path to an existing script', () => {
    writeStackScript('run-stack.sh', 'echo hi')
    expect(stackScriptPath(workspace, 'run-stack.sh')).toBe(
      join(workspace, 'scripts', 'stack', 'run-stack.sh')
    )
  })

  test('throws TimError(USAGE) when the script is missing', () => {
    expect(() => stackScriptPath(workspace, 'no-such.sh')).toThrowError(
      /Cannot find no-such.sh/
    )
  })
})

describe('runStackScript', () => {
  test('runs the script and returns its exit code', async () => {
    writeStackScript('run-stack.sh', 'exit 0')
    const result = await runStackScript({
      workspaceRoot: workspace,
      script: 'run-stack.sh'
    })
    expect(result.exitCode).toBe(0)
  })

  test('propagates a non-zero exit code from the script', async () => {
    writeStackScript('run-stack.sh', 'exit 7')
    const result = await runStackScript({
      workspaceRoot: workspace,
      script: 'run-stack.sh'
    })
    expect(result.exitCode).toBe(7)
  })

  test('passes args through to the script and surfaces them via the exit code', async () => {
    // Script exits with the number of args it received
    writeStackScript('run-stack.sh', 'exit $#')
    const result = await runStackScript({
      workspaceRoot: workspace,
      script: 'run-stack.sh',
      args: ['-d', '-e', 'backend']
    })
    expect(result.exitCode).toBe(3)
  })
})

describe('runStackScriptToLog', () => {
  test("writes the script's output to the log instead of the terminal", async () => {
    writeStackScript('run-stack.sh', 'echo "starting with $*"')
    const logPath = join(workspace, 'logs', 'up.log')

    const result = await runStackScriptToLog({
      workspaceRoot: workspace,
      script: 'run-stack.sh',
      args: ['-d'],
      logPath
    })

    expect({
      exitCode: result.exitCode,
      body: readFileSync(logPath, 'utf8')
    }).toEqual({
      exitCode: 0,
      body: expect.stringContaining('starting with -d')
    })
  })
})

const fakeDocker = (body) => {
  const bin = join(workspace, 'fake-bin')
  mkdirSync(bin, { recursive: true })
  writeFileSync(join(bin, 'docker'), `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(join(bin, 'docker'), 0o755)
  return { PATH: `${bin}:${process.env.PATH}` }
}

describe('stackContainers', () => {
  test("lists the workspace stack's running containers", async () => {
    const env = fakeDocker(
      'printf "trade-imports-mongodb-1\\ntrade-imports-frontend-1\\n"'
    )

    expect(await stackContainers({ env })).toEqual([
      'trade-imports-mongodb-1',
      'trade-imports-frontend-1'
    ])
  })

  test('asks docker only for the workspace compose project', async () => {
    const env = fakeDocker(
      `if [ "$3" = "label=com.docker.compose.project=${STACK_PROJECT}" ]; then echo matched; fi`
    )

    expect(await stackContainers({ env })).toEqual(['matched'])
  })

  test('says what went wrong when docker cannot list containers', async () => {
    const env = fakeDocker(
      'echo "Cannot connect to the Docker daemon" >&2\nexit 1'
    )

    await expect(stackContainers({ env })).rejects.toMatchObject({
      message:
        "Can't list the workspace stack's containers: Cannot connect to the Docker daemon"
    })
  })
})
