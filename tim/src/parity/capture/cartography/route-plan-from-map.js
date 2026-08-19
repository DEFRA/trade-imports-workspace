import { urlPatternFor, volatileSegments } from './identity.js'

const byName = (name) => `[name="${name}"]`

const escapeLiteral = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const camel = (text) =>
  text
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`
    )
    .join('') || 'value'

/**
 * A fresh record of what the plan has asked the walk to remember.
 *
 * One per plan, not one per route: a notification id learnt on the way to the
 * task list is the same id every later route needs, and asking for it twice
 * would have the walk hunt for a link that is no longer on the page.
 *
 * @returns {{used: Set<string>, byValue: Map<string, string>}}
 */
export const newMemory = () => ({ used: new Set(), byValue: new Map() })

const cloneMemory = (memory) => ({
  used: new Set(memory.used),
  byValue: new Map(memory.byValue)
})

const uniqueName = (base, used) => {
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}${n}`)) n += 1
  return `${base}${n}`
}

const capturePattern = (segments, volatileIndexes, target) => {
  const source = segments
    .map((segment, index) => {
      if (index === target) return '([^/"?#]+)'
      if (volatileIndexes.has(index)) return '[^/"?#]+'
      return escapeLiteral(segment)
    })
    .join('/')
  return `/${source}`
}

/**
 * The steps that reach one link, without baking in this run's generated ids.
 *
 * A `follow` in the map carries the href exactly as the page offered it, so a
 * plan written from it walks to a notification that existed this afternoon.
 * Every generated segment is replaced by a name the walk learns from the page
 * it is standing on — the link is in that page's markup by construction, which
 * is where the crawler read it — so the same plan walks a fresh session
 * tomorrow.
 *
 * @param {string} href - As the page offered it
 * @param {{used: Set<string>, byValue: Map<string, string>}} memory
 * @returns {object[]} A goto, preceded by a remember for each new value
 */
export const gotoSteps = (href, memory) => {
  const parsed = new URL(href, 'http://cartographer.invalid')
  const absolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(href)
  const segments = parsed.pathname.split('/').filter(Boolean)
  const volatile = volatileSegments(href)
  if (volatile.length === 0) return [{ action: 'goto', path: href }]

  const indexes = new Set(volatile.map((segment) => segment.index))
  const original = [...segments]
  const steps = []

  for (const segment of volatile) {
    let name = memory.byValue.get(segment.value)
    if (!name) {
      name = uniqueName(
        camel(original[segment.index - 1] ?? 'value'),
        memory.used
      )
      memory.used.add(name)
      memory.byValue.set(segment.value, name)
      steps.push({
        action: 'remember',
        as: name,
        from: 'text',
        pattern: capturePattern(original, indexes, segment.index)
      })
    }
    segments[segment.index] = `{${name}}`
  }

  const path = `/${segments.join('/')}${parsed.search}${parsed.hash}`
  steps.push({
    action: 'goto',
    path: absolute ? `${parsed.origin}${path}` : path
  })
  return steps
}

/**
 * Translate one crawl step into the route plan's own vocabulary.
 *
 * The plan's vocabulary is deliberately small — anything a GDS page supports
 * and nothing bespoke. Driving a type-ahead or synthesising an upload needs
 * knowledge of a widget, which is why the crawler does it and the plan does
 * not pretend to.
 *
 * @param {object} action
 * @param {{used: Set<string>, byValue: Map<string, string>}} memory
 * @returns {object[]|null} Plan steps, or null when the plan cannot say it
 */
export const asPlanSteps = (action, memory) => {
  switch (action.kind) {
    case 'fill':
      return [
        {
          action: 'fill',
          selector: byName(action.name),
          value: action.value
        }
      ]
    case 'choose':
      return [
        {
          action: 'check',
          selector: `${byName(action.name)}[value="${action.value}"]`
        }
      ]
    case 'select':
      return [
        {
          action: 'select',
          selector: byName(action.name),
          value: action.value
        }
      ]
    case 'submit':
      return [{ action: 'continue' }]
    case 'follow':
      return gotoSteps(action.href, memory)
    default:
      return null
  }
}

/**
 * Whether one transcript continues another.
 *
 * @param {object[]} prefix
 * @param {object[]} route
 * @returns {boolean}
 */
export const continues = (prefix, route) =>
  prefix.length <= route.length &&
  prefix.every(
    (step, index) =>
      JSON.stringify(step.action) === JSON.stringify(route[index].action)
  )

/**
 * The landmark that says the walk arrived where the route meant it to.
 *
 * A heading is the strongest signal a GDS page gives. Without one the route
 * template is all there is, and it has to be turned into something a URL can
 * match — the template itself matches nothing.
 *
 * @param {object} screen - A map screen
 * @returns {{heading: string}|{urlPattern: string}}
 */
export const landmarkFor = (screen) =>
  screen.heading
    ? { heading: screen.heading }
    : { urlPattern: urlPatternFor(screen.routeTemplate) }

/**
 * Turn a map into the route plan the capture stage walks.
 *
 * The map is the richer artefact — it carries provenance, coverage and every
 * choice not taken — but the capture stage only needs the walk. Deriving one
 * from the other keeps a single source of truth: nobody hand-maintains a list
 * of screens, and a screen the map found is a screen the capture shoots.
 *
 * The plan walks one session end to end, so each route is written as the steps
 * since the last one rather than as a replay from the start. A branch that
 * needs the session thrown away cannot be said in that form, and is named
 * rather than written as a walk that would silently photograph the wrong page.
 *
 * @param {object} map - A map from {@link assembleMap}
 * @returns {{plan: object, unexpressible: object[]}}
 */
export const routePlanFromMap = (map) => {
  const unexpressible = []
  const routes = []
  let walked = []
  let memory = newMemory()

  for (const screen of map.screens) {
    if (!continues(walked, screen.route)) {
      unexpressible.push({
        screen: screen.id,
        why: 'reaching it means starting a fresh session, which one walk cannot do'
      })
      continue
    }

    // A route that turns out to be unsayable must leave no trace: it would
    // otherwise claim a remembered name whose remember step was thrown away,
    // and the next route to want that value would ask for one nothing learnt.
    const attempt = cloneMemory(memory)
    const steps = []
    let blocked = null
    for (const { action } of screen.route.slice(walked.length)) {
      const said = asPlanSteps(action, attempt)
      if (!said) {
        blocked = action.kind
        break
      }
      steps.push(...said)
    }
    if (blocked) {
      unexpressible.push({
        screen: screen.id,
        why: `reaching it needs a ${blocked}, which only the cartographer can drive`
      })
      continue
    }

    memory = attempt
    walked = screen.route
    routes.push({
      screen: screen.id,
      why: screen.heading ?? screen.routeTemplate,
      landmark: landmarkFor(screen),
      steps
    })
  }

  return {
    plan: {
      side: map.side,
      discoveredBy: 'tim parity map',
      discoveredOn: map.mappedOn,
      app: { baseURL: map.baseUrl, server: null },
      prelude: [{ action: 'goto', path: map.startPath }],
      routes
    },
    unexpressible
  }
}
