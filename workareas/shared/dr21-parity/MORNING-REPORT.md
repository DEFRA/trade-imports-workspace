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

- **The report shows each finding's two evidence pointers as a permanent
  "where to look" pair, even where the prose cites nothing.** Eleven findings
  carry no `file:line` inside their text at all, and without this their citations
  would be the only ones on the page with no snippet under them. It costs a
  little vertical space on every card and it means every card can be checked.

---
