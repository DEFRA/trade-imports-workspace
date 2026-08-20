# What a DR1C finding is, and the file that carries one

One finding, one file, under `findings/`. A deterministic tool assembles them
into `backlog.json`; nothing writes that file by hand.

This is **`dr1c`'s** contract. Every comparison writes its own, in its own
workarea, because the band table, the domain list, the evidence path roots and
the exclusions below are all properties of this comparison. This one is
finished: every section that has to be written per corpus has been written from
the two applications' own source, and every claim in it carries a `path:line`
you can go and check.

This exists so that ten agents working on ten slices produce one backlog rather
than ten dialects of one.

**Read it whole before you write your first finding.** It is not long, and every
paragraph in it was paid for by a previous run getting something wrong.

## The comparison, in one table

| | implementation side | requirements side |
|---|---|---|
| side id | `frontend` | `prototype` |
| label | Frontend | Design release 1 |
| checkout | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `~/git/defra/defra-design/GB-notification-service` |
| source root | `src/server/app/sets/live-animals/journeys/linear/` | `app/` |
| screen id prefix | `fe-` | `dr1-` |
| screens | 31 | 28 |
| workarea | `workareas/shared/dr1c-parity` | — |

The frontend is a Hapi + Nunjucks service; Design release 1 is a GOV.UK
Prototype Kit application. One prototype codebase serves four journeys and DR1
is the one with no path prefix. See **The requirements side's view-path rule**
below before you cite anything on that side — it is the single easiest mistake
to make in this comparison and it invalidates the finding that makes it.

## The rule above all the others

**You are comparing functionality, not code.** Design release 1 is the
definition of this service. Where Frontend differs from it, Frontend is wrong,
unless the finding itself is mistaken.

A finding says:

> Design release 1 asks the user to choose a document type; Frontend infers it
> from the filename.

A finding never says:

> `routes.js:9014` differs from `controller.js:130`.

If a finding's substance is a code difference, it is not a finding. Drop it.

Code references are supporting context, and they are not symmetrical.
Implementation-side references earn their place: they tell whoever does the work
where it lands. Requirements-side references are mostly noise. On one previous
run 416 of 819 citations pointed into throwaway prototype code and consumed most
of the citation effort. Cite the requirements side once, to show where the
requirement is stated. Do not cite it eight times.

The prototype's `app/routes.js` is over 11,000 lines and most of it is
housekeeping. One line from it, naming where DR1 states the requirement, is
worth more than six.

## What happens to a finding once it is written

**Design release 1 is signed off.** That single fact settles the disposition of
everything in this backlog, so read it carefully:

- A finding is born as **accepted work**. It is ingested with `status: "todo"`
  and it needs no approval to become work. Nobody has to decide whether the
  service should behave the way DR1 says it behaves; that decision was taken
  when DR1 was signed off.
- **There is no desirability ruling to wait for and no gate to set.** The `dr21`
  corpus had a band for "we might not want this" because that design was still
  in flux. This one does not, and a finding written as though it were asking
  permission — "consider whether…", "the team may wish to…" — is a finding
  written in the wrong corpus. Say what has to change.
- **The only open question a finding can carry is whether the finding itself is
  correct.** That is the `disputed` band, and it means one of exactly two
  things: the author may have misread one of the two applications, or DR1
  contradicts itself between two of its own screens. It never means "we do not
  want this change".
- A `disputed` finding must say, in `finding.difference`, exactly what
  observation would settle it. "Disputed, needs discussion" is not a finding; it
  is a shrug with an id.

The consequence for the tone of your prose: write in the indicative. "Frontend
does not ask for the exit border control post; DR1 asks for it as a conditional
reveal on the reason-for-import page." Not "Frontend appears to be missing what
may be an intended field."

## The file

`workareas/shared/dr1c-parity/findings/<slice>--<slug>.json`

```json
{
  "slice": "transport",
  "title": "One sentence. What a user can see or do differently. No file paths.",
  "domain": "transport",
  "type": "add-field",
  "band": "frontend-work",
  "confidence": "high",
  "screens": ["fe-arrival-details", "dr1-arrival-details"],
  "controls": ["transportDocumentReference"],
  "finding": {
    "frontend": "What Frontend does today, as a user meets it.",
    "prototype": "What Design release 1 asks for, as a user meets it.",
    "difference": "What has to change, and what it depends on.",
    "falsifiedBy": "The single observation that would prove this finding wrong.",
    "verification": "Written by the verifier, not the author. See Verification below."
  },
  "evidence": {
    "frontend": "src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/template.njk:31-58",
    "prototype": "app/views/arrival-details.html:116-129"
  },
  "relatedTo": [
    { "id": "transport--other-finding", "relation": "travels-with", "why": "…" }
  ],
  "carriedFrom": "inc-013"
}
```

The two prose slots are called `frontend` and `prototype` whatever this
comparison's sides are named. They are the implementation side and the
requirements side in that order — Frontend first, Design release 1 second.

### Field by field

**`slice`** — the slice you were given. One word, kebab-case.

**`title`** — one sentence, and it must survive being read on its own in a list
of ninety. Name both sides in it where you can. No file paths, no line numbers,
no code identifiers unless the identifier is the user-facing string itself.

**`domain`** — the part of the service, from this list only:

| domain | what it covers |
|---|---|
| `service-wide` | The chrome that appears on every screen: the GOV.UK header, the service navigation, the phase banner, the back link and breadcrumbs, the footer, the `<title>` pattern, the signed-in bar, the journey status strip, the error summary and the save/continue button pattern. **Only this domain raises a chrome finding.** |
| `dashboard` | The signed-in landing page listing a trader's notifications, with its filters, sorting, tabs and per-notification cards or rows. `fe-dashboard` / `dr1-dashboard`. |
| `hub` | The task list for one notification — the section headings, the row labels and hints, the status tags, and the summary of what the notification currently contains. `fe-hub` / `dr1-notification-hub`. |
| `origin` | Where the consignment is coming from: country, region and the region-of-origin code reveal. `fe-origin` / `dr1-origin-of-the-import`. |
| `commodities` | What is being imported and the details of each commodity line: the species/commodity search and the consignment-details page. `fe-commodity-search`, `fe-consignment-details` / `dr1-what-are-you-importing`, `dr1-consignment-details`. |
| `identification` | Identifying the individual animals and the extra facts about them: identification details and additional animal details. `fe-animal-identification`, `fe-additional-details` / `dr1-animal-identification-details`, `dr1-additional-animal-details`. |
| `import-reason` | Why the consignment is being imported and everything that hangs off that answer: purpose, and the exit-details questions (destination country, port of exit, exit date) that DR1 asks as conditional reveals on one page. |
| `transport` | Getting the consignment here: arrival details at the port of entry, transit countries, and the transporter — type, selection, and the private/commercial detail pages. |
| `documents` | Accompanying documents: uploading them, listing them, their types, references and scan status. `fe-documents` / `dr1-upload-documents`. |
| `addresses` | The addresses used by one notification: the party list, the five party pickers, the CPH number, the permanent address of the animals, and the contact address for the consignment. |
| `review` | Ending the notification: check your answers, the declaration, the confirmation or submitted page, and the delete and cancel-amendment screens. |
| `address-book` | The trader's saved address book as a thing in its own right — list, add, lookup, view and edit. DR1 has five of these screens and Frontend has none. See **The address book** below; do not raise anything here without reading that section. |

These are the parts of the service as the two applications themselves divide it.
`hub`, `origin`, `commodities`, `identification`, `import-reason`, `transport`,
`documents` and `addresses` line up with the frontend's own task rows
(`src/server/app/sets/live-animals/journeys/linear/flow/task-rows.js:27-59`) and
with DR1's six hub sections (`app/routes.js:5749-5841`). `review` is the
frontend's gated review section (`src/server/app/sets/live-animals/journeys/linear/flow/flow.js:81-85`). `dashboard`,
`service-wide` and `address-book` are the three that sit outside a notification.

**`type`** — what shape of work it is, from this list only:
`add-page`, `add-section`, `add-collection`, `add-field`, `obligation-change`,
`flow-change`, `copy-change`.

**`band`** — one of exactly these three. The ids come from this corpus's
`bands[]` in `tools/parity/corpora.json` and the two must agree exactly; a
finding whose band matches no declared band renders under *Not in a band*, which
is how a typo shows up.

| id | label | what it means here |
|---|---|---|
| `frontend-work` | Frontend work | Design release 1 is signed off, so this difference is a fault in Frontend and the fix lands in Frontend. Nothing has to happen first: the copy, the field, the page or the flow change can be built against what DR1 already shows. **Most findings belong in this band, and it is the default.** If you are hesitating between this and another band, ask what would have to land before a developer could start — if the answer is "nothing", it is `frontend-work`. |
| `needs-backend` | Needs backend | The change is accepted, but Frontend cannot make it alone: it needs a field the notification contract does not carry, a reference list no service exposes, a persistence change, or an API that does not exist. Only the order of the work is in question, never whether it happens. Say in `finding.difference` which service and which contract. Do not use this band for something the frontend could do today against a stub. |
| `disputed` | Disputed | The finding itself may be wrong — you could not observe one of the two sides, or the two sides may in fact agree and you cannot prove it — **or** Design release 1 contradicts itself, showing one thing on one screen and another on another. **It never means "we do not want this change."** DR1 is signed off, so that question is closed and there is no band for it. A `disputed` finding must name, in `finding.difference`, the one observation that would settle it. |

**`confidence`** — `high`, `medium` or `low`. `high` means you read both sides'
evidence and the claim is observable in the captured screenshots or the captured
rendered HTML. `medium` means you read source but could not observe the outcome.
`low` should be rare; prefer `disputed` with a stated question over `low`
confidence in a `frontend-work` finding.

**`screens`** — the corpus screen ids the finding attaches to, implementation
side first: `fe-…` then `dr1-…`. Only ids that exist in the manifests. A finding
with no screen is a finding nobody can look at.

**`controls`** — the control the finding is about. This drives the element crop,
so a whole-page shot does not stand in for a finding about one field. **Name it.
Never leave the tool to infer it from your prose.** Empty array only when the
finding is genuinely about the whole page — and `tim parity anchors` prints
every increment that named nothing, so an empty array is a stated choice rather
than an omission nobody sees.

Write each entry one of three ways:

- `"arrivalDateAtPort"` — a bare string with no whitespace is read as a field's
  `name` attribute.
- `"Save and continue"` — a bare string containing whitespace is read as a
  visible label.
- `{ "kind": "field", "name": "q" }` or `{ "kind": "label", "text": "Search" }`
  — say which when a one-word label or an odd name would be read the wrong way.

Remember that a control name landing in several places on a page gets the crop
**refused**, and the card falls back to the whole page with the reason printed.
That is correct behaviour, not a bug to work around.

**`finding.frontend` / `finding.prototype`** — what each side does, described as
a user meets it. Present tense. Cite with a bare `path:line` token where it
helps; the citation extractor turns those into permalinks.

**`finding.difference`** — the work. What has to change, in what order, and what
it depends on. This is the section whoever picks the ticket up reads first.

**`finding.falsifiedBy`** — the single observation that would prove the finding
wrong. Not a hedge, not a list of caveats: one thing a person could go and look
at. "Finding a document-type select rendered from a shared partial" is good.
"Further investigation" is not.

**`finding.verification`** — written by the verifier, never by the author. See
Verification below. **A finding without one cannot be ingested** —
`requireVerification` is set for this corpus.

**`evidence`** — one path per side, the primary one.

- **`frontend`** is repo-relative from
  `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend`, so
  in practice it **starts with `src/`**. A journey page looks like
  `src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/port-of-entry.controller.js:97`;
  the shared chrome looks like `src/server/app/shared/layout.njk:41-53`.
- **`prototype`** is repo-relative from
  `~/git/defra/defra-design/GB-notification-service`, so it **starts with
  `app/`**. A view looks like `app/views/arrival-details.html:112`; a partial
  looks like `app/views/partials/arrival-date-picker.html:16-17`; a route or
  view-model looks like `app/routes.js:5749`.

Nothing else resolves. The resolver strips one of a short list of declared
prefixes and any other shape gets queued for a person to fix by hand. In
particular: do **not** cite the Prototype Kit's own files under
`node_modules/` — they are harness, they are not a requirement, and the path
would not resolve anyway.

> **The requirements side's view-path rule — read this before you cite DR1.**
>
> **A DR1 view is always a root view: `app/views/<name>.html`.** Never
> `app/views/design-release-2/<name>.html`, never
> `app/views/design-release-2.1/<name>.html`, never
> `app/views/testing/<name>.html`. A citation into a release subfolder is a
> citation about a different document, and the finding built on it is about a
> design nobody signed off.
>
> Why the trap exists. The prototype builds **one** router and registers every
> route on it, then copies the whole route stack under three base paths at the
> bottom of the file (`app/routes.js:10994-10997`, using `copyRouterStack` in
> `app/lib/version-mount.js:336-353`). So the route table is identical on all four
> mounts and only the root mount — the one with no prefix — is DR1. The
> application says so about itself: the release chooser describes Design release
> 1 as "The current design release journey at the root URLs" and points its start
> button at `/create-notification`, while the other three point at
> `/design-release-2`, `/design-release-2.1` and `/testing`.
>
> Views then **override** rather than replace. The mount middleware wraps
> `res.render` and rewrites a view name to `<viewFolder>/<name>` only when that
> release has its own copy of it (`app/lib/version-mount.js:143-158`,
> `versionViewExists`, applied at `app/lib/version-mount.js:292-303`). `app/views`
> has folders for `design-release-2`, `design-release-2.1` and `testing` and
> **none for DR1** — so DR1's views are exactly the loose `.html` files at the
> root of `app/views/`, plus the shared `app/views/partials/` and
> `app/views/layouts/` they include.
>
> Two consequences worth stating on their own:
>
> - **A screen that has no root view is not a DR1 screen at all.**
>   `create-template`, `dashboard-templates`, `dashboard-actions`,
>   `dashboard-changes`, `dashboard-inspection`, `delete-notification`,
>   `view-template` and `consignment-add-address` exist only under
>   `design-release-2/` and `design-release-2.1/`, and their handlers are gated
>   on session flags the root mount never sets. Do not write a finding that
>   Frontend is missing one of them.
> - **A root view's absence does not mean a question's absence.** Several DR1
>   questions are conditional radio reveals inside another page and have no view
>   file of their own: exit date, port of exit, exit border control post,
>   transit/transhipment destination country and internal-market purpose are all
>   reveals on `/reason-for-import`; region-of-origin code reveals on
>   `app/views/origin-of-the-import.html:102`; manual address fields reveal on
>   `app/views/address-book-lookup.html:137`. **Before writing "DR1 does not ask
>   for X", grep `app/views/partials/` and the containing page for the field
>   name.** Three agents on a previous run wrote that finding and all three were
>   wrong.
> - **And the converse: do not trust a description of a reveal either — including
>   one in this file.** An earlier version of this list said county, parish and
>   holding reveal on `app/views/cph-number.html:53`. **They do not.** That line
>   is a bare `{% include "partials/cph-number-input.html" %}`, and the partial is
>   a single `govukDateInput` carrying three always-visible inputs — County,
>   Parish and Holding number (`app/views/partials/cph-number-input.html:4`,
>   `:20`, `:32`, `:44`). The same wrong claim was in the run brief and in the
>   prototype enumerator's header comment; all three are now corrected. Open the
>   partial.

**`carriedFrom`** — the `inc-NNN` id in the previous run this finding derives
from, or omit. Check `carryover.json` before writing anything: carrying a
finding over is cheaper than re-deriving it, and striking one is cheaper still.

## How to write a citation so it resolves

A citation is a path followed by a line or a line range, written inline in the
prose:
`src/server/app/shared/layout.njk:41-53`. A deterministic extractor finds those
tokens and turns each into a permalink and a code snippet at the pinned commit.
You do not write markers; the tool writes them.

**Always write the full repo-relative path.** On one previous run 391 of 516
in-prose references were bare basenames — `copy.en.js:6` — and the extractor
refuses to guess which of the twenty-one files called `copy.en.js` you meant. It
queues those for a human instead, with the reason printed. A queued citation is
a person's evening; a full path costs you nothing. This corpus is unusually
prone to it: the frontend has one `copy.en.js`, one `copy.cy.js`, one
`controller.js`, one `page.js` and one `template.njk` **per feature folder**, so
a basename is almost never unique.

A bare `:NN` continuation resolves against the file named earlier in the same
sentence. That works, but only within a sentence, so do not start a new sentence
with one.

## What is not a finding

Each entry below is a whole class of difference that is real, observable, and
not worth raising. They were derived by reading both applications; where the
call was close the reasoning is given so a verifier can overturn it on evidence
rather than on taste.

- **A difference between Design release 1 and any other release.** The prototype
  also serves DR2, DR2.1 and a testing version, and they disagree with DR1 in
  many places. Only Frontend is on trial, and only against DR1. If you find
  yourself reading `app/views/design-release-2.1/`, stop.

- **The Prototype Kit's own harness chrome.** Specifically, and these are the
  ones you will actually meet:
  - **The release chooser at `app/views/index.html`.** It is captioned
    "Prototypes", says "Choose a prototype version to work on", and offers a
    card per release (`app/views/index.html:18-22`). It is a menu for designers,
    not a screen of the service, and it is not one of DR1's 28 screens. The
    service navigation's service link falls back to it
    (`app/views/layouts/main.html:14`) — that href is harness too.
  - **The footer.** Every DR1 page's footer is generated by the Kit and contains
    exactly "Manage your prototype" and "Clear data"
    (`node_modules/govuk-prototype-kit/lib/nunjucks/govuk-prototype-kit/layouts/govuk-branded.njk:48-82`).
    Frontend's footer carries privacy, cookies and accessibility links
    (`src/server/app/shared/layout.njk:76-95`). DR1 states no footer
    requirement at all, so there is nothing to compare and neither footer is
    wrong.
  - **The `<title>` suffix and separator.** The Kit builds the title as page
    name, then service name, then the literal `GOV.UK`, joined by hyphens
    (`node_modules/govuk-prototype-kit/lib/nunjucks/govuk-prototype-kit/layouts/govuk-branded.njk:23-25`);
    Frontend joins page title and service name with a pipe and adds no `GOV.UK`
    suffix (`src/server/app/shared/layout.njk:17`). The hyphens and the `GOV.UK`
    suffix are Kit defaults, not a DR1 decision. **The page name itself is
    designed and is comparable** — DR1 sets `pageName` per view (for example
    `{% set pageName = "Overview" %}` at `app/views/notification-hub.html:3`) —
    so a wrong or missing page name is a finding; the punctuation around it is
    not.
  - **Placeholder hrefs.** "Manage account" and "Log out" in DR1's service
    navigation both point at `#` (`app/views/layouts/main.html:17-18`), and the
    phase banner's feedback link points at `#`
    (`app/views/notification-hub.html:14`). That a link goes nowhere in a
    prototype is not a finding. **That the link exists at all is designed, and
    is in scope.**
  - **Kit plumbing generally** — `/manage-prototype`, `/plugin-assets`, the
    nodemon reload script injected by
    `govuk-prototype-kit/includes/scripts.njk`, and the fact that the Kit stores
    all answers in one session object.

  **What is designed chrome, and therefore IS in scope** — the `service-wide`
  slice owns all of it, and no other slice may raise it: the phase banner
  (DR1 shows an "Alpha" tag with "This is a new service. Help us improve it and
  give your feedback by email" on 48 of its views, e.g.
  `app/views/notification-hub.html:10-16`, and Frontend renders no phase banner
  anywhere — there is no `govukPhaseBanner` in `src/server`); the service
  navigation and its four items Dashboard / Address book / Manage account /
  Log out (`app/views/layouts/main.html:104-127`) against Frontend's service
  navigation with no items at all (`src/server/app/shared/layout.njk:27-32`);
  back link versus breadcrumbs (`src/server/app/shared/layout.njk:41-53`); the
  notification status strip; and the button pattern at the foot of each page.

- **Frontend's authentication and sign-out screens.** `src/server/auth/` and
  `src/server/signout/` exist because the real service signs a trader in through
  Defra ID, and they have no counterpart in DR1: the prototype's "Log out" is a
  `#` (`app/views/layouts/main.html:18`) and it has no sign-in journey. The
  unauthorised page (`src/server/auth/unauthorised.njk`) and the sign-out route
  (`src/server/signout/controller.js:3-7`, which only delegates to the OIDC
  sign-out) are therefore one-sided by construction. **Neither is in the 31
  enumerated frontend screens**, and neither is a finding. Do not raise "DR1 has
  no unauthorised page" and do not raise "Frontend has an extra sign-in step".

- **A whole feature one side has and the other does not — raise it once, not
  per field.** Two cases exist in this corpus and both are real:
  - *Frontend has, DR1 does not:* deleting a notification
    (`fe-delete-notification`) and cancelling an amendment (`fe-cancel-amend`).
    DR1 has no `delete-notification.html` and no `cancel-amend.html` at the root
    of `app/views/`; `delete-notification` exists only under
    `design-release-2/` and `design-release-2.1/` and is gated on a session flag
    the root mount never sets, and DR1's dashboard offers no amend action.
  - *DR1 has, Frontend does not:* the address book — see its own section below.

  **How to raise a one-sided feature.** Where Frontend has something DR1 does
  not, that is a **one-sided observation, not a defect**: DR1 says nothing about
  it, so DR1 cannot be said to disagree. Record it **once**, as a single
  observation in the slice that owns those screens (`review` for delete and
  cancel-amend), and move on. Where DR1 has something Frontend does not, write
  **one `add-page` finding** — or one `add-section` where it is a block inside an
  existing page — with the missing content enumerated inside
  `finding.prototype`. Never one finding per missing field: that produces forty
  rows nobody can schedule, and it is the single most common way this backlog
  gets unusable.

- **What a stub happens to contain.** Frontend is captured with
  `STUB_MODE=true`, which swaps in fixture implementations of countries, ports,
  document uploads, the address book, transport reference data and
  import-reason/purpose (`src/server/app/docs/services.md:12-27`), and signs its
  own session as "Stub User" (`src/server/auth/stub-sign-in.js:16`). DR1's lists
  are equally fixtures, hard-coded under `app/data/`. So:
  - **A stub's contents are never a finding.** That Frontend's address book
    holds thirteen rows starting with "Astra Rosales"
    (`src/server/app/services/address-book/stub/index.js:11-24`) while DR1's
    holds different names says nothing about either design. Nor does a country
    list that omits a country, a port that is missing, or a document type that
    only one side offers **when the list itself is fixture data on both sides**.
  - **A stub's absence of a control may well be a finding.** The distinction is
    between the *data in* a control and the *existence of* a control, a link, a
    field or a state. Worked example: DR1's party picker renders an "add an
    address" link to `/address-book/add?from=<section>`
    (`app/routes.js:3598-3600`); Frontend's addresses feature renders no
    add-address link anywhere. That is not a fixture difference — it is a
    missing route out of the page — and it is a finding.
  - When you are unsure which side of that line something falls, ask whether
    swapping the fixture for real data would make the difference go away. If it
    would, it is not a finding.

- **Welsh copy.** Frontend ships a `copy.cy.js` beside every `copy.en.js` and
  DR1 has no Welsh at all — but neither application renders a language control
  anywhere (there is no language item in either service navigation,
  `src/server/app/shared/layout.njk:27-32` and
  `app/views/layouts/main.html:104-127`). There is no user-visible difference to
  compare, so Welsh translations are not a finding in this corpus. A finding
  about the *English* copy still stands on its own.

- **Any difference whose substance is the code.** Restating the rule above
  because it is the one most often broken under time pressure: "Frontend
  computes this in a controller and DR1 computes it in `routes.js`" is not a
  finding at any confidence.

### The volatile values this comparison must never compare

A volatile value is one whose text or pixels change between two captures of an
unchanged page. Every one of these is present in the captured DOM, so a naive
diff will report all of them and none of them is a finding.

**The rule: compare the field, never the value in it.** Compare that the control
exists, what it is labelled, what its hint says *around* the value, whether it
is required, what its format is, and where it sits. Never compare the rendered
value, and never compare a screenshot region whose only difference is one of
these.

- **The arrival date's valid window.** Both sides derive it from `new Date()`
  and both use the same rule — seven days back, six months forward. Frontend:
  `src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/arrival-window.js:18-27`,
  rendered into the date picker's bounds **and into the hint text** at
  `src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/port-of-entry.controller.js:97-101` via
  `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js:6-7` ("Enter a date between
  {earliest} and {latest}."). DR1:
  `app/routes.js:3927-3938` (`getArrivalDatePickerBounds`), fed into
  `minDate`/`maxDate` at `app/views/partials/arrival-date-picker.html:16-17`.
  **Note the nuance:** the *dates* in Frontend's hint are volatile, but the fact
  that Frontend states an explicit range while DR1's hint gives a fixed worked
  example ("For example, 27/3/2026",
  `app/views/partials/arrival-date-picker.html:13`) is a **copy difference that
  is entirely stable**, and is a legitimate finding. Compare the sentence
  shape, not the dates inside it.
- **The declaration date.** Both sides print today's date on the declaration
  page. Frontend:
  `src/server/app/sets/live-animals/journeys/linear/features/declaration/controller.js:29-44`,
  rendered at `src/server/app/sets/live-animals/journeys/linear/features/declaration/template.njk:41`. DR1: `app/routes.js:5633-5638`
  (`formatDeclarationDate`), rendered at `app/views/declaration.html:87`.
- **The notification reference, and the journey id in every URL.** Frontend
  mints a random reference per notification —
  `GBN-AG-<yy>-<6 Crockford base32 characters>`, from
  `src/server/app/services/persistence/records/stub/reference-number.js:9-18` —
  and **that reference is the journey id**
  (`src/server/app/services/persistence/records/stub/lifecycle/create.js:10-19`),
  so it appears in the path of every link, form action and back link on every
  journey page, as well as in the journey status strip
  (`src/server/app/shared/layout.njk:65-70`). DR1 uses the fixed literal
  `GBN-AG-26-7K8M2P` for the first notification (`app/routes.js:55-57`) but
  mints a random one for any subsequent notification
  (`app/routes.js:6745-6758`). **The format is comparable; the value never is.**
- **Created and submitted timestamps.** Frontend's dashboard rows show "Date
  created" and "Date submitted" formatted from `createdAt`/`submittedAt`
  (`src/server/app/sets/live-animals/journeys/linear/features/dashboard/view-model/row/index.js:21-22`),
  and both are set to the moment of capture
  (`src/server/app/services/persistence/records/stub/lifecycle/create.js:13`).
  DR1 sets the same fields at `app/routes.js:6152` and `app/routes.js:6165`.
- **Per-run ids minted from the clock or a UUID, wherever they surface in the
  DOM.** DR1 mints `submitted-${Date.now()}` for a submitted notification
  (`app/routes.js:6175`, and it appears in dashboard hrefs as `?submittedId=`),
  `doc-${Date.now()}-N` for an uploaded document (`app/routes.js:9161`) along
  with an `addedAt` of `Date.now()` (`:9168`),
  `added-transporter-${Date.now()}` (`app/routes.js:3119`, `:3244`),
  `address-book-added-${Date.now()}` (`app/routes.js:7953`, `:8134`) and
  `consignment-added-${Date.now()}` (`app/routes.js:8108`, `:1115`). Frontend
  mints a `randomUUID()` per upload
  (`src/server/app/services/document-uploads/stub.js:1,41`) and renders it into
  the download href and a `data-upload-id` attribute
  (`src/server/app/sets/live-animals/journeys/linear/features/documents/view-model/rows.js:13-14,41-42`).
- **Frontend's CSRF token.** Rendered into every page as a
  `<meta name="csrf-token">` tag carrying the session crumb
  (`src/server/app/shared/layout.njk:13`) and into every form. Per session, so it
  differs between any two captures. DR1 has no equivalent, and **that is not a
  finding either** — it is a security mechanism a prototype has no reason to
  carry.

If a difference you are about to raise disappears when you substitute one of
these values for the other side's, it was never a finding.

## The address book

**This is an open scope question and this run is what settles it.** Read this
before writing anything in the `address-book` domain.

The facts. DR1 has five address-book screens — `dr1-address-book`,
`dr1-address-book-add`, `dr1-address-book-lookup`, `dr1-address-book-view` and
`dr1-address-book-edit` — and they are unmistakably part of DR1's journey, not
some other release's. The service navigation's address-book link defaults to
`/address-book` (`app/views/layouts/main.html:16`, the fallback used when no
release has overridden `serviceNavAddressBookHref`), and the address book is
also DR1's only route into adding a consignment address: the party picker's "add
an address" link points at `/address-book/add?from=<section>` for every session
that is not DR2.1 (`app/routes.js:3598-3600`).

Frontend has **no** address-book screen at all — its 31 screens are the
notification journey — and that UI is being built in a different service
(`trade-imports-ins-frontend`, the Import Notification Service front door).
Frontend's addresses feature renders no add-address link of any kind.

Two previous runs excluded these five screens on reasoning that does not survive
reading the code, and both then reported complete coverage against a list short
by five. **This run photographs them.** Deciding they are out of scope is a
legitimate answer; inheriting an exclusion whose stated reason is wrong is not.

What to do, once you have looked at the pictures:

- **If the pictures show the address book is in scope for this frontend** —
  write **one** finding, `type: "add-page"`, `domain: "address-book"`,
  `band: "needs-backend"` if it depends on the address-book API and
  `frontend-work` if it does not. Enumerate all five screens and what each one
  asks for inside `finding.prototype`. **Do not write five findings, and do not
  write one finding per field on the add form.** Name all five screen ids in
  `screens`. If the sharper point turns out to be the missing route rather than
  the missing pages — that a user on a party picker has no way to add an address
  at all — say that in `finding.difference` and cite
  `app/routes.js:3598-3600`; it is the same finding, better stated.
- **If the pictures show it is out of scope** — because the work belongs to
  another service and DR1's screens describe that service rather than this one —
  **say so once**, in the `address-book` slice, as a single stated observation
  with the evidence that settles it. Do not silently drop the five screens: an
  unexplained absence is exactly what went wrong twice already. A stated
  absence — "these five screens are DR1's, they were photographed, and here is
  why they are not this frontend's work" — is a real answer this run records.

Either way, the five screens are accounted for, in writing, by the slice that
owns them.

## Splitting and merging

One finding, one change a person could make. If your sentence contains "and
also", you have two findings.

The exception is a finding whose whole point is that a page is missing or a
whole block of content is absent. Do not shard those into one finding per field
— that produces forty findings nobody can schedule. One `add-page` finding, with
the missing content enumerated inside `finding.prototype`.

## Verification

A different agent verifies than wrote, and the question it answers is **"is this
finding correct"**, never "do we want it". Against a signed-off design the second
question is closed, and a verifier that starts answering it is running an
adjudication nobody asked for. A verifier that cannot falsify a finding leaves
it alone.

**Every finding gets a `finding.verification` line, including the ones that
survive untouched.** One line saying what the verifier opened and what it ran.
This matters more than it looks: a correction leaves a trace when it fires and
the non-firing case leaves none, so without this line nothing distinguishes a
verifier that found nothing from a verifier that looked at nothing. `tim parity
ingest` refuses a finding that has no such line, and this corpus sets
`requireVerification`.

A verifier that finds an error adds `finding.correction` — what was claimed,
what is actually true, and how it was checked. Where the claim is simply wrong,
fix the slot **and** record the correction: the record of what was claimed is
worth more than a clean-looking file. Where the claim stands but is overstated,
understated or mis-cited, leave the slot and say so in the correction. Where the
finding does not survive at all, band it as `disputed` and say in `difference`
exactly what would settle it.

The three highest-yield checks in this corpus, in order:

1. **Did the author cite a root view on the DR1 side?** A path containing
   `design-release-2`, `design-release-2.1` or `testing` falsifies the finding
   on the spot.
2. **Did the author check the conditional reveals before claiming an absence?**
   Any "DR1 does not ask for X" needs a grep of the containing page and
   `app/views/partials/` in the verification line.
3. **Is the difference actually one of the volatile values above?** A finding
   about a date, a reference or an id is almost always this.

## Two rules about the file itself

**Verify before the first ingest.** `tim parity ingest` composes `detail` from
the four prose slots the first time it sees a finding, and `detail` is frozen
from that moment — it is the only oracle proving a later language pass lost
nothing. A re-ingest that would change an existing `detail` refuses and names
the increment. So the four slots must be right before the first ingest;
afterwards they move only through `tim parity set-slot`, and `correction` is the
slot that stays open.

**Do not rename a finding file.** The increment id is bound to the file name. A
rename reads as "old finding struck, new finding added", the id changes, and any
ruling or citation attached to the old id is orphaned.
