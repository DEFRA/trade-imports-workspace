# Alerts for <service>

Build each rule by hand in the dev Grafana
(`https://metrics.dev.cdp-int.defra.cloud/`): Alerting → Alert rules →
New alert rule. The values below are in the order the form asks for them.
Build the first rule in full, then make the others from it with More →
Duplicate, setting every field their tables list.

Grafana cannot import these: CDP issues no service-account tokens and
`[UNPROVEN]` the UI has no import for Grafana-managed alert rules.

Every rule shares these settings:

| Field | Value |
|---|---|
| Folder | `Playground/<service>-monitoring` |
| Evaluation group | `<service>-advanced-alerts`, the existing one. `[UNPROVEN]` it evaluates every 5 minutes; the form shows its interval |
| Data source | CloudWatch, Metric Search, Builder |
| Namespace | `<service>` |
| Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off. Rule 1a is the one exception: `dependency` only |
| Time range | the same length as the rule's period |
| Alert condition | the "WHEN QUERY `Last` IS ABOVE …" row under the query. The Advanced options toggle shows the same thing as Reduce and Threshold expressions; either works |
| Pending period | None. Grafana refuses any pending period shorter than the group's evaluation interval ("Pending period must be greater than or equal to the evaluation interval") |
| No data | Normal, under "Configure no data and error handling". Leave error handling at its default |
| Notifications | Use notification policy, not a contact point |
| Labels | none (promotion adds them) |

Leave the rule named `platform_managed_do_not_delete` alone. Routing to
Slack is a #cdp-support request (`references/ALERTS.md` → "Route to
Slack"), not a field here.

The thresholds are a first guess for the team to agree, not tested
values.

## 1. <service> dependency unavailable

| Field | Value |
|---|---|
| Rule name | `<service> dependency unavailable` |
| Metric | `external.call.failure` |
| Statistic | `Minimum` |
| Period | `300` (5 minutes) |
| Alert condition | `Last` `IS EQUAL TO` `1` (every call in the window failed). If the operator list has no "equal to", `IS ABOVE` `0.99` means the same here |
| Summary | `{{ $labels.dependency }} {{ $labels.operation }}: every call failed in the last 5 minutes` |

Before saving, Preview should show one row per dependency and operation.
If it shows none, check Match exact is off and both dimensions are set.

## 1a. <service> <database> unavailable

For a database, its availability comes from the driver's heartbeats
(`references/METRICS.md` → "A database"). Keep this section only if the
service has a database. The table under "Check" says which of rules 1, 2
and 3 are built beside it.

| Field | Value |
|---|---|
| Rule name | `<service> <database> unavailable` |
| Metric | `external.dependency.available` |
| Dimensions | `dependency` = `<database>`, the only dimension, with Match exact off |
| Statistic | `Maximum` |
| Period | `300` (5 minutes) |
| Alert condition | `Last` `IS BELOW` `1` (every reading from every task in the window said down) |
| Summary | `<database> has been unavailable to every task for 5 minutes` |

## 2. <service> dependency calls failing

Duplicate rule 1 (or rule 1a, where rule 1 is not built), then set:

| Field | Value |
|---|---|
| Rule name | `<service> dependency calls failing` |
| Metric | `external.call.failure` |
| Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off |
| Statistic | `Sum` |
| Period | `900` (15 minutes) |
| Alert condition | `Last` `IS ABOVE` `2` (3 or more failed calls) |
| Summary | `{{ $labels.dependency }} {{ $labels.operation }}: 3 or more failed calls in 15 minutes` |

Where a database is the only dependency, Preview must show a
`<database>` row before saving. If it shows none, the database's
command metrics are not published: build neither this rule nor rule 3
(see "Check"), as they would find no data and never fire.

## 3. <service> dependency slow

Duplicate rule 2, then set the fields below. One rule covers all
dependencies when they share a read timeout; otherwise make one rule per
dependency, setting `dependency` to its name instead of `*`.

| Field | Value |
|---|---|
| Rule name | `<service> dependency slow` |
| Metric | `external.call.duration` |
| Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off |
| Statistic | `p95` (type it in if the list does not offer it) |
| Period | `900` (15 minutes) |
| Alert condition | `Last` `IS ABOVE` `<slow-threshold-ms>` (two thirds of `<read-timeout-ms>`, the read timeout the client actually uses) |
| Summary | `{{ $labels.dependency }} {{ $labels.operation }}: p95 call time above <slow-threshold-ms> ms over 15 minutes` |

Take `<read-timeout-ms>` from the client that makes the call, not from a
config value: check the value is actually applied (a Feign client with
no `Request.Options` uses Feign's 60 second default whatever the YAML
says).

## Check

The group holds `platform_managed_do_not_delete` and the rules built
here, each Normal, none in Error:

| The service has | Rules |
|---|---|
| No database | 1, 2 and 3 (three rules) |
| A database and other dependencies | 1, 1a, 2 and 3 (four rules) |
| A database as its only dependency, publishing its command metrics | 1a, 2 and 3 (three rules) |
| A database as its only dependency, without its command metrics | 1a (one rule) |

A database's command metrics are the `external.call.*` meters
`MongoCommandMetrics` records (`references/METRICS.md` → "A database").
A heartbeat records none.

Rule 3 counts once more for each extra per-dependency slow rule. Then prove each one fires
(`references/ALERTS.md` → "Prove they fire"), and export one rule
(More → Export → JSON) for Claude to check this sheet against.

## Not alerted on

- `external.dependency.available` for an HTTP dependency. It is for the
  dashboard only; rule 1 alerts on `external.call.failure` instead
  (`references/METRICS.md` → "Availability: passive or active" says
  why). A database's comes from the driver's heartbeats, and rule 1a
  alerts on it.
