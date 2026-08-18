# `.refinement-meta.json` schema

Single flat JSON sidecar per refinement, written by
`tools/refine/prepare-refinement.sh` and finalised by
`tools/refine/refine-finalize.sh`. Lives at
`workareas/ticket-refinement/EUDPA-X/.refinement-meta.json`.

The prose narrative (questions, improvements, AC analysis, technical
notes) stays in `review.md`. The sidecar exists to make the verdict
typo-safe (enum-enforced by `refine-finalize.sh`) and machine-readable
so the verdict can be recalled later without re-parsing `review.md`.

## Fields

| Field | Type | Source | Notes |
|---|---|---|---|
| `ticket` | string | Jira `.key` | e.g. `EUDPA-1234` |
| `summary` | string | Jira `.fields.summary` | |
| `type` | string | Jira `.fields.issuetype.name` | Story / Bug / Task |
| `priority` | string | Jira `.fields.priority.name` | `"None"` if absent |
| `parent` | string | Jira `.fields.parent.key` | `"None"` if absent |
| `labels` | string[] | Jira `.fields.labels` | empty array if none |
| `status` | string | Jira `.fields.status.name` | e.g. `To Do`, `Refining` |
| `created` | string | dispatcher | ISO-8601 UTC timestamp of refinement run |
| `verdict` | string \| null | `refine-finalize.sh` | starts `null`; one of `READY`, `NEEDS WORK`, `SPIKE REQUIRED` |
| `verdict_reason` | string \| null | `refine-finalize.sh` | optional `--reason` |
| `completed_at` | string \| null | `refine-finalize.sh` | ISO-8601 UTC timestamp when verdict was set |

## What is NOT in the schema

- **No `repos` field.** The skill does not own clone state. When a
  refinement needs to peek at code, it reads from the workspace's
  existing `~/git/defra/trade-imports-workspace/repos/<repo>/` trees
  directly.
- **No questions / improvements / AC arrays.** Those stay prose in
  `review.md`. There are no `refine-add-question.sh` helpers and no
  `render-review.sh` — `review.md` is the canonical narrative, written
  by the LLM.
- **No batch / cross-ticket aggregation.** Refinement is one ticket at
  a time. The sidecar isn't consumed by a batch tool.

## Verdict enum

`refine-finalize.sh` rejects anything other than:

- `READY`
- `NEEDS WORK`
- `SPIKE REQUIRED`

No new values.

## Writing the file

Both `prepare-refinement.sh` (seed) and `refine-finalize.sh` (verdict
update) write atomically: build the new JSON in a temp file with `jq`,
then `mv` it over the destination so a partial write never leaves the
file truncated.