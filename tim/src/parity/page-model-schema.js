import { z } from 'zod'

/**
 * The shape a page model must have, whichever side produced it.
 *
 * The two sides live in different repos and run their own copy of the
 * extractor, so the guarantee that they stay comparable cannot be a shared
 * file — a copy drifts silently. It is this schema, checked against every
 * model on disk, because what the differ and the report actually depend on is
 * the shape, not the implementation.
 *
 * Additive-tolerant: an extractor that learns to record something new does not
 * fail here. Subtractive-strict: a key the differ reads going missing is what
 * turns a real comparison into a page of false absences.
 */
const passthrough = (shape) => z.object(shape).catchall(z.unknown())

const nullableString = z.string().nullable()

export const fieldSchema = passthrough({
  kind: z.string(),
  name: nullableString.optional(),
  label: nullableString.optional(),
  legend: nullableString.optional(),
  hint: nullableString.optional(),
  options: z
    .array(passthrough({ value: z.unknown(), label: nullableString }))
    .optional()
})

export const pageModelSchema = passthrough({
  url: nullableString,
  title: nullableString,
  h1: nullableString,
  headings: z.array(passthrough({ level: z.string(), text: nullableString })),
  allFields: z.array(fieldSchema),
  summaryRows: z.array(
    passthrough({ key: nullableString, value: nullableString })
  ),
  taskItems: z.array(passthrough({ title: nullableString })),
  links: z.array(passthrough({ text: nullableString, href: nullableString }))
})

/**
 * Parse one page model, naming the screen and the field path on failure.
 *
 * @param {unknown} raw
 * @param {string} where - Side and screen, for the message
 * @returns {object}
 */
export const parsePageModel = (raw, where) => {
  const result = pageModelSchema.safeParse(raw)
  if (result.success) return result.data
  const first = result.error.issues[0]
  throw new Error(
    `${where}: ${first.path.join('.') || '(root)'} — ${first.message}`
  )
}
