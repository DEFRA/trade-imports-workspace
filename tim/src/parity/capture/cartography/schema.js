import { z } from 'zod'
import { TimError } from '../../../errors.js'

/**
 * The shape of a map of an application.
 *
 * Additive-tolerant and subtractive-strict, the same bargain the page-model
 * schema strikes: a crawler that learns to record something new does not break
 * anything downstream, but a key the capture stage or the report reads going
 * missing fails here rather than three steps later as an empty section.
 */
const passthrough = (shape) => z.object(shape).catchall(z.unknown())

export const controlRowSchema = passthrough({
  name: z.string().nullable(),
  kind: z.string(),
  label: z.string().nullable(),
  valueUsed: z.string().nullable(),
  rung: z.number().int().nullable(),
  confidence: z.string().nullable(),
  why: z.string()
})

export const outgoingSchema = passthrough({
  kind: z.string(),
  label: z.string().nullable(),
  to: z.string().nullable(),
  class: z.enum(['safe', 'terminal', 'destructive']),
  explored: z.boolean()
})

export const screenSchema = passthrough({
  id: z.string().min(1),
  routeTemplate: z.string().min(1),
  url: z.string(),
  heading: z.string().nullable(),
  title: z.string().nullable(),
  variant: z.string().nullable(),
  fingerprint: z.string(),
  fingerprintInputs: z.unknown(),
  terminal: z.boolean(),
  blocked: passthrough({
    reason: z.string(),
    evidence: z.array(z.string())
  }).nullable(),
  route: z.array(passthrough({ screen: z.string(), action: z.unknown() })),
  model: z.string(),
  controls: z.array(controlRowSchema),
  outgoing: z.array(outgoingSchema)
})

export const frontierSchema = passthrough({
  kind: z.string(),
  screen: z.string(),
  routeTemplate: z.string(),
  label: z.string().nullable(),
  why: z.string()
})

export const mapSchema = passthrough({
  schemaVersion: z.number().int().positive(),
  side: z.string().min(1),
  baseUrl: z.string(),
  startPath: z.string(),
  appSha: z.string(),
  harnessSha: z.string(),
  mappedOn: z.string(),
  dataState: z.string(),
  budgets: passthrough({}),
  stoppedBy: z.string(),
  coverage: passthrough({
    screensMapped: z.number().int(),
    routeTemplatesSeen: z.number().int(),
    frontierRemaining: z.number().int(),
    unfilledFields: z.number().int(),
    blockedScreens: z.number().int()
  }),
  screens: z.array(screenSchema),
  frontier: z.array(frontierSchema),
  unfilled: z.array(passthrough({ screen: z.string(), why: z.string() })),
  warnings: z.array(passthrough({ kind: z.string(), why: z.string() }))
})

/**
 * Parse a map, naming what is wrong with it.
 *
 * @param {unknown} raw
 * @param {string} where - The file it came from
 * @returns {object}
 * @throws {TimError} PARSE
 */
export const parseMap = (raw, where) => {
  const result = mapSchema.safeParse(raw)
  if (result.success) return result.data
  const first = result.error.issues[0]
  throw new TimError(
    'PARSE',
    `${where} is not a usable map: ${first.path.join('.') || '(root)'} — ${first.message}`
  )
}
