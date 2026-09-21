export const meta = {
  name: 'args-canary',
  description: 'Zero-agent canary: shows how args reach a workflow and that a missing key stops it before any agent',
  whenToUse: 'After a Claude Code upgrade, or when args delivery is in doubt. Launch by scriptPath with args {list: ["a"], n: 1}, as an object and as a JSON string.',
  phases: [{ title: 'Resolve' }]
}

// >>> args-contract: byte-identical in every .claude/workflows/*.js, checked by tim/src/backlog/workflow-contract.test.js
const parseArgs = (workflowName, rawArgs) => {
  if (typeof rawArgs !== 'string') return rawArgs
  try {
    return JSON.parse(rawArgs)
  } catch (error) {
    throw new Error(`${workflowName}: args arrived as a string that is not JSON (${error.message})`)
  }
}

const missingKeys = (config, keys) =>
  keys.filter((key) => config === null || typeof config !== 'object' || Array.isArray(config) || config[key] === undefined)

const requireKeys = (workflowName, config, keys) => {
  const missing = missingKeys(config, keys)
  if (missing.length === 0) return
  const noun = missing.length === 1 ? 'key' : 'keys'
  throw new Error(`${workflowName}: args is missing required ${noun} ${missing.join(', ')}. Pass every one in args: this workflow has no defaults`)
}

const logResolvedConfig = (workflowName, config) => log(`${workflowName}: resolved configuration ${JSON.stringify(config)}`)
// <<< args-contract

const WORKFLOW_NAME = meta.name
const REQUIRED_KEYS = ['list', 'n']
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)
return { argsType: typeof args, resolved: config }
