---
paths:
  - 'src/clients/**'
---

# Client conventions

## Factory shape

Every client exports a single factory:

```js
export function createXClient ({ token, baseUrl } = {}) {
  if (!token) throw new TimError('AUTH', '...');
  return { whoami, methodA, methodB, ... };
}
```

- Inputs come from explicit params first, env vars second. Default values are documented inline.
- The returned object exposes one method per **user-visible action**, not per HTTP endpoint. Name them for what the user is doing (`findPrsForTicket`), not what the API is called (`searchIssuesAndPullRequests`).

## Errors

- All errors thrown out of a client are `TimError(code, message)`.
- `code` is one of: `AUTH`, `NOT_FOUND`, `RATE_LIMIT`, `NETWORK`, `PARSE`, `UNKNOWN`.
- Map upstream errors at the seam: octokit's 401 → `AUTH`, 404 → `NOT_FOUND`, 403 with rate-limit headers → `RATE_LIMIT`, etc. Don't let raw library errors leak.
- Messages are GDS plain English with the user's next step: `'Set GITHUB_TOKEN, or sign in with `gh auth login`.'`

## Tests

- Mock at the **network boundary** with `nock` via `src/test-support/http-mock.js` (`installHttpMocks`/`closeHttpMocks`).
- Run the real client code; assert on the returned value or the thrown `TimError.code` and `.message`.
- Never `vi.mock('./this-client.js')` — it untests the client and turns the test into a coupling check.
- Cover at minimum: success-path data shape, auth failure, 404, rate-limit. Add more cases per actual behaviour.

## No shell-out

The integration path doesn't call `gh`, `jq`, `curl`, or `../tools/*.sh`. The one sanctioned exception is `gh auth token` at startup for credential bootstrap when `GITHUB_TOKEN` is unset — and even that lives outside `src/clients/`.
