import { execa } from 'execa'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { composeArgs } from './compose.js'
import {
  ALL_PROFILES,
  OPT_IN_PROFILES,
  SERVICES,
  SIDECARS,
  stackDir
} from './definition.js'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

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
