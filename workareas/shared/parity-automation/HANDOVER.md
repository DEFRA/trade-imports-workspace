# Handover — make the whole comparison one command

Everything below the line is the prompt. Copy it whole.

---

You are automating a comparison pipeline so that a person can say **"generate me
a report on the differences between these two things"** and get one, without
knowing any of the steps.

The pipeline exists and works. It has just been run end to end and produced 133
verified findings against a signed-off design. What is missing is the front half
and the stitching: four of the seven steps are still hand-written, and there is
no single entry point.

## Read these first, in this order

1. `.claude/skills/parity/SKILL.md` — the skill you are extending. Five modes
   today: REPORT, WALK, MIGRATE, CAPTURE, AUTHOR. Read AUTHOR closely; it is the
   most recent and the closest model for what you are writing.
2. `.claude/skills/parity/references/` — the six worker personas. Your new
   workers must match their voice and shape.
3. `.claude/skills/skill-creator/SKILL.md` — **the pattern to copy for the
   bootstrap.** It dispatches on a trigger phrase, interviews the user one
   question at a time, records each answer atomically into a JSON state file,
   then a scaffold script materialises the files. That is exactly the shape the
   corpus setup needs.
4. `workareas/shared/dr1-parity/HANDOVER.md` and `ARCHITECTURE.md` — what the
   pipeline is and why it is shaped that way.
5. `workareas/shared/dr1-parity/FINDING-CONTRACT.md` — the per-corpus authoring
   contract. Note it deliberately lives in the workarea, not the skill.
6. `tools/parity/corpora.json` — the data a comparison is made of.

## Where the pipeline stands

| step | today |
|---|---|
| Set up the corpus | hand-written |
| Enumerate each side's screens | hand-written `enumerate.cjs` |
| Write the capture specs | hand-written Playwright |
| Shoot the evidence | automated — `tim parity capture` |
| Check nothing was missed | automated — `tim parity coverage` |
| Pair the screens | hand-written `pairs.cjs` |
| Author and verify the findings | automated — AUTHOR mode |
| Build the report | automated — `ingest` → `anchors` → `citations` → `evidence` → `meta` → `report` → `check` |

## What to build

### A single entry mode

Add a mode to the parity skill — name it yourself — that a person reaches by
saying something like "compare the frontend against DR3 and give me a report",
or naming two applications with no vocabulary at all. It runs every phase below,
in order, and it must be resumable: a run that stops after the captures picks up
at the pairing rather than starting again.

**It is not a deterministic tool and must not try to be.** Every phase below
except the ones already automated is an agent exercising judgement. The control
flow is fixed; the work inside each step is not.

### Phase 0 — bootstrap the corpus, if it does not exist

Follow skill-creator's shape: interview, record, scaffold.

Ask only what cannot be discovered. At minimum you need, per side: where the
checkout is, how to start it, what port, any environment it needs, which repo
its citations resolve against, and which side is the **requirements** side —
the one the other is judged against. Also the run id and the ticket.

Write answers atomically to a JSON state file under `workareas/parity-setup/<run>/`
as you go, so an interrupted interview resumes. Then scaffold:

- the corpus entry in `tools/parity/corpora.json`
- the workarea with its `specs/<side>/` directories
- a `FINDING-CONTRACT.md` seeded from `dr1`'s, with the per-corpus sections
  marked for editing — the band table, the domain list, the evidence path
  roots, the exclusions, and the volatile values that must never be compared

Ports are a known trap. The workspace stack owns 3000, 3001, 3007, 3100 and
3200; a capture on a port the stack owns photographs the container instead of
the run you started and says nothing about having done so.

### Phase 1 — enumerate each side's screens

One agent per side. It reads that application's source and writes the corpus's
`enumerate.cjs`, which lists the screens the application *has*, statically,
without running it.

This is judgement. On the two applications compared so far, one was readable
from a route table plus its view directory, and the other from a journey
definition — nothing generic would have found either. The agent must state in
the module's own comments which facts about that application make it readable,
and cite the line that makes each true, because those are the assumptions that
go stale.

### Phase 2 — write the capture specs

One agent per slice of the journey. Each writes plain Playwright that drives its
slice and calls `captureScreen()` on every screen it reaches.

**Do not try to generate these deterministically.** A previous attempt built a
crawler that inferred what to type from hint text; it produced five defects on
its first live run, every one a judgement failure wearing a code bug's clothes.
It was deleted. Agents reading the views and writing the navigation is the
design, not a shortcut.

These are requirements-gathering captures, not tests. Nothing asserts an
application is correct. But **every step must assert the journey landed where it
should**, because a mislabelled picture is worse than a missing one and every
ruling downstream rests on the picture being of what it claims.

Nothing under `tim/` may import an application's own test helpers. A harness
built on an unmaintained suite breaks the first time somebody refactors a suite
nobody runs.

### Phase 3 — capture, then close the gap

`tim parity capture` per side, then `tim parity coverage`. Coverage enumerates
statically and diffs against what was actually shot.

Loop: any screen the enumerator names and the capture missed goes back to phase
2 as a brief for another spec. Stop when coverage is clean, or when a screen is
a **stated absence** — genuinely unreachable, said so, and left uncaptured.
Captures cannot run in parallel: one server, one session. Fan out the writing,
serialise the running.

### Phase 4 — pair the screens

One agent reads both manifests, both sets of page models and the rendered DOM,
and writes `pairs.cjs`. It exports `pairs`, `onlyFrontend` and `onlyPrototype`
— read `workareas/shared/dr1-parity/pairs.cjs` for the shape and the standard.

**The one-sided lists matter as much as the pairs.** A screen one side has and
the other does not is the largest kind of gap there is. A wrong pairing is the
most expensive mistake available: it renders two unrelated pages under one
heading and invites a confident finding about an artefact.

Many-to-one is legitimate and must be stated. On the run just completed, one
side rendered a single address-picker view for five roles that the other split
across five pages.

### Phase 5 — author the findings

Invoke the existing AUTHOR mode. Do not reimplement it.

### Phase 6 — build the report

`ingest` → `anchors --write` → recapture for the crops → `citations --write` →
`evidence --write` → `meta --write` → `report` → `check` → `check-evidence`.
Read AUTHOR and REPORT for the ordering constraints; they are not arbitrary.

## The failure modes this must close

The AUTHOR mode records six things that held on the last run with nothing making
them hold. Your automation is the place to fix them, and it is the reason this
job is worth doing:

1. **Nothing bounds a slice's yield from below.** An agent that ran out of
   context and truncated looks exactly like a slice with little to report. Fix
   this first — it is the one that silently loses findings.
2. **The slicing was never checked before spawning.** Every screen must be
   proven to appear in exactly one slice *before* any agent starts. Last time a
   finding was disowned by two slices and written by a third, which means the
   verification pass caught a slicing failure — not what it is for.
3. **Nothing detects a cross-slice duplicate.** Verifiers are paired per slice
   and never see two at once.
4. **Nothing distinguishes a verifier that found nothing from one that looked at
   nothing.** A correction leaves a trace; not looking leaves none.
5. **Nothing enforces verify-before-ingest.** `ingest` composes `detail` from
   the prose slots and freezes it permanently. One command run early freezes the
   corpus over unverified prose.
6. **Neither application was pinned while the run was open.** The captures and
   the citations agree because nobody happened to commit to either side for
   eight hours.

## Rules that are not yours to relax

- **`detail` is frozen from first ingest.** It is the only oracle proving a
  later language pass lost nothing.
- **A citation is immutable from the moment it stops being queued.**
- **Never `--reseal` on the user's behalf.** The seal store records the pictures
  a person was last shown; resealing is their statement, not a build step.
- **A whole-page shot may not stand in for a finding about one control.**
- **Backlogs are canonical JSON.** Write through the setters, never by hand.
- **A fix belongs in the tool, not in a workaround.** If you are copying a file
  or hardcoding a path into a workarea, stop and fix the tool.
- **Never mark a capture complete that is not.**

## How to work

- Orchestrate, do not implement. Fan out one agent per slice and pair each with
  a **different** agent whose brief is to find what is wrong. On the last run
  that second pass falsified about a dozen claims that were invisible to the
  agents that made them, including one whose own falsifier had never been run.
- **Brief agents to check their brief.** Three separate agents disproved
  premises they were handed, twice catching errors in the instructions rather
  than in the code.
- **Make agents open the pictures.** Four element crops were confidently wrong
  on the last run — a white square, two whole-page shots, a sliver reading "Co"
  — and only looking found them.
- One Bash command per call. No `&&`, no `;`, no `cd`. Write `~/git/defra/…`,
  never `/Users/…`.
- `npm install` is blocked by a guard hook.
- Work on `main`, commit directly, push. No PRs.

## What done looks like

A person who knows none of the above says "compare these two things and give me
a report", answers a short interview, and gets a rendered report with every
screen captured, every finding verified by an agent that did not write it, and
every warning on the page meaning something.

Then tell them plainly what the pipeline does **not** do: it produces findings,
not rulings, and when it finishes no human has read any of them.
