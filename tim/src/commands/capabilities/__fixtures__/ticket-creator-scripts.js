import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadJiraFixture } from '../../../test-support/jira-mock.js'
import { stageBashWorkspace } from '../../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../../test-support/workspace-marker.js'

export const CHECK_SCRIPT = 'tools/ticket-creator/check-capabilities.sh'
export const PREREQS_SCRIPT = 'tools/ticket-creator/prepare-ticket-creation.sh'
export const MAP_PATH = 'docs/confluence/import-notification-capability-map.md'
export const PREREQS_FOLDER = 'workareas/ticket-creation/.prereqs'
export const BOARD_MISSING_MESSAGE =
  'Board does not exist or you do not have permission to see it.'

const timCliPath = fileURLToPath(new URL('../../../cli.js', import.meta.url))

export const mapFixture = (name) =>
  readFileSync(fileURLToPath(new URL(`./${name}.md`, import.meta.url)), 'utf8')

/**
 * What the Bash script recorded for one case, from the frozen golden.
 *
 * @param {'check'|'prereqs'} script
 * @param {string} caseName
 * @returns {{case: string, exitCode: number, stdout: string, stderr: string, files?: Record<string, string>}}
 */
export const recordedRun = (script, caseName) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL('./__golden__/ticket-creator-scripts.json', import.meta.url)
      ),
      'utf8'
    )
  )[script].find((run) => run.case === caseName)

export const boardEpicGoldens = () =>
  loadJiraFixture('board-epics-labels-bash-goldens.json')

/**
 * Each case run against check-capabilities.sh and `tim capabilities check`.
 * `map` names the capability-map fixture staged at MAP_PATH, or null for
 * none. `syncTo` is the version the Bash run's stand-in sync writes into
 * the map; with no `syncTo` the stand-in sync fails.
 */
export const checkCases = [
  ...['canonical', 'violations', 'edges', 'empty'].flatMap((map) => [
    { name: `${map} --no-sync`, map, args: ['--no-sync'] },
    { name: `${map} --no-sync --quiet`, map, args: ['--no-sync', '--quiet'] }
  ]),
  { name: 'no synced map', map: null, args: ['--no-sync'] },
  { name: 'canonical, sync fails', map: 'canonical', args: [] },
  {
    name: 'violations, sync fails, --quiet',
    map: 'violations',
    args: ['--quiet']
  },
  {
    name: 'canonical, sync refreshes',
    map: 'canonical',
    args: [],
    syncTo: '43'
  },
  {
    name: 'canonical, sync keeps the version',
    map: 'canonical',
    args: [],
    syncTo: '42'
  }
]

/**
 * Each case run against prepare-ticket-creation.sh and `tim jira prereqs`.
 * `liveVersion` is the version Confluence reports for the page, or null
 * when the page cannot be read. `previousCapabilities` is a
 * capabilities.txt left by an earlier run.
 */
export const prereqsCases = [
  {
    name: 'clean',
    map: 'canonical',
    liveVersion: 42,
    env: { MIN_CAPABILITIES: '10' }
  },
  {
    name: 'stale',
    map: 'canonical',
    liveVersion: 43,
    env: { MIN_CAPABILITIES: '10' }
  },
  {
    name: 'live page unreadable',
    map: 'canonical',
    liveVersion: null,
    env: { MIN_CAPABILITIES: '10' }
  },
  { name: 'below the default floor', map: 'canonical', liveVersion: 42 },
  { name: 'no synced map', map: null, liveVersion: 42 },
  {
    name: 'not canonical, previous list kept',
    map: 'violations',
    liveVersion: 42,
    previousCapabilities: 'CAP-9 — Old [COMPLETE]\nCAP-8 — Older [COMPLETE]\n'
  },
  { name: 'not canonical, first run', map: 'violations', liveVersion: 42 },
  {
    name: 'board unreadable',
    map: 'canonical',
    liveVersion: 42,
    boardMissing: true,
    env: { MIN_CAPABILITIES: '10' }
  },
  {
    name: 'board and page named',
    map: 'canonical',
    liveVersion: 42,
    args: ['--board', '999', '--cap-page', '123'],
    env: { MIN_CAPABILITIES: '10' }
  }
]

const writeExecutable = (path, text) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text, { mode: 0o755 })
}

const standInTim = ({ epicsFile, mapFile }) => `#!/bin/bash
if [[ "$1 $2" == "jira epics" ]]; then
  if [[ -n "\${STAND_IN_BOARD_MISSING:-}" ]]; then
    echo "${BOARD_MISSING_MESSAGE}" >&2
    exit 1
  fi
  cat ${JSON.stringify(epicsFile)}
  exit 0
fi
if [[ "$1 $2" == "confluence sync" ]]; then
  if [[ -z "\${STAND_IN_SYNC_TO:-}" ]]; then exit 1; fi
  /usr/bin/sed -i '' "s/^version: .*/version: $STAND_IN_SYNC_TO/" ${JSON.stringify(mapFile)}
  exit 0
fi
TIM_NO_AUTO_PULL=1 exec node ${JSON.stringify(timCliPath)} "$@"
`

const standInPageScript = `#!/bin/bash
if [[ -n "\${STAND_IN_LIVE_VERSION:-}" ]]; then
  echo "{\\"id\\": \\"$1\\", \\"version\\": $STAND_IN_LIVE_VERSION}"
  exit 0
fi
echo "Unauthorized"
exit 1
`

const stagedFilesOf = ({ map, mapText, previousCapabilities }) => ({
  ...(map === null ? {} : { [MAP_PATH]: mapText ?? mapFixture(map) }),
  ...(previousCapabilities === undefined
    ? {}
    : { [`${PREREQS_FOLDER}/capabilities.txt`]: previousCapabilities })
})

/**
 * A staged HOME for one tim run, at the same workspace path as the Bash
 * runs, so the recorded paths match: the map fixture (or `mapText` in its
 * place) and an earlier capabilities.txt when the case has one.
 *
 * @param {{map: string|null, mapText?: string, previousCapabilities?: string}} theCase
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageTimWorkspace = (theCase) => {
  const staged = stageBashWorkspace({
    scripts: [],
    files: stagedFilesOf(theCase)
  })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'))
  return staged
}

/**
 * A staged HOME for one Bash run: the scripts, the map fixture, an
 * earlier capabilities.txt when the case has one, and stand-ins for `tim
 * jira epics`, `tim confluence sync` and tools/confluence/page.sh. Every
 * other `tim` command runs the real CLI.
 *
 * @param {{map: string|null, previousCapabilities?: string}} theCase
 * @returns {{home: string, root: string, remove: () => void, path: string}}
 */
export const stageScriptsWorkspace = (theCase) => {
  const staged = stageBashWorkspace({
    scripts: [CHECK_SCRIPT, PREREQS_SCRIPT],
    files: stagedFilesOf(theCase)
  })
  const binFolder = join(staged.home, 'bin')
  const epicsFile = join(staged.home, 'epics.txt')
  writeFileSync(epicsFile, `${boardEpicGoldens()['epics-list'].stdout}\n`)
  writeExecutable(
    join(binFolder, 'tim'),
    standInTim({ epicsFile, mapFile: join(staged.root, MAP_PATH) })
  )
  writeExecutable(
    join(staged.root, 'tools/confluence/page.sh'),
    standInPageScript
  )
  return { ...staged, path: `${binFolder}:${process.env.PATH}` }
}
