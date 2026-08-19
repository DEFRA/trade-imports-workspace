import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { TimError } from '../../../errors.js'
import { writeJsonAtomic } from '../../io.js'
import { stable } from '../page-model.js'
import { appSha, harnessSha } from '../run.js'
import { crawl, DEFAULT_BUDGETS } from './crawl.js'
import { assembleMap, hintsStub, blockers } from './map.js'
import { routePlanFromMap } from './route-plan-from-map.js'
import { openDriver } from './driver-playwright.js'

/**
 * Where this side's map, its hints and its page models live.
 *
 * Every path comes from the corpus profile. A map written where the capture
 * stage does not look is a map nothing uses, and a model written outside the
 * side's model directory is invisible to the differ.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {string} args.side
 * @returns {{side: string, mapPath: string, hintsPath: string, modelDir: string, appRoot: string|null, baseUrl: string|null, startPath: string, screenPrefix: string}}
 * @throws {TimError} NOT_FOUND for an unknown side, USAGE when the corpus gave no model directory
 */
export const resolveMapPaths = ({ profile, side }) => {
  const sideProfile = profile.sideById[side]
  if (!sideProfile) {
    throw new TimError(
      'NOT_FOUND',
      `Unknown side "${side}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }
  if (!sideProfile.modelDir) {
    throw new TimError(
      'USAGE',
      `Side "${side}" names no modelDir in tools/parity/corpora.json, so there is nowhere to put the page models.`
    )
  }
  const cartography = join(profile.paths.workarea, 'cartography')
  return {
    side,
    mapPath: join(cartography, `map.${side}.json`),
    hintsPath: join(cartography, `hints.${side}.json`),
    routePlanPath: join(cartography, `${side}.routes.json`),
    modelDir: sideProfile.modelDir,
    appRoot: profile.repos[sideProfile.repo]?.absolutePath ?? null,
    baseUrl: sideProfile.app?.baseURL ?? null,
    startPath: sideProfile.app?.startPath ?? '/',
    screenPrefix: sideProfile.screenPrefix ?? ''
  }
}

const readIfPresent = (path) =>
  existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null

/**
 * Map one side of a comparison.
 *
 * The discovery stage the capture stage refuses to run without: it works out
 * which screens the application has and how to reach them, with no knowledge
 * of the journey and no dependence on either application's own test helpers.
 * Those helpers are not maintained, and a harness that leans on them stops
 * working the first time somebody refactors a suite nobody runs.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.workspaceRoot
 * @param {string} args.side
 * @param {string} [args.baseUrl] - Overrides the corpus
 * @param {string} [args.startPath]
 * @param {object} [args.budgets]
 * @param {boolean} [args.write] - Write the map, the hints stub and the models
 * @param {boolean} [args.check] - Exit non-zero when the map is not an inventory
 * @param {boolean} [args.headed]
 * @param {string} [args.dataState]
 * @param {Function} [args.open] - Driver factory, injected by the tests
 * @returns {Promise<object>}
 */
export const runMap = async ({
  profile,
  workspaceRoot,
  side,
  baseUrl,
  startPath,
  budgets: given,
  write,
  check,
  headed,
  dataState = 'fresh session',
  open = openDriver
}) => {
  const paths = resolveMapPaths({ profile, side })
  const url = baseUrl ?? paths.baseUrl
  if (!url) {
    throw new TimError(
      'USAGE',
      `Nothing says where side "${side}" is running. Pass --base-url, or give the side an app.baseURL in tools/parity/corpora.json.`
    )
  }
  const start = startPath ?? paths.startPath
  const budgets = { ...DEFAULT_BUDGETS, ...(given ?? {}) }
  const hints = readIfPresent(paths.hintsPath)

  const driver = await open({ baseUrl: url, startPath: start, headed })
  const models = []
  try {
    const body = await crawl({
      driver,
      hints,
      budgets,
      screenPrefix: paths.screenPrefix,
      onScreen: ({ id, pageModel }) => {
        models.push({ id, pageModel })
      }
    })

    const map = assembleMap({
      side,
      baseUrl: url,
      startPath: start,
      appSha: paths.appRoot ? appSha(paths.appRoot) : 'unknown',
      harnessSha: harnessSha(workspaceRoot),
      dataState,
      budgets,
      body
    })

    const { plan, unexpressible } = routePlanFromMap(map)

    if (write) {
      mkdirSync(paths.modelDir, { recursive: true })
      for (const { id, pageModel } of models) {
        writeFileSync(
          join(paths.modelDir, `${id}.json`),
          `${stable(pageModel)}\n`,
          'utf8'
        )
      }
      mkdirSync(dirname(paths.mapPath), { recursive: true })
      writeJsonAtomic(paths.mapPath, map)
      writeJsonAtomic(
        paths.hintsPath,
        hintsStub({
          side,
          unfilled: body.unfilled,
          existing: hints
        })
      )
      // The capture stage refuses to walk without this, and it is derived
      // rather than authored so nobody keeps a list of screens by hand.
      if (plan.routes.length) writeJsonAtomic(paths.routePlanPath, plan)
    }

    const stops = blockers(map)
    return {
      side,
      coverage: map.coverage,
      stoppedBy: map.stoppedBy,
      spent: map.spent,
      screens: map.screens.map((screen) => ({
        id: screen.id,
        routeTemplate: screen.routeTemplate,
        terminal: screen.terminal,
        blocked: screen.blocked?.reason ?? null
      })),
      frontier: map.frontier,
      blockers: stops,
      capturable: plan.routes.length,
      unexpressible,
      written: Boolean(write),
      mapPath: paths.mapPath,
      hintsPath: paths.hintsPath,
      routePlanPath: paths.routePlanPath,
      modelDir: paths.modelDir,
      exitNonZero: Boolean(check && stops.length)
    }
  } finally {
    if (driver.close) await driver.close()
  }
}
