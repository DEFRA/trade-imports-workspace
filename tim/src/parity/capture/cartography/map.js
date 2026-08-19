export const SCHEMA_VERSION = 1

/**
 * The five numbers that say how much of the application this map covers.
 *
 * Put at the top of the file rather than derived by a reader, because the one
 * failure mode nobody catches is a partial map read as a complete one. A map
 * that carries its own coverage cannot be quoted as an inventory by accident.
 *
 * @param {object} body - What the crawl returned
 * @returns {object}
 */
export const coverageOf = (body) => ({
  screensMapped: body.screens.length,
  routeTemplatesSeen: new Set(body.screens.map((s) => s.routeTemplate)).size,
  frontierRemaining: body.frontier.length,
  unfilledFields: body.unfilled.length,
  blockedScreens: body.screens.filter((screen) => screen.blocked).length
})

/**
 * Assemble the artefact from one crawl.
 *
 * dataState is recorded at the top because a dashboard with no notifications
 * and one with three are both legitimate and are not the same screen. Without
 * it, someone compares an empty dashboard on one side with a populated one on
 * the other and writes it up as a parity gap.
 *
 * @param {object} args
 * @param {string} args.side
 * @param {string} args.baseUrl
 * @param {string} args.startPath
 * @param {string} args.appSha
 * @param {string} args.harnessSha
 * @param {string} args.dataState
 * @param {object} args.budgets
 * @param {object} args.body - What {@link crawl} returned
 * @param {string} [args.mappedOn] - ISO timestamp
 * @returns {object}
 */
export const assembleMap = ({
  side,
  baseUrl,
  startPath,
  appSha,
  harnessSha,
  dataState,
  budgets,
  body,
  mappedOn
}) => ({
  schemaVersion: SCHEMA_VERSION,
  side,
  baseUrl,
  startPath,
  appSha,
  harnessSha,
  mappedOn: mappedOn ?? new Date().toISOString(),
  dataState,
  budgets,
  stoppedBy: body.stoppedBy,
  spent: body.spent,
  coverage: coverageOf(body),
  screens: body.screens.map(({ pageModel, ...screen }) => screen),
  frontier: body.frontier,
  unfilled: body.unfilled,
  warnings: body.warnings
})

/**
 * A hints file with one empty entry per field nothing could fill.
 *
 * Generated as a stub rather than authored blind: the crawler knows which
 * fields defeated it and what the application said about them, and a human
 * only has to supply the value. The next run picks it up at rung 1, so the
 * knowledge lands in the corpus as data once rather than in the crawler as a
 * special case for ever.
 *
 * @param {object} args
 * @param {string} args.side
 * @param {object[]} args.unfilled
 * @param {object} [args.existing] - A hints file already on disk
 * @returns {object}
 */
export const hintsStub = ({ side, unfilled, existing }) => {
  const fields = { ...(existing?.fields ?? {}) }
  const notes = { ...(existing?.notes ?? {}) }
  for (const entry of unfilled) {
    if (!entry.name) continue
    if (fields[entry.name] != null && fields[entry.name] !== '') continue
    fields[entry.name] = ''
    notes[entry.name] = `${entry.screen}: ${entry.why}`
  }
  return {
    side,
    _comment:
      'Values a human supplies for fields the cartographer could not work out from the page. Fill a value in fields{} and the next map picks it up at rung 1.',
    fields,
    labels: existing?.labels ?? {},
    routes: existing?.routes ?? {},
    notes
  }
}

/**
 * What stops this map being consumed downstream as it stands.
 *
 * @param {object} map
 * @returns {string[]}
 */
export const blockers = (map) => {
  const stops = []
  if (map.coverage.frontierRemaining) {
    stops.push(
      `${map.coverage.frontierRemaining} choices were never explored, so this map is a sample rather than an inventory.`
    )
  }
  if (map.coverage.blockedScreens) {
    stops.push(
      `${map.coverage.blockedScreens} screens would not let the crawl past, so everything behind them is missing.`
    )
  }
  if (map.coverage.unfilledFields) {
    stops.push(
      `${map.coverage.unfilledFields} fields could not be filled from the page. Seed them in the hints file.`
    )
  }
  return stops
}
