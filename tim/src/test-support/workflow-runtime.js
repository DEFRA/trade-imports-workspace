import { parse } from 'acorn'
import { readFile } from 'node:fs/promises'

// The exact acorn options C-069 pins: ecmaVersion so acorn accepts modern
// syntax, sourceType 'module' so a workflow script's top-level `export const
// meta` and `import` parse, and the third option below so its top-level
// `return` parses too — the Workflow runtime runs a script's body as if it
// were the inside of a function, and a script written against that contract
// uses `return` at the top level.
export const WORKFLOW_PARSE_OPTIONS = Object.freeze({
  ecmaVersion: 'latest',
  sourceType: 'module',
  allowReturnOutsideFunction: true
})

export const parseWorkflowScript = (source) =>
  parse(source, WORKFLOW_PARSE_OPTIONS)

const isMetaVariableExport = (node) =>
  node.declaration?.type === 'VariableDeclaration' &&
  node.declaration.declarations.length === 1 &&
  node.declaration.declarations[0].id.name === 'meta'

// Cuts only the `export ` keyword off `export const meta = …` — everything
// after it, including `const meta = …` itself, is left exactly as written.
const metaExportCut = (node) => ({
  start: node.start,
  end: node.declaration.start
})

const applyCuts = (source, cuts) =>
  [...cuts]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, cut) => text.slice(0, cut.start) + text.slice(cut.end),
      source
    )

const bodyStatementCut = (node) => {
  if (node.type === 'ImportDeclaration') {
    throw new Error(
      `workflow script imports a module: a Workflow script cannot import (line ${node.loc.start.line})`
    )
  }
  if (node.type === 'ExportNamedDeclaration' && isMetaVariableExport(node)) {
    return metaExportCut(node)
  }
  if (node.type.startsWith('Export')) {
    throw new Error(
      `workflow script exports something other than meta (line ${node.loc.start.line})`
    )
  }
  return null
}

// Walks the top-level statements of the AST (never regex — a regex anchored
// at `export const meta` also matches inside a multi-line template literal,
// and these scripts are mostly long template-literal prompts) and cuts only
// the `export ` keyword off the one `export const meta = …` statement.
export const toScriptBody = (source) => {
  const program = parse(source, { ...WORKFLOW_PARSE_OPTIONS, locations: true })
  const cuts = program.body.map(bodyStatementCut).filter(Boolean)
  return applyCuts(source, cuts)
}

const createFakeRuntime = (answers) => {
  const logs = []
  const agents = []
  let nextAnswerIndex = 0

  // Returns each scripted answer in call order, then null once exhausted.
  const agent = async (prompt, options) => {
    agents.push({ prompt, options })
    const answer =
      nextAnswerIndex < answers.length ? answers[nextAnswerIndex] : null
    nextAnswerIndex += 1
    return answer
  }

  const log = (line) => logs.push(line)
  const phase = () => {}
  const parallel = async (thunks) => Promise.all(thunks.map((thunk) => thunk()))
  const workflow = async () => {
    throw new Error('child workflows are not supported by the test runtime')
  }

  return { logs, agents, agent, log, phase, parallel, workflow }
}

/**
 * Runs a workflow script's source inside a fake Workflow runtime and reports
 * what happened. Resolves to `{status: 'returned', result, logs, agents}`
 * when the script's top-level `return` completes, or `{status: 'threw',
 * error, logs, agents}` when the script throws. A script that cannot be run
 * at all — a syntax error, an import, or an export other than `meta` —
 * REJECTS instead of resolving with `status: 'threw'`, so a broken script
 * can never be mistaken for one that ran and stopped cleanly.
 *
 * @param {string} source
 * @param {{args?: unknown, answers?: unknown[]}} [options]
 * @returns {Promise<{status: 'returned', result: unknown, logs: string[], agents: {prompt: string, options: unknown}[]} | {status: 'threw', error: Error, logs: string[], agents: {prompt: string, options: unknown}[]}>}
 */
export const runWorkflowSource = async (
  source,
  { args, answers = [] } = {}
) => {
  const body = toScriptBody(source)
  const { logs, agents, agent, log, phase, parallel, workflow } =
    createFakeRuntime(answers)
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  const run = new AsyncFunction(
    'args',
    'agent',
    'log',
    'phase',
    'parallel',
    'workflow',
    body
  )

  try {
    const result = await run(args, agent, log, phase, parallel, workflow)
    return { status: 'returned', result, logs, agents }
  } catch (error) {
    return { status: 'threw', error, logs, agents }
  }
}

export const runWorkflowScript = async (scriptPath, options) => {
  const source = await readFile(scriptPath, 'utf8')
  return runWorkflowSource(source, options)
}
