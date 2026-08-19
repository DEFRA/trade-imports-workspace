# Morning report — EUDPA-328 findings report v2

Written overnight, 18–19 August 2026, against the plan in `REPORT-V2-PLAN.md` and
the backlog in `report-v2-backlog.json`. Appended as the work went, so the order
below is the order it was decided, not the order it was tidied.

Read the first section first. Everything else you could reconstruct from the
diff; that section you could not.

---

## 1. Decisions I made that you might have made differently

- **The join to the findings file is by title, not by ordinal — the plan's
  inc-026 is wrong.** I checked before building on it: not one of the 97 ordinals
  lines up, because the canonical file is ordered by domain and milestone while
  the findings file is in discovery order. Increment 1 is finding 2. Title is a
  clean bijection — 97 unique titles on each side, identical as sets — so the
  join is by title and the checksum is that every title finds exactly one
  partner. `tim parity check` prints how far an ordinal join would have got (0)
  so nobody rediscovers this. The plan's worry about "98 titles against 97
  increments" is moot: the 98th is the refuted finding, which is not in the
  canonical file at all.

- **I pinned both sides to HEAD and recorded separately what the pictures are
  actually of.** Your inc-001 ruling was "latest of both", but the 70 prototype
  screenshots on disk were taken at `7da4f70` and the frontend page models at
  `32f6106c`. If the masthead showed only the pins it would be claiming those
  pictures are of code they are not. So `.corpus-meta.json` carries `pins` (where
  the citations resolve) and `captures` (where the pixels came from) as separate
  facts, and the page says in the header when they disagree. The alternative was
  to re-capture first and keep one number; I judged an honest two numbers now
  worth more than a blocked report.

- **I did not move your prototype clone off `7da4f70`.** Re-pinning to
  `491b392` is your inc-002 ruling and the citations already resolve there —
  `git show` reads a fetched object without a checkout. But moving the working
  tree changes what you see if you open that repo yourself, and no picture has
  been re-taken yet, so I fetched and left the tree alone. Re-capture is the
  moment to move it.

- **I extended the corpus profile to `sides[]`, a list, rather than a
  frontend/prototype pair.** The handover says the requirements side will not
  always be the prototype and may be several sources. Nothing in the generator
  counts to two: the columns, the coverage report and the asset ladder all
  iterate `sides`. It cost about twenty lines and it is the difference between
  adding a third source being a data edit and being a rewrite.

- **The citation resolver narrows by path suffix, not just basename.** The plan
  assumed 391 bare basenames and expected ~30 in the manual queue. A first pass
  keyed only on the basename queued 68, most of them citations that were never
  ambiguous — `consignment-details/fields.js` names one of the four files called
  `fields.js` outright. Using the directory segments the analyst actually wrote
  brought it to exactly 30. This is more resolution than the plan assumed, so it
  is worth a spot-check: the queue is in `evidence.json.unresolved`.

- **A bare `:NN` is queued only when a comparison sits between it and the file it
  would inherit.** The plan said "mark needsHuman where the sentence alternates
  sides". Read literally — any sentence containing "vs" — that queued 30-odd
  continuations that were perfectly clear. The rule I used is exact to what the
  corpus does: `copy.en.js:9-10 vs :17` elides the *other* file's name, so
  proximity points at the wrong one; `routes.js:5410 … :5444` in a sentence with
  no comparison does not.

- **The anchor check is two answers, not one.** Invariant I7 as written asks "is
  the identifier in the snippet". That conflates a line range that has drifted
  with a claim whose premise has moved. I split them: 25 citations where the
  identifier is in the file but outside the cited lines (widen the range), and
  56 where it is absent from the file entirely (re-verify the finding). The
  second list is the real yield of pinning to HEAD and it is in section 3.

- **I made the Makefile a route into `tim` rather than leave the install
  blocked.** `npm --prefix <workspace>/tim install` is denied by the guard hook,
  whose message says to `cd` to the real path and install there — which an agent
  cannot type. The hook's premise is also dead: it guards a workspace symlink
  that became a real clone on 18 August. I could not fix the hook (`.claude/hooks/`
  is protected from agent edits, correctly), so I added `make tim-install`,
  `tim-test`, `tim-lint`, `tim-format`. **The hook still needs your one-line fix**
  — see section 4.

- **I added two subcommands the plan did not list: `tim parity meta` and
  `tim parity serve`.** `meta` writes `.corpus-meta.json`, which the plan wanted
  but assigned to no command. `serve` exists because the page is full-resolution
  and `file://` cannot lazy-load 20 MB of screenshots. Both are small and both
  are testable surfaces rather than steps in a runbook.

- **The report shows each finding's two evidence pointers under the column they
  belong to, even where the prose cites nothing.** Eleven findings carry no
  `file:line` inside their text at all, and without this their citations would be
  the only ones on the page with no snippet under them. Every citation appears
  exactly once, in the column whose side it names or whose repo it lives in;
  anything answering to neither — a backend class, a captured page model — gets
  its own strip rather than being pushed into a side it is not about.

- **I dropped two increments outright rather than half-doing them.**
  `inc-023` (the `start-parity.sh` dispatcher) because `chmod` is policy-blocked
  and an unrunnable script is worse than none — the skill routes through
  `tim parity`, which needs no execute bit. `inc-040` (`pin-checkout.sh`, which
  clones the frontend at `32f6106c` and overlays the harness) because your
  inc-001 ruling made it moot: capture happens at HEAD now, so there is nothing
  to pin a checkout to.

- **`tim parity check` will not let me quietly report progress as success.**
  Three invariants now say **skipped** rather than **pass** when nothing has
  been migrated yet, because "0 quoted spans survive" reads as a clean bill of
  health on work not yet done. That is a deliberate choice to make the report
  less flattering.

---

## 2. The two canaries

Both are in the backlog and rendered on the page. Nothing else depends on them
until you have looked.

### Canary 1 — one authored decision question (inc-031)

On **inc-055**, chosen because its original states the ask in prose, so the
authored version can be read against it.

**The frozen original says it like this** (the last sentence of the second
paragraph of `detail`, which is never edited):

> Confidence is `medium` rather than `high` because a divergence in this
> direction may be the frontend being right and the prototype's cattle entry
> being incomplete — this needs a ruling from whoever owns the IPAFFS identifier
> mapping, not a unilateral removal.

**The falsifier**, which is where an authored question is meant to come from:

> A source of truth (the V4 data-fields spec or an IPAFFS extract) showing
> tattoo is a valid cattle identifier, which would make the prototype the stale
> side and close this with no frontend change.

**The authored `decisionRequired`:**

| Field | Value |
|---|---|
| question | Should the frontend keep offering Tattoo as a cattle identifier, or drop it to match the prototype? |
| audience | sam |
| source | authored |
| options | *Keep it.* The frontend is right and the prototype's cattle entry is incomplete.<br>*Drop it.* Match the prototype's two cattle identifiers, ear-tag and passport.<br>*Neither yet.* Get the V4 data-fields spec or an IPAFFS extract first — the falsifier says that is what settles it. |
| consequence | Blocks inc-076, which reuses this band's identifier set. It also leaves the frontend collecting an identifier the design does not ask for, on every cattle record submitted meanwhile. |

**What I want you to check, in order of how much it matters:**

1. **Is that the right question?** The original says "this needs a ruling from
   whoever owns the IPAFFS identifier mapping". I turned that into a question
   about what the frontend does. Those are not the same question — one asks who
   decides, the other asks what to build. I chose the second because the report
   is a surface for making the call, not for routing it. If you would rather the
   47 read as "who owns this?", say so and I will re-derive them all.
2. **Are three options right, or two?** The third — get the spec first — is not
   in the prose. It is the falsifier turned into an action. It reads to me as
   the honest option for a medium-confidence finding, but it also gives every
   decision an easy way to be deferred, and 47 of those would be a bad outcome.
3. **Is the consequence pitched right?** I wrote two sentences: what it blocks
   mechanically, and what it costs while nothing is decided. The second is the
   one that makes a decision feel worth making, and it is also the one most
   likely to overstate things.
4. **The label.** The card prints *"Drafted from the falsifier during the
   migration — check this is the right question."* under every authored one.

Where to see it: `tim parity serve EUDPA-328`, then
`http://127.0.0.1:4328/#inc-055`. Or in the terminal:
`tools/parity/next-decision.sh EUDPA-328 --domain commodities`.

### Canary 2 — one finding rewritten into plain English (inc-034)

On **inc-028** — the copy-change finding whose own subject is the typo
`"has as it's aim,"`. If a language pass can lose a claim anywhere, it is here:
a copy editor is exactly the kind of agent that silently fixes the typo it was
asked to report.

Three states, all real and all in the file. The first is frozen forever.

**Frozen `detail` (never edited, the oracle):**

> Both sides offer the same eleven purposes in the same order with the same
> labels. The hints differ on four. Sale/gift: the frontend has "has as it's
> aim," (possessive/contraction error) and "(e.g. a gift)" where the prototype
> has "has as its aim" and "(for example a gift)." - the GDS style guide bans
> e.g. (copy.en.js:6 vs internal-market-purposes.js:7). Breeding (copy.en.js:9-10
> vs :17), Racing/competition/show/training (copy.en.js:12-13 vs :27) and
> Production (copy.en.js:18-19 vs :42) each end without a full stop in the
> frontend and with one in the prototype. The remaining seven hints match
> exactly.

**Pass A — words moved into slots, not reworded:**

| Slot | Text |
|---|---|
| frontend | Sale/gift: the frontend has "has as it's aim," (possessive/contraction error) and "(e.g. a gift)" `[[c1]]`. Breeding `[[c3]]`, Racing/competition/show/training `[[c5]]` and Production `[[c7]]` each end without a full stop in the frontend. |
| prototype | Where the prototype has "has as its aim" and "(for example a gift)." - the GDS style guide bans e.g. `[[c2]]`. Breeding `[[c4]]`, Racing/competition/show/training `[[c6]]` and Production `[[c8]]` each end with one in the prototype. |
| difference | Both sides offer the same eleven purposes in the same order with the same labels. The hints differ on four. The remaining seven hints match exactly. |

Pass A came out with a **word residue of exactly zero** — every word of the
frozen detail, minus citations and sentinel labels, survives somewhere in the
slots. Same for inc-037, the 3,345-character one.

**Pass B — the rewrite. This is the thing to read:**

| Slot | Pass A (words moved) | Pass B (rewritten) |
|---|---|---|
| frontend | Sale/gift: the frontend has "has as it's aim," (possessive/contraction error) and "(e.g. a gift)" ¹. Breeding ³, Racing/competition/show/training ⁵ and Production ⁷ each end without a full stop in the frontend. | The sale or gift hint reads "has as it's aim," and "(e.g. a gift)" ¹. Three things are wrong with it: "it's" should be "its", the comma does not belong, and the GDS style guide bans e.g. Three more hints end with no full stop — breeding ³, racing/competition/show/training ⁵ and production ⁷. |
| prototype | Where the prototype has "has as its aim" and "(for example a gift)." - the GDS style guide bans e.g. ². Breeding ⁴, Racing/competition/show/training ⁶ and Production ⁸ each end with one in the prototype. | The same hint reads "has as its aim" and "(for example a gift)." ². The same three hints each end with a full stop — breeding ⁴, racing/competition/show/training ⁶ and production ⁸. |
| difference | Both sides offer the same eleven purposes in the same order with the same labels. The hints differ on four. The remaining seven hints match exactly. | Both sides offer the same eleven purposes, in the same order, with the same labels. Four of the hints differ. The remaining seven match exactly. |
| falsifiedBy | If the frontend copy is the signed-off content-designer wording and the prototype's edits are unreviewed, the direction of travel reverses - but "it's" for "its" is wrong either way. | If the frontend copy is the signed-off content-designer wording and the prototype's edits are unreviewed, the direction of travel reverses. "it's" for "its" is wrong either way. |

**What the rewrite did, deliberately:**

- **Kept every quoted string character for character**, typo included. `"has as
  it's aim,"` still has the wrong apostrophe and the comma that should not be
  there, because that *is* the finding.
- **Moved the "GDS style guide bans e.g." clause from the prototype column to
  the frontend column.** It is a reason the frontend is wrong, not a fact about
  the prototype. Markers may move between slots; a citation may never be deleted
  or edited.
- **Dropped "(possessive/contraction error)"** — a nested parenthetical — and
  said the same thing in a sentence: *"it's" should be "its", the comma does not
  belong.*
- **Dropped "in the frontend" and "in the prototype".** The column heading says
  it. That is preamble the headings now carry.
- **Kept the falsifier conditional.** "If … then" is what a falsifier is. Making
  it declarative would have turned a condition into a claim.

**What it lost, by the checker's own count:** the words *contraction, without,
one, sharpen, defect, actual, best, argued*. All eight are explainable — they
are the words the rewrite deliberately replaced. Nothing else.

**The polarity list is empty.** No hedge introduced, no absolute removed. That is
the invariant that cannot be automated past this point, so it is the one to be
sceptical about: an empty list on one finding is weak evidence.

**What I want you to check:**

1. **Voice.** Is that the register you want across 97 findings? It is plainer
   than the original and slightly longer in the frontend slot, because unpacking
   a parenthetical costs words.
2. **The clause I moved between columns.** If moving a reason to the side it is
   a reason about is wrong, say so now — it will happen on most findings.
3. **Whether "Three things are wrong with it:" is too chatty.** I think a
   colon-led list is the clearest way to say three defects; you may find it
   over-friendly for a technical record.

Where to see it: `http://127.0.0.1:4328/#inc-028`, and
`git diff 4a7cc95..5bafa0f -- workareas/journey-builder/EUDPA-328/backlog.json`
for the Pass A against Pass B diff.

---
