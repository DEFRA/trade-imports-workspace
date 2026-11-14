import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { lastLines, runLogged } from './build-log.js'

describe('#lastLines', () => {
  test.each([
    ['', 2, ''],
    ['one\n', 2, 'one\n'],
    ['one\ntwo\nthree\n', 2, 'two\nthree\n'],
    ['one\ntwo\nthree', 2, 'two\nthree'],
    ['one\n\n', 1, '\n']
  ])('the last lines of %j, %i of them, are %j', (text, count, tail) => {
    expect(lastLines(text, count)).toBe(tail)
  })
})

describe('#runLogged', () => {
  const inFolder = async (act) => {
    const dir = mkdtempSync(join(tmpdir(), 'tim-build-log-'))
    try {
      return await act(dir)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  const tool = (dir, body) => {
    const path = join(dir, 'tool.sh')
    writeFileSync(path, `#!/bin/sh\n${body}\n`, { mode: 0o755 })
    return path
  }

  test('keeps a passing command quiet and its output in the log', () =>
    inFolder(async (dir) => {
      const errors = []

      const exitCode = await runLogged(
        tool(dir, 'echo out; echo err >&2'),
        [],
        {
          dir,
          env: { PATH: process.env.PATH },
          writeError: (text) => errors.push(text)
        }
      )

      expect({
        exitCode,
        errors,
        log: readFileSync(join(dir, '.cache', 'sonar-push-check.log'), 'utf8')
      }).toEqual({ exitCode: 0, errors: [], log: 'out\nerr\n' })
    }))

  test('shows only the last 60 lines of a failing command', () =>
    inFolder(async (dir) => {
      const errors = []
      const command = tool(
        dir,
        'i=1; while [ $i -le 70 ]; do echo "line $i"; i=$((i+1)); done; exit 3'
      )

      const exitCode = await runLogged(command, [], {
        dir,
        env: { PATH: process.env.PATH },
        writeError: (text) => errors.push(text)
      })

      const lines = Array.from(
        { length: 60 },
        (_, index) => `line ${index + 11}`
      )
      expect({ exitCode, errors }).toEqual({
        exitCode: 3,
        errors: [
          `\nFailed: ${command}. Last 60 lines of ${dir}/.cache/sonar-push-check.log:\n${lines.join('\n')}\n\n`
        ]
      })
    }))

  test('fails with 127 when the command is not installed', () =>
    inFolder(async (dir) => {
      const errors = []

      const exitCode = await runLogged('no-such-build-tool', [], {
        dir,
        env: { PATH: dir },
        writeError: (text) => errors.push(text)
      })

      expect({ exitCode, errors }).toEqual({
        exitCode: 127,
        errors: [
          `\nFailed: no-such-build-tool. Last 60 lines of ${dir}/.cache/sonar-push-check.log:\nno-such-build-tool: command not found\n\n`
        ]
      })
    }))

  test('fails with 137 and shows the log tail when SIGKILL ends the command', () =>
    inFolder(async (dir) => {
      const errors = []
      const command = tool(dir, 'echo before the kill\nkill -9 $$')

      const exitCode = await runLogged(command, [], {
        dir,
        env: { PATH: process.env.PATH },
        writeError: (text) => errors.push(text)
      })

      expect({ exitCode, errors }).toEqual({
        exitCode: 137,
        errors: [
          `\nFailed: ${command}. Last 60 lines of ${dir}/.cache/sonar-push-check.log:\nbefore the kill\n\n`
        ]
      })
    }))
})
