# Settings follow-ups for Sam

Agents cannot edit permission config. Allowlist entries that name a
script a row has deleted are listed here, under the row's id. Remove them
from `.claude/settings.json` with:

```
node <scratchpad>/settings-remove-allow.mjs '<entry>' '<entry>'
```

then delete the row's section from this file and commit both.

## P35

None. No allowlist entry names `tools/skill-creator/`; the generic
`tools/**` entries and `Bash(tim:*)` cover what remains.

## P36

The row deletes every script in `tools/theme-ticket/`. Remove:

```
Bash(~/git/defra/trade-imports-workspace/tools/theme-ticket/*)
Bash(~/git/defra/trade-imports-workspace/tools/theme-ticket/*:*)
```

`Bash(tim:*)` covers `tim theme-ticket`.

## P40

None. No allowlist entry names `tools/understanding-check/`; the generic
`tools/**` entries and `Bash(tim:*)` cover what remains.
