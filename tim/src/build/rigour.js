const serviceRepoKeys = (row, envelope) => {
  const testSuitePath = /-tests$/
  const keys = Array.isArray(row.repos)
    ? row.repos
    : Object.keys(envelope ?? {})
  return keys.filter((key) => !testSuitePath.test(envelope?.[key]?.path ?? key))
}

const joinedWithAnd = (names) =>
  `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

const rigourAndReasonFor = (row, envelope) => {
  const fastKinds = new Set(['docs', 'test'])
  if (Array.isArray(row.repos) && row.repos.length === 0) {
    return {
      rigour: 'fast',
      reason: 'no backlog repo: the change is in the workspace repo'
    }
  }
  if (Array.isArray(row.gatePhases) && row.gatePhases.length === 0) {
    return { rigour: 'fast', reason: 'the gate runs no phase for it' }
  }
  if (fastKinds.has(row.kind)) {
    return {
      rigour: 'fast',
      reason: `a ${row.kind} row changes no production behaviour`
    }
  }
  const services = serviceRepoKeys(row, envelope)
  if (services.length > 1) {
    return {
      rigour: 'full',
      reason: `${joinedWithAnd(services)}: a contract between repos`
    }
  }
  if (services.length === 0) {
    return {
      rigour: 'standard',
      reason: 'no service repo, the test suite only'
    }
  }
  return { rigour: 'standard', reason: `one service repo, ${services[0]}` }
}

const proposalFor = (row, envelope) => {
  if (row.rigour) {
    return { rigour: row.rigour, source: 'row', reason: 'set on the row' }
  }
  const { rigour, reason } = rigourAndReasonFor(row, envelope)
  return { rigour, source: 'derived', reason }
}

/**
 * A rigour preset for every increment still to build, with the reason the
 * proposal keyed on, from the row and the backlog's repos envelope alone. A
 * row that sets its own `rigour` keeps it, reported as `source: 'row'`.
 *
 * @param {object} backlog - The parsed backlog.json
 * @returns {{id: string, title: string, rigour: string, source: 'row'|'derived', reason: string}[]}
 */
export const proposeRigour = (backlog) =>
  (backlog.increments ?? [])
    .filter((row) => row.status === 'todo')
    .map((row) => ({
      id: row.id,
      title: row.title,
      ...proposalFor(row, backlog.repos)
    }))
