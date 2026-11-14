import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'

export const mcpTidyScript =
  'scripts/sonar/sonar-remove-stale-mcp-containers.sh'
export const callLogFolder = 'fake-calls'
export const goldenPath = '__fixtures__/__golden__/mcp-tidy.json'

const MCP_LABEL =
  'label=io.modelcontextprotocol.server.name=io.github.SonarSource/sonarqube-mcp-server'

const frontend = 'DEFRA_trade-imports-animals-frontend'
const backend = 'DEFRA_trade-imports-animals-backend'
const gateway = 'DEFRA_trade-imports-dynamics-gateway'

/**
 * The machine each case stands in for: the MCP containers `docker ps`
 * lists newest first, the project key each one's environment holds (none
 * for a container started without one), the ids `docker rm -f` refuses,
 * and how many live `sonar run mcp --project <key>` processes each key
 * has.
 */
export const mcpTidyCases = {
  'removes the surplus beyond the live processes': {
    containers: [
      ['c1', frontend],
      ['c2', backend],
      ['c3', frontend],
      ['c4', null],
      ['c5', frontend],
      ['c6', backend],
      ['c7', gateway]
    ],
    live: { [frontend]: 1, [gateway]: 1 },
    refuseRemoval: ['c6']
  },
  'keeps every container a live process owns': {
    containers: [
      ['c1', frontend],
      ['c2', frontend]
    ],
    live: { [frontend]: 2 },
    refuseRemoval: []
  },
  'leaves a container with no project key alone': {
    containers: [['c1', null]],
    live: {},
    refuseRemoval: []
  },
  'does nothing when no MCP container runs': {
    containers: [],
    live: {},
    refuseRemoval: []
  },
  'does nothing when docker is not running': {
    dockerDown: true,
    containers: [],
    live: {},
    refuseRemoval: []
  }
}

const writeExecutable = (path, body) =>
  writeFileSync(path, `#!/bin/sh\n${body}\n`, { mode: 0o755 })

const fakeDocker = (logFile, { containers, refuseRemoval, dockerDown }) => {
  const inspectArms = containers
    .filter(([, key]) => key !== null)
    .map(
      ([id, key]) =>
        `  "inspect -f {{range .Config.Env}}{{println .}}{{end}} ${id}") printf 'PATH=/usr/bin\\nSONARQUBE_PROJECT_KEY=${key}\\nSONARQUBE_ORG=defra\\n' ;;`
    )
  const refusedArms = refuseRemoval.map(
    (id) => `  "rm -f ${id}") echo "refused" >&2; exit 1 ;;`
  )
  const psOutput = containers.map(([id]) => id).join('\\n')
  return [
    `echo "docker $*" >> '${logFile}'`,
    'case "$*" in',
    dockerDown
      ? `  "ps --filter ${MCP_LABEL} --format {{.ID}}") echo "Cannot connect to the Docker daemon" >&2; exit 1 ;;`
      : `  "ps --filter ${MCP_LABEL} --format {{.ID}}") ${psOutput ? `printf '${psOutput}\\n'` : ':'} ;;`,
    ...inspectArms,
    ...refusedArms,
    '  "rm -f "*) echo "$3" ;;',
    '  "inspect "*) printf "PATH=/usr/bin\\n" ;;',
    '  *) echo "unexpected docker call: $*" >&2; exit 125 ;;',
    'esac'
  ].join('\n')
}

const fakePgrep = (logFile, live) => {
  const arms = Object.entries(live).map(
    ([key, count]) =>
      `  "-f sonar run mcp --project ${key}\\$") ${Array.from({ length: count }, (_, index) => `echo ${4000 + index}`).join('; ')} ;;`
  )
  return [
    `echo "pgrep $*" >> '${logFile}'`,
    'case "$*" in',
    ...arms,
    '  *) exit 1 ;;',
    'esac'
  ].join('\n')
}

/**
 * A staged workspace holding the Bash tidy script, with stand-in `docker`
 * and `pgrep` commands first on PATH that answer for one case and log
 * every call they get under {@link callLogFolder}.
 *
 * @param {keyof typeof mcpTidyCases} caseName
 */
export const stageMcpTidyWorkspace = (caseName) => {
  const machine = mcpTidyCases[caseName]
  const staged = stageBashWorkspace({ scripts: [mcpTidyScript] })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'))
  const bin = join(staged.home, 'bin')
  mkdirSync(bin)
  const logFolder = join(staged.root, callLogFolder)
  mkdirSync(logFolder)
  const logFile = join(logFolder, 'calls.log')
  writeExecutable(join(bin, 'docker'), fakeDocker(logFile, machine))
  writeExecutable(join(bin, 'pgrep'), fakePgrep(logFile, machine.live))
  return { ...staged, env: { PATH: `${bin}:${process.env.PATH}` } }
}
