import { markWorkspaceRoot } from '../test-support/workspace-marker.js'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  chmodSync
} from 'node:fs'
import { join, dirname, delimiter } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', 'cli.js')

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-start-'))
  markWorkspaceRoot(workspace)
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const seedNodeRepo = (repo, scripts) => {
  const dir = join(workspace, 'repos', repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: repo, version: '0.0.0', scripts })
  )
}

const seedJavaRepo = (repo) => {
  const dir = join(workspace, 'repos', repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'pom.xml'), '<project/>\n')
}

const pathWithFakeMaven = () => {
  const binDir = join(workspace, 'bin')
  mkdirSync(binDir)
  const fakeMaven = join(binDir, 'mvn')
  writeFileSync(
    fakeMaven,
    '#!/bin/sh\necho "profile=$SPRING_PROFILES_ACTIVE port=$PORT args=$*"\n'
  )
  chmodSync(fakeMaven, 0o755)
  return [binDir, process.env.PATH].join(delimiter)
}

const environmentWithoutPort = () => {
  const { PORT: _inheritedPort, ...rest } = process.env
  return rest
}

const runStart = (service, env = environmentWithoutPort()) =>
  execa('node', [cliPath, 'start', service, '--workspace', workspace], {
    reject: false,
    extendEnv: false,
    env
  })

const printPortScript = 'node -e "console.log(\\"port=\\" + process.env.PORT)"'

describe('tim start CLI', () => {
  test('frontend runs `npm run dev` in the frontend repo and exits 0', async () => {
    seedNodeRepo('trade-imports-animals-frontend', {
      dev: 'node -e "process.exit(0)"'
    })

    const { exitCode } = await runStart('frontend')

    expect(exitCode).toBe(0)
  }, 30_000)

  test.each([
    ['admin', 'trade-imports-animals-admin', '3001'],
    ['plants-frontend', 'trade-imports-plants-frontend', '3003']
  ])(
    '%s runs `npm run dev` in %s with PORT=%s',
    async (service, repo, port) => {
      seedNodeRepo(repo, { dev: printPortScript })

      const { stdout, exitCode } = await runStart(service)

      expect(exitCode).toBe(0)
      expect(stdout).toContain(`port=${port}`)
    },
    30_000
  )

  test.each([
    ['backend', 'trade-imports-animals-backend', ''],
    ['gateway', 'trade-imports-dynamics-gateway', ''],
    ['address-book', 'trade-imports-address-book', '8089'],
    ['ins-backend', 'trade-imports-ins-backend', '8090'],
    ['plants-backend', 'trade-imports-plants-backend', '8091']
  ])(
    '%s runs Spring Boot from the %s pom with the local profile and PORT="%s"',
    async (service, repo, port) => {
      seedJavaRepo(repo)
      const PATH = pathWithFakeMaven()

      const { stdout, exitCode } = await runStart(service, {
        ...environmentWithoutPort(),
        PATH
      })

      expect(exitCode).toBe(0)
      expect(stdout.trim()).toBe(
        `profile=local port=${port} args=-f ${join(workspace, 'repos', repo, 'pom.xml')} spring-boot:run`
      )
    },
    30_000
  )

  test.each([
    [
      'frontend',
      'Start the animals frontend dev server from source, on its own default port'
    ],
    [
      'backend',
      'Start the animals backend from source with the local Spring profile, on its own default port'
    ],
    ['admin', 'Start the animals admin dev server from source, on port 3001'],
    [
      'gateway',
      'Start the dynamics gateway from source with the local Spring profile, on its own default port'
    ],
    [
      'address-book',
      'Start the address book API from source, on port 8089 (needs Java 25 and MongoDB on port 27017)'
    ],
    [
      'ins-backend',
      'Start the INS backend API from source, on port 8090 (needs Java 25 and MongoDB on port 27017)'
    ],
    [
      'plants-frontend',
      'Start the plants frontend dev server from source, on port 3003'
    ],
    [
      'plants-backend',
      'Start the plants backend API from source, on port 8091 (needs Java 25 and MongoDB on port 27017)'
    ]
  ])('help for %s says "%s"', async (service, description) => {
    const { stdout } = await execa('node', [cliPath, 'start', '--help'])

    const singleSpacedHelp = stdout.replaceAll(/\s+/g, ' ')

    expect(singleSpacedHelp).toContain(`${service} ${description}`)
  })

  test('refuses when the service repo is not cloned', async () => {
    const { stderr, exitCode } = await runStart('plants-backend')

    expect(exitCode).not.toBe(0)
    expect(stderr).toMatch(/not cloned/)
  })
})
