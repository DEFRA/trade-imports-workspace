import { TimError } from '../errors.js'

/**
 * A `parseOptions` for `makeRunAction` that validates a command's options
 * against a zod schema and refuses the first problem as a usage error.
 *
 * @param {import('zod').ZodType} schema - Its messages are shown to the user, so write them in plain English
 * @returns {(opts: object) => object} The parsed options
 */
export const zodOptionsParser = (schema) => (opts) => {
  const parsed = schema.safeParse(opts)
  if (!parsed.success) {
    throw new TimError('USAGE', parsed.error.issues[0].message)
  }
  return parsed.data
}
