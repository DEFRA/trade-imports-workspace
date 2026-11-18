import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
  readFileSync,
  symlinkSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  stackContainers,
  stackContainerIds,
  writeStackLogs,
  stackOwners,
  otherCloneOwningStack,
  isSameWorkspace,
  STACK_PROJECT
} from './stack.js'

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-stack-'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
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
    const env = fakeDocker('echo "permission denied" >&2\nexit 1')

    await expect(stackContainers({ env })).rejects.toMatchObject({
      message: "Can't list the workspace stack's containers: permission denied"
    })
  })
})

// A Docker Desktop that has quit: docker answers only once `open -a Docker`
// has run. The daemon can only be started this way on macOS.
const dockerThatQuit = ({ openExit = 0 } = {}) => {
  const bin = join(workspace, 'fake-bin')
  mkdirSync(bin, { recursive: true })
  const running = join(workspace, 'docker-running')
  writeFileSync(
    join(bin, 'docker'),
    [
      '#!/usr/bin/env bash',
      `if [ ! -f "${running}" ]; then echo "Cannot connect to the Docker daemon. Is the docker daemon running?" >&2; exit 1; fi`,
      'if [ "$1" = "info" ]; then echo 29.1.0; exit 0; fi',
      'if [ "$1" = "ps" ]; then echo trade-imports-mongodb-1; exit 0; fi',
      'exit 1'
    ].join('\n')
  )
  chmodSync(join(bin, 'docker'), 0o755)
  writeFileSync(
    join(bin, 'open'),
    `#!/usr/bin/env bash\nif [ ${openExit} -ne 0 ]; then echo "Unable to find application named 'Docker'" >&2; exit ${openExit}; fi\ntouch "${running}"\n`
  )
  chmodSync(join(bin, 'open'), 0o755)
  return {
    PATH: `${bin}:${process.env.PATH}`,
    TIM_DOCKER_START_POLL_MS: '10',
    TIM_DOCKER_START_WAIT_MS: '2000'
  }
}

describe.runIf(process.platform === 'darwin')(
  'when Docker Desktop has quit',
  () => {
    test('starts Docker Desktop, then lists the stack containers', async () => {
      const env = dockerThatQuit()

      expect(await stackContainers({ env })).toEqual([
        'trade-imports-mongodb-1'
      ])
    })

    test('says why when Docker Desktop will not come back', async () => {
      const env = dockerThatQuit({ openExit: 1 })

      await expect(stackContainers({ env })).rejects.toMatchObject({
        message: expect.stringContaining('Docker Desktop would not open')
      })
    })
  }
)

describe('writeStackLogs', () => {
  const FAKE_STACK = [
    'if [ "$1" = "ps" ]; then printf "trade-imports-frontend-1\\ntrade-imports-mongodb-1\\n"; exit 0; fi',
    'if [ "$1" = "logs" ] && [ "$2" = "--timestamps" ]; then echo "2026-10-11T01:49:12Z log of $3"; exit 0; fi',
    'exit 1'
  ].join('\n')

  test("writes each stack container's timestamped log to its own file", async () => {
    const env = fakeDocker(FAKE_STACK)
    const logsDir = join(workspace, 'logs')

    const written = await writeStackLogs({ logsDir, prefix: 'gate-stack', env })

    expect(
      written.map((path) => [
        path,
        readFileSync(path, 'utf8').trim().split('\n').at(-1)
      ])
    ).toEqual([
      [
        join(logsDir, 'gate-stack-trade-imports-frontend-1.log'),
        '2026-10-11T01:49:12Z log of trade-imports-frontend-1'
      ],
      [
        join(logsDir, 'gate-stack-trade-imports-mongodb-1.log'),
        '2026-10-11T01:49:12Z log of trade-imports-mongodb-1'
      ]
    ])
  })

  test('writes nothing when the stack has no containers', async () => {
    const env = fakeDocker('exit 0')

    expect(
      await writeStackLogs({
        logsDir: join(workspace, 'logs'),
        prefix: 'gate-stack',
        env
      })
    ).toEqual([])
  })
})

describe('stackContainerIds', () => {
  test("lists the workspace stack's containers by id", async () => {
    const env = fakeDocker(
      'if [ "$5" = "{{.ID}}" ]; then printf "a1b2c3\\nd4e5f6\\n"; fi'
    )

    expect(await stackContainerIds({ env })).toEqual(['a1b2c3', 'd4e5f6'])
  })
})

const WORKING_DIR_FORMAT = '{{.Label "com.docker.compose.project.working_dir"}}'

const dockerListingWorkingDirs = (...workingDirs) =>
  fakeDocker(
    `if [ "$1" = ps ] && [ "$3" = "label=com.docker.compose.project=trade-imports" ] && [ "$5" = '${WORKING_DIR_FORMAT}' ]; then printf '${workingDirs.map((dir) => `${dir}\\n`).join('')}'; fi`
  )

describe('stackOwners', () => {
  test('names the clone each running container was started from, once each', async () => {
    const env = dockerListingWorkingDirs(
      '/clones/a/docker/stack',
      '/clones/a/docker/stack',
      '/clones/b/docker/stack'
    )

    expect(await stackOwners({ env })).toEqual(['/clones/a', '/clones/b'])
  })

  test('is empty when the stack is down', async () => {
    const env = dockerListingWorkingDirs()

    expect(await stackOwners({ env })).toEqual([])
  })

  test('is empty, without starting Docker, when the Docker daemon is not running', async () => {
    const env = fakeDocker(
      'echo "Cannot connect to the Docker daemon. Is the docker daemon running?" >&2; exit 1'
    )

    expect(await stackOwners({ env })).toEqual([])
  })

  test('throws UNKNOWN when docker cannot list containers for another reason', async () => {
    const env = fakeDocker('echo "permission denied" >&2; exit 1')

    await expect(stackOwners({ env })).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: "Can't list the workspace stack's containers: permission denied"
    })
  })
})

describe('otherCloneOwningStack', () => {
  test('names the other clone that started the running stack', async () => {
    const env = dockerListingWorkingDirs('/clones/a/docker/stack')

    expect(await otherCloneOwningStack({ workspaceRoot: workspace, env })).toBe(
      '/clones/a'
    )
  })

  test('is null when this clone started the running stack', async () => {
    const env = dockerListingWorkingDirs(join(workspace, 'docker', 'stack'))

    expect(
      await otherCloneOwningStack({ workspaceRoot: workspace, env })
    ).toBeNull()
  })

  test('is null when the stack is down', async () => {
    const env = dockerListingWorkingDirs()

    expect(
      await otherCloneOwningStack({ workspaceRoot: workspace, env })
    ).toBeNull()
  })
})

describe('isSameWorkspace', () => {
  test('treats a symlink to a clone as that clone', () => {
    const link = join(workspace, 'link-to-clone')
    symlinkSync(workspace, link)

    expect(isSameWorkspace(link, workspace)).toBe(true)
  })

  test('tells two clones apart', () => {
    expect(isSameWorkspace('/clones/a', '/clones/b')).toBe(false)
  })
})
