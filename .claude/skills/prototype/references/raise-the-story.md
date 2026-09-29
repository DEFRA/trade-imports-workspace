# Raise the story

Turns a written hand-off folder into a real Jira ticket, with a dry run the
designer can read in plain words before anything is created. This is the
workspace's own Jira write surface (`tim jira create`), the same one
`ticket-creator` uses: nothing here talks to Jira except through `tim`, and
nothing is created without the designer's own yes.

Use this once `references/hand-off.md` has written the folder
(`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/<yyyy-mm-dd>-<slug>/`,
with its `ticket.json`). If there is no hand-off folder yet, go there first.

## Guard rails

- **Never create, edit, comment on or transition a real Jira ticket without
  the designer's own explicit yes**, given after seeing the dry run. Reading
  Jira is always fine.
- **The `yes` must be the designer's own message**, not an inference from
  "sounds good" earlier in the conversation about the change itself. If in
  doubt, show the dry run again and ask plainly: "Shall I create this ticket
  in Jira?"
- **Never fill a story placeholder yourself.** If `ticket.json` still has one
  (square brackets, or a summary under 10 characters), ask the designer for
  those words; do not draft them. A placeholder never stops the dry run (it
  sends nothing, and it is what shows the designer the exact ticket); it
  only stops the `--confirm` create.
- **One Bash command per call.**

## Step 1: Note any placeholders

Read
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/<folder>/report.json`
and note `story.placeholders`. A designer's "change it, then raise a
ticket" request rarely says who the story is for (As), what they need (I
want) or why (So that), so expect some. Carry on to the dry run either way:
the missing words are asked for together with the one question in step 4.

## Step 2: Check Jira access

```bash
tim auth --json
```

If it reports no Jira access, say so and fall back to the paste flow in
`references/hand-off.md`'s "Hand it over by hand instead": give the designer
the Summary line and the rest of `brief.jira.txt` to paste themselves.

## Step 3: Find the parent epic

1. Read `scripts/designer/prototype.json` (in the prototype repo). If
   `handOff.parentEpic` is set, use it.
2. Otherwise:

   ```bash
   tim jira epics --json
   ```

   List the plants-related epics in plain words and ask the designer which
   one this story belongs under, unless there is exactly one obvious match
   (say which and why, and let them correct you).
3. If `tim jira epics` fails, say so in one line and ask for the epic as one
   of the missing words in step 4 (the dry run still runs with no parent).

## Step 4: Dry run

```bash
tim jira create --from ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/<folder>/ticket.json --json
```

With no `--confirm`, this sends nothing: it prints the plan (every field,
every attachment with its size, and any warning — a remaining placeholder, a
description over 32,767 characters) and a `planId`. Read the JSON and tell
the designer, in plain words, not as raw JSON:

- the project and type (a Story in EUDPA)
- the summary and the parent epic
- the attachments it will add, by name, with sizes
- the walkthrough link, if `scripts/designer/prototype.json` has a
  `siteUrl` set (`[See it walked through|<url>]` in the description,
  ending `#set-<id>` for this release, from `walkthroughLink`) — say so
  plainly if it is missing rather than inventing one
- any warning the plan carries, in full
- that nothing has been created yet

Then, in the same message:

- **With placeholders** (step 1) or no parent epic: quote each missing line
  in plain words ("Who is this for?", "What do they need to do?", "Why do
  they need it?", "Which epic?") and ask: "Tell me these, and say yes, and I
  will create the ticket." Once they answer, rewrite the folder with their
  words (`references/hand-off.md` step 3), run step 4's dry run again for a
  fresh `planId`, and show only what changed before creating.
- **With none**: ask the one question, "Shall I create this ticket in Jira?"

Only the designer's own yes in their own message goes on to step 5, and
never while a placeholder remains. A "looks good" or silence is not a yes:
ask again plainly if you are not sure.

## Step 5: Create it

```bash
tim jira create --from ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/<folder>/ticket.json --confirm <planId> --json
```

`<planId>` must be the exact id the dry run just printed: if anything about
the ticket changed since (the designer asked for a wording tweak, say), run
step 4 again first, because a stale `planId` is refused with exit code 2. On
success it creates the ticket, attaches every file, links `relates` where the
manifest names one, and writes
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/<folder>/ticket.created.json`.
It refuses to create again from a manifest that already has a
`ticket.created.json`: that is the guard against a duplicate ticket from an
accidental second yes.

## Step 6: Record it and save

1. Update the hand-off's status:

   ```bash
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:handoff -- status --dir handoffs/<folder> --json
   ```

   This reads `ticket.created.json` and writes `Ticket: <EUDPA-N>` and
   `Branch: feat/<EUDPA-N>-<slug>` under `brief.md`'s heading, plus a row in
   `handoffs/README.md`'s "Keeping track" table, without rewriting the rest
   of the folder. Never add these lines by hand: a re-run of `status` would
   disagree with them.

2. Save it:

   ```bash
   git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype add handoffs/<folder>
   ```

   ```bash
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:save -- -m "Raise <EUDPA-N> for the hand-off: <title>"
   ```

3. Tell the designer the ticket key, its link
   (`https://eaflood.atlassian.net/browse/<EUDPA-N>`, or whatever `tim jira
create` printed), and that `feat/<EUDPA-N>-<slug>` is the branch name the
   real work will use — the same name `references/build-it-for-real.md` uses
   when they say "make this real".

## Verify

- `handoffs/<folder>/ticket.created.json` exists and its key matches what you
  told the designer.
- `brief.md`'s status lines name the ticket and the branch.
- `tim auth --json` was checked before any create, and no create ran without
  a dry run's `planId` from the same session.
