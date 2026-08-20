# `hub` — comparing the two readings

Domain `hub`: **dr1 12 findings** (inc-053…inc-064), **dr1b 12 findings**
(inc-048…inc-059). Every judgement below was checked against the frontend
working tree at `76a864ba93ac7c60d358c902bd68396731daacf3` — confirmed as the
capture head in `run-heads.json` — the prototype at
`~/git/defra/defra-design/GB-notification-service`, and the shared rendered DOM
under `dr1b-parity/capture/html/`.

## Subject map

Paired by subject, never by id or slice.

| # | Subject | dr1 | dr1b | Verdict |
|---|---|---|---|---|
| 1 | Hub rows blocked as "Cannot start yet" until origin + commodity answered | inc-053 | inc-059 | Both sound. dr1b more precise. |
| 2 | No hub row opens the consignment-details page directly | inc-054 | inc-052 | Both sound. |
| 3 | "Your commodities" totals panel hidden until a commodity exists | inc-055 | inc-048 | Both sound. |
| 4 | The Exit details task should not exist — DR1 asks those questions on the reason page | inc-056 | inc-080 (`origin` domain) | Covered on both sides. Slicing difference, **not** a coverage gap. |
| 5 | Exit details row never opens for temporary admission of horses | inc-057 | inc-050 | **The contaminated subject.** Substance sound both sides; **dr1 is wrong on reachability**, dr1b is right. |
| 6 | "Animal identification details" row shown unconditionally | inc-058 | inc-051 | Both sound. dr1b's remedy is correct where dr1's is incomplete. |
| 7 | Missing "Notification tasklist" heading, and heading levels | inc-059 | inc-054 | Both sound. |
| 8 | Review is a blocked task row, not an always-available button | inc-060 | inc-053 | Both sound. **dr1 overstates**; dr1b narrowed it correctly. |
| 9 | The six section captions and their order differ from DR1's | inc-061 | inc-055 | Both sound. dr1's "only the first caption matches" is loose. |
| 10 | Hints under every row; DR1 hints one row and names four parties, not five | inc-062 | inc-056 | Both sound. |
| 11 | Six task labels differ from DR1's | inc-063 | inc-057 | Both sound. Identical six on both sides. |
| 12 | Status vocabulary: four frontend states vs DR1's two | inc-064 | inc-058 | Both sound. dr1b's split is the better carve-up. |
| 13 | Documents row is "Optional", so a notification with no health certificate passes the review gate | — | inc-049 | **dr1b only. Real. A genuine gap in dr1.** |

No band disagreement: every finding on both sides is `frontend-work`, confidence
`high`. One type disagreement, subject 6 — dr1 calls it `obligation-change`,
dr1b `flow-change`; dr1's label is the better one, see below.

---

## 1. Is anything in `dr1b` wrong?

**Sound: 11 of 12. Overstated in one clause: 1. Wrong: 0.**

### Overstated — inc-050, one clause

The `frontend` slot opens:

> The hub shows an "Exit details" row … no link, and the status "Cannot start
> yet" — while **every other row on the same page**, including Additional
> commodity details and Uploaded documents, is a working link.

That is false as written. `fe-hub-exit-details-blocked.html` contains **two**
`govuk-task-list__status--cannot-start-yet` rows, not one: Exit details at
line 183 and Check and submit at line 324, the latter a bare
`<li class="govuk-task-list__item">` with no `<a>` (lines 315–325).

The clause is doing argumentative work — it establishes that the block is not a
missing earlier answer — and that argument survives intact, because the rows it
actually names (Additional commodity details, Uploaded documents) *are* links
and *do* sit later in the flow than destination country. Only the universal
quantifier is wrong. Graded **overstated**, not wrong.

dr1's inc-057 phrases the same observation as "every other **startable** row on
the same page", which is correct. dr1 is the more careful of the two on this
one sentence.

### The other eleven, checked

Every dr1b hub finding's mechanism was re-derived from source rather than
accepted from its citation:

- **inc-048** — `buildCommodityTotals` returns `null` on an empty
  `collectionView` (`hub/controller.js:141-152`) and `template.njk:8` is a plain
  truthiness test; `fe-hub-no-commodity.html` contains no "Your commodities"
  string. DR1 prints `totalAnimals > 0 ? String(totalAnimals) : '0'`
  unconditionally (`app/routes.js:5746-5747`). Sound.
- **inc-049** — see question 2. Sound.
- **inc-051** — `taskRows` declares `animalIdentification` with `parts` but no
  `conditional: true` (`task-rows.js:41-45`); `isHiddenRow` requires both
  `row.conditional` and `NA`. DR1 spreads its identification item in behind
  `hasAnimalIdentifiersRequired(sessionData)` (`app/routes.js:5773-5781`), and
  the captured DR1 hub's section 2 holds exactly Commodity details and
  Additional details. Sound, and the narrowed remedy — that the conditional flag
  alone will not do it because the facet's part key is the parent collection —
  is right where dr1's remedy is not.
- **inc-052** — `fe-hub.html` contains zero occurrences of `consignment-details`.
  DR1's section 2 opens with `<a … href="/consignment-details">Commodity
  details</a>` (`dr1-notification-hub.html:327`). Sound.
- **inc-053** — see question 4. Sound, and it is the *narrowed* version.
- **inc-054** — DR1 renders `<h2 …>Your commodities</h2>` (line 249),
  `<h2 …>Notification tasklist</h2>` (line 275), then
  `<h3 …>1. About the consignment</h3>` (line 280). The frontend renders both
  as `h2` (`fe-hub.html:108` `govuk-heading-l`, `:126` `govuk-heading-m`) and
  has no tasklist heading. Sound.
- **inc-055** — section captions read from both DOMs in order confirm the six
  against the six. `GROUPS` in `hub/controller.js:33-48` puts `contact` inside
  `addresses` and documents fifth; DR1 gives contact a section of its own and
  documents fourth (`app/routes.js:5809-5838`). The corrected count of **three**
  renamed sections is right — 2, 3 and 4 are the same block of work under a new
  name; "5. Documents" keeps DR1's name and only moves. Sound.
- **inc-056** — `fe-hub.html` carries 11 `govuk-task-list__hint` divs, one per
  row; `dr1-notification-hub.html` carries exactly one
  `app-notification-hub-tasklist__hint`, on Roles and addresses, reading
  "Consignor or Exporter, Consignee, Importer and Place of Destination"
  (line 408). DR1's hub has **10** rows, so "nine of its ten rows" is exact.
  Sound.
- **inc-057** — the six renames are confirmed against
  `app/routes.js:5749-5841` and the rendered row titles. Sound.
- **inc-058** — `fe-hub.html` carries `govuk-tag--green Completed`,
  `govuk-tag--light-blue In progress` and `govuk-tag--blue Not yet started`;
  every DR1 item picks between `statusComplete` and `statusTodo` in source, so
  the two-status claim is not a capture artefact. Sound.
- **inc-059** — `fe-hub-no-commodity.html` contains exactly nine
  `cannot-start-yet` occurrences and 11 rows total (13 `govuk-task-list__item`
  class occurrences = 2 with-link rows + 9 blocked + 2 doubled). `fe-hub.html`
  contains one, over 11 rows. So "nine of eleven" and the corrected "ten of
  eleven" are both exact. Sound.

---

## 2. What did `dr1b` find that `dr1` missed?

**One finding: inc-049, documents marked "Optional".** It is real.

dr1's inc-064 notices the word and hands it away:

> the 'Optional' text on the documents row, which in DR1 is just another 'To
> do' … whether documents are actually optional to submit is a separate
> question and belongs to the documents slice

**The documents slice never raised it.** dr1's `documents` domain holds twelve
findings (inc-041…inc-052) covering the file field label, the 10-vs-15 cap, the
missing type picker, the drop zone, the 10MB-vs-50MB limit, JPG, virus-check
wording, four validation strings and the ZIP warning. Not one of them is about
the documents task being skippable. The question dr1 deferred was dropped.

How I checked the substance:

- `documents.js:19-27` declares `requires: { maxEntries: 10 }` and no minimum,
  and the comment above it says so explicitly ("No `applyTo` — top-level
  user-driven indexed group").
- `flow/section-status.js:11-15` — `readyForCheckYourAnswers` accepts
  `FULFILLED || NA || OPTIONAL`, so an unstarted documents row does not hold the
  review gate shut.
- `fe-hub.html:293-295` — `<div class="govuk-task-list__status"
  id="documents-1-status"> Optional </div>`, bare text, no `govuk-tag`.
- `app/routes.js:5674-5678` — `getConditionalSubmissionItems` pushes
  `'upload the health certificate and any other required documents'` when
  `hasUploadedDocuments` is false, and DR1's hub still shows the row with the
  same `To do` tag as everything else (`app/routes.js:5810-5817`).

So DR1 treats the health certificate as **deferrable**, the frontend as
**skippable**. That is a substantive difference about what the service will let
a trader submit, and dr1 does not have it anywhere. This is dr1b's clearest win
in the domain.

---

## 3. What did `dr1` find that `dr1b` missed?

**Nothing.** No coverage gap in the hub domain.

The only candidate is dr1's **inc-056** — the frontend has a fourth task in
group 1 that DR1 does not have, and DR1 folds destination country, port of exit
and exit date into the reason-for-import task. dr1b covers exactly this in
**inc-080** (`origin` domain, `origin-and-reason` slice), whose `difference`
slot reads:

> … fold the hub's "Exit details" row into "Main reason for importing" so the
> two rows become one …

Same subject, different slice. Per the brief, that is a slicing difference and
not a gap.

Both sides' claim is true: DR1's `hasImportReasonComplete`
(`app/routes.js:1343-1367`) returns true for `'Temporary admission horses'` only
when `temporaryAdmissionExitDate` and `temporaryAdmissionPortOfExit` are both
valid, so the reason task really does carry the reveals' answers, and DR1's
section 1 holds exactly three items.

**One error to flag while I am on it, in dr1b inc-080 rather than in my domain.**
Its difference slot claims folding the row away "also retires the 'Cannot start
yet' state that row is the only user of". That is false. `CANNOT_START_STATUS`
is also returned by `buildReviewItem` (`hub/controller.js:72-90`) and by
`blockedRowItem` for **any** gate-failing row: `fe-hub-no-commodity.html` has
nine of them and `fe-hub.html` has one. dr1b's own inc-059 says as much. It does
not touch the hub findings, but it is the kind of clause that gets quoted into a
ticket.

---

## 4. Where they contradict each other, which is right?

### 4a. Reachability of the port of exit and exit date — the one that matters

This is the only real contradiction in the domain, and it is on exactly the
class of claim the brief flags as most dangerous.

**dr1 inc-057 says the user meets these questions on the way through:**

> A user who has chosen temporary admission of horses, **answered port of exit
> and saved it**, and then returned to the hub, finds the 'Exit details' row …
> The user can **still reach the two questions going forwards, because
> `nextInSection` walks past the out-of-scope page** to the next one that passes
> (`src/server/app/flow/navigation.js:27-37`), so they can complete the
> notification — but once they have left those pages they cannot get back to
> change an answer.

**dr1b inc-050 says the opposite:**

> because the opening run steps from the reason page past the exit questions to
> animal identification (`…/linear/flow/run.js:22-39`) a first-time user is
> **never asked them on the way through**. The one route left is to re-open
> "Main reason for importing" from the hub and press "Save and continue" …
> Nothing on the hub says so.

**dr1b is right. dr1's account of the forward path is wrong.** Settled from the
journey code, in five steps:

1. `RUN_STEPS` (`…/linear/flow/run.js:22-39`) is, in order: `origin`,
   `commodities`, `consignment-details`, `import-reason`, `import-purpose`,
   `animal-identification`, `additional-details`. **Destination country, port of
   exit and exit date are not steps in the opening run at all.**
2. `kit.nextTarget` (`shared/kit.js:96-100`) is
   `exitTarget(request, (await runTarget(…)) ?? nextInSection(…))`, and
   `runTarget` (`:90-93`) returns `journeyNextRunTarget(...)` whenever
   `inOpeningRun` is true. `nextRunTarget` never returns `null` — it falls back
   to `hubPath` (`run.js:50`). **So while the opening run is active,
   `nextInSection` can never fire.** dr1's cited mechanism is real code, but it
   is unreachable in the scenario dr1 puts it in.
3. From `import-reason` during the run, the next step is `import-purpose`, whose
   gate fails — `purposeInInternalMarket` is in scope only for `internalMarket`
   (`obligations/sections/import-reason.js:44-56`) — so the user goes straight
   to animal identification. **A first-time user importing horses temporarily is
   shown neither the port of exit nor the exit date.**
4. `completeOpeningRun` is called by the hub GET handler and nowhere else
   (`hub/controller.js:155`). Only *after* the user has landed on the hub does
   `runTarget` return `null` and `nextInSection` take over.
5. Re-opening "Main reason for importing" from the hub and pressing the primary
   button then works: the primary `govukButton` in
   `shared/save-actions.njk:6` carries no `name`, so `hubExitTarget` returns
   `null` (`kit.js:77-78`) and the fallback applies; `nextInSection` walks the
   `consignment` section `[importReason, importPurpose, destinationCountry,
   portOfExit, exitDate, additionalDetails]` (`linear/flow/flow.js:48-58`),
   skips `import-purpose` and `destination-country` as out of scope, and lands
   on **Port of exit**, then **Exit date**. Only the secondary "Save and return
   to hub" carries `name: "exit", value: "hub"`.

The consequence dr1 draws is therefore too generous in one direction and the
defect is worse than dr1 describes, not milder. dr1 says the user "can complete
the notification" and has merely lost the *return* route. In fact `portOfExit`
and `exitDate` are both `status: 'mandatory'` for this reason
(`import-reason.js:84-113`), and `readyForCheckYourAnswers` requires every task
row fulfilled, so until the user stumbles on the unsignposted route the Check
and submit row stays shut too. The notification **cannot** be finished by
anything the interface tells the user to do.

**dr1b states it more accurately, and states it at the right strength.** Its own
verification line records catching itself overshooting in the other direction —
an earlier draft ended "from the hub alone the notification cannot be finished",
which it narrowed once it established the reason-row route. That is precisely
the discipline dr1's history shows was missing when "a user cannot complete
their notification" was written about a blocked return path. **dr1b did not
repeat dr1's historic error, and it did not inherit dr1's replacement error
either.**

Both runs agree on the row mechanism, and I confirm it independently:
`rowGatePasses = pageGatePasses(row.pages[0], scope)`
(`flow/navigation.js:25`) against `rowEntry`, two lines above, which picks the
first page whose gate *passes* (`:20-23`); the `exitDetails` row's `pages[0]` is
`destinationCountryPage` (`task-rows.js:34-39`); and `blockedRowItem`
(`hub/controller.js:95`) discards the computed status. dr1's proposed one-line
fix and dr1b's "make availability follow the questions actually in scope" are
the same change.

### 4b. Review page: "no way of opening it at all" vs "unlinked, not unreachable"

**dr1 inc-060:**

> A user part-way through a notification therefore has **no way of opening their
> check-answers page at all**

**dr1b inc-053** claims only that "the hub row is the sole route **the interface
offers**", and its verification says the page "is unlinked, not unreachable".

**dr1b is right.** The review section's gate
(`linear/flow/flow.js:81-85`) is consulted by `sectionGatePasses` from
`buildReviewItem` and by `sectionEntry` — both of which decide *what the hub
renders*. There is no route-level equivalent. The only `onPreHandler` registered
is `journeyEntryGuardTarget` (`routes.js:66-69`), and `entryGuardTarget`
redirects only a journey with neither an opening-run record nor committed user
answers (`linear/flow/entry-guard.js:44-57`) — neither is true of a part-way
notification. `check-answers/page.js` declares no `gate`, and nothing in
`features/check-answers/` references `readyForCheckYourAnswers` or
`sectionGatePasses`. Typing the `notification-view` URL renders the page.

Same class of error as 4a: **a claim about markup dressed as a claim about
behaviour.** dr1 makes it; dr1b explicitly checked the route side and narrowed
the sentence.

### 4c. Smaller divergences, all resolving to dr1b

- **Section renames.** dr1 inc-061: "Only the first caption matches DR1."
  Defensible if read positionally, but "Documents" is a caption on both sides —
  it moves from fifth to fourth rather than being renamed. dr1b inc-055 says
  **three** renames (2, 3, 4) with Documents moved, which is exact.
- **Status vocabulary carve-up.** dr1 inc-064 folds four states into one
  copy-change finding and defers the meaning of "Optional". dr1b splits: inc-058
  for the three tag states, inc-049 for the obligation behind "Optional". Since
  "Optional" is not a tag at all — it is the absence of a minimum entry count
  surfacing through `statusOf` — dr1b's split is the correct carve-up, and it is
  what let dr1b keep the finding dr1 dropped.
- **Citation drift.** dr1 inc-053 cites `bridge/obligation-source.js:30-33` for
  `ENFORCED_AT_CONTINUE`; the declaration is at **31-34** (line 30 is blank).
  dr1b inc-059 cites 31-34. Trivial, but it goes the same way as everything
  else.
- **Type label.** dr1 calls the identification-row finding `obligation-change`,
  dr1b `flow-change`. dr1's label is the better one: dr1b's own verification
  concludes the fix needs the row's part scope to resolve to `NA`, which is an
  obligation-scope change, not a flow change. The single place in this domain
  where dr1's judgement is the sounder.

---

## What the contamination is worth

`PROVENANCE.md` item 3 covers subject 5 — dr1 inc-057 / dr1b inc-050.

**What I have discounted entirely:** the fact that both runs wrote a finding
about the blocked exit-details row. The dr1b agent saw two `dr1-parity/findings/`
file names in a `grep -rl` output for that screen id. Two runs choosing the same
subject is worth nothing here, and I have treated the subject as if only one run
had raised it.

**What I consider load-bearing, and why:** the substance, because I re-derived
every leg myself from the source at the capture head and did not rely on either
run's agreement for any of it. Specifically —

- `rowGatePasses` consults `row.pages[0]` only (`flow/navigation.js:25`), while
  `rowEntry` two lines above searches for the first passing page.
- The `exitDetails` row's `pages[0]` is `destinationCountryPage`
  (`task-rows.js:34-39`).
- `destinationCountry` is gated to `{transit, transhipmentOrOnwardTravel}`,
  `portOfExit` to `{transit, temporaryAdmissionHorses}`, `exitDate` to
  `temporaryAdmissionHorses` alone (`obligations/sections/import-reason.js:60-113`).
  Enumerating the five reasons: `internalMarket` and `reEntry` leave all three
  out of scope, so the conditional row is hidden; `transit` and
  `transhipmentOrOnwardTravel` put `destinationCountry` in scope, so the row is a
  link. **`temporaryAdmissionHorses` is the only value that produces
  shown-but-blocked.** That falls out of the obligation file alone; the row does
  not need to suggest it.
- The capture agrees: `fe-hub-exit-details-blocked.html` has 12 rows against the
  other two hubs' 11, "Main reason for importing" reads `Completed` (line 171),
  and Exit details is a bare `<li>` with `Cannot start yet` (lines 174-186).

So the finding stands on my derivation rather than on either run's authority.

**And the more interesting point:** contamination can only push toward
agreement, and on the one leg that actually matters — whether the user ever
meets these questions — **the two runs disagree.** Nothing in the setup could
have manufactured that disagreement, so it is fully trustworthy signal, and it
resolves against dr1. The contamination therefore bought dr1b nothing on the
claim that decides the finding's value. dr1b earned that leg on its own, and its
verifier's own record of narrowing the sentence when the evidence did not support
it is the strongest single piece of evidence in this domain that the second run's
process is working.

---

## Verdict

- **dr1b hub findings: 11 sound, 1 overstated in one clause (inc-050's "every
  other row"), 0 wrong.**
- **dr1b found 1 thing dr1 missed** (inc-049, documents skippable), and it is
  real and substantive.
- **dr1b missed nothing** in this domain; its one apparent gap (dr1 inc-056) is
  covered in the `origin` domain by inc-080.
- **Where they contradict, dr1b is right in 4 of the 5 places** — the
  reachability of the exit questions, the reachability of the review page, the
  section-rename count, and the Optional/documents carve-up. dr1 is right on the
  fifth, the finding's type label, and is the more careful of the two on one
  sentence in inc-050's neighbourhood.
- **On the reachability question specifically: dr1b states it materially more
  accurately.** dr1's inc-057 asserts a forward path through the port of exit
  that the opening run does not take, and consequently understates the defect.
