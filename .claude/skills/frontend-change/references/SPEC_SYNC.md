# Spec sync — writing the Behaviour Spec for an increment

Reference for `SKILL.md` Step 5. Parent-loaded prose, not a subagent
persona — this skill has no fan-out.

The Behaviour Spec lives in the **workspace** repo, not the target repo.
Every path below is relative to the **spec root** Step 5 resolved:
`<spec root>/openspec/`. `specs/<path>/spec.md` holds intended behaviour
as Given/When/Then; `coverage/<path>/coverage.json` mirrors it
file-for-file and records which tests witness each scenario. On a direct
invocation the spec root is `~/git/defra/trade-imports-workspace`; under
`journey-builder` it is the run's workspace worktree. Never hardcode the
former — see Step 5's two-caller table.

`openspec/config.yaml` is the authority on every convention below. Read it
before the first write of a session. This file carries only what that one
does not: the merge technique, and the recipe-to-capability lookup.

## Finding the capability

Two lookups. The first is mechanical; the second ends in a judgement you
must make explicitly rather than pattern-match.

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
| A collection (repeatable records) | Its pages under `journey-pages/<leaf>`; its floors and caps — `requires.maxEntries`, `recordCountEquals` — under `journey-obligations/<leaf>`. A collection is not a third kind; it is pages plus cardinality, and both halves get written. |
| Page order, task rows, entry guards, section gating | `journey-flow` |
| A section caption | `journey-section-captions` |
| Address picking or the address hub | `addresses` |

### The leaf is not the directory name

**`<leaf>` is named for the page or subject the user sees, not for the
feature folder or obligations section the code lives in.** In
live-animals no feature directory shares a name with its spec leaf:

| Code | Capability leaf |
|---|---|
| `features/addresses` | `journey-pages/consignment-addresses` |
| `features/check-answers` | `journey-pages/check-your-answers` |
| `features/commodities` | `journey-pages/commodity-details` **and** `commodity-selection` |
| `features/documents` | `journey-pages/upload-documents` |
| `features/origin` | `journey-pages/origin-of-import` |
| `features/hub` | `journey-pages/overview` |
| `features/contact` | `journey-pages/contact-address` |
| `features/transport` | four leaves — `transporter`, `transporter-type`, `commercial-transporter-details`, `private-transporter-details` |
| `obligations/sections/arrival.js` | `journey-obligations/arrival-details` |

So a directory name that matches nothing proves nothing. Find the leaf by
the page's **title** — the `title` key in `copy.<locale>.js`, not
`legend`, per `config.yaml` — against what is already specified:

```bash
ls <spec root>/openspec/specs/<namespace>/journey-pages/
```

```bash
ls <spec root>/openspec/specs/<namespace>/journey-obligations/
```

The spec root is `~/git/defra/trade-imports-workspace` on a direct
invocation and the run's workspace worktree under `journey-builder` — the
worktree is the one that has this run's earlier increments in it.

Read the `spec.md` of any leaf that looks close — its Purpose records the
page title. Then make the call explicitly, in one sentence you could be
held to: *"no existing leaf covers this subject"*, or *"this is
`<leaf>`"*. A missing directory name is **not** that sentence. Getting
this wrong mints a duplicate capability for a page that is already
specified, and nothing downstream will catch it.

The two namespaces are also not symmetric. `live-animals/` has
capabilities `plants/` does not (`page-titles`, `service-navigation`,
`notification-events`, `notification-status-and-reference`). A capability
genuinely absent from the namespace you are writing into is new — mint
it, do not borrow the sibling namespace's.

## Minting a new capability

An `add-a-page` or `add-a-section` increment creates a capability. Mint
only after the explicit judgement above. Four things land together:

1. **Proof the capability is genuinely new**, before anything is written.
   Two greps, and **both** must miss. Both read **the spec root's**
   `AREAS.md`, not the workspace checkout's:

   ```bash
   grep -c '| <namespace>/<kind>/<leaf> |' <spec root>/openspec/coverage/AREAS.md
   ```

   ```bash
   grep -c '| <CODE> |' <spec root>/openspec/coverage/AREAS.md
   ```

   The path grep is the gate that catches a leaf-name mistake: a hit
   means this capability is already specified under a name you did not
   recognise — go back to the leaf lookup, do not mint. The code grep is
   the second gate, against collision.

   `0` is the only acceptable answer to either — and `grep -c` exits
   non-zero on a count of zero, so that exit code is the success case
   here, not a failure.

   **Why the spec root and not the workspace checkout.** Under
   `journey-builder`, rows minted by earlier increments of the same run
   are committed on the run's branch in its worktree and are not in the
   main checkout yet. Grepping the main checkout would miss exactly the
   collision these gates exist to catch — and `AREAS.md` is a single
   append-ordered registry, so the duplicate would surface as a merge
   conflict at run end rather than here.

2. **An AREA code.** Derive a candidate from the leaf, prefixed to match
   the namespace's existing rows (`PLANTS-` inside `plants/`; unprefixed
   inside `live-animals/`). An obligation sharing a leaf name with a page
   takes an `OB-` prefix — `ORIGIN` the page, `OB-ORIGIN` the obligation.
   Never reuse a code, and never derive one from the capability's path —
   `config.yaml` is explicit that codes are assigned once, in `AREAS.md`,
   and never regenerated from a current path.

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

There is **no validator** for this file (see the last section), so its
shape has to come from here rather than from a failing command. A new
`coverage.json` carries three levels, and every key below is required
except `notes`:

```json
{
  "capability": "<namespace>/<kind>/<leaf>",
  "areaCode": "<AREA>",
  "specFile": "openspec/specs/<namespace>/<kind>/<leaf>/spec.md",
  "requirements": [
    {
      "id": "REQ-<AREA>-001",
      "name": "<the requirement's heading text, verbatim>",
      "coverage": "full",
      "scenarios": [
        {
          "id": "SCN-<AREA>-001-A",
          "name": "<the scenario's heading text, verbatim>",
          "coverage": "full",
          "tests": [
            {
              "type": "fit",
              "repo": "<repo name>",
              "file": "<path within that repo>",
              "test": "<the test's name, verbatim>",
              "strength": "full",
              "notes": ""
            }
          ]
        }
      ]
    }
  ]
}
```

`specFile` is always the `openspec/`-relative path, never absolute and
never spec-root-prefixed — it is the same string whichever checkout you
wrote into. `id` and `name` must match `spec.md` exactly; the ID is the
join, the name is what makes a diff readable.

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
trustworthy. A scenario with no test is an honest hole, and it has a
shape of its own — the cited exemplar is all-`full`, so it does not show
this case:

```json
{
  "id": "SCN-<AREA>-002-A",
  "name": "<the scenario's heading text, verbatim>",
  "coverage": "none",
  "tests": [],
  "notes": "No test witnesses this yet — <why, in one clause>."
}
```

`notes` at scenario level is where the explanation for a `none` lives; an
empty `tests[]` with no note is indistinguishable from an oversight. Never
reach instead for a link to a test that nearly covers it.

## What is validated, and what is not

`spec.md` is validated: `tools/frontend-change/openspec-validate.sh`
wraps `openspec validate <capability-path> --strict`, rooted at the spec
root via `--root`. Non-zero is a halt.

`coverage.json` has **no OpenSpec CLI validator** — the OpenSpec root
does not resolve against `openspec/coverage/`, and Step 5's coverage
self-check is what gates this step. `tim spec lint` (`docs/reference/openspec.md`)
now checks the object shape above, the spec-coverage ID/name parity, both
rollups and the two repo-reading links — but it runs corpus-wide, on
demand or in the periodic sweep, not per increment here. Read the
coverage write carefully regardless: copy the exemplar key-for-key
rather than writing from memory.
