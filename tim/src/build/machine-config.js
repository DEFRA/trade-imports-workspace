import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../errors.js'

const RUNG_KEY = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/

const machineConfigSchema = z
  .object({
    $comment: z.string().optional(),
    parallelRepos: z.number().int().positive().optional(),
    stackAfterLocal: z.boolean().optional(),
    workers: z
      .record(
        z
          .string()
          .regex(
            RUNG_KEY,
            'A workers key is "<repo>/<rung>", such as "trade-imports-plants-frontend/fit".'
          ),
        z.number().int().positive()
      )
      .default({})
  })
  .strict()

/**
 * Where this machine's gate settings live: TIM_MACHINE_CONFIG, or
 * tim/machine.json under XDG_CONFIG_HOME (default ~/.config).
 *
 * @param {object} [env]
 * @returns {string}
 */
export const defaultMachineConfigPath = (env = process.env) =>
  env.TIM_MACHINE_CONFIG ||
  join(env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'tim', 'machine.json')

const parseJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `${path} is not valid JSON: ${error.message}`)
  }
}

/**
 * This machine's own gate settings, or null when it has none. They change
 * how the gate runs here, never which rungs it runs.
 *
 * @param {string} path
 * @returns {{path: string, parallelRepos?: number, stackAfterLocal?: boolean, workers: Record<string, number>}|null}
 * @throws {TimError} PARSE when the file is there but wrong
 */
export const readMachineConfig = (path) => {
  if (!existsSync(path)) return null
  const result = machineConfigSchema.safeParse(parseJson(path))
  if (!result.success) {
    const problems = result.error.issues.map(
      ({ path: at, message }) =>
        `  ${at.join('.') || 'machine.json'}: ${message}`
    )
    throw new TimError(
      'PARSE',
      [`${path} has problems:`, ...problems].join('\n')
    )
  }
  return { path, ...result.data }
}

const takesWorkers = (rung) =>
  (rung.phase === 'fit' || rung.phase === 'e2e') && !rung.refusal

/**
 * The plan with this machine's worker count on each FIT and e2e rung it
 * names. A rung it does not name keeps its own script's setting.
 *
 * @param {object[]} plan - Planned rungs
 * @param {{workers: Record<string, number>}|null} machine
 * @returns {object[]}
 */
export const withMachineWorkers = (plan, machine) =>
  plan.map((rung) => {
    const workers = machine?.workers[`${rung.repo}/${rung.name}`]
    return workers && takesWorkers(rung) ? { ...rung, workers } : rung
  })
