import { describe, expect, test } from 'vitest'
import { TimError } from '../../errors.js'
import { looksLikeRunId, unattendedRunIdOf } from './run.js'

describe('#looksLikeRunId', () => {
  test.each([
    ['EUDPA-802', true],
    ['EUDPA-802-vitest-4.2', true],
    ['NO_JIRA', true],
    ['NO_JIRA-vitest-4.2', true],
    ['eudpa-802', false],
    ['vitest-4.2', false]
  ])('Should say whether %s is a run id: %s', (runId, expected) => {
    expect(looksLikeRunId(runId)).toBe(expected)
  })
})

describe('#unattendedRunIdOf', () => {
  test('Should give the branch without its chore/ prefix as the run id', () => {
    const runId = unattendedRunIdOf({
      ticket: 'EUDPA-802',
      branch: 'chore/EUDPA-802-vitest-4.2'
    })

    expect(runId).toBe('EUDPA-802-vitest-4.2')
  })

  test('Should take a NO_JIRA branch for a NO_JIRA run', () => {
    const runId = unattendedRunIdOf({
      ticket: 'NO_JIRA',
      branch: 'fix/NO_JIRA-eslint-10'
    })

    expect(runId).toBe('NO_JIRA-eslint-10')
  })

  test('Should refuse a run with no branch', () => {
    const runId = () => unattendedRunIdOf({ ticket: 'EUDPA-802' })

    expect(runId).toThrow(
      new TimError(
        'USAGE',
        '--unattended needs --branch chore/EUDPA-802-<slug>: the same branch name in every repo.'
      )
    )
  })

  test.each([
    ['EUDPA-802', 'chore/EUDPA-1-vitest-4.2'],
    ['EUDPA-802', 'chore/EUDPA-802'],
    ['EUDPA-802', 'chore/EUDPA-802-Vitest'],
    ['EUDPA-802', 'spike/EUDPA-802-vitest'],
    ['NO_JIRA', 'chore/EUDPA-802-vitest-4.2']
  ])('Should refuse, for %s, the branch %s', (ticket, branch) => {
    const runId = () => unattendedRunIdOf({ ticket, branch })

    expect(runId).toThrow(
      new TimError(
        'USAGE',
        `--branch must be chore/, fix/ or feat/ followed by ${ticket}-<slug>, with the slug in lower case. You gave ${branch}.`
      )
    )
  })

  test('Should refuse an allowlist owner', () => {
    const runId = () =>
      unattendedRunIdOf({
        ticket: 'EUDPA-802',
        branch: 'chore/EUDPA-802-vitest-4.2',
        allowlistOwner: 'A Person',
        expiryDays: '30'
      })

    expect(runId).toThrow(
      new TimError(
        'USAGE',
        '--unattended never allowlists an advisory, so a new advisory needs a person. Remove --allowlist-owner and --expiry-days.'
      )
    )
  })
})
