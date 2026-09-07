# EUDPA-333 — address add handshake

Working notes for [EUDPA-333](https://eaflood.atlassian.net/browse/EUDPA-333),
"Delegate address creation to the INS address book service".

| File | What it is |
|---|---|
| [`ticket.md`](ticket.md) | The Jira description, mirrored as markdown. Jira is the source of truth. |
| [`sequence.md`](sequence.md) | Three Mermaid diagrams — the happy path, cancel, and the guard — plus what checking them against the code turned up. |
| [`happy-path.mmd`](happy-path.mmd) | Standalone source for the happy-path diagram. This is what the image on the ticket is rendered from. |
| [`happy-path.svg`](happy-path.svg) | The rendered diagram for reading here, matching the `document-upload-flow.md` + `.svg` pairing already used in this directory. GitHub renders it. |

## Two renders, and why

The ticket carries a **rendered image**, because Jira does not render Mermaid. That
image goes stale silently whenever the design changes, so it is rendered from
`happy-path.mmd` rather than drawn by hand — the source is diffable even though the
image is not.

The repo keeps an **SVG** and the ticket carries a **PNG**, deliberately:

- **SVG here.** It is the convention `document-upload-flow.svg` set, GitHub renders
  it, it scales without blurring, and it is a sixth the size.
- **PNG on the ticket.** Jira will not generate a preview for an SVG attachment — it
  accepts the file and resolves the reference, then shows "preview unavailable". This
  was tried and reverted on 26 Aug. Do not switch the ticket back to SVG without
  checking the rendered page, not just the markup: Jira's own HTML reports an SVG
  attachment as `file-preview-type="image"` whether or not a preview exists, so the
  markup is not evidence.

The PNG is not committed — it is derivable from the same source, and one rendered
artefact in version control is enough.

## Regenerating

After editing `happy-path.mmd`, render both:

```bash
mmdc -i happy-path.mmd -o happy-path.svg -b white          # for the repo
mmdc -i happy-path.mmd -o /tmp/happy-path.png -b '#fcfcfa' -s 2   # for the ticket
```

`mmdc` is `@mermaid-js/mermaid-cli`. It drives headless Chrome; if it cannot find
one, either run `npx puppeteer browsers install chrome-headless-shell` or point it
at an installed browser with `-p puppeteer-config.json`:

```json
{ "executablePath": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "args": ["--no-sandbox"] }
```

Then replace the attachment. **Three steps, and the third is not optional:**

```bash
TOOLS=~/git/defra/trade-imports-workspace/tools/jira
$TOOLS/attach-file.sh EUDPA-333 /tmp/happy-path.png        # 1. attach the new file
$TOOLS/update-ticket.sh EUDPA-333 -d - < description.wiki  # 2. re-push the description
$TOOLS/delete-attachment.sh EUDPA-333 happy-path.png --all # 3. remove the old copy
```

Why this order, and why step 2 exists:

- **Attach before deleting**, so the description never points at a file that is not
  there.
- **Re-push the description.** Jira binds the image in the description to a specific
  attachment when the description is saved, not by filename at render time. Replace
  the file without re-saving the description and the ticket shows a broken preview
  bound to the attachment you deleted. This is how it broke on 26 Aug.
- **Delete last**, with `--all`, because by then two files share the name — step 1
  added one rather than replacing.

`delete-attachment.sh EUDPA-333 --list` shows what the ticket currently holds. Without
`--all` the delete refuses when several share a filename and lists them instead, so
you can pick with `--id`.

The description lives at
`workareas/ticket-creation/EUDPA-333-delegate-address-creation/description.wiki`.

Keep `happy-path.mmd` and the copy inside `sequence.md` in step. They are the same
diagram, and only this file is what the ticket's image is built from.
