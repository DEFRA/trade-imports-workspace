const SCENARIO_HEADING = '#### Scenario: '
const SCENARIO_ID = /^\*\*ID\*\*:\s*(\S+)/
const SCENARIO_STEP = /^- \*\*(GIVEN|WHEN|THEN|AND)\*\*\s*(.*)$/

const endsScenario = (line) => line.startsWith('### ') || line.startsWith('## ')

const addLineTo = (scenario, line) => {
  const id = line.match(SCENARIO_ID)
  if (id) {
    scenario.id = id[1]
    return
  }
  const step = line.match(SCENARIO_STEP)
  if (step) scenario.steps.push({ keyword: step[1], text: step[2].trim() })
}

/**
 * Every scenario in a spec file's text, keyed by its heading. A later
 * scenario with the same heading replaces an earlier one.
 *
 * @param {string} text
 * @returns {Map<string, {heading: string, id: string|null, steps: Array<{keyword: string, text: string}>}>}
 */
export const parseScenarios = (text) => {
  const byHeading = new Map()
  let current = null
  for (const line of text.split('\n')) {
    if (line.startsWith(SCENARIO_HEADING)) {
      current = {
        heading: line.slice(SCENARIO_HEADING.length).trim(),
        id: null,
        steps: []
      }
      byHeading.set(current.heading, current)
    } else if (current && endsScenario(line)) {
      current = null
    } else if (current) {
      addLineTo(current, line)
    }
  }
  return byHeading
}

/**
 * The scenario headings a `git show -U0` diff of `openspec/specs/` adds,
 * per spec file, with paths relative to `openspec/specs/`.
 *
 * @param {string} diff
 * @returns {Map<string, string[]>}
 */
export const addedHeadingsInDiff = (diff) => {
  const perFile = new Map()
  const addedHeading = `+${SCENARIO_HEADING}`
  let file = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice('+++ b/'.length).replace(/^openspec\/specs\//, '')
    } else if (file && line.startsWith(addedHeading)) {
      if (!perFile.has(file)) perFile.set(file, [])
      perFile.get(file).push(line.slice(addedHeading.length).trim())
    }
  }
  return perFile
}
