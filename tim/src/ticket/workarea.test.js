import { describe, expect, test } from 'vitest'
import { planningDir } from './workarea.js'

describe('#planningDir', () => {
  test('Should put a ticket under workareas/ticket-planning in the workspace', () => {
    expect(planningDir('/ws', 'EUDPA-1')).toBe(
      '/ws/workareas/ticket-planning/EUDPA-1'
    )
  })
})
