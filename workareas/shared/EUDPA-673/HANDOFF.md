# EUDPA-673 implementation handoff

**Ticket:** Deploy microservices to CDP perf-test (first time)  
**Status:** Workspace artifacts ready; **CDP portal + `cdp-app-config` PR** still required to close the ticket.

## Where the work lives

| Artifact | Path |
|----------|------|
| Plan + implementation notes | `workareas/ticket-planning/EUDPA-673/plan.md` |
| `cdp-app-config` perf-test drafts | `workareas/ticket-planning/EUDPA-673/cdp-app-config-draft/` |
| Regenerate drafts | `workareas/ticket-planning/EUDPA-673/scripts/generate-cdp-app-config-draft.sh` |
| Secrets / env inventory (EUDPA-633) | `workareas/ticket-planning/EUDPA-673/perf-test-config-inventory.md` |
| Portal deploy + auto-test steps | `workareas/ticket-planning/EUDPA-673/portal-runbook.md` |

(`workareas/ticket-planning/` is gitignored; copy into `workareas/shared/EUDPA-673/` or commit the `cdp-app-config` PR when ready.)

## Quick start

1. Open `cdp-app-config-draft/README.md` and apply drafts to `~/Workspace/DEFRA/projects/cdp/cdp-app-config` on branch `feat/EUDPA-673-perf-test-config`.
2. Merge PR → redeploy each service in perf-test per `portal-runbook.md`.
3. Run ins-tests smoke with `PLAYWRIGHT_ENVIRONMENT=perf-test`.

## Perf-test AWS (account `120185944470`)

| Resource | Name | Config key / service |
|----------|------|----------------------|
| S3 (documents) | `perf-test-trade-imports-animals-documents-05244` | `CDP_DOCUMENTS_BUCKET` → trade-imports-animals-backend |
| SNS FIFO | `trade_imports_animals_eu_notifications.fifo` | `OUTBOX_SNS_TOPIC_ARN` → trade-imports-animals-backend |
| SQS FIFO | `trade_imports_animals_eu_notifications_ins_backend.fifo` | `NOTIFICATION_SQS_QUEUE_URL` → trade-imports-ins-backend |

**CDP app-config PR:** https://github.com/DEFRA/cdp-app-config/pull/4860 (`feat/EUDPA-673-perf-test-config`).

## No service-repo PRs

Application code unchanged; perf-test is env + platform only.
