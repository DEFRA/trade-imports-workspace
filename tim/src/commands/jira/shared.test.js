import { describe, test, expect } from 'vitest'
import { makeJiraAction } from './shared.js'

// makeJiraAction's handler calls process.exit() on completion, which makes
// direct invocation in a unit test painful (mirrors `_client-action.test.js`
// and `backlog/shared.js`'s own action, both handled the same way). Its
// behaviour — dry run vs confirm, the --json envelope, the exit code per
// result — is exercised through each subcommand's own tests
// (create.test.js, attach.test.js, link.test.js, epics.test.js), including
// spawn tests that assert the real exit code and stdout.
describe('makeJiraAction', () => {
  test('returns an async function', () => {
    const action = makeJiraAction({
      run: async () => null,
      renderText: () => ''
    })
    expect(typeof action).toBe('function')
    expect(action.constructor.name).toBe('AsyncFunction')
  })

  test('defaults parseOptions to passing options through unchanged', () => {
    const action = makeJiraAction({
      run: async () => null,
      renderText: () => '',
      parseOptions: undefined
    })
    expect(typeof action).toBe('function')
  })
})
