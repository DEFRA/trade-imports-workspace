import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const TOOL = path.join(path.dirname(fileURLToPath(import.meta.url)), 'derive-scenarios.mjs')
const SPEC = 'openspec/specs/live-animals/journey-pages/arrival-details/spec.md'

let workspace

function write(relPath, text) {
  const file = path.join(workspace, relPath)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

function commit(subject) {
  const git = (...args) => execFileSync('git', ['-C', workspace, ...args], { encoding: 'utf8' })
  git('add', '-A')
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-q', '-m', subject)
}

function scenario(heading, id) {
  return ['#### Scenario: ' + heading, '**ID**: ' + id, '- **GIVEN** a user', '- **THEN** ' + heading, ''].join('\n')
}

function spec(...scenarios) {
  return ['# Arrival details', '', '## Requirements', '', '### Requirement: Arrival', '', ...scenarios].join('\n')
}

function derive() {
  const stdout = execFileSync(
    'node',
    [TOOL, '--workspace', workspace, '--workarea', 'release', '--theme', 'arrival'],
    { encoding: 'utf8' }
  )
  return JSON.parse(stdout)
}

before(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'derive-scenarios-'))
  execFileSync('git', ['-C', workspace, 'init', '-q'])
  write(
    'workareas/release/themes/arrival/backlog.json',
    JSON.stringify({ increments: [{ id: 'inc-1', title: 'Arrival page', status: 'done', repos: ['frontend'] }] })
  )
  write('workareas/release/sources.json', JSON.stringify({ repos: { frontend: 'repos/trade-imports-animals-frontend' } }))
  write(
    SPEC,
    spec(scenario('Kept as written', 'SCN-A'), scenario('Renamed later', 'SCN-B'), scenario('Removed later', 'SCN-C'))
  )
  commit('feat(release-arrival): Arrival page')
  write(SPEC, spec(scenario('Kept as written', 'SCN-A'), scenario('Now reads this way', 'SCN-B')))
  commit('docs(OTHER-1): reword arrival')
})

after(() => {
  fs.rmSync(workspace, { recursive: true, force: true })
})

test('a scenario the theme added and a later commit removed is warned about and not counted', () => {
  const derived = derive()

  assert.equal(derived.totals.scenarios, 2)
  assert.equal(derived.domains.animals.scenarioCount, 2)
  assert.deepEqual(derived.warnings, [
    'scenario SCN-C "Removed later" was added to live-animals/journey-pages/arrival-details/spec.md by ' +
      derived.commits[0].sha +
      ' then removed; not counted'
  ])
})

test('a scenario the theme added and a later commit renamed counts under its current heading and steps', () => {
  const derived = derive()

  assert.deepEqual(
    derived.domains.animals.scenarios.map(({ heading, id, missing, steps }) => ({ heading, id, missing, steps })),
    [
      { heading: 'Kept as written', id: 'SCN-A', missing: false, steps: [{ keyword: 'GIVEN', text: 'a user' }, { keyword: 'THEN', text: 'Kept as written' }] },
      { heading: 'Now reads this way', id: 'SCN-B', missing: false, steps: [{ keyword: 'GIVEN', text: 'a user' }, { keyword: 'THEN', text: 'Now reads this way' }] }
    ]
  )
})
