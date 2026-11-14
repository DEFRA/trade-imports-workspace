import { execa } from 'execa'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  stageBashWorkspace,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  CONFLUENCE_ORIGIN,
  corpusHtml,
  corpusNames,
  serveConfluence
} from './__fixtures__/confluence-tree.js'
import {
  CLEAN_SCRIPT,
  HTML_TO_MD_SCRIPT,
  MIRROR_FOLDER,
  SYNC_SCRIPT,
  syncCases
} from './__fixtures__/sync-cases.js'

const scripts = [SYNC_SCRIPT, CLEAN_SCRIPT, HTML_TO_MD_SCRIPT]
const scriptsExist = scripts.every(workspaceScriptExists)

const withOrigin = (value, baseUrl) =>
  typeof value === 'string'
    ? value.split(baseUrl).join(CONFLUENCE_ORIGIN)
    : Object.fromEntries(
        Object.entries(value).map(([key, text]) => [
          key,
          withOrigin(text, baseUrl)
        ])
      )

const pointedAt = (env, baseUrl) =>
  env.JIRA_BASE_URL === undefined ? env : { ...env, JIRA_BASE_URL: baseUrl }

const recordCase = async ({ name, script, args, env, files }, baseUrl) => {
  const staged = stageBashWorkspace({ scripts, files })
  try {
    const recording = await recordBashRun(staged, script, args, {
      watch: MIRROR_FOLDER,
      env: pointedAt(env, baseUrl),
      exactOutput: true
    })
    return {
      case: name,
      ...Object.fromEntries(
        Object.entries(recording).map(([key, value]) => [
          key,
          key === 'exitCode' ? value : withOrigin(value, baseUrl)
        ])
      )
    }
  } finally {
    staged.remove()
  }
}

const convertWithBash = async (name) => {
  const staged = stageBashWorkspace({ scripts: [HTML_TO_MD_SCRIPT] })
  try {
    const { stdout } = await execa(
      'node',
      [join(staged.root, HTML_TO_MD_SCRIPT)],
      { input: corpusHtml(name), stripFinalNewline: false }
    )
    return [name, stdout]
  } finally {
    staged.remove()
  }
}

test.skipIf(!scriptsExist)(
  'tools/confluence/html_to_md.js converts each corpus page',
  async () => {
    const converted = []
    for (const name of corpusNames) converted.push(await convertWithBash(name))

    await expect(goldenText(Object.fromEntries(converted))).toMatchFileSnapshot(
      '__fixtures__/__golden__/html-to-md.json'
    )
  },
  60_000
)

test.skipIf(!scriptsExist)(
  'tools/confluence sync-docs.sh and clean-docs.sh mirror the fake Confluence tree',
  async () => {
    const server = await serveConfluence()
    try {
      const recordings = []
      for (const syncCase of syncCases) {
        recordings.push(await recordCase(syncCase, server.baseUrl))
      }

      await expect(goldenText(recordings)).toMatchFileSnapshot(
        '__fixtures__/__golden__/confluence-scripts.json'
      )
    } finally {
      await server.close()
    }
  },
  120_000
)
