import { afterEach, describe, expect, test } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { recordFolderFiles } from '../test-support/bash-golden-harness.js'
import {
  FIXED_NOW,
  checksFolder,
  stagePendingChecks,
  stagePushedRepos
} from './__fixtures__/sonar-hooks.js'
import {
  dropPendingCheck,
  hasSeenCheck,
  isPendingCheckExpired,
  listPendingChecks,
  markCheckSeen,
  recordPendingCheck,
  sonarChecksFolder
} from './pending-store.js'

const golden = JSON.parse(
  readFileSync(
    new URL('./__fixtures__/__golden__/sonar-hooks.json', import.meta.url),
    'utf8'
  )
)
const goldenCase = (name) => golden.find((recording) => recording.case === name)

const analysedPullRequests = JSON.parse(
  readFileSync(
    new URL(
      '../test-support/fixtures/sonar/pull-requests.json',
      import.meta.url
    ),
    'utf8'
  )
).pullRequests

const workspaces = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true })
  }
})

const newWorkspace = () => {
  const workspace = mkdtempSync(join(tmpdir(), 'tim-sonar-checks-'))
  workspaces.push(workspace)
  return workspace
}

const commit = {
  project: 'DEFRA_trade-imports-animals-frontend',
  sha: '8ac42f0992109ab3f8202bde47e1c39514b1649f'
}

describe('#sonarChecksFolder', () => {
  test('Should place the checks in .sonar-checks at the workspace root', () => {
    expect(sonarChecksFolder('/workspace')).toBe('/workspace/.sonar-checks')
  })
})

describe('#listPendingChecks', () => {
  test('Should read every pending check in file-name order and ignore seen markers', () => {
    const folder = stagePendingChecks(newWorkspace())

    const checks = listPendingChecks(folder)

    expect(checks).toEqual([
      {
        project: 'DEFRA_trade-imports-animals-admin',
        sha: 'cccccccccccccccccccccccccccccccccccccccc',
        branch: 'feat/no-push-time',
        pushedAt: null
      },
      {
        project: 'DEFRA_trade-imports-animals-frontend',
        sha: '8ac42f0992109ab3f8202bde47e1c39514b1649f',
        branch: 'feat/EUDPA-696-overview-and-review',
        pushedAt: FIXED_NOW - 600
      },
      {
        project: 'DEFRA_trade-imports-animals-frontend',
        sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        branch: 'feat/fresh',
        pushedAt: FIXED_NOW - 2699
      },
      {
        project: 'DEFRA_trade-imports-animals-frontend',
        sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        branch: 'feat/stale',
        pushedAt: FIXED_NOW - 2700
      },
      {
        project: 'DEFRA_trade-imports-animals-frontend',
        sha: 'd7cf87ef31461d549759443b9fa1b9bb5ae59deb',
        branch: 'chore/NO_JIRA-bash-to-tim',
        pushedAt: FIXED_NOW - 600
      },
      {
        project: 'DEFRA_trade-imports-animals-frontend',
        sha: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        branch: 'feat/EUDPA-696-overview-and-review',
        pushedAt: FIXED_NOW - 60
      }
    ])
  })

  test('Should return no checks when the folder is missing', () => {
    expect(listPendingChecks(join(newWorkspace(), checksFolder))).toEqual([])
  })

  test('Should skip a folder named like a pending check', () => {
    const folder = join(newWorkspace(), checksFolder)
    mkdirSync(join(folder, 'pending__DEFRA_x__abc'), { recursive: true })

    expect(listPendingChecks(folder)).toEqual([])
  })

  test('Should read an empty file as no branch and no push time', () => {
    const folder = join(newWorkspace(), checksFolder)
    mkdirSync(folder)
    writeFileSync(join(folder, 'pending__DEFRA_x__abc'), '')

    expect(listPendingChecks(folder)).toEqual([
      { project: 'DEFRA_x', sha: 'abc', branch: '', pushedAt: null }
    ])
  })

  test('Should read a push time that is not a whole number as none', () => {
    const folder = join(newWorkspace(), checksFolder)
    mkdirSync(folder)
    writeFileSync(join(folder, 'pending__DEFRA_x__abc'), 'feat/x\nsoon\n')

    expect(listPendingChecks(folder)[0].pushedAt).toBeNull()
  })
})

describe('#isPendingCheckExpired', () => {
  test.each([
    ['44 minutes 59 seconds', FIXED_NOW - 2699, false],
    ['exactly 45 minutes', FIXED_NOW - 2700, true],
    ['an hour', FIXED_NOW - 3600, true],
    ['no push time', null, false],
    ['a push time of zero', 0, false]
  ])(
    'Should treat a check that has waited %s as expired: %s',
    (_case, pushedAt, expired) => {
      expect(isPendingCheckExpired({ pushedAt }, FIXED_NOW)).toBe(expired)
    }
  )

  test('Should never expire a check when the clock reads zero', () => {
    expect(isPendingCheckExpired({ pushedAt: 1 }, 0)).toBe(false)
  })
})

describe('#recordPendingCheck', () => {
  test('Should create the folder and write the branch, then the push time', () => {
    const folder = join(newWorkspace(), checksFolder)

    recordPendingCheck(folder, {
      ...commit,
      branch: 'feat/x',
      pushedAt: FIXED_NOW
    })

    expect(recordFolderFiles(folder, folder)).toEqual({
      [`pending__${commit.project}__${commit.sha}`]: `feat/x\n${FIXED_NOW}\n`
    })
  })

  test('Should write what the Bash push recorder writes for the same pushed commit', async () => {
    const recorded = goldenCase('record-push')
    const workspace = newWorkspace()
    const pushed = await stagePushedRepos(workspace)
    const folder = join(workspace, checksFolder)

    recordPendingCheck(folder, { ...pushed, pushedAt: FIXED_NOW })

    expect({ pushed, files: recordFolderFiles(folder, workspace) }).toEqual({
      pushed: recorded.input,
      files: recorded.files
    })
  })
})

describe('#markCheckSeen and #dropPendingCheck', () => {
  test('Should mark a commit seen and remove its pending check', () => {
    const folder = join(newWorkspace(), checksFolder)
    recordPendingCheck(folder, { ...commit, branch: 'feat/x', pushedAt: 1 })

    markCheckSeen(folder, commit)

    expect({
      seen: hasSeenCheck(folder, commit),
      files: recordFolderFiles(folder, folder)
    }).toEqual({
      seen: true,
      files: { [`seen__${commit.project}__${commit.sha}`]: '' }
    })
  })

  test('Should drop a pending check without marking it seen', () => {
    const folder = join(newWorkspace(), checksFolder)
    recordPendingCheck(folder, { ...commit, branch: 'feat/x', pushedAt: 1 })

    dropPendingCheck(folder, commit)

    expect({
      seen: hasSeenCheck(folder, commit),
      files: recordFolderFiles(folder, folder)
    }).toEqual({ seen: false, files: {} })
  })

  test('Should leave the checks folder as the Bash check hook does after one sweep', () => {
    const folder = stagePendingChecks(newWorkspace())
    const isAnalysed = (check) =>
      analysedPullRequests.some(
        (pullRequest) =>
          pullRequest.branch === check.branch &&
          pullRequest.commit?.sha === check.sha
      )

    const settle = (check) => {
      if (isAnalysed(check)) return markCheckSeen(folder, check)
      if (isPendingCheckExpired(check, FIXED_NOW)) {
        return dropPendingCheck(folder, check)
      }
    }

    listPendingChecks(folder).forEach(settle)

    expect(recordFolderFiles(folder, folder)).toEqual(
      goldenCase('check-pending').files
    )
  })
})
