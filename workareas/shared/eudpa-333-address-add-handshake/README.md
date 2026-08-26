# EUDPA-333 — address add handshake

Working notes for [EUDPA-333](https://eaflood.atlassian.net/browse/EUDPA-333),
"Delegate address creation to the INS address book service".

| File | What it is |
|---|---|
| [`ticket.md`](ticket.md) | The Jira description, mirrored as markdown. Jira is the source of truth. |
| [`sequence.md`](sequence.md) | Three Mermaid diagrams — the happy path, cancel, and the guard — plus what checking them against the code turned up. |
| [`happy-path.mmd`](happy-path.mmd) | Standalone source for the happy-path diagram. This is what the PNG on the ticket is rendered from. |

## Regenerating the diagram on the ticket

The ticket carries a **rendered PNG**, because Jira does not render Mermaid.
That PNG goes stale silently whenever the design changes, so it is rendered from
`happy-path.mmd` rather than drawn by hand — the source is diffable even though
the image is not.

After editing `happy-path.mmd`:

```bash
mmdc -i happy-path.mmd -o eudpa-333-happy-path.png -b '#fcfcfa' -s 2
```

`mmdc` is `@mermaid-js/mermaid-cli`. It drives headless Chrome; if it cannot find
one, either run `npx puppeteer browsers install chrome-headless-shell` or point it
at an installed browser with `-p puppeteer-config.json`:

```json
{ "executablePath": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "args": ["--no-sandbox"] }
```

Then replace the attachment. **Delete the existing one first** — attaching the
same filename adds a second attachment rather than replacing it, and Jira renders
whichever it resolves first:

```bash
~/git/defra/trade-imports-workspace/tools/jira/attach-file.sh EUDPA-333 eudpa-333-happy-path.png
```

Keep `happy-path.mmd` and the copy inside `sequence.md` in step. They are the same
diagram, and only this file is what the ticket's image is built from.
