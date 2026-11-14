export const fixtureReviewId = 'local/trade-imports-stub/feat/NO_JIRA-fixture'
export const emptyReviewId = 'local/empty-review'
export const repoKeylessReviewId = 'local/repo-keyless-review'
export const fileNotFolderReviewId = 'local/file-not-folder-review'
export const itemlessReviewId = 'local/itemless-review'

const stubItems = {
  ticket: fixtureReviewId,
  repo: 'trade-imports-stub',
  items: [
    {
      id: 1,
      file: 'src/main/java/uk/gov/defra/Stub.java',
      line: '42',
      severity: 'Major',
      category: 'correctness',
      issue: 'Returns the wrong status for an unknown id — “404” expected',
      fix: 'Return 404',
      disposition: 'Fix',
      status: 'Not Done',
      notes: null
    },
    {
      id: 2,
      file: 'README.md',
      line: '',
      severity: 'Minor',
      category: 'comments',
      issue: 'Stale comment',
      fix: 'Delete it',
      disposition: null,
      status: null,
      notes: null,
      best_practice: 'docs/best-practices/node/code-style.md'
    }
  ]
}

const testsItems = {
  ticket: fixtureReviewId,
  repo: 'trade-imports-ins-tests',
  items: [
    {
      id: 1,
      file: 'animals/e2e/journey.spec.js',
      line: '7',
      severity: 'Critical',
      category: 'coverage-gap',
      issue: 'No test for the refusal',
      fix: 'Add one',
      disposition: "Won't Fix",
      status: '—',
      notes: 'Covered elsewhere'
    }
  ]
}

const repoKeylessItems = {
  ticket: repoKeylessReviewId,
  items: [
    {
      id: 1,
      file: 'README.md',
      line: '3',
      severity: 'Minor',
      category: 'comments',
      issue: 'Stale comment',
      fix: 'Delete it',
      disposition: null,
      status: null,
      notes: null
    }
  ]
}

const reviewPath = (reviewId, name) => `workareas/reviews/${reviewId}/${name}`

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

export const fixtureReviewFiles = {
  [reviewPath(fixtureReviewId, 'items.trade-imports-stub.json')]:
    jsonText(stubItems),
  [reviewPath(fixtureReviewId, 'items.trade-imports-ins-tests.json')]:
    jsonText(testsItems),
  [reviewPath(emptyReviewId, 'summary.md')]: '# Summary\n',
  [reviewPath(repoKeylessReviewId, 'items.trade-imports-stub.json')]:
    jsonText(repoKeylessItems),
  [reviewPath(itemlessReviewId, 'items.trade-imports-stub.json')]: jsonText({
    ticket: itemlessReviewId,
    repo: 'trade-imports-stub',
    items: []
  }),
  [`workareas/reviews/${fileNotFolderReviewId}`]: 'Not a folder\n'
}
