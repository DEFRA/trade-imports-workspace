# Service registration spec — trade-imports-plants-prototype

Same caveat as the deployment spec next to this file: `cdp-tf-svc-infra`
isn't cloned locally, so this describes the values the registration needs
rather than mirroring an existing entry.

## Zone

**Frontend/public zone — same as trade-imports-plants-frontend.**

It's a user-facing web application (designers reach it in a browser), same
as its real twin, so it needs the same zone as plants-frontend, not a
private/backend one. This also follows from `cdp-app-config`: plants-frontend's
`DEFRA_ID_REDIRECT_URL` in the `dev` tier points at its own hostname
(`https://trade-imports-plants-frontend.dev.cdp-int.defra.cloud/auth/sign-in-oidc`)
— the same public-facing hostname pattern the prototype would get.

## ECR repository

Created automatically when the service is registered through the CDP
portal's "Create new service" flow — no manual ECR entry to draft.

## Team / tenant

Same team/tenant as trade-imports-plants-frontend. The exact tenant name
lives in `cdp-tf-svc-infra`, which isn't available locally to confirm — Sam
should register it under the same tenant plants-frontend is under.

## Open question this doesn't answer

**Who can reach the deployed prototype?** Stub sign-in lets anyone who
reaches the URL in. CDP's frontend zone is internal-only by default
(`*.cdp-int.defra.cloud`), which may be enough — or the chooser may need a
shared password on top. This is a registration/access-control decision, not
something inferable from plants-frontend's existing entry. See PLAN.md,
"Open for Sam" #1.
