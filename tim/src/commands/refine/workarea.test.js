import { describe, expect, test } from 'vitest'
import { refinementDir, reviewTemplatePath, utcSeconds } from './workarea.js'

describe('#refinementDir', () => {
  test('Should sit under the workspace given, not a fixed path', () => {
    expect(refinementDir('/clones/second', 'EUDPA-1')).toBe(
      '/clones/second/workareas/ticket-refinement/EUDPA-1'
    )
  })
})

describe('#reviewTemplatePath', () => {
  test('Should be the ticket-refiner template in the workspace given', () => {
    expect(reviewTemplatePath('/w')).toBe(
      '/w/.claude/skills/ticket-refiner/assets/refinement-template.md'
    )
  })
})

describe('#utcSeconds', () => {
  test('Should drop the milliseconds', () => {
    expect(utcSeconds(new Date('2026-01-02T03:04:05.678Z'))).toBe(
      '2026-01-02T03:04:05Z'
    )
  })
})
