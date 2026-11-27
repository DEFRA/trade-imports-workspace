/**
 * A valid `todo` backlog row, with any field overridden.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
export const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  detail:
    'An importer sees their own notifications, so they can pick one up again.',
  acceptanceCriteria: [
    'The list shows only notifications the signed-in user created.'
  ],
  dependsOn: [],
  status: 'todo',
  ...overrides
})

/**
 * @param {...object} rows
 * @returns {{programme: string, increments: object[]}}
 */
export const backlogOf = (...rows) => ({ programme: 'demo', increments: rows })
