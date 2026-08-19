import {
  routeTemplate,
  maskedUrl,
  fingerprintInputs,
  fingerprint,
  screenId,
  uniqueId
} from './identity.js'
import { planScreen } from './plan.js'
import { outgoingFrom, chooseForward } from './classify.js'
import {
  errorItems,
  assessAdvance,
  isTerminal,
  stopReason,
  budgetExhausted
} from './stopping.js'
import { makeFrontier } from './frontier.js'
import { mineErrorFormat, matchErrorToControl } from './values.js'

export const DEFAULT_BUDGETS = {
  steps: 400,
  replays: 40,
  wallClockMs: 15 * 60 * 1000,
  variantsPerRoute: 3,
  replayDepth: 30,
  screenAttempts: 2
}

/**
 * The step that takes one onward action.
 *
 * @param {object} entry - An outgoing entry
 * @returns {object}
 */
export const forwardStep = (entry) =>
  entry.kind === 'submit'
    ? {
        kind: 'submit',
        label: entry.label,
        name: entry.name ?? null,
        value: entry.value ?? null
      }
    : { kind: 'follow', href: entry.to, text: entry.label }

/**
 * Turn the errors on a page into seeds for one more attempt.
 *
 * @param {object} args
 * @param {string[]} args.errors
 * @param {object[]} args.controls
 * @param {Date} args.today
 * @returns {{fields: Record<string, string>, learned: object[]}}
 */
export const mineErrors = ({ errors, controls, today }) => {
  const fields = {}
  const learned = []
  for (const message of errors) {
    const mined = mineErrorFormat(message, today)
    if (!mined) continue
    const control = matchErrorToControl(message, controls)
    if (!control?.name) continue
    fields[control.name] = mined.value
    learned.push({ field: control.name, value: mined.value, why: mined.why })
  }
  return { fields, learned }
}

/**
 * Walk a running application from its start URL and record what it has.
 *
 * Pure over an injected driver. Everything that touches a browser is behind
 * four methods, so the state machine — which is where every judgement about
 * screen identity, coverage and honesty lives — is exercised against scripted
 * pages rather than against Chromium.
 *
 * Nothing here asserts the application is correct. It maps what the
 * application does today, and states plainly what it could not reach, because
 * a partial map that says so is useful and a partial map that looks complete
 * is dangerous.
 *
 * @param {object} args
 * @param {object} args.driver - {reset, url, model, controls, perform}
 * @param {object} [args.hints] - The corpus's hints file for this side
 * @param {object} [args.budgets]
 * @param {string} [args.screenPrefix] - The side's screen id prefix
 * @param {(screen: object) => Promise<void>|void} [args.onScreen]
 * @param {() => number} [args.clock]
 * @param {Date} [args.today]
 * @returns {Promise<{screens: object[], frontier: object[], unfilled: object[], warnings: object[], stoppedBy: string, spent: object}>}
 */
export const crawl = async ({
  driver,
  hints,
  budgets: given,
  screenPrefix = '',
  onScreen,
  clock = () => Date.now(),
  today = new Date()
}) => {
  const budgets = { ...DEFAULT_BUDGETS, ...(given ?? {}) }
  const startedAt = clock()
  const frontier = makeFrontier({
    caps: {
      variantsPerRoute: budgets.variantsPerRoute,
      replayDepth: budgets.replayDepth
    }
  })
  const screens = []
  const byKey = new Map()
  const usedIds = new Set()
  const unfilled = []
  const warnings = []
  const visitedTargets = new Set()
  const spent = { steps: 0, replays: 0 }
  let stoppedBy = 'frontier-empty'

  const spend = () => ({ ...spent, elapsedMs: clock() - startedAt })

  const observe = async () => {
    const url = driver.url()
    const model = await driver.model()
    const controls = await driver.controls()
    const template = routeTemplate(url)
    const inputs = fingerprintInputs({
      model,
      controls,
      routeTemplate: template
    })
    return {
      url,
      model,
      controls,
      routeTemplate: template,
      inputs,
      fingerprint: fingerprint(inputs),
      errors: errorItems(model)
    }
  }

  const register = async (view, route, variant) => {
    const id = uniqueId(
      screenId({
        prefix: screenPrefix,
        routeTemplate: view.routeTemplate,
        variant
      }),
      usedIds
    )
    usedIds.add(id)
    const screen = {
      id,
      routeTemplate: view.routeTemplate,
      url: maskedUrl(view.url),
      heading: view.model.h1 ?? null,
      title: view.model.title ?? null,
      variant: variant ?? null,
      fingerprint: view.fingerprint,
      fingerprintInputs: view.inputs,
      terminal: false,
      blocked: null,
      route,
      model: `${id}.json`,
      controls: [],
      outgoing: []
    }
    screens.push(screen)
    byKey.set(`${view.routeTemplate}#${view.fingerprint}`, screen)
    if (onScreen) await onScreen({ ...screen, pageModel: view.model })
    return screen
  }

  const perform = async (step, transcript, screen) => {
    const result = (await driver.perform(step)) ?? { done: true }
    transcript.push({ screen: screen.id, action: step })
    if (!result.done) {
      warnings.push({
        screen: screen.id,
        kind: 'action-failed',
        detail:
          `${step.kind} ${step.name ?? step.href ?? step.label ?? ''}`.trim(),
        why: result.why ?? 'the driver could not carry this out'
      })
    }
    return result
  }

  const fillScreen = async ({
    view,
    screen,
    transcript,
    overlay,
    collect = true
  }) => {
    const merged = overlay
      ? { ...hints, fields: { ...(hints?.fields ?? {}), ...overlay } }
      : hints
    const plan = planScreen({
      controls: view.controls,
      hints: merged,
      routeTemplate: view.routeTemplate,
      today,
      caps: { variantsPerRoute: budgets.variantsPerRoute }
    })

    for (const action of plan.actions) await perform(action, transcript, screen)
    if (collect) {
      screen.controls.push(...plan.records)
      for (const field of plan.unfilled) {
        unfilled.push({ screen: screen.id, ...field })
      }
    }
    return plan
  }

  // A conditional reveal is a different screen, not the same screen in a
  // different mood: the corpus already files it separately, and the two sides
  // are only comparable if both call it the same thing.
  const revealAfter = async ({ view, transcript, reveals }) => {
    const after = await observe()
    if (after.fingerprint === view.fingerprint) return null
    const variant = `${reveals[0].value ?? reveals[0].control}-revealed`
    const revealed = await register(after, [...transcript], variant)
    await fillScreen({ view: after, screen: revealed, transcript })
    return after
  }

  const walkFrom = async (prefix, opener, openerScreen) => {
    await driver.reset()
    spent.replays += 1
    const transcript = [...prefix]
    for (const step of prefix) await driver.perform(step.action)
    // A branch that diverges by answering a question differently is still on
    // the screen it diverged from, so the first arrival of a replay is allowed
    // to land somewhere already mapped. Bailing there would explore every
    // branch by walking to it and immediately stopping.
    let resuming = false
    if (opener) {
      await driver.perform(opener)
      transcript.push({ screen: openerScreen ?? 'frontier', action: opener })
      resuming = true
    }

    let attempts = 0
    for (;;) {
      const exhausted = budgetExhausted(spend(), budgets)
      if (exhausted) {
        stoppedBy = `budget:${exhausted}`
        return
      }

      let view = await observe()
      const key = `${view.routeTemplate}#${view.fingerprint}`
      const known = byKey.get(key)
      if (known && !resuming) return
      resuming = false

      const prefixAtArrival = [...transcript]
      const screen = known ?? (await register(view, prefixAtArrival))
      const plan = await fillScreen({
        view,
        screen,
        transcript,
        collect: !known
      })
      if (plan.reveals.length && !known) {
        const after = await revealAfter({
          view,
          transcript,
          reveals: plan.reveals
        })
        if (after) view = after
      }

      const outgoing = outgoingFrom(view.model)
      const { chosen, deferred } = chooseForward({ outgoing, visitedTargets })
      if (!known) {
        screen.outgoing = outgoing.map((entry) => ({
          kind: entry.kind,
          label: entry.label,
          to: entry.to ?? null,
          class: entry.class,
          explored: entry === chosen
        }))
      }

      for (const entry of deferred) {
        frontier.push({
          kind: entry.kind,
          screen: screen.id,
          routeTemplate: view.routeTemplate,
          label: entry.label,
          value: entry.to ?? entry.label,
          class: entry.class,
          prefix: prefixAtArrival,
          opener: forwardStep(entry)
        })
      }
      for (const branch of plan.branches) {
        frontier.push({
          kind: branch.kind,
          screen: screen.id,
          routeTemplate: view.routeTemplate,
          control: branch.control,
          value: branch.value,
          label: branch.label,
          capped: branch.capped,
          class: 'safe',
          prefix: prefixAtArrival,
          opener: branch.value
            ? { kind: 'choose', name: branch.control, value: branch.value }
            : null
        })
      }

      if (
        !chosen ||
        isTerminal({ outgoing, routeTemplate: view.routeTemplate })
      ) {
        if (!known) screen.terminal = true
        return
      }

      if (chosen.to) visitedTargets.add(chosen.to)
      const before = {
        routeTemplate: view.routeTemplate,
        fingerprint: view.fingerprint,
        errors: view.errors
      }
      await perform(forwardStep(chosen), transcript, screen)
      spent.steps += 1

      const after = await observe()
      const advance = assessAdvance({ before, after })
      if (advance.advanced) {
        attempts = 0
        continue
      }

      attempts += 1
      const stop = stopReason({
        advance,
        errors: after.errors,
        attempts,
        maxAttempts: budgets.screenAttempts
      })
      if (stop) {
        screen.blocked = stop
        for (const message of stop.evidence) {
          const control = matchErrorToControl(message, after.controls)
          unfilled.push({
            screen: screen.id,
            name: control?.name ?? null,
            why: message
          })
        }
        return
      }

      const { fields, learned } = mineErrors({
        errors: after.errors,
        controls: after.controls,
        today
      })
      if (Object.keys(fields).length === 0) {
        screen.blocked = {
          reason: 'validation-exhausted',
          evidence: after.errors
        }
        return
      }
      screen.controls.push(
        ...learned.map((entry) => ({
          name: entry.field,
          kind: 'mined',
          label: null,
          valueUsed: entry.value,
          rung: 3,
          confidence: 'medium',
          why: entry.why
        }))
      )
      await fillScreen({
        view: after,
        screen,
        transcript,
        overlay: fields
      })
      await perform(forwardStep(chosen), transcript, screen)
      spent.steps += 1
    }
  }

  await walkFrom([])

  for (;;) {
    const exhausted = budgetExhausted(spend(), budgets)
    if (exhausted) {
      stoppedBy = `budget:${exhausted}`
      frontier.closeOut('budget')
      break
    }
    const next = frontier.take()
    if (!next) break
    await walkFrom(next.prefix ?? [], next.opener ?? null, next.screen)
  }

  return {
    screens,
    frontier: frontier.remaining(),
    unfilled,
    warnings,
    stoppedBy,
    spent: spend()
  }
}
