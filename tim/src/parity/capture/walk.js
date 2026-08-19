import { interpolate, rememberFrom } from './route-plan.js'
import { captureScreen } from './screens.js'
import { TimError } from '../../errors.js'

const CONTINUE_NAMES =
  /save and continue|continue|accept and submit|confirm|submit|start now/i

const clickContinue = async (page) => {
  const named = page.locator('button[name="action"][value="continue"]')
  if (await named.count()) {
    await named.first().click()
    return
  }
  await page.getByRole('button', { name: CONTINUE_NAMES }).first().click()
}

const target = (page, step) => {
  if (step.selector) return page.locator(step.selector)
  if (step.label) return page.getByLabel(step.label, { exact: false })
  if (step.role) {
    return page.getByRole(step.role, { name: step.name, exact: false })
  }
  if (step.name) return page.getByText(step.name, { exact: false })
  throw new TimError(
    'USAGE',
    `A "${step.action}" step names no element. Give it a selector, a label, or a role and a name.`
  )
}

/**
 * Run one step against the page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} step
 * @param {Record<string, string>} memory - Values earlier steps remembered
 * @returns {Promise<void>}
 */
export const runStep = async (page, step, memory) => {
  switch (step.action) {
    case 'goto':
      await page.goto(interpolate(step.path, memory))
      return
    case 'fill':
      await target(page, step)
        .first()
        .fill(interpolate(step.value ?? '', memory))
      return
    case 'check':
      await target(page, step).first().check()
      return
    case 'select':
      await target(page, step).first().selectOption(step.value)
      return
    case 'continue':
      await clickContinue(page)
      return
    case 'remember': {
      const source = step.from === 'text' ? await page.content() : page.url()
      const value = rememberFrom(source, step.pattern)
      if (value === null) {
        throw new TimError(
          'NOT_FOUND',
          `Nothing matched ${step.pattern} in the page ${step.from ?? 'url'}, so the walk cannot remember ${step.as}.`
        )
      }
      memory[step.as] = value
      return
    }
    default:
      throw new TimError('USAGE', `Unknown step action "${step.action}".`)
  }
}

/**
 * Whether the page is the one the route says it is.
 *
 * A picture of the wrong page is worse than no picture, so a route that did
 * not land is recorded as a gap with a reason and the walk carries on.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{heading?: string, urlPattern?: string}} [landmark]
 * @returns {Promise<string|null>} Why it did not land, or null when it did
 */
export const checkLandmark = async (page, landmark) => {
  if (!landmark) return null
  const where = new URL(page.url()).pathname
  if (
    landmark.urlPattern &&
    !new RegExp(landmark.urlPattern).test(page.url())
  ) {
    return `Expected a URL matching ${landmark.urlPattern} and landed on ${where}.`
  }
  if (landmark.heading) {
    const count = await page
      .getByRole('heading', { name: landmark.heading, exact: false })
      .count()
    if (count === 0) {
      return `Expected the heading "${landmark.heading}" and landed on ${where}. Something sent the walk elsewhere.`
    }
  }
  return null
}

/**
 * Walk the route plan and photograph every screen it reaches.
 *
 * Nothing here asserts the application is correct. It records what the
 * application currently does, and says plainly which screens it could not
 * reach, so the report shows a stated absence rather than a broken image.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} plan
 * @param {object} context - The capture context
 * @param {object} [deps]
 * @param {Function} [deps.capture] - What to do on arrival; the screen shot by default
 * @returns {Promise<{rows: object[], gaps: object[]}>}
 */
export const walk = async (
  page,
  plan,
  context,
  { capture = captureScreen } = {}
) => {
  const memory = {}
  const rows = []
  const gaps = []

  for (const step of plan.prelude ?? []) {
    await runStep(page, step, memory)
  }

  for (const route of plan.routes) {
    try {
      for (const step of route.steps) {
        await runStep(page, step, memory)
      }
      const why = await checkLandmark(page, route.landmark)
      if (why) {
        gaps.push({ screen: route.screen, why })
        continue
      }
      rows.push(await capture(page, route.screen, context))
    } catch (error) {
      gaps.push({ screen: route.screen, why: error.message })
    }
  }

  return { rows, gaps }
}
