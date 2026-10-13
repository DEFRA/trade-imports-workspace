---
name: service-observability
description: 'Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Use when a ticket asks for observability on a single trade-imports service (triggers: "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "service-observability", "observability for EUDPA-"). NOT for planning or implementing a ticket in general — use the ticket skill, which follows this recipe for the observability steps. NOT for reviewing code already written — use review or code-style.'
---

The recipe for giving one CDP service the observability the platform
defaults do not: custom metrics, a searchable log line per dependency
call, a custom Grafana dashboard, and alerts that reach the team in
Slack. One service per run. The code lands in the service's repo; the
dashboard and alerts are built by hand in the CDP dev Grafana.

It was written from EUDPA-632, the spike on
`trade-imports-reference-data`. Read "What is proven" below before
trusting any step.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash
expands `~` automatically. Skill-internal references stay
relative (`references/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule
table: [`docs/agent-skills.md`](../../../docs/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "add observability to `<service>`", "observability for EUDPA-X" | Steps 1 to 6 in order |
| "add metrics and alerts to `<service>`" | Steps 1 to 6 in order |
| "add a dashboard and alerts to `<service>`" | Steps 4 to 6, if the metrics are already deployed to dev |

NOT for planning or implementing a ticket in general — use the
`ticket` skill, and point its plan at these steps. NOT for reviewing
the result — use `review`.

## What is proven

| Part | State |
|---|---|
| Metrics and log line, Java service | Proven by tests on `trade-imports-reference-data` (`feat/EUDPA-632-observability`) |
| Metrics and log line, Node service | Not written. The Node services already have `src/server/common/helpers/external-call-metrics.js`; the first Node ticket adds a Node reference here |
| Dashboard, alerts, Slack routing, promotion, alert testing | **Taken from the CDP docs, not yet done on a real service.** Each unproven fact is marked `[UNPROVEN]` in its reference |

When a run settles an `[UNPROVEN]` fact, edit the reference: replace
the marker with what happened. Do the same when a step turns out wrong.

## Who does what

Claude can read and change the service's code and run its tests. Claude
cannot reach Grafana, OpenSearch, the CDP Portal or Slack. For Steps 4
to 6 Claude gives the developer the exact names, queries and messages
to use, and records what they report back.

## Step 1: Check what CDP already gives the service

No code. The developer checks in the dev Grafana
(`https://metrics.dev.cdp-int.defra.cloud/`):

- the service has its default dashboard;
- the service has default alerts (running tasks, CPU, memory, response
  time, HTTP errors, dead-letter queues). `[UNPROVEN]` The CDP docs say
  default alerts are deployed on request, so they may be missing. If
  they are, ask #cdp-support for them;
- the folder `Playground/<service>-monitoring` exists, with an alert
  evaluation group `<service>-advanced-alerts` holding one alert named
  `platform_managed_do_not_delete`.

Then list the service's real dependencies from its code, not from the
ticket. On reference-data the ticket listed MongoDB; the service has no
database, and the ping written for it had to be removed.

## Step 2: Agree the metric list

Follow `references/METRICS.md` → "Work out the list". Agree the list
with the team before writing code, and record it on the ticket.

## Step 3: Publish the metrics and log each dependency call

Follow `references/METRICS.md` → "Publish" and `references/LOGGING.md`.
Raise the PR and deploy to dev. Steps 4 to 6 need the metrics to be
arriving in dev.

`/health` must not change. CDP uses it to decide whether a task is
alive, so a dependency check there restarts every task when a
dependency goes down. Availability is a metric, never a health check.

## Step 4: Build the dashboard

Follow `references/DASHBOARD.md`.

## Step 5: Build the alerts and route them to Slack

Follow `references/ALERTS.md` → "Build" and "Route to Slack".

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
- <each [UNPROVEN] fact confirmed or corrected, and the reference edited>

Next: <the single next action and who takes it>
```
