/**
 * Renders a domain's acceptance criteria from a derivation, in Jira wiki markup.
 *
 * Run through render-criteria.sh, never directly.
 *
 * The criteria must read exactly as the behaviour specification does — a
 * paraphrase in a ticket is a promise the service never made. The derivation
 * already holds each scenario's steps, so this prints them rather than leaving
 * dozens of GIVEN/WHEN/THEN lines to be retyped by hand.
 *
 * The grouping file says which scenarios a domain's ticket carries and under
 * which heading, because that is the judgement a person makes; everything else
 * here is mechanical:
 *
 *   { "<domain>": [ { "title": "<h4 heading>",
 *                     "scenarios": ["SCN-..."],
 *                     "note": "<optional paragraph after the group>" } ] }
 *
 * Exits non-zero when a grouping names a scenario the derivation does not hold,
 * so a ticket cannot cite behaviour that did not ship. Reports on stderr which
 * of the domain's scenarios the grouping left out, so curation is a decision
 * someone can read back rather than an omission nobody noticed.
 */

import fs from 'node:fs'

const [derivedPath, groupsPath, domain] = process.argv.slice(2)

if (!derivedPath || !groupsPath || !domain) {
  console.error('usage: render-criteria.sh <derived.json> <groups.json> <domain>')
  process.exit(2)
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

const fail = (message) => {
  console.error('render-criteria: ' + message)
  process.exit(1)
}

const derived = readJson(derivedPath)
const groups = readJson(groupsPath)[domain]

if (!derived.domains?.[domain]) fail('the derivation holds no domain "' + domain + '"')
if (!groups) fail('the grouping file holds no domain "' + domain + '"')

/** The domain's scenarios by id. A scenario reached through two rows appears
 * twice in the derivation; the ticket cites it once. */
const byId = new Map()
for (const scenario of derived.domains[domain].scenarios) {
  if (!byId.has(scenario.id)) byId.set(scenario.id, scenario)
}

const lines = []
const cited = new Set()

for (const group of groups) {
  lines.push('h4. ' + group.title, '')
  for (const id of group.scenarios) {
    const scenario = byId.get(id)
    if (!scenario) fail('grouping names ' + id + ', which the derivation does not hold for ' + domain)
    if (scenario.missing) {
      fail(id + ' is recorded as missing from the current spec — look it up by hand rather than citing it')
    }
    cited.add(id)
    lines.push('h5. ' + scenario.heading, '')
    for (const step of scenario.steps) lines.push('* *' + step.keyword + '* ' + step.text)
    lines.push('')
  }
  if (group.note) lines.push(group.note, '')
}

const uncited = [...byId.keys()].filter((id) => !cited.has(id))
console.error(domain + ': ' + cited.size + ' of ' + byId.size + ' scenarios cited')
if (uncited.length) console.error('left out: ' + uncited.join(', '))

process.stdout.write(lines.join('\n'))
