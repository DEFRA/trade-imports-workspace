import { readFileSync } from 'node:fs'

const pullRequestListUrl =
  'https://sonarcloud.io/api/project_pull_requests/list'

globalThis.fetch = async (url) => {
  if (!String(url).startsWith(pullRequestListUrl)) {
    throw new Error(`The SonarCloud stand-in does not answer ${url}`)
  }
  return new Response(
    readFileSync(process.env.SONARCLOUD_STAND_IN_PULL_REQUESTS, 'utf8'),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
