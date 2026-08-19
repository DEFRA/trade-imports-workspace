import { describe, it, expect } from 'vitest'
import { outgoingFrom, chooseForward, deferralReason } from './classify.js'

const model = (over = {}) => ({
  taskItems: [],
  forms: [],
  links: [],
  ...over
})

describe('outgoingFrom', () => {
  it('reads a task list as the service own sitemap', () => {
    const outgoing = outgoingFrom(
      model({
        taskItems: [
          { title: 'Import reason', href: '/reason', status: 'Not started' }
        ]
      })
    )

    expect(outgoing).toEqual([
      {
        kind: 'task',
        label: 'Import reason',
        to: '/reason',
        status: 'Not started',
        class: 'safe'
      }
    ])
  })

  it('marks a submit button as destructive so it is only ever taken last', () => {
    const outgoing = outgoingFrom(
      model({
        forms: [{ action: '/submit', buttons: [{ text: 'Accept and submit' }] }]
      })
    )

    expect(outgoing[0].class).toBe('destructive')
  })

  it('marks a confirmation link as terminal', () => {
    const outgoing = outgoingFrom(
      model({ links: [{ text: 'View it', href: '/confirmation' }] })
    )

    expect(outgoing[0].class).toBe('terminal')
  })

  it('ignores the boilerplate links every GOV.UK page carries', () => {
    const outgoing = outgoingFrom(
      model({
        links: [
          { text: 'Cookies', href: '/cookies' },
          { text: 'Accessibility statement', href: '/accessibility' },
          { text: 'Add an animal', href: '/animals/add' }
        ]
      })
    )

    expect(outgoing.map((entry) => entry.to)).toEqual(['/animals/add'])
  })

  it('drops a link that only jumps within the page', () => {
    const outgoing = outgoingFrom(
      model({ links: [{ text: 'Enter a name', href: '#fullName' }] })
    )

    expect(outgoing).toEqual([])
  })
})

describe('chooseForward', () => {
  it('takes an unvisited task before a form submit', () => {
    const outgoing = outgoingFrom(
      model({
        taskItems: [{ title: 'Import reason', href: '/reason' }],
        forms: [{ action: '/next', buttons: [{ text: 'Continue' }] }]
      })
    )

    const { chosen } = chooseForward({ outgoing, visitedTargets: new Set() })

    expect(chosen.to).toBe('/reason')
  })

  it('moves on to the submit once every task has been visited', () => {
    const outgoing = outgoingFrom(
      model({
        taskItems: [{ title: 'Import reason', href: '/reason' }],
        forms: [{ action: '/next', buttons: [{ text: 'Continue' }] }]
      })
    )

    const { chosen } = chooseForward({
      outgoing,
      visitedTargets: new Set(['/reason'])
    })

    expect(chosen.kind).toBe('submit')
  })

  it('never picks a destructive action, because taking one ends the session', () => {
    const outgoing = outgoingFrom(
      model({
        forms: [{ action: '/submit', buttons: [{ text: 'Submit' }] }]
      })
    )

    const { chosen, deferred } = chooseForward({ outgoing })

    expect(chosen).toBeNull()
    expect(deferred).toHaveLength(1)
  })

  it('names why a destructive action was left alone', () => {
    expect(deferralReason({ class: 'destructive' })).toBe(
      'destructive-deferred'
    )
  })
})
