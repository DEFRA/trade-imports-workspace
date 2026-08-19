import { z } from 'zod'
import { readJsonFile } from '../io.js'
import { TimError } from '../../errors.js'

/**
 * The vocabulary a route plan may use.
 *
 * Deliberately small and application-agnostic. The plan is written by the
 * discovery stage, not by hand and not by an application's own test helpers —
 * those are not maintained, and a capture that depends on them stops working
 * the moment the application's suite is refactored. Every step here is
 * something any GDS page supports.
 */
export const STEP_ACTIONS = [
  'goto',
  'click',
  'fill',
  'check',
  'select',
  'fillPending',
  'pickRadios',
  'continue',
  'remember',
  'expectHeading',
  'expectUrl'
]

const stepSchema = z
  .object({
    action: z.enum(STEP_ACTIONS),
    path: z.string().optional(),
    role: z.string().optional(),
    name: z.string().optional(),
    selector: z.string().optional(),
    label: z.string().optional(),
    value: z.string().optional(),
    text: z.string().optional(),
    pattern: z.string().optional(),
    as: z.string().optional(),
    from: z.enum(['url', 'text']).optional(),
    optional: z.boolean().optional()
  })
  .catchall(z.unknown())

const landmarkSchema = z
  .object({
    heading: z.string().optional(),
    urlPattern: z.string().optional()
  })
  .catchall(z.unknown())

const routeSchema = z
  .object({
    screen: z.string().min(1),
    why: z.string().optional(),
    landmark: landmarkSchema.optional(),
    steps: z.array(stepSchema).default([])
  })
  .catchall(z.unknown())

export const routePlanSchema = z
  .object({
    side: z.string().min(1),
    discoveredBy: z.string().optional(),
    discoveredOn: z.string().optional(),
    app: z
      .object({
        baseURL: z.string().min(1),
        server: z
          .object({
            command: z.string().min(1),
            cwd: z.string().optional(),
            port: z.number().int().positive(),
            env: z.record(z.string(), z.string()).optional()
          })
          .nullable()
          .optional()
      })
      .catchall(z.unknown()),
    prelude: z.array(stepSchema).default([]),
    routes: z.array(routeSchema).min(1)
  })
  .catchall(z.unknown())

/**
 * Parse a route plan, naming what is wrong with it.
 *
 * @param {unknown} raw
 * @param {string} where - The file it came from
 * @returns {object}
 * @throws {TimError} PARSE
 */
export const parseRoutePlan = (raw, where) => {
  const result = routePlanSchema.safeParse(raw)
  if (result.success) return result.data
  const first = result.error.issues[0]
  throw new TimError(
    'PARSE',
    `${where} is not a usable route plan: ${first.path.join('.') || '(root)'} — ${first.message}`
  )
}

/**
 * Read the route plan for one side.
 *
 * @param {string} path
 * @returns {object}
 * @throws {TimError} NOT_FOUND when the discovery stage has not run
 */
export const loadRoutePlan = (path) => parseRoutePlan(readJsonFile(path), path)

/**
 * Substitute values the walk remembered into a string.
 *
 * A journey mints an id — a notification reference, a draft key — and every
 * later route needs it in its path. The plan cannot know it in advance, so it
 * names it: `/notifications/{notification}/tasks`.
 *
 * @param {string} template
 * @param {Record<string, string>} memory
 * @returns {string}
 * @throws {TimError} USAGE when the plan names something the walk never learnt
 */
export const interpolate = (template, memory) =>
  template.replace(/\{(\w+)\}/g, (whole, key) => {
    if (!(key in memory)) {
      throw new TimError(
        'USAGE',
        `The route plan uses {${key}} in "${template}", but nothing in the walk remembered a ${key}. Add a "remember" step before this one.`
      )
    }
    return memory[key]
  })

/**
 * Pull one remembered value out of a string.
 *
 * @param {string} source
 * @param {string} pattern - A regular expression with one capture group
 * @returns {string|null}
 */
export const rememberFrom = (source, pattern) => {
  const match = new RegExp(pattern).exec(source)
  return match ? (match[1] ?? match[0]) : null
}

/**
 * Which screens a plan will attempt, in order.
 *
 * @param {object} plan
 * @returns {string[]}
 */
export const plannedScreens = (plan) => plan.routes.map((route) => route.screen)
