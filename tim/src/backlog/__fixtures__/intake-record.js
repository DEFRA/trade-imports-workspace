export const statement = (overrides = {}) => ({
  id: 'AC1',
  kind: 'acceptance criterion',
  text: 'The list shows only notifications the signed-in user created.',
  coveredBy: ['inc-001'],
  ...overrides
})

export const question = (overrides = {}) => ({
  id: 'Q1',
  question: 'Should the list include drafts?',
  readings: ['Drafts are listed', 'Drafts are left out'],
  default: 'Drafts are left out',
  holdsLaunch: false,
  ...overrides
})

export const intakeRecord = (overrides = {}) => ({
  ticket: 'EUDPA-100',
  updated: '2026-11-25T09:00:00.000+0000',
  readiness: { verdict: 'READY', reasons: ['Every criterion is observable.'] },
  statements: [statement()],
  repos: { workspace: 'The change is to workspace tooling.' },
  questions: [],
  ...overrides
})
