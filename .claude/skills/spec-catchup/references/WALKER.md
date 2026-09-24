# Walker — catch-up findings

Present pending findings one at a time (or a short batch), take a ruling,
record it with `tim spec findings rule`, then hand accepted items to
[`APPLY.md`](APPLY.md).

**Trigger:** after Step 4 of `SKILL.md`, or `"walk catchup"` /
`"walk spec-catchup"` when a run already exists.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## Step 1: Load pending

```bash
tim spec findings list --skill catchup --pending --json
```

```bash
tim spec findings counts --skill catchup --json
```

If no pending findings and the NO ACTION bucket still needs a ruling,
skip to Step 4. If `allRuled` is already true, say so and stop (or go to
baseline advance in `SKILL.md` Step 7).

## Step 2: Present one finding

For each pending finding (prefer list order — stale-link first):

```markdown
**Catch-up walk** — <id> (<i> of <n> pending)

| Field | Value |
|---|---|
| Verdict | stale-link / spec-wrong / spec-gap |
| Capability | … |
| Anchor | SCN-… or — |
| Judgement | <one sentence> |

**Evidence:** …
**Proposal:** (`file`)
```diff
…
```

**Triage:** `A` = accept · `R` = reject · `E` = edit (then accept with your wording) · `D` = defer · `S` = skip

Your input:
```

Do not apply the proposal yet. Wait for the keystroke.

## Step 3: Record the ruling

| Input | Command |
|---|---|
| `A` | `tim spec findings rule F-00N --skill catchup --accept` |
| `R` | `tim spec findings rule F-00N --skill catchup --reject --note "…"` |
| `E` | Adjust the proposal on disk / in the finding note, then `--edit` |
| `D` | `tim spec findings rule F-00N --skill catchup --defer --note "…"` |
| `S` | Leave pending; continue |

On `A` or `E`, immediately follow [`APPLY.md`](APPLY.md) for that id, then
`tim spec findings applied F-00N --skill catchup`.

On `R` or `D`, continue to the next pending finding.

## Step 4: NO ACTION bucket

When individual findings are done:

```bash
tim spec findings rule-bucket --skill catchup --accept
```

Or `--reject` / `--defer` with a spoken reason. One ruling covers every
capability counted in the bucket.

## Step 5: Done

```bash
tim spec findings counts --skill catchup --json
```

If `allRuled`, return to `SKILL.md` Step 7 (baseline advance). If not,
report what remains open / deferred / unapplied.
