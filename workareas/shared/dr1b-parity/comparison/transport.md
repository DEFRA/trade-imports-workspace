# `transport` — comparing the two readings

`dr1` (run `EUDPA-328-DR1`) has **14** transport findings, `dr1b` (run
`EUDPA-328-DR1B`) has **15**. Compared by subject, not by id:

| | count |
|---|---|
| Subjects both runs raise | 11 |
| Raised by `dr1b` only | 4 |
| Raised by `dr1` only | 3 |
| Same subject, different domain (not a gap) | 1 |

The one re-domained subject is the private transporter's postcode label:
`dr1b` inc-116 files it under `transport`, `dr1` files the same string under
`service-wide` / slice `addresses` as inc-001. Both are right about the
strings — the frontend's captured DOM has
`<label class="govuk-label" for="postalOrZipCode">Postal or zip code</label>`
and DR1's has `Postcode or Zip code`. Structural difference, not a coverage
gap either way.

Everything below is checked against the shared evidence
(`capture/html/...`), the frontend at `76a864ba` and the prototype at
`491b3926`. Where a claim rests on source rather than a picture, the file and
line are given.

---

## 1. Is anything in `dr1b` wrong?

**Twelve of the fifteen are sound.** One is flatly wrong, and two carry a
load-bearing sub-claim the evidence refutes.

### WRONG — inc-117, "DR1 puts no limit on how many countries a consignment travels through"

DR1 caps transit countries at twelve, and the cap is not a passing detail —
it is built into the control DR1 uses for the whole page.

`app/assets/javascripts/transit-country-search.js`:

```
2:  // Transit country search — select from dropdown to add to table, reset search (max 12)
6:  const MAX_COUNTRIES = 12
161:   return selectedCountries.length >= MAX_COUNTRIES
210:   announce(`Maximum of ${MAX_COUNTRIES} countries reached. Remove a country to add another.`)
```

and the enforcement at `:164-174`, which disables both the input and the
search button once twelve are added:

```js
function updateCountryLimitState () {
  const atMax = isAtMaxCountries()
  input.disabled = atMax
  button.disabled = atMax
  ...
}
```

The finding's own `falsifiedBy` is "Finding a stated or enforced maximum
number of transit countries in DR1". **It fires.** The difference slot's
instruction — "Remove the cap and the hint that announces it… the number
twelve appears nowhere in the signed-off design" — is the opposite of what
the design does. Both sides cap at twelve; what differs is only *how* the cap
is expressed (frontend states it in a hint and rejects on submit; DR1 states
nothing up front and disables the control at the twelfth, announcing
"Maximum of 12 countries reached. Remove a country to add another.").

The verifier read `app/routes.js` and the page HTML and concluded there was
no length check. That is true of the server side and irrelevant: DR1's transit
page has no server-side anything — the same handler saves an empty list
without complaint (see inc-119, below). The rule lives in the client script
that builds the control.

`dr1` gets this right. Its inc-128 says: "The same twelve-country cap
applies, but DR1 reaches it differently: the search box and its button are
disabled once twelve are added, and a screen-reader message says 'Maximum of
12 countries reached…' (`app/assets/javascripts/transit-country-search.js:6`,
`160-172`)". Correct to the line.

**Consequence:** inc-117 should be struck, or rewritten as a copy/interaction
finding about *where the cap is announced*. As written it would remove a rule
the signed-off design has.

### OVERSTATED — inc-118, the transit-country ordering claim

The control difference is real and well evidenced (frontend: 31 checkboxes,
no search, no remove; DR1: type-ahead plus a removable "Country" table).
But the finding's second claim — "so the order the consignment passes through
is never recorded", and the difference slot's instruction to "store the answer
as an ordered sequence rather than a set" with the hub, review page and
submitted payload all changed to accept it — rests on DR1 preserving insertion
order. It does not:

```js
// app/assets/javascripts/transit-country-search.js, addCountry()
selectedCountries = [...selectedCountries, country].sort((left, right) => left.localeCompare(right))
```

DR1 re-sorts alphabetically on every add. Its summary table and its review row
(`app/routes.js:4801`, `normalizeTransitCountries(...).join(', ')`) therefore
print alphabetically, exactly as the frontend's checkbox order does. **Neither
side records travel order.** The verifier checked that the review row preserves
the order of the stored array — true — but not that the stored array is itself
sorted.

This matters for scheduling, not just accuracy: as written the increment is a
data-model change ("anything that reads it… has to accept an ordered list");
correctly stated it is a control swap. `dr1`'s inc-128 makes no ordering claim
and is the safer text.

### OVERSTATED — inc-112, the port-of-entry list membership

The finding is sound in substance and is `dr1b`'s single best piece of new
signal (see §2). Two things in it are wrong:

**The count.** Both author and verifier say DR1 searches **213** entries. It
searches **205**. The verifier says it "counted both datasets out of the
captured DOM"; the number 213 is what you get by splitting the JSON blob on
commas, and eight entries contain an internal comma — "Broadford, Isle of
Skye", "Kettletoft, Sanday", "Lochboisdale (Loch Baghasdail), South Uist",
"Millport, Great Cumbrae", "Pierowall, Westray", "Rothesay, Isle of Bute",
"Tarbert, Loch Fyne", "Whitehall Village, Stronsay". Counting quoted strings in
`app-airport-search__data` on `dr1-arrival-details.html:363` gives 205, and
205 entries + 8 internal commas = 212 commas, which reconciles. The 28-airport
prefix is right (`London Heathrow - LHR` … `Dundee - DND`), so the seaport
gazetteer is 177, not 185.

**The characterisation of the frontend's 78.** The finding argues the dispute
partly on this: "The frontend's 78 read as the border-control-post set and
come from real reference data rather than a hardcoded page list." The first
half is refuted by the frontend's own captured copy. `fe-port-of-exit.html`
line 16:

> Choose where the consignment will leave Great Britain. **Exit and entry share the same port list.**

It is one general list serving both questions, and its members are plainly not
an animal border-control-post set — Cambridge Airport, Coventry Airport,
Northampton Airport, Nottingham Port, Perth Port, Barking Port, Methil Port,
Hythe Port. `dr1`'s inc-087 says so directly ("Port of exit is a select of 78
entries drawn from the general ports-of-entry reference list… Nothing marks
which of them can handle animals").

**`dr1b` contradicts itself here.** Its own inc-079 (`origin`) says "the
frontend offers the whole 78-entry list of GB ports and airports, most of
which cannot handle live animals". inc-112 and inc-079 cannot both be true.
inc-079 is the true one.

The `disputed` band survives all of this, but on the other leg of the argument
— DR1's own self-contradiction, which is solid (see §4).

### Minor — inc-113 title

"'Port of Sheerness' twice **under the same code**" is not what the DOM shows:
the codes are `GBSHS` and `GB SHS`. The detail slot has it right ("the same
code with and without its space"). Title only.

### Sound, and worth noting as improvements on `dr1`

- **inc-119** (transit countries must not be empty) is better evidenced than
  `dr1`'s inc-129. `dr1` rests its prototype side on
  `app/routes.js:1932-1935`, `hasTransitCountriesComplete`, whose body is
  `return true` under the comment "Transit countries are optional". That
  function is **dead code** — `grep` over `app/routes.js` finds it defined at
  :1932 and called nowhere. The hub row actually calls
  `hasTransitCountriesSelected` (:5801), which returns `statusTodo` while the
  list is empty. `dr1b`'s verifier caught exactly this, rewrote the prototype
  slot around the live evidence (the POST handler at :10503-10537 saves and
  redirects with no validation; the review card is built
  `...reviewCardErrorState(true, 'Transit countries')` under the comment
  "Transit countries are optional for submission" at :4795-4805), and recorded
  that the hub row stays "To do" on both sides. The conclusion is the same; the
  evidence is better and one of `dr1`'s consequences ("the hub… stop[s] holding
  the notification open") is corrected.
- **inc-123** is broader than `dr1`'s inc-132 and correct: DR1's table has six
  columns (Name, Address, Approval number, Type, Status, action link), so the
  gap is type + status + View details, not status alone. Verified in
  `dr1-transporter.html:310-510`.

---

## 2. What did `dr1b` find that `dr1` missed?

Four subjects. Three are real; one is the wrong one above.

### inc-112 — port-of-entry list membership. REAL, and the most valuable thing in either run's transport set.

`dr1` says **nothing** about which places either side offers as the port of
entry. `grep 'Belfast'` over `EUDPA-328-DR1/backlog.json` returns **0**. Its
only two port findings are about spelling (inc-126) and duplicate rows
(inc-125). So the entire membership question — a 205-entry list against a
78-entry one, with no overlap of convention and no shared basis — went unraised
in the earlier run.

Verified in the shared evidence:

- DR1's list holds Northern Ireland: `Belfast - GBBEL`,
  `Belfast International - BFS`, `Belfast City (George Best) - BHD`,
  `Larne - GBLAR`, `Warrenpoint - GBWPT`, `Kilkeel - GBKLK`,
  `Londonderry - GBLDY`, `Coleraine - GBCLR`, `Kilroot - GBKLR`,
  `Ardglass - GBAGL`.
- And Crown Dependencies / Channel Islands: `Jersey - JER`,
  `Guernsey - GCI`, `Isle of Man - IOM`.
- And harbours no consignment is inspected at: `Plockton - GBPLO`,
  `Kettletoft, Sanday - GBKET`, `Pierowall, Westray - GBPIE`,
  `Whitehall Village, Stronsay - GBWHL`.
- The frontend's 78 contain no Northern Ireland location at all. I read all 78
  labels out of `fe-arrival-details.html`; the falsifier does not fire.

### inc-114 — "Enter contact details" heading and field order. REAL, new.

`dr1` observed the heading twice in passing (inc-122's field list, inc-127's
context sentence) but filed no finding about it. The difference is plain in the
captured DOM:

- `fe-transporter-private.html`: `Telephone number` then `Email address`, no
  heading between the Country select and the contact fields.
- `dr1-transporter-add-private.html`: `Enter contact details`, then
  `Email address`, then `Phone number`.

### inc-120 — transit-country list membership. REAL, new for this page.

DR1's transit list is 41 entries; the frontend's is 31. I counted DR1's out of
`dr1-transit-countries-selected.html`: the 27 EU member states, eleven
outermost regions and overseas entities (Azores, Canary Islands, Ceuta, French
Guiana, Guadeloupe, Madeira, Martinique, Mayotte, Melilla, Reunion, Saint
Martin) and Guernsey, Isle of Man and Jersey — with Norway, Switzerland,
Iceland and Liechtenstein absent. The frontend's 31 are the EU 27 plus
Iceland, Liechtenstein, Norway and Switzerland, drawn from
`countries.originCountries()`.

`dr1` raised the same underlying list difference, but only for the **origin**
country question (inc-080, `origin` domain: "A user importing from the Canary
Islands, Jersey or French Guiana cannot say so"). Neither run raised it for
both questions. `dr1b`'s inc-120 is the only place in either backlog that
records it for transit, and its observation that one frontend list serves both
questions is the reason it matters.

The `disputed` band is right: DR1's own page says "Countries the consignment
will travel through are countries between the country of origin and the
destination country", and a consignment does not transit Réunion or Mayotte.

### inc-117 — twelve-country cap. NOT REAL. See §1.

---

## 3. What did `dr1` find that `dr1b` missed?

Three subjects. All three are real.

### inc-121 — the arrival-date hint. REAL, and a clean miss.

Observable in the shared evidence with no source reading required:

- `fe-arrival-details.html:16` — "The expected date of arrival at the port of
  entry. **Enter a date between 13/8/2026 and 20/2/2027.**"
- `dr1-arrival-details.html:37` — "The expected date of arrival at the port of
  entry. **For example, 27/3/2026**"

Both runs authored findings against these two screens (`dr1b` filed inc-110,
inc-113 and inc-121 on this pair) and `dr1b` did not raise the hint. Low-cost
copy change; a straightforward coverage gap.

### inc-120 — an added private transporter is not kept for reuse. REAL, partially covered.

The frontend commits the private transporter onto the notification and nowhere
else — `private-transporter-details.controller.js:158`,
`state.commit(request, h, privateTransporterRecord(values))`, and nothing reads
it back. DR1 pushes it onto the user's own records:

```js
// app/routes.js, saveAddedTransporter()
sessionData.addedTransporters.unshift(transporter)
syncTransporterSession(sessionData, transporter)
```

and, where the add started from the address book, copies it there too.

`dr1b` has the observation but no row for the work. inc-111 notes "The added
transporter joins the directory with the 'New' status the list shows" and
inc-124 notes "A private transporter the user has used before must be typed in
again", but both are `frontend-work` rows about pages. `dr1` files it as its
own `needs-backend` increment, which is the honest band — a transporter needs
somewhere to live other than the notification, and that is a persistence
change. Burying a `needs-backend` dependency inside a `frontend-work` row
understates what has to land first.

### inc-123 — the Northern-Ireland-only commercial transporter. REAL. Discussed in §4.

---

## 4. Where they contradict each other, which is right?

### 4a. The commercial-transporter nationality — `disputed` beats no finding

**What the evidence shows.** DR1 asserts the restriction and its own directory
breaks it:

- `dr1-transporter-add.html` (Choose a transporter type), rendered text:
  Commercial is hinted **"This can only be a commercial transporter from
  Northern Ireland."**
- `app/views/partials/transporter-add-commercial-fields.html:185-201` renders
  the Country select disabled on Northern Ireland with the value in a hidden
  field, and `app/routes.js:3416-3420` feeds that form only NI addresses.
- `dr1-transporter.html:310-510` lists eight records, four of them Commercial:
  **Yusen Logistics (Romania) SRL** (Bucharest), **Roadtrain Ltd** (Dublin),
  **Danish Meat Export ApS** (Copenhagen), **Portuguese Livestock Lda**
  (Lisbon). **None is Northern Irish.**

Both runs describe those four correctly; there is no factual disagreement.

**The frontend does *not* carry the same guidance, and this is where `dr1b`'s
stated ground fails.** `dr1b` declined to file on the basis that the frontend
"carries the same mixture under the same guidance". The mixture is shared —
`fe-transporter-commercial.html` offers García Livestock Transport SL
(Switzerland) and J & G Campbell LTD (Belgium). The guidance is not.
`fe-transporter-type.html` hints Commercial as **"A business approved to
transport animals — you will choose one from a list"** and says nothing about
where a transporter may be based, anywhere on the page.

So this is not a shared defect. **The contradiction is entirely internal to
DR1**, and the frontend's difference from DR1 is that it never states the rule
at all. That is a parity difference of exactly the kind the corpus exists to
record, and it is one the frontend could not have inherited.

**Verdict: `dr1`'s `disputed` finding is better.** Four reasons.

1. **The suppression rule was applied to a case it does not fit.** "Both sides
   share the defect" justifies filing nothing only where the frontend already
   matches the design. Here it does not match: DR1 states the rule three times
   over and the frontend states it nowhere.

2. **`disputed` is the band for precisely this.** The requirements side
   contradicts itself, so nothing is safe to build until the service owner
   rules. That is the band's definition, and `dr1`'s inc-123 names the ruling
   needed ("whether an approved commercial transporter may be based outside
   Northern Ireland") and both branches that follow from it.

3. **Filing nothing loses the question, and loses a live consequence.** `dr1b`
   did preserve the observation — but only inside inc-111's difference slot
   ("Build the page with an ordinary country field until a designer settles
   which of the two DR1 means") and inc-124's prototype slot. inc-111 is an
   `add-page` row for a page that does not exist yet. Nobody triaging today's
   frontend reaches it. And neither slot asks the second question `dr1` asks:
   whether the two records **already on the frontend's list** — a Swiss one and
   a Belgian one — may legitimately be there. That question is live now,
   regardless of whether the add page is ever built.

4. **`dr1b` does not apply its own rule consistently.** It banded inc-112 and
   inc-120 `disputed` on exactly the reasoning it declined to use here — the
   requirements side contradicts itself, so settle it before changing either
   side. Applying the opposite treatment to the nationality question, with no
   stated reason for the difference, reads as an omission rather than a
   principle.

**The rule I would carry forward, since this will recur:**

> Where the requirements side asserts a rule and its own data breaks that rule,
> **file it, banded `disputed`** — the contradiction is a decision the service
> owner owes, and the band exists so nothing gets built on an unresolved one.
>
> File nothing only when there is genuinely no observable difference between
> the two sides *and* no decision is owed — the defect is a shared property of
> the domain, not a rule one side asserts and the other does not.
>
> The failure mode of suppression is not a missing row. It is that an
> authoring agent silently rules that the frontend's current behaviour is
> correct, and no one ever sees the ruling.

The counter-argument in `dr1b`'s favour, stated fairly: a `disputed` row that
implies no frontend change today is a backlog row nothing can act on, and
`dr1`'s own text concedes "nothing here is safe to build". That is true, and it
is what the band is for — `disputed` rows are a decision surface, not build
work. It does not outweigh the four points above.

### 4b. Port-of-entry list membership — `dr1b` is right, `dr1` is silent

`dr1` has no finding on this and no mention of Northern Ireland in any port
context (0 hits for "Belfast"). There is no contradiction to settle, only a gap
— and `dr1b` fills it.

On the strength of the evidence: **`dr1b`'s conclusion is right, its cited
reason is half wrong, and the true reason is stronger than either run
argued.** The verifier reports the requirements side contradicting itself
outright, and the shared evidence supports that squarely:

- `dr1-declaration.html:36` — "I am responsible from the submission of this
  notification to **when it enters Great Britain**."
- `dr1-transporter.html` — "transporting any live vertebrate animals in, to,
  from or **through Great Britain (GB)**".
- `dr1-arrival-details.html:49` — the port field is "Choose where the
  transporter will enter with the consignment", over a list containing Belfast,
  Larne, Warrenpoint, Kilkeel, Londonderry, Coleraine, Kilroot, Ardglass,
  Jersey, Guernsey and Isle of Man — none of them in Great Britain.

That is the contradiction, and it is flat: the notification's own declaration
scopes the movement to Great Britain while its port list offers entry points
that are not in Great Britain.

What `dr1b` got wrong is the other half of its argument — that the frontend's
78 are the border-control-post set (refuted above by
`fe-port-of-exit.html:16` and by `dr1b`'s own inc-079). Correctly stated:
**neither side's list is an animal border-control-post list.** DR1's is a
general UK ports-and-airports gazetteer including places outside GB; the
frontend's is a general GB ports-and-airports list, shared with the exit
question, "most of which cannot handle live animals". Reading `dr1`'s inc-087
alongside `dr1b`'s inc-112 gives the whole picture that neither run has on its
own: DR1 restricts *exit* to ten animal BCPs and leaves *entry* wide open at
205; the frontend leaves both wide open at 78. The `disputed` band is right
on the corrected argument, and the settling question is the one `dr1b` names —
the authoritative list of points of entry a live-animal consignment may be
notified against, plus whether NI arrivals are in scope for this service.

### 4c. Malformed port names — `dr1` has it; the disagreement is over the duplicates

**`dr1` does have this**, as inc-126, banded `needs-backend`, and it reaches
the same conclusion `dr1b` does about where the fix lands ("the list reaches
the frontend from the reference-data service and is only captured into the
repo as a fixture"). `dr1b`'s rebanding to `needs-backend` is not new — it is
`dr1`'s band already, and it is correct on the source: the frontend fetches
the list at runtime
(`src/server/app/services/ports/client.js`,
`fetch(`${referenceDataUrl}/ports-of-entry`)`), and the reference-data service
serves it from `PortsOfEntryController`.

**The disagreement is about the five-versus-three split.** `dr1` files three
malformed names as `needs-backend` (inc-126) and splits the two duplicated
names out as a separate `disputed` finding (inc-125). `dr1b` files all of it
as one `needs-backend` row (inc-113).

All five are confirmed verbatim in `fe-arrival-details.html`:

```
Teestort (GB TEE)
TILBURY (GB TIL)
Portsmouth  Port (GB PME)      <- od -c: "P o r t s m o u t h SP SP P o r t"
Port of Sheerness (GBSHS)
Port of Sheerness (GB SHS)
Pembroke Port (GB PED)
Pembroke Port (GB PEM)
```

DR1's list holds `Teesport - GBTEE`, `Tilbury - GBTIL` and one
`Sheerness - GBSHS`, and no Pembroke or Portsmouth entry. Neither run's
falsifier fires.

**`dr1b`'s single `needs-backend` row is the better call, and `dr1`'s
`disputed` band on inc-125 is the weaker judgement.** `dr1` disputes the
duplicates because DR1's own catalogue repeats eight names — Aberdeen,
Bristol, Cardiff, Dundee, Glasgow, Inverness, Manchester, Southampton. I
verified all eight, and they are real. But they are not the same phenomenon:
in DR1 each pair is an **airport and a seaport of the same city under
different code systems** (`Aberdeen - ABZ` IATA against `Aberdeen - GBABD`
UN/LOCODE) — two facilities, two records, correctly. The frontend's
`GBSHS` / `GB SHS` pair is one code with and without a space, which `dr1`
itself concedes "is a data defect on its own terms" — and then routes out of
the backlog ("belongs in a reference-data ticket rather than in this
backlog"), which leaves a conceded defect with nowhere to go.

There is also evidence `dr1`'s reasoning did not weigh: the frontend's own
list disambiguates same-city facilities by name — `Aberdeen Airport (GB DYC)`
against `Aberdeen Harbour (GB ABD)`, `Port of Grimsby` against
`Grimsby and Immingham Port`, three separately named Dover entries. Identical
labels are anomalous *within the frontend's own convention*, quite apart from
what DR1 does. That undercuts the disputed band for Sheerness outright and
weakens it for Pembroke.

`dr1b` also found a fifth instance `dr1` missed — the Pembroke pair is in
`dr1`'s inc-125, but `dr1` never counts Portsmouth alongside the duplicates,
and `dr1b`'s row is the only one that lists all five defects in one place with
one destination. On the substance the two runs agree; on the routing `dr1b` is
right.

---

## Contamination note

Nothing in this domain touches the one contaminated subject (the blocked
exit-details hub row). All agreements here are between runs that could not
have seen each other, and every disagreement is trustworthy by construction.

## Summary of grades

| `dr1b` finding | Subject | Grade |
|---|---|---|
| inc-110 | means of transport: radios vs select | sound |
| inc-111 | cannot add a commercial transporter | sound |
| inc-112 | port-of-entry list membership | **overstated** — count 205 not 213; "frontend's 78 are the BCP set" refuted; band right |
| inc-113 | malformed + duplicate port names | sound; title says "same code" where codes differ by a space |
| inc-114 | contact-details heading and field order | sound, new |
| inc-115 | phone country-code hint | sound |
| inc-116 | postcode label | sound (`dr1` files it under `service-wide`) |
| inc-117 | twelve-country cap | **WRONG** — DR1 caps at 12 in `transit-country-search.js:6` |
| inc-118 | transit countries: checkboxes vs type-ahead | sound on the control; **ordering claim wrong** — DR1 sorts alphabetically |
| inc-119 | transit countries must not be empty | sound, better evidenced than `dr1`'s |
| inc-120 | transit-country list membership | sound, new |
| inc-121 | transport-identification hint as a list | sound |
| inc-122 | transporter list has no search | sound |
| inc-123 | list omits type, status, details link | sound, broader than `dr1`'s |
| inc-124 | type asked before the directory | sound |
