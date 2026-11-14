import { describe, expect, test } from 'vitest'
import { execa } from 'execa'
import { fileURLToPath } from 'node:url'
import { runFailOpen } from './hook-runtime.js'

const failOpenProgram = fileURLToPath(
  new URL('./__fixtures__/fail-open-program.js', import.meta.url)
)

const runHook = (args) =>
  execa('node', [failOpenProgram, ...args], {
    reject: false,
    stripFinalNewline: false
  })

const captureWrites = () => {
  const written = []
  return { written, write: (text) => written.push(text) }
}

describe('#runFailOpen', () => {
  test('Should write and return the text the work produces', async () => {
    const { written, write } = captureWrites()

    const output = await runFailOpen(() => 'context\n', { write })

    expect({ output, written }).toEqual({
      output: 'context\n',
      written: ['context\n']
    })
  })

  test('Should write nothing when the work produces no text', async () => {
    const { written, write } = captureWrites()

    const output = await runFailOpen(async () => '', { write })

    expect({ output, written }).toEqual({ output: '', written: [] })
  })

  test('Should write nothing and resolve when the work throws', async () => {
    const { written, write } = captureWrites()

    const output = await runFailOpen(
      () => {
        throw new Error('broken')
      },
      { write }
    )

    expect({ output, written }).toEqual({ output: '', written: [] })
  })

  test('Should write nothing when the work outlasts the timeout', async () => {
    const { written, write } = captureWrites()

    const output = await runFailOpen(
      () => new Promise((resolve) => setTimeout(() => resolve('late'), 500)),
      { write, timeoutMs: 50 }
    )

    expect({ output, written }).toEqual({ output: '', written: [] })
  })
})

describe('a hook command built with failOpenCommand and failOpenAction', () => {
  test('Should print what the work produces and exit 0', async () => {
    const run = await runHook(['hook', '--behaviour', 'answer'])

    expect({ exitCode: run.exitCode, stdout: run.stdout }).toEqual({
      exitCode: 0,
      stdout: '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit"}}\n'
    })
  })

  test.each([
    ['the work produces nothing', ['hook', '--behaviour', 'silent']],
    ['the work throws', ['hook', '--behaviour', 'throw']],
    ['SonarCloud cannot be reached', ['hook', '--behaviour', 'offline']],
    ['the work never finishes', ['hook', '--behaviour', 'hang']],
    ['a stray promise rejects', ['hook', '--behaviour', 'stray-rejection']],
    ['a flag is unknown', ['hook', '--behaviour', 'answer', '--bogus']],
    ['a required option is missing', ['hook']]
  ])('Should exit 0 with empty stdout when %s', async (_case, args) => {
    const run = await runHook(args)

    expect({ exitCode: run.exitCode, stdout: run.stdout }).toEqual({
      exitCode: 0,
      stdout: ''
    })
  })

  test('Should say on stderr why it skipped', async () => {
    const run = await runHook(['hook', '--behaviour', 'throw'])

    expect(run.stderr).toBe('Hook skipped: the hook broke\n')
  })
})
