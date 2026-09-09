# Running two build orchestrators against one backlog

**Scope.** Whether `workareas/journey-builder/EUDPA-409/backlog.json` should be
split so two `build-orchestrator` sessions, on two machines, can build
increments at the same time.

**Date.** 2026-09-09. Point-in-time. Re-run the queries if the backlog has moved
on.

**Verdict.** Do not split the file. The file is not the bottleneck and a split
buys nothing. Add a claim field and a claim protocol instead. Separately: as the
backlog is authored today the dependency graph permits **no parallelism at all**,
so the claim protocol is worth having for safety, not for speed. Speed needs the
dependency graph re-authored, and that is a product decision.

---

## 1. What actually writes to the file

Every write happens inside a subagent of `.claude/workflows/increment-build-loop.js`,
using the Edit tool on the local copy. **The loop never runs a git command against
the workspace repo.** Committing and pushing `backlog.json` is the orchestrator
session's job, once per increment, at the increment boundary.

| # | Stage | Where | Field written | Scope |
|---|---|---|---|---|
| 1 | Ticket | loop ~L901 (STEP 2d) | `ticket` | one increment |
| 2 | Ticket | loop ~L931 (STEP 5) | `branch` | one increment |
| 3 | Judge | loop ~L1332 | appends to `openQuestions` | one increment |
| 4 | Land | loop ~L1457 | `commit` (and `status` when `lifecycle: local`) | one increment |
| 5 | Pull request | loop ~L1527 | appends to `prs[]` | one increment |
| 6 | CI fix | loop ~L1648 | appends to `prs[]` | one increment |
| 7 | Merge | loop ~L1776 | `prs[n].merged`, `prs[n].sha` | one increment |
| 8 | Done | loop ~L1855 | `status: "done"` | one increment |
| 9 | Preserve work | loop ~L387 / ~L404 | appends to `notes` | one increment |
| 10 | Orchestrator step 3b | SKILL.md ~L257 | **appends a new increment object** | **shared structure** |

Nine of the ten write points are confined to a single increment object. Nothing
in the loop or the skill ever writes `run_id`, `schema_version` or `target`.

Row 10 is the only exception, and it is the only place where two writers can
collide structurally: both would append at the tail of the `increments` array,
touching the same closing lines. It is also rare — it fires only when a stage
defers work that no existing increment covers.

### Reads

| Reader | Query | Needs |
|---|---|---|
| loop L829 (preflight) | `.increments \| length` | whole array |
| loop L378, L399, L1443 | `.repo` | one increment |
| loop L668, L867, L1184, L1204, L1228, L1282 | whole increment object | one increment |
| loop L1893 (gate) | `.gate` | one increment |
| SKILL.md step 1 | derive query | **whole array** — every `status`, every `dependsOn` |
| SKILL.md step 3 | landed check | one increment |
| SKILL.md step 3b | keyword scan over titles and details | **whole array** |
| SKILL.md handover | status counts | **whole array** |

So four queries need the whole array. Any split has to keep those working.

### Why the file already merges

`backlog.json` is pretty-printed. The pending increments sit **16 to 20 lines
apart**:

```
3328:      "id": "inc-046",
3347:      "id": "inc-047",
3365:      "id": "inc-048",
3382:      "id": "inc-049",
```

Git's default merge context is three lines either side. Two hunks need six lines
of clear separation to merge without conflict, and adjacent increments have two
to three times that. Notes are JSON-escaped, so even a five-paragraph
`ATTEMPT FAILED` note is a **single line**, not a block.

This matches what happened today. Two writers pushed to `backlog.json` while a
third session held it dirty, and `git pull --rebase` merged cleanly both times
(`b1ee73d` touched inc-005 and inc-014; `e3a2a47` touched inc-045).

**Conclusion for question 1: per-increment isolation is already sufficient. A
split is not necessary.**

---

## 2. The dependency graph

Run this to see the shape:

```bash
jq -r '[.increments[] | (.dependsOn//[]) | length] | group_by(.) | map({(.[0]|tostring): length}) | add' \
  workareas/journey-builder/EUDPA-409/backlog.json
```

Result: `{"0": 1, "1": 61}`. Every increment but the root has **exactly one**
parent. The graph is a tree, not a mesh.

Now the out-degrees:

```bash
jq -r '[.increments[] | (.dependsOn//[])[]] | group_by(.) | map({(.[0]): length}) | add' \
  workareas/journey-builder/EUDPA-409/backlog.json
```

Out of 62 increments, exactly six have two children: inc-004, inc-013, inc-029,
inc-032, inc-039, inc-058. Every other node has one child or none. **Maximum
graph width is 2, and it is 2 at six points out of sixty-two.**

Three of those six forks are bookkeeping: inc-030, inc-033 and inc-040 are all
`merged-into`, absorbed into a sibling. So across the whole run there were
**three moments** where two real increments could have been built at once —
inc-005/inc-006, inc-014/inc-015, and inc-059/inc-062 (and inc-059 is `blocked`).
A colleague already exploited one of them: commit `b1ee73d` landed inc-005 and
inc-014 together.

### The remaining work is a strict line

```bash
jq -r '.increments[] | select(.id >= "inc-046")
  | [.id, .status, .type, .repo, (.section//"-"), ((.dependsOn//[])|join(","))] | @tsv' \
  workareas/journey-builder/EUDPA-409/backlog.json
```

| id | status | type | repo | section | dependsOn |
|---|---|---|---|---|---|
| inc-046 | todo | add-page | frontend | parties | inc-045 |
| inc-047 | todo | e2e | tests | – | inc-046 |
| inc-048 | todo | add-page | frontend | contact | inc-047 |
| inc-049 | todo | e2e | tests | – | inc-048 |
| inc-050 | todo | add-page | frontend | review | inc-049 |
| inc-051 | todo | chore | frontend | – | inc-050 |
| inc-052 | todo | add-page | frontend | review | inc-051 |
| inc-053 | todo | add-page | frontend | review | inc-052 |
| inc-054 | todo | chore | frontend | – | inc-053 |
| inc-055 | todo | e2e | tests | – | inc-054 |
| inc-056 | todo | restore | frontend | – | inc-055 |
| inc-057 | todo | e2e | tests | – | inc-056 |
| inc-058 | todo | chore | frontend | – | inc-057 |
| inc-059 | blocked | fix | backend | – | inc-058 |
| inc-060 | blocked | chore | frontend | – | inc-059 |
| inc-061 | blocked | chore | frontend | – | inc-060 |
| inc-062 | todo | chore | frontend | – | inc-058 |

Fourteen `todo` increments. Thirteen of them (inc-046 to inc-058) form an
unbroken chain, and inc-062 hangs off the end of it.

**Every dependency layer has width 1. Fourteen increments, fourteen layers. A
second machine would sit idle for the whole run.**

### The suggestion of splitting per page

Splitting the file per page or per section does not help, because the
serialisation is in `dependsOn`, not in the file layout. Two builders each
holding their own section file would still both compute "my next increment's
dependency is not done" and stop.

### Is the chain real?

Some of it is; a lot of it is an artefact of how `backlog-generate.sh` emits
increments — each one is simply pointed at its predecessor in array order.

Reading the pending tail against the sections:

- **Real.** inc-047 (E2E for the parties section) genuinely needs inc-046 (the
  last parties page). Same for inc-049 after inc-048, inc-055 after inc-054,
  inc-057 after everything.
- **Real.** The five review-section increments (inc-050 to inc-054) touch the
  same feature folder and the same check-answers page. Keep them serial.
- **Probably false.** inc-048 (contact page, frontend) depends on inc-047 (E2E
  for parties, tests repo). Different repo, different files, different section.
  The only genuine coupling is journey order, which is satisfied by the parties
  *pages* existing, not by the parties *spec* existing.
- **Probably false.** inc-050 depends on inc-049 for the same reason.
- **Probably false.** inc-056 depends on inc-055, and inc-058 on inc-057.

If those edges were re-pointed to the last real frontend predecessor, the graph
becomes:

```
L1  inc-046
L2  inc-047 (tests)   inc-048 (frontend)
L3  inc-049 (tests)   inc-050 (frontend)
L4  inc-051
L5  inc-052
L6  inc-053
L7  inc-054
L8  inc-055 (tests)   inc-056 (frontend)
L9  inc-057 (tests)   inc-058 (frontend)
L10 inc-062
```

**Fourteen slots become ten. A 29% saving, with the second machine idle in six
of the ten slots — 70% utilisation.** Note that every parallel pair is one
frontend increment and one tests increment. The only axis of real parallelism in
this backlog is **repo**, not page and not section.

That is the honest number. It is not nothing, but it is far less than "two
machines, half the time", and it costs a re-authoring of a dependency graph that
`PROGRAMME-NOTES.md` says is derived from ruled spec decisions.

---

## 3. The recommendation

### Primary: keep one file, add a claim protocol

**Do not split `backlog.json`.** Add one optional field per increment, and one
step to the orchestrator loop.

The field, written only when an increment is being worked:

```json
"claim": {
  "owner":   "sam-mbp",
  "at":      "2026-09-09T16:20:00Z",
  "expires": "2026-09-09T18:20:00Z"
}
```

An absent `claim` means unclaimed. An expired `claim` means abandoned and is free
to take. That way **the migration is a no-op** — nothing in the existing file
changes until a claim is written.

The mutual exclusion is git's own atomic ref update, not a new service:

1. `git pull --rebase` in the workspace.
2. Run the derive query (below). It skips increments claimed live by somebody
   else.
3. Write the claim with `jq`. Commit **only** that change. Push.
4. **If the push is rejected**, the other machine got there first.
   `git rebase --abort` if a rebase is in progress, then `git reset --hard @{u}`,
   and go back to step 1. Discarding is safe precisely because the commit holds
   nothing but the claim.
5. Run the loop.
6. Clear the claim in the same commit as the `status: "done"` write.

The claim must be pushed *before* the loop starts, because until it is pushed the
other machine cannot see it.

### Why not the other candidates

**One file per increment (`increments/inc-045.json`) with a thin index.** Costs
the most and returns the least. It would need: a rewrite of all four whole-array
queries into a `jq -s` fan-in over `increments/*.json`; path templating at twelve
per-increment `jq` call sites inside `increment-build-loop.js`; and new
`.gitignore` negations, because `workareas/journey-builder/*/*` is ignored and
`backlog.json` is tracked only through an explicit `!` negation on line 43.
Worse, the loop is shared — the skill says in as many words "Never edit
`.claude/workflows/increment-build-loop.js`. It is tracked and shared by every
programme." Changing its file shape for one run breaks every other run, so it
would have to learn both shapes. All of that to solve a merge problem that
sixteen lines of separation already solves.

**Split by section or page.** Does not address `dependsOn`, which is where the
serialisation is. It also cuts across the one real axis of parallelism, which is
repo: the parallel pairs in the graph above are always frontend + tests, and
those two sit in the same section.

**Split by repo.** Closer to the truth of the graph, but the file is the wrong
place to encode it. `repo` is already a field, `dependsOn` already crosses repos,
and a repo-split file would need the same cross-file dependency reads as the
per-increment split. Read the repo axis out of the field; do not carve the file
along it.

**Immutable plan plus mutable per-increment state files.** The cleanest of the
split options, and the closest runner-up. It would confine every one of the nine
per-increment writes to its own tiny file, and leave the plan untouched. It still
needs the whole-array derive query to read every state file, and it still needs
the loop's twelve call sites changed. And it fixes nothing that is currently
broken — the plan half never conflicts today because nothing writes to it.

---

## 4. Exactly what changes

### `.claude/skills/build-orchestrator/SKILL.md`

**Step 1, the derive query.** Replace with:

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ME=$(hostname -s)
jq -r --arg now "$NOW" --arg me "$ME" '
  ["done","deferred","dropped","blocked","rejected","merged-into"] as $withheld
  | [.increments[] | select(.status=="done") | .id] as $done
  | [ .increments[]
      | select(.status | IN($withheld[]) | not)
      | select((.claim // null) as $c
               | $c == null or $c.owner == $me or $c.expires < $now)
      | select([(.dependsOn // [])[] | IN($done[])] | all)
      | .id ]
  | .[0] // "NONE"
' workareas/<workarea>/backlog.json
```

Two changes from today's query: the extra `select` on `claim`, and jq argument
passing. Everything else — the five withheld statuses, the loud-failure
direction, `.[0] // "NONE"` — is unchanged.

**New step 1b, claim it.** Between derive and invoke:

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EXP=$(date -u -v+3H +%Y-%m-%dT%H:%M:%SZ)   # GNU date: -d '+3 hours'
B=workareas/<workarea>/backlog.json
git -C ~/git/defra/trade-imports-workspace pull --rebase
jq --arg id "<id>" --arg me "$(hostname -s)" --arg at "$NOW" --arg exp "$EXP" '
  .increments |= map(if .id == $id
    then . + {claim: {owner: $me, at: $at, expires: $exp}}
    else . end)
' "$B" > "$B.tmp"
jq empty "$B.tmp"
mv "$B.tmp" "$B"
git -C ~/git/defra/trade-imports-workspace add "$B"
git -C ~/git/defra/trade-imports-workspace commit -m "chore(<run>): claim <id>"
git -C ~/git/defra/trade-imports-workspace push   # rejected -> reset --hard @{u}, re-derive
```

**Step 3, the landed check.** Extend it to clear the claim once the increment is
`done`, in the same commit as the status write. The query itself is unchanged.

**Step 3b, appending a new increment.** This is the one write that can conflict
structurally. Make it pull-append-commit-push in one shell step, with a retry, so
the window between reading the array tail and pushing it is seconds rather than
the length of an increment.

**The handover prompt.** Add a line naming which machine holds which claims, so a
replacement agent does not walk into somebody else's increment. Get it from:

```bash
jq -r '.increments[] | select(.claim != null)
  | .id + "  " + .claim.owner + "  expires " + .claim.expires' \
  workareas/<workarea>/backlog.json
```

**The "Handover is sequential" paragraph.** It currently says two sessions on one
programme will fight over `backlog.json`. That becomes: two sessions may run
concurrently provided each claims before it invokes, and the claim is pushed
first.

### `.claude/workflows/increment-build-loop.js`

**No change.** Every one of its ten write points already writes to a single
increment object by id, and none of them reads the whole array except the
preflight length check. The loop does not need to know claims exist.

This is the strongest argument for the recommendation: the shared,
cross-programme file stays untouched.

---

## 5. What this does not solve

**Two builders picking the same increment.** The claim narrows the race to the
window between "read the file" and "push the claim" — seconds, not the thirty to
sixty minutes an increment takes. It does not close it. Two machines that read
simultaneously will both derive the same id, both write a claim, and the second
push will be rejected. **The rejected push is the safety mechanism**, and the
protocol only works if a rejected push is treated as "somebody beat me,
re-derive" and never as "retry the push".

**Cross-repo branch parity (CLAUDE.md rule 2).** Not solved, and it is the reason
a `both` increment must never be split across machines. If two builders each take
an increment that touches the frontend and the tests repo, they cut two different
branch names in the same two repos, and the merge order in `PROGRAMME-NOTES.md`
(backend, then frontend, then tests) has nothing to arbitrate between them. The
mitigation is a scheduling rule, not code: **only ever run two increments in
parallel when their `repo` fields are disjoint.** Every parallel pair in the
re-authored graph above satisfies this by luck, not by construction.

**Shared source files inside a repo.** Two frontend increments in the same set
will both edit the journey flow, the task-list rows and the section registry.
`backlog.json` would merge perfectly and the plants frontend would conflict. Any
parallelism that puts two increments in the same repo is buying a merge conflict
somewhere worse.

**A moving target under E2E.** The genuinely available pairs are always
frontend + tests. The tests-repo increment runs Playwright against a stack built
from `main`, while the frontend increment is landing a new page on that same
`main`. The E2E increment can go green, get merged, and be broken by its partner
an hour later. **This is the biggest risk in the whole proposal and the claim
protocol does nothing about it.**

**CI contention.** Two builders push to the same two GitHub repos. Actions queue,
`main` can go red from one increment while the other is waiting to merge, and the
loop's `main-red` stop then fires on the innocent machine. Neither machine can
tell whose change did it.

**A ticket raised twice.** The ticket stage is already idempotent per increment —
it reuses a persisted `ticket` and refuses to retry a failed `create-ticket.sh`.
But that protection reads `backlog.json`, so it only holds if the other machine's
`ticket` write has been pushed *and* pulled. A claim taken before the loop starts
is what makes that true.

**Stale claims.** A machine that dies mid-increment leaves a claim that expires in
three hours and then lets the other machine walk into a half-built increment with
an open PR. The expiry is a floor on damage, not a fix. Before taking an expired
claim, check `prs` and `commit` on that increment and check for an open PR on its
branch.

---

## 6. Migration

There is nothing to migrate.

- **No file change.** `claim` is optional and absent means unclaimed. The 62
  existing increment objects are untouched, so no id moves, no `notes` is lost,
  no `prs` array is rewritten.
- **Do not bump `schema_version`.** `tools/journey-builder/backlog-generate.sh`
  asserts `schema_version must be 1` at line 117. Adding an optional field does
  not need a version bump, and bumping it would break regeneration.
- **No `.gitignore` change.** `workareas/journey-builder/*/backlog.json` is
  already negated on line 43 and stays the single tracked artefact.
- **`backlog-generate.sh` is unaffected.** It emits a fresh backlog and would
  simply not emit `claim`, which is correct — a regenerated backlog has no
  claims. Note that regeneration is what shifted ids on 2026-09-06 under d-084,
  so it stays a deliberate, announced act.

If the dependency edges are also to be re-authored, do that as its own change,
edited in place in `backlog.json` — **never by regenerating**, because
regeneration renumbers, and ids are bound to rulings and citations
(`PROGRAMME-NOTES.md`, and the skill's last guard rail). Five edges change:

```bash
jq '(.increments[] | select(.id=="inc-048") | .dependsOn) = ["inc-046"]
  | (.increments[] | select(.id=="inc-050") | .dependsOn) = ["inc-048"]
  | (.increments[] | select(.id=="inc-056") | .dependsOn) = ["inc-054"]
  | (.increments[] | select(.id=="inc-057") | .dependsOn) = ["inc-055","inc-056"]
  | (.increments[] | select(.id=="inc-058") | .dependsOn) = ["inc-056"]
' backlog.json
```

Record why in each increment's `notes`, and get it ruled — the edges came out of
the spec, and loosening one is a claim about the journey, not about the tooling.

---

## 7. If you only read one thing

The file is fine. The chain is the problem. Two machines against
`backlog.json` as it stands today would give you fourteen increments in fourteen
slots, exactly as one machine does, plus a race on which of them raises the
ticket. Add the claim so that race cannot happen, then decide separately whether
the five suspect dependency edges are real. That second decision is worth at most
a 29% saving and it belongs to whoever owns the spec.
