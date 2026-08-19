import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { walk } from './walk.js'
import { loadRoutePlan } from './route-plan.js'
import { loadAnchors, writeManifest } from './screens.js'

// This is a requirements-gathering tool, not a test. Nothing here asserts that
// the application is correct. It walks the route plan the discovery stage
// produced, photographs every screen it reaches, and records why it could not
// reach the rest — so the comparison rests on what the application does today.
//
// It is named .pw.js rather than .spec.js for two reasons: it is not a spec,
// and tim's vitest run collects **/*.spec.js.
//
// Everything it needs arrives in one file, whose path `tim parity capture`
// puts in TIM_CAPTURE_CONTEXT. There are no defaults: every path comes from
// the corpus profile, because a guess files this comparison's evidence under
// another one.

const contextPath = process.env.TIM_CAPTURE_CONTEXT
if (!contextPath) {
  throw new Error(
    'TIM_CAPTURE_CONTEXT is not set. Run this through "tim parity capture <runId> --side <id>" rather than through Playwright directly.'
  )
}

const context = JSON.parse(readFileSync(contextPath, 'utf8'))

test('record every screen the route plan reaches', async ({ page }) => {
  const plan = loadRoutePlan(context.routePlanPath)
  const anchors = loadAnchors(context.anchorsPath)
  const { rows, gaps } = await walk(page, plan, { ...context, anchors })

  const manifest = writeManifest(rows, { ...context, anchors })
  const notReached = gaps.length
    ? `\nnot reached:\n${gaps.map((gap) => `  ${gap.screen}: ${gap.why}`).join('\n')}`
    : ''
  process.stdout.write(
    `captured ${rows.length} of ${plan.routes.length} screens -> ${manifest}${notReached}\n`
  )

  // A run that photographed nothing is a run whose evidence nobody can use,
  // and a silent near-miss is how a report ends up claiming evidence it does
  // not have.
  if (rows.length === 0) {
    throw new Error(
      `Reached none of the ${plan.routes.length} screens the route plan names. Re-map the application.`
    )
  }
})
