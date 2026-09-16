# s21 — the journeys' feature-folder convention, and self-contained fit specs

Questions 14 and 15, landing as **one commit per repo** on
`feat/NO_JIRA-frontend-alignment`. Two repos change: **ins** and **animals**.
**Plants changes nothing** — it is the reference.

Sam's ruling, 16 September 2026:

> Q14 go with the journey convention, `page.controller.js`; the journeys have a
> better approach to tests, especially the fit tests. Q15 the feature folder
> should be self-contained with its associated fit tests. The two journeys
> already agree on the convention (the report's two-against-one count for
> `controller.js` was wrong: ins is the odd one out); they differ only in two
> details, settled below by the direction rule.

## Repos and their two path spellings

| Key | Bash path (tilde — a literal `/Users/...` in Bash is DENIED) | Read/Write/Edit path (absolute) |
| --- | --- | --- |
| ins | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |
| animals | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| plants (read only) | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| workspace | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

Both changing checkouts are on `feat/NO_JIRA-frontend-alignment` with clean
working trees. Logs go to
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`
and are read **once** with the Read tool.

Throughout this plan, paths inside a repo are written relative to the repo root.
Two roots recur and are abbreviated:

- **INSFEAT** = `src/server/app/features`
- **ANFEAT** = `src/server/app/sets/live-animals/journeys/linear/features`
- **PLFEAT** = `src/server/app/sets/high-risk-plants/journeys/linear/features`
  (plants, read only)

### Baseline, captured before planning — every ladder rung green

| Repo | format:check | lint | test | test:fit |
| --- | --- | --- | --- | --- |
| ins | 0, "All matched files use Prettier code style!" | 0, "no dependency violations found (57 modules, 140 dependencies cruised)" | 0, 61 files / **595 tests** passed, 94.23% statements | 0, **50 passed** (1 smoke + 49 features) in 7.7s |
| animals | 0, "All matched files use Prettier code style!" | 0, "no dependency violations found (504 modules, 1610 dependencies cruised)", 3 known violations ignored | 0, 183 passed + 2 skipped files, **2350 passed + 8 skipped** | 0, **447 passed** in 2.4m |

Logs: `s21-feature-folder-convention-baseline-<repo>-<script>.log` in the logs
directory. **These are the numbers the stage must still meet or beat.** The fit
counts move by design — see §5.

---

## 0. Decisions

Everything the brief left open is settled here. **Do not re-open any of it, do
not invent a variant, and do not widen the change.**

### D1 — the convention, stated once

A **single-page feature** folder holds `controller.js`, `template.njk`,
`controller.test.js`, `copy/`, `page.js` where the journey needs one, and its
browser spec **beside them** as `<feature>.fit.spec.js`. There is no `fit/`
folder.

A **multi-page group** folder holds one folder per page, named
`<page>/<page>.controller.js` with `<page>.controller.test.js` and
`template.njk` beside them; group-wide modules and `copy/` sit at the group
root; every browser spec and browser helper for the group sits in
`<group>/fit/`, with a shared `<group>/fit/axe.js`.

Both journeys already hold to this. ins is the odd one out on both points and
moves.

### D2 — `template.njk` wins inside a group; animals renames

plants names a group page's template `template.njk`
(`PLFEAT/commodities/list/template.njk`); ins already does the same
(`INSFEAT/address-book/list/template.njk`); animals names it `<page>.njk`
(`ANFEAT/commodities/search/search.njk`). Two against one, and the direction
rule prefers plants. **Animals renames all eleven group page templates to
`template.njk`** and follows every render path. Partials keep their
underscore-prefixed names (`_selected-commodities-table.njk` and friends) —
they are includes, not page templates, and no rule in the ruling touches them.

### D3 — every group gains `fit/axe.js`; animals' group specs route through it

The ruling says animals' group specs "run no accessibility check at all". As
measured on 16 September that is not quite what is on disk: ten of the eleven
animals group specs already run an axe check, each from its **own inline
`AxeBuilder` block or a private local helper**, and the eleventh
(`ANFEAT/documents/fit/scan-status.fit.spec.js`) runs none. The difference the
ruling is actually naming is therefore the **shared helper**, not the presence
of a check.

The ruling's instruction stands unchanged and is carried out literally: **every
group gains `fit/axe.js` and every group spec runs a check through it.** In
practice that means, per group:

1. add `<group>/fit/axe.js`;
2. delete the spec's inline block or private helper and its
   `import AxeBuilder from '@axe-core/playwright'`;
3. call the shared helper instead;
4. give `scan-status.fit.spec.js`, which has no check today, one.

### D4 — the helper is `PLFEAT/commodities/fit/axe.js`, copied verbatim, per group

`ANFEAT/{transport,commodities,addresses,documents}/fit/axe.js` are **four
byte-identical copies** of `PLFEAT/commodities/fit/axe.js`, comment and all.
Feature folders are independent by design (workspace rule
`feedback_feature_folders_independent_by_design`): a helper four features need
is duplicated, never extracted. The same file, with the same exported name,
becomes `INSFEAT/address-book/fit/axe.js`.

### D5 — the exported name is `expectNoSeriousOrCriticalViolations`

plants' name wins over ins's `expectNoSeriousOrCriticalAxeViolations` (the
direction rule; and "axe" is already said by the module name). Every call site
in both repos is renamed.

### D6 — the tag list: plants' five tags, in both repos

plants' helper checks `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`
and carries a written justification: axe-core tags a rule by the WCAG version
that introduced it, so a rule reachable only through the 2.1 or 2.2 tags never
runs on the two WCAG 2.0 tags alone. ins already runs those five. Animals'
group specs run two today, so **routing them through the copied helper widens
their tag list**.

That is the decision: **copy the helper verbatim, five tags, in both repos.**
Reasons: the direction rule says prefer plants' shape and this is the shape,
comment included; ins is already green on five tags over the same govuk-frontend
components; plants is green on five tags over a commodity table with Change and
Remove links and a paginated picker, which is the closest analogue to animals'
richest group pages; and narrowing the copied helper would import the very
inconsistency this stage exists to remove.

**If a widened-tag violation turns a group spec red**, it is a real
accessibility defect, not a test problem. Fix it in that group's own
`template.njk` with govuk-frontend markup only — no copy change, no new
component, nothing outside the group folder — and record the rule id, the page
and the fix in the stage notes as the stage's markup change. Do not narrow the
tag list, do not add an axe `disableRules`, do not skip or `fixme` a test.

Animals' **single-page** specs keep their own inline two-tag blocks. They are
not group specs, the ruling does not reach them, and plants' single-page specs
(`PLFEAT/dashboard/dashboard.fit.spec.js` and the rest) inline two tags in
exactly the same way. Reproducing plants includes reproducing this.

### D7 — ins's dashboard is single-page, so its spec sits beside the controller and inlines its own axe helper

`INSFEAT/dashboard/fit/dashboard.fit.spec.js` becomes
`INSFEAT/dashboard/dashboard.fit.spec.js`; the now-empty `dashboard/fit/`
disappears. It stops importing
`INSFEAT/address-book/fit/address-form.js` and defines its own
`expectNoSeriousOrCriticalViolations` **inline at the top of the spec**, exactly
as plants' single-page specs do, keeping the five tags it runs today. A
single-page feature gets no `fit/` folder and therefore no `axe.js` module — the
helper lives in the one spec that uses it.

### D8 — single-page controllers keep the plain name

The ruling names `<page>.controller.js` only for a page **inside a group**. A
single-page feature's controller stays `controller.js` in all three repos, so
`INSFEAT/dashboard/controller.js` does not move and neither does any animals or
plants single-page controller.

### D9 — the Playwright configuration needs no change

All three configs already declare a `features` project whose `testDir` is the
features root and whose `testMatch` is `**/*.fit.spec.js` — a recursive glob
that matches a spec beside a controller and a spec inside `<group>/fit/`
equally. Verify it (§6, I4); do not edit it.

### D10 — the dependency-cruiser configuration is not touched this stage

ins's `.dependency-cruiser.cjs` excludes `\.fit\.spec\.js$` and `/fit/`, so its
`feature-isolation` rule cannot see the cross-feature import this stage removes;
both journeys cruise their fit specs. Aligning ins's exclude list would be the
tidier end state, but it is a lint-policy change the brief does not ask for and
it re-baselines `lint:arch` across files this stage does not touch. Keep the
config as it is, prove the boundary with the grep in §6 (I2), and leave the
alignment recorded as an open question on the stage.

### D11 — the recipe docs move with the convention

Both repos document the convention this stage changes, in files the
`frontend-change` skill reads as scripts. Documentation that now describes the
old shape, or links to a renamed file, is part of the rename and is corrected
(§2). No other doc prose changes.

### D12 — two animals oddities stay as they are

`ANFEAT/addresses/address-return/` is a page folder inside a group holding a
plain `controller.js`/`controller.test.js`, and `ANFEAT/documents/` is a
single-page feature whose four specs live in a `fit/` folder. Both sit outside
the two details the brief says animals changes ("Animals changes only in the two
details"). Leave both alone and record each as an open question on the stage.

---

## 1. Moves

Use `git mv` for every row, one command per Bash call, so history follows.

### 1a. ins — address-book group page controllers and their tests

| From | To |
| --- | --- |
| `INSFEAT/address-book/list/controller.js` | `INSFEAT/address-book/list/list.controller.js` |
| `INSFEAT/address-book/list/controller.test.js` | `INSFEAT/address-book/list/list.controller.test.js` |
| `INSFEAT/address-book/add/controller.js` | `INSFEAT/address-book/add/add.controller.js` |
| `INSFEAT/address-book/add/controller.test.js` | `INSFEAT/address-book/add/add.controller.test.js` |
| `INSFEAT/address-book/edit/controller.js` | `INSFEAT/address-book/edit/edit.controller.js` |
| `INSFEAT/address-book/edit/controller.test.js` | `INSFEAT/address-book/edit/edit.controller.test.js` |
| `INSFEAT/address-book/view/controller.js` | `INSFEAT/address-book/view/view.controller.js` |
| `INSFEAT/address-book/view/controller.test.js` | `INSFEAT/address-book/view/view.controller.test.js` |
| `INSFEAT/address-book/delete/controller.js` | `INSFEAT/address-book/delete/delete.controller.js` |
| `INSFEAT/address-book/delete/controller.test.js` | `INSFEAT/address-book/delete/delete.controller.test.js` |

The five `template.njk` files do **not** move. Neither does anything at the
group root (`fields.js`, `address-countries.js`, `address-id-params.js`,
`stored-address.js`, `success-banner.js`, `journey-registry.js`,
`handshake-context.js`, `copy/`, `view-model/`) nor the `fit/` fixtures
`address-form.js` and `seed-address.js`.

### 1b. ins — the dashboard spec comes out of `fit/`

| From | To |
| --- | --- |
| `INSFEAT/dashboard/fit/dashboard.fit.spec.js` | `INSFEAT/dashboard/dashboard.fit.spec.js` |

`INSFEAT/dashboard/fit/` is then empty and git removes it. `dashboard/controller.js`,
`dashboard/controller.test.js`, `dashboard/template.njk`, `dashboard/copy/` and
`dashboard/view-model/` all stay put (D8).

### 1c. animals — group page templates

| From | To |
| --- | --- |
| `ANFEAT/transport/transporters/transporters.njk` | `ANFEAT/transport/transporters/template.njk` |
| `ANFEAT/transport/private-transporter-details/private-transporter-details.njk` | `ANFEAT/transport/private-transporter-details/template.njk` |
| `ANFEAT/transport/transporters-select/transporters-select.njk` | `ANFEAT/transport/transporters-select/template.njk` |
| `ANFEAT/transport/commercial-transporter-details/commercial-transporter-details.njk` | `ANFEAT/transport/commercial-transporter-details/template.njk` |
| `ANFEAT/transport/transporter-add/transporter-add.njk` | `ANFEAT/transport/transporter-add/template.njk` |
| `ANFEAT/transport/transit-countries/transit-countries.njk` | `ANFEAT/transport/transit-countries/template.njk` |
| `ANFEAT/transport/port-of-entry/port-of-entry.njk` | `ANFEAT/transport/port-of-entry/template.njk` |
| `ANFEAT/commodities/consignment-details/consignment-details.njk` | `ANFEAT/commodities/consignment-details/template.njk` |
| `ANFEAT/commodities/animal-identification/animal-identification.njk` | `ANFEAT/commodities/animal-identification/template.njk` |
| `ANFEAT/commodities/search/search.njk` | `ANFEAT/commodities/search/template.njk` |
| `ANFEAT/addresses/party-picker/party-picker.njk` | `ANFEAT/addresses/party-picker/template.njk` |

Eleven, no more. Every underscore-prefixed partial in those same folders
(`_added-countries-table.njk`, `_selected-commodities-table.njk`,
`_species-quantities.njk`, `_identification-card.njk`,
`_selected-commodities-summary.njk`, `_saved-animals-table.njk`,
`_address-picker.njk`) stays exactly as it is. `ANFEAT/addresses/template.njk`
and `ANFEAT/documents/template.njk` are already correctly named.

Animals **controller** files do not move — they are already
`<page>.controller.js`. No animals spec moves.

### 1d. Deletions

None. Nothing is deleted outright; the two emptied folders
(`INSFEAT/dashboard/fit/`) go because their only file moved.

---

## 2. Edits

### 2a. ins — `INSFEAT/index.js`

Repoint all five address-book imports. The dashboard import is unchanged.
Result, in full:

```js
import * as dashboard from './dashboard/controller.js'
import * as addressBookList from './address-book/list/list.controller.js'
import * as addressBookAdd from './address-book/add/add.controller.js'
import * as addressBookView from './address-book/view/view.controller.js'
import * as addressBookEdit from './address-book/edit/edit.controller.js'
import * as addressBookDelete from './address-book/delete/delete.controller.js'
```

The `allRoutes` array below is untouched. This barrel is the **only** module
that imports those controllers — `routes.js` imports `allRoutes`, and
`routes.test.js` imports `allRoutes` and `address-id-params.js`. Nothing else
needs repointing.

### 2b. ins — the five moved controllers and their five tests

Their **contents do not change**. In particular `const view = 'address-book/list/template'`
and its four siblings stay exactly as they are: the templates keep their names,
so the Nunjucks view paths keep theirs. Each moved `*.controller.test.js`
imports its subject with a relative `./controller.js`; change that one specifier
to `./list.controller.js` (respectively `./add.controller.js`,
`./edit.controller.js`, `./view.controller.js`, `./delete.controller.js`). Every
other import in those tests is unchanged — the file did not change directory.

### 2c. ins — new `INSFEAT/address-book/fit/axe.js`, and `address-form.js` gives up its axe duty

`address-form.js` currently owns the axe helper alongside the address-form
fixtures. Move that responsibility out (new file in §3). From `address-form.js`
delete, and nothing else:

- the first line, `import AxeBuilder from '@axe-core/playwright'`
- the `AXE_VIOLATIONS_INDENT` constant
- the whole `expectNoSeriousOrCriticalAxeViolations` function

Keep `import { expect } from '@playwright/test'` — `expectErrorFocusOn` still
uses it. Keep every other export (`NAME_LABEL`, `fieldLabels`, `validAddress`,
`setFieldValue`, `fillValidAddress`, `errorLink`, `expectErrorFocusOn`,
`requiredValidations`, `maxLengthValidations`) and the file's opening comment
untouched.

### 2d. ins — the five address-book fit specs

In each of `INSFEAT/address-book/fit/{add,edit,list,view,delete}.fit.spec.js`:

- drop `expectNoSeriousOrCriticalAxeViolations` from the `'./address-form.js'`
  import (in `list`, `view` and `delete` that import names only this symbol, so
  the whole import line goes);
- add `import { expectNoSeriousOrCriticalViolations } from './axe.js'`, placed
  to keep the existing import order and Prettier-clean;
- rename every call site — six in total across the five files
  (`add` ×2, `edit` ×2, `list` ×1, `view` ×1, `delete` ×1). The arguments are
  unchanged: `(page, 'Add address')`, `(page, 'Edit address')`,
  `(page, 'Address book list')`, `(page, 'Address details')`,
  `(page, 'Delete address')` and the two validation-state subjects already
  written there.

No test name, no assertion, no seed id changes.

### 2e. ins — `fit/smoke.fit.spec.js` (repo root)

The smoke spec takes `expectNoSeriousOrCriticalAxeViolations`,
`fillValidAddress` and `validAddress` from `address-form.js`. Split that: keep
`fillValidAddress` and `validAddress` where they are, and take the axe helper
from the new module.

```js
import { expectNoSeriousOrCriticalViolations } from '../src/server/app/features/address-book/fit/axe.js'
import {
  fillValidAddress,
  validAddress
} from '../src/server/app/features/address-book/fit/address-form.js'
```

Rename the one call site. The spec is not a feature, so it is free to reach into
a feature's `fit/` — that is how plants' `fit/journey-smoke.fit.spec.js` reads
feature copy too.

### 2f. ins — `INSFEAT/dashboard/dashboard.fit.spec.js` (after the move)

Three edits, no behaviour change:

1. **Drop the cross-feature import.** Delete
   `import { expectNoSeriousOrCriticalAxeViolations } from '../../address-book/fit/address-form.js'`.
2. **Fix the `signIn` depth.** The spec rose one level, so
   `'../../../../../../fit/sign-in.js'` becomes `'../../../../../fit/sign-in.js'`
   (features/dashboard → features → app → server → src → repo root).
3. **Give the feature its own helper, inline.** Add
   `import AxeBuilder from '@axe-core/playwright'` at the top and, between the
   imports and the first `test.describe`, the helper in plants' single-page
   shape — `PLFEAT/dashboard/dashboard.fit.spec.js` lines 39–51 is the model —
   named `expectNoSeriousOrCriticalViolations`, keeping the **five** tags ins
   runs today so the check is unchanged:

   ```js
   const expectNoSeriousOrCriticalViolations = async (page, subject) => {
     const results = await new AxeBuilder({ page })
       .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
       .analyze()
     const seriousOrCritical = results.violations.filter(({ impact }) =>
       ['serious', 'critical'].includes(impact)
     )

     expect(
       seriousOrCritical,
       `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
     ).toEqual([])
   }
   ```

   Rename the one call site from
   `expectNoSeriousOrCriticalAxeViolations(page, 'dashboard')` to
   `expectNoSeriousOrCriticalViolations(page, 'dashboard')`.

The magic number `2` in `JSON.stringify` is what plants writes in its
single-page specs; do not introduce a constant that plants does not have.

### 2g. animals — the eleven group controllers

One line each: the `const view` template literal's last segment becomes
`template`. For example, in
`ANFEAT/commodities/search/search.controller.js`:

```js
const view = `${TEMPLATES}/features/commodities/search/search`
```

becomes

```js
const view = `${TEMPLATES}/features/commodities/search/template`
```

Apply the same single-segment change to all eleven, matching §1c row for row:

| Controller | New `view` tail |
| --- | --- |
| `ANFEAT/transport/transporters/transporters.controller.js` | `/features/transport/transporters/template` |
| `ANFEAT/transport/private-transporter-details/private-transporter-details.controller.js` | `/features/transport/private-transporter-details/template` |
| `ANFEAT/transport/transporters-select/transporters-select.controller.js` | `/features/transport/transporters-select/template` |
| `ANFEAT/transport/commercial-transporter-details/commercial-transporter-details.controller.js` | `/features/transport/commercial-transporter-details/template` |
| `ANFEAT/transport/transporter-add/transporter-add.controller.js` | `/features/transport/transporter-add/template` |
| `ANFEAT/transport/transit-countries/transit-countries.controller.js` | `/features/transport/transit-countries/template` |
| `ANFEAT/transport/port-of-entry/port-of-entry.controller.js` | `/features/transport/port-of-entry/template` |
| `ANFEAT/commodities/consignment-details/consignment-details.controller.js` | `/features/commodities/consignment-details/template` |
| `ANFEAT/commodities/animal-identification/animal-identification.controller.js` | `/features/commodities/animal-identification/template` |
| `ANFEAT/commodities/search/search.controller.js` | `/features/commodities/search/template` |
| `ANFEAT/addresses/party-picker/party-picker.controller.js` | `/features/addresses/party-picker/template` |

Nothing else in those controllers changes. Their **module** names are already
`<page>.controller.js` and stay; the eleven imports of them in
`src/server/app/contract.test.js` and
`src/server/app/sets/live-animals/journeys/linear/flow/opening-run.test.js` are
therefore untouched.

### 2h. animals — the eleven group fit specs

For each spec in the table below:

- delete `import AxeBuilder from '@axe-core/playwright'`;
- delete the spec's private axe helper (`expectNoSeriousAxeViolations`,
  `expectNoSeriousOrCriticalViolations` or whatever it is called locally) or, in
  the specs that inline the block inside the test body, delete the inline block;
- add `import { expectNoSeriousOrCriticalViolations } from './axe.js'`;
- call the shared helper with `(page, '<subject>')`, reusing the subject string
  the deleted code already passed or, for an inlined block, the phrase already
  in its failure message (for example
  `'Expanded document guidance'` in `guidance.fit.spec.js`).

| Spec | Today |
| --- | --- |
| `ANFEAT/transport/fit/arrival-transit.fit.spec.js` | private helper |
| `ANFEAT/transport/fit/transporters.fit.spec.js` | private helper, called from two tests |
| `ANFEAT/transport/fit/commercial-transporter-details.fit.spec.js` | private helper |
| `ANFEAT/commodities/fit/search.fit.spec.js` | inline block |
| `ANFEAT/commodities/fit/consignment-details.fit.spec.js` | inline block |
| `ANFEAT/commodities/fit/identification.fit.spec.js` | private helper |
| `ANFEAT/addresses/fit/hub-picker.fit.spec.js` | private helper |
| `ANFEAT/documents/fit/drop-zone.fit.spec.js` | inline block |
| `ANFEAT/documents/fit/guidance.fit.spec.js` | inline block |
| `ANFEAT/documents/fit/upload.fit.spec.js` | private helper |
| `ANFEAT/documents/fit/scan-status.fit.spec.js` | **no check** — gains one, see §5 |

Where deleting the helper leaves `expect` unused, drop it from the
`@playwright/test` import; where the spec still asserts with `expect`
elsewhere — it will — keep it. Let `npm run lint:js` decide, not guesswork.

### 2i. ins docs — `src/server/app/docs/`

`architecture.md`

- Under **How this differs from the journey frontends**, delete the bullet
  `- page controllers are named `controller.js`, not `<page>.controller.js`.`
  The difference is gone: group pages now carry the page prefix and single-page
  features carry the plain name in all three repos.
- Rewrite the browser-tests bullet (currently "browser tests share one fit
  fixture ([`address-form.js`](…)) rather than each spec building its own axe
  call from scratch") so it names `address-form.js` as the **address-form**
  fixture only. The axe clause is no longer a difference — plants keeps its axe
  helper in a group `fit/axe.js` too — so the sentence must stop claiming it is.
- Leave the `Enforced boundaries` section, including the sentence about fit
  specs being excluded from Dependency Cruiser, exactly as it is (D10).

`features.md`

- The `dashboard/` paragraph: `fit/dashboard.fit.spec.js` becomes
  `dashboard.fit.spec.js`, and say it sits beside the controller.
- The `address-book/` paragraph: each page folder holds
  `<page>.controller.js`, `template.njk` and `<page>.controller.test.js`.
- The closing line of that section: `fit/` holds five specs plus the fixtures
  `address-form.js`, `axe.js` and `seed-address.js`.
- The `add/controller.js` link becomes `add/add.controller.js`.
- The later line "specs are `*.fit.spec.js` in the feature's `fit/` folder"
  becomes: a group's specs live in the group's `fit/`; a single-page feature's
  spec sits beside its controller.

`testing.md`

- The `add/controller.test.js` link becomes `add/add.controller.test.js`.
- The helper list: `address-form.js` no longer offers
  `expectNoSeriousOrCriticalAxeViolations` — remove it from that sentence and
  add `axe.js` as the address-book group's shared axe helper, named
  `expectNoSeriousOrCriticalViolations`.
- The `features` project still runs six specs; the count does not change.

`add-a-page.md`

- The "Read these files first" links `features/address-book/add/controller.js`
  and `…/controller.test.js` become `add/add.controller.js` and
  `add/add.controller.test.js`; add
  `features/address-book/fit/axe.js` to that list.
- The new-feature tree: the `fit/` branch goes, and `<name>.fit.spec.js` sits at
  the top level of the folder beside `controller.js`.
- The paragraph after it: a page joining `address-book` creates
  `features/address-book/<page>/` with `<page>.controller.js`, `template.njk`
  and `<page>.controller.test.js`; its spec goes in the group's `fit/` and its
  strings in the group's `copy/`.
- "Write `controller.test.js` in the shape of [`add/controller.test.js`](…)"
  becomes `add/add.controller.test.js`.
- "Add `features/<name>/fit/<name>.fit.spec.js`, or a spec in the group's
  `fit/`" becomes: add `features/<name>/<name>.fit.spec.js` beside the
  controller, or, for a page joining a group, a spec in the group's `fit/`.

### 2j. animals docs — `src/server/app/sets/live-animals/docs/add-a-section.md`

- The "Read these files first" link
  `journeys/linear/features/transport/port-of-entry/port-of-entry.njk` becomes
  `…/port-of-entry/template.njk`.
- The group tree: add `│   ├── axe.js` as the first entry under `fit/`, and
  change both `<first-page>.njk` and `<second-page>.njk` to `template.njk`. The
  result should read exactly like plants'
  `src/server/app/sets/high-risk-plants/docs/add-a-section.md` group tree
  (its lines 106–124), with the group's own page names.
- The **Accessibility test** section: replace the two-tag instruction and the
  `arrival-transit.fit.spec.js` pointer with plants' wording — do not spell the
  tag list out in each spec, put it in one helper the whole group calls; name
  `journeys/linear/features/transport/fit/axe.js` as that helper and
  `arrival-transit.fit.spec.js` and `transporters.fit.spec.js` as callers; state
  the five tags and why. plants'
  `docs/add-a-section.md` lines 352–376 is the model; adapt only the file paths
  and the group name.
- Leave `add-a-field.md`, `add-a-page.md`, `add-a-collection.md`,
  `features.md`, `journey-flow-and-gates.md` and `testing.md` alone: none of
  them names a renamed file or the old group template convention, and the two
  `AxeBuilder …withTags(['wcag2a', 'wcag2aa'])` sentences in `add-a-field.md`
  and `add-a-page.md` remain true of single-page features, which is what those
  two recipes are for.

---

## 3. New files

Five in total; four in animals, one in ins. All five are copies of one plants
file.

### 3a. `INSFEAT/address-book/fit/axe.js`

A verbatim copy of
`PLFEAT/commodities/fit/axe.js` (34 lines; read it in full before copying).
Do not retype it — copy it, comment and JSDoc included, and change nothing. It
already says what this file is for: "The multi-page group's shared axe helper:
each of its pages is checked on its initial render and again in its
validation-error state, and a helper keeps the tag list and the impact threshold
identical across every one of those checks." That is exactly true of the
address-book group.

### 3b–3e. `ANFEAT/{transport,commodities,addresses,documents}/fit/axe.js`

Four more verbatim copies of the same file. Byte-identical to each other and to
3a. **Do not** create one shared module and import it four times, and do not
place it anywhere above a group folder — feature folders are independent by
design and the duplication is the point (D4).

`documents/` is a single-page feature whose four specs happen to live in a
`fit/` folder (D12); it is treated as a group here because the brief names it
one, and it gets its copy like the other three.

No other new file. No new npm script, no config file, no README.

---

## 4. Imports

The rule for every import this stage disturbs:

1. **A moved module is imported by its new basename, from the same relative
   directory.** `./controller.js` → `./list.controller.js` inside
   `INSFEAT/address-book/list/`, and `'./address-book/list/controller.js'` →
   `'./address-book/list/list.controller.js'` in `INSFEAT/index.js`. No `../`
   count changes for any ins controller or controller test, because none of them
   changed directory.
2. **One file changes depth: `INSFEAT/dashboard/dashboard.fit.spec.js`.** It
   rose one level out of `fit/`, so every `../`-prefixed specifier in it loses
   one segment. Today it has exactly one such import (`fit/sign-in.js`) plus the
   cross-feature import that is being deleted, so this is a single edit — but
   re-read the file after the move and check every specifier rather than
   trusting that count.
3. **The axe helper is always imported from the feature's own folder.**
   `'./axe.js'` from a spec inside `<group>/fit/`; the full relative path from
   the repo-root smoke spec. A spec must never import a helper from a sibling
   feature — that is the rule this stage exists to restore.
4. **Nunjucks view strings are not imports and are not touched in ins.** In
   animals they change only in the eleven `const view` lines of §2g, and only in
   the last path segment. A Nunjucks `{% extends %}`/`{% include %}` resolves
   from the `src/server/app` root; no template includes a renamed page template
   (proved by grep — see §6, I3), so no `.njk` file changes.
5. **Nothing new crosses a repo.** No cross-repo import, no new shared package.

---

## 5. Tests

### Moved

| Test | From → To | Why |
| --- | --- | --- |
| ins address-book page controller tests ×5 | `<page>/controller.test.js` → `<page>/<page>.controller.test.js` | the convention; one import specifier each |
| ins dashboard fit spec | `dashboard/fit/dashboard.fit.spec.js` → `dashboard/dashboard.fit.spec.js` | single-page features keep their spec beside the controller |

Neither move changes what a test asserts.

### Changed

- **ins, five address-book fit specs** — the axe helper arrives from `./axe.js`
  under its new name. Same tags, same impact threshold, same subjects: the six
  axe assertions pin exactly what they pinned before.
- **ins, `fit/smoke.fit.spec.js`** — same, for its one axe assertion.
- **ins, `dashboard.fit.spec.js`** — the helper is now the feature's own, with
  the same five tags; the "has no serious or critical axe violations" test is
  unchanged in what it proves. Its other five tests are untouched.
- **animals, ten group fit specs** — the inline block or private helper is
  replaced by the group's `fit/axe.js`. What each axe test proves is the same
  rule set **plus** the rules reachable only through `wcag21a`, `wcag21aa` and
  `wcag22aa` (D6). Every non-axe test in those files is untouched — do not
  reword a test name, retime a wait, or touch a locator.

### New

- **`ANFEAT/documents/fit/scan-status.fit.spec.js` gains one axe test.** Add it
  to the existing `document scan-status rendering` describe, after the two tests
  there, in the shape of that file's own helpers:

  ```js
  test('the settled scan-status table has no serious or critical axe violations', async ({
    page
  }) => {
    test.slow()
    const document = documentNamed('SCAN-AXE-0001', 'itahc-axe.pdf')
    await uploadDocument(page, document)
    await expect(
      rowFor(page, document.accompanyingDocumentReference)
    ).toContainText(copy.scanTags.complete)

    await expectNoSeriousOrCriticalViolations(page, 'Documents, scan complete')
  })
  ```

  It pins that the documents table in its settled state — the status tag, the
  visually hidden per-row label and the View file link — carries no serious or
  critical accessibility violation. `test.slow()` matches its neighbours, which
  wait on the same scan. Use a reference no other test in the file uses.

### Expected counts after the stage

| Repo | test (vitest) | test:fit (Playwright) |
| --- | --- | --- |
| ins | 595, unchanged | 50, unchanged |
| animals | 2350 passed + 8 skipped, unchanged | **448** (447 + the new scan-status axe test) |

Record the before and after fit counts in the stage notes, as the brief asks.
Any other movement in either column is a defect: find it, do not re-baseline it.

### Not tests

No unit test is added for `axe.js`. It is a Playwright helper, exercised by
every spec that calls it; plants has no test for its copy either. Vitest
excludes `**/*.fit.spec.js` in both repos, so the moved ins spec is still not
run by vitest; the five new `axe.js` files are counted by v8 coverage as
uncovered source (both repos include `src/**/*.js`), which nudges the coverage
percentage by a fraction. Neither repo sets a coverage threshold, so nothing
gates on it — but expect ins's 94.23% and animals' figure to move very slightly
and do not chase it.

---

## 6. Invariants to prove

Run each check and quote its output in the stage notes.

**I1 — ins's public URL surface is unchanged.** Nothing in this stage touches
`shared/paths.js`, a route registration or a `kit.pageRoutes` call, and the
controller modules move without their contents changing. Prove it:

```bash
grep -rn "kit.pageRoutes" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features
```

Expect the same six registrations, against the same path builders, as before the
change. Then `npm --prefix … run test` — `src/server/app/shared/paths.test.js`
and `routes.test.js` pin `/`, `/address-book`, `/address-book/add`,
`/address-book/{id}`, `/address-book/{id}/edit`, `/address-book/{id}/delete`,
`/auth/*` and `/health` and must stay green with no edit.

**I2 — no import crosses a feature boundary.** Two halves, because the cruiser
does not see fit specs in ins (D10).

Source, both repos — `npm run lint` must stay green, with ins reporting "no
dependency violations found" and animals reporting the same plus its three
pre-existing known violations and no more.

Fit specs, ins — this grep must return nothing:

```bash
grep -rn "address-book/fit\|address-book/fields\|\.\./\.\./address-book" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features/dashboard
```

and this one must list only imports from within the same feature and from the
repo-root `fit/`:

```bash
grep -rn "^import" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features/dashboard/dashboard.fit.spec.js
```

Fit specs, animals — each group spec's axe import must be its own group's:

```bash
grep -rn "from './axe.js'" ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features
```

Expect eleven hits, and this must return nothing:

```bash
grep -rn "fit/axe.js'" ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features
```

(no spec reaches a *named* group's `fit/axe.js`; every one reaches its own).

**I3 — no dangling reference to a renamed animals template.** This must return
nothing across `src/`, `fit/` and the docs:

```bash
grep -rn "transporters\.njk\|private-transporter-details\.njk\|transporters-select\.njk\|commercial-transporter-details\.njk\|transporter-add\.njk\|transit-countries\.njk\|port-of-entry\.njk\|consignment-details\.njk\|animal-identification\.njk\|search\.njk\|party-picker\.njk" ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/fit
```

Before the change it returns exactly one hit (a docs link in
`add-a-section.md`); after it must return none. Then this must return eleven
`/template` tails and nothing else:

```bash
grep -rn "const view = " ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/transport ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/commodities ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/addresses ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/documents
```

(thirteen lines in total: the eleven above plus the already-correct
`features/addresses/template` and `features/documents/template`.)

A render path that is wrong fails loudly: Nunjucks throws on a missing view and
the group's own fit specs go red. `test:fit` is the real proof.

**I4 — the Playwright spec pattern matches both layouts.** Do not edit the
configs; show they already cover it:

```bash
grep -n "testDir\|testMatch" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/playwright.config.js
```

Then show the run itself picked the moved spec up: the ins `test:fit` log must
contain a line naming
`src/server/app/features/dashboard/dashboard.fit.spec.js` (not
`dashboard/fit/…`), and the animals log must still name all eleven
`<group>/fit/*.fit.spec.js` files.

**I5 — every fit spec still runs, and the counts match §5.** ins **50 passed**;
animals **448 passed**. Quote both, with the before figures (50 and 447), in the
notes.

**I6 — the five `axe.js` files are identical to plants'.** Five diffs, each
empty:

```bash
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/fit/axe.js ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src/server/app/features/address-book/fit/axe.js
```

and the same against each of the four animals copies.

**I7 — behaviour, copy and auth are untouched.** `git diff --stat` on each repo
must show: in ins, only `features/index.js`, the ten renames, the moved
dashboard spec, the six fit files, the new `axe.js` and four docs files; in
animals, only the eleven template renames, the eleven controllers, the eleven
specs, the four new `axe.js` files and one docs file. **No `copy.en.js`, no
`copy.cy.js`, no `copy.test.js`, no `src/auth/`, no `src/plugins/`, no
`src/config/`, no `src/server/common/`, no `package.json`, no lockfile, no
playwright or vitest or dependency-cruiser config.** Anything else in the diff
is out of scope and must come back out.

**I8 — the full ladder, both repos, in order.**
`format:check` → `lint` → `test` → `test:fit`, each to its own log under
`…/logs/` and each read once. Fix formatting only with
`npm --prefix <repo> run format`.

---

## 7. Out of scope

Leave all of this alone, however tempting:

- **Any behaviour, copy, auth or chassis change.** The brief says so outright.
  No copy bundle is edited; no string a user sees changes; no route, guard,
  session or plugin is touched.
- **ins's `.dependency-cruiser.cjs`.** Its `exclude` list keeps `/fit/` and
  `\.fit\.spec\.js$` (D10). Recorded as an open question; not this stage's work.
- **Animals' single-page fit specs.** Twenty-two of them inline a two-tag axe
  block. They are not group specs, plants does the same, and the ruling does not
  reach them. Do not "finish the job" by converting them.
- **`ANFEAT/addresses/address-return/controller.js`** and its test, which do not
  carry the page prefix, and **`ANFEAT/documents/`**, a single-page feature with
  a `fit/` folder. The brief says animals changes only in the two named details
  (D12). Recorded as open questions.
- **`ANFEAT/addresses/controller.js` / `template.njk`** — the group's own root
  page. Already `template.njk`; leave the arrangement as it is.
- **`INSFEAT/reference-data-outage.test.js`**, a test at the features root
  outside any feature folder. Not named by the ruling.
- **Underscore-prefixed Nunjucks partials** in any group page folder. They are
  includes, not page templates.
- **The neighbouring open questions the brief names as out of scope** — anything
  about `page.js`, `evaluation.js`, the obligation model, the flow, the engine
  or the set layout. Journey-only machinery never comes to ins, and ins's flat
  `features/` never grows a set.
- **Merging, force-pushing or pushing to `main`.** The stage lands one commit
  per repo on `feat/NO_JIRA-frontend-alignment` behind draft PRs.
