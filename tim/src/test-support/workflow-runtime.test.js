import { describe, test, expect, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  WORKFLOW_PARSE_OPTIONS,
  parseWorkflowScript,
  toScriptBody,
  runWorkflowSource,
  runWorkflowScript
} from './workflow-runtime.js'

let tempDir

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

const writeFixtureScript = async (contents) => {
  tempDir = await mkdtemp(join(tmpdir(), 'workflow-runtime-'))
  const scriptPath = join(tempDir, 'fixture.js')
  await writeFile(scriptPath, contents)
  return scriptPath
}

describe('runWorkflowScript', () => {
  test('returns what a workflow script returns, with the args it was given', async () => {
    const scriptPath = await writeFixtureScript(
      "export const meta = {name:'t'}\nreturn { got: args }"
    )

    const run = await runWorkflowScript(scriptPath, { args: { a: 1 } })

    expect(run).toEqual({
      status: 'returned',
      result: { got: { a: 1 } },
      logs: [],
      agents: []
    })
  })
})

describe('runWorkflowSource', () => {
  test('records each log line in order', async () => {
    const run = await runWorkflowSource("log('one')\nlog('two')\nreturn null")

    expect(run.logs).toEqual(['one', 'two'])
  })

  test('records each agent call prompt and options', async () => {
    const source =
      "const first = await agent('p1', {label:'a'})\nconst second = await agent('p2', {label:'b'})\nreturn [first, second]"

    const run = await runWorkflowSource(source, { answers: [{ x: 1 }] })

    expect(run.agents[0]).toEqual({ prompt: 'p1', options: { label: 'a' } })
    expect(run.agents[1]).toEqual({ prompt: 'p2', options: { label: 'b' } })
  })

  test('returns the scripted answers to the script in call order, then null once exhausted', async () => {
    const source =
      "const first = await agent('p1', {label:'a'})\nconst second = await agent('p2', {label:'b'})\nreturn [first, second]"

    const run = await runWorkflowSource(source, { answers: [{ x: 1 }] })

    expect(run.result).toEqual([{ x: 1 }, null])
  })

  test('reports a thrown error with what ran before it', async () => {
    const run = await runWorkflowSource(
      "log('before')\nthrow new Error('boom')"
    )

    expect(run.status).toBe('threw')
    expect(run.error.message).toBe('boom')
    expect(run.logs).toEqual(['before'])
  })

  test('leaves export text inside a template literal alone', async () => {
    const source =
      "export const meta = {name:'t'}\nconst prompt = `first line\nexport const meta = 'inside'\n`\nreturn prompt"

    const run = await runWorkflowSource(source)

    expect(run.status).toBe('returned')
    expect(run.result).toBe("first line\nexport const meta = 'inside'\n")
  })

  test('runs top-level return and await as the Workflow runtime does', async () => {
    const run = await runWorkflowSource(
      'const x = await Promise.resolve(2)\nreturn x * 3'
    )

    expect(run.result).toBe(6)
  })

  test('runs parallel thunks and returns their results', async () => {
    const run = await runWorkflowSource(
      'return await parallel([() => 1, () => 2])'
    )

    expect(run.result).toEqual([1, 2])
  })

  test('refuses a child workflow', async () => {
    const run = await runWorkflowSource("await workflow('x')\nreturn null")

    expect(run.status).toBe('threw')
    expect(run.error.message).toBe(
      'child workflows are not supported by the test runtime'
    )
  })
})

describe('toScriptBody', () => {
  test('refuses a script that imports', () => {
    expect(() => toScriptBody("import x from 'y'\nreturn 1")).toThrow(
      'workflow script imports a module: a Workflow script cannot import (line 1)'
    )
  })

  test('refuses an export other than meta', () => {
    expect(() =>
      toScriptBody('export const meta = {}\nexport const other = 1\nreturn 1')
    ).toThrow('workflow script exports something other than meta (line 2)')
  })

  test('refuses an export default', () => {
    expect(() =>
      toScriptBody('export const meta = {}\nexport default 1\nreturn 1')
    ).toThrow('workflow script exports something other than meta (line 2)')
  })

  test('refuses a specifier-form export, even of meta', () => {
    expect(() =>
      toScriptBody('const meta = {}\nexport { meta }\nreturn 1')
    ).toThrow('workflow script exports something other than meta (line 2)')
  })
})

describe('parsing', () => {
  test('parses with the C-069 options', () => {
    expect(WORKFLOW_PARSE_OPTIONS).toEqual({
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowReturnOutsideFunction: true
    })
    expect(parseWorkflowScript('return 1').sourceType).toBe('module')
  })

  test('reports a syntax error with its line rather than running', async () => {
    await expect(
      runWorkflowSource('return 1\nconst = 1')
    ).rejects.toMatchObject({
      name: 'SyntaxError',
      loc: expect.objectContaining({ line: 2 })
    })
  })
})
