import { execa } from 'execa'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { workspaceScriptExists } from '../test-support/bash-golden-harness.js'
import { composeArgs } from './compose.js'
import {
  ALL_PROFILES,
  COMPOSE_FILES,
  OPT_IN_PROFILES,
  SERVICES,
  SIDECARS,
  STUB_LATENCY_PROFILES,
  stackDir
} from './definition.js'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

const readScript = (relPath) =>
  readFileSync(join(workspaceRoot, relPath), 'utf8')

const bashArrayBody = (script, name) =>
  script.match(new RegExp(`^${name}=\\(([\\s\\S]*?)\\)$`, 'm'))[1]

const bashTableRows = (script, name) =>
  [...bashArrayBody(script, name).matchAll(/"([^"]+)"/g)].map(([, row]) =>
    row.split('|')
  )

const bashWords = (script, name) =>
  bashArrayBody(script, name).trim().split(/\s+/)

describe('the stack definition matches the Bash stack scripts', () => {
  test.skipIf(!workspaceScriptExists('scripts/stack/run-stack.sh'))(
    'Should hold the services and sidecars run-stack.sh lists, in its order',
    () => {
      const script = readScript('scripts/stack/run-stack.sh')

      expect({
        services: bashTableRows(script, 'services'),
        sidecars: bashTableRows(script, 'sidecars')
      }).toEqual({
        services: SERVICES.map(({ label, composeName, tagVariable }) => [
          label,
          composeName,
          tagVariable
        ]),
        sidecars: SIDECARS.map(({ label, composeName, loss }) => [
          label,
          composeName,
          loss
        ])
      })
    }
  )

  test.skipIf(!workspaceScriptExists('scripts/stack/lib/compose.sh'))(
    'Should hold the compose files and profiles lib/compose.sh lists, in its order',
    () => {
      const script = readScript('scripts/stack/lib/compose.sh')

      expect({
        composeFiles: [
          ...bashArrayBody(script, 'COMPOSE_FILES').matchAll(
            /"\$STACK_DIR\/([^"]+)"/g
          )
        ].map(([, file]) => file),
        allProfiles: bashWords(script, 'ALL_PROFILES'),
        optInProfiles: bashWords(script, 'OPT_IN_PROFILES'),
        stubLatencyProfiles: bashWords(script, 'STUB_LATENCY_PROFILES')
      }).toEqual({
        composeFiles: COMPOSE_FILES,
        allProfiles: ALL_PROFILES,
        optInProfiles: OPT_IN_PROFILES,
        stubLatencyProfiles: STUB_LATENCY_PROFILES
      })
    }
  )
})

describe('the stack definition matches the compose files', () => {
  test('Should name an image tag variable for each service in its compose file', () => {
    const composeText = readdirSync(stackDir(workspaceRoot))
      .filter((file) => file.endsWith('.yml'))
      .map((file) => readFileSync(join(stackDir(workspaceRoot), file), 'utf8'))
      .join('\n')

    const servicesWithoutTheirImage = SERVICES.filter(
      ({ composeName, tagVariable }) =>
        !composeText.includes(
          `image: defradigital/${composeName}:\${${tagVariable}:-latest}`
        )
    ).map(({ label }) => label)

    expect(servicesWithoutTheirImage).toEqual([])
  })

  const dockerComposeAnswers = async () => {
    try {
      const { exitCode } = await execa('docker', ['compose', 'version'], {
        reject: false
      })
      return exitCode === 0
    } catch {
      return false
    }
  }

  test('Should name only services and sidecars the compose files define', async (context) => {
    if (!(await dockerComposeAnswers())) context.skip()
    const { stdout } = await execa('docker', [
      ...composeArgs({
        workspaceRoot,
        profiles: [...ALL_PROFILES, ...OPT_IN_PROFILES]
      }),
      'config',
      '--services'
    ])
    const defined = stdout.split('\n')

    const unknown = [...SERVICES, ...SIDECARS]
      .map(({ composeName }) => composeName)
      .filter((composeName) => !defined.includes(composeName))

    expect(unknown).toEqual([])
  })
})
