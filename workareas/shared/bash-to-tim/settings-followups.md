# Settings follow-ups for Sam

Agents cannot edit permission config. Allowlist entries that name a
script a row has deleted are listed here, under the row's id. Remove them
from `.claude/settings.json` with:

```
node <scratchpad>/settings-remove-allow.mjs '<entry>' '<entry>'
```

then delete the row's section from this file and commit both.
