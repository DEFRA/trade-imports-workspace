# s08-validation — replace joi with `app/lib/validate`

Repo: `repos/trade-imports-ins-frontend` (Bash: `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`;
Read/Edit/Write tools: `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend`).
Branch: `feat/NO_JIRA-frontend-alignment` (checked out, level with `origin`, clean tree, HEAD `8f9ea79`).

Reference files (Read tool paths under `/Users/samfarrington/git/defra/trade-imports-workspace/`; Bash paths under
`~/git/defra/trade-imports-workspace/`):

- `repos/trade-imports-plants-frontend/src/server/app/lib/validate/{index.js, run.js, validators.js, calendar.js,
  validate.test.js, calendar.test.js}` — the lib. **Plants' fork, not animals'** (D2): identical to animals apart
  from an empty-allow-list guard in `requiredOneOf`, two extra primitives (`requiredDateTextInRange`, `requiredTime`)
  and a four-digit-year guard in `parseDateText`. `persists-cleaned-value.test.js` is engine-bound and is not ported.
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/identification-numbers/{controller.js, template.njk}`
  — a text form validated with `compose(requiredMaxText(…), maxText(…), pattern(…))`, `validate(fields, values)`,
  `errors` + `errorSummary: kit.errorSummary(errors)` in the view model, `{% include "shared/error-summary.njk" %}`
  and `errorMessage: errors[name] and { text: errors[name] }` in the template. This is the shape add and edit take.
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/origin/controller.js`
  lines 70–73 and 109–125 — `requiredOneOf(field, values, message)` for a select fed by reference data, and the
  `render` that defaults `errors` to `{}` before handing it to `kit.errorSummary`.
- `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/place-of-destination/`
  (the stage's named reference) — the same `kit.errorSummary` / `error-summary.njk` idiom on a picker page; its
  `controller.test.js` lines 307–321 show the `errorSummary.errorList` assertion shape.
- `repos/trade-imports-plants-frontend/src/server/app/shared/copy.en.js` lines 74–91 and `copy.cy.js` lines 67–77 —
  `validatorDefaults`, the fallbacks `validators.js` imports.
- `repos/trade-imports-plants-frontend/src/server/app/copy-parity.test.js` lines 8–15 and 52–59, and
  `copy-convention.test.js` lines 7 and 91–98 — how the two guards cover `validatorDefaults`.
- `repos/trade-imports-plants-frontend/test/fixtures/values.js` lines 32–40 — the four constants plants'
  `validate.test.js` imports; ins inlines them (D14).
- `repos/trade-imports-ins-frontend/src/server/app/shared/kit.js` lines 34–50 — `errorSummary` and `fieldError`,
  already ins's (s05), byte-identical to plants' lines 84–100. **Unchanged by this stage.**

Baseline (s07's landed ladder on `8f9ea79`, `logs/s07-fix2-test.log` / `logs/s07-fix2-testfit.log`): unit suite **56
files / 324 tests green**, `format:check` clean, `lint` clean, Playwright **49/49** green. Expected after this stage:
**58 files / 467 tests** (§5 arithmetic), Playwright still **49/49**.

What this stage does: copies plants' `lib/validate` into `src/server/app/lib/validate/` (six files) and adds one
primitive to it (`requiredEmail`, D3); adds `validatorDefaults` to the shared copy pair and to the two copy guards;
rewrites `features/address-book/fields.js` as one `addressRules(countryCodes)` composition over the lib; switches the
add and edit pages to the journeys' error model (`errors` → `kit.errorSummary` → `shared/error-summary.njk`); makes
`mapApiErrorsToFormErrors` return `{ field: message }`; drops the direct `joi` dependency. **Every English validation
message the fit specs assert still renders byte-for-byte**, linked from the summary to its field. The public URL
surface, every `data-testid`, and the whole Playwright suite are unchanged. 6 files are created, 19 are edited in
place, nothing is moved or deleted (the brief's `common/helpers/validation-helpers.js` already left the tree in s06,
commit `2b523ec`).

---

## 0. Decisions (made here so the implementor never has to choose)

| # | Question the brief left open | Decision |
|---|---|---|
| D1 | "Remove joi from package.json" — yet the lib the brief says to port is built on Joi (`validators.js` line 1 `import Joi from 'joi'`), and so is `address-id-params.js`. | **Remove the direct dependency only; Joi stays as the engine under `lib/validate`.** This is exactly the journeys' state: neither animals' nor plants' `package.json` declares `joi`, and both resolve it through `@hapi/bell` and `@hapi/catbox-redis` (each `"joi": "^17.7.1"`), hoisted to `node_modules/joi` (17.13.7 there, 17.13.4 in ins's lockfile lines 7553–7565). After the removal ins resolves it the same way. Feature code never imports Joi again — the only importers are `lib/validate/validators.js` and `address-id-params.js` (§6E). The phantom dependency is a programme-level question for s12/s13 (declare `joi` in all three repos, or accept the hoist), recorded in the stage note; it is not this stage's to settle, because settling it either way in ins alone breaks parity. |
| D2 | Which fork of the lib. The brief says animals; the direction rule says plants where they differ. | **Plants'.** Six files copied verbatim (`cp`), then two edits: `validators.js` gains `requiredEmail` (D3) and `validate.test.js` inlines four fixture constants (D14) and gains a `#requiredEmail` block. `calendar.js`, `run.js`, `calendar.test.js` are byte-identical to plants'; `index.js` differs by one export line. `persists-cleaned-value.test.js` is not ported — it drives the journey engine (`store`, `configureRecords`, `driveHandler`), all journey-only machinery. Its intent ("the cleaned value is persisted, not the raw payload") is pinned at ins's own network boundary instead: T4 posts a padded name through the add page and matches the nock body (D8). |
| D3 | "`pattern()` for the email". `compose(requiredMaxText('email', …), pattern('email', …))` **cannot work**: `pattern()` is `Joi.string().trim().allow('').pattern(regex)`, and Joi's `concat` merges that `allow('')` onto the required rule — blank then passes, and `fit/add.fit.spec.js`'s `empty Email address → 'Enter an email address'` goes red. The lib's own doc comment on `requiredMaxText` names this pitfall and is why `requiredExactDigits`, `requiredIntegerInRange`, `requiredDateText` and `requiredTime` exist as separate primitives. | **One new primitive in ins's `validators.js`: `requiredEmail(name, max, { required, maxLength, format })`** — the lib's idiom for "required + cap + shape" (`requiredExactDigits` is the model). It keeps Joi's `.email({ tlds: { allow: false } })`, the exact rule ins runs today, so which strings pass and fail is unchanged; `.max(max)` is chained **before** `.email()` so an over-long value that is also malformed is told about its length — `fit/address-form.js`'s `maxLengthValidations` posts 255 `A`s to the email field and expects `'Email address must be 254 characters or fewer'`, and `run.js` keeps only the first message per field. Exported from `index.js`, tested in `validate.test.js` (8 tests). The lib is otherwise byte-identical to plants'; `requiredEmail` is flagged in the stage note as an s12 backport candidate (a consignment-contact email is the obvious first journey use). `pattern()` is not used by this stage. |
| D4 | The country select has two messages today: `errors.countryCode.required` (`'Enter a country'`, blank) and `errors.countryCode.fromList` (`'Select a country from the list'`, unknown code). `requiredOneOf(name, values, message)` takes one message for blank, absent and unknown. | **`requiredOneOf('countryCode', countryCodes, errors.countryCode.required)`** — plants' shape (origin controller line 72). `fromList` leaves both copy modules (E13, E14); nothing else references it (grep at planning time: `fields.js`, the two copy files, nothing in tests or fit specs). An unknown code was reachable only by tampering with the select; it now gets `'Enter a country'`. Named in §8. |
| D5 | The brief says errors flow into `kit.errorSummary()` **and `kit.fieldError()`**. Neither journey calls `fieldError` anywhere (grep over both `src/server/app` trees: zero call sites); their templates read the map directly — `errorMessage: errors[name] and { text: errors[name] }` (plants identification-numbers line 18, origin line 27). Nunjucks cannot call `kit.fieldError` unless a controller puts a function in the context, which no journey does. | **Templates use the journeys' idiom; `kit.fieldError` stays in `kit.js` exactly as plants keeps it** (exported, tested by `kit.test.js`, uncalled by templates in all three repos). The view model carries `errors` (`{ field: message }`, defaulting to `{}`) and `errorSummary: kit.errorSummary(errors)`; the template includes `shared/error-summary.njk` and reads `errors.<field>`. Direction wins over the brief's parenthetical. |
| D6 | Page-level failures — `'Something went wrong loading the form'`, `'… saving the address'`, `'… loading your address book'`, `'… loading the dashboard'` — render today as an `errorList` entry **without an `href`**, which govuk's error summary renders as plain text (`error-summary/template.njk` line 23 `{% if item.href %}`). `kit.errorSummary` always builds an `href`; a link to a missing anchor is an accessibility regression. Plants has no such entries: a backend failure sets `recoverableError: true` and the **layout** renders a notification banner (plants `shared/layout.njk` lines 84–88, `sharedCopy.recoverableError`). | **Page-level failures keep the `errorList: [{ text }]` shape and their inline `govukErrorSummary` blocks**, untouched in list and dashboard, kept in add and edit. Field errors (validation and API 400) are the only thing that moves to `errors` + `errorSummary`. The add and edit templates therefore carry both: the `{% include "shared/error-summary.njk" %}` where the `errorList` block sits today, then the `errorList` block. HANDOFF to s09 (recorded in the stage note): when the DR1 layout lands with plants' `recoverableError` banner, the four page-level `errorList` entries become `recoverableError: true` and the inline blocks go; `kit.base` already accepts `recoverableError` (s05). |
| D7 | `mapApiErrorsToFormErrors` today returns `{ errorList, fieldErrors }` with **every** API message in the summary and the first inline. | **Returns `{ field: firstMessage }`** — the brief's shape, one message per field, the same policy `run.js`'s `toFieldErrors` applies to the lib's own output. Name kept (the brief names it). Named in §8. |
| D8 | What `validate()` runs over. `compose()` builds `Joi.object({}).unknown(true)`, so unknown keys (`crumb`, `cancel`) pass through into `value`. | **`validate(addressRules(codes), formValuesOf(payload))`** — the nine form fields, as today's `schema.validate(formValues, …)`. `value` is therefore the nine trimmed fields and nothing else, so the API body stays exactly what it is today. T4 pins the exact body with `toEqual`. |
| D9 | The shape of `fields.js`. | **`FIELD_RULES`, `FIELDS`, `formValuesOf` unchanged** (`copy/copy.test.js` and `fields.test.js` pin them; `FIELD_RULES.email.email: true` stays as data). `buildAddressSchema(mdmCountryCodes)` becomes **`addressRules(countryCodes)`** — one `compose(…)` of nine rules in `FIELDS` order (the summary lists fields in schema-key order, which is the order the rules are composed, which is the order the form asks — unchanged from today). Two private helpers build the text rules from `FIELD_RULES` and copy: `requiredTextRule(field)` → `requiredMaxText`, `optionalTextRule(field)` → `maxText`. `formatValidationErrors` and `fieldNameOf` are deleted — `run.js` does that mapping. |
| D10 | `validatorDefaults`. `validators.js` imports `validatorDefaults` from `../../shared/copy.en.js` and `copy.cy.js`; ins's shared copy has none (s07 D1 deferred it here). | **Plants' nine-key objects verbatim** (`oneOf`, `postcode`, `vehicleReg`, `ukPhone`, `date`, `time`, `wholeNumber`, `maxLength`, `numberBetween`), en and cy, with plants' doc comment on the en export. Only `maxLength` is reachable from ins's form (the fallback when a `requiredMaxText` call passes no `maxLength` message — every ins call passes one); the rest are the lib's fallbacks and travel with it so the lib stays a verbatim port. `copy-parity.test.js` gains the `shared.validatorDefaults` pair and `copy-convention.test.js` walks the defaults (plants' hunks); `shared/copy.test.js` gains a both-locale walk that **invokes** the function leaves (s07 D20's coverage rule — the Welsh arrow bodies are otherwise executed by nothing). No `email` key is added to the defaults: `requiredEmail`'s `format` message is mandatory (D3), so the defaults stay plants'. |
| D11 | `address-id-params.js` (`Joi.object({ id: … })` for hapi's `validate.params`). | **Left alone.** hapi route parameter validation takes a Joi schema (`docs/best-practices/node/hapi.md` §3 "Every path parameter needs a format constraint"); plants' `pageRoutes` has no parameter validation to mirror; its messages are not user-facing (s07 D17). Its `import Joi from 'joi'` becomes the second phantom import (D1). |
| D12 | How to refresh the lockfile "with the repo's own npm". ins pins Node (`.nvmrc` `v24.14.1`) but not npm (no `packageManager`, unlike the journeys' `npm@11.6.2`); the lockfile is `lockfileVersion: 3`; the ambient npm is 11.17.0, which writes v3. No entry under `repos/` is a symlink (verified `ls -la`), so `--prefix` is safe. | **`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend uninstall joi`** — one command that removes the line from `package.json` and rewrites `package-lock.json`. Expected diff: `package.json` line 66 gone; lockfile root block line 39 (`"joi": "^17.13.3",`) gone; the `node_modules/joi` block (17.13.4) **still present**, because `@hapi/bell` (lockfile line 2206) and `@hapi/catbox-redis` (line 2288) require it. If the lockfile diff touches anything else (a version bump, a reordered block), revert both files with `git -C … checkout -- package.json package-lock.json`, remove the line with the Edit tool, and run `npm --prefix … install` instead; the expected diff is the same. |
| D13 | Template error idiom. | **`errorMessage: errors.name and { text: errors.name }`** (plants), replacing `errorMessage: fieldErrors.name if fieldErrors`. `errors` is always an object in the view model (`= {}` default in `buildView`), as plants' `render` guarantees (`options.errors ?? {}`). |
| D14 | Plants' `validate.test.js` imports `CATEGORY_ONE`, `CATEGORY_TWO`, `SELECTOR_ALPHA`, `SELECTOR_BRAVO` from `test/fixtures/index.js`, a journey fixture tree ins does not have. | **Four local constants** with the fixture values (`'categoryOne'`, `'categoryTwo'`, `'selectorAlpha'`, `'selectorBravo'`) replace the import (E3). Every other line of the test is plants'. |
| D15 | Where the summary sits and whether the `<title>` gains plants' `Error: ` prefix. | **Position unchanged; no title prefix.** The include replaces the inline block at the same spot (inside the page body `div`, after the heading). Plants puts the summary above the `h1` and prefixes the title when `errorSummary` is set (`layout.njk` line 26) — both are layout decisions for s09. |
| D16 | Controller tests assert English literals (s07 D19). | **Still literals.** The invalid-data tests in add and edit gain literal message and `href="#…"` assertions (T5, T6) so a lost link or a changed word fails at unit level, not only in Playwright. `fields.test.js` reads messages from `copy.en.js` because it is the copy module's consumer test (the literals themselves are pinned by `copy/copy.test.js` and the fit tables). |
| D17 | Comments. | Every comment in the six lib files is plants' and comes with the copy. `requiredEmail`'s doc block (E1) is the only new comment in the lib. The address-book `copy.en.js` header's "hands to joi" becomes "hands to `lib/validate`" (E13) — that is the only comment edit outside the lib. No migration or rename wording anywhere (§6I). |
| D18 | Format. | Run `npm --prefix … run format` once after the edits and before the ladder; new and copied files are written unwrapped where wrapping is prettier's call. Templates are not formatted (the prettier globs are `.js`). |

---

## 1. Moves — every file that moves or is deleted

Nothing moves inside ins and nothing is deleted. The brief's `src/server/common/helpers/validation-helpers.js` was
removed in s06 (`git log --all -- src/server/common/helpers/validation-helpers.js` → last touched by `2b523ec`);
its replacement is `kit.errorSummary`, in place since s05.

The six lib files are **copied** from plants (a port, not a move). Create the folder first, then one `cp` per file:

| From (plants, Bash tilde path prefix `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/lib/validate/`) | To (ins, `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/lib/validate/`) | Then |
|---|---|---|
| `index.js` | `index.js` | E2 |
| `run.js` | `run.js` | verbatim |
| `validators.js` | `validators.js` | E1 |
| `calendar.js` | `calendar.js` | verbatim |
| `validate.test.js` | `validate.test.js` | E3 |
| `calendar.test.js` | `calendar.test.js` | verbatim |

`mkdir -p ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/lib/validate` first. Do
**not** copy `persists-cleaned-value.test.js` (D2). After copying, `grep -rn "engine/\|test/fixtures" …/src/server/app/lib`
must return only the `validate.test.js` fixture import that E3 removes.

Nothing in `docker/`, `compose.yml`, `README.md`, `sonar-project.properties`, `Dockerfile`, `nodemon.json`,
`vite.config.js`, `vitest.config.js`, `playwright.config.js` or `.github/workflows/` names `joi`, `fields.js` exports or
the lib (verified by grep at planning time).

---

## 2. Edits — every file whose content changes

Every edit gives the finished content or the exact hunk. Import order inside a controller follows plants' origin
controller and s07's rule: services → `lib/http-status` → `lib/validate` → `kit` → `copy` (the seam) → `paths` →
chassis logger → feature-local modules → the feature's `copy.en.js` / `copy.cy.js` last.

### E1 — `src/server/app/lib/validate/validators.js` (copied from plants, one insertion)

Insert the following **between** the `requiredMaxText` export (plants lines 67–90, ending `      })\n  )`) and
`export const pattern = (name, regex, message) =>` (plants line 92), with one blank line either side:

```js
/**
 * Save-blocking email address with a length cap. One primitive for the same
 * reason as `requiredMaxText`: a shape rule on its own allows the empty
 * string, and composing it onto a required rule would let blank pass. The
 * length rule runs before the shape rule, so an over-long value that is also
 * malformed is told about its length.
 * @param {string} name
 * @param {number} max
 * @param {object} messages
 * @param {string} messages.required - Shown when the value is blank or absent.
 * @param {string} [messages.maxLength] - Shown when the value is over the cap.
 * @param {string} messages.format - Shown when the value is not an email
 * address.
 */
export const requiredEmail = (name, max, messages) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .max(max)
      .email({ tlds: { allow: false } })
      .messages({
        'string.empty': messages.required,
        'any.required': messages.required,
        'string.max': messages.maxLength ?? defaults.maxLength(max),
        'string.email': messages.format
      })
  )
```

Nothing else in the file changes. Its imports (`./calendar.js`, `../../shared/copy.js`, `../../shared/copy.en.js`,
`../../shared/copy.cy.js`) resolve unchanged from `src/server/app/lib/validate/` in ins — the same depth as in plants.

### E2 — `src/server/app/lib/validate/index.js` — full content

```js
export { validate } from './run.js'
export {
  compose,
  requiredText,
  requiredExactDigits,
  optionalText,
  maxText,
  requiredMaxText,
  requiredEmail,
  pattern,
  postcode,
  vehicleReg,
  ukPhone,
  oneOf,
  requiredOneOf,
  integerInRange,
  requiredIntegerInRange,
  dateParts,
  dateText,
  dateTextInRange,
  requiredDateText,
  requiredDateTextInRange,
  requiredTime
} from './validators.js'
export {
  addUtcDays,
  addUtcMonths,
  formatDateText,
  isRealDate,
  parseDateText,
  startOfDayInZone,
  startOfUtcDay
} from './calendar.js'
```

(Plants' file plus the `requiredEmail,` line after `requiredMaxText,`.)

### E3 — `src/server/app/lib/validate/validate.test.js` (copied from plants, three hunks)

(a) In the `./index.js` import list, add `  requiredEmail,` between `  requiredDateTextInRange,` and
`  requiredExactDigits,`.

(b) Delete the six-line fixture import (plants lines 25–30):

```js
import {
  CATEGORY_ONE,
  CATEGORY_TWO,
  SELECTOR_ALPHA,
  SELECTOR_BRAVO
} from '../../../../../test/fixtures/index.js'
```

and add, directly after `const run = (schema, payload) => validate(schema, payload)` and its blank line:

```js
const CATEGORY_ONE = 'categoryOne'
const CATEGORY_TWO = 'categoryTwo'
const SELECTOR_ALPHA = 'selectorAlpha'
const SELECTOR_BRAVO = 'selectorBravo'
```

(c) Append this block directly after the `describe('#requiredMaxText — save-blocking text with a length cap', …)`
block (before `describe('#dateParts …')`):

```js
describe('#requiredEmail — save-blocking email address with a length cap', () => {
  const EMAIL_REQUIRED_MESSAGE = 'Enter an email address'
  const EMAIL_FORMAT_MESSAGE = 'Enter an email address in the correct format'
  const EMAIL_MAX_LENGTH_MESSAGE = 'Email address must be 20 characters or fewer'
  const EMAIL_MAX_LENGTH = 20
  const schema = requiredEmail('email', EMAIL_MAX_LENGTH, {
    required: EMAIL_REQUIRED_MESSAGE,
    maxLength: EMAIL_MAX_LENGTH_MESSAGE,
    format: EMAIL_FORMAT_MESSAGE
  })

  it('Should accept an address and hand back the trimmed value', () => {
    const { errors, value } = run(schema, { email: '  alex@example.com  ' })
    expect(errors).toBeNull()
    expect(value.email).toBe('alex@example.com')
  })

  it('Should block blank, whitespace-only and missing values with the required message', () => {
    expect(run(schema, { email: '' }).errors).toEqual({
      email: EMAIL_REQUIRED_MESSAGE
    })
    expect(run(schema, { email: '   ' }).errors).toEqual({
      email: EMAIL_REQUIRED_MESSAGE
    })
    expect(run(schema, {}).errors).toEqual({ email: EMAIL_REQUIRED_MESSAGE })
  })

  it.each(['not-an-email', 'alex@', '@example.com', 'alex example.com'])(
    'Should reject %s with the format message',
    (value) => {
      expect(run(schema, { email: value }).errors).toEqual({
        email: EMAIL_FORMAT_MESSAGE
      })
    }
  )

  it('Should tell an over-long malformed value about its length, not its shape', () => {
    expect(
      run(schema, { email: 'A'.repeat(EMAIL_MAX_LENGTH + 1) }).errors
    ).toEqual({ email: EMAIL_MAX_LENGTH_MESSAGE })
  })

  it('Should fall back to the shared length message when none is given', () => {
    const withoutLengthMessage = requiredEmail('email', EMAIL_MAX_LENGTH, {
      required: EMAIL_REQUIRED_MESSAGE,
      format: EMAIL_FORMAT_MESSAGE
    })

    expect(
      run(withoutLengthMessage, { email: 'A'.repeat(EMAIL_MAX_LENGTH + 1) })
        .errors
    ).toEqual({ email: validatorDefaults.maxLength(EMAIL_MAX_LENGTH) })
  })
})
```

(8 tests: 1 + 1 + 4 + 1 + 1.) Everything else in the file is plants' verbatim, including `validatorDefaults` imported
from `../../shared/copy.en.js`, which E5 provides.

### E4 — `package.json`

Line 66, `    "joi": "^17.13.3",`, goes — by D12's `npm uninstall joi`, not by hand. Nothing else in the file changes.
`package-lock.json` changes only as D12 describes.

### E5 — `src/server/app/shared/copy.en.js`

Append after the closing `}` of `export const copy = { … }` (plants lines 74–91 verbatim):

```js

/**
 * Default validator messages — the fallbacks `lib/validate` composers use
 * when a call site passes no feature message. A separate export (not a
 * `copy` key) because parameterised defaults are function leaves and
 * `copy-leaves.js`'s `isCopyLeaf` pins string-only leaves. Locale-swappable
 * the same way: a `copy.cy.js` exports its own `validatorDefaults`.
 */
export const validatorDefaults = {
  oneOf: 'Select a valid option',
  postcode: 'Enter a valid postcode',
  vehicleReg: 'Enter a valid registration number',
  ukPhone: 'Enter a valid UK telephone number',
  date: 'Enter a valid date',
  time: 'Enter a real time, like 14:30',
  wholeNumber: 'Enter a whole number',
  maxLength: (max) => `Enter ${max} characters or fewer`,
  numberBetween: (min, max) => `Enter a number between ${min} and ${max}`
}
```

(The comment's claim that `isCopyLeaf` pins string-only leaves is plants' wording; ins's `copy-leaves.js` is the same
file, so it is equally true or untrue here — it comes verbatim, invariant 6 notwithstanding, because it is the
reference file's own doc block, not a migration comment. Leave it.)

### E6 — `src/server/app/shared/copy.cy.js`

Append after the closing `}` of `export const copy = { … }` (plants lines 67–77 verbatim):

```js

export const validatorDefaults = {
  oneOf: 'Dewiswch opsiwn dilys',
  postcode: 'Rhowch god post dilys',
  vehicleReg: 'Rhowch rif cofrestru dilys',
  ukPhone: 'Rhowch rif ffôn dilys yn y DU',
  date: 'Rhowch ddyddiad dilys',
  time: 'Rhowch amser go iawn, fel 14:30',
  wholeNumber: 'Rhowch rif cyfan',
  maxLength: (max) => `Rhowch ${max} nod neu lai`,
  numberBetween: (min, max) => `Rhowch rif rhwng ${min} a ${max}`
}
```

### E7 — `src/server/app/shared/copy.test.js`

Replace lines 3–5 (the three imports) with:

```js
import { copyFor } from './copy.js'
import {
  copy as sharedEn,
  validatorDefaults as validatorDefaultsEn
} from './copy.en.js'
import {
  copy as sharedCy,
  validatorDefaults as validatorDefaultsCy
} from './copy.cy.js'
```

and append at the end of the file:

```js

describe('validator defaults', () => {
  const SAMPLE_ARGUMENTS = [1, 2]

  const textOf = (value) =>
    typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

  it.each([
    ['en', validatorDefaultsEn],
    ['cy', validatorDefaultsCy]
  ])(
    'Should render text at every %s leaf, function leaves included',
    (locale, defaults) => {
      for (const { path, value } of leaves(defaults)) {
        expect(
          textOf(value).trim().length,
          `${locale}: ${path} must render text`
        ).toBeGreaterThan(0)
      }
    }
  )
})
```

The file's own local `leaves` helper (lines 7–12) serves; it treats a function as a leaf (`typeof node === 'object'`
is false for a function). The existing `'shared copy module'` walk over `sharedEn` is untouched — `validatorDefaults`
is a separate export and never enters it. (+2 tests.)

### E8 — `src/server/app/copy-parity.test.js`

Replace lines 8–9 (the two shared imports) with:

```js
import {
  copy as sharedEn,
  validatorDefaults as validatorDefaultsEn
} from './shared/copy.en.js'
import {
  copy as sharedCy,
  validatorDefaults as validatorDefaultsCy
} from './shared/copy.cy.js'
```

and replace the `return [...pairs, { name: 'shared', en: sharedEn, cy: sharedCy }]` line in `modulePairs` with:

```js
  return [
    ...pairs,
    { name: 'shared', en: sharedEn, cy: sharedCy },
    {
      name: 'shared.validatorDefaults',
      en: validatorDefaultsEn,
      cy: validatorDefaultsCy
    }
  ]
```

Nothing else changes: the `'the locale seam resolves cy'` block keeps its address-book pair (s07's), and
`IDENTICAL_ALLOWLIST` stays empty — every default string differs between locales. Test count unchanged; the parity
walks now cover the ninth module pair.

### E9 — `src/server/app/copy-convention.test.js`

Replace line 7 with:

```js
import { copy as sharedCopy, validatorDefaults } from './shared/copy.en.js'
```

and replace the last test of the file (`'Should keep every shared leaf valid copy'`) with plants' lines 91–98:

```js
  it('Should keep every shared and validator-default leaf valid copy', () => {
    for (const { path: leafPath, value } of [
      ...leaves(sharedCopy),
      ...leaves(validatorDefaults)
    ]) {
      expect(isCopyLeaf(value), `${leafPath} must be copy`).toBe(true)
    }
  })
```

Test count unchanged.

### E10 — `src/server/app/features/address-book/fields.js` — full content

```js
import {
  compose,
  maxText,
  requiredEmail,
  requiredMaxText,
  requiredOneOf
} from '../../lib/validate/index.js'
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const FIELD_RULES = {
  name: { maxLength: 255, required: true },
  addressLine1: { maxLength: 255, required: true },
  addressLine2: { maxLength: 255, required: false },
  townOrCity: { maxLength: 100, required: true },
  county: { maxLength: 100, required: false },
  postcode: { maxLength: 12, required: true },
  countryCode: { required: true },
  phone: { maxLength: 20, required: true },
  email: { maxLength: 254, required: true, email: true }
}

export const FIELDS = Object.keys(FIELD_RULES)

export const formValuesOf = (source = {}) =>
  Object.fromEntries(FIELDS.map((field) => [field, source[field] ?? '']))

const { errors } = copyFor({ en, cy })

const maxLengthOf = (field) => FIELD_RULES[field].maxLength

const maxLengthMessageFor = (field) =>
  errors[field].maxLength(maxLengthOf(field))

const requiredTextRule = (field) =>
  requiredMaxText(field, maxLengthOf(field), {
    required: errors[field].required,
    maxLength: maxLengthMessageFor(field)
  })

const optionalTextRule = (field) =>
  maxText(field, maxLengthOf(field), maxLengthMessageFor(field))

/**
 * The Standard Address Block rules, composed in the order the form asks the
 * fields — the order the error summary lists them in.
 *
 * @param {readonly string[]} countryCodes - the alpha-2 codes the country
 * select offers; anything else is refused as if blank.
 */
export const addressRules = (countryCodes) =>
  compose(
    requiredTextRule('name'),
    requiredTextRule('addressLine1'),
    optionalTextRule('addressLine2'),
    requiredTextRule('townOrCity'),
    optionalTextRule('county'),
    requiredTextRule('postcode'),
    requiredOneOf('countryCode', countryCodes, errors.countryCode.required),
    requiredTextRule('phone'),
    requiredEmail('email', maxLengthOf('email'), {
      required: errors.email.required,
      maxLength: maxLengthMessageFor('email'),
      format: errors.email.format
    })
  )
```

Gone: `import Joi from 'joi'`, the ten `…Schema` builders, `crumbSchema`, `buildAddressSchema`, `fieldNameOf`,
`formatValidationErrors`. The rendered messages are the same fifteen strings (`fit/address-form.js` pins them all in
the browser; T3 pins them at unit level); `'Select a country from the list'` is the one message that no longer
renders (D4).

### E11 — `src/server/app/features/address-book/add/controller.js` — full content

```js
import {
  createAddress,
  isValidationFailure,
  mapApiErrorsToFormErrors
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../lib/http-status.js'
import { validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { addressAddPath, addressBookPath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { addressRules, formValuesOf } from '../fields.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/add/template'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (
  h,
  { formValues, countryItems, errors = {}, errorList }
) =>
  h.view(view, {
    ...kit.base(copy.add.title),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors),
    errorList
  })

const countryItemsOrNone = async () =>
  countryItemsOf(await getAddressFormCountries().catch(() => []))

const get = async (_request, h) => {
  try {
    const countries = await getAddressFormCountries()
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: countryItemsOf(countries)
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: [],
      errorList: [{ text: copy.errors.loadForm }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return h.redirect(addressBookPath())
  }
  const formValues = formValuesOf(payload)

  try {
    const countries = await getAddressFormCountries()
    const { errors, value } = validate(
      addressRules(countries.map((country) => country.code)),
      formValues
    )
    if (errors) {
      return buildView(h, {
        formValues,
        countryItems: countryItemsOf(countries),
        errors
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const created = await createAddress(orgId, value)
    setSuccessBanner(request, copy.successBanner.added(created.name))
    return h.redirect(addressBookPath())
  } catch (err) {
    if (isValidationFailure(err)) {
      return buildView(h, {
        formValues,
        countryItems: await countryItemsOrNone(),
        errors: mapApiErrorsToFormErrors(err.body)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId }, 'Failed to create address')
    return buildView(h, {
      formValues,
      countryItems: await countryItemsOrNone(),
      errorList: [{ text: copy.errors.save }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
```

Diff against today: the `validate` import; `addressRules, formValuesOf` replacing the three `fields.js` imports;
`buildView` takes `errors = {}` and puts `errors` + `errorSummary` in the view model instead of `fieldErrors`; the
`schema.validate` / `formatValidationErrors` pair becomes `validate(addressRules(…), formValues)` with `errors`
passed straight through; the API-400 branch passes `errors: mapApiErrorsToFormErrors(err.body)`. Everything else —
`get`, the cancel short-circuit, the success banner, the two `errorList` failure paths, the logger lines — is the s07
file.

### E12 — `src/server/app/features/address-book/add/template.njk`

Two kinds of hunk, nothing else changes (the `{% from … import govukErrorSummary %}` line stays — the `errorList`
block still needs it):

(a) Replace lines 13–18

```njk
    {% if errorList %}
      {{ govukErrorSummary({
        titleText: sharedCopy.errorSummary.title,
        errorList: errorList
      }) }}
    {% endif %}
```

with

```njk
    {% include "shared/error-summary.njk" %}

    {% if errorList %}
      {{ govukErrorSummary({
        titleText: sharedCopy.errorSummary.title,
        errorList: errorList
      }) }}
    {% endif %}
```

(b) Every `errorMessage: fieldErrors.<field> if fieldErrors` (nine occurrences: `name`, `addressLine1`,
`addressLine2`, `townOrCity`, `county`, `postcode`, `countryCode`, `email`, `phone`) becomes
`errorMessage: errors.<field> and { text: errors.<field> }`. For example line 30:

```njk
        errorMessage: errors.name and { text: errors.name }
```

### E13 — `src/server/app/features/address-book/edit/controller.js` — full content

```js
import Boom from '@hapi/boom'

import {
  isValidationFailure,
  mapApiErrorsToFormErrors,
  updateAddress
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_FOUND
} from '../../../lib/http-status.js'
import { validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressBookPath,
  addressEditRoutePath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import { addressRules, formValuesOf } from '../fields.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/edit/template'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (
  h,
  { id, formValues, countryItems, errors = {}, errorList }
) =>
  h.view(view, {
    ...kit.base(copy.edit.title, { backLink: addressPath(id) }),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors),
    errorList
  })

const countryItemsOrNone = async () =>
  countryItemsOf(await getAddressFormCountries().catch(() => []))

const rejected = async (h, model) =>
  buildView(h, { ...model, countryItems: await countryItemsOrNone() })

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    const countries = await getAddressFormCountries()
    return buildView(h, {
      id,
      formValues: formValuesOf(address),
      countryItems: countryItemsOf(countries)
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address for edit')
    )
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return h.redirect(addressBookPath())
  }
  const formValues = formValuesOf(payload)

  try {
    const countries = await getAddressFormCountries()
    const { errors, value } = validate(
      addressRules(countries.map((country) => country.code)),
      formValues
    )
    if (errors) {
      return buildView(h, {
        id,
        formValues,
        countryItems: countryItemsOf(countries),
        errors
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const updated = await updateAddress(orgId, id, value)
    setSuccessBanner(request, copy.successBanner.updated(updated.name))
    return h.redirect(addressBookPath())
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    if (err.status === HTTP_STATUS_NOT_FOUND) {
      throw Boom.notFound()
    }
    if (isValidationFailure(err)) {
      return (
        await rejected(h, {
          id,
          formValues,
          errors: mapApiErrorsToFormErrors(err.body)
        })
      ).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId, id }, 'Failed to update address')
    return (
      await rejected(h, {
        id,
        formValues,
        errorList: [{ text: copy.errors.save }]
      })
    ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(
  addressEditRoutePath(),
  { get, post },
  addressIdRouteOptions
)
```

Same diff shape as E11 (the `validate` import, `addressRules`, `errors` + `errorSummary` in `buildView`, `errors`
passed through on both refusal paths); the Boom/404 handling, `rejected`, `get` and the failure `errorList` are the
s07 file.

### E14 — `src/server/app/features/address-book/edit/template.njk`

Same two hunks as E12: (a) lines 19–24 (the `errorList` block) gain the include above them, exactly as E12(a); (b)
the nine `errorMessage: fieldErrors.<field> if fieldErrors` lines become
`errorMessage: errors.<field> and { text: errors.<field> }` (`name`, `addressLine1`, `addressLine2`, `townOrCity`,
`county`, `postcode`, `countryCode`, `phone`, `email`). The `govukBackLink`, the `classes`, the field order (phone
before email on edit) are untouched.

### E15 — `src/server/app/features/address-book/copy/copy.en.js`

Two hunks:

(a) Lines 1–6, the header comment, become:

```js
/**
 * The address book — one copy module for the five pages. `form` is shared by
 * add and edit (the same Standard Address Block); `errors` carries the
 * validation messages `fields.js` hands to `lib/validate`, one namespace per
 * field so a message and its rule sit together.
 */
```

(b) Lines 100–103, the `countryCode` namespace, lose `fromList` (D4):

```js
    countryCode: {
      required: 'Enter a country'
    },
```

### E16 — `src/server/app/features/address-book/copy/copy.cy.js`

Lines 96–99, the `countryCode` namespace, lose `fromList`:

```js
    countryCode: {
      required: 'Rhowch wlad'
    },
```

(`copy-parity.test.js` refuses a cy path that en lacks and vice versa — both must change together.)

### E17 — `src/server/app/services/address-book/index.js`

Replace lines 22–34 (`mapApiErrorsToFormErrors`) with:

```js
export const mapApiErrorsToFormErrors = (problemBody) =>
  Object.fromEntries(
    Object.entries(problemBody?.errors ?? {}).map(([field, messages]) => [
      field,
      messages[0]
    ])
  )
```

Nothing else changes (`isValidationFailure`, the five operations, the mode switch). The public surface test
(`address-book.test.js` `'the public surface'`) still lists seven names.

### E18 — `src/server/app/features/address-book/fields.test.js` — full content (T3)

See §5, T3.

### E19 — `src/server/app/services/address-book/address-book.test.js` (T2)

See §5, T2.

### E20 / E21 — `add/controller.test.js` (T4, T5) and `edit/controller.test.js` (T6)

See §5.

---

## 3. New files — full intent, and the reference file to imitate

All six are the plants files listed in §1 (`cp`), so there is no content to author beyond E1–E3. For the record:

| File | What it is | Reference |
|---|---|---|
| N1 `src/server/app/lib/validate/index.js` | the lib's public surface | plants' `index.js` + E2 |
| N2 `src/server/app/lib/validate/run.js` | `validate(schema, payload)` → `{ value, errors }` with `abortEarly: false`, `convert: true`, one message per field | plants', verbatim |
| N3 `src/server/app/lib/validate/validators.js` | the composers; Joi under the hood; defaults from the shared copy | plants' + E1 |
| N4 `src/server/app/lib/validate/calendar.js` | UTC-midnight date helpers over `date-fns` (ins already depends on `date-fns` 4.1.0) | plants', verbatim |
| N5 `src/server/app/lib/validate/validate.test.js` | one describe per primitive | plants' + E3 (98 tests) |
| N6 `src/server/app/lib/validate/calendar.test.js` | the calendar helpers | plants', verbatim (26 tests) |

`vitest` forces `TZ=UTC` in ins's `test` script already (`package.json` line 27), which `calendar.js`'s header comment
relies on.

---

## 4. Imports — the rule for rewriting the imports this stage disturbs

- Every import is relative and the shortest path (s02 D1). The lib sits at `src/server/app/lib/validate/`; a feature
  page folder reaches it as `../../../lib/validate/index.js`, `address-book/fields.js` as
  `../../lib/validate/index.js`. **Always import from `index.js`**, never from `validators.js` or `run.js` directly —
  the journeys do the same (plants origin line 12).
- The lib's own imports (`../../shared/copy.js`, `../../shared/copy.en.js`, `../../shared/copy.cy.js`, `./calendar.js`)
  are plants' and resolve unchanged because ins's `app/lib` and `app/shared` sit at the same depth as plants'.
- `fields.js` is the only feature module that imports validators; the two controllers import only `validate`. No
  module outside `lib/validate` and `address-id-params.js` imports `joi` (§6E).
- The three names that disappear — `buildAddressSchema`, `formatValidationErrors`, `fieldErrors` — have importers
  only in `add/controller.js`, `edit/controller.js`, `fields.test.js` and the two templates; E10–E14 and T3 rewrite
  every one. `grep -rn "buildAddressSchema\|formatValidationErrors\|fieldErrors" src` must return nothing afterwards
  (§6B).
- No `#/` alias, no cross-repo import, no `vi.mock` of the lib or of a copy module anywhere.

---

## 5. Tests — which move, which change, which are new, and what each pins

### Moved (0)

None.

### New (2 files, 124 tests)

| Test | Count | Pins |
|---|---|---|
| N5 `lib/validate/validate.test.js` | 98 | every primitive's pass / block / message contract, the shared-default fallbacks, `compose`'s unknown-key pass-through and one-message-per-field collection; **`#requiredEmail`** (E3c): trimmed value handed back, blank/whitespace/missing → required, four malformed shapes → format, 21 `A`s → the length message (D3's rule order), the `validatorDefaults.maxLength` fallback. |
| N6 `lib/validate/calendar.test.js` | 26 | UTC day arithmetic, month-end clamping, `parseDateText` accept/reject (incl. plants' two-digit-year rejects), `formatDateText` round trip. |

### Changed in place (5)

| Test | Change | Pins |
|---|---|---|
| T1 `shared/copy.test.js` (E7) | +2 tests (`it.each` over en and cy). | every `validatorDefaults` leaf renders text in both locales, function leaves invoked. |
| T2 `services/address-book/address-book.test.js` (E19) | Replace the `#mapApiErrorsToFormErrors` describe (lines 231–251) with the two tests below. +1 test. | one message per field, the first one; a problem without field errors maps to `{}`. |
| T3 `features/address-book/fields.test.js` (E18) | Full rewrite below. Was 10 tests, now 25 (+15). | `addressRules` through the lib's own `validate`: a valid block passes and is handed back trimmed; every mandatory field blank → its `required` message; whitespace-only counts as blank; every bounded field over its cap → its `maxLength` message (email included — D3's rule order); an unlisted country → `'Enter a country'`; a malformed email → the format message; a free-string phone passes; all failures listed in form order; `FIELD_RULES` parity and `formValuesOf` unchanged. |
| T4/T5 `features/address-book/add/controller.test.js` (E20) | T4: one new test after `'POST creates address and redirects with success banner'`. T5: the existing `'POST with invalid data re-renders form with errors'` gains four assertions. +1 test. | T4: the body the API receives is exactly the nine trimmed fields — the D2 replacement for `persists-cleaned-value.test.js`. T5: the summary carries `'Enter a name'` linked to `#name` and `'Enter an email address in the correct format'` linked to `#email`, and the inline `govuk-error-message` renders. |
| T6 `features/address-book/edit/controller.test.js` (E21) | The existing `'POST with invalid data re-renders form with errors'` gains the same four assertions as T5. +0 tests. | as T5, on the edit page. |

### Unchanged but load-bearing (listed so nobody "fixes" them)

`kit.test.js` (13 — `#errorSummary` and `#fieldError` are the contract this stage now depends on), the five other
address-book `controller.test.js` files, `dashboard/controller.test.js`, `address-book/copy/copy.test.js` (it reads
`FIELDS` / `FIELD_RULES` from `fields.js` — still exported), `address-id-params.test.js`, `address-countries.test.js`,
`app/routes.test.js`, `router.test.js`, `paths.test.js`, `layout.test.js`, `errors.test.js`, `auth/controller.test.js`.
**If any of them goes red, a message or a shape drifted; fix the source, never the test** (D16).

### T2 — the replacement `#mapApiErrorsToFormErrors` describe

```js
describe('#mapApiErrorsToFormErrors', () => {
  test('Should keep the first message for each field the problem names', () => {
    expect(
      addressBook.mapApiErrorsToFormErrors({
        errors: {
          addressLine1: ['Enter address line 1'],
          email: [
            'Enter an email address in the correct format',
            'Email address must be 254 characters or fewer'
          ]
        }
      })
    ).toEqual({
      addressLine1: 'Enter address line 1',
      email: 'Enter an email address in the correct format'
    })
  })

  test('Should map a problem without field errors to no errors', () => {
    expect(addressBook.mapApiErrorsToFormErrors({})).toEqual({})
    expect(addressBook.mapApiErrorsToFormErrors(undefined)).toEqual({})
  })
})
```

### T3 — `src/server/app/features/address-book/fields.test.js` — full content

```js
import { describe, expect, test } from 'vitest'

import { validate } from '../../lib/validate/index.js'
import { FIELDS, FIELD_RULES, addressRules, formValuesOf } from './fields.js'
import { copy } from './copy/copy.en.js'

const MDM_CODES = ['GB', 'FR', 'DE']

const rules = addressRules(MDM_CODES)

const REQUIRED_FIELDS = FIELDS.filter((field) => FIELD_RULES[field].required)
const BOUNDED_FIELDS = FIELDS.filter((field) => FIELD_RULES[field].maxLength)

const validAddress = (overrides = {}) => ({
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 3',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  ...overrides
})

describe('#addressRules', () => {
  test('accepts a valid Standard Address Block and hands its values back', () => {
    const { errors, value } = validate(rules, validAddress())

    expect(errors).toBeNull()
    expect(value).toEqual(validAddress())
  })

  test.each(REQUIRED_FIELDS)(
    'refuses a blank %s with its required message',
    (field) => {
      expect(validate(rules, validAddress({ [field]: '' })).errors).toEqual({
        [field]: copy.errors[field].required
      })
    }
  )

  test('refuses a whitespace-only mandatory field as blank', () => {
    expect(validate(rules, validAddress({ name: '   ' })).errors).toEqual({
      name: copy.errors.name.required
    })
  })

  test.each(BOUNDED_FIELDS)(
    'refuses %s over its maximum length with its length message',
    (field) => {
      const max = FIELD_RULES[field].maxLength

      expect(
        validate(rules, validAddress({ [field]: 'A'.repeat(max + 1) })).errors
      ).toEqual({ [field]: copy.errors[field].maxLength(max) })
    }
  )

  test('refuses a country the reference data does not list as if blank', () => {
    expect(
      validate(rules, validAddress({ countryCode: 'ZZ' })).errors
    ).toEqual({ countryCode: copy.errors.countryCode.required })
  })

  test('refuses a malformed email address', () => {
    expect(
      validate(rules, validAddress({ email: 'not-an-email' })).errors
    ).toEqual({ email: copy.errors.email.format })
  })

  test('accepts a free-string phone number', () => {
    expect(
      validate(rules, validAddress({ phone: 'call the office' })).errors
    ).toBeNull()
  })

  test('lists every failing field in the order the form asks', () => {
    const { errors } = validate(rules, {
      ...formValuesOf(),
      email: 'bad'
    })

    expect(Object.keys(errors)).toEqual(REQUIRED_FIELDS)
    expect(errors.email).toBe(copy.errors.email.format)
  })

  test('hands back trimmed values', () => {
    const { errors, value } = validate(
      rules,
      validAddress({ name: '  Highland Livestock Ltd  ' })
    )

    expect(errors).toBeNull()
    expect(value.name).toBe('Highland Livestock Ltd')
  })
})

describe('#FIELD_RULES parity with Java Bean Validation', () => {
  test('maxLengths and mandatory flags match AddressRequest', () => {
    expect(FIELD_RULES.name).toEqual({ maxLength: 255, required: true })
    expect(FIELD_RULES.addressLine1).toEqual({ maxLength: 255, required: true })
    expect(FIELD_RULES.addressLine2).toEqual({
      maxLength: 255,
      required: false
    })
    expect(FIELD_RULES.townOrCity).toEqual({ maxLength: 100, required: true })
    expect(FIELD_RULES.county).toEqual({ maxLength: 100, required: false })
    expect(FIELD_RULES.postcode).toEqual({ maxLength: 12, required: true })
    expect(FIELD_RULES.countryCode).toEqual({ required: true })
    expect(FIELD_RULES.phone).toEqual({ maxLength: 20, required: true })
    expect(FIELD_RULES.email).toEqual({
      maxLength: 254,
      required: true,
      email: true
    })
  })
})

describe('#formValuesOf', () => {
  test('builds a blank form in the order the fields are asked', () => {
    expect(formValuesOf()).toEqual({
      name: '',
      addressLine1: '',
      addressLine2: '',
      townOrCity: '',
      county: '',
      postcode: '',
      countryCode: '',
      phone: '',
      email: ''
    })
    expect(Object.keys(formValuesOf())).toEqual(FIELDS)
  })

  test('reads the form fields from a stored address and blanks what is missing', () => {
    const address = {
      id: '665f1c2ab3e4d51a2c9d0e77',
      name: 'Highland Livestock Ltd',
      addressLine1: "14 Drover's Way",
      townOrCity: 'Inverness',
      postcode: 'IV2 3JH',
      countryCode: 'GB',
      phone: '+44 1463 234567',
      email: 'exports@example.com',
      deleted: false
    }

    expect(formValuesOf(address)).toEqual({
      name: 'Highland Livestock Ltd',
      addressLine1: "14 Drover's Way",
      addressLine2: '',
      townOrCity: 'Inverness',
      county: '',
      postcode: 'IV2 3JH',
      countryCode: 'GB',
      phone: '+44 1463 234567',
      email: 'exports@example.com'
    })
  })
})
```

(25 tests: `#addressRules` 1 + 7 + 1 + 8 + 1 + 1 + 1 + 1 + 1 = 22; `#FIELD_RULES` 1; `#formValuesOf` 2. `REQUIRED_FIELDS`
is seven fields, `BOUNDED_FIELDS` eight.) The `'lists every failing field'` test relies on `formValuesOf()` giving
every mandatory field `''` and the email `'bad'` failing on shape — seven keys, in `FIELDS` order.

### T4 — new test in `add/controller.test.js`

Insert after the `'POST creates address and redirects with success banner'` test:

```js
  test('POST sends the trimmed form fields and nothing else to the address book', async () => {
    let posted
    const scope = addressBookApi()
      .post(ADDRESSES_PATH, (body) => {
        posted = body
        return true
      })
      .reply(201, {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: 'Highland Livestock Ltd'
      })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-trimmed'),
      payload: {
        ...validPayload,
        name: '  Highland Livestock Ltd  ',
        crumb: 'not-for-the-api'
      }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(scope.isDone()).toBe(true)
    expect(posted).toEqual({
      ...validPayload,
      addressLine2: '',
      county: ''
    })
  })
```

(`validPayload` in that file has no `addressLine2` / `county`; `formValuesOf` blanks them, so the API body carries
`''` for both — today's behaviour, now pinned. `crumb` is in the payload only to prove it never reaches the API;
CSRF is disabled in this suite's `beforeEach`.)

### T5 — `add/controller.test.js`, the `'POST with invalid data re-renders form with errors'` test

After `expect(result).toContain('There is a problem')` add:

```js
    expect(result).toContain('href="#name"')
    expect(result).toContain('Enter a name')
    expect(result).toContain('href="#email"')
    expect(result).toContain('Enter an email address in the correct format')
    expect(result).toContain('govuk-error-message')
```

### T6 — `edit/controller.test.js`, the `'POST with invalid data re-renders form with errors'` test

The same five lines as T5 after its `expect(result).toContain('There is a problem')`.

### Arithmetic

Files: 56 + 2 (N5, N6) = **58**. Tests: 324 + 98 (N5) + 26 (N6) + 2 (T1) + 1 (T2) + 15 (T3: 25 − 10) + 1 (T4) =
**467**. Expected ladder line: `Test Files 58 passed (58)` / `Tests 467 passed (467)`. N5's count is plants' 90 plus
E3c's 8 — if the number differs by a handful, count `it.each` expansions (N5 has fourteen `it.each` blocks) before
assuming a test is missing; if a test is red, read the log once and fix the source (D16).

Playwright: **49/49**, no spec changes. `fit/address-form.js` is the browser-level proof: `requiredValidations` (seven
messages) and `maxLengthValidations` (eight, the email row posting 255 characters) each follow the summary link and
assert focus lands on the field with the typed value intact; `add.fit.spec.js` and `edit.fit.spec.js` add the
malformed-email case. `expectErrorFocusOn` finds the link by its text inside `role="alert"` — which is why `errors` +
`kit.errorSummary` must keep producing `{ text, href: '#field' }` (kit.test.js pins that shape).

---

## 6. Invariants to prove — and the check that proves each held

Run each check as one Bash call; redirect anything long to
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/s08-validation-<name>.log` and Read it once.

**A. Ladder (invariant 3).** In order, each to a log file:
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend run format` (once, D18), then
`run format:check`, `run lint`, `run test` (expect 58 files / 467 tests), `run test:fit` (expect 49 passed). For a
Playwright red, read `test-results/*/error-context.md` in the repo.

**B. No stale name (invariant 7).**
`grep -rn "buildAddressSchema\|formatValidationErrors\|fieldErrors\|fieldNameOf\|crumbSchema\|fromList" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
→ nothing.

**C. Route surface (invariant 1).** `app/routes.test.js`, `router.test.js` and `paths.test.js` are unchanged and
green (A). Nothing in this stage touches a route or a path builder;
`grep -rn "path: '" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src` returns the same
chassis-only set as s07's closing note.

**D. Every user-facing string lives in copy (invariant 5).**
`grep -rn "Enter a\|characters or fewer\|correct format\|from the list" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app`
→ hits only under `*/copy/copy.en.js`, `shared/copy.en.js`, `*.test.js` and `fit/*.js`. Any hit in `fields.js`, a
controller, a template or the lib is a string left behind (the lib carries no English of its own — its defaults come
from `shared/copy.en.js`). The two guard suites (E8, E9) now cover `validatorDefaults` and run in A.

**E. Joi is gone from features and from `package.json` (the brief).**
1. `grep -rn "from 'joi'" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src` → exactly two
   lines: `src/server/app/lib/validate/validators.js:1` and `src/server/app/features/address-book/address-id-params.js:2`.
2. `grep -n "\"joi\"" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/package.json` → nothing.
3. `grep -n "\"joi\": \"^17.13.3\"" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/package-lock.json`
   → nothing (the root block's line is gone), and
   `grep -n "\"node_modules/joi\"" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/package-lock.json`
   → one hit (the hoisted 17.13.4 block survives via `@hapi/bell` and `@hapi/catbox-redis`).
4. `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend diff --stat -- package-lock.json`
   → a handful of lines, all removals of the root `joi` requirement. Anything larger: see D12's fallback.

**F. Behaviour preserved (invariant 2).** The unchanged controller/fit tests listed in §5 are the proof, plus
`git -C … diff --cached --stat` lists exactly the paths in §1–§3 (6 new, 19 modified, 0 deleted/renamed) and nothing
under `src/config/`, `src/plugins/`, `src/server/common/`, `src/server/auth/`, `src/server/app/shared/` except
`copy.en.js`, `copy.cy.js`, `copy.test.js`, or `src/server/app/features/dashboard/`. The named changes are in §8.

**G. The lib is plants' (D2).**
`diff ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/lib/validate/run.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/lib/validate/run.js`
→ no output; the same for `calendar.js` and `calendar.test.js`. For `validators.js` the diff is E1's block alone; for
`index.js` one added line; for `validate.test.js` E3's three hunks alone. (Run `format` before diffing — plants' files
are prettier-clean under the same config, so `format` should not touch them; if it does, the diff shows what and the
stage note records it.)

**H. No cross-repo import, no `#/` alias (invariant 4 / s02).**
`grep -rn "from '.*trade-imports-\(animals\|plants\)\|from '#/\|test/fixtures" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src`
→ nothing.

**I. Comments (invariant 6).** The only comments added are plants' own in the six lib files, `requiredEmail`'s doc
block (E1), `addressRules`'s doc block (E10) and the `validatorDefaults` doc block (E5, plants'). One comment is
edited (E15a). `grep -rn "renamed\|moved from\|previously\|used to be\|joi" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features`
→ nothing.

**J. Templates read `errors`, never `fieldErrors` (D13).**
`grep -rn "errorMessage:" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features`
→ eighteen lines (nine per form template), every one of the shape `errors.<field> and { text: errors.<field> }`;
`grep -rn "error-summary.njk" …/src/server/app/features` → two hits (add and edit templates).

---

## 7. Out of scope — leave alone even though it is tempting

- **The page-level `errorList` blocks** in `list/template.njk`, `dashboard/template.njk`, and the ones kept in
  `add/template.njk` / `edit/template.njk`, together with their `errorList: [{ text: … }]` producers — D6; s09 brings
  plants' `recoverableError` banner and retires them.
- **Where the summary sits and the `Error: ` title prefix** — D15; s09.
- **`kit.js`** — `errorSummary` and `fieldError` are already plants'; do not remove `fieldError` (D5) and do not add a
  no-href variant for page-level failures (D6).
- **`address-id-params.js`** and its Joi (D11); `hapi.md` §3 keeps route parameters on Joi.
- **Declaring `joi` explicitly** in `package.json` to make the lib's import honest — a three-repo decision for s12
  (D1). Do not add it back; do not touch the journeys' `package.json`.
- **`validatorDefaults` beyond plants' nine keys** — no `email` default (D10); no pruning of the keys ins's form does
  not reach (`postcode`, `vehicleReg`, `ukPhone`, `date`, `time`, `wholeNumber`, `oneOf`, `numberBetween`): the lib
  is a verbatim port and its defaults travel with it.
- **`persists-cleaned-value.test.js`** and anything under `engine/`, `flow/`, `sets/` — journey-only (D2).
- **`pattern()`**, `postcode()`, `ukPhone()` for the address form — the brief's `pattern()` for the email cannot work
  (D3) and the postcode field is deliberately a free-text "Postcode or Zip code" (international addresses); the phone
  is free text (`fields.test.js` pins `'call the office'` passing).
- **The stub address book** (`services/address-book/stub.js`), the countries service and its stub, the fit specs and
  `fit/address-form.js` — no change is needed; if a fit spec goes red the source is wrong.
- **`src/server/common/README.md`**, `README.md`, `app/docs/` (s11), `sonar-project.properties`, CI workflows.
- Any comment tidy-up, identifier rename, import reordering or blank-line change beyond §1–§3.

---

## 8. Behaviour changes (named, per invariant 2)

1. **A country code outside the reference-data list is refused with `'Enter a country'`** instead of
   `'Select a country from the list'`; that second message is deleted from both copy modules (D4). Reachable only by
   tampering with the select — the form never offers an unlisted code.
2. **The error summary shows one message per field.** Today a field failing two rules (an email that is both
   over-long and malformed) or an API problem carrying two messages for one field lists both; now the first wins — the
   length message for the lib's own checks (D3), the API's first message for a 400 (D7). The fit specs' expectations
   (`'Email address must be 254 characters or fewer'` for 255 characters) are the ones that render.
3. **The view model of add and edit** carries `errors` (`{ field: message }`) and `errorSummary` instead of
   `fieldErrors` (`{ field: { text } }`) and — for field errors — `errorList`. `errorList` survives only for the four
   page-level failures (D6). The rendered HTML for a validation refusal is the govuk error summary and inline messages
   it is today, from the same anchors.
4. **`mapApiErrorsToFormErrors` returns `{ field: message }`** (D7) — an internal signature, consumed by the two
   controllers only.
5. **`joi` is no longer a declared dependency.** It is still installed (hoisted for `@hapi/bell` /
   `@hapi/catbox-redis`, 17.13.4, unchanged in the lockfile) and still imported by `lib/validate/validators.js` and
   `address-id-params.js` (D1, D11).

Nothing a trader can see changes on a well-formed submission, on a blank or over-long field, on a malformed email, or
on any of the fifteen messages the fit specs drive.

---

## 9. Commit

Stage the work (`git -C … add -A`); do not commit — the reviewer/orchestrator commits with the programme's message
shape (`refactor(alignment): s08-validation — replace joi with app/lib/validate`) plus the required trailers. Do not
push to `main`; do not merge.
