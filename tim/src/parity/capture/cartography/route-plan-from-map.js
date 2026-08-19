const byName = (name) => `[name="${name}"]`

/**
 * Translate one crawl step into the route plan's own vocabulary.
 *
 * The plan's vocabulary is deliberately small — anything a GDS page supports
 * and nothing bespoke. Driving a type-ahead or synthesising an upload needs
 * knowledge of a widget, which is why the crawler does it and the plan does
 * not pretend to.
 *
 * @param {object} action
 * @returns {object|null} A plan step, or null when the plan cannot say it
 */
export const asPlanStep = (action) => {
  switch (action.kind) {
    case 'fill':
      return {
        action: 'fill',
        selector: byName(action.name),
        value: action.value
      }
    case 'choose':
      return {
        action: 'check',
        selector: `${byName(action.name)}[value="${action.value}"]`
      }
    case 'select':
      return {
        action: 'select',
        selector: byName(action.name),
        value: action.value
      }
    case 'submit':
      return { action: 'continue' }
    case 'follow':
      return { action: 'goto', path: action.href }
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

  for (const screen of map.screens) {
    if (!continues(walked, screen.route)) {
      unexpressible.push({
        screen: screen.id,
        why: 'reaching it means starting a fresh session, which one walk cannot do'
      })
      continue
    }

    const steps = []
    let blocked = null
    for (const { action } of screen.route.slice(walked.length)) {
      const step = asPlanStep(action)
      if (!step) {
        blocked = action.kind
        break
      }
      steps.push(step)
    }
    if (blocked) {
      unexpressible.push({
        screen: screen.id,
        why: `reaching it needs a ${blocked}, which only the cartographer can drive`
      })
      continue
    }

    walked = screen.route
    routes.push({
      screen: screen.id,
      why: screen.heading ?? screen.routeTemplate,
      landmark: screen.heading
        ? { heading: screen.heading }
        : { urlPattern: screen.routeTemplate },
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
