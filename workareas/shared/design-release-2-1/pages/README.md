# Published pages

| Page | URL | Source |
|---|---|---|
| Decisions for the call | https://claude.ai/artifact/ChnyYcakTW2GfgG7Jx23wH | `decisions/index.html` |
| The work, theme by theme | https://claude.ai/artifact/FHJCGEJ8jm7zs9mLXT4YBw | `themes/index.html` and `themes/data.js` |

Both are private until shared from the page's Share menu.

## Republish to the same URL

Pass the URL so the publish updates the page rather than making a new one. Read it first with the Artifact tool's
`read` action. Images map from the evidence folders:

- **Decisions page.** Its `files` map `img/q*-*.png` to `evidence/prototype/` and `evidence/real/questions/`. The exact
  names are in the `<img src>` values.
- **Themes page.** It maps `img/<file>` to `evidence/prototype/<file>` for every `screens[].file` in `data.js`, and
  `data.js` itself.

## Regenerate the theme data

Run the per-theme summary workflow, one agent per theme, against the re-distilled `backlog.json`. Save its result as
`../theme-summaries.json`. Then rebuild `data.js` with jq:

```bash
jq -r --slurpfile b backlog.json '"window.DR21 = " + (. | tojson) + ";\nwindow.DR21_TITLES = " + ([$b[0].themes[] | {(.id): .title}] | add | tojson) + ";"' theme-summaries.json > pages/themes/data.js
```

`themes/index.html` hard-codes the wave order in `WAVES`. Update it from `themes/themes.json` once the split is written.
