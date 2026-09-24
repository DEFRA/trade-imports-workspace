# The reader persona

Followed inline by the same session running `SKILL.md` — not spawned as a
subagent. One work packet at a time, from `tim spec candidates --json`'s
`workPackets`, plus every entry in `unresolvedLinks`.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## What you see per work packet

Never the whole corpus — only:

- The changed test file(s)' current body (`Read` the file directly under
  `~/git/defra/trade-imports-workspace/repos/<repo>/<file>`)
- The linked scenario(s)' text from `openspec/specs/<capability>/spec.md`
- The linked `coverage.json` row(s) for that capability
- The commit log entries for that repo, from `candidates`' `commitLog`
  (`git -C ~/git/defra/trade-imports-workspace/repos/<repo> show <sha>` to
  read one commit's diff if the log alone doesn't tell you enough)

Read the test body, not just its title — a title can stay stable while the
assertions inside change, and the reverse: a renamed `describe` block with
an unchanged body is a STALE LINK, not drift.

## The four verdicts

| Verdict | Meaning | On accept |
|---|---|---|
| **STALE LINK** | The behaviour is unchanged; the test's file, title, or method name moved | Apply `coverage.json` fix |
| **SPEC WRONG** | The behaviour actually changed, and `spec.md` still describes the old behaviour | Apply the `spec.md` diff (after walk approval) |
| **SPEC GAP** | The changed test proves new behaviour with no requirement or scenario for it yet | Apply the addition (after walk approval) |
| **NO ACTION** | The change is copy, layout, or an internal refactor that doesn't touch the claim the scenario makes | Bucket only — no per-file edit |

Seed every non–NO ACTION finding into `findings.json` with a concrete
`proposal.diff`. The walker asks for approval before APPLY runs. Do **not**
edit `spec.md` or `coverage.json` during judgement — only while applying
an accepted finding.

## The judgement sentence

Every finding — including NO ACTION — carries one sentence stating which
side changed:

- *"The behaviour is unchanged and only the test moved."* (STALE LINK)
- *"The behaviour changed: [what, concretely]."* (SPEC WRONG)
- *"This is new behaviour with no requirement yet: [what]."* (SPEC GAP)
- *"This is [copy/layout/refactor] — the claim the scenario makes still
  holds."* (NO ACTION)

**A missing sentence is a halt on that one finding**, not a guess. If you
cannot honestly write one of the four sentences above — the diff is
ambiguous, or you'd need to run the suite to be sure — put the finding under
"Unresolved" in the report instead of forcing a verdict. Conflating STALE
LINK with SPEC WRONG is the worst failure mode this whole skill exists to
avoid: a "corrected" link silently hides a real requirement change, and
nothing downstream will ever notice.

## Two traps specific to this corpus

- **A truncated title still passes a substring check but fails an exact
  one.** `tim spec lint`'s resolver already only matches exact titles, so
  if a link is in `unresolvedLinks` because of a truncation, don't assume
  the scenario itself changed — read the actual test file for the real
  title first. Usually STALE LINK.
- **An unexpanded parameterised-test template row** (`Should do %s`) is
  always STALE LINK once you've identified which expanded case(s) the
  scenario actually needs — read the scenario text to work out which
  parameter values are the ones it's claiming, not just "any of them".

## `coverageUpdatedSinceBaseline: true` work packets

Someone already touched this capability's `coverage.json` since the
baseline. Read it anyway — the touch might have been a different scenario
in the same file — but don't assume the touch was wrong; weight towards
NO ACTION or STALE-LINK-already-fixed unless the test body tells you
otherwise.

## Writing the STALE LINK fix

Match `frontend-change`'s own `coverage.json` conventions
(`~/git/defra/trade-imports-workspace/.claude/skills/frontend-change/references/SPEC_SYNC.md`):
repoint `file`/`test` to the real values, or demote `coverage` to `"none"`
with a `notes` field stating why, if nothing witnesses the scenario at all
any more. Copy the exemplar key-for-key rather than writing the object shape
from memory — `tim spec lint` will catch a malformed row on the next run
either way, but get it right the first time.

## Writing a SPEC WRONG or SPEC GAP proposal

A unified diff against the current `spec.md`, in the spec's own voice —
Given/When/Then, MUST not SHALL, the requirement/scenario heading format
`openspec/config.yaml` defines. Put it on the finding's `proposal` so the
walker can show it and APPLY can land it after accept. Do not soften a
genuine behaviour change into a vague "may vary" — state what the system
now does, concretely, the same way the rest of that capability's spec does.
