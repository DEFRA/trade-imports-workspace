import { describe, test, expect, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { renderDependabotText } from './dependabot.js'
import { runTimInWorkspace, envelopeOf } from '../../test-support/tim-cli.js'
import { createDepsWorkspace } from '../../test-support/deps-workspace.js'

const REPO = 'trade-imports-animals-frontend'
const CONFIG_PATH = join('repos', REPO, '.github', 'dependabot.yml')

const resultSchema = z
  .object({
    repo: z.string(),
    path: z.string(),
    mode: z.enum(['print', 'write', 'check']),
    upToDate: z.boolean(),
    written: z.boolean(),
    content: z.string()
  })
  .strict()

const envelopeSchema = z.object({
  ok: z.literal(true),
  schema_version: z.literal(1),
  result: resultSchema
})

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const runDependabot = (...args) =>
  runTimInWorkspace(root, ['deps', 'dependabot', REPO, ...args, '--json'])

describe('tim deps dependabot', () => {
  test('Should exit 1 with upToDate false when the file is missing and --check is given', async () => {
    root = createDepsWorkspace()

    const run = await runDependabot('--check')

    expect({
      exitCode: run.exitCode,
      upToDate: envelopeSchema.parse(envelopeOf(run)).result.upToDate
    }).toEqual({ exitCode: 1, upToDate: false })
  })

  test('Should pass --check after --write', async () => {
    root = createDepsWorkspace()
    await runDependabot('--write')

    const run = await runDependabot('--check')

    expect({
      exitCode: run.exitCode,
      upToDate: envelopeSchema.parse(envelopeOf(run)).result.upToDate
    }).toEqual({ exitCode: 0, upToDate: true })
  })

  test('Should exit 1 under --check when the file has been edited by hand', async () => {
    root = createDepsWorkspace()
    await runDependabot('--write')
    writeFileSync(join(root, CONFIG_PATH), 'version: 2\n')

    const run = await runDependabot('--check')

    expect(run.exitCode).toBe(1)
  })

  test('Should refuse --write with --check as a usage error', async () => {
    root = createDepsWorkspace()

    const run = await runDependabot('--write', '--check')

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: 2,
      errors: [{ code: 'USAGE', message: 'Give --write or --check, not both.' }]
    })
  })

  test('Should refuse a repo outside the sets as a usage error', async () => {
    root = createDepsWorkspace()
    mkdirSync(join(root, 'repos', 'trade-imports-animals-backend'))

    const run = await runTimInWorkspace(root, [
      'deps',
      'dependabot',
      'trade-imports-animals-backend',
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code
    }).toEqual({ exitCode: 2, code: 'USAGE' })
  })
})

describe('#renderDependabotText', () => {
  const result = {
    repo: REPO,
    path: CONFIG_PATH,
    upToDate: false,
    written: false,
    content: 'version: 2\n'
  }

  test('Should print the generated file in print mode', () => {
    expect(renderDependabotText({ ...result, mode: 'print' })).toBe(
      'version: 2'
    )
  })

  test('Should say the file was written', () => {
    expect(
      renderDependabotText({ ...result, mode: 'write', written: true })
    ).toBe(`Wrote ${CONFIG_PATH}.`)
  })

  test('Should say a file already up to date was left alone', () => {
    expect(
      renderDependabotText({
        ...result,
        mode: 'write',
        upToDate: true
      })
    ).toBe(`${CONFIG_PATH} is already up to date.`)
  })

  test('Should tell you how to fix a file that does not match', () => {
    expect(renderDependabotText({ ...result, mode: 'check' })).toBe(
      `${CONFIG_PATH} does not match the dependency sets. Run the command with --write to regenerate it.`
    )
  })

  test('Should say a matching file matches', () => {
    expect(
      renderDependabotText({ ...result, mode: 'check', upToDate: true })
    ).toBe(`${CONFIG_PATH} matches the dependency sets.`)
  })
})
