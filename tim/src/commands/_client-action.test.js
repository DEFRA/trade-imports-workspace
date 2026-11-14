import { describe, test, expect, vi, afterEach } from 'vitest'
import { makeClientAction } from './_client-action.js'
import { captureProcessOutput } from '../test-support/process-output.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const invoke = (action, { positional = [], options = {}, globals = {} }) =>
  action.call(
    { optsWithGlobals: () => ({ ...options, ...globals }) },
    ...positional,
    options,
    {}
  )

const echoingAction = () =>
  makeClientAction({
    client: () => ({ fetch: async (id, mode) => ({ id, mode }) }),
    call: (client, [id], { mode }) => client.fetch(id, mode),
    renderText: ({ id, mode }, { mode: shownMode }) =>
      `${id} fetched ${mode}, shown ${shownMode}`,
    timVersion: '1.0.0'
  })

describe('makeClientAction', () => {
  test("passes the positional args and the command's own options to call and renderText, then exits 0", async () => {
    const captured = captureProcessOutput()

    await invoke(echoingAction(), {
      positional: ['EUDPA-1'],
      options: { mode: 'full' }
    })

    expect(captured).toEqual({
      stdout: 'EUDPA-1 fetched full, shown full\n',
      stderr: '',
      exitCode: 0
    })
  })

  test('prints the result in a JSON envelope with global --json', async () => {
    const captured = captureProcessOutput()

    await invoke(echoingAction(), {
      positional: ['EUDPA-1'],
      options: { mode: 'full' },
      globals: { json: true }
    })

    expect(JSON.parse(captured.stdout)).toMatchObject({
      ok: true,
      schema_version: 1,
      tim_version: '1.0.0',
      result: { id: 'EUDPA-1', mode: 'full' },
      errors: []
    })
  })
})
