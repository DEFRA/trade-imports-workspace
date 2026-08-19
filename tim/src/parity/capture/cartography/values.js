/**
 * The rungs of the value ladder, in the order they are tried.
 *
 * The rung is recorded on every control the crawler fills. A map that says
 * "CPH = 12/345/6789, mined from the page's own hint" is evidence; the same
 * value with no provenance is a guess that reads as fact, and a requirements
 * document built on guesses that read as facts is worse than no document.
 */
export const RUNGS = {
  SEED: 1,
  ENUMERATED: 2,
  MINED: 3,
  TYPED: 4,
  GENERIC: 5
}

const CONFIDENCE = { 1: 'high', 2: 'high', 3: 'medium', 4: 'low', 5: 'low' }

/** example.com is reserved, so nothing the crawler types can reach anyone. */
export const EMAIL = 'cartographer@example.com'

/** Free text is never validated for content here, and a constant keeps two runs byte-identical. */
export const SENTENCE =
  'Recorded by the parity cartographer while mapping this service.'

const NEGATIVE_OPTION = /^(none|no,|no |i do not|i don't|not |none of these)/i

const PLACEHOLDER_OPTION = /^(choose|select|please|--|—)/i

const KEYWORDS = [
  [/e-?mail/i, EMAIL],
  [/post ?code/i, 'SW1A 1AA'],
  [/ear ?tag|identifier|animal id/i, 'UK123456700001'],
  [/reference|\bref\b/i, 'CART-REF-0001'],
  [/phone|telephone|mobile/i, '01632 960000'],
  [/name/i, 'Cartographer Test'],
  [/address|street|town|city/i, 'Cartographer House']
]

const GENERATED = { d: '1', D: 'X', w: 'a', s: ' ' }

const CLASS_SAMPLE = [
  [/0-9|\\d/, '1'],
  [/A-Z/, 'A'],
  [/a-z/, 'a']
]

/**
 * The text a control offers about itself, in one string.
 *
 * Label, legend and hint all carry the same signal and any of the three may be
 * the only one present, so every keyword rule reads the lot rather than
 * guessing which field the author filled in.
 *
 * @param {object} control
 * @returns {string}
 */
export const describe = (control) =>
  [control.label, control.legend, control.hint, control.name]
    .filter(Boolean)
    .join(' ')

/**
 * The example a GDS hint states about its own field.
 *
 * Reading it is not prior knowledge — it is reading the page, which is the
 * whole job. GDS one-question-per-page screens carry their own format example
 * far more often than not, and it is always the format the field will accept.
 *
 * @param {string} [hint]
 * @returns {string|null}
 */
export const mineExample = (hint) => {
  if (!hint) return null
  const match = /for example,?\s+([^.]+)/i.exec(hint)
  if (!match) return null
  const example = match[1].trim().replace(/\s+or\s+.*$/i, '')
  return example.length ? example : null
}

/**
 * A value that satisfies a simple `pattern` attribute.
 *
 * Only character classes and counted quantifiers are handled. Anything harder
 * — alternation, groups, optionality — returns null rather than a string that
 * looks derived and is not, because a wrong value at a high rung is worse than
 * an honest fall to the next one.
 *
 * @param {string} [pattern]
 * @returns {string|null}
 */
export const fromPattern = (pattern) => {
  if (!pattern) return null
  const body = pattern.replace(/^\^/, '').replace(/\$$/, '')
  if (/[|()?*+]/.test(body)) return null

  let out = ''
  let index = 0
  while (index < body.length) {
    let unit = null
    if (body[index] === '[') {
      const close = body.indexOf(']', index)
      if (close === -1) return null
      const classBody = body.slice(index + 1, close)
      const rule = CLASS_SAMPLE.find(([probe]) => probe.test(classBody))
      unit = rule ? rule[1] : classBody.replace(/[-\\]/g, '')[0]
      index = close + 1
    } else if (body[index] === '\\') {
      unit = GENERATED[body[index + 1]] ?? body[index + 1]
      index += 2
    } else {
      unit = body[index]
      index += 1
    }
    if (!unit) return null

    const quantifier = /^\{(\d+)(?:,(\d+))?\}/.exec(body.slice(index))
    if (quantifier) {
      out += unit.repeat(Math.max(1, Number(quantifier[1])))
      index += quantifier[0].length
    } else {
      out += unit
    }
  }
  return out.length ? out : null
}

/**
 * Which way a date question points, read from the words around it.
 *
 * Past-versus-future is the commonest validation on these services and it is
 * almost always stated in the legend. Deriving it from the wording beats a
 * fixed date, which fails half of all date fields by construction.
 *
 * @param {string} text
 * @returns {'future'|'past'|'today'}
 */
export const dateDirection = (text) => {
  if (/arriv|expected|exit|departur|travel|due|deadline/i.test(text)) {
    return 'future'
  }
  if (/birth|issue|issued|collect|slaughter|last|previous/i.test(text)) {
    return 'past'
  }
  return 'today'
}

/**
 * A date thirty days either side of the run, as day, month and year.
 *
 * @param {'future'|'past'|'today'} direction
 * @param {Date} today
 * @returns {{day: string, month: string, year: string}}
 */
export const dateParts = (direction, today) => {
  const offset = { future: 30, past: -30, today: 0 }[direction] ?? 0
  const when = new Date(today.getTime() + offset * 24 * 60 * 60 * 1000)
  return {
    day: String(when.getUTCDate()),
    month: String(when.getUTCMonth() + 1),
    year: String(when.getUTCFullYear())
  }
}

/**
 * Render a date the way the field's own hint renders one.
 *
 * @param {{day: string, month: string, year: string}} parts
 * @param {string} [hint]
 * @returns {string}
 */
export const formatDate = (parts, hint) => {
  const example = mineExample(hint) ?? ''
  if (/\d{4}-\d{1,2}-\d{1,2}/.test(example)) {
    return `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`
  }
  return `${parts.day}/${parts.month}/${parts.year}`
}

/**
 * Hold a value inside the field's own length limits.
 *
 * @param {string} value
 * @param {{maxlength?: number, minlength?: number}} control
 * @returns {string}
 */
export const clampLength = (value, { maxlength, minlength } = {}) => {
  let out = value
  if (minlength && out.length < minlength) {
    out = out.padEnd(minlength, out.slice(-1) || 'x')
  }
  if (maxlength && out.length > maxlength) out = out.slice(0, maxlength)
  return out
}

/**
 * A value a human put in the corpus's hints file for this field.
 *
 * Three keys, tried in order of how specific they are: this field on this
 * route, this field anywhere, then a label pattern. The hints file is the only
 * place application-specific knowledge lives, and it is data in the corpus
 * rather than code in the crawler.
 *
 * @param {object} args
 * @param {object} args.control
 * @param {object} [args.hints]
 * @param {string} [args.routeTemplate]
 * @returns {string|null}
 */
export const seededValue = ({ control, hints, routeTemplate }) => {
  if (!hints) return null
  const onRoute = hints.routes?.[routeTemplate]?.[control.name]
  if (onRoute != null) return String(onRoute)
  const byName = hints.fields?.[control.name]
  if (byName != null) return String(byName)
  const text = describe(control)
  for (const [pattern, value] of Object.entries(hints.labels ?? {})) {
    if (new RegExp(pattern, 'i').test(text)) return String(value)
  }
  return null
}

/**
 * The first option a page offers that is worth taking on the trunk.
 *
 * Negatives ("None of these", "I do not have one") end journeys early and hide
 * everything behind the positive answer, so they are branch material rather
 * than trunk material.
 *
 * @param {object[]} options
 * @returns {object|null}
 */
export const firstUsableOption = (options = []) =>
  options.find(
    (option) =>
      String(option.value ?? '').length &&
      !option.exclusive &&
      !PLACEHOLDER_OPTION.test(option.label ?? '') &&
      !NEGATIVE_OPTION.test(option.label ?? '')
  ) ?? null

/**
 * Whether an option is the "none of the above" one.
 *
 * @param {object} option
 * @returns {boolean}
 */
export const isExclusive = (option) =>
  Boolean(option.exclusive) ||
  /^(none|do not|don't|no .* apply)/i.test(option.label ?? '')

const numberValue = (control, text) => {
  if (control.min != null && control.min !== '') return String(control.min)
  if (/number of|how many|quantity/i.test(text)) return '2'
  if (/weight|volume|net mass|kg/i.test(text)) return '10'
  return '1'
}

const typedValue = (control, text) => {
  if (control.kind === 'email' || /email/i.test(control.type ?? '')) {
    return { value: EMAIL, why: 'an email field, and example.com is reserved' }
  }
  if (control.kind === 'number' || control.inputmode === 'numeric') {
    return { value: numberValue(control, text), why: 'a numeric field' }
  }
  if (control.kind === 'textarea') {
    return {
      value: SENTENCE,
      why: 'free text, so a constant keeps runs stable'
    }
  }
  const keyword = KEYWORDS.find(([pattern]) => pattern.test(text))
  if (keyword) {
    return { value: keyword[1], why: `the wording matches ${keyword[0]}` }
  }
  return null
}

const rung = (value, level, why) => ({
  value,
  rung: level,
  confidence: CONFIDENCE[level],
  why
})

/**
 * Decide what to type into one control, and say which rung of the ladder fired.
 *
 * Nothing is ever filled without a rung, a confidence and a reason. A control
 * this cannot resolve comes back with a null value and a reason, because an
 * unfillable field is a finding — the service is demanding knowledge it never
 * shows the user — and swallowing it turns a finding into a silent gap.
 *
 * @param {object} args
 * @param {object} args.control - A control descriptor from the extractor
 * @param {object} [args.hints] - The corpus's hints file for this side
 * @param {string} [args.routeTemplate]
 * @param {Date} [args.today]
 * @returns {{value: string|null, rung: number|null, confidence: string|null, why: string}}
 */
export const deriveValue = ({
  control,
  hints,
  routeTemplate,
  today = new Date()
}) => {
  const text = describe(control)

  const seed = seededValue({ control, hints, routeTemplate })
  if (seed != null) {
    return rung(clampLength(seed, control), RUNGS.SEED, 'seeded in hints')
  }

  if (Array.isArray(control.options) && control.options.length) {
    const option = firstUsableOption(control.options)
    if (!option) {
      return {
        value: null,
        rung: null,
        confidence: null,
        why: 'every option this page offers is a placeholder or a negative'
      }
    }
    return rung(
      String(option.value),
      RUNGS.ENUMERATED,
      `the page offers "${option.label ?? option.value}"`
    )
  }

  if (control.kind === 'date') {
    const direction = dateDirection(text)
    const value = formatDate(dateParts(direction, today), control.hint)
    return rung(
      value,
      RUNGS.TYPED,
      `a date the wording puts in the ${direction === 'today' ? 'present' : direction}`
    )
  }

  const example = mineExample(control.hint)
  if (example) {
    return rung(
      clampLength(example, control),
      RUNGS.MINED,
      'the hint states this format'
    )
  }

  const pattern = fromPattern(control.pattern)
  if (pattern) {
    return rung(
      clampLength(pattern, control),
      RUNGS.TYPED,
      `generated from pattern ${control.pattern}`
    )
  }

  const typed = typedValue(control, text)
  if (typed) {
    return rung(clampLength(typed.value, control), RUNGS.TYPED, typed.why)
  }

  return rung(
    clampLength('CART-0001', control),
    RUNGS.GENERIC,
    'nothing on the page said what this field wants'
  )
}

/**
 * A format the application stated in its own error message.
 *
 * The error message is the requirement, written by the service in its own
 * words. Mining it is gathering requirements rather than working around them,
 * and it is the only rung that can learn anything the page did not display.
 *
 * @param {string} message
 * @param {Date} [today]
 * @returns {{value: string, why: string}|null}
 */
export const mineErrorFormat = (message, today = new Date()) => {
  const format = /(?:in the format|for example)\s+([^\s,.]+)/i.exec(message)
  if (format) {
    return { value: format[1], why: `the error states the format ${format[1]}` }
  }
  const length = /must be (\d+) (?:characters|digits|numbers)/i.exec(message)
  if (length) {
    const width = Number(length[1])
    const filler = /digits|numbers/i.test(length[0]) ? '1' : 'A'
    return {
      value: filler.repeat(width),
      why: `the error says it must be ${width} characters`
    }
  }
  if (/must be (?:in the future|after)/i.test(message)) {
    return {
      value: formatDate(dateParts('future', today)),
      why: 'the error says the date must be in the future'
    }
  }
  if (/must be (?:in the past|before)/i.test(message)) {
    return {
      value: formatDate(dateParts('past', today)),
      why: 'the error says the date must be in the past'
    }
  }
  return null
}

/**
 * Which control an error message is about.
 *
 * The page model records error items as text, not as anchors, so the link back
 * to a field is made on wording. The best overlap wins and a tie loses: a
 * mined value applied to the wrong field would send the next run down a path
 * the map then describes wrongly.
 *
 * @param {string} message
 * @param {object[]} controls
 * @returns {object|null}
 */
export const matchErrorToControl = (message, controls) => {
  const words = new Set(
    message
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3)
  )
  const scored = controls
    .map((control) => {
      const text = describe(control).toLowerCase()
      const score = [...words].filter((word) => text.includes(word)).length
      return { control, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  if (scored.length > 1 && scored[0].score === scored[1].score) return null
  return scored[0].control
}
