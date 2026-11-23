Do the Grafana parts of Steps 1 and 4 to 6 through the developer's
signed-in browser, instead of handing them a file to build by hand.
Parent-loaded: path and Bash rules come from `SKILL.md`.

Done this way on `trade-imports-dynamics-gateway` in dev on 2026-11-23:
the dashboard imported, six alert rules built, fired and restored
(`ALERTS.md` → "Prove they fire").

## When

Only when the developer asks for it and Claude in Chrome is connected
(the `chrome-browser` skill). The dev Grafana needs a signed-in user to
write, and CDP issues no service-account tokens, so the developer's
own session is the only way in. Every write is theirs: say what will
change before each one. Otherwise the developer imports and builds by
hand from the files `DASHBOARD.md` and `ALERTS.md` describe.

Never write to a `CDP_Tenants` group or dashboard: they are the
platform's. Write only to `Playground/<service>-monitoring`.

## How

Open a new tab on `https://metrics.dev.cdp-int.defra.cloud/`, then run
`fetch` calls from the page with `javascript_tool`. Same-origin calls
carry the session; no token, header or cookie handling is needed.

| Job | Call |
|---|---|
| Who is signed in | `GET /api/user` |
| Find a folder or dashboard | `GET /api/search?query=<service>`. The Playground folder's uid is in the result |
| List every alert rule and its state | `GET /api/prometheus/grafana/api/v1/rules` (also open without signing in; Claude's own `curl` to it was refused by the permission prompt) |
| Run a panel's query | `POST /api/ds/query` with `{ from, to, queries }`, each query's `datasource.uid` set to the real data source uid (the dashboard URL shows them as `var-cloudwatch` and `var-opensearch`) |
| Import or update a dashboard | `POST /api/dashboards/db` with `{ dashboard, folderUid, overwrite: false, message }`. To update, set `dashboard.uid` and `dashboard.version` to the saved ones: a stale version is refused, not overwritten |
| Read an alert group | `GET /api/ruler/grafana/api/v1/rules/<folderUid>` |
| Write an alert group | `POST /api/ruler/grafana/api/v1/rules/<folderUid>` with `{ name, interval, rules }`. It replaces the whole group: send every rule already there exactly as read (`platform_managed_do_not_delete` included), then the new ones |
| Evaluate a rule now | `POST /api/v1/eval` with `{ condition, data, now }` from the rule's `grafana_alert` |
| Contact point and its last send | `GET /api/alertmanager/grafana/config/api/v1/receivers` (`lastNotifyAttempt`, `lastNotifyAttemptError`); its Slack channel is in `GET /api/alertmanager/grafana/config/api/v1/alerts` → `receivers[].grafana_managed_receiver_configs[].settings.recipient` |

## A rule's shape

Copy it from a rule the UI built: read reference-data's group
(`Playground/trade-imports-reference-data-monitoring`, folder uid
`afkd0b2ef9m9se`) and take one rule's `grafana_alert.data`. It is three
queries:

| refId | What |
|---|---|
| `A` | The CloudWatch query: `relativeTimeRange.from` and `model.period` both the rule's period in seconds; `model` as a dashboard target plus `expression: ''`, `id: ''`, `label: ''`, `logGroups: []`, `queryLanguage: 'CWLI'`, `sqlExpression: ''`, `intervalMs: 1000`, `maxDataPoints: 43200` |
| `B` | `type: 'reduce'`, `reducer: 'last'`, `expression: 'A'` |
| `C` | `type: 'threshold'`, `expression: 'B'`, the condition in `conditions[0].evaluator` (`{ type: 'gt', params: [2] }`, `eq`, `lt`) |

With `condition: 'C'`, `for: '0s'`, `no_data_state: 'OK'`,
`exec_err_state: 'Error'`, `notification_settings: { receiver:
'<service>' }` and the summary in `annotations.summary`.

## Check what was saved

Grafana stores a dashboard with its keys sorted, and adds `id`, `uid`
and `version`. To prove the saved dashboard is the file:

1. Locally: `jq -S -c 'del(.uid)' <file> | tr -d '\n' | shasum -a 256`.
2. In the page: read it back, drop `id`, `uid` and `version`, serialise
   it with sorted keys, hash it with `crypto.subtle.digest('SHA-256', …)`
   and compare with the local hash inside the script, returning only
   `true` or `false`.

Make every change to the local file first, then apply the same change
in the page only when the saved copy's hash matches the file's old
hash, and save only when the edited copy matches the file's new hash.

## What gets in the way

- A large dashboard does not fit in one script. Build it in the page
  with a short generator, then check its hash against the file before
  saving.
- Each `javascript_tool` call times out after 45 seconds. Wait in steps
  of 30 seconds at most.
- The tool's output filter hides hashes and `key=value` text. Compare
  inside the script and return JSON.
- A page load clears anything kept in `window`. Keep a copy that must
  survive one (the alert group before lowering thresholds) in
  `localStorage`, and remove it when done.
- Saving a rule group resets every rule in it to inactive, including
  one that was firing, until the group's next evaluation.
