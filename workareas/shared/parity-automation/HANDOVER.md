# The comparison is one command. What that does and does not mean

Supersedes the previous handover, which briefed this work. **That work is done.**
The pipeline has a front door, the four hand-written steps have personas, and
five of the six failure modes are closed mechanically.

Nothing here has been run end to end on a new comparison. Read "What is
unproven" before you trust it.

## What a person does now

```
tim parity report EUDPA-328-DR1 --open      # the comparison that already exists
```

For a new one, say what you want — "compare the frontend against DR3 and give me
a report" — and the parity skill's **COMPARE** mode takes it from there: a short
interview, then every phase in order, resumable at each one.

`.claude/skills/parity/SKILL.md` → COMPARE is the whole description. The rest of
this file is what a person needs that the skill does not say.

## Where the seven steps stand

| step | was | now |
|---|---|---|
| Set up the corpus | hand-written | `start-comparison.sh` → interview → `scaffold-corpus.sh` |
| Enumerate each side's screens | hand-written | one agent per side, `SCREEN_ENUMERATOR` |
| Write the capture specs | hand-written | one agent per slice, `SPEC_AUTHOR` |
| Shoot the evidence | `tim parity capture` | unchanged |
| Check nothing was missed | `tim parity coverage` | unchanged |
| Pair the screens | hand-written | one agent, `SCREEN_PAIRER` |
| Author and verify the findings | AUTHOR mode | unchanged, plus three checks around it |
| Build the report | `ingest` → … → `check` | unchanged |

`tools/parity/phase.sh` is the ledger across all of it. Every phase after the
first is an agent pass that cannot be re-derived cheaply, so which ones have
happened is written down rather than inferred from what is on disk — half a
slice's findings on disk look exactly like a finished slice.

## The six failure modes, honestly

The AUTHOR mode listed six things that held on the DR1 run with nothing making
them hold. **Five are closed. One is narrowed. Do not read the count as six.**

**Closed.**

1. **A slice's yield is bounded from below.** `tim parity yield` weighs each
   slice's findings against the screens it owns and flags anything well under
   the middle of the pack. It asks rather than rules — a declaration page with
   one finding is not a failure.
2. **The slicing is proven before anything is spawned.** `tim parity slices
   --strict`: every captured screen owned by exactly one slice, exactly one
   slice owning the chrome.
3. **A verifier that looked at nothing is visible.** Every finding carries
   `finding.verification`, one line saying what was opened and what was run.
4. **Verify-before-ingest is enforced.** A corpus declaring
   `requireVerification` — every scaffolded corpus — refuses a first ingest of
   any finding with no verification record. Same mechanism as 3, which is why
   one flag closes both.
5. **The applications are held still.** `tim parity heads --write` records where
   every checkout stood; running it again says what moved. It cannot stop a
   commit. It makes one visible while the run is still open.

**Narrowed, not closed.**

6. **A cross-slice duplicate is still a judgement.** `tim parity duplicates`
   reads the whole corpus at once, which no per-slice verifier can, and prints
   candidates. **It measures two sentences.** Two agents describing the same
   change in entirely different words share no screen, no control and no
   vocabulary, and nothing mechanical will pair them. Run against DR1's real 133
   findings it produced five candidates, and reading them, every one was two
   genuinely different findings that happened to name the same screen and
   control. Cheap to read; a clean list is not proof. `DUPLICATE_SWEEPER`
   carries the hand search past the list.

**And the port trap moved rather than closed.** `scaffold-corpus.sh` refuses
3000, 3001, 3007, 3100 and 3200 at setup, which is where it is cheap. It does
not refuse a port the stack takes later, and nothing checks what is actually
listening at capture time.

## What is unproven

Say this out loud before betting a run on it.

- **No new comparison has been run end to end.** Every piece is tested and the
  scaffold was proved on a throwaway corpus that was then removed, but nobody
  has taken a real third release from an interview to a rendered report.
- **`tim parity slices` and `yield` have never seen a real slicing.** DR1 has no
  `slices.json` — it predates the check. `slices` was proved against DR1's real
  manifests and real `pairs.cjs` using a slicing derived from the findings' own
  `slice` fields, which is not a real slicing and correctly failed. The
  arithmetic cross-checks: 82 screens, 40 frontend and 42 prototype, 2
  `onlyFrontend` and 4 `onlyPrototype` — the handover's numbers exactly.
- **The `requireVerification` gate has never gated a real run.** Zero of DR1's
  133 findings carry a verification record, which is the failure mode it exists
  for. Neither existing corpus sets the flag, so both re-ingest unchanged.
- **`THIN_FRACTION` is a guess.** Two-fifths of the median findings-per-screen,
  chosen so a normal spread does not trip and half a run going missing does. It
  has never fired on real data. Expect to move it, and move it in
  `tim/src/parity/yield.js` with the reasoning, not by passing `--fraction`
  every time.

## If you are picking this up

```
tools/parity/start-comparison.sh                  # what exists, what is half built
tools/parity/phase.sh <run> status                # where one run stands
```

Then read `.claude/skills/parity/SKILL.md` → COMPARE, and the persona for the
phase you are on. The personas are the work; the commands only check what they
produced.

## Rules that are not yours to relax

- **`detail` is frozen from first ingest.** It is the only oracle proving a
  later language pass lost nothing.
- **A citation is immutable from the moment it stops being queued.**
- **Never `--reseal` on the user's behalf.** The seal store records the pictures
  a person was last shown; resealing is their statement, not a build step.
- **A whole-page shot may not stand in for a finding about one control.**
- **Backlogs are canonical JSON.** Write through the setters, never by hand.
- **A fix belongs in the tool, not in a workaround.**
- **Never mark a capture complete that is not**, and **never record a phase done
  that is not.** The ledger is what a later session believes, and a phase marked
  done that is not is the one failure this design cannot recover from.
- **Captures cannot run in parallel.** One server, one session. Fan out the
  writing; serialise the running.

## The thing to say at the end of every run

It produces **findings, not rulings**. When it finishes, **no human has read any
of them.** All 133 of DR1's were `status: "todo"` at the end, and six were
`disputed` — the pipeline's own statement that it could not settle them.

The output is a work list somebody still has to open.
