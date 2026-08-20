# dashboard — comparing the two readings

`dr1` (run `EUDPA-328-DR1`) has **15** dashboard findings, `inc-026`–`inc-040`.
`dr1b` (run `EUDPA-328-DR1B`) has **13**, `inc-023`–`inc-035`.

Paired by subject rather than by id or slice:

| # | Subject | `dr1` | band | `dr1b` | band | agree? |
|---|---|---|---|---|---|---|
| 1 | "At a glance" panel | inc-027 | needs-backend | inc-024 | needs-backend | yes |
| 2 | Create/Start a new notification | inc-033 | frontend-work | inc-025 | frontend-work | yes |
| 3 | Delete + cancel amendment | inc-031 | disputed | inc-023, inc-026 | disputed, disputed | yes (split in two) |
| 4 | Search by commodity and consignee | inc-037 | needs-backend | inc-027 | needs-backend | yes |
| 5 | Date filter | inc-030 | needs-backend | inc-028 | needs-backend | yes |
| 6 | Status filter | inc-040 | needs-backend | inc-029 | needs-backend | yes |
| 7 | Status vocabulary (4 vs 7) | inc-026 | needs-backend | inc-032 | needs-backend | yes |
| 8 | "My notifications" heading | inc-035 | frontend-work | inc-031 | frontend-work | yes |
| 9 | Results count line | inc-036 | frontend-work | inc-033 | frontend-work | yes |
| 10 | Sort control | inc-039 | **disputed** (medium) | inc-035 | **frontend-work** (high) | **no** |
| 11 | Keyword filter label | — (folded into inc-037) | — | inc-030 | frontend-work | `dr1b` only |
| 12 | **Scope of the notification list** | **— nothing** | — | **inc-034** | needs-backend | **`dr1b` only** |
| 13 | "Arrival date at destination" copy | inc-028 | frontend-work | — | — | `dr1` only |
| 14 | Card field set | inc-029 | frontend-work | — | — | `dr1` only |
| 15 | DR1 cannot show a draft | inc-032 | disputed | — | — | `dr1` only |
| 16 | Collapsed filter sections | inc-034 | frontend-work | — | — | `dr1` only |
| 17 | Dashboard intro paragraph | inc-038 | frontend-work | — | — | `dr1` only |

10 shared subjects. 2 `dr1b`-only. 5 `dr1`-only. 1 band disagreement.

---

## 1. Is anything in `dr1b` wrong?

Nothing is **wrong**. Two are **overstated**; the other eleven are **sound**.

### Sound (11)

`inc-023`, `inc-024`, `inc-025`, `inc-026`, `inc-027`, `inc-028`, `inc-029`,
`inc-031`, `inc-032`, `inc-033`, `inc-034`.

Spot-checks that mattered:

- **inc-026** — "a submitted one as readily as a draft" is exactly right.
  `dashboard/view-model/row/actions.js:25-28` builds a single `deleteAction`
  and attaches it to all three status branches at `:40` (SUBMITTED), `:50`
  (DRAFT) and `:64` (AMEND). Verified in the file.
- **inc-032** — `shared/kit.js:34-51` holds a four-entry `STRIP_STATUS` map
  (DRAFT/SUBMITTED/AMEND/DELETED) and nothing else. The DR1 filter's seven are
  `Draft, Submitted, In progress, Approved, Action required, Rejected,
  Complete` (`app/views/dashboard.html:150-159`) — which is what the finding's
  `detail` says, correctly, and it flags the `Action required` /
  `Submitted action required` ambiguity itself. Only the *title* compresses the
  seven into "including Submitted action required", which is the card's label
  and not the filter's. Title-level imprecision, not a defect in the finding.
- **inc-029** — the correction is right that the band is *enforced* rather than
  advisable. `records/real/status.js:15-20` throws on any backend status
  outside the four.
- **inc-024** — the prototype's three counts really are hardcoded
  `{alerts: 0, errors: 0, messages: 0}` (`app/routes.js`, `alertCounts` in
  `getDashboardViewModel`), and the captured DOM renders `0`, `0`, `0` with all
  three links at `href="#"`. Both runs got this right.

### Overstated (2)

**`inc-030` — keyword filter label.** The finding says: *"The field, its name
and the search it performs are already right; only the wording changes."* The
last clause is refuted by the source. The box is `name="referenceNumber"`
(`dashboard/template.njk:45-53`); its value reaches
`records/real/lifecycle/read.js:30-34` as `referenceNumber`; the backend does
`findByReferenceNumberAndStatusIn(trimmedReference, dashboardStatuses)`
(`NotificationService.java:132-134`), and the endpoint's own OpenAPI text says
*"Optional referenceNumber: exact match against a complete notification
reference"* (`NotificationController.java:144`). It is not a keyword search —
it is an exact match on a whole reference. Relabelling it to DR1's *"Keyword or
notification number"* while it still only matches a complete reference makes
the label **more** misleading, not less. `dr1`'s `inc-037` states this plainly
("The label promises a keyword search but the value is passed straight through
as a reference-number match … A user who types a commodity or a consignee's
name gets no results"). The relabel is still the right end state; the finding's
justification for shipping it alone is not.

**`inc-035` — sort control.** Every fact it asserts is true and I checked them
all. What is overstated is the band. The finding deliberately excludes whether
DR1's select actually sorts — and it does not. `getDashboardViewModel`
(`app/routes.js:7138-7255`) reads `const sort = (query.sort || '').trim()` at
`:7142` and uses it only at `:7248` (echo), `:7249` (`buildDashboardSortItems`,
to mark the selected option) and `:7252` (pagination hrefs).
`visibleNotifications` is never re-ordered by it. The select also sits in a GET
form with no submit control. So the option set `dr1b` proposes copying comes
from a control that has never demonstrated a single ordering — and `dr1b`'s own
`difference` slot concedes *"which date DR1's 'Newest first' and 'Oldest first'
order on, and which direction its 'Arrival date' runs in … Neither is stated
anywhere in DR1, so a designer answers them."* The contract says *"prefer
`disputed` with a stated question"* in exactly this case
(`FINDING-CONTRACT.md:112-123`). `frontend-work` schedules it as buildable now;
it is not. See question 4.

---

## 2. What did `dr1b` find that `dr1` missed?

Two subjects. Both real.

### `inc-034` — the notification list is unscoped. **This is the find of the run.**

`dr1` has nothing on this subject anywhere in its 133 findings. Checked by
string: `grep -c "not started any notifications in this session"` over
`EUDPA-328-DR1/backlog.json` returns **0**, and `knownJourneyIds`,
`journeyIds` and `listKnownJourneys` appear **zero** times in the whole file.

The claim is **true**. Settled from the source on both sides — see question 4
for the full chain. `dr1` is not merely silent by accident: `inc-037` cites
`records/real/lifecycle/read.js:26-34` and writes *"the notifications endpoint
accepts page, sort and reference number and nothing else"* — it read the exact
lines, drew the "no commodity search" conclusion, and did not draw the "no
owner filter" one.

### `inc-030` — keyword filter label carved out of the backend-blocked finding

`dr1` folds the relabel into `inc-037`, which is banded `needs-backend`. So in
`dr1` a pure copy change is stranded behind a contract change it does not
depend on. `dr1b` splitting it out is a genuine scheduling improvement, and its
verification line says so explicitly. The reasoning is overstated (question 1)
but the carve-out is right.

---

## 3. What did `dr1` find that `dr1b` missed?

Five subjects. **All five are real.** Verified each from the source rather than
from `dr1`'s prose.

1. **`inc-028` — "Arrival date at destination" vs "Arrival at destination".**
   Prototype `app/views/dashboard.html:288`:
   `<dt …>Arrival date at destination</dt>`. Frontend
   `dashboard/copy/copy.en.js:20`: `arrival: 'Arrival at destination'`. Real.
2. **`inc-029` — the card field set.** DR1's card carries four pairs —
   Commodity, Status, Origin, Arrival date at destination
   (`app/views/dashboard.html:264-292`). The frontend's card carries eight —
   Commodity, Origin, Arrival, then Consignee, Consignor, Status, then Date
   created, Date submitted (`dashboard/template.njk:113-153`). Four frontend
   fields DR1's card does not have. Real, and a bigger visual difference than
   several of the copy findings `dr1b` did write.
3. **`inc-032` — DR1's dashboard cannot show a draft, but its filter offers
   Draft.** Verified twice over. `getDashboardViewModel` builds
   `inProgressNotifications` by excluding `reviewVariant === 'draft'` and
   `'submission-complete'`, `visibleNotifications` defaults to that tab, and
   `app/views/dashboard.html` renders **no tab control** (grepped for
   `tabItems`, `activeTab`, `notificationSectionHeading` — no matches), so the
   drafts tab is unreachable from the DR1 dashboard. The seed data holds two
   drafts (`app/data/dashboard-notifications.js:59, 77`) and neither appears:
   the captured `dr1-dashboard.html` renders exactly four cards, tagged
   orange/green/green/orange — two "Submitted action required" and two
   "Submitted", zero drafts. Meanwhile the status filter offers `Draft` at
   `app/views/dashboard.html:151`. DR1 contradicts itself here, which is the
   textbook `disputed` case. **`dr1b` missed a self-contradiction in the
   design.**
4. **`inc-034` — collapsed filter sections.** DR1 uses three
   `<details class="app-dashboard-filters__section">` groups — Search by,
   Status, By date (`app/views/dashboard.html:86, 133, 163`). The frontend's
   panel is a single always-open `<aside>` with one input
   (`dashboard/template.njk:38-56`). Real.
5. **`inc-038` — the dashboard intro paragraph.** Frontend
   `dashboard/template.njk:28` renders `<p class="govuk-body">{{ copy.body }}</p>`
   ("Use this service to tell the authorities about live animals…",
   `copy.en.js:3-6`). DR1's intro section is caption, `<h1>` and the create
   button only (`app/views/dashboard.html:27-38`) — no body text. Real.

Note the shape of the gap: three of the five (`inc-028`, `inc-029`, `inc-034`)
are things visible in the captured DOM without opening a file, and `dr1b`'s
verification pass found two other toolbar items by sweeping (`inc-033`,
`inc-035`) without catching the card body. `dr1b` traded breadth of surface
coverage for depth on the read path.

---

## 4. Where they contradict each other, which is right?

### The unscoped list — settled from the source

**`dr1b` is right, and understates it.**

The chain, read end to end at frontend `76a864ba`:

1. `engine/journey.js:92-119` — `listKnownJourneys` fetches
   `session.knownJourneyIds(request)` and calls
   `records.list({ journeyIds, page, sort, referenceNumber, organisationId })`.
2. `services/persistence/records/index.js:5` —
   `export const records = isStubMode() ? stubRecords : realRecords`.
3. **Stub path.** `records/stub/lifecycle/read.js:15-23` — `list` destructures
   `journeyIds` and maps over it, so the filter *is* applied. This is what the
   capture shows (`fe-dashboard-empty.html:159` renders "You have not started
   any notifications in this session.").
4. **Real path.** `records/real/lifecycle/read.js:24-39` —
   `export const list = async ({ page = 1, sort = 'arrivalDate,desc',
   referenceNumber, organisationId } = {})`. **`journeyIds` is not
   destructured and never referenced.** The request it builds is
   `` `${notificationsUrl}?page=${page}&sort=${sort}${referenceQuery}` ``.
5. `records/real/http/headers.js` sends `Content-Type` and a tracing header.
   **No user, no organisation, no token.** So the backend cannot infer a caller
   even if it wanted to.
6. `organisationId` does not scope the list. `records/real/marshal/list-item.js`
   uses it solely for `party(organisationId, addressId)` name resolution, and
   `nameOf` returns `null` for a party outside the book — **the row is still
   returned**. `dr1b`'s correction says exactly this and is correct.
7. Backend. `NotificationController.java:141-155` — `@GetMapping findAll` takes
   `page`, `sort`, `referenceNumber` and nothing else. There is a
   `HEADER_USER_ID = "User-Id"` constant, but `grep` shows it is only used at
   `:195` (replay) and `:222` (bulk delete) — admin operations, not the list.
8. `NotificationService.java:143-144` —
   `notificationRepository.findAllByStatusIn(dashboardStatuses, pageable)`.
   The only predicate is `status ∈ {DRAFT, SUBMITTED, AMEND}`. **No owner
   predicate exists in the query, the repository, or the record.**
9. Nothing downstream re-filters. `dashboard/controller.js:60` does
   `listed.rows.filter((journey) => journey.status !== DELETED)` and no more.

**Verdict: the claim is true.** Against the real backend the frontend dashboard
renders every non-deleted notification the service holds, paged and sorted,
belonging to anyone. It is a security matter — cross-tenant data exposure — and
the earlier run missed it.

Two things `dr1b` does not say that make it worse:

- **This is the production path, not a corner case.**
  `common/services/mode.js:13` — `isStubMode = () => config.get('stubMode') &&
  !config.get('isProduction')`. The comment above it says stub mode is *"Never
  honoured in production, whatever the environment says."* So in production the
  real adapter is **always** the one selected. The session filter is only ever
  applied in non-production stub runs.
- **`organisationId` is the near miss.** `journey.js:105-107` returns an empty
  list when there is no `organisationId`, so the frontend already holds the
  value that would scope the read, already carries it into `records.list`, and
  already drops it before the query. The gap is one query parameter on each
  side, not a redesign.

One minor imprecision in the finding: its prototype slot says *"three of them
submitted days earlier"*. The captured DR1 dashboard shows **four** cards, all
four in post-submission states (two orange "Submitted action required", two
green "Submitted") — the two seeded drafts are filtered out before the view.
Should be four, not three. It does not touch the argument.

### The sort control — `dr1` is right on the band, `dr1b` is right on the facts

`dr1` `inc-039` says DR1's sort *"does nothing when it is used"*. **Confirmed.**
`getDashboardViewModel` at `app/routes.js:7142` reads `query.sort` and passes it
to `buildDashboardSortItems` (selection marking) and
`buildDashboardPagination` (href building) only; `visibleNotifications` is
sliced by page and never re-ordered. `renderDashboardPage` at `:7266` renders
`dashboard` from that model, so this is the DR1 dashboard and not a DR2 variant.
The select is also inside `<form method="get" action="/">` with no submit
control (`app/views/dashboard.html:231-251`).

`dr1b` `inc-035` gets the option sets exactly right on both sides and adds a
fact `dr1` does not have — the frontend arrives pre-sorted, `sort =
'arrivalDate,desc'` being the default in `records/real/lifecycle/read.js:26`.

They do not contradict each other on fact; they contradict each other on band,
and the band is what schedules the work. **`dr1` is right.** Under the shared
band table, `disputed` covers *"the finding's own correctness is in doubt"*, and
`dr1b`'s own text concedes two questions only a designer can answer before the
wording can be applied. Banding it `frontend-work` puts it in the buildable
queue with an option set derived from a control that has never sorted anything.

### Note on independence

Nothing in this domain touches the one contaminated subject
(`PROVENANCE.md` item 3, the blocked exit-details hub row). Every agreement
below is between two readings that could not see each other, and the two
disagreements are trustworthy by construction.

---

## The `needs-backend` banding check

`dr1b` bands six dashboard findings `needs-backend`; its verifier upheld all
six. `dr1`'s banding on the same subjects:

| Subject | `dr1b` | `dr1` | |
|---|---|---|---|
| At a glance panel | inc-024 needs-backend | inc-027 needs-backend | agree |
| Commodity + consignee search | inc-027 needs-backend | inc-037 needs-backend | agree |
| Date filter | inc-028 needs-backend | inc-030 needs-backend | agree |
| Status filter | inc-029 needs-backend | inc-040 needs-backend | agree |
| Status vocabulary | inc-032 needs-backend | inc-026 needs-backend | agree |
| List scope | inc-034 needs-backend | *no finding* | no counterpart |

**5 of 5 comparable subjects agree. Zero band disagreements on
`needs-backend`.** Two independent readings, from the same evidence, put the
same five dashboard subjects behind a backend change, and both grounded it in
the same fact — that the list read carries `page`, `sort` and `referenceNumber`
and nothing else. Nothing in the setup could have produced that agreement
artificially, so it should be treated as settled: those five do not get
scheduled ahead of the contract work.

The sixth, `inc-034`, has no `dr1` counterpart to agree or disagree with. Its
`needs-backend` band is correct and, if anything, understated — the backend has
no owner-scoped query *and* the record carries no owner, so this is a schema
change ahead of an endpoint change.

The only band disagreement in the domain is the sort control (question 4), and
the effect of it is that `dr1b` would schedule it as buildable frontend work
while `dr1` would send it to a designer first.
