# Re-analysis: the transporters theme, 6 November 2026

The theme is played after `ruling:ian-2026-11-06` lifted the transporter-management block (c-285). This is the
per-theme pre-play verification `themes/HOW-TO-BUILD.md` asks for — rows read against current `main` by hand —
rather than the full repo re-extract and re-distil. It is the alternative that commodities-and-reason had on
2 November and type-question on 4 November.

Main SHAs read: animals frontend `c31daf4d`, INS frontend `0f8c051`, address book `4d5d9cc`, INS backend
`2262573`, stub `b70273d`, tests `1926405`, workspace `1510fddc`.

The theme still holds 13 rows: 10 to build, inc-044 done, inc-042 and inc-265 blocked.

## Summary

- **No row is dropped and no row is wholly done.** inc-044 was already found done on main before this pass
  (EUDPA-739).
- **Three shared mechanisms explain most of the "refuse a blank" work**, and all three are one-line fixes rather
  than the page rewrites the criteria imply. See "Three root causes" below. This is the single biggest finding:
  four rows are much smaller than they read.
- **inc-037 is roughly half met on main.** Design snagging's inc-210 landed its search and its 'Add a
  transporter' button, and the four private records already match the design by name and status.
- **Most of the remaining add-form work is copy, not behaviour** — a missing "a", a lowercase "zip", one
  paragraph in the wrong place, one banner title to move into the body.
- **One question for Ian, and it is not small:** the service's shipped transporters are cross-organisation, which
  is the concept decision 3 parked. See "The question this pass raises".
- **One concrete blocker for decision 5:** the INS front door works an address type out from its roles, so a
  Transporter type added the obvious way would demand roles. It needs its own branch.
- **The theme can split, but must not be played beside overview-and-review**, which edits the same copy and fit
  files.

## Three root causes

Four rows' worth of "refuse a blank answer" criteria come down to three mechanisms. None needs a page rewritten.

| Mechanism | Where | Rows | Fix |
|---|---|---|---|
| `oneOf` allows an empty value **by design** — `Joi.string().allow('').valid('', ...values)` (`lib/validate/validators.js:189`) | the transporter list and the type question | inc-240, inc-038 | `requiredOneOf` **already exists** in the same module (`lib/validate/index.js:16`, tested at `validate.test.js:181` as "save-blocking value domain"). Swap it in and pass the message. |
| Both add forms guard their mandatory checks behind `recordProvided(values)`, which is false when every entered field is blank, so `missingMandatoryErrors` returns `{}` and a wholly blank form is accepted | `commercial-transporter-details.controller.js`, `private-transporter-details.controller.js` | inc-041, inc-040 | The criteria are specifically about a *completely blank* form, which is the one case the guard excludes. Drop or invert the guard. |
| A blank type choice is not just unrefused, it is routed: `nextSlugForTransporterType('')` returns `transportersPage.slug` | `transporter-add.controller.js` | inc-038 | Once the choice is required, that branch is dead and comes out. |

## Row by row

### inc-037 — the transporter list's layout, search, approval-number column and shipped transporters

| Criterion | On main |
|---|---|
| 1. Visible sub-heading 'Select a transporter' above the search box and table | **Not met.** There is one visible legend (`govuk-fieldset__legend--m`) and it sits *below* the search row, not above it. |
| 2. Fieldset legend 'Select a transporter', visually hidden | **Not met.** Same legend as criterion 1, and it is visible. Criteria 1 and 2 together are a move plus a visibility change, not two additions. |
| 3. Secondary 'Add a transporter' beside the search, above the table, opening the type question | **Met** (design snagging inc-210). `govukButton` with `govuk-button--secondary` and `href: addHref` in the grid row beside the search. |
| 4. Error state has no serious or critical axe violations | **Not met.** `fit/transporters.fit.spec.js:1085` has a11y checks for the list, the type page and the private form — all in their plain state. Neither the list's error state nor the commercial form is covered. |
| 5. Search matches type and status as well as name, address and approval number | **Met** (inc-210). `rows.js` `searchTextOf` joins name, address summary, approval number, type label and status label. |
| 6. 'Not applicable' in the Approval number column when there is none | **Not met.** `rows.js` renders `record.approvalNumber ?? ''` — an empty cell. The string 'Not applicable' appears nowhere in the transport feature. |
| 7. The four DR2.1 commercial records | **Not met.** Main ships two placeholders, García Livestock Transport SL and J & G Campbell LTD. |
| 8. The four DR2.1 private records | **Half met.** All four names and statuses match exactly — Aberdeen Livestock Ltd/Approved, Romanian Agri Exports SRL/New, Slovak Farm Export/Approved, Finnish Livestock Oy/New. Every address differs, and none carries an approval number: `privateRecord()` has no `approvalNumber` field at all, which is why criterion 6 can fire. |
| 9. Picking any of the eight keeps it chosen, and the end-to-end journeys pick one of them | **Partly.** Picking and keeping works. The tests repo picks García by name in five places plus a constant — see "Tests repo blast radius". |

### inc-038 — the type question's copy, and refusing a blank choice

| Criterion | On main |
|---|---|
| 1. Warning 'Check the transporter list before adding new transporters to avoid duplicates.' | **Not met.** Main reads 'Before you add this transporter, please ensure you have already searched for it first.' |
| 2. Visually hidden legend 'Choose a transporter type' | **Half met.** The legend already carries `govuk-visually-hidden`; its text is 'What type of transporter will move the animals?'. A copy change only. |
| 3. The page's only button reads 'Continue' | **Not met.** `saveActions({ showReturnControls: false })` with no `primary` falls back to `copy.saveAndContinue`, so it reads 'Save and continue'. The *structure* is already one button. |
| 4. Blank choice refused with 'Select a transporter type' | **Not met** — root cause 1 and 3. |
| 5. A type that is neither Private nor Commercial is refused | **Half met.** `oneOf` refuses it, but with the module default message, not 'Select a transporter type'. |
| 6. Opening either add form without the matching type chosen returns to the type question | Not verified in this pass. Carry into the plan. |
| 7. Status strip on the list and the commercial form, not on the type question or the private form | Not verified in this pass. Carry into the plan. |

### inc-039 — saving an added transporter returns to the list with it chosen and a success banner

Not re-read against main in detail: decisions 1 and 2 move its save and cancel onto the address book hand-off, so
its criteria are being rewritten rather than checked. What main shows that matters: `services/transporters/register.js`
is an in-memory `Map` per process, so the row's "added transporters stay on its list for later notifications" has
no real persistence behind it today, as the ruling's point 7 records.

### inc-040 — the private transporter form's heading, country select and required fields

| Criterion | On main |
|---|---|
| 1. Heading and title 'Add a private transporter' | **Not met.** `title: 'Add private transporter'` — the article is missing. |
| 2. The name field is the first thing under the heading | **Not met.** An intro paragraph sits between them: 'Enter the name and address of the private transporter moving the animals.' |
| 3. Country select opens on United Kingdom, every option a country name, alphabetical | **Not met.** The select carries a 'Select a country' placeholder (`countrySelectText`) rather than opening on the United Kingdom. |
| 4. A completely blank form names all six required fields in order | **Not met** — root cause 2. |

### inc-041 — the commercial transporter form's heading, guidance banner, postcode copy and required fields

| Criterion | On main |
|---|---|
| 1. Heading and title 'Add a commercial transporter' | **Not met.** `title: 'Add commercial transporter'`. |
| 2. Banner titled 'Important', content opening with the heading 'Help with transporter authorisation' | **Not met, and it is a restructure.** Main passes `titleText: copy.guidanceTitle`, so 'Help with transporter authorisation' is the banner's *title* and there is no inner heading. The title moves into the body and 'Important' takes its place. |
| 3. Postcode labelled 'Postcode or Zip code' | **Not met** — main has lowercase 'zip'. |
| 4. Blank postcode shows 'Enter a postcode or Zip code' | **Not met** — lowercase 'zip'. |
| 5. Over 12 characters shows 'Postcode or Zip code must be 12 characters or less' | **Not met** — lowercase 'zip'. |
| 6. Blank authorisation number shows 'Enter a transporter authorisation number' | **Not met** — main reads 'Enter **the** transporter authorisation number'. |
| 7. A completely blank form names all seven in order | **Not met** — root cause 2. The field order itself already matches. |

**Worth fixing in one place:** the **private** form already uses the capitalised 'Postcode or Zip code' in its
label, its required message and its max-length message. Only the commercial form is lowercase. The two forms
disagree today, so criteria 3 to 5 are bringing commercial into line with private rather than changing both.

### inc-008 — the private transporter's country list

Largely met on `main` already, as the 27 October pass suspected. `services/countries/index.js` `addressCountries()`
returns `{ code: 'GB', name: 'United Kingdom' }` followed by what reference-data serves, with no editing in code.
Narrow the row to what the stub-mode fit suites serve against the tidied stub fixture, plus the tests.

### inc-074, inc-075, inc-076 — the address book side

**A concrete blocker for decision 5.** The INS front door works an address type out from its roles, exactly as
`ruling:paul-2026-11-05` requires:

```js
export const ROLES_BY_ADDRESS_TYPE = Object.freeze({
  [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR]: [PLACE_OF_ORIGIN, CONSIGNOR],
  [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER]: [CONSIGNEE, IMPORTER, PLACE_OF_DESTINATION],
  [ADDRESS_TYPES.BRANCH]: [BRANCH_ADDRESS]
})
```

and the tabs are built straight off it — `ADDRESS_BOOK_TABS` maps each `ADDRESS_TYPES` entry to its role set, and
`resolveRole(tab, role)` reads from there. So adding `TRANSPORTER` to `ADDRESS_TYPES` the obvious way would
require a `ROLES_BY_ADDRESS_TYPE[TRANSPORTER]` entry, which decision 5 says must not exist. The Transporter type
and tab need their own branch that reads the transporters route, not an entry in that map. The plan must say so
explicitly, or the first implementor will add a role to make the types line up.

Two useful finds for these rows: the add flow's `requiredOneOf('addressType', …)` already refuses a blank type
with a message, so the Transporter radio inherits correct validation for free; and `inc-064`'s view page plus
`inc-066`'s return-to-opener may already satisfy most of inc-076 once a transporter is one of the records — check
before writing anything new.

### inc-240 — the transporter list refuses a save with no transporter chosen

Still to build, and root cause 1 is the whole of it. `transporters/validate.js` already names the right message
(`copy.errors.transporterRequired`, 'Select a transporter from the list') but reaches it through `oneOf`, which
permits `''`. Main's own tests state today's behaviour plainly:
`transporters.controller.test.js:167` 'Should walk on without saving when no transporter is picked' and `:210`
the same for Save and return to overview. Both tests invert when the row lands.

### inc-042 — Northern Ireland address search

**Still blocked, verified.** The lookup is gated off outside dev and local on both sides: the INS frontend
registers the spike's routes only when `isDevOrLocalEnvironment()` (`routes.js:10`), and the INS backend's
`AddressLookupController` is annotated `@Profile({"dev", "local"})`. Real code exists behind it — client, config,
mapper, metrics, timings, federated token — but on a standalone page nothing links to. Under decision 6 its
BT-postcode filter is a search convenience, not the source of truth for the country.

### inc-265 — approved transporters

Parked by decision 3. Nothing to verify.

## The question this pass raises

**Are the service's shipped transporters the approved-transporter concept you parked?**

Today every organisation sees the same eight shipped records on top of its own:

```js
export const partiesFor = (orgId) => {
  const added = addedParties(orgId)          // this organisation's
  ...
  ...parties().filter(...)                   // TRANSPORTER_OPTIONS — every organisation's
}
```

Decision 1 makes a transporter a per-organisation address book record. A list the *service* ships to every
organisation, sitting on top of each organisation's own, is close to word-for-word your description of approved
transporters: "a list managed in MDM for all organisations that will be added to the organisations individual
transporter options".

If that reading is right, inc-037's criteria 7, 8 and 9 — the eight shipped records and picking one of them —
belong with inc-265 in the parked pile, and inc-037 shrinks to the list's layout, search, approval-number column
and accessibility over whatever the organisation has added. If it is wrong, the shipped records are just design
fixture data that survives the move and criteria 7 to 9 stay.

This pass does not decide it. It changes what two rows contain, so it is recorded as an open question on inc-037.

## Tests repo blast radius

If the shipped commercial records do change, the tests repo picks García Livestock Transport SL **by name** in
five places, and the fix is centralised in one of them:

- `domain/animals/constants/transporters.ts` — the `garciaLivestockTransport` constant, value and display
- `tests/animals/a11y/notification-journey-filled-state.spec.ts:133`
- `tests/animals/e2e/journeys/opening-run.spec.ts:42`
- `tests/animals/e2e/journeys/overview-task-return.spec.ts:83`
- `tests/animals/e2e/pages/transporter.spec.ts:3` — `COMMERCIAL_TRANSPORTER`

## Ready to split?

**Yes on dependencies, with one scheduling condition.**

Every theme the transporters theme waits on has drained since the 27 October pass, which is the finding that most
changes its position: journey-foundation (7 done), reference-lists (3 done), documents (6 done), design-snagging
(14 done) and address-book (20 done, 2 blocked rows this theme does not need). All four named external
dependencies — address-book inc-061, inc-066, inc-067 and inc-069 — are done, as are reference-lists inc-173 and
design-snagging inc-210.

**The condition:** the unmerged `overview-and-review` branch genuinely edits five files this theme must also edit
— `transport/copy/copy.en.js`, `copy.cy.js`, `copy.test.js`, `fit/transporters.fit.spec.js` and
`fit/commercial-transporter-details.fit.spec.js` (checked from its merge base, not against main, so these are the
branch's own edits). It is a stale branch that will be replayed from a fresh cut of main, so the clash is only
live if both themes are played at once. Do not play them concurrently.

The parked `type-question-and-templates` branch also edits `transporters/transporters.njk`, but it is parked by
`ruling:sam-2026-11-04`, so it is not a live clash.

## What this pass does not cover

It verifies the rows against `main`. It does not extract `ruling:ian-2026-11-06`'s claims into
`requirements.json` — only a distil run creates claim ids, so the ruling stays `pending: extract` alongside
`ruling:sam-2026-11-04`, and the rows cite it in prose. The repo extracts behind the 2 November re-distil are
still the 26 October ones for every other theme; this pass fixes that for transporters only, by hand.
