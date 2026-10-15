---
name: service-observability
description: 'Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Use when a ticket asks for observability on a single trade-imports service (triggers: "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "service-observability", "observability for EUDPA-"). NOT for planning or implementing a ticket in general — use the ticket skill and point its plan at these steps. NOT for reviewing code already written — use review or code-style.'
---

The recipe for giving one CDP service the observability the platform
defaults do not: custom metrics, a searchable log line per dependency
call, a custom Grafana dashboard, and alerts that reach the team in
Slack. One service per run. The code lands in the service's repo.
Claude generates the dashboard JSON and an alert build sheet from the
templates in `assets/`; the developer imports and builds them in the
CDP dev Grafana, because nothing else can write to it.

It was written from EUDPA-632, the spike on
`trade-imports-reference-data`. Read "What is proven" below before
trusting any step.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash
expands `~` automatically. Skill-internal references stay
relative (`references/<NAME>.md`, `assets/<name>`).

**Bash call hygiene** — one command per Bash call. Full rule
table: [`docs/agent-skills.md`](../../../docs/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "add observability to `<service>`", "observability for EUDPA-X" | Steps 1 to 6 in order |
| "add metrics and alerts to `<service>`" | Steps 1 to 6 in order |
| "add a dashboard and alerts to `<service>`" | Step 1's Grafana checks and Step 2's email question, then Steps 4 to 6, if the metrics are already deployed to dev |

When the work is one ticket among others, plan it with the `ticket`
skill and point its plan at these steps.

## What is proven

| Part | State |
|---|---|
| Metrics and log line, Java service | Proven by tests on `trade-imports-reference-data`, branch `feat/EUDPA-632-observability` until it merges |
| Metrics and log line, Node service | Not written. `trade-imports-animals-frontend`, `-ins-frontend` and `-plants-frontend` already have `src/server/common/helpers/external-call-metrics.js`; the first Node ticket adds a Node reference here |
| Dashboard and alert templates | Written from the reference-data code and the CDP docs; not yet imported into Grafana |
| Dashboard, alerts, Slack routing, promotion, alert testing | **Taken from the CDP docs, not yet done on a real service.** Every fact that comes only from the docs is marked `[UNPROVEN]` where it is stated |

When a run settles an `[UNPROVEN]` fact, edit the file that states it
(this SKILL.md or the reference): replace the marker with what happened. Do the same when a step turns out wrong.
Commit the edit in this workspace repo, on a branch with the same name
as the service's branch (CLAUDE.md rule 2).

## Who does what

Claude can read and change the service's code and run its tests. Claude
cannot write to Grafana, OpenSearch, the CDP Portal or Slack: the dev
Grafana needs a signed-in Editor to write, and CDP issues no
service-account tokens. For Steps 4 and 5 Claude writes the dashboard
JSON and the alert build sheet to
`~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/grafana/`;
for Step 6 it gives the exact messages. The developer does the Grafana,
Portal and Slack parts, and Claude records what they report back.

A run takes days and several sessions. Its progress lives in the
ticket's plan,
`~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/plan.md`:
add the completion block below to it at the end of each session, and
read it first in the next one. If the run did not start from the
`ticket` skill there is no plan yet, so create the file (and its
directory) with the first completion block. `workareas/` is local and
not committed, so also record each completion block on the ticket: that
is the copy another developer, or another machine, picks up from.

Where a step says "record it on the ticket", Claude drafts the text and
the developer posts it.

## Step 1: Check what CDP already gives the service

No code. The developer checks in the dev Grafana
(`https://metrics.dev.cdp-int.defra.cloud/`):

- the service has its default dashboard;
- the service has default alerts. They are deployed per service on
  request, so they may be missing: on 2026-10-15 animals-backend had
  them and reference-data had none. They live in the `CDP_Tenants`
  folder in two groups, `<service>` (desired running tasks, CPU, memory,
  storage, average response time, HTTP status code, log ingestion
  errors) and `<service> advanced http alerts` (4xx and 5xx percentage
  and spike detection, p95 response time, slow requests percentage).
  Check with the rules listing below, filtered on the service name. If
  either group is missing, ask #cdp-support to deploy it in every
  environment, naming a service that has it;
- the folder `Playground/<service>-monitoring` exists, with an alert
  evaluation group `<service>-advanced-alerts` holding one alert named
  `platform_managed_do_not_delete`. (Seen 2026-10-15 for reference-data
  and animals-backend.) Anyone can list the dev alert rules without
  signing in:
  `curl -s 'https://metrics.dev.cdp-int.defra.cloud/api/prometheus/grafana/api/v1/rules' | jq -r '.data.groups[] | "\(.file) | \(.name) | \([.rules[].name] | join(", "))"'`.

Then list the service's real dependencies from its code, not from the
ticket: every system it calls, and any database it has configured. A
configured database is a dependency like any other: give it the
metrics, dashboard panels and alerts in `references/METRICS.md` → "A
database". The one exception is a database that is configured but that
nothing reads or writes through: leave it out, say why on the ticket,
and raise a ticket to remove the configuration. (On reference-data,
MongoDB is configured but unused, so it is left out.) Do not measure,
show or alert on a dependency that is not on that list.

## Step 2: Agree the metric list

Follow `references/METRICS.md` → "Work out the list". Agree the list
with the team before writing code, and record it on the ticket.

Ask at the same time: Slack only, or email as well? `[UNPROVEN]` Email
is a #cdp-support request, made in Step 5.

## Step 3: Publish the metrics and log each dependency call

Follow `references/METRICS.md` → "Publish" and `references/LOGGING.md`.
Raise the PR from a `feat/EUDPA-X-<slug>` branch and deploy to dev.
Steps 4 to 6 need the metrics to be arriving in dev.

`/health` must not change. CDP uses it to decide whether a task is
alive, so a dependency check there restarts every task when a
dependency goes down. Availability is a metric, never a health check.

## Step 4: Build the dashboard

Follow `references/DASHBOARD.md` → "Generate" (Claude, from
`assets/dashboard.template.json`), then "Import" (the developer).

## Step 5: Build the alerts and route them to Slack

Follow `references/ALERTS.md` → "Build" (Claude writes the build sheet
from `assets/alerts.template.md`; the developer builds each rule) and
"Route to Slack".

## Step 6: Promote, then prove each alert fires

Follow `references/ALERTS.md` → "Promote" and "Prove they fire", and
`references/LOGGING.md` → "Follow a request by trace.id".

## Completion output

```
service-observability: <service> (<ticket>)

Done:
- <steps finished, with PR links>

Waiting on a person:
- <Grafana, Portal, Slack or #cdp-support steps still open>

Settled this run:
- <each [UNPROVEN] fact confirmed or corrected, and the file that states it (this SKILL.md or the reference) edited>

Next: <the single next action and who takes it>
```
