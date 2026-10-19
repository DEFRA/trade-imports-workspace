import { describe, test, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execa } from 'execa'
import {
  GITHUB_REPO,
  GITHUB_REPO_PATH,
  mockGithubForEachTest
} from '../../test-support/github-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { renderCreatedPr, runCreatePr } from './create-pr.js'

const github = mockGithubForEachTest()

const PR_URL = `https://github.com/DEFRA/${GITHUB_REPO}/pull/51`

const bodyFileHolding = (text) => {
  const path = join(mkdtempSync(join(tmpdir(), 'tim-create-pr-')), 'pr.md')
  writeFileSync(path, text)
  return path
}

const noOpenPrForHead = () =>
  github()
    .get(`${GITHUB_REPO_PATH}/pulls`)
    .query({ head: 'DEFRA:chore/NO_JIRA-tidy', state: 'open', per_page: 1 })
    .reply(200, [])

const acceptsCreate = () => {
  const sent = { body: null }
  github()
    .post(`${GITHUB_REPO_PATH}/pulls`, (body) => {
      sent.body = body
      return true
    })
    .reply(201, (_uri, body) => ({
      number: 51,
      html_url: PR_URL,
      draft: body.draft,
      base: { ref: body.base }
    }))
  return sent
}

const validArgs = (overrides = {}) => ({
  repo: GITHUB_REPO,
  head: 'chore/NO_JIRA-tidy',
  base: 'main',
  title: 'Tidy the logs',
  bodyFile: bodyFileHolding('## What\n\nTidies the logs.\n'),
  ...overrides
})

describe('runCreatePr', () => {
  test('sends the body file contents as the PR description and returns the new PR', async () => {
    noOpenPrForHead()
    const sent = acceptsCreate()

    const pr = await runCreatePr(validArgs({ draft: true }))

    expect(sent.body).toEqual({
      head: 'chore/NO_JIRA-tidy',
      base: 'main',
      title: 'Tidy the logs',
      body: '## What\n\nTidies the logs.\n',
      draft: true
    })
    expect(pr).toEqual({
      repo: GITHUB_REPO,
      number: 51,
      url: PR_URL,
      head: 'chore/NO_JIRA-tidy',
      base: 'main',
      draft: true,
      created: true
    })
  })

  test('refuses a body file it cannot read before sending any request', async () => {
    await expect(
      runCreatePr(validArgs({ bodyFile: '/no/such/pr.md' }))
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        "Can't read the PR description file /no/such/pr.md. Check the path and try again."
    })
  })

  test('refuses an empty title', async () => {
    await expect(runCreatePr(validArgs({ title: '  ' }))).rejects.toMatchObject(
      { code: 'USAGE', message: 'Give the PR title with --title.' }
    )
  })
})

describe('renderCreatedPr', () => {
  test('prints only the PR link', () => {
    expect(renderCreatedPr({ url: PR_URL, number: 51 })).toBe(PR_URL)
  })
})

describe('tim github create-pr', () => {
  test('exits 2 with a JSON USAGE error when the repo has an owner prefix', async () => {
    const run = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'github',
        'create-pr',
        `DEFRA/${GITHUB_REPO}`,
        '--head',
        'chore/NO_JIRA-tidy',
        '--title',
        'Tidy the logs',
        '--body-file',
        'pr.md',
        '--json'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      {
        code: 'USAGE',
        message:
          'Give the repo name without the DEFRA/ prefix, for example trade-imports-animals-frontend.'
      }
    ])
  })
})
