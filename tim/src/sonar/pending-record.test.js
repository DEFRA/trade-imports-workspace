import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { recordFolderFiles } from '../test-support/bash-golden-harness.js'
import {
  checksFolder,
  FIXED_NOW,
  goldenPath,
  stagePushedRepos
} from './__fixtures__/sonar-hooks.js'
import { recordPushedCommits } from './pending-record.js'

const bashRecordPush = JSON.parse(
  readFileSync(new URL(goldenPath, import.meta.url), 'utf8')
).find((recording) => recording.case === 'record-push')

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-pending-record-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const checksFiles = () => recordFolderFiles(join(root, checksFolder), root)

describe('#recordPushedCommits', () => {
  test('Should write the checks folder the Bash recorder wrote, recording only the pushed feature branch', async () => {
    const pushed = await stagePushedRepos(root)

    await recordPushedCommits({ workspaceRoot: root, nowSeconds: FIXED_NOW })

    expect({ input: pushed, files: checksFiles() }).toEqual({
      input: bashRecordPush.input,
      files: bashRecordPush.files
    })
  })

  test('Should record nothing new for a commit already seen', async () => {
    const pushed = await stagePushedRepos(root)
    const seenMarker = `seen__${pushed.project}__${pushed.sha}`
    writeFileSync(join(root, checksFolder, seenMarker), '')
    const filesBefore = checksFiles()

    const recorded = await recordPushedCommits({
      workspaceRoot: root,
      nowSeconds: FIXED_NOW
    })

    expect({ recorded, files: checksFiles() }).toEqual({
      recorded: [],
      files: filesBefore
    })
  })

  test('Should create an empty checks folder when the workspace has no repos', async () => {
    const recorded = await recordPushedCommits({
      workspaceRoot: root,
      nowSeconds: FIXED_NOW
    })

    expect({ recorded, files: checksFiles() }).toEqual({
      recorded: [],
      files: {}
    })
  })
})
