/** Routes that are the end of a journey rather than a step in one. */
export const TERMINAL_ROUTE =
  /confirmation|submitted|complete|completed|deleted|withdrawn|signed-out|sign-out|logout/i

/** Actions that end the session, so they can only ever be taken last. */
export const DESTRUCTIVE_LABEL =
  /submit|send|delete|remove|withdraw|cancel|amend|sign out|log out|start again|clear/i

const CONTINUE_LABEL =
  /save and continue|continue|save and come back|next|start now|add|save/i

const NAVIGATION_LABEL =
  /^(back|skip|help|cookies|privacy|accessibility|terms|feedback|contact)/i

const classOf = ({ label, href }) => {
  if (DESTRUCTIVE_LABEL.test(label ?? '')) return 'destructive'
  if (TERMINAL_ROUTE.test(href ?? '')) return 'terminal'
  return 'safe'
}

/**
 * Everything the page offers as a way onward, typed.
 *
 * The kinds matter to the order the crawler takes them in, not just to the
 * report: a GOV.UK task list is the service's own declarative sitemap, so its
 * links are worth more than any heuristic about buttons, and following them
 * first is how a hub-and-spoke journey gets mapped in spokes rather than in
 * one long guess.
 *
 * @param {object} model - A page model from the shared extractor
 * @returns {object[]} {kind, label, to, class}
 */
export const outgoingFrom = (model) => {
  const out = []

  for (const item of model.taskItems ?? []) {
    if (!item.href) continue
    out.push({
      kind: 'task',
      label: item.title ?? item.href,
      to: item.href,
      status: item.status ?? null,
      class: classOf({ label: item.title, href: item.href })
    })
  }

  for (const form of model.forms ?? []) {
    for (const button of form.buttons ?? []) {
      out.push({
        kind: 'submit',
        label: button.text ?? 'Continue',
        to: form.action ?? null,
        name: button.name ?? null,
        value: button.value ?? null,
        class: classOf({ label: button.text, href: form.action })
      })
    }
  }

  const taskHrefs = new Set(out.map((entry) => entry.to))
  for (const link of model.links ?? []) {
    if (!link.href || link.href.startsWith('#')) continue
    if (taskHrefs.has(link.href)) continue
    if (NAVIGATION_LABEL.test(link.text ?? '')) continue
    out.push({
      kind: link.isButton ? 'link-button' : 'link',
      label: link.text ?? link.href,
      to: link.href,
      class: classOf({ label: link.text, href: link.href })
    })
  }

  return out
}

/**
 * Whether a button is the page's own primary way forward.
 *
 * @param {object} entry
 * @returns {boolean}
 */
export const isForwardSubmit = (entry) =>
  entry.kind === 'submit' &&
  entry.class === 'safe' &&
  (entry.value === 'continue' || CONTINUE_LABEL.test(entry.label ?? ''))

/**
 * Pick the one action to take from here, and say why the others were not.
 *
 * Task links come before form submits because a task list is a sitemap and a
 * submit is a guess; destructive actions are never picked at all, because
 * taking one ends the session and everything not yet mapped behind it is lost
 * for the rest of the run.
 *
 * @param {object} args
 * @param {object[]} args.outgoing
 * @param {Set<string>} args.visitedTargets - Hrefs this run has already followed
 * @returns {{chosen: object|null, deferred: object[]}}
 */
export const chooseForward = ({ outgoing, visitedTargets = new Set() }) => {
  const unvisitedTask = outgoing.find(
    (entry) =>
      entry.kind === 'task' &&
      entry.class === 'safe' &&
      !visitedTargets.has(entry.to)
  )
  const submit = outgoing.find(isForwardSubmit)
  const primaryLink = outgoing.find(
    (entry) =>
      entry.kind === 'link-button' &&
      entry.class === 'safe' &&
      !visitedTargets.has(entry.to)
  )

  const chosen = unvisitedTask ?? submit ?? primaryLink ?? null
  return {
    chosen,
    deferred: outgoing.filter((entry) => entry !== chosen)
  }
}

/**
 * Why an unexplored action is unexplored, in the frontier's own vocabulary.
 *
 * @param {object} entry
 * @returns {string}
 */
export const deferralReason = (entry) =>
  entry.class === 'destructive' ? 'destructive-deferred' : 'unexplored'
