const servicesAndSuitesIn = (row, envelope) => {
  const testSuitePath = /-tests$/
  const keys = Array.isArray(row.repos)
    ? row.repos
    : Object.keys(envelope ?? {})
  const isTestSuite = (key) => testSuitePath.test(envelope?.[key]?.path ?? key)
  return {
    services: keys.filter((key) => !isTestSuite(key)),
    suites: keys.filter(isTestSuite)
  }
}

const joinedWithAnd = (names) =>
  names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

const rigourAndReasonFor = (row, envelope) => {
  const fastKinds = new Set(['docs', 'test'])
  const { services, suites } = servicesAndSuitesIn(row, envelope)
  if (services.length === 0 && suites.length === 0) {
    return fastKinds.has(row.kind)
      ? { rigour: 'fast', reason: `a ${row.kind} row in the workspace repo` }
      : {
          rigour: 'standard',
          reason: 'no backlog repo: nothing the gate builds'
        }
  }
  if (fastKinds.has(row.kind)) {
    return {
      rigour: 'fast',
      reason: `a ${row.kind} row: no production behaviour to read`
    }
  }
  if (services.length > 1) {
    return {
      rigour: 'full',
      reason: `${joinedWithAnd(services)}: a contract between repos`
    }
  }
  if (services.length === 0) {
    return {
      rigour: 'standard',
      reason: `${joinedWithAnd(suites)} only: no service repo changes`
    }
  }
  return {
    rigour: 'standard',
    reason: `one service repo, ${services[0]}: nothing crosses a repo boundary`
  }
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
