import { createHash } from 'node:crypto'
import { maskVolatile } from '../page-model.js'

/**
 * Path segments that are a value rather than a place.
 *
 * A crawler that treats `/notifications/9f2c…/tasks` as its own screen maps the
 * same page once per notification and reports a journey ten screens longer than
 * it is. Collapsing the value to a token is what makes "have I been here?" a
 * question about the application rather than about this run's data.
 */
const SEGMENT_RULES = [
  [/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, ':id'],
  [/^GBN-[A-Z]{2}-\d{2}-[A-Z0-9]{4,}$/i, ':ref'],
  [/^\d+$/, ':n'],
  [/^[0-9a-f]{16,}$/i, ':id']
]

/**
 * The route a URL belongs to, with every generated value replaced by a token.
 *
 * @param {string} url - Absolute or path-only
 * @returns {string} For example /notifications/:id/import-reason
 */
export const routeTemplate = (url) => {
  const { pathname } = new URL(url, 'http://cartographer.invalid')
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return '/'
  const templated = segments.map((segment) => {
    const rule = SEGMENT_RULES.find(([pattern]) => pattern.test(segment))
    return rule ? rule[1] : segment
  })
  return `/${templated.join('/')}`
}

const TOKEN_PATTERN = {
  ':id': '[^/]+',
  ':ref': '[^/]+',
  ':n': '\\d+'
}

const escapeLiteral = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The segments of a URL that were a value rather than a place.
 *
 * A plan that hard-codes this afternoon's notification id walks to a
 * notification that will not exist tomorrow. Saying which segments were
 * generated is what lets the plan ask the walk to remember them instead of
 * baking them in.
 *
 * @param {string} url - Absolute or path-only
 * @returns {{index: number, value: string, token: string}[]} Indexes are into the non-empty path segments
 */
export const volatileSegments = (url) => {
  const { pathname } = new URL(url, 'http://cartographer.invalid')
  const out = []
  pathname
    .split('/')
    .filter(Boolean)
    .forEach((segment, index) => {
      const rule = SEGMENT_RULES.find(([pattern]) => pattern.test(segment))
      if (rule) out.push({ index, value: segment, token: rule[1] })
    })
  return out
}

/**
 * A regular expression matching every real URL of one route template.
 *
 * A route template is a name, not a pattern: no browser ever shows
 * `/notifications/:id/tasks`, so handing the template straight to a landmark
 * check records every heading-less screen as a gap and photographs none of
 * them. Tested against an absolute URL, which is what a page reports.
 *
 * @param {string} template - From {@link routeTemplate}
 * @returns {string} Source for a RegExp
 */
export const urlPatternFor = (template) => {
  const body =
    template === '/'
      ? '/?'
      : template
          .split('/')
          .map((segment) => TOKEN_PATTERN[segment] ?? escapeLiteral(segment))
          .join('/')
  return `^\\w+://[^/]+${body}(?:[?#]|/?$)`
}

/**
 * A URL as the map records it: path and query only, volatile values masked.
 *
 * The host is dropped because it is a fact about where the application was
 * running this afternoon, not about the application.
 *
 * @param {string} url
 * @returns {string}
 */
export const maskedUrl = (url) => {
  const parsed = new URL(url, 'http://cartographer.invalid')
  return maskVolatile(`${parsed.pathname}${parsed.search}`)
}

/**
 * Bucket a count into none / one / many.
 *
 * A dashboard with three notifications and one with four are the same screen;
 * one with none is not. Counting exactly over-splits the map into variants
 * nobody asked for, so the fingerprint sees the shape of the count instead.
 *
 * @param {number} [count]
 * @returns {'none'|'one'|'many'}
 */
export const bucket = (count) => {
  if (!count) return 'none'
  return count === 1 ? 'one' : 'many'
}

/**
 * Everything the fingerprint is computed from, kept as readable data.
 *
 * The inputs are stored on the screen as well as the hash, because a wrong
 * merge or a wrong split is otherwise a mystery: a hash tells you two pages
 * differ but never why, and "why" is the only thing that lets someone fix the
 * bucketing rather than distrust the whole map.
 *
 * @param {object} args
 * @param {object} args.model - A page model from the shared extractor
 * @param {object[]} [args.controls] - Control descriptors, when the driver read them
 * @param {string} args.routeTemplate
 * @returns {object}
 */
export const fingerprintInputs = ({
  model,
  controls,
  routeTemplate: template
}) => {
  const fields = (controls ?? model.allFields ?? []).filter(
    (field) => field.kind !== 'hidden'
  )
  return {
    routeTemplate: template,
    h1: model.h1 ? maskVolatile(model.h1) : null,
    fields: fields
      .map((field) => `${field.kind}:${field.name ?? ''}`)
      .sort((a, b) => a.localeCompare(b)),
    options: fields
      .filter((field) => Array.isArray(field.options))
      .map((field) => `${field.name ?? ''}=${field.options.length}`)
      .sort((a, b) => a.localeCompare(b)),
    summaryRows: bucket(model.summaryRows?.length),
    taskItems: bucket(model.taskItems?.length),
    errorSummary: Boolean(model.errorSummary?.items?.length)
  }
}

/**
 * A short hash of the fingerprint inputs.
 *
 * @param {object} inputs - From {@link fingerprintInputs}
 * @returns {string} Ten hex characters
 */
export const fingerprint = (inputs) =>
  createHash('sha256').update(JSON.stringify(inputs)).digest('hex').slice(0, 10)

/**
 * Turn a route template into the slug half of a screen id.
 *
 * @param {string} template
 * @returns {string}
 */
export const slugFromTemplate = (template) =>
  template
    .replace(/^\//, '')
    .replace(/[/:]+/g, '-')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'root'

/**
 * The id a screen is filed under, in the corpus's own naming.
 *
 * The same string names the picture, the page model and the map entry. One
 * name for one screen is what lets the differ pair the two sides without a
 * lookup table anybody has to maintain.
 *
 * @param {object} args
 * @param {string} [args.prefix] - The side's screen prefix, for example fe-
 * @param {string} args.routeTemplate
 * @param {string} [args.variant] - A named variant, for example reason-revealed
 * @returns {string}
 */
export const screenId = ({ prefix = '', routeTemplate: template, variant }) => {
  const base = `${prefix}${slugFromTemplate(template)}`
  return variant ? `${base}--${slugFromTemplate(variant)}` : base
}

/**
 * Make an id unique against the ids already used.
 *
 * Two genuinely different pages can share a route template and carry no name
 * for what makes them different. Numbering the second is honest; silently
 * overwriting the first would drop a screen from the map without saying so.
 *
 * @param {string} id
 * @param {Set<string>} used
 * @returns {string}
 */
export const uniqueId = (id, used) => {
  if (!used.has(id)) return id
  let n = 2
  while (used.has(`${id}--v${n}`)) n += 1
  return `${id}--v${n}`
}
