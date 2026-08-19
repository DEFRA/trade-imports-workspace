import { describe, it, expect } from 'vitest'
import { crawl, forwardStep, mineErrors } from './crawl.js'

const TODAY = new Date('2026-08-19T00:00:00Z')

const page = (over = {}) => ({
  h1: 'A page',
  title: 'A page - Service',
  taskItems: [],
  summaryRows: [],
  links: [],
  forms: [],
  allFields: [],
  errorSummary: { items: [] },
  ...over
})

const continueForm = { action: '/next', buttons: [{ text: 'Continue' }] }

/**
 * A scripted application. Each route names the page it renders, the controls
 * on it and where a submit goes next, given what has been filled in so far.
 */
const scriptedDriver = ({ routes, start = '/start' }) => {
  let url = start
  let answers = {}
  const perform = async (step) => {
    if (['fill', 'choose', 'select', 'typeahead'].includes(step.kind)) {
      answers[step.name] = step.value
      return { done: true }
    }
    if (step.kind === 'follow') {
      url = step.href
      return { done: true }
    }
    if (step.kind === 'submit') {
      url = routes[url].next?.({ ...answers }) ?? url
      return { done: true }
    }
    return { done: true }
  }
  return {
    reset: async () => {
      url = start
      answers = {}
    },
    url: () => url,
    model: async () => routes[url].model,
    controls: async () =>
      (routes[url].controls ?? []).map((control) => ({
        ...control,
        answered: answers[control.name] !== undefined,
        value: answers[control.name] ?? control.value
      })),
    perform
  }
}

describe('forwardStep', () => {
  it('turns a submit into a click on the named button', () => {
    expect(
      forwardStep({
        kind: 'submit',
        label: 'Continue',
        name: 'action',
        value: 'continue'
      })
    ).toEqual({
      kind: 'submit',
      label: 'Continue',
      name: 'action',
      value: 'continue'
    })
  })

  it('turns a task link into a navigation', () => {
    expect(
      forwardStep({ kind: 'task', to: '/reason', label: 'Reason' })
    ).toEqual({ kind: 'follow', href: '/reason', text: 'Reason' })
  })
})

describe('mineErrors', () => {
  it('turns what the application said into a seed for one more attempt', () => {
    const { fields, learned } = mineErrors({
      errors: ['Enter a CPH number in the format 12/345/6789'],
      controls: [{ name: 'cph', label: 'CPH number' }],
      today: TODAY
    })

    expect(fields).toEqual({ cph: '12/345/6789' })
    expect(learned[0].why).toBe('the error states the format 12/345/6789')
  })
})

describe('crawl', () => {
  const twoPageJourney = {
    '/start': {
      model: page({ h1: 'What is your full name?', forms: [continueForm] }),
      controls: [{ kind: 'text', name: 'fullName', label: 'Full name' }],
      next: () => '/confirmation'
    },
    '/confirmation': {
      model: page({ h1: 'Notification submitted' })
    }
  }

  it('maps every screen it reaches, in the corpus own naming', async () => {
    const result = await crawl({
      driver: scriptedDriver({ routes: twoPageJourney }),
      screenPrefix: 'fe-',
      today: TODAY
    })

    expect(result.screens.map((screen) => screen.id)).toEqual([
      'fe-start',
      'fe-confirmation'
    ])
  })

  it('records what it typed into each control and which rung chose it', async () => {
    const result = await crawl({
      driver: scriptedDriver({ routes: twoPageJourney }),
      today: TODAY
    })

    expect(result.screens[0].controls).toEqual([
      {
        name: 'fullName',
        kind: 'text',
        label: 'Full name',
        valueUsed: 'Cartographer Test',
        rung: 4,
        confidence: 'low',
        why: 'the wording matches /name/i'
      }
    ])
  })

  it('calls a confirmation page the end of the journey rather than a failure', async () => {
    const result = await crawl({
      driver: scriptedDriver({ routes: twoPageJourney }),
      today: TODAY
    })

    expect([
      result.screens[1].terminal,
      result.screens[1].blocked,
      result.stoppedBy
    ]).toEqual([true, null, 'frontier-empty'])
  })

  it('keeps the steps that reach a screen, so it can be walked to again', async () => {
    const result = await crawl({
      driver: scriptedDriver({ routes: twoPageJourney }),
      today: TODAY
    })

    expect(result.screens[1].route).toEqual([
      {
        screen: 'start',
        action: { kind: 'fill', name: 'fullName', value: 'Cartographer Test' }
      },
      {
        screen: 'start',
        action: { kind: 'submit', label: 'Continue', name: null, value: null }
      }
    ])
  })

  it('explores an option it did not take on the trunk by replaying to it', async () => {
    const routes = {
      '/start': {
        model: page({ h1: 'Why are you importing?', forms: [continueForm] }),
        controls: [
          {
            kind: 'radios',
            name: 'reason',
            legend: 'Why are you importing?',
            options: [
              { value: 'market', label: 'Internal market' },
              { value: 'transit', label: 'Transit' }
            ]
          }
        ],
        next: (answers) =>
          answers.reason === 'transit' ? '/transit' : '/market'
      },
      '/market': { model: page({ h1: 'Market details' }) },
      '/transit': { model: page({ h1: 'Transit details' }) }
    }

    const result = await crawl({
      driver: scriptedDriver({ routes }),
      today: TODAY
    })

    expect(result.screens.map((screen) => screen.id).sort()).toEqual([
      'market',
      'start',
      'transit'
    ])
  })

  it('leaves a destructive action on the frontier rather than ending the session on it', async () => {
    const routes = {
      '/start': {
        model: page({
          h1: 'Check your answers',
          forms: [
            { action: '/submit', buttons: [{ text: 'Accept and submit' }] }
          ]
        })
      }
    }

    const result = await crawl({
      driver: scriptedDriver({ routes }),
      today: TODAY
    })

    expect(result.screens[0].outgoing).toEqual([
      {
        kind: 'submit',
        label: 'Accept and submit',
        to: '/submit',
        class: 'destructive',
        explored: false
      }
    ])
  })

  it('records a screen it could not get past, with the errors as evidence', async () => {
    const routes = {
      '/start': {
        model: page({
          h1: 'What is your CPH number?',
          forms: [continueForm],
          errorSummary: { items: ['Enter a valid CPH number'] }
        }),
        controls: [{ kind: 'text', name: 'cph', label: 'CPH number' }],
        next: () => '/start'
      }
    }

    const result = await crawl({
      driver: scriptedDriver({ routes }),
      today: TODAY
    })

    expect(result.screens[0].blocked).toEqual({
      reason: 'validation-exhausted',
      evidence: ['Enter a valid CPH number']
    })
  })

  it('separates a silently swallowed submit from an exhausted value ladder', async () => {
    const routes = {
      '/start': {
        model: page({ h1: 'Nothing happens here', forms: [continueForm] }),
        next: () => '/start'
      }
    }

    const result = await crawl({
      driver: scriptedDriver({ routes }),
      today: TODAY
    })

    expect(result.screens[0].blocked.reason).toBe('no-progress')
  })

  it('stops when the step budget runs out and says which budget it was', async () => {
    const routes = {
      '/start': {
        model: page({ h1: 'One', forms: [continueForm] }),
        next: () => '/second'
      },
      '/second': {
        model: page({ h1: 'Two', forms: [continueForm] }),
        next: () => '/third'
      },
      '/third': { model: page({ h1: 'Three', forms: [continueForm] }) }
    }

    const result = await crawl({
      driver: scriptedDriver({ routes }),
      budgets: { steps: 2 },
      today: TODAY
    })

    expect([result.stoppedBy, result.screens.length]).toEqual([
      'budget:steps',
      2
    ])
  })

  it('does not call a hub it has already emptied the end of the journey', async () => {
    const routes = {
      '/start': {
        model: page({
          h1: 'Start',
          taskItems: [
            { title: 'First', href: '/first' },
            { title: 'Hub', href: '/hub' }
          ]
        })
      },
      '/first': {
        model: page({
          h1: 'First',
          taskItems: [{ title: 'Shared', href: '/shared' }]
        })
      },
      '/hub': {
        model: page({
          h1: 'Hub',
          taskItems: [{ title: 'Shared', href: '/shared' }]
        })
      },
      '/shared': { model: page({ h1: 'Shared' }) }
    }

    const result = await crawl({
      driver: scriptedDriver({ routes }),
      today: TODAY
    })

    const hub = result.screens.find((screen) => screen.id === 'hub')
    expect(hub.terminal).toBe(false)
    expect(result.warnings.map((warning) => warning.kind)).toEqual([
      'nothing-left-to-take'
    ])
  })

  it('abandons a replay that landed somewhere else, and says both halves of why', async () => {
    // A session whose state has expired answers the same submit differently the
    // second time, which is exactly the case a silent replay files under the
    // wrong transcript.
    const pages = {
      '/start': page({ h1: 'Start', forms: [continueForm] }),
      '/hub': page({
        h1: 'Hub',
        taskItems: [
          { title: 'First', href: '/first' },
          { title: 'Second', href: '/second' }
        ]
      }),
      '/first': page({ h1: 'First' }),
      '/second': page({ h1: 'Second' })
    }
    let url = '/start'
    let sessions = 0
    const driver = {
      reset: async () => {
        sessions += 1
        url = '/start'
      },
      url: () => url,
      model: async () => pages[url],
      controls: async () => [],
      perform: async (step) => {
        if (step.kind === 'follow') {
          url = step.href
          return { done: true }
        }
        if (step.kind === 'submit') {
          if (sessions > 1) return { done: false, why: 'the button had gone' }
          url = '/hub'
        }
        return { done: true }
      }
    }

    const result = await crawl({ driver, today: TODAY })

    expect(result.warnings.map((warning) => warning.kind)).toEqual([
      'action-failed',
      'replay-diverged'
    ])
    expect(result.screens.map((screen) => screen.id)).toEqual([
      'start',
      'hub',
      'first'
    ])
  })

  it('hands each screen model out as it is read, for the differ to eat', async () => {
    const seen = []

    await crawl({
      driver: scriptedDriver({ routes: twoPageJourney }),
      onScreen: ({ id, pageModel }) => seen.push([id, pageModel.h1]),
      today: TODAY
    })

    expect(seen).toEqual([
      ['start', 'What is your full name?'],
      ['confirmation', 'Notification submitted']
    ])
  })
})
