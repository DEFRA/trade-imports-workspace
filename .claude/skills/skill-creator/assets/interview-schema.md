# CREATE interview JSON shape

CREATE mode records interview answers into:

```
~/git/defra/trade-imports-workspace/workareas/skill-creator/<name>/decisions.json
```

The file is mutated atomically by
`tools/skill-creator/interview-add-answer.sh` (one shape question
per call). The final entry is consumed by
`tools/skill-creator/scaffold-skill.sh` which materialises the
skill directories under `.claude/skills/<name>/` and
`tools/<name>/`.

## Schema

```jsonc
{
  "name": "skill-name",            // kebab-case, 1-64 chars
  "started_at": "2026-05-26T...",
  "answered_at": null,             // set when all 8 answered
  "scaffolded_at": null,           // set when scaffold-skill.sh runs
  "answers": {
    "purpose": "One-line description of what the skill does.",
    "state_shape": "json",         // "json" | "prose"
    "dispatcher": true,            // boolean
    "prebake": false,              // boolean
    "fanout": {
      "enabled": true,
      "workers": ["AUDITOR"]       // worker reference names (UPPER_CASE)
    },
    "walker": false,               // boolean — N-item triage UX
    "helpers": [                   // names (no .sh suffix)
      "start-skill-creator",
      "scaffold-skill"
    ],
    "triggers": {
      "phrases": ["scaffold skill", "skill-create"],
      "disambiguation": "Distinct from /init (CLAUDE.md scaffolding) — this skill creates *workspace skills*."
    }
  }
}
```

## Field rules

- `name` — drives every generated path. Must match
  `^[a-z][a-z0-9-]{0,63}$`. Validated by
  `interview-add-answer.sh --field name`.
- `state_shape` — see [`docs/best-practices/skills/patterns.md`](../../../docs/best-practices/skills/patterns.md)
  pattern 1. `json` triggers an `assets/<name>-schema.md` stub and
  a `render-<name>.sh` stub.
- `dispatcher` — see pattern 2. `true` triggers a
  `start-<name>.sh` stub.
- `prebake` — see pattern 3. `true` triggers a
  `prepare-<name>.sh` stub.
- `fanout.enabled` — see pattern 5. `true` requires at least one
  worker name; each becomes a `references/<NAME>.md` stub with a
  Bash-hygiene block at the top.
- `walker` — see pattern 7. Only valid when `state_shape == "json"`
  and there is a list of N items to triage. Validation in
  `interview-add-answer.sh`.
- `helpers` — see pattern 6. Each becomes a `tools/<name>/<helper>.sh`
  stub with a one-line TODO header.
- `triggers.disambiguation` — anti-pattern guard. The interview
  refuses to scaffold without a one-line statement of how the
  triggers differ from neighbouring skills (and from Claude Code's
  built-in `/init`).
