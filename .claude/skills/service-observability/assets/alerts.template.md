# Alerts for <service>

Build each rule by hand in the dev Grafana
(`https://metrics.dev.cdp-int.defra.cloud/`): Alerting → Alert rules →
New alert rule. The values below are in the order the form asks for them.
Build rule 1 in full, then make rules 2 and 3 from it with More →
Duplicate, changing only the fields their tables list.

Grafana cannot import these: CDP issues no service-account tokens and
`[UNPROVEN]` the UI has no import for Grafana-managed alert rules.

Every rule shares these settings:

| Field | Value |
|---|---|
| Folder | `Playground/<service>-monitoring` |
| Evaluation group | `<service>-advanced-alerts`, the existing one. `[UNPROVEN]` it evaluates every 5 minutes; the form shows its interval |
| Data source | CloudWatch, Metric Search, Builder |
| Namespace | `<service>` |
| Dimensions | `Dependency` = `*`, `Operation` = `*`, with Match exact off |
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
| Metric | `ExternalCallFailure` |
| Statistic | `Minimum` |
| Period | `300` (5 minutes) |
| Alert condition | `Last` `IS EQUAL TO` `1` (every call in the window failed). If the operator list has no "equal to", `IS ABOVE` `0.99` means the same here |
| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: every call failed in the last 5 minutes` |

Before saving, Preview should show one row per dependency and operation.
If it shows none, check Match exact is off and both dimensions are set.

## 2. <service> dependency calls failing

Duplicate rule 1, then change:

| Field | Value |
|---|---|
| Rule name | `<service> dependency calls failing` |
| Statistic | `Sum` |
| Period | `900` (15 minutes) |
| Alert condition | `Last` `IS ABOVE` `2` (3 or more failed calls) |
| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: 3 or more failed calls in 15 minutes` |

## 3. <service> dependency slow

Duplicate rule 1, then change the fields below. One rule covers all
dependencies when they share a read timeout; otherwise make one rule per
dependency, setting `Dependency` to its name instead of `*`.

| Field | Value |
|---|---|
| Rule name | `<service> dependency slow` |
| Metric | `ExternalCallDuration` |
| Statistic | `p95` (type it in if the list does not offer it) |
| Period | `900` (15 minutes) |
| Alert condition | `Last` `IS ABOVE` `<slow-threshold-ms>` (two thirds of `<read-timeout-ms>`, the read timeout the client actually uses) |
| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: p95 call time above <slow-threshold-ms> ms over 15 minutes` |

Take `<read-timeout-ms>` from the client that makes the call, not from a
config value: check the value is actually applied (a Feign client with
no `Request.Options` uses Feign's 60 second default whatever the YAML
says).

## Check

The group holds `platform_managed_do_not_delete` and these three rules,
each Normal, none in Error. Then prove each one fires
(`references/ALERTS.md` → "Prove they fire"), and export one rule
(More → Export → JSON) for Claude to check this sheet against.

## Not alerted on

- `DependencyAvailable`: it reports the last call's outcome however old,
  so it lags. It is for the dashboard only.
