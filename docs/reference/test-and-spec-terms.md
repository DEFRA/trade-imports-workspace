# Test and spec terms

What the words mean across the test repo (`trade-imports-ins-tests`), the Behaviour Spec (`openspec/`) and the PR scope in GitHub Actions.

| Term | Meaning | Example |
|---|---|---|
| Domain | A functional area of the product. One or more services serve it | `animals`, `animals-admin`, `ins`, `plants` |
| Test type | A kind of test within a domain, in its own directory | `e2e`, `a11y`, `security` |
| Suite | A group of specs you run together, selected by path: a domain's directory, or one test type within it | `tests/animals/`, `tests/animals/e2e/` |
| Type tag | Marks which test type a spec belongs to. Kept in step with the directory by `npm run lint` | `@a11y`, `@active` |
| Service tag | Names a service whose pull request should also run the spec, from any domain or test type | `@ins-backend` |
| Capability | One folder under `openspec/specs/` holding one `spec.md` | `live-animals/addresses` |
| Spec prefix | The top-level `openspec/specs/` folder that groups capabilities. OpenSpec's own docs call this grouping a domain | `live-animals` |

A domain's tests live in `tests/<domain>/`, and a test type in `tests/<domain>/<type>/`. A path always ends in `/`, so `tests/animals/` does not also match `tests/animals-admin/`.

## Domain to spec prefix

The test domain and the spec prefix cover the same ground under two names.

| Test domain | Spec prefix |
|---|---|
| `animals` | `live-animals` |
| `animals-admin` | `admin` |
| `ins` | `ins` |
| `plants` | `plants` |

The spec prefixes are not renamed: the area codes in [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md) are keyed on them and never regenerated.

## Other uses of the word suite

- The CDP Portal calls the whole `trade-imports-ins-tests` repo a test suite, and its `PROFILE` strings, such as `animals:e2e`, are written `<domain>:<suite>` for what is called a test type here. See [E2E tests: CDP](e2e-tests-cdp.md).
- Playwright's JSON reporter uses `suites` for `describe` blocks. The tag lint reads these, which is why its types say `Suite`.

## Where each is used

- Which suites and service tags a pull request runs: [E2E tests: GitHub Actions](e2e-tests-gh-actions.md).
- How the test repo is laid out: the [`trade-imports-ins-tests` README](../../repos/trade-imports-ins-tests/README.md#domains-test-suites-and-projects).
- Reading and writing specs: [OpenSpec](openspec.md).
