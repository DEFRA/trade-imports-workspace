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
import { renderClosedPr, runClosePr } from './close-pr.js'

const github = mockGithubForEachTest()

const PR_URL = `https://github.com/DEFRA/${GITHUB_REPO}/pull/145`

const commentFileHolding = (text) => {
  const path = join(mkdtempSync(join(tmpdir(), 'tim-close-pr-')), 'comment.md')
  writeFileSync(path, text)
  return path
}

const requestLog = () => []

const acceptsComment = (sent) => {
  github()
    .post(`${GITHUB_REPO_PATH}/issues/145/comments`, (body) => {
      sent.push({ comment: body })
      return true
    })
    .reply(201, { id: 1 })
}

const acceptsClose = (sent, status = 200) => {
  github()
    .patch(`${GITHUB_REPO_PATH}/pulls/145`, (body) => {
      sent.push({ update: body })
      return true
    })
    .reply(status, () =>
      status === 200
        ? {
            number: 145,
            html_url: PR_URL,
            title: 'Tune each machine',
            state: 'closed'
          }
        : { message: 'Not Found' }
    )
}

describe('runClosePr', () => {
  test('posts the comment file text, then closes the PR, and returns it', async () => {
    const sent = requestLog()
    acceptsComment(sent)
    acceptsClose(sent)

    const pr = await runClosePr({
      repo: GITHUB_REPO,
      number: '145',
      commentFile: commentFileHolding('Replaced by #150.\n')
    })

    expect({ sent, pr }).toEqual({
      sent: [
        { comment: { body: 'Replaced by #150.\n' } },
        { update: { state: 'closed' } }
      ],
      pr: {
        repo: GITHUB_REPO,
        number: 145,
        url: PR_URL,
        title: 'Tune each machine',
        state: 'closed',
        commented: true
      }
    })
  })

  test('closes the PR without posting a comment when no comment file is given', async () => {
    const sent = requestLog()
    acceptsClose(sent)

    const pr = await runClosePr({ repo: GITHUB_REPO, number: '145' })

    expect({ sent, commented: pr.commented }).toEqual({
      sent: [{ update: { state: 'closed' } }],
      commented: false
    })
  })

  test('refuses a PR number that is not a whole number', async () => {
    await expect(
      runClosePr({ repo: GITHUB_REPO, number: 'latest' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give the PR number, such as 145.'
    })
  })

  test('refuses a comment file it cannot read, naming the file', async () => {
    await expect(
      runClosePr({
        repo: GITHUB_REPO,
        number: '145',
        commentFile: '/no/such/comment.md'
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        "Can't read the PR comment file /no/such/comment.md. Check the path and try again."
    })
  })

  test('says the PR was not found when GitHub has no such PR', async () => {
    acceptsClose(requestLog(), 404)

    await expect(
      runClosePr({ repo: GITHUB_REPO, number: '145' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('renderClosedPr', () => {
  test('prints only the PR link', () => {
    expect(renderClosedPr({ url: PR_URL, number: 145 })).toBe(PR_URL)
  })
})

describe('tim github close-pr', () => {
  test('exits 2 with a JSON USAGE error when the PR number is not a whole number', async () => {
    const run = await execa(
      'node',
      [TIM_CLI_PATH, 'github', 'close-pr', GITHUB_REPO, 'latest', '--json'],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect({
      exitCode: run.exitCode,
      errors: JSON.parse(run.stdout).errors
    }).toEqual({
      exitCode: 2,
      errors: [{ code: 'USAGE', message: 'Give the PR number, such as 145.' }]
    })
  })
})
