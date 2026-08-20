# `addresses` + `contact` — comparing the two readings

**Scope.** `domain` in `["addresses", "contact"]` in both backlogs.

- **`dr1b`** (under test): 11 findings — `inc-001` … `inc-011`; 9 `addresses`, 2 `contact`. All in slice `addresses`.
- **`dr1`** (second opinion): 15 findings — `inc-002` … `inc-016`; 13 `addresses`, 2 `contact`. All in slice `addresses`.

Everything below was checked against the shared captures under
`workareas/shared/dr1b-parity/capture/`, the frontend at `76a864ba`, the
prototype at `491b3926` and the address-book service at `52c67b99`.

---

## Subject map

Compared by subject, not by id or slice.

| Subject | `dr1b` | `dr1` | Outcome |
|---|---|---|---|
| Role named "Consignor or exporter" vs "Consignor" | `inc-001` | `inc-002` | agree |
| Contact page explains the mechanism, not the role | `inc-002` | `inc-003` | agree |
| Contact page accepts an empty Save and continue | `inc-003` | — | **`dr1b` only, real** |
| CPH page has no "What is a CPH number?" disclosure | `inc-004` | `inc-007` | agree |
| CPH label title-cased, and named two ways | `inc-005` | `inc-006` | agree |
| CPH example hint teaches a 3/3/3 grouping | quoted in `inc-006`, not raised | `inc-008` | **`dr1` only, real** |
| CPH collected as one field, not three | `inc-006` | `inc-009` | agree |
| CPH applicability — allow-list vs default | folded into `commodities/inc-014` | `inc-005` | **`dr1` gives it its own row; both get the rule right** |
| Hub has no "Same as …" copy shortcut | `inc-007` | `inc-015` | agree |
| Hub shows the party name and nothing else | `inc-008` | `inc-010` | agree |
| No way to add an address from the journey | `inc-009` (`frontend-work`) | `inc-011` (`needs-backend`) | **band disagreement — `dr1b` right** |
| Pickers not scoped to the role | `inc-010` (merged) | `inc-013` | agree |
| Contact list not scoped to branch addresses | `inc-010` (merged) | `inc-004` | agree |
| Picker search needs a round trip | `inc-011` | `inc-014` (merged) | agree on substance |
| Picker paginates 5 of 13; DR1 has no pager | — | `inc-014` | **`dr1` only, real** |
| "View details" — link to record page vs in-page disclosure | — | `inc-016` | **`dr1` only, real** |
| Permanent address asked on its own page | `identification/inc-067…070` | `inc-012` | covered by both; different domain |

Eleven of `dr1b`'s eleven have a `dr1` counterpart on the same subject, bar
one. Three `dr1` subjects have no `dr1b` counterpart anywhere in the backlog.

---

## 1. Is anything in `dr1b` wrong?

Ten of the eleven are **sound**. One carries a **wrong** supporting statement
that changed what the finding decided to leave out.

### Sound — checked individually

**`inc-001` (consignor role name) — sound.** The falsifier does not fire.
`app/data/consignment-address-sections.js:17` reads `heading: 'Consignor'`, and
"exporter" appears nowhere DR1 shows a user. The load-bearing extra claim —
"the only one of the five roles whose name differs" — holds: the five prototype
headings are `Place of origin` (:4), `Consignor` (:17), `Consignee` (:31),
`Importer` (:44), `Place of destination` (:58), and the frontend hub renders the
other four word for word (`fe-addresses-hub.html:129,151,162,173`). The hints
match too, including the consignor's "This is the sender of the consignment."

**`inc-002` (contact intro copy) — sound.** The frontend copy file holds four
strings and the only guidance is the hint at
`contact/copy/copy.en.js:4`. The `correction` slot's own citation fix (`:5` →
`:4`) is right — `:5` opens the `errors` object.

**`inc-003` (contact accepts an empty submit) — sound, and the strongest thing
in the run.** See question 2.

**`inc-004` (CPH disclosure) — sound.** `app/views/cph-number.html:44-51` is a
`govukDetails` summarised "What is a CPH number?" with the two paragraphs
quoted verbatim, and the GOV.UK link really is `href="#"` at `:49`, so the
caveat in `difference` is earned. The frontend page has no disclosure.

**`inc-005` (CPH label wording) — sound, verified from the rendered DOM.**
`fe-addresses-hub.html:184` renders `County Parish Holding number (CPH)` and
its hint `The County Parish Holding (CPH) number identifies …`; the page it
opens renders `County Parish Holding (CPH)`. DR1: hub row `County parish
holding (CPH) number` (`consignment-address-sections.js:72`), page h1 `Add the
county parish holding number (CPH)` (`cph-number.html:32`), legend `CPH number`
(`partials/cph-number-input.html:9`).

**`inc-006` (three-part CPH input) — sound.** `partials/cph-number-input.html`
items are `county` width-2 `maxlength: "2"`, `parish` width-3 `maxlength: "3"`,
`holding` width-4 `maxlength: "4"`, all `inputmode: "numeric"`. The verifier's
own challenge to "hidden from sight" — that the labels are real but clipped by
`application.scss` — is correct and is the right way to have handled it.

**`inc-007` (hub "Same as …" shortcuts) — sound.**
`app/views/roles-and-addresses.html` renders the two link-styled submit buttons
in an `elif` branch reached only when no address, no summary and no CPH number
is held, immediately before the ordinary Add link. The suppression claim is the
`elif` chain itself.

**`inc-008` (hub shows the name only) — sound.** The frontend hub capture is the
empty state, so the claim rests on the row builder, and the verifier says so
rather than pretending to a picture. `fe-addresses-hub.html:131-187` shows all
six values as "Not added yet", and the six keys carry the title and hint in one
narrow `<dt>` exactly as the layout remark describes.

**`inc-009` (no add-address path) — sound, and its band is better argued than
`dr1`'s.** See question 4.

**`inc-010` (pickers and contact not scoped) — sound, and its verification is
the best piece of work in either run on this domain.** See question 4.

### `inc-011` (picker search needs a round trip) — **sound claim, wrong premise**

The finding itself is right: the picker template's own comment says "no client
JS anywhere" (`_address-picker.njk:8-12`), the Search button is
`name="action" value="search"` on a `method="post"` form, and DR1's filtering is
service code the design team wrote (`app/assets/javascripts/consignment-address-search.js`),
not Prototype Kit behaviour — so the verifier was right to overrule its author's
"kit behaviour" exemption.

**But this sentence in `difference` is false:**

> DR1 renders every matching address at once and has no pager, but **its address
> book holds nine records against the frontend's thirteen**, so the capture
> cannot show what DR1 would do with a book big enough to need one

DR1's consignment address book holds **thirty-three** records —
`grep -c "type:" app/data/consignment-addresses.js` returns 33. Nine is the
count *after* the role filter, which is the very filtering `dr1b`'s own
`inc-010` documents. `dr1`'s `inc-013` states it correctly ("filters the
thirty-three records down"), and `dr1`'s `inc-014` correction states it again.

**Grade: the finding is sound, the premise is wrong, and the wrongness is
load-bearing** — it is the whole reason `dr1b` declined to raise the pagination
half. From a 33-record book DR1 renders every match with no pagination markup
anywhere on the page; the capture demonstrates the behaviour rather than failing
to. See question 3.

### Nothing else is overstated

Two `dr1b` `correction` slots pre-empt the criticisms I would otherwise have
made — `inc-008`'s (reopening the picker does not reliably show the address,
because the picker names the selection by name alone and opens on page one of
three) and `inc-009`'s (DR1's "View details" also offers Edit and Delete). Both
are accurate and both are the sort of thing that usually goes unrecorded.

---

## 2. What did `dr1b` find that `dr1` missed?

**One finding, and it is real: `inc-003`, the contact page accepts Save and
continue with nothing selected.**

Verified in the source on both sides, without running either application.

Frontend, `contact/controller.js:29-39`:

```js
const fields = (options) =>
  compose(
    // Contact is mandatory as an obligation, but Save and continue with no
    // selection is allowed — the trader returns to the hub with the task
    // incomplete. Reject only values that are not in the offered list.
    oneOf(
      'contactAddress',
      options.map((option) => option.id),
      copy.errors.contactRequired
    )
  )
```

And `lib/validate/validators.js:114-121`:

```js
export const oneOf = (name, values, message = defaults.oneOf) =>
  single(name, Joi.string().allow('').valid('', ...values) …)
```

`.allow('').valid('', …)` passes an empty payload, so `state.commit` is never
reached. The stricter sibling exists in the same file — `requiredOneOf`
(`:100-112`) with `.required()` and a `'string.empty'` message — and `dr1b`'s
`correction` names the four pages already using it. So the fix really is one
page switching validators, not a journey-wide policy decision, and `dr1b` was
right to close its own author's open question that way.

DR1 blocks: `validateContactAddress` at `app/routes.js:1138-1155` returns
`{ contactAddressId: { text: 'Select a contact address' } }` and an
`errorList` entry whenever the id resolves to nothing.

`dr1` has nothing on this subject in any domain. **Real, and a genuine coverage
gap in the earlier run.**

---

## 3. What did `dr1` find that `dr1b` missed?

Three subjects. All three are real.

### 3a. `dr1/inc-008` — the CPH example teaches a grouping that does not exist

Frontend hint: `For example, 123456789 or 123/456/789.` — a 3/3/3 grouping.
A CPH number is 2/3/4, which DR1's three `maxlength` attributes enforce
(`2`, `3`, `4`) and its hint states: `For example 12/345/6789`.

`dr1b` quotes **both** hints in `inc-006` and never notices that one of them is
wrong. Its `difference` folds the hint change into the three-box change.
`dr1`'s correction makes the point `dr1b` loses:

> fixing the example alone leaves a correct hint over a single field, and needs
> no validation work, so it can ship on its own if the split does not

That is a one-string, zero-risk copy fix that is now invisible in `dr1b`,
buried inside an `add-field` change to the same page. **Real, and the most
shippable thing either run found in this domain.**

### 3b. `dr1/inc-014` — the picker paginates; DR1 does not

Verified from the captures. `fe-address-picker-place-of-origin.html:329-355` is
a `govuk-pagination` nav with pages 1, 2, 3 and Next, under a caption reading
`Showing 5 of 13 addresses`. `dr1-consignment-address-select.html` has no
pagination markup at all, and renders all nine matches under `Showing 9 out of
9 results`.

`dr1b` split this off from its live-search finding and **dropped it**, on the
false 9-vs-13 premise dissected above. A `grep` of the whole `dr1b` backlog for
`pagination|paging|pager|PAGE_SIZE` returns only `inc-011`, so it is nowhere
else in the run.

`dr1` also names two consequences `dr1b` never reaches:

- `PAGE_SIZE = 5` forces a `govukInsetText` restating the choice —
  `{% if picker.selected %} govukInsetText({ text: copy.selectedAddressPrefix … })`
  at `_address-picker.njk:97-99` — a control that exists only because the chosen
  row may be on a page the trader is not looking at.
- Dropping pagination *without* the role scoping would put all thirteen records
  on one page for every role — a longer list than DR1 ever shows. That
  sequencing constraint is absent from `dr1b`.

**Real, with a real dependency `dr1b` does not record.**

### 3c. `dr1/inc-016` — "View details" navigates in DR1, expands in the frontend

Straight from the two DOMs:

- Frontend, `fe-address-picker-place-of-origin.html:172-181` — a `<details>`
  with `<summary>` "View details" that expands in place.
- DR1, `dr1-consignment-address-select.html:337` —
  `<a class="govuk-link" href="/address-book/green-valley-farm-sanpetru?return=%2Fplace-of-origin">View details</a>`,
  once per row, each carrying its own return path.

`dr1b` mentions this cell nowhere in the `addresses` domain. A `grep` for "View
details" across the whole `dr1b` backlog returns one hit, `transport/inc-123`,
about transporters. **Real, and a straight miss.**

Worth noting: `dr1`'s own correction on this finding *falsified* the first
draft's claim that the disclosure repeats the row — it expands Astra Rosales to
seven lines including phone and email against the row's three. The surviving
half, link-versus-expander, is the observable one.

### 3d. CPH applicability — present in `dr1b`, but not as a finding

`dr1/inc-005` gives the rule its own row. `dr1b` has no CPH-applicability
finding in `addresses`; the subject survives only as three sentences inside
`commodities/inc-014`'s `difference` slot and its `correction`.

Both runs get the rule right, and **`dr1b`'s verifier corrected its own author
in the right direction**. I confirmed the rule from
`app/data/consignment-address-sections.js:100-155`: the default section list
carries `cph`, and the code-to-section map enumerates six codes, of which four
omit `cph` — `0101`, `01061900`, `05111000`, `05119985` — while `0102` and
`0103` name it explicitly. So CPH applies **by default** and is withheld by
exception, exactly as `dr1b`'s correction says, and the frontend inverts it with
`CPH_COMMODITIES = ['Cow']` (`services/commodities/stub.js:119`).

`dr1`'s statement of the rule is the more precise of the two: its correction
names **all four** escaping codes and then scopes to live animals, where
`dr1b`'s names only `0101` and `01061900`. Since germinal products are outside
the comparison, `dr1b` is not wrong — just less complete about how it knows.

**Where `dr1b` loses is placement, not accuracy.** In `dr1b` the fix is a clause
inside a twenty-one-commodity catalogue expansion, so the CPH rule change reads
as something that happens *when the catalogue widens*. `dr1` makes it a
standalone `obligation-change` and argues it matters today, because the
frontend's Fish is not asked for a CPH number and every DR1 fish code falls to
the default and is. That user-facing sentence is the one a reader needs, and it
is not present anywhere in `dr1b`.

### Not a gap: permanent address

`dr1/inc-012` sits in `addresses`. `dr1b` covers the same ground in
`identification` — `inc-067` (field labels and dialling-code hint), `inc-068`
(fraud warning and the definition), `inc-069` (own page vs identification card),
`inc-070` (reuse the place of destination). That is **more** coverage than
`dr1`'s single row, under a different domain. Not a coverage gap; a domain
assignment difference, and one for the `identification` comparison to rule on.

---

## 4. Where they contradict each other, which is right?

### 4a. Band on the add-address finding — `dr1b` is right

- `dr1b/inc-009`: `frontend-work`. "the address book exposes POST, PUT and
  DELETE on `/organisation/{orgId}/addresses` (OperatorController), so the write
  really is missing only from the frontend client".
- `dr1/inc-011`: `needs-backend`. "it needs a write path this service does not
  currently have — the frontend's address-book client is read-only by decision,
  and creation belongs to the INS front-door."

**Settled by `OperatorController.java`:**

```
:44   @RequestMapping("/organisation/{orgId}/addresses")
:144  @PostMapping
:265  @PutMapping("/{operator-id}")
:331  @DeleteMapping("/{operator-id}")
```

The write endpoints exist. What is missing is the frontend client's write path,
which is a decision recorded as a comment in
`services/address-book/index.js:17-19` — "This service reads and never writes …
belongs to the INS frontend, which is the only writer" — not a missing
capability. `dr1` quotes that comment accurately but reads a **service ownership
decision** as a **backend blocker**, and the INS front-door is another Node
frontend, not a backend. **`dr1b`'s band is the supported one.**

Two caveats that go the other way:

- `dr1`'s correction carries something `dr1b` does not have at all: an accepted
  workspace decision of 19 August that the missing signpost is a deliberate
  temporary measure, and an explicit "what the finding does not license is
  treating the bare picker as a defect to fix next." That is the more useful
  thing to read before picking the work up.
- `dr1`'s premise verification is stronger — it searched the whole frontend for
  every spelling of an add-address route and found only two tests asserting
  `createAddressHref` is `undefined`.

So: **`dr1b` right on the band, `dr1` richer on what "done" means.**

### 4b. Where DR1's contact list comes from — both partly right, `dr1b` more complete

- `dr1/inc-004`: DR1 "draws this list from a **separate collection** of branch
  addresses, not from the consignment address book the pickers use
  (`app/data/contact-addresses.js:1-21`)".
- `dr1b/inc-010`: "The contact page is filtered separately, to addresses **typed
  as a branch address**, and DR1 seeds it with three GB branches".

`app/routes.js:1019-1033` does both:

```js
function getContactAddresses (sessionData = {}) {
  const addedAddressBookIds = new Set(…)
  const addressBookAddresses = getAddressBookAddresses(sessionData)
    .filter((address) =>
      addedAddressBookIds.has(address.id) &&
      getAddressTypeValues(address).some((type) =>
        type === 'branch-address' || type === 'contact'))
    .map(mapAddressBookEntryToContactAddress)
  return dedupeAddressesById([… , ...addressBookAddresses, ...contactAddresses
```

The base is the separate three-record `contactAddresses` collection — `dr1`'s
reading — **plus** any address-book record added in session and typed
`branch-address` or `contact` — `dr1b`'s reading. The captured page shows the
three seeds and nothing else (3 radios in the prototype DOM against 13 in
`fe-contact.html`), so both descriptions fit the picture. `dr1b`'s names the
mechanism that will still be true once a trader adds one; `dr1`'s does not.

**Both sound; `dr1b` marginally more complete.** Both band it `needs-backend`,
and that band is right — `OperatorResponse` carries id, name, two address lines,
town, county, postcode, countryCode, phone, email, organisationId, `deleted` and
timestamps, and nothing role-shaped.

### 4c. Splitting versus merging

Not contradictions, but they are the reason the counts differ.

- `dr1b` **merged** the contact list into the picker list (`inc-010`), on the
  grounds that both need the same field on the same record. `dr1` **split** them
  (`inc-004`, `inc-013`) and cross-linked them `travels-with`. Both are
  defensible; `dr1`'s split keeps two separately-rulable rows for two different
  pages with two different DR1 mechanisms (a type filter versus a separate
  collection), which reads better as a decision surface.
- `dr1b` **split** live search from pagination and dropped the pagination half.
  `dr1` **merged** them into `inc-014`. Here the merge is the better call,
  because the two really are one change to one table — and the split cost
  `dr1b` a whole finding.
- `dr1b` **merged** the CPH heading and the hub-row casing into `inc-005`;
  `dr1` split heading (`inc-006`) from hint grouping (`inc-008`). `dr1`'s split
  is the one that surfaced the 3/3/3 defect.

### 4d. Two things neither run raised

Recorded so they are not lost, not as a mark against either:

- DR1's picker puts an `<h2>` "Select an address" above its count line
  (`dr1-consignment-address-select.html:282`); the frontend has no such heading
  and puts its count in the table caption. `dr1` names it inside `inc-014`'s
  correction as a carry-into-work note; `dr1b` names it only for the *contact*
  page, in `inc-002`'s correction. Neither has a finding.
- DR1 captions the picker and the hub "Consignment parties"; the frontend
  captions the picker "Consignment addresses" and the hub not at all. `dr1`
  covers the wording in `service-wide/inc-115`; `dr1b`'s `service-wide/inc-105`
  covers caption *presence* and says "taking the wording from DR1 page by page"
  without naming this pair. Out of domain, but it lands on these six screens.

---

## The five-to-one picker structure

The requirements side has **one** picker view; the frontend splits it into five
role pages plus a contact page reading the same book.

### The diff, run independently

I diffed all five frontend picker DOMs. `dr1b`'s verifier's claim is **exactly
right**. Every pair differs on the same seven lines and nothing else:

```
$ diff fe-address-picker-place-of-origin.html fe-address-picker-consignee.html
3c3     <title>Place of origin …   →  <title>Consignee …
98c98   breadcrumbs__list-item     →  Consignee
118,119c118,119   <h1> + intro <p> →  Consignee / "This is the receiver or buyer…"
332,337,342,348   pager hrefs      →  /consignees/select?page=N
```

The other three pickers produce the **identical line numbers** against
place-of-origin — `3c3 · 98c98 · 118,119c118,119 · 332c332 · 337c337 · 342c342 ·
348c348`. Since `diff` is exhaustive, that proves the rest is byte-identical:
same `<form method="post" novalidate>` with **no `action`** (which is why the
markup does not vary), same search input `name="q"`, same secondary
`name="action" value="search"` button, same table caption `Showing 5 of 13
addresses`, same five column headers, same radio `name="party"` with the same
thirteen-record ordering, same `<details>` "View details" per row, same
pagination block, same Save and continue.

**So: exactly five role-specific things — title, breadcrumb, h1, intro sentence,
pager URL — and everything a finding could be about is common to all five.**

### How each run handled it

**Neither run committed either error.** Neither wrote five near-duplicates, and
neither flattened a genuinely role-specific difference.

**`dr1b`** wrote three picker-wide findings and named the screens exhaustively
every time: `inc-009` and `inc-010` name all five pickers **plus** `fe-contact`
(six screens); `inc-011` names all five. The one genuinely role-specific thing
in the whole diff — the consignor's name in the h1 and the hub row — it wrote as
a role-specific finding (`inc-001`, two frontend screens), which is correct: the
frontend intro sentences for the other four match DR1's section hints word for
word, so the consignor name is the only per-role divergence there is.

**`dr1`** did the same thing: `inc-011` names five pickers plus `fe-contact`,
`inc-013` and `inc-014` name all five, and `inc-002` is correctly role-specific.
`dr1` additionally split the picker list from the contact list, which is a
defensible reading of "the contact page reads the same book" as a separate
subject.

**One inconsistency, in `dr1`.** `inc-016` ("View details") names only
`fe-address-picker-place-of-origin` and `fe-address-picker-consignee` — two of
five. The diff proves the `<details>` cell is identical on all five, so the
finding under-names its screens by three. It is a screen-list defect, not a
flattening error, and it does not touch the substance.

### Verdict

**`dr1b` handled the five-to-one structure better** — narrowly, and on process
rather than outcome.

- Its screen lists are exhaustive and consistent; `dr1`'s `inc-016` is not.
- More to the point, `dr1b` **proved** the picker DOMs are interchangeable and
  wrote the proof into `inc-010`'s verification line — "the only differences
  between the five files are the title, the breadcrumb, the heading, the intro
  sentence and the pager's URLs". That is exactly the check that licenses
  picker-wide findings, and it is the reason its author could safely write six
  screens onto one row instead of hedging. `dr1` reached the same structural
  answer without recording how it knew.

**But `dr1` covered more of the picker.** `dr1b` gained one picker-adjacent
finding (`inc-003`, contact validation) and lost three (pagination, "View
details", CPH hint grouping — the last on the CPH page rather than the picker).
Getting the *structure* right is not the same as getting the *coverage* right,
and on this domain `dr1b` is ahead on the first and behind on the second.

---

## Summary of grades

| `dr1b` finding | Grade |
|---|---|
| `inc-001` consignor role name | sound |
| `inc-002` contact intro copy | sound |
| `inc-003` contact accepts empty submit | sound — **new signal, real** |
| `inc-004` CPH disclosure | sound |
| `inc-005` CPH label wording | sound |
| `inc-006` CPH three-part input | sound |
| `inc-007` hub "Same as …" shortcuts | sound |
| `inc-008` hub shows name only | sound |
| `inc-009` no add-address path | sound; band `frontend-work` better argued than `dr1`'s |
| `inc-010` pickers + contact not role-scoped | sound; best-verified finding in the domain |
| `inc-011` picker search needs a round trip | claim sound; **premise wrong** ("nine records" — the book holds 33), and the error cost the run the pagination finding |

**Provenance.** The blocked exit-details hub row does not appear in this domain,
so the one contaminated subject is not in play here. Everything above is either
a disagreement — trustworthy by construction — or an agreement I re-derived from
the captures and the two sources directly.
