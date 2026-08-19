import { TERMINAL_ROUTE } from './classify.js'

/**
 * The error items the application put on the page, if any.
 *
 * @param {object} model
 * @returns {string[]}
 */
export const errorItems = (model) =>
  (model?.errorSummary?.items ?? []).filter(Boolean)

/**
 * What happened when the crawler pressed the button.
 *
 * The whole end-versus-stuck distinction rests on one question — did the page
 * advance? — so it is answered here once, from data, rather than inferred in
 * three places from three different signals.
 *
 * @param {object} args
 * @param {{routeTemplate: string, fingerprint: string, errors: string[]}} args.before
 * @param {{routeTemplate: string, fingerprint: string, errors: string[]}} args.after
 * @returns {{advanced: boolean, sameRoute: boolean, sameFingerprint: boolean, sameErrors: boolean}}
 */
export const assessAdvance = ({ before, after }) => {
  const sameRoute = before.routeTemplate === after.routeTemplate
  const sameFingerprint = before.fingerprint === after.fingerprint
  const sameErrors =
    JSON.stringify(before.errors ?? []) === JSON.stringify(after.errors ?? [])
  return {
    advanced: !sameRoute || !sameFingerprint,
    sameRoute,
    sameFingerprint,
    sameErrors
  }
}

/**
 * Whether a screen is the natural end of a branch.
 *
 * Terminal is not failure. A confirmation page with nothing to press is the
 * point of the journey, and recording it as a dead end would read as a fault
 * in a service that is working exactly as designed.
 *
 * @param {object} args
 * @param {object[]} args.outgoing
 * @param {string} args.routeTemplate
 * @returns {boolean}
 */
export const isTerminal = ({ outgoing, routeTemplate }) => {
  if (TERMINAL_ROUTE.test(routeTemplate)) return true
  return !outgoing.some((entry) => entry.class === 'safe')
}

/**
 * Why a branch stopped where it did, or null when it has not stopped.
 *
 * Validation-exhausted and no-progress are deliberately separate. Both look
 * like "it would not go forward"; one means the value ladder ran out and the
 * fix is a seed in the hints file, the other means the application swallowed
 * the submit without saying anything and the fix is in the application. Merging
 * them would send every reader to the wrong place.
 *
 * @param {object} args
 * @param {{advanced: boolean, sameErrors: boolean}} args.advance
 * @param {string[]} args.errors - Errors after the attempt
 * @param {number} args.attempts - Attempts made on this screen
 * @param {number} [args.maxAttempts]
 * @returns {{reason: string, evidence: string[]}|null}
 */
export const stopReason = ({ advance, errors, attempts, maxAttempts = 2 }) => {
  if (advance.advanced) return null
  if (errors.length) {
    if (attempts < maxAttempts) return null
    return { reason: 'validation-exhausted', evidence: errors }
  }
  return {
    reason: 'no-progress',
    evidence: ['The page came back unchanged and said nothing.']
  }
}

/**
 * Which budget, if any, has run out.
 *
 * Returns the name of the exhausted budget so the map can say which knob to
 * turn, rather than a bare "budget" that leaves someone guessing between five.
 *
 * @param {object} spent - {steps, replays, elapsedMs}
 * @param {object} budgets - {steps, replays, wallClockMs}
 * @returns {string|null}
 */
export const budgetExhausted = (spent, budgets) => {
  if (budgets.steps != null && spent.steps >= budgets.steps) return 'steps'
  if (budgets.replays != null && spent.replays >= budgets.replays) {
    return 'replays'
  }
  if (budgets.wallClockMs != null && spent.elapsedMs >= budgets.wallClockMs) {
    return 'wall-clock'
  }
  return null
}
