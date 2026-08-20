# `review` — comparing the two readings

Domain counts: **`dr1` 15** (inc-095…inc-109), **`dr1b` 12** (inc-083…inc-094).

The counts do not compare directly, because the two runs cut the domain
boundary in different places. Four subjects `dr1` filed under `review` — the
confirmation page's two missing blocks, its repeated declaration date, and the
declaration wording — `dr1b` files under `service-wide`. Compared by subject
rather than by domain, the picture is:

| | count |
|---|---|
| Subjects both runs cover | 13 |
| …of which `dr1b` files outside `review` | 4 |
| `dr1b`-only subjects | 3 |
| `dr1`-only subjects | 2 |
| Substantive contradictions | 1 (mechanism), 2 (framing only) |

Nothing in `dr1b`'s `review` domain is **wrong**. Two headlines are
**overstated** against their own bodies. The one real contradiction of fact
between the runs is settled **for `dr1b`**.

The provenance carve-out (the `hub` slice's leaked file names) does not touch
this domain. Every agreement below is between two independent readings.

---

## Subject map

| Subject | `dr1` | `dr1b` | Verdict |
|---|---|---|---|
| Arrival date row label contradicts DR1's own question page | inc-095 `disputed` | inc-083 `disputed` | Agree, both correct, both refuse to pick a side |
| Change link per row vs per card | inc-096 | inc-084 | Agree; `dr1` has the cleaner headline, `dr1b` the fuller body |
| Documents section dropped when empty | inc-103 | inc-085 | Agree |
| Incomplete notification has no review state | inc-104 | inc-087 | **Contradict on mechanism — `dr1b` right** |
| "Means of transport" shortened | inc-105 | inc-088 | Agree |
| "Not provided" vs "Not applicable" | inc-106 | inc-094 | Agree |
| Six-section spine | inc-107 ("four") | inc-091 ("three") | Agree substantively; both counts defensible, neither complete |
| Submit form still shown on a submitted notification | inc-108 | inc-093 | **Agree, and both are right — see Q1** |
| Submit heading + sentence above Continue | inc-109 | inc-092 | Agree |
| Confirmation offers no "Create a new notification" | inc-097 | inc-107 (`service-wide`) | Agree |
| Confirmation repeats the declaration date | inc-098 | inc-096 (`service-wide`) | Agree |
| Confirmation says nothing about outstanding items | inc-100 | inc-108 (`service-wide`) | Agree |
| Declaration wording shortened | inc-102 (one finding) | inc-098 + inc-099 + inc-100 (`service-wide`) | Agree; `dr1b` splits it three ways |
| Reason-dependent rows never shown back | — | **inc-086** | `dr1b`-only, **real** |
| Page heading "Check your answers" vs "Review your notification" | — | **inc-089** | `dr1b`-only, **real** |
| "Region of origin code required" row | — | **inc-090** | `dr1b`-only, **real** |
| Confirmation's HMRC link destination | **inc-099** | — | `dr1`-only, **real** — gap in `dr1b` |
| Contact address row keyed "Address" | **inc-101** | — | `dr1`-only, **real** — gap in `dr1b` |

---

## 1. Is anything in `dr1b` wrong?

Nothing is wrong. Every one of the twelve was re-checked against the captured
DOM or the source. Two headlines overstate their own bodies.

### `dr1b` inc-084 — "the frontend puts a Change link on every row" — **overstated (headline only)**

The body is exact and the headline is not. Counted directly:

```
grep -c ">Change<" capture/html/frontend/fe-check-answers.html      → 28
grep -c "Change</a>" capture/html/prototype/dr1-review-notification.html → 11
```

The body says 26 row-level links plus the species card's two title links,
which is the 28. But five rows — the whole species card
(`fe-check-answers.html:253-292`) — carry no action at all, so "every row" is
not true and the finding's own `correction` says so. The claim of "two
identically-labelled" links on the species card is also loose: both read
`Change` visibly, but the visually hidden suffixes differ —
`commodity 1` and `animal identifiers for commodity 1`
(`fe-check-answers.html:243,246`). The sighted-user complaint holds; the word
"identically" does not survive a screen reader.

`dr1`'s inc-096 headline — "28 of them against DR1's 11" — is the more accurate
of the two, and both numbers verify exactly.

### `dr1b` inc-091 — "the frontend uses three [sections]" — **overstated (headline only)**

The captured page renders three numbered headings and no more:

```
fe-check-answers.html:120  <h2 class="govuk-heading-m">1. About the consignment</h2>
fe-check-answers.html:313  <h2 class="govuk-heading-m">2. Movement</h2>
fe-check-answers.html:462  <h2 class="govuk-heading-m">3. Addresses</h2>
```

The code defines four. `view-model/index.js:15-20` returns
`[aboutConsignment, movement, addresses, ...(documents ? [documents] : [])]`.
So `dr1b`'s headline describes the picture and `dr1`'s inc-107 headline ("four
sections") describes the source; the fourth is absent from the capture for the
reason both runs independently found and filed — the documents section is
dropped when the collection is empty (`dr1b` inc-085, `dr1` inc-103).
`dr1b`'s body states the conditional fourth explicitly. Neither headline is
false; each is incomplete without the other's caveat.

Everything else — inc-083, inc-085, inc-086, inc-087, inc-088, inc-089,
inc-090, inc-092, inc-093, inc-094 — is **sound**, and inc-086, inc-087,
inc-089, inc-090 and inc-093 were re-derived from source here rather than
accepted.

---

## 2. What did `dr1b` find that `dr1` missed?

Three subjects. All three are real.

### inc-086 — the exit answers are collected and never shown back — **real**

*This is the item the spawn brief flagged: `dr1b`'s verifier added it after the
author deferred it as belonging to another slice.* The deferral was a dodge and
the verifier was right to say so.

`dr1` has eight findings that mention exit date, port of exit or destination
country (inc-056, inc-057, inc-080, inc-083, inc-087, inc-089, inc-093,
inc-094 — all `hub` or `origin`). Not one of them says the review page omits
the answers. `dr1` has no such finding.

The claim checks out completely:

```
grep -rn "exitDate|portOfExit|destinationCountry" .../features/check-answers/
→ (no output)
```

Nothing in the whole `check-answers` feature — not the view model, not the
copy, not even the tests — mentions any of the three. The card that would hold
them,
`view-model/cards/consignment/additional-animal-details.js`, has exactly four
rows: `animalsCertifiedFor`, `containsUnweanedAnimals` (conditional),
`reasonForImport`, `purposeInInternalMarket` (conditional). The three questions
are real pages that really collect the answers —
`features/exit-date/` binds `exitDate` in its own `evaluation.js`, `page.js`,
`controller.js` and `template.njk`.

DR1 does the opposite, and the source is unambiguous
(`app/routes.js:4634-4668`):

```js
if (sessionData.importReason === 'Temporary admission horses') {
  importReasonRows.push({ key: 'Exit date',    value: … })
  importReasonRows.push({ key: 'Port of exit', value: … })
}
```

with equivalents for `Transhipment or onward travel` and `Transit`.

So: a user importing horses on temporary admission answers where and when the
consignment leaves, then reaches the last page before the declaration with no
row for either answer and no Change link to correct one. Substantive,
user-facing, and missed by `dr1` entirely. `dr1b`'s `medium` confidence is
correctly placed — neither capture is a transit or temporary-admission
notification, so both halves are proven from source and observed in neither.

**This is the single strongest result of the comparison for this domain.** It
is exactly the class of gap the brief predicted: `dr1` sliced the exit
questions into `origin`, sliced the review page into `review`, and the
consequence that spans the two fell between the owners.

### inc-089 — the page's own heading — **real**

```
fe-check-answers.html:3    <title>Check your answers | Import notification service</title>
fe-check-answers.html:116  <h1 class="govuk-heading-l">Check your answers</h1>
dr1-review-notification.html:251  <h1 class="app-review-notification-page__title">Review your notification</h1>
```

`dr1` never mentions it. Ten `dr1` findings contain the strings "Check your
answers" or "Review your notification" in passing; none of them is about the
heading. This is the most visible single string on the page and the earlier run
walked past it.

### inc-090 — the "Region of origin code required" row — **real**

The frontend's Import details card renders four rows; DR1's renders three.

```
fe-check-answers.html:143-152   Region of origin code required / No
dr1-review-notification.html:272-315  Country of origin, Region of origin code, Internal reference number
```

So the frontend spends two of four rows saying, twice over, that there is no
code. `dr1` has three region-of-origin findings (inc-086, inc-091, inc-092) and
none is this one.

---

## 3. What did `dr1` find that `dr1b` missed?

Two subjects. Both are real, so both are genuine coverage gaps in `dr1b`.

### `dr1` inc-099 — the confirmation page's HMRC link — **real, and `dr1b` misses it entirely**

```
fe-confirmation.html:141
  href="https://www.gov.uk/government/organisations/hm-revenue-customs/contact"

dr1-notification-submitted.html:288
  href="https://www.gov.uk/government/organisations/hm-revenue-customs/contact/
        customs-international-trade-and-excise-enquiries"
  rel="noreferrer noopener" target="_blank"
```

Same link text, different destination: the frontend drops the user on HMRC's
general contact index, DR1 on the customs, international trade and excise
enquiries page. A `grep -ril hmrc` across both run directories returns hits
only under `EUDPA-328-DR1`; `dr1b` has no finding on this anywhere, in any
domain. `dr1b` also misses the `target="_blank"` difference that `dr1`'s
finding does not mention either.

### `dr1` inc-101 — the contact address row key — **real, and `dr1b` misses it**

```
fe-check-answers.html:551   <dt …__key">Address</dt>
dr1-review-notification.html:1155  <dt class="app-review-card__key">Contact address</dt>
```

Small, but it is a plain copy difference on a captured pair. `dr1b`'s only
"Contact address" findings are hub task names (inc-055, inc-057), not the
review row.

Both gaps sit in the same place — the tail of the journey, `dr1b`'s boundary
between `review` and `service-wide`. `dr1b` covered the confirmation page's
structural differences under `service-wide` (inc-096, inc-107, inc-108) but
did not sweep its links, and covered the contact card's placement (inc-091's
section 6) but not its row key.

---

## 4. Where they contradict each other, which is right?

### The one real contradiction: can the frontend's review page be opened while incomplete?

**`dr1b` is right. `dr1` is wrong on the mechanism.**

`dr1` inc-104: *"The whole review section — Check your answers, the declaration
and the confirmation — sits behind one gate: `gate: (scope) =>
scope.readyForCheckYourAnswers` in `flow/flow.js:81-85`… **Until then the page
cannot be opened**"*, and the title says *"an incomplete notification has no
review page at all."*

`dr1b` inc-087: *"The route is ungated — `controller.js:94` hands the GET
straight to the renderer with no readiness check — so a user who types the URL
does reach it… the state exists but is unreachable by any route a user would
find."*

Settled from source. The gate exists exactly where `dr1` cites it
(`flow/flow.js:83`), but nothing on the HTTP path consults it. The only two
non-test consumers of `sectionGatePasses` in the whole codebase are:

```
sets/live-animals/journeys/linear/features/hub/controller.js:81
analysis/simulate.js:8
```

— the hub's row rendering, and an offline analysis tool. The route's own
handler is `const get = async (request, h) => renderNotificationView(request, h)`
(`check-answers/controller.js:94`), with no pre-handler. The one journey-wide
pre-handler, `flow/entry-guard.js:45-57`, redirects only when the journey has
*neither* a run record *nor* committed answers — a readiness test it is not.

So the gate governs what the hub *offers*, not what the server *serves*.

The user-facing conclusion the two runs share — that there is no reachable,
useful incomplete review state — survives, and `dr1`'s own strongest evidence
for it (the captured hub showing "Check and submit / Cannot start yet") is
correct and is the part that actually holds. But the mechanism matters for the
work: `dr1`'s prescription "remove the readiness gate from the review page
itself" would not, on its own, change anything about reachability, and would
silently remove the section gate that the hub row reads. `dr1b`'s prescription
is the safe one — open the hub row, keep the submission guard, which is real
and independent (`engine/write/submit.js:9-15` returns `{ok: false}` unless
`scope.readyForCheckYourAnswers`).

### The two framing differences that are not contradictions

**Section count (four vs three).** Covered under Q1. Both defensible, both
incomplete; the conditional documents section reconciles them and both runs
found it separately.

**Change-link count.** `dr1`'s "28 against 11" and `dr1b`'s "26 row links plus
two card links" are the same page counted two ways. Both verify.

---

## The read-only claim (the spawn brief's item 1)

**The conditional in the brief does not fire. `dr1` did not record that the
requirements side defines no post-submission view — it recorded the opposite,
and cited it exactly.**

`dr1` inc-108's prototype slot: *"The review page renders the same cards
read-only for a submitted notification, and wraps the whole submit form in a
readOnly test so neither the form nor the Continue button appears
(`app/views/review-notification.html:181-187`, reached with `readOnly` true
from `app/routes.js:10024-10037`)."*

Both citations are precise against the current prototype:

```
review-notification.html:181   {% if not readOnly %}
review-notification.html:182-187   <form method="post" action="/review-notification"> … Continue …
routes.js:10024-10037          if (submittedNotification) { … renderReviewNotificationPage(req, res, {
                                 sessionData: submittedNotification.snapshot,
                                 readOnly: true, backLink }) }
```

And the seeded/genuine split `dr1b` turns on is real:

```
routes.js:6644-6646  viewHref: … : `/review-notification?submitted=${encodeURIComponent(notification.id)}`
app/data/dashboard-notifications.js  grep -c "viewHref: '#'" → 8
```

So the eight seeded demonstration rows are dead links, and every notification
the user actually submits gets a working one — exactly as `dr1b` inc-093 says.

Where the wrong assumption lived was `dr1b`'s **own pairing note**, and `dr1b`
corrected it: `dr1b-parity/pairs.cjs:407` now reads *"CORRECTED by the
dashboard and review authors, independently: this note previously said DR1
defines no post-submission view because its dashboard 'View' links are
`href="#"`. That is true only of DR1's eight seeded demonstration rows."*
`dr1`'s pairing file has no such error — but only because it has no entry for
`fe-check-answers-submitted` at all. A `grep` for that screen id across
`dr1-parity/pairs.cjs` returns nothing, and it appears in neither
`onlyFrontend` (two entries: `fe-delete-notification`, `fe-cancel-amend`) nor
`onlyPrototype` (four entries). `dr1` paired the screen inside its finding and
never in its pairing table.

**Net: both runs got the substance right, independently, and no `dr1` finding
rests on the false premise.** `dr1b` is the more thorough of the two — it
traced the whole dashboard → route → view-model → template chain and named the
seeded-row trap that produced the wrong assumption in the first place. It also
caught a mechanism error `dr1` did not: `dr1`'s inc-108 detail says the
`readOnly` flag is *"already used on the same page for the Change links"*,
which is true of the view model but not the template —
`grep -c readOnly check-answers/template.njk` returns **0**. `dr1`'s own
correction gets this right (`view-model/rows/change-link.js:28`); `dr1b`'s
inc-093 correction states it plainly.

---

## The arrival-date self-contradiction (the spawn brief's item 3)

**`dr1` noticed it, banded it `disputed`, and refused to pick a side —
the same call `dr1b` made.** Two independent readings, same verdict.

`dr1` inc-095, `disputed`, `medium`: *"DR1 disagrees with itself. Its review
row is keyed 'Arrival date at destination' (`app/routes.js:4677`) while the
input page that collects the value labels the same field 'Arrival date at port
of entry'… a port of entry and a place of destination are different places, so
this is not a wording preference."*

`dr1b` inc-083, `disputed`, `medium`: same three legs, same refusal.

Both verify:

```
app/views/partials/arrival-date-picker.html:9  text: "Arrival date at port of entry"
app/routes.js:4677                              key: 'Arrival date at destination'
```

Both runs also reach the same *inference* — that the review row is the slip,
because the session field is named `arrivalDateAtPort` — and both correctly
keep it out of the ruling. `dr1` puts it in its `correction`; `dr1b` puts it in
the `difference` slot as the thing that would settle it. `dr1b` cites the
question page as a screen (`dr1-arrival-details` is in its `screens` array);
`dr1` does not, though its correction quotes the captured hint from that page.

**One thing neither run records, which weakens the shared inference.** DR1 uses
"Arrival date at destination" in *two* places, not one:

```
app/views/dashboard.html:288  <dt …>Arrival date at destination</dt>
app/routes.js:4677            key: 'Arrival date at destination'
app/views/partials/arrival-date-picker.html:9  "Arrival date at port of entry"
```

So the destination wording is DR1's majority usage and the port-of-entry
wording is the outlier — which cuts against reading the review row as a lone
slip. `dr1` does have a finding on the dashboard label (inc-028: *"DR1 labels
the date on a notification card 'Arrival date at destination'; the frontend
labels it 'Arrival at destination'"*), but files it as a dashboard copy
difference and never joins it to inc-095. `dr1b` has no dashboard label
finding at all.

**Recommendation for whoever asks the designer:** put all three occurrences in
front of them, not two. The question is not "is the review row a typo" but
"which place does this date describe", and DR1 says *destination* twice and
*port of entry* once while storing it in a field called `arrivalDateAtPort`.

---

## Summary

- **Nothing in `dr1b`'s `review` domain is wrong.** Two headlines (inc-084,
  inc-091) overstate bodies that are themselves exact.
- **`dr1b` found three real things `dr1` missed**, one of them substantial:
  three questions the frontend asks and never shows back (inc-086), the page's
  own heading (inc-089), and a redundant summary row (inc-090).
- **`dr1` found two real things `dr1b` missed**, both small and both at the
  domain seam: the confirmation page's HMRC link destination (inc-099) and the
  contact address row key (inc-101).
- **One real contradiction, settled for `dr1b`:** the frontend's review route is
  not gated; the gate governs the hub row. `dr1` inc-104's mechanism claim and
  its prescription are both wrong, though its user-facing conclusion stands.
- **Both runs got the DR1 read-only view right, independently.** The wrong
  premise lived in `dr1b`'s pairing note and was corrected before authoring;
  `dr1`'s pairing table omits the screen rather than mis-describing it.
- **Both runs banded the arrival-date self-contradiction `disputed` and refused
  to pick a side.** Correct on both counts — but both missed that DR1 uses the
  "destination" wording on the dashboard too, which is evidence the designer
  should see.
