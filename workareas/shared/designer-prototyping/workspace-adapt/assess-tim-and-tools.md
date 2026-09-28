# Assessment: tim and tools (lens "tim-and-tools")

Premise: designers open Claude Code at the workspace root. They have `tim`,
`tools/`, the workspace skills and `repos/`. The prototype still runs on its own
stubs (`npm run dev`), deploys to CDP from its own Dockerfile, and has its own
CI.

This note answers four questions. Which `scripts/designer/*` should move into
tim or sit behind it? Which should stay in the prototype? What already exists
in the workspace? How should a hand-off raise its Jira story?

## Verdict in one paragraph

Do not add a `tim design ...` namespace. Every `scripts/designer/*` command
stays in the prototype. Each one imports prototype code, is tested by the
prototype's own CI, and is sync-safe through `overrides.json`. Wrapping them
in tim would give a second surface with nothing new behind it. Designers never
type commands anyway: the agent runs `npm --prefix ... run designer:*`.

Put two things in tim, because they cross repos or reach an outside service:

1. **Jira writes.** `tim jira create`, `tim jira attach`, `tim jira link` and
   `tim jira epics` (read). Each works from a generic ticket manifest, has a
   dry run, and needs a confirm token before it creates anything. The hand-off
   and `ticket-creator` both use it.
2. **Workspace-wide commands must leave the prototype alone.**
   `tim workspace reset`, `branch` and `update` all walk every repo in
   `repos.json`, and that now includes the designer's prototype checkout.

## Evidence: why the designer scripts stay

- The prototype's `npm test` runs every `scripts/designer/**/*.test.js`.
  `vitest.config.js` uses the default include and only excludes `fit/**`.
  `.github/workflows/check-pull-request.yml` then runs `npm test` twice: in
  `pr-validator`, and again in `release-canary` after `npm run new:set -- plants-working`.
  The suite is the prototype's CI canary. tim's CI
  (`.github/workflows/tim-ci.yml`) never checks out the prototype, so moving
  the scripts there would lose that coverage.
- The scripts are wired into prototype code:
  - `scripts/designer/check/steps.js` imports
    `src/server/prototype-checks/{copy-shape,frozen-releases,sets-on-disk}.js`
  - `scripts/designer/handoff/cli.js` imports
    `src/server/prototype-seed/examples.js`
  - `words`, `release`, `research` and `service` all read `src/server/app/sets/**`
    and `overrides.json`
  - `scripts/designer/hooks/guard-edit.js` uses `lib/ownership.js`
- Sync-safety: `overrides.json:55` lists `scripts/designer/**` in `ours`, so
  the weekly update never overwrites them.
- Standalone and deploy: the prototype must run without the stack and deploy
  from its own Dockerfile. None of these scripts needs the stack. Moving them
  to tim would make a prototype-only maintainer depend on the workspace to
  change the prototype's own tooling.
- `tim/CLAUDE.md` makes tim library-first, with no shell-out to `../tools/*.sh`.
  A `tim design check` would be a spawn of `npm --prefix ... run designer:check`
  with nothing added.

## Per-script ruling

| Script | Ruling | Why | Change now the workspace is there |
|---|---|---|---|
| `where` | Stays | It reads `overrides.json` ownership, and rule 1, `check` and the `guard-edit` hook all use it. | None. The `guard-edit` hook now needs registering from the workspace `.claude/settings.json`, because a session at the workspace root does not load the prototype's own settings. That goes in `settings-proposal.md` (hooks lens). |
| `check` | Stays | It runs the prototype's own vitest, lint, copy-shape and template checks. | Match the tiers to frontend-change's verification ladder (unit set script, `npm test`, `lint`, `test:fit:features`), and name the plants target's verify scripts from `tools/journey-builder/targets.json` (`high-risk-plants-frontend`) in the brief. No tim involvement. |
| `preflight` | Stays | It checks Node, packages, the Playwright browser, port 3103, git identity and the upstream remote. Only the prototype knows about these. | Add workspace readiness by calling tim from the skill, not the script: `tim auth --json` (Jira, GitHub, Confluence credentials) and `tim --version` (is tim linked?). The script must keep working without tim, because it also runs in CI. |
| `show` | Stays | It takes Playwright screenshots against the prototype's own server, with before and after pictures from a base tree. | `tim capture` is not a substitute: it runs an app's FIT suite with tracing to find spec page-reach gaps (`tim/src/commands/capture/index.js`). A later option is to add the prototype to a `capture.json`, so the requirements-pipeline can distil from it as a `repo` source (`targets.json` still points at `GB-notification-service` by an absolute `/Users` path). |
| `release` | Stays | It works on prototype sets: freeze, carry, drift, remount. | None. |
| `examples` (`src/server/prototype-seed/cli`) | Stays | It is prototype runtime code. | None. |
| `words` | Stays | It reads prototype copy modules and pages. | None. |
| `research` | Stays | It toggles prototype research mode. | None. |
| `handoff` | Stays, with additions | It depends on prototype seed data, flow and ownership. | (a) Also write a `ticket.json` manifest (see below). (b) Write a Jira description without the `*Summary:*` line and the "(attach screenshots/...)" suffixes, for API creation. (c) Name the branch `feat/<this story's key>-<slug>`, not `feat/EUDPA-XXXX-<slug>`. (d) Keep the openspec lookup (`build.js:480`, `../../openspec/specs/plants`) optional in the script, because CI has no workspace, but have the skill treat a missing workspace as an error. |
| `kit` | Stays | It finds the GB-notification-service Prototype Kit clone. | Low value: the search could also try a location the workspace knows about. Not worth doing now. |
| `save` | Stays | It wraps `git commit` for the prototype's pre-commit hooks and log capture. | None. |
| `format` | Stays | It runs Prettier from the repo's own working directory (the "Prettier must run from the repo cwd" memory). | None. |
| `fresh` | Stays | It runs `npm run dev` with `PROTOTYPE_PERSIST=false`. | None. |
| `service` | Stays | It scaffolds `services/<name>/{index,client,stub}.js` from templates. | House conventions for the templates (compare them with the real plants-frontend services and `docs/best-practices/node/`) belong to the conventions lens. Keep the templates in the prototype, where the release canary exercises them. |

## What already exists in the workspace, and what we reuse

- `tim jira ticket <id>` and `tim jira comments <id>` are read-only
  (`tim/src/commands/jira/index.js`, `tim/src/clients/jira-client.js`, which
  only has `get` and a `/rest/api/2` base). Reuse these to check a parent epic
  key, as `ticket-creator` Step 1.5 does with `tools/jira/ticket.sh`.
- `tools/jira/create-ticket.sh`, `attach-file.sh`, `link-tickets.sh`,
  `list-board-epics.sh` and `delete-attachment.sh` are the only write paths
  today. They need `jq` and `curl`, and create-ticket.sh also needs
  `JIRA_PROJECT_KEY`. They have no dry run and no JSON output, and the ticket
  key has to be scraped from stdout.
- The `ticket-creator` skill runs a serial developer interview (epic, CAP code,
  tech-debt modifier), writes `draft.md`, and then calls create-ticket.sh
  (Step 5). Designers must not be routed through that interview: the hand-off
  has already collected the story in the designer's own words. What the two
  should share is the creation step.
- frontend-change's verification ladder (`SKILL.md` Step 4) and the plants
  target profile in `tools/journey-builder/targets.json` (`high-risk-plants-frontend`)
  are the implement-for-real path the story points developers at.
- `tim spec gaps` and `tim spec lint` are for the implementer, not the
  hand-off script. The brief already names `openspec/specs/plants/<cap>` and
  its `coverage.json` (`brief.js:638`).
- `tim auth` probes Jira, GitHub and Confluence with `whoami`. Preflight
  should reuse it through the skill.
- `tim workspace branch --dry-run` is the house pattern for a dry run in tim
  (`tim/src/commands/workspace/branch.js:524`, "Dry run — would ... Nothing
  changed.").

## Design: `tim jira create`, `attach`, `link` and `epics`

### Client (`tim/src/clients/jira-client.js`)

Follow `tim/.claude/rules/client-patterns.md`: one method per user-visible
action, and every error is a `TimError`.

- `createIssue({ project, type, summary, description, parent, labels, priority })`
  returns `{ key, url }`. It sends `POST /rest/api/2/issue` with wiki markup,
  the same payload shape as `create-ticket.sh:178-195`.
- `attachFiles(key, files)` returns `[{ filename, size, id }]`. It sends
  multipart `POST /rest/api/2/issue/{key}/attachments` with
  `X-Atlassian-Token: no-check`, using Node 24's native `FormData` and `Blob`
  with no new dependency.
- `listAttachments(key)` sends `GET /rest/api/2/issue/{key}?fields=attachment`,
  so attaching can skip files already there. `attach-file.sh:10-13` explains
  why: the same filename attached twice makes a second attachment, and the
  wiki `!name!` then shows whichever one Jira finds first.
- `linkIssues({ type: 'Relates', from, to })` sends `POST /rest/api/2/issueLink`.
  Version 1 supports only `Relates`, because it has no direction. Leave
  `Blocks` until later: `link-tickets.sh` labels its first argument
  `INWARD_ISSUE` and says "this ticket blocks the target", but the memory
  "Blocks link direction is counter-intuitive" says `outwardIssue` is the
  blockee. Any later `Blocks` support must GET-verify the link after creating it.
- `listOpenEpics(boardId)` does the same job as `list-board-epics.sh 13780`,
  so a designer can be offered epic names in plain words.
- Map errors so the new write paths get Jira's own reasons. Today `mapStatus`
  only maps 401/403/404/429 and treats everything else as 400+. A 400 with
  `errors` or `errorMessages` should become `TimError('USAGE', 'Jira refused
  the ticket: <field>: <reason>')`.

### Command surface (`tim/src/commands/jira/index.js`)

```
tim jira epics [--board 13780]
tim jira create --from <ticket.json> --dry-run [--json]
tim jira create --from <ticket.json> --confirm <planId> [--json]
tim jira create --type Story --summary "..." --description-file f [--parent K] [--label L]... [--priority P] [--attach f]... [--relates K]... [--project EUDPA] (--dry-run | --confirm <planId>)
tim jira attach <key> <file...> (--dry-run | --confirm <planId>) [--replace]
tim jira link <key> --relates <key> (--dry-run | --confirm <planId>)
```

- **No write without `--confirm`.** `--dry-run` sends no requests. It checks
  and renders the plan: the fields, each attachment with its size, and any
  warnings. It also prints a `planId`, a sha256 of the canonical payload plus
  each attachment's content hash. A real run needs `--confirm <planId>`, and
  refuses with exit 2 when the plan has changed: "The ticket changed since you
  checked it. Run it again with --dry-run." The allowlist already lets
  `Bash(tim:*)` and `Bash(~/git/defra/trade-imports-workspace/tools/**)` run
  with no prompt (`.claude/settings.json:63-88`). A permission prompt will not
  stop a create, so the confirm has to live in the tool. Proposed ask rules
  are below.
- **Warnings raised in the dry run:**
  - A description over 32,767 characters, which is Jira Cloud's field limit.
    The `2026-09-28-transporter-select` dry-run brief is already 26,020 bytes
    (`.cache/designer/handoff/2026-09-28-transporter-select/brief.jira.txt`).
  - Placeholders left in the text: `[Who is this for?`, `[Welsh needed]`, `EUDPA-XXXX`.
  - A duplicate attachment filename.
  - Total attachment size.
  - A parent key that does not exist (checked with a GET, which is still read-only).
- **Idempotent.** After a create, tim writes `ticket.created.json` beside the
  manifest, holding `{ key, url, planId, attachments, createdAt }`. A second
  create from the same manifest refuses and names the existing key. Attach
  skips any filename already on the issue unless `--replace` is given, which
  deletes the old attachment first (as `delete-attachment.sh` does).
- **Partial failure.** A ticket that was created but could not take one of its
  attachments exits with `PARTIAL_FAILURE` (from
  `tim/src/constants/exitCodes.js`, already used by `workspace branch`). The
  receipt lists what is missing, so `tim jira attach` can finish the job.
- **Output.** `--json` returns the standard envelope (`_client-action.js`
  shape, `schema_version: 1`). Plain text is in GDS plain English.

### Ticket manifest (the contract between hand-off, `ticket-creator` and tim)

```json
{
  "schema": "tim-ticket/1",
  "project": "EUDPA",
  "type": "Story",
  "summary": "Let importers pick a saved transporter",
  "descriptionFile": "ticket.description.jira.txt",
  "parent": "EUDPA-NNNN",
  "labels": ["UCD"],
  "priority": "Medium",
  "attachments": ["screenshots/transporter-select--now--page--desktop.png", "upstream.patch", "brief.md"],
  "relates": []
}
```

- tim validates the manifest with zod. Paths resolve relative to the
  manifest's folder and must stay inside it, the same guard as
  `workareaPathFor` in `tim/src/capture/config.js`.
- `designer:handoff` writes it:
  - `summary` from `meta.title`
  - `attachments` from `shots.picked`, plus `upstream.patch` unless it is a
    brief-only hand-off, plus `brief.md`
  - `parent` from a new `handOff.parentEpic` in `scripts/designer/prototype.json`,
    which the prototype maintainer sets. Today it has only `jiraProject` and
    `raiseWith`.
  - `labels: ["UCD"]`. That label is already in the catalogue
    (`.claude/skills/ticket-creator/assets/known-labels.md`: "User-centred
    design work — research, design artefact, prototype"). No new label is coined.
- The prototype's own test fixes the shape it writes, and tim's zod schema
  fixes the shape it accepts. The version string makes any drift loud.
- `ticket-creator` Step 5 can move to writing the same manifest from
  `draft.md`, then running `tim jira create --from`. Both paths then share one
  creator. This is optional, and can come after the hand-off path.

### How the hand-off raises the story (skill steps, with an explicit confirm)

1. Build the hand-off as today (`designer:handoff`). It now also writes
   `ticket.json` and `ticket.description.jira.txt`.
2. Stop if `story.placeholders` in `report.json` is not empty. Ask the
   designer for their words (hand-off SKILL.md step 4 already does this).
3. Run `tim auth --json`. If Jira is not signed in, fall back to today's paste
   route (`hand-off/SKILL.md:286-296`) and say so in one line.
4. If `prototype.json` sets no parent epic, run `tim jira epics --json`, offer
   the designer two or three plain choices, then check the one they pick with
   `tim jira ticket <key>`.
5. Run `tim jira create --from handoffs/<folder>/ticket.json --dry-run --json`.
   Show the designer, in plain words:
   - the summary
   - the epic
   - the label
   - each attachment
   - the description length
   - every warning
6. Ask one question: "Shall I raise this as a story in the EUDPA Jira project?"
   Go on only after a yes in the designer's own message. A yes relayed by an
   agent does not count.
7. Run `tim jira create --from ... --confirm <planId> --json`, then give the
   designer the key and the link.
8. Record the key in the `brief.md` status lines ("Keeping track" in
   `handoffs/README.md`), and save with `designer:format` and `designer:save`
   on the design branch.
9. Say who to tell: `prototype.json` `handOff.raiseWith`.

Testing (the tim rails): each new client method gets nock tests through
`src/test-support/http-mock.js`. Cover:

- success shape
- 400 with field errors
- 401
- 404 parent
- 429
- multipart: assert on the captured request body and the no-check header, not on a spy

Also:

- a dry run makes zero requests (`nock.disableNetConnect` with no scopes staged)
- spawn tests for the command: dry-run text, `--json` envelope, planId
  mismatch exits 2, and a refusal when a receipt already exists

Doc drift worth fixing while in there: `tim/CLAUDE.md` and
`tim/.claude/rules/client-patterns.md` say undici MockAgent, but
`src/test-support/http-mock.js` is nock.

### Cost against value

- `tim jira create`, `attach`, `link` and `epics`, with tests and manifest
  schema: a moderate increment. It adds 4 client methods, one command file and
  about 12 behavioural tests, all following existing patterns
  (`_client-action.js`, the envelope, `exitCodes`).
  - Value: designers raise stories with no `jq` or `curl` and no
    `JIRA_PROJECT_KEY`, behind a dry run and a confirm token, safe to re-run,
    with a machine-readable key back. `ticket-creator` gains the same safety.
    Sam asked for this outright.
  - Worth building.
- Interim option: reuse `tools/jira/create-ticket.sh -t Story -p <epic> -l UCD -D ticket.description.jira.txt "<summary>"`,
  then `attach-file.sh` for each file.
  - Cost: none.
  - Drawbacks:
    - no dry run
    - key scraped from stdout
    - needs `jq`, which a designer's Mac may not have
    - needs `JIRA_PROJECT_KEY`
    - a re-run creates a duplicate story
    - nothing stops the create except the skill's own wording
  - Acceptable only until the tim version lands.
- `tim design *` wrappers: real cost (a second surface to keep in step with
  the scripts, tests that need a prototype checkout, which tim's CI lacks) and
  no value. Do not build them.

## Workspace hazards to the designer's checkout (tim change needed)

`repos.json:92-97` lists `trade-imports-plants-prototype` as a normal Node
repo, so these commands act on it:

- `tim workspace reset`: "Hard-reset every cloned repo to origin/main.
  Discards uncommitted work." (`tim/src/commands/workspace/reset.js:98-99`).
  It would wipe a designer's unsaved release changes and move them off their
  `design/*` branch.
- `tim workspace branch <x>`: "Repos without it move to their default branch"
  (`branch.js:521-523`). The prototype has no `feat/EUDPA-*` branch, so it gets
  switched to `main`, and uncommitted work is stashed.
- `tim workspace update`: runs `git pull --rebase` on whatever branch the
  prototype is on (`update.js:69`).

The fix is small: a `repos.json` flag, for example
`"workspaceBranchSync": false`, read in `tim/src/constants/repos.js`. `reset`,
`branch` and `update` skip flagged repos unless `--include <repo>` names them,
and they print one line saying they skipped it. This needs tests in the
matching `*.test.js` files. The value is high: it protects designer work that
a developer-style command would otherwise reach silently.

Related:

- `tim`'s `preAction` auto-pull (`tim/src/exec/auto-pull.js`) only
  fast-forwards the workspace repo on `main`. That is safe for designers and
  keeps skills current. No change.
- Branch parity (CLAUDE.md rule 2) exists so the stack can find images by
  branch. The prototype has `dockerStack: null`, so its `design/*`,
  `handoff/*` and `maintain/*` names do not break parity. Say in the workspace
  CLAUDE.md that the prototype is exempt from rule 2. The real implementation
  starts from the created key as `feat/EUDPA-<key>-<slug>`, the same name in
  plants-frontend, plants-backend and the tests repo when they are touched.

## Proposed settings rules (for `settings-proposal.md`; not applied)

The workspace allowlist runs `tim:*` and `tools/**` with no prompt. Proposed
`ask` entries for anything that writes to Jira or throws work away:

```json
"ask": [
  "Bash(tim jira create:*)",
  "Bash(tim jira attach:*)",
  "Bash(tim jira link:*)",
  "Bash(tim workspace reset:*)",
  "Bash(~/git/defra/trade-imports-workspace/tools/jira/create-ticket.sh:*)",
  "Bash(~/git/defra/trade-imports-workspace/tools/jira/attach-file.sh:*)",
  "Bash(~/git/defra/trade-imports-workspace/tools/jira/link-tickets.sh:*)"
]
```

The confirm token in tim is the main guard. These rules are a second guard
that a person sees.

## Open points (made the call; flag for Sam)

- Label: `UCD` only (it is already in the catalogue). A dedicated
  `designHandoff` label would need Sam's ruling, because `ticket-creator` says
  not to coin labels.
- Parent epic: the prototype maintainer sets it in `prototype.json`, and the
  agent asks only when it is not set.
- Designers need `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` (the same
  contract as `tools/jira/auth.sh`). Onboarding (`docs/agent-onboarding.md`)
  should cover designers. Without them, the paste route stays as the fallback.
