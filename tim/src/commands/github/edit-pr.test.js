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
import { renderEditedPr, runEditPr } from './edit-pr.js'

const github = mockGithubForEachTest()

const PR_URL = `https://github.com/DEFRA/${GITHUB_REPO}/pull/145`

const bodyFileHolding = (text) => {
  const path = join(mkdtempSync(join(tmpdir(), 'tim-edit-pr-')), 'pr.md')
  writeFileSync(path, text)
  return path
}

const acceptsUpdate = (status = 200) => {
  const sent = { body: null }
  github()
    .patch(`${GITHUB_REPO_PATH}/pulls/145`, (body) => {
      sent.body = body
      return true
    })
    .reply(status, (_uri, body) =>
      status === 200
        ? { number: 145, html_url: PR_URL, title: body.title ?? 'Old title' }
        : { message: 'Not Found' }
    )
  return sent
}

describe('runEditPr', () => {
  test('sends the new title and the body file contents, and returns the PR', async () => {
    const sent = acceptsUpdate()

    const pr = await runEditPr({
      repo: GITHUB_REPO,
      number: '145',
      title: 'Tune each machine',
      bodyFile: bodyFileHolding('## What\n\nTunes each machine.\n')
    })

    expect({ sent: sent.body, pr }).toEqual({
      sent: {
        title: 'Tune each machine',
        body: '## What\n\nTunes each machine.\n'
      },
      pr: {
        repo: GITHUB_REPO,
        number: 145,
        url: PR_URL,
        title: 'Tune each machine'
      }
    })
  })

  test('sends only the description when no title is given, leaving the title as it is', async () => {
    const sent = acceptsUpdate()

    await runEditPr({
      repo: GITHUB_REPO,
      number: '145',
      bodyFile: bodyFileHolding('New description')
    })

    expect(sent.body).toEqual({ body: 'New description' })
  })

  test('refuses before any request when neither a title nor a description is given', async () => {
    await expect(
      runEditPr({ repo: GITHUB_REPO, number: '145' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'Give a new title with --title, a new description with --body-file, or both.'
    })
  })

  test('refuses a PR number that is not a whole number', async () => {
    await expect(
      runEditPr({ repo: GITHUB_REPO, number: 'latest', title: 'A title' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give the PR number, such as 145.'
    })
  })

  test('says the PR was not found when GitHub has no such PR', async () => {
    acceptsUpdate(404)

    await expect(
      runEditPr({ repo: GITHUB_REPO, number: '145', title: 'A title' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('renderEditedPr', () => {
  test('prints only the PR link', () => {
    expect(renderEditedPr({ url: PR_URL, number: 145 })).toBe(PR_URL)
  })
})

describe('tim github edit-pr', () => {
  test('exits 2 with a JSON USAGE error when nothing is given to change', async () => {
    const run = await execa(
      'node',
      [TIM_CLI_PATH, 'github', 'edit-pr', GITHUB_REPO, '145', '--json'],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect({
      exitCode: run.exitCode,
      errors: JSON.parse(run.stdout).errors
    }).toEqual({
      exitCode: 2,
      errors: [
        {
          code: 'USAGE',
          message:
            'Give a new title with --title, a new description with --body-file, or both.'
        }
      ]
    })
  })
})
