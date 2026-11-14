import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { workspaceScriptExists } from '../test-support/bash-golden-harness.js'
import { coloursFor, colourEnabled, errorLine } from './colour.js'

const terminal = { isTTY: true }
const pipe = { isTTY: false }

describe('#colourEnabled', () => {
  test.each([
    ['a terminal with neither CI nor NO_COLOR', {}, terminal, true],
    ['a terminal with an empty CI', { CI: '' }, terminal, true],
    ['a terminal under CI', { CI: '1' }, terminal, false],
    ['a terminal under NO_COLOR', { NO_COLOR: '1' }, terminal, false],
    ['a pipe', {}, pipe, false]
  ])('Should colour %s: %s', (_case, env, stream, expected) => {
    expect(colourEnabled({ env, stream })).toBe(expected)
  })
})

describe('#coloursFor', () => {
  test('Should give escape codes for a terminal and empty strings for a pipe', () => {
    const colours = {
      terminal: coloursFor({ env: {}, stream: terminal }),
      pipe: coloursFor({ env: {}, stream: pipe })
    }

    expect(colours).toEqual({
      terminal: {
        reset: '\u001b[0m',
        red: '\u001b[31m',
        green: '\u001b[32m',
        yellow: '\u001b[33m',
        cyan: '\u001b[36m',
        grey: '\u001b[90m',
        bold: '\u001b[1m'
      },
      pipe: {
        reset: '',
        red: '',
        green: '',
        yellow: '',
        cyan: '',
        grey: '',
        bold: ''
      }
    })
  })

  test.skipIf(!workspaceScriptExists('scripts/stack/lib/colour.sh'))(
    'Should give the escape codes lib/colour.sh sets',
    () => {
      const script = readFileSync(
        join(
          fileURLToPath(new URL('../../../', import.meta.url)),
          'scripts/stack/lib/colour.sh'
        ),
        'utf8'
      )
      const bashCodes = Object.fromEntries(
        [...script.matchAll(/COLOUR_([A-Z]+)=\$'\\033\[(\d+)m'/g)].map(
          ([, name, code]) => [name.toLowerCase(), `\u001b[${code}m`]
        )
      )

      expect(bashCodes).toEqual(coloursFor({ env: {}, stream: terminal }))
    }
  )
})

describe('#errorLine', () => {
  test('Should colour an error red for a terminal standard error, and leave it plain for a pipe', () => {
    const lines = {
      terminal: errorLine('error: no services', { env: {}, stream: terminal }),
      pipe: errorLine('error: no services', { env: {}, stream: pipe })
    }

    expect(lines).toEqual({
      terminal: '\u001b[31merror: no services\u001b[0m\n',
      pipe: 'error: no services\n'
    })
  })
})
