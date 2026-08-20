# `service-wide` — comparing the two readings

**dr1b: 15 findings (inc-095…inc-109). dr1: 11 findings (inc-001, inc-110…inc-119).**

Compared by subject across **both backlogs whole**, not by the `service-wide`
label. That mattered: five of dr1b's service-wide findings have a dr1
counterpart filed under `review`, and dr1's one service-wide address-label
finding is covered by dr1b under `transport` and `identification`. Comparing
label-to-label would have manufactured ten false gaps.

## Headline

| | count |
|---|---|
| dr1b findings **wrong** | **0** |
| dr1b findings **overstated** | **0** |
| dr1b findings **sound** | **15** |
| Real subjects dr1b found and dr1 did not | **3** |
| Real subjects dr1 found and dr1b did not | **5** (4 whole, 1 partial) |
| Substantive contradictions | **0** |
| Numeric contradictions | **7** — dr1b right on every one |

**Contamination note.** None of the three firewall breaches in `PROVENANCE.md`
touches this domain. The `hub`-slice leak affected `inc-050`; the manifest and
crop leaks affected the pairing agent only. Every agreement recorded below is
two independent readings, and can be weighed normally.

## The subject map

| Subject | dr1b | dr1 | Verdict |
|---|---|---|---|
| Breadcrumb trail | inc-095 | inc-110 | agree |
| Date of declaration on the confirmation page | inc-096 | inc-098 `[review]` | agree |
| Dashboard names itself (title + caption) | inc-097 | inc-111 (+ inc-117 mention) | agree |
| Declaration: accountability bullets | inc-098 | inc-102 `[review]` | agree |
| Declaration: Regulation (EU) 2017/625 | inc-099 | inc-102 `[review]` | agree |
| Declaration: responsibility clause | inc-100 | inc-102 `[review]` | agree |
| Status strip on the declaration page | **inc-101** | — | dr1b only, real |
| "hub" vs "overview" | inc-102 | inc-116 | agree |
| Alpha phase banner | inc-103 | inc-114 | agree |
| Which pages offer save-and-leave (`disputed`) | **inc-104** | — | dr1b only, real |
| Section caption above the heading | inc-105 | inc-117 | agree |
| Service-navigation menu | inc-106 | inc-118 | agree |
| "Create a new notification" link | inc-107 | inc-097 `[review]` | agree |
| Outstanding-tasks section after submitting | inc-108 | inc-100 `[review]` | agree |
| Content-column width | **inc-109** | — | dr1b only, real |
| Back link on the overview page | — | **inc-112** | dr1 only, real |
| Title format `Page - Service - GOV.UK` | — | **inc-113** | dr1 only, real |
| Caption wording "Consignment addresses" | partial, inside inc-105 | **inc-115** | dr1 only as a change |
| Status strip missing on the origin page | declined in inc-101's verification | **inc-119** | dr1 only, real |
| HMRC contact link on the confirmation page | — | **inc-099** `[review]` | dr1 only, real |
| Postcode / phone labels across address forms | inc-067, inc-115, inc-116 | inc-001 | agree; dr1b more complete |

---

## 1. Is anything in `dr1b` wrong?

**Nothing.** All fifteen are **sound**. I re-derived every count that any
finding rests on, from the shared evidence rather than from either backlog.

### Counts I re-derived and confirmed

The capture set is **40 frontend / 42 prototype** —
`dr1b-parity/capture/html/frontend/` and `.../prototype/` — which is what every
dr1b finding says.

| Claim | dr1b says | Measured | |
|---|---|---|---|
| Frontend DOMs with `govuk-breadcrumbs` | 37 of 40 | 37 | ✅ |
| The three without | the hub states | `fe-hub`, `fe-hub-no-commodity`, `fe-hub-exit-details-blocked` | ✅ |
| Frontend DOMs with `govuk-back-link` | 37, disjoint set | 37; the three without are `fe-confirmation` + both dashboards | ✅ |
| ⇒ screens carrying both | 34 | 34 | ✅ |
| `fe-dashboard-populated` breadcrumb items | zero | `<nav class="govuk-breadcrumbs" aria-label="Breadcrumb">` wrapping a `govuk-breadcrumbs__list` with **0** `__list-item` | ✅ |
| Frontend `<title>` repeats | only the 2 dashboards | 2 × `Import notification service \| Import notification service`; the other 38 each name their page | ✅ |
| Prototype root views declaring `govukPhaseBanner` | 29 of 30 | 30 root views, 29 with the banner | ✅ |
| Prototype DOMs with `govuk-phase-banner` | 42 | 42 | ✅ |
| Frontend DOMs with a phase banner | 0 | 0 | ✅ |
| `Save and return to hub` | 24 of 40 | 24 | ✅ |
| `Save and return to overview` | 26 of 42 | 26 | ✅ |
| Visible "hub" text anywhere in the frontend | only the 24 cancel links | `>…hub<` across all 40 DOMs returns exactly `24 >Cancel and return to hub<` | ✅ |
| Frontend page captions | 5, all `Consignment addresses` | `5 govuk-caption-l">Consignment addresses` | ✅ |
| Prototype page captions | 36 of 42, of which 32 name a part of the notification | 36 (excluding the two `app-notification-hub-card__caption` labels), 4 of them `Dashboard` ⇒ 32 | ✅ |
| Prototype caption breakdown 11 / 6 / 7 / 3 / 2 / 2 / 1 | as enumerated | origin 1 + what-importing 2 + reason 6 + consignment-details 1 + animal-id 1 = **11**; roles 3 + address-select 1 + cph 1 + permanent-address 1 = **6**; upload **7**; transporter-add **3**; transporter + arrival **2**; transit **2**; additional-details **1** | ✅ every bucket |
| Frontend `govuk-service-navigation__link` | 40 files × 1 | 40 files × 1 | ✅ |
| Prototype nav on `dr1-declaration` | 4 items + service name | `/`, `/address-book`, `#`, `#` + the service-name link | ✅ |
| Frontend `app-journey-strip` | on the declaration | present; `dr1-declaration.html` has **0** `app-notification-status` | ✅ |
| Prototype status strip | 34 of 42 | 34 | ✅ |
| Frontend `govuk-grid-column-two-thirds` | all 40 | 40 | ✅ |
| Frontend `govuk-grid-column-full` | only the 2 dashboards | `fe-dashboard-empty`, `fe-dashboard-populated` | ✅ |

### The one inaccuracy I found, and why it changes nothing

`inc-109`'s **verification note** says "on DR1, 30 of 42 captures carry
`govuk-grid-column-full`". The true figure is **31** — eleven prototype DOMs
lack the class (`dr1-additional-animal-details`, `dr1-arrival-details`,
`dr1-contact-address-for-consignment`, `dr1-declaration`,
`dr1-notification-submitted`, `dr1-origin-of-the-import`, the three
`dr1-roles-and-addresses` states, and both `dr1-what-are-you-importing`
states). Off by one, in a supporting number inside a verification line, in a
sentence whose whole purpose is to say *the class count is not what the finding
rests on*. No slot carries it. It does not touch the finding.

`inc-109` also cites `dashboard/controller.js:70` where
`contentColumnClass: surfaceClass('display')` is on **line 71**.

### Where a finding could have overstated and did not

`inc-104` is banded **`disputed`**, not as work, and its `difference` slot says
so in the first sentence. That is the right band: DR1 genuinely contradicts
itself here, and I confirmed the contradiction rather than the finding's
description of it. See question 2.

`inc-109` had the strongest temptation to overstate — 31 wide-markup screens
against 40 narrow ones is a headline. Its verifier **narrowed it to 15**
because the grid class is not what the user meets, and the narrowing is
correct: `dr1-reason-for-import` carries `govuk-grid-column-full` and renders
its radios and hints inside ~630 px, because
`~/git/defra/defra-design/GB-notification-service/app/assets/sass/application.scss`
caps inner elements at `max-width: 630px` in about seventy places. The
screenshot bears it out — the longest hint on that page ("For animals moving
through Great Britain…") wraps at the same column edge the frontend uses. A
finding that resisted its own best number is the opposite of overstated.

---

## 2. What did `dr1b` find that `dr1` missed?

Three subjects. All three are real; I established each from evidence dr1 had
equally, so these are genuine misses rather than differences of scope.

### 2.1 `inc-109` — the content column is two-thirds on all 40 screens (the one the brief flagged)

**Real, and dr1 has nothing on it anywhere.** I searched dr1's whole backlog
for `two-thirds|grid-column|full width|full-width|contentColumnClass|SURFACES`
— five hits, all coincidental (a CPH example, dashboard button labels, a
country dropdown). No width finding exists in dr1's 133.

How I checked, in three independent ways:

1. **Markup, both sides.** `govuk-grid-column-two-thirds` is the content column
   in all 40 frontend captures. `govuk-grid-column-full` appears in exactly two
   — the dashboards. On the prototype side 31 of 42 carry
   `govuk-grid-column-full`.

2. **Source, and this is what settles it.** The width is decided once for the
   whole service and no page can ask for anything else:

   ```js
   // src/server/app/shared/kit.js:19-22
   export const SURFACES = Object.freeze({
     form: 'govuk-grid-column-two-thirds',
     display: 'govuk-grid-column-full'
   })
   ```
   ```js
   // src/server/app/shared/kit.js:122, inside kit.base()
   contentColumnClass: SURFACES.form
   ```

   `grep -rn contentColumnClass src/server/` returns six hits: `kit.js:122`
   (hard-coded), `layout.njk:57` (prints it),
   `dashboard/controller.js:71` (`surfaceClass('display')` — the **only**
   override in the service), and three test files. The wide surface exists, is
   already proven on one page, and every other page inherits the narrow one
   whatever it holds. That is exactly what the finding says.

3. **Pixels.** `fe-check-answers.png` (1280 wide): the summary cards run
   ~155→~790 px, **~635 px**, and values wrap onto three and four lines
   ("Region of origin code required"; every address onto four).
   `dr1-review-notification.png`: the same cards run ~156→~1104 px, **~948 px**,
   and nothing wraps. dr1b's stated ~636 and ~948 are right.

**Verdict: real, and dr1 missed it outright.** It is also the largest single
change in the domain — one option on `kit.base` plus a `display` surface on
seven controllers — and dr1's backlog would have shipped the whole service at
paragraph width.

### 2.2 `inc-101` — the Draft strip is still on the frontend's declaration page

`fe-declaration.html` renders `app-journey-strip` (blue `govuk-tag--blue`
"Draft" + the reference) directly above the `<h1>`. `dr1-declaration.html`
contains **no** `app-notification-status` at all. Confirmed as a DR1 decision
rather than a capture state: 34 of DR1's 42 captures carry the strip, and
`app/views/declaration.html` simply does not include the partial that
`origin-of-the-import.html` includes at line 29.

dr1 has no finding on this. Its only status-strip finding, `inc-119`, runs the
**other way** (see 3.4).

### 2.3 `inc-104` — which pages offer save-and-leave, banded `disputed`

**Real, and the corrected numbers are exact.** This is the one dr1b finding
whose original slots the verifier had to rewrite, so I re-derived every figure:

- Frontend: 24 of 40 carry `Save and return to hub`. The 16 without are the
  five address pickers plus `fe-hub` ×3, both dashboards, `fe-check-answers`,
  `fe-check-answers-submitted`, `fe-declaration`, `fe-confirmation`,
  `fe-delete-notification`, `fe-cancel-amend` — **11 non-question pages**, and
  the pickers are the only journey question pages among them. ✅ matches the
  corrected slot exactly.
- Prototype: 26 of 42 carry `Save and return to overview`. The 16 without are
  the four dashboards, `dr1-notification-hub`, `dr1-notification-submitted`,
  `dr1-declaration` and both review states — **9 non-question pages** — leaving
  **exactly 7** journey question pages: `origin-of-the-import`, `cph-number`,
  `contact-address-for-consignment`, `consignment-address-select`,
  `transporter-add`, `transporter-add-commercial`, `transporter-add-private`.
  ✅
- **Five divergent pairs**, not three. Against `dr1b-parity/pairs.cjs`:
  `fe-origin`↔`dr1-origin-of-the-import`, `fe-cph-number`↔`dr1-cph-number`,
  `fe-contact`↔`dr1-contact-address-for-consignment`,
  `fe-transporter-type`↔`dr1-transporter-add`,
  `fe-transporter-private`↔`dr1-transporter-add-private`. All five frontend
  screens carry the trio; all five DR1 screens do not.
  `dr1-transporter-add-commercial` is `onlyPrototype` so raises no pair, and
  `dr1-consignment-address-select` is not divergent because the frontend's
  pickers do not offer the actions either. **Exactly five.** ✅
- **DR1's four different endings** — the substance of the dispute — confirmed
  from the DOM: `dr1-transporter-add` and `dr1-contact-address-for-consignment`
  both end with a bare `<button …>Continue</button>`;
  `dr1-transporter-add-private` ends with `Cancel and return to dashboard`;
  `origin` and `cph-number` end with `Save and continue` alone.

dr1 saw a fragment of this and did not raise it. Buried in `inc-116`'s prose:
*"DR1 is not uniform about how many actions a page gets: origin, CPH, contact,
the declaration and the review page offer only 'Save and continue'."* That is a
remark, not a finding, and it names five pages where there are seven. dr1b
turned the same observation into a decision somebody can close.

---

## 3. What did `dr1` find that `dr1b` missed?

Five subjects. All five are real. Four are whole gaps; one is partial.

### 3.1 `inc-112` — the frontend puts a back link on the overview; DR1's overview has none

**Real.** `fe-hub.html` contains one `govuk-back-link`. The six prototype
captures with **no** back link are `dr1-dashboard` ×4,
`dr1-notification-hub` and `dr1-notification-submitted` — every page that is a
starting point rather than a step. dr1's characterisation is exactly right, and
its sequencing note (do not remove it until the nav carries Dashboard) is the
same dependency dr1b's `inc-095` records for the breadcrumb.

dr1b has nothing on this — a notable gap, since `inc-095` and `inc-106` between
them work out that the frontend's routes-back are wrong, and never notice that
the frontend has a route back DR1 deliberately does not.

### 3.2 `inc-113` — the page-title format

**Real.** All 42 prototype captures title as
`… - Import notification service - GOV.UK`; all 40 frontend captures use
`… | Import notification service`, with no `GOV.UK` suffix. (The prototype's
`<title>` spans three lines, which is why a naive one-line grep misses it —
worth recording, because it is a plausible reason dr1b never saw this.)

dr1b has **no** title-format finding anywhere in its 124. Its `inc-097`
inspects the `<title>` of all 40 frontend captures and quotes DR1's
`Dashboard - Import notification service - GOV.UK` in full — it had the
separator and the suffix under its eyes and read past both.

dr1's own caveat is fair and worth carrying forward: this format is the
Prototype Kit's default composition rather than something DR1's designers
authored, so DR1 is weak evidence on its own — but it is also the GOV.UK
Design System's documented convention, which the pipe form is not.

### 3.3 `inc-099` `[review]` — the HMRC contact link

**Real.** `fe-confirmation.html` links "contact HMRC" to
`…/hm-revenue-customs/contact` — HMRC's contact index for every tax and
helpline. `dr1-notification-submitted.html` links the same words to
`…/hm-revenue-customs/contact/customs-international-trade-and-excise-enquiries`.
One attribute, one template.

dr1b has no HMRC finding anywhere (`test("HMRC")` over all 124 returns
nothing), despite writing **three** findings about this exact screen pair
(`inc-096`, `inc-107`, `inc-108`). The confirmation page was read closely and
this was still missed.

### 3.4 `inc-119` — the frontend withholds the Draft strip on the origin page

**Real, and dr1b explicitly considered it and let it go for the wrong reason.**

Four frontend captures lack `app-journey-strip`: `fe-confirmation`, both
dashboards, and **`fe-origin`**. `dr1-origin-of-the-import.html` carries the
strip.

dr1b's `inc-101` verification says:

> *"fe-origin also lacks the strip where dr1-origin-of-the-import has it, but
> the frontend builds the strip generically in kit.js, so that absence is more
> likely a state of the capture than a design difference, and I could not
> settle it without running the application."*

The source settles it in ten lines, without running anything:

```js
// src/server/app/sets/live-animals/journeys/linear/features/origin/controller.js:88-89
const journeyIfStarted = (journey, answers) =>
  hasCommittedNotificationAnswers(answers) ? journey : undefined
```

`render` passes `journey: journeyIfStarted(journey, answers)` into `kit.base`,
so on a notification with no committed answers the journey never reaches the
layout and the strip is suppressed. It is a deliberate guard, not a capture
artefact. dr1 traced it to the same two lines and reached the right answer.

This is the one place in the domain where a dr1b agent's *stated reason* for
not raising something is wrong on the evidence.

### 3.5 `inc-115` — the frontend's five captions name the wrong section (partial)

The frontend's only captions read `Consignment addresses` (5 × `govuk-caption-l`,
all five pickers). DR1 captions the paired page `Consignment parties`, and uses
that same caption on roles-and-addresses ×3, cph-number and permanent-address —
one section name across six screens. dr1 raises this as a change of its own.

dr1b's `inc-105` has **both halves in its slots** — its frontend slot quotes
"Consignment addresses", its prototype slot lists "Consignment parties" on six
screens — but its `difference` only asks for captions to be *added* to the
pages that lack one. Whether the five that already have one are supposed to be
relabelled is left for the implementer to infer. Partial coverage, not a clean
miss, but a change someone could ship without making.

### Not a gap: dr1's `inc-001` (postcode / phone labels)

dr1 files this `service-wide` because the same two strings are authored twice.
dr1b covers both instances — `inc-116` `[transport]` (postcode on the private
transporter form) and `inc-067` `[identification]` (postcode **and** phone on
the permanent-address form) — plus `inc-115` `[transport]` for the missing
international-dialling hint. dr1b's coverage is **more** complete: it also
catches the field-order difference (frontend puts phone before email, DR1 the
reverse) and the error messages that repeat the label. What is lost is dr1's
service-wide framing — *the same string is authored twice, so fix both in one
pass* — which nothing in dr1b says.

---

## 4. Where they contradict each other, which is right?

**No substantive contradiction exists in this domain.** Every shared subject
agrees on direction and on band. What they contradict on is **numbers**, and
there dr1b is right seven times out of seven.

### The systematic cause

**dr1's service-wide findings were authored against a smaller capture set and
never re-derived.** They speak of *"33 captured screens"* on the frontend and
*"40 captured DR1 screens"*. The shared evidence holds **40 and 42**, and so
does dr1's own `dr1-parity/capture/html/` — 40 frontend files, 42 prototype
files. dr1's prose is stale against the very corpus it sits beside.

Every count in dr1's eleven is wrong as a result:

| Subject | dr1 says | Truth | Right |
|---|---|---|---|
| Breadcrumb trails with items | 30 of 33 | 35 of 40 (37 with markup, 2 empty) | dr1b |
| Screens with no breadcrumb markup | *"only the overview page"* | three — `fe-hub`, `fe-hub-no-commodity`, `fe-hub-exit-details-blocked` | dr1b |
| Frontend save-trio | 20 of 33 | 24 of 40 | dr1b (inc-102) |
| DR1 save-pair | 25 of 40 | 26 of 42 | dr1b (inc-102) |
| Frontend pages with no caption | 28 of 33 | 35 of 40 | dr1b (inc-105) |
| DR1 pages with a caption | 35 of 40 | 36 of 42 | dr1b (inc-105) |
| DR1 pages with **no** caption | 5 | 6 — dr1 counts one review state where the corpus has two | dr1b (inc-105) |
| Frontend status strip | 29 of 33 | 36 of 40 | dr1b (inc-101) |
| Phase banner / nav coverage | "33" and "40" | 40 and 42 | dr1b |

Three of dr1's counts are right *in kind* — the sets it describes are the right
sets, only the denominators are stale. `inc-112`'s "six DR1 screens without a
back link" is exactly right against the 42-screen evidence, which is why that
finding survives intact.

### The one place a count decided something

`inc-104`'s dispute turns on **how many pairs diverge**. dr1b's author said
three, its verifier said five, and I confirmed **five** from `pairs.cjs` and
the DOMs. Had it stayed at three, `fe-transporter-type` and `fe-contact` would
have gone unmentioned and the dispute would have looked narrower than it is.
The verifier's correction is the reason the finding is now settleable.

### Direction and band: no disagreement at all

On all twelve shared subjects the two runs point the same way and, where both
band it, band it the same. `inc-104` and `inc-109` have no dr1 counterpart, so
no band can conflict. There is no subject in this domain where the evidence
favours dr1's reading over dr1b's.

---

## What this means for the domain

dr1b's `service-wide` slice is **more accurate than dr1's and slightly less
complete**. Every number in it holds; every number in dr1's is stale. It found
the single largest change in the domain — the content-column width — which dr1
did not see at all, and it turned DR1's save-action inconsistency into a
question a designer can answer.

Against that it dropped four whole subjects dr1 caught, and one of the four
(`inc-119`, the origin page's suppressed status strip) it examined, described
correctly, and then declined on a reason the source refutes. Two of the four
(`inc-112` back link on the overview, `inc-113` title format) sit in areas dr1b
studied closely, which makes them misses rather than differences of scope.

**Union of the two readings, per subject: 20 subjects. dr1b carries 15, dr1
carries 16, both carry 11.** Neither backlog is complete on its own.
