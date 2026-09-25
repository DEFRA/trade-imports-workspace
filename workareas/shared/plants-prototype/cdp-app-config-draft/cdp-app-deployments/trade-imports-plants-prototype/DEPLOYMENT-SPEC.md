# Deployment spec — trade-imports-plants-prototype

`cdp-app-deployments` and `cdp-tf-svc-infra` are not cloned locally (checked
`~/git/defra/cdp-app-config`, `~/git/defra/cdp`, and
`find ~/git/defra -maxdepth 2 -name "cdp-*"` — only `cdp-app-config` and
`cdp/cdp-documentation`, `cdp/cdp-nginx-upstreams` exist). So this isn't a
mirror of an existing file in either repo — it's a spec of the values Sam
needs, for whichever route actually creates a new CDP service (the CDP
portal's own "Create new service" flow, which is how a brand new tenant
service like this one normally gets its deployment record and infra
registration created, or a hand-edited PR against these repos if that's not
how it's done for a repo that already exists on GitHub).

## Instance count

**Exactly one instance in every environment: min = max = desired = 1.**

This is the one place the prototype must differ from plants-frontend
regardless of what plants-frontend runs. Stub data lives in each instance's
own memory (`SESSION_CACHE_ENGINE=memory`) — a second instance would give a
designer's journey a 50% chance of landing on an instance that's never seen
their session, splitting their journey. See PLAN.md, "Still to do" section 6.

## CPU / memory

Not known locally — plants-frontend's actual instance size lives in
`cdp-app-deployments`, which isn't cloned. Mirror whatever plants-frontend
runs: it's the same Node/Hapi frontend stack with the same request profile
(one designer at a time, no real backend traffic), so there's no reason to
size it differently. Sam should copy plants-frontend's CPU/memory figures
across when setting this up, not invent new ones.

## Environment(s)

Draft covers the "dev" environment only — see the note at the top of
`cdp-app-config/services/trade-imports-plants-prototype/dev/trade-imports-plants-prototype.env`.
Which environment(s) the prototype actually deploys to is open (PLAN.md,
"Open for Sam" #2), including whether every merge to `main` should trigger a
deploy or whether it's deployed by hand when a designer needs it.
