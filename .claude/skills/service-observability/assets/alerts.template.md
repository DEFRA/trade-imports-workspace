# Alerts for <service>

Build each rule by hand in the dev Grafana
(`https://metrics.dev.cdp-int.defra.cloud/`): Alerting → Alert rules →
New alert rule. The values below are in the order the form asks for them.

Grafana cannot import these: CDP issues no service-account tokens and
`[UNPROVEN]` the UI has no import for Grafana-managed alert rules.

Every rule shares these settings:

| Field | Value |
|---|---|
| Folder | `Playground/<service>-monitoring` |
| Evaluation group | `<service>-advanced-alerts` (evaluates every 5 minutes) |
| Data source | CloudWatch |
| Namespace | `<service>` |
| Dimensions | `Dependency` = `*`, `Operation` = `*` (match exact off) |
| No data | Normal |
| Labels | none (promotion adds them) |

Leave the rule named `platform_managed_do_not_delete` alone. Routing to
Slack is a #cdp-support request (`references/ALERTS.md` → "Route to
Slack"), not a field here.

The thresholds and the 0s pending periods are a first guess for the
team to agree, not tested values.

## 1. <service> dependency unavailable

| Field | Value |
|---|---|
| Rule name | `<service> dependency unavailable` |
| Metric | `ExternalCallFailure` |
| Statistic | `Minimum` |
| Period | 5 minutes |
| Condition | is equal to 1 (every call in the window failed) |
| Pending period | 0s (fire on the first evaluation) |
| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: every call failed in the last 5 minutes` |

## 2. <service> dependency calls failing

| Field | Value |
|---|---|
| Rule name | `<service> dependency calls failing` |
| Metric | `ExternalCallFailure` |
| Statistic | `Sum` |
| Period | 15 minutes |
| Condition | is above 2 (3 or more failed calls) |
| Pending period | 0s |
| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: 3 or more failed calls in 15 minutes` |

## 3. <service> dependency slow

One rule for all dependencies when they share a read timeout; otherwise
one rule per dependency, adding a `Dependency` filter.

| Field | Value |
|---|---|
| Rule name | `<service> dependency slow` |
| Metric | `ExternalCallDuration` |
| Statistic | `p95` |
| Period | 15 minutes |
| Condition | is above `<slow-threshold-ms>` (two thirds of `<read-timeout-ms>`, the read timeout the client actually uses) |
| Pending period | 0s |
| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: p95 call time above <slow-threshold-ms> ms over 15 minutes` |

Take `<read-timeout-ms>` from the client that makes the call, not from a
config value: check the value is actually applied (a Feign client with
no `Request.Options` uses Feign's 60 second default whatever the YAML
says).

## Not alerted on

- `DependencyAvailable`: it reports the last call's outcome however old,
  so it lags. It is for the dashboard only.
