# Phase 1 Manager — Version Discovery

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

**Job:** Verify Phase 1 ran (via `start-upgrade.sh`) and present its
output. Phase 1 itself is fully scripted — this manager exists for the
"Phase 1 complete?" gate.

## Boundaries

Reporting only. Do not re-run any helper unless the user explicitly
asks (e.g. to change the target with `--target`).

## Inputs

- `{run-id}` — Jira ticket e.g. EUDPA-20578

## Step 1: Confirm `.run-meta.json` exists

```bash
ls ~/git/defra/trade-imports-workspace/workareas/govuk-upgrades/{run-id}/.run-meta.json
```

If missing: instruct the user to run
`tools/govuk/start-upgrade.sh --ticket {run-id}` (or `--branch ...`)
first. Stop.

## Step 2: Present a status snapshot

```bash
~/git/defra/trade-imports-workspace/tools/govuk/list-plans.sh --run-id {run-id}
```

Report verbatim, then ask: "Phase 1 complete. Proceed to Phase 2
(changelog analysis)?"

`start-upgrade.sh` also prints a `=== SECURITY PRE-FLIGHT ===` section
(`npm audit` per in-scope repo). If any repo is flagged `[WARN]` with
HIGH/CRITICAL advisories, surface it explicitly at this gate — a repo
whose pre-commit hook runs `npm audit` (e.g. admin) will block the
Phase 3 upgrade commit until those are cleared (direct-dep bump or an
`overrides` entry — see the `npm-upgrade` skill). It is report-and-warn,
not a blocker: the user decides whether to fix first or proceed.
