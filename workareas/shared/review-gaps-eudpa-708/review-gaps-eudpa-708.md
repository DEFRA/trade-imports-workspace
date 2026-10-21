# Review gaps from EUDPA-708: naming, doc comments and prototype quirks

20 October 2026 · Paul Hodgson

The build loop's style, code and consistency reviewers passed ticket 2 of the address-book redesign (EUDPA-708), but a human review then found three kinds of problem they never flag: misleading names, doc comments that repeat the name, and prototype workarounds built as requirements. This note shows examples of each, why the reviewers missed them, and the changes we propose to the style guide, reviewer prompts and distil briefs, with the tests that would prove them.

## What slipped through

Every increment passed one style and one code reviewer per repo and language, a consistency reviewer, an adversarial verifier and a judge. All of the following still landed and were only changed after a person read the code.

| Kind | Example | Found by |
| --- | --- | --- |
| Misleading name | `countryNameOf` returns the country code when reference data has no name for it | Developer reading the view controller |
| Misleading name | `PARSE_BASE = 'https://placeholder'` reads as a real origin, and was a module constant used in four places | Developer |
| Misleading name | `readReturn`, `animalsUrl` and `sameOriginUrl` all return null in some cases; nothing in their names says so | Developer |
| Misleading name | `returnAwayFrom(id, returnTo)` returns one of two things, and both parameter names hide what they hold | Developer |
| Vague name | `UNSAFE_CHARACTERS` gives no context for what they are unsafe in | Developer |
| Redundant doc comment | Seven JSDoc blocks in `return-to.js` and `stored-address.js` whose summary, `@param` and `@returns` repeated the signature | Developer |
| Prototype quirk as requirement | The delete summary left out any line that repeated an earlier one, ignoring case | Developer reading `delete.controller.js` |
| Prototype quirk as requirement | The deleted banner sentence-cased the name, so 'ABC Farms Ltd' became 'Abc farms ltd' | Developer |

The last two passed review because they matched the acceptance criteria exactly: the criteria themselves were wrong.

## Naming

Each name below passed the style guide's naming rule (no single letters, no abbreviations, no generic words, predicates for booleans), yet each hid what the function or value really does. They were renamed in ins-frontend #63, file `src/server/app/features/address-book/return-to.js`.

| Before | After | What the old name hid |
| --- | --- | --- |
| `countryNameOf(countries, code)` | `countryLabelOf` | Returns the code itself when the list has no name for it |
| `readReturn(request)` | `honouredReturnOrNull` | Can return null; "honoured" is the spec's own word for an accepted return |
| `isInsPath(value)` | `normalisedInsPathOrNull(pathOrUrl)` | Landed as the predicate isInsPath, which let the raw value through; the fix made it normalise the path and return null for anything that is not one |
| `animalsUrl(value)` | `animalsUrlOrNull(pathOrUrl)` | Can return null, like its sibling |
| `pathOf(destination)` | `pathnameOrNull(pathOrUrl)` | Added during the rework, then renamed: it returns only the pathname, does not validate, and is null for an absolute URL |
| `withReturn(path, returnTo)` | `pathWithReturn(path, honouredReturn)` | Always gives back a path |
| `returnAwayFrom(id, returnTo)` | `honouredReturnOrAddressBook(addressId, honouredReturn)` | Gives back one of exactly two things |
| `PARSE_BASE = 'https://placeholder'` | `standInOrigin = 'https://relative-path.invalid'`, inside the one function that uses it | It is a parse-only stand-in, not an origin; as a module constant it invited being "fixed" to the real one |
| `UNSAFE_CHARACTERS` | `UNSAFE_REDIRECT_CHARACTERS` | The context: characters that turn a path into an off-site redirect or split a Location header |

The pattern behind them:

- A function is named for what it gives back in every branch: `…OrNull` when it can return null, `aOrB` when it returns one of two things.
- A name never promises more than the body delivers.
- Parameters and locals are named for what they hold at that point (`pathOrUrl`, `honouredReturn`, `addressId`), not `value`, `id` or `returnTo`.
- Siblings follow one pattern, and names use the spec's vocabulary.
- A placeholder value lives in the one function that needs it, named for its role.

## return-to.js before and after

The whole file, as the loop landed it after inc-066 (`092e6cc`, passed by every reviewer) and as it stands after review (`7d9df5c`). Besides the names and comments, the review also fixed a bug here: `readReturn` returned the raw query value, so a return holding non-ASCII or control characters reached the `Location` header and the dead-link redirect answered 500.

Before, as the loop's reviewers passed it:

```js
import { config } from '../../../../config/config.js'
import { isStubMode } from '../../../common/services/mode.js'
import { addressBookPath, addressPath } from '../../shared/paths.js'

export const RETURN_QUERY_KEY = 'return'

const PARSE_BASE = 'https://placeholder'
const UNSAFE_CHARACTERS = /[\\\r\n]/

const sameOriginUrl = (value) => {
  try {
    return new URL(value, PARSE_BASE)
  } catch {
    return null
  }
}

const isInsPath = (value) =>
  value.startsWith('/') &&
  !value.startsWith('//') &&
  sameOriginUrl(value)?.origin === PARSE_BASE

const animalsOrigin = () =>
  new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin

const animalsUrl = (value) => {
  if (isStubMode()) {
    return null
  }
  try {
    const url = new URL(value)
    return url.origin === animalsOrigin() ? url.href : null
  } catch {
    return null
  }
}

/**
 * Reads the `return` query: a page of this service, or outside stub mode a URL on
 * exactly the animals frontend origin. Anything else is ignored.
 *
 * @param {object} request - Hapi request
 * @returns {string | null} The honoured return, or null
 */
export const readReturn = (request) => {
  const value = request.query?.[RETURN_QUERY_KEY]
  if (typeof value !== 'string' || !value || UNSAFE_CHARACTERS.test(value)) {
    return null
  }
  return isInsPath(value) ? value : animalsUrl(value)
}

/**
 * Carries an honoured return on to the next link. The list itself is not carried.
 *
 * @param {string} path - The link's path
 * @param {string | null} returnTo - The honoured return
 * @returns {string} The path, with the return when there is one to carry
 */
export const withReturn = (path, returnTo) =>
  !returnTo || returnTo === addressBookPath()
    ? path
    : `${path}?${new URLSearchParams({ [RETURN_QUERY_KEY]: returnTo })}`

/**
 * Whether the return is one of the address's own pages of this service.
 *
 * @param {string} id - The address id
 * @param {string} returnTo - The honoured return
 * @returns {boolean} True for the address's own pages
 */
export const isOwnPageOf = (id, returnTo) => {
  const url = sameOriginUrl(returnTo)
  if (url?.origin !== PARSE_BASE) {
    return false
  }
  const own = addressPath(id)
  return url.pathname === own || url.pathname.startsWith(`${own}/`)
}

/**
 * Where to go once an address's own pages are no use: the return, or the list.
 *
 * @param {string} id - The address id
 * @param {string | null} returnTo - The honoured return
 * @returns {string} The return when it is not one of the address's own pages, else the list
 */
export const returnAwayFrom = (id, returnTo) =>
  returnTo && !isOwnPageOf(id, returnTo) ? returnTo : addressBookPath()

/**
 * Destination for a dead view or delete link.
 *
 * @param {object} request - Hapi request
 * @returns {string} The honoured return, or the list
 */
export const deadLinkDestination = (request) =>
  returnAwayFrom(request.params?.id ?? '', readReturn(request))

/**
 * Whether a destination is the address book list (so the deleted banner belongs there).
 *
 * @param {string} destination - A path or URL
 * @returns {boolean} True for the list on this service
 */
export const landsOnAddressBook = (destination) => {
  const url = sameOriginUrl(destination)
  return url?.origin === PARSE_BASE && url.pathname === addressBookPath()
}
```

After review:

```js
import { config } from '../../../../config/config.js'
import { isStubMode } from '../../../common/services/mode.js'
import { addressBookPath, addressPath } from '../../shared/paths.js'

export const RETURN_QUERY_KEY = 'return'

// Characters browsers or the URL parser rewrite into an off-site redirect, or that split a Location header.
const UNSAFE_REDIRECT_CHARACTERS = /[\\\r\n]/

// Normalised so the path is percent-encoded and safe in a Location header.
const normalisedInsPathOrNull = (pathOrUrl) => {
  if (!pathOrUrl.startsWith('/') || pathOrUrl.startsWith('//')) {
    return null
  }
  const standInOrigin = 'https://relative-path.invalid'
  try {
    // If standInOrigin is retained in the resulting URL, then pathOrUrl was a relative INS
    // path, which is normalised and returned.
    const url = new URL(pathOrUrl, standInOrigin)
    return url.origin === standInOrigin
      ? `${url.pathname}${url.search}${url.hash}`
      : null
  } catch {
    return null
  }
}

// An honoured return or a path this service built, so not validated here: an INS path
// gives its pathname, an animals frontend URL gives null.
const pathnameOrNull = (pathOrUrl) =>
  pathOrUrl.startsWith('/') ? pathOrUrl.split(/[?#]/)[0] : null

const animalsOrigin = () =>
  new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin

const animalsUrlOrNull = (pathOrUrl) => {
  if (isStubMode()) {
    return null
  }
  try {
    const url = new URL(pathOrUrl)
    return url.origin === animalsOrigin() ? url.href : null
  } catch {
    return null
  }
}

/** A page of this service, or outside stub mode a URL on exactly the animals frontend origin. */
export const honouredReturnOrNull = (request) => {
  const value = request.query?.[RETURN_QUERY_KEY]
  if (
    typeof value !== 'string' ||
    !value ||
    UNSAFE_REDIRECT_CHARACTERS.test(value)
  ) {
    return null
  }
  return normalisedInsPathOrNull(value) ?? animalsUrlOrNull(value)
}

/** The address book list is never carried: it is where a missing return already goes. */
export const pathWithReturn = (path, honouredReturn) =>
  !honouredReturn || honouredReturn === addressBookPath()
    ? path
    : `${path}?${new URLSearchParams({ [RETURN_QUERY_KEY]: honouredReturn })}`

/** Its own pages are its view page and any page under it, such as edit and delete. */
export const isOwnPageOf = (addressId, pathOrUrl) => {
  const pathname = pathnameOrNull(pathOrUrl)
  const own = addressPath(addressId)
  return pathname === own || pathname?.startsWith(`${own}/`) === true
}

/** A return to one of this address's own pages is passed over for the address book. */
export const honouredReturnOrAddressBook = (addressId, honouredReturn) =>
  honouredReturn && !isOwnPageOf(addressId, honouredReturn)
    ? honouredReturn
    : addressBookPath()

export const deadLinkDestination = (request) =>
  honouredReturnOrAddressBook(
    request.params?.id ?? '',
    honouredReturnOrNull(request)
  )

/** The deleted banner shows only when the delete lands on the list. */
export const landsOnAddressBook = (destination) =>
  pathnameOrNull(destination) === addressBookPath()
```

What changed, in summary:

- **Names:** every helper now says what it returns, null included, and every parameter says what it holds.
- **The stand-in origin:** it moved from a module constant used in four places to a local inside the one function that parses, on a reserved `.invalid` host.
- **The bug fix:** a return is now normalised, so it is percent-encoded, and `isOwnPageOf` and `landsOnAddressBook` compare pathnames directly, because they only ever see an honoured return.
- **Comments:** six JSDoc blocks became five one-line comments, and `deadLinkDestination` has none.

## Doc comments

The implementor added a full JSDoc block to most new exports, although `main` had only two `@param` blocks in the whole address-book feature. Every line was accurate, so every reviewer passed them, but most only repeated the signature. Once the names said what each function returns, each block shrank to the one fact the name cannot carry, or went.

Before:

```js
/**
 * Where to go once an address's own pages are no use: the return, or the list.
 *
 * @param {string} id - The address id
 * @param {string | null} returnTo - The honoured return
 * @returns {string} The return when it is not one of the address's own pages, else the list
 */
export const returnAwayFrom = (id, returnTo) =>
```

After:

```js
/** A return to one of this address's own pages is passed over for the address book. */
export const honouredReturnOrAddressBook = (addressId, honouredReturn) =>
```

The same pass removed `deadLinkDestination`'s block entirely, since its name says it all, and cut `findLiveAddress`'s to its first line.

## Prototype quirks taken as requirements

Two behaviours came from the prototype's route handlers, not from its designed pages, and DISTIL wrote them into the backlog as acceptance criteria. The loop built them faithfully, so no reviewer could object.

| Behaviour | Where it came from in the prototype | Why it was a quirk | Outcome |
| --- | --- | --- | --- |
| The delete summary leaves out any line that repeats an earlier one, ignoring case | `formatDeleteAddressHtml` in `app/routes.js` | The prototype's address-book entries can hold the address as one free-text string, which may repeat the name or the country. INS stores structured fields, so the rule only ever hid real data, such as a town and county that are both 'Durham' | Removed from the code, tests, spec (SCN-INS-ADDR-011-D) and inc-065's criterion |
| The deleted and updated banners sentence-case the name | The banner builders in `app/routes.js` | The prototype's added banner does not do it, so it was never a consistent design. It also mangles names: 'ABC Farms Ltd' becomes 'Abc farms ltd' | The banner names the address as stored; inc-065, inc-073 and inc-080 reworded |

The rulings the reconcile brief applies already say "the prototype wins by default; only a judgement on the same difference, or a real constraint the prototype cannot express, overrides it". INS's structured address model is that kind of constraint, but the two rules were never seen as a difference: INS had no rule of its own on either point to conflict with them.

## Why the reviewers missed them

The reviewers did what they were asked. The gaps are in what they judge against.

1. **No rule describes a misleading name.** Rule 6 of `docs/best-practices/node/code-style.md` bans single letters, abbreviations and generic words, and asks booleans to read as predicates. The style reviewer's persona (`code-style/references/STYLE_FILE_REVIEWER.md`) raises a FAIL only for "a clear, unambiguous violation of a stated rule", so a name that hides a null or overpromises breaks nothing.
2. **Nobody reads a body against its name.** Every issue above showed only by reading what a function returns in each branch. The reviewers read diff hunks against a checklist; no step asks whether each name tells the truth.
3. **Nobody owns a module's vocabulary.** The consistency reviewer compares the change across files. Within `return-to.js`, `value`, `id`, `returnTo` and `pathOrUrl` overlapped, and one helper's name hinted at null while its sibling's did not.
4. **The doc-comment rules check accuracy, not need.** `doc-comments/BEST_PRACTICES.md` opens with "Absence is not a violation. Present-but-wrong is." `jsdoc.md` says not to restate the name, but only in its advice to writers. Its reviewer checklist checks that each claim is true and complete, and its "No missing params" row pushes towards more, not less.
5. **DISTIL treats the prototype's code as design.** `extract-repo.md` reads views, controllers, routes, validation and copy alike, so handler logic becomes a claim like any designed page. In reconcile, a prototype claim with nothing in INS to conflict with becomes a requirement.

The human `review` skill would not have caught the naming or comment issues either: its file reviewer leaves style to the `code-style` skill, which uses the same rules.

## Proposed changes

All land in the workspace repo on one branch, `chore/NO_JIRA-reviewer-naming-and-distil-mechanisms`. The style guide and doc-comment files are shared by the build loop and the `code-style` skill, so both pick up the changes.

| # | Change | File | What it adds |
| --- | --- | --- | --- |
| 1 | Extend rule 6, Naming | `docs/best-practices/node/code-style.md` | Name a function for what it returns in every branch (`…OrNull`, `aOrB`); never promise more than the body does; name parameters for what they hold; keep siblings alike and use the spec's words; keep a placeholder inside the one function that uses it. Bad and good examples taken from `return-to.js` |
| 2 | A name-audit step for the style reviewer | `code-style/references/STYLE_FILE_REVIEWER.md` and the style reviewer prompt in `requirements-pipeline/workflow/increment-build-loop.js` | For every new or changed export, constant and parameter, read the whole body, state what it returns in each branch, and flag a name that hides a case, overpromises or disagrees with its siblings |
| 3 | A redundancy row in the reviewer checklist | `docs/best-practices/doc-comments/jsdoc.md` | A summary, `@param` or `@returns` that only restates the name or signature: remove it, or cut the block to the line the name does not say |
| 4 | Headline rule covers redundancy | `docs/best-practices/doc-comments/BEST_PRACTICES.md` | "Absence is not a violation. Present-but-wrong, or present-but-redundant, is." |
| 5 | Doc comments named in the house rule | Style reviewer prompt in `increment-build-loop.js` | "Comments are removed aggressively" now says JSDoc counts |
| 6 | No JSDoc by default | Implementor and fixer prompts in `increment-build-loop.js` | Write a doc comment only when it says something the name and signature cannot |
| 7 | Mark mechanisms when extracting | `requirements-pipeline/workflow/distil/briefs/extract-repo.md` | A claim from handler or formatter code, not a view, copy, validation message or journey step, is marked as a mechanism, with the data it depends on (for example, a free-text address string) |
| 8 | Treat mechanisms with care when reconciling | `requirements-pipeline/workflow/distil/briefs/reconcile.md` | A mechanism that exists because of the prototype's own data or storage is not a requirement where the target's model differs; one whose reason is not visible becomes a question, defaulting to not built; any change to how user-entered data is shown (re-casing, de-duplicating, truncating) always needs a ruling |

## How we prove it

Each change is proved against the code and sources as they were before the human review. The rules are then tuned until the old version is flagged and the fixed version is not.

| Test | Run | Passes when |
| --- | --- | --- |
| Naming is caught | The loop's style reviewer, with the new rules, on `return-to.js`, `address-countries.js` and the view and delete controllers at `092e6cc` (the loop's last row, before review) | It flags at least `countryNameOf`, `PARSE_BASE`, the null-returning helpers without `OrNull`, `returnAwayFrom`'s name and parameters, and `UNSAFE_CHARACTERS` |
| Redundant JSDoc is caught | The same run | It flags the doc blocks that only restate their signatures |
| Fixed code stays clean | The same reviewer on the files as they stand after review (`7d9df5c`) | None of the findings above reappear, and it does not ask for JSDoc to be added back |
| No flood of false positives | The same reviewer on two address-book files the review did not touch | No more findings than before the change |
| Prototype quirks are questioned | Reconcile for the address-book delete area of `workareas/shared/design-release-2-1`, with the new briefs | The repeated-line and sentence-case claims come out as questions or mechanisms, not requirements |
| Designed behaviour is unchanged | `tim distil backlog-snapshot` compared before and after that run | Headings, buttons, copy and validation messages in the area are the same as before |

The two snapshots (`092e6cc` and `7d9df5c`) would be kept as a fixed pair, so any later change to the style rules or reviewer prompts can be re-checked against them.

Open question: where those fixtures live. `workareas/` is not committed, so they need a tracked home, such as an `evals/` folder beside the `code-style` skill.
