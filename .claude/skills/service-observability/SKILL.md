---
name: service-observability
description: 'Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Use when a ticket asks for observability on a single trade-imports service (triggers: "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "service-observability", "observability for EUDPA-"). NOT for planning or implementing a ticket in general — use the ticket skill and point its plan at these steps. NOT for reviewing code already written — use review or code-style.'
---

The recipe for giving one CDP service the observability the platform
defaults do not: custom metrics, a searchable log line per dependency
call, a custom Grafana dashboard, and alerts that reach the team in
Slack. One service per run. The code lands in the service's repo.
Claude generates the dashboard JSON and an alert build sheet from the
templates in `assets/`. They are imported and built in the CDP dev
Grafana under the developer's sign-in: by the developer by hand, or by
Claude through their browser when they ask (`references/GRAFANA_API.md`).

Its dashboard and alert steps come from a spike on
`trade-imports-reference-data`, and its code recipe from the reference
implementation on `trade-imports-address-book`. For a Java service, every metric is a
Micrometer meter published by `EmfMeterRegistry` (`references/METRICS.md`
→ "Publish"). That is the one way this skill builds metrics for Java.
A Node service has no recipe yet: "What is proven" below says what the
first Node run does. Every metric and dimension is named in dot case
(`external.call.duration`). Read "What is proven" before trusting any
step.

## Path conventions

Cross-workspace paths are relative to the workspace root —
`tools/<domain>/`,
`docs/best-practices/`,
`workareas/`. Bash
runs from the workspace root. Skill-internal references stay
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
| Metrics, Java service | Proven by tests on `trade-imports-address-book` (`EmfMeterRegistry`, the EMF documents it writes, the allowlist, `@Timed` through the Spring proxy). `[UNPROVEN]` in dev CloudWatch until that release is checked there. reference-data's older direct-EMF metrics reached dev CloudWatch under the PascalCase names; it has moved to this way, proven by its own tests (including Caffeine cache hits and misses through a `StatsCounter`), which renames every metric and dimension to dot case, so its dashboard and alerts are rebuilt (`references/METRICS.md` → "A service built the old way"). `[UNPROVEN]` in dev CloudWatch for reference-data until that release is checked there. dynamics-gateway has moved to this way too, proven by its own tests: every SQS call through an AWS SDK `ExecutionInterceptor` (against Floci), the Service Bus send against the emulator, an `@Timed` `@SqsListener` method through the proxy, and the `sqs.queue.depth` gauge read from SQS at publish. In dev CloudWatch for the gateway: 0.32.0 published every metric under its dot-case name and dimensions, seen through the dashboard on 2026-11-23 |
| Log line, Java service | Proven by tests on `trade-imports-address-book`: `EcsEventEncoderTest` and `ExternalCallRecorderIT` check that the encoded JSON holds a nested `event` object with a numeric duration, and a failure's flat `error.type` and `error.message` with no stack trace (`references/LOGGING.md` → "How to write the fields"). The same encoder's line reached dev OpenSearch from reference-data 0.27.0 on 2026-10-21; CDP dropped the earlier MDC version (`references/LOGGING.md` → "What was learned on reference-data"). `[UNPROVEN]` in dev OpenSearch for address-book until its release is checked there. The gateway's lines (0.32.0) reached dev OpenSearch with `event.action`, `event.outcome` and a numeric `event.duration`, seen on 2026-11-23 |
| Metrics and log line, Node service | Not written. `trade-imports-animals-frontend`, `-ins-frontend` and `-plants-frontend` already have `src/server/common/helpers/external-call-metrics.js`, which publishes the old PascalCase names (`references/METRICS.md` → "A service built the old way"); the first Node ticket adds a Node reference here |
| Dashboard and alerts, PascalCase names | Done on reference-data in dev: the dashboard imported and showing CloudWatch and OpenSearch data on 2026-10-21, and the alerts built and fired on 2026-10-22 (`references/ALERTS.md` → "Prove they fire"). Not routed to Slack or promoted |
| Dashboard and alert templates, dot-case names | Done on dynamics-gateway in dev on 2026-11-23: the dashboard imported with every panel showing CloudWatch or OpenSearch data (`<timed-name>` panels included), and rules 1, 2 and 3 built, fired with a lowered threshold and restored. `[UNPROVEN]`: the database rule 1a, which the gateway has no database for |
| Slack routing | Done in dev for dynamics-gateway: its contact point `trade-imports-dynamics-gateway` already posted to `trade-imports-team-alerts-non-prod`, and sent its custom alerts with no error on 2026-11-23 (`references/ALERTS.md` → "Route to Slack"). `[UNPROVEN]` in prod |
| Promotion, alert tests in test and prod | **Taken from the CDP docs, not yet done on a real service.** Every fact that comes only from the docs is marked `[UNPROVEN]` where it is stated |
| Grafana through the developer's browser | Done on dynamics-gateway on 2026-11-23: dashboard imported and updated, alert rules built, evaluated, lowered and restored (`references/GRAFANA_API.md`) |

When a run settles an `[UNPROVEN]` fact, edit the file that states it
(this SKILL.md or the reference): replace the marker with what happened. Do the same when a step turns out wrong.
Commit the edit in this workspace repo, on a branch with the same name
as the service's branch (CLAUDE.md rule 2).

## Who does what

Claude can read and change the service's code and run its tests. The
dev Grafana needs a signed-in Editor to write, and CDP issues no
service-account tokens. For Steps 4 and 5 Claude writes the dashboard
JSON and the alert build sheet to
`workareas/ticket-planning/<ticket>/<service>/grafana/` (one folder per
service: a ticket often covers several). When the developer asks, and
Claude in Chrome is connected, Claude does the Grafana parts in their
signed-in browser (`references/GRAFANA_API.md`); otherwise the
developer does them by hand. Claude cannot write to the CDP Portal or
Slack: for Step 6 it gives the exact messages, the developer sends
them, and Claude records what they report back.

A run takes days and several sessions. Its progress lives in the
ticket's plan,
`workareas/ticket-planning/<ticket>/plan.md`:
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
(`https://metrics.dev.cdp-int.defra.cloud/`), or Claude does through
their browser (`references/GRAFANA_API.md`):

- the service has its default dashboards, in the folder
  `CDP_Tenants/<service>`: `<service> (service)` always, and
  `<service> (SQS)`, `<service> (mongodb)` and `<service> (mongodb -
  historical data)` for the resources CDP created for it. Seen for
  dynamics-gateway on 2026-11-23. The custom dashboard links to these
  rather than repeat them (`references/DASHBOARD.md` → "Panels");
- the service has default alerts. They are deployed per service on
  request, so they may be missing: on 2026-10-15 animals-backend had
  them and reference-data had none. They live in the `CDP_Tenants`
  folder in two groups, `<service>` (desired running tasks, CPU, memory,
  storage, average response time, HTTP status code, log ingestion
  errors) and `<service> advanced http alerts` (4xx and 5xx percentage
  and spike detection, p95 response time, slow requests percentage).
  Check with the rules listing below, filtered on the service name. If
  either group is missing, ask #cdp-support to deploy it in every
  environment, naming a service that has it. A service with an SQS
  queue also has `<service> sqs-sns`, holding CDP's dead-letter queue
  alert (`<queue>-dlq`, on `AWS/SQS` `ApproximateNumberOfMessagesVisible`):
  do not build a second one (`references/ALERTS.md` → "Build");
- the contact point `<service>` exists (seen for address-book,
  dynamics-gateway and reference-data on 2026-11-23), and the custom
  alerts send to it. dynamics-gateway's is Slack, posting to
  `trade-imports-team-alerts-non-prod` (`references/ALERTS.md` → "Route
  to Slack");
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
MongoDB is configured but unused, so it is left out.) A CDP mongodb
dashboard is not proof the service uses a database: dynamics-gateway
has one and no MongoDB in its code. Removing the database CDP created
is a #cdp-support request, not a code change. Do not measure,
show or alert on a dependency that is not on that list.

## Step 2: Agree the metric list

Follow `references/METRICS.md` → "Work out the list". Agree the list
with the team before writing code, and record it on the ticket.

Ask at the same time: Slack only, or email as well? `[UNPROVEN]` Email
is a #cdp-support request, made in Step 5.

## Step 3: Publish the metrics and log each dependency call

Java service: follow `references/METRICS.md` → "Publish" and
`references/LOGGING.md`. Copy the registry classes from
`trade-imports-address-book`. If the service already writes EMF
directly or has an `EmfMetricsPublisher`, move it to the registry first
(`references/METRICS.md` → "A service built the old way").

Node service: there is no recipe yet, and the Java classes do not
apply. Read the Node row of "What is proven": the first Node ticket
writes the Node reference and adds it to this skill as part of its
work.

Raise the PR from a `feat/EUDPA-X-<slug>` branch and deploy to dev.
Steps 4 to 6 need the metrics to be arriving in dev.

`/health` must not change. CDP uses it to decide whether a task is
alive, so a dependency check there restarts every task when a
dependency goes down. Availability is a metric, never a health check.

## Step 4: Build the dashboard

Follow `references/DASHBOARD.md` → "Generate" (Claude, from
`assets/dashboard.template.json`), then "Import" (the developer, or
Claude through their browser).

## Step 5: Build the alerts and route them to Slack

Follow `references/ALERTS.md` → "Build" (Claude writes the build sheet
from `assets/alerts.template.md`; the developer builds each rule, or
Claude does through their browser) and "Route to Slack".

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
