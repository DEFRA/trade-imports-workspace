# Spec sync — writing the Behaviour Spec for an increment

Reference for `SKILL.md` Step 5. Parent-loaded prose, not a subagent
persona — this skill has no fan-out.

The Behaviour Spec lives in the **workspace** repo, not the target repo:
`~/git/defra/trade-imports-workspace/openspec/`. `specs/<path>/spec.md`
holds intended behaviour as Given/When/Then; `coverage/<path>/coverage.json`
mirrors it file-for-file and records which tests witness each scenario.

`openspec/config.yaml` is the authority on every convention below. Read it
before the first write of a session. This file carries only what that one
does not: the merge technique, and the recipe-to-capability lookup.

## Finding the capability

Two lookups, both mechanical. Neither is a judgement call.

**Set → namespace.** The target repo's set directory and the OpenSpec
namespace do not share a name:

| Target set (recipe scope) | OpenSpec namespace |
|---|---|
| `sets/live-animals` | `live-animals/` |
| `sets/high-risk-plants` | `plants/` |

**Kind → capability directory**, under that namespace:

| What the increment touched | Capability |
|---|---|
| A page — its title, fields, validation, back link, task status | `journey-pages/<leaf>` |
| A conditional rule — gate, `requires`/`applyTo`, scope, cardinality | `journey-obligations/<leaf>` |
| Page order, task rows, entry guards, section gating | `journey-flow` |
| A section caption | `journey-section-captions` |
| Address picking or the address hub | `addresses` |

`<leaf>` mirrors the recipe's target one level down —
`journey-pages/consignment-addresses` is exactly what an `add-a-field` on
the consignment addresses page targets. Confirm the leaf exists before
writing:

```bash
ls ~/git/defra/trade-imports-workspace/openspec/specs/<namespace>/journey-pages/
```

The two namespaces are not symmetric. `live-animals/` has capabilities
`plants/` does not (`page-titles`, `service-navigation`,
`notification-events`, `notification-status-and-reference`). A capability
missing from the namespace you are writing into is a new capability — mint
it, do not borrow the sibling namespace's.

## Minting a new capability

An `add-a-page` or `add-a-section` increment creates a capability. Four
things land together:

1. **An AREA code.** Derive a candidate from the leaf, prefixed to match
   the namespace's existing rows (`PLANTS-` inside `plants/`; unprefixed
   inside `live-animals/`). An obligation sharing a leaf name with a page
   takes an `OB-` prefix — `ORIGIN` the page, `OB-ORIGIN` the obligation.
2. **Proof of no collision**, before the row is written:

   ```bash
   grep -c '| <CODE> |' ~/git/defra/trade-imports-workspace/openspec/coverage/AREAS.md
   ```

   `0` is the only acceptable answer — and `grep -c` exits non-zero on a
   count of zero, so that exit code is the success case here, not a
   failure. Anything else means pick again.
   Never reuse a code, and never derive one from the capability's path —
   `config.yaml` is explicit that codes are assigned once, in `AREAS.md`,
   and never regenerated.
3. **The `AREAS.md` row**, inserted in the file's existing
   alphabetical-by-capability order.
4. **Both files** — `specs/<path>/spec.md` with a Purpose and at least one
   Requirement carrying at least one Scenario, and
   `coverage/<path>/coverage.json` mirroring it.

## Merging into an existing spec.md

There is no delta file here. No change proposal exists, so
`## ADDED` / `## MODIFIED` / `## REMOVED` / `## RENAMED` headers never
appear — every requirement lives under the single `## Requirements`
section, and the increment edits that section in place.

**Merge, never overwrite.** This is the whole technique:

- Keep everything the increment did not touch, in the file's existing
  order. A rewrite that loses a requirement, or reorders surviving ones,
  is a defect even when it validates.
- A requirement you touch carries its body **plus every scenario that
  survives**. Dropping a scenario the increment did not change is the
  single most common way to silently lose behaviour.
- Adding a scenario to an existing requirement is an edit to that
  requirement, not a new one. Prefer it — a new requirement per increment
  fragments a capability into near-duplicates.
- The operation is idempotent. Running the same increment's sync twice
  produces the same file.

**The shape** every `spec.md` holds:

```markdown
# <capability> Specification

## Purpose

One or two sentences: what this capability does and why it exists.

## Requirements

### Requirement: <what the system must do>
**ID**: REQ-<AREA>-NNN
The system MUST ...

#### Scenario: <the observable case>
**ID**: SCN-<AREA>-NNN-<LETTER>
- **GIVEN** ...
- **WHEN** ...
- **THEN** ...
- **AND** ...
```

`**ID**` is the first line of each body, `NNN` in file order, `<LETTER>`
within the requirement. Append rather than renumber: a new requirement
takes the next free `NNN`, a new scenario the next free `<LETTER>`.
Renumbering breaks every coverage link pointing at the old ID.

The exemplar to match:
`openspec/specs/live-animals/journey-pages/consignment-addresses/spec.md`.

**Conventions `config.yaml` owns** — read them there, honour them here:
MUST not SHALL; opening words that name the subject rather than label
breadth; scenarios observable only, with no selectors, routes or
test-framework mechanics; **never a test name in `spec.md`**; Purpose
never describing tests or how the spec was authored; `journey-flow` owns
whether a PAGE is offered and `journey-obligations` whether a QUESTION
applies, neither stating the other's half.

## Writing coverage.json

Coverage is workspace-owned and outside the OpenSpec CLI. Its rules are in
`config.yaml` under "Test coverage"; the exemplar is
`openspec/coverage/live-animals/journey-pages/consignment-addresses/coverage.json`.

Links attach to **scenarios**; requirement coverage rolls up from them.
Each link is `(type, repo, file, test, strength)` — `type` one of
`e2e|fit|unit`, `strength` one of `full|partial`, plus optional `notes`.
Scenario coverage is derived, never asserted independently of `tests[]`:
`full` if any link is `full`, `partial` if there are links but none full,
`none` if the array is empty.

An increment written by this skill adds **fit** links: the co-located
`*.fit.spec.js` the recipe requires. E2E lives in the tests repo, which
this skill does not touch — leave an existing `e2e` link alone, and never
add one for a test this increment did not write.

`coverage: "full"` means a strong witness exists, not that the suite is
trustworthy. A scenario with no test is `none` plus a note saying so —
an honest hole, not a link to a test that nearly covers it.

## What is validated, and what is not

`spec.md` is validated: `tools/frontend-change/openspec-validate.sh`
wraps `openspec validate <capability-path> --strict`. Non-zero is a halt.

`coverage.json` has **no** CLI validator — the OpenSpec root does not
resolve against `openspec/coverage/`. Step 5's coverage self-check is its
only gate. Treat that asymmetry as a reason to read the coverage write
more carefully, not less.
