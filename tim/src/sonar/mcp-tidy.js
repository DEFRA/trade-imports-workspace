import { run } from '../exec/exec.js'

const MCP_CONTAINER_LABEL =
  'label=io.modelcontextprotocol.server.name=io.github.SonarSource/sonarqube-mcp-server'
const PROJECT_KEY_PREFIX = 'SONARQUBE_PROJECT_KEY='

const linesOf = (text) => text.split('\n').filter((line) => line !== '')

const runningMcpContainerIds = async () => {
  const { stdout, exitCode } = await run('docker', [
    'ps',
    '--filter',
    MCP_CONTAINER_LABEL,
    '--format',
    '{{.ID}}'
  ])
  return exitCode === 0 ? linesOf(stdout) : []
}

const projectKeyOf = async (containerId) => {
  const { stdout } = await run('docker', [
    'inspect',
    '-f',
    '{{range .Config.Env}}{{println .}}{{end}}',
    containerId
  ])
  return linesOf(stdout)
    .find((line) => line.startsWith(PROJECT_KEY_PREFIX))
    ?.slice(PROJECT_KEY_PREFIX.length)
}

const liveMcpProcessCount = async (projectKey) => {
  const { stdout } = await run('pgrep', [
    '-f',
    `sonar run mcp --project ${projectKey}$`
  ])
  return linesOf(stdout).length
}

const containersByProjectKey = async (containerIds) => {
  const byKey = new Map()
  for (const containerId of containerIds) {
    const projectKey = await projectKeyOf(containerId)
    if (!projectKey) continue
    byKey.set(projectKey, [...(byKey.get(projectKey) ?? []), containerId])
  }
  return byKey
}

const removeContainer = async (containerId) =>
  (await run('docker', ['rm', '-f', containerId])).exitCode === 0

/**
 * Removes the sonar MCP containers no live `sonar run mcp --project <key>`
 * process owns. For each project key, keeps as many of the newest
 * containers as there are live processes for that key and force-removes
 * the rest. Leaves alone a container with no project key. Does nothing
 * when docker cannot list containers.
 *
 * @returns {Promise<string>} `Removed N stale sonar MCP container(s).` with a final newline, or '' when none was removed
 * @throws {import('../errors.js').TimError} MISSING_DEP when docker or pgrep is not installed
 */
export const removeStaleMcpContainers = async () => {
  const byKey = await containersByProjectKey(await runningMcpContainerIds())
  let removed = 0
  for (const projectKey of [...byKey.keys()].sort()) {
    const live = await liveMcpProcessCount(projectKey)
    for (const containerId of byKey.get(projectKey).slice(live)) {
      if (await removeContainer(containerId)) removed += 1
    }
  }
  return removed > 0 ? `Removed ${removed} stale sonar MCP container(s).\n` : ''
}
