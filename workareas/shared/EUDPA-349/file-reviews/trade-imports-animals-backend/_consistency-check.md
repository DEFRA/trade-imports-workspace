# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-349
**All repos in scope:** trade-imports-animals-frontend (the only repo in `.review-meta.json`), trade-imports-animals-backend (diff cached, off-ticket)
**PR:** #50 | **Commit:** 6ec2139

## Scope note — this diff is not EUDPA-349

The cached diff at `.diffs/trade-imports-animals-backend.diff` is
**PR #50, commit `6ec2139` — `feat(EUDPA-171) Add notification amend feature`**,
which is already merged to `main` (`git branch --contains 6ec2139` → `main`).
It adds `POST /notifications/{ref}/amend`, an `AMEND` status, an outbox event
type and their tests. A grep for `fulfil` across the whole diff returns **zero
matches**.

`.review-meta.json` lists only `trade-imports-animals-frontend` (PR 213), and
`file-reviews/_VERIFICATION.md` counts 53 changed files, all frontend. There is
no `EUDPA-349` branch in this repo. This diff and the nine stub `*.review.json`
files under this directory were swept in by `prepare-review.sh` picking up the
most recent PR, not by cross-repo branch parity.

**Branch parity (workspace rule 2) is therefore satisfied by absence, not
violated:** EUDPA-349 is a single-repo change and no peer branch is expected.

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---|---|---|---|
| `/` → `.` fulfilment index delimiter | frontend ✅ applied throughout `src`, `test`, fixtures | ❌ Not present — **and correctly so** | CONSISTENT (expected absence) |
| `PATH_UNSAFE`/`FIELD_UNSAFE` token-validation regex (AC2) | frontend ✅ `bridge/fulfilment-registry.js` now rejects `:` and `.` | ❌ Not present | CONSISTENT (expected absence) |
| `fulfilmentId` → `fulfilmentIndex` vocabulary rename (AC3) | frontend ⚠️ partially applied | ❌ Not applicable — no such identifiers exist here | CONSISTENT (expected absence) |
| Persisted `records: [{ fulfilmentId, value }]` wire shape | frontend ✅ writes it; tests repo ✅ hard-codes it in `domain/models/api/notification-fulfilments.ts` | ✅ Stored, never parsed | CONSISTENT |
| Read-side migration for existing `/`-delimited data | frontend ❌ none; tests ❌ none | ❌ None | **INCONSISTENT** — see Missing Changes |
| Config / env / dependency changes | frontend: none | none | CONSISTENT |

### Why the absence of the delimiter change is expected here

This repo holds the fulfilment payload but never interprets it. Evidence:

- `src/main/java/.../notification/Notification.java:49-50`
  — `/** Opaque obligation-fulfilment payload — persisted byte-faithfully; never interpreted by the backend. */`
    `private List<Document> fulfilments;`
- `NotificationDto.java:18-19` — same `List<Document>`, same doc-comment.
- `NotificationFulfilmentsView.java` — a Spring Data interface projection
  returning `List<Document> getFulfilments()`; no field-level access, no
  validation, no delimiter awareness.
- `NotificationRepository.java:19` — `findFulfilmentsViewByReferenceNumber`
  reads the projection whole.

Because the payload is a byte-faithful `Document` blob, a change to the
separator *inside* an index string is invisible to every Java type here. No
DTO, schema, validation annotation, index or migration in this repo depends on
`/` vs `.`. Nothing was missed.

## Missing Changes

**One genuine cross-repo gap, which this repo cannot close alone.**

The delimiter swap is not a code-compatibility problem for the backend, but it
*is* a data-compatibility problem, and the data lives in this repo's MongoDB
`notification` collection. Records persisted before the frontend change carry
depth-2 indexes shaped `line0/unit0`; after the change the frontend's decoder
(`services/persistence/records/fulfilment-codec/validate/fulfilment-id.js` →
`fail()` → `throw new TypeError`) rejects them on read, making those
notifications unloadable. Detail and the traced failure path are in the
frontend's `_consistency-check.md`.

Three candidate owners, and the reason each is or is not viable:

- **This repo** — cannot own it without breaking its own contract. Writing a
  migration would require the backend to parse and rewrite a payload it
  deliberately declares opaque. Doing so would be the wrong fix.
- **`trade-imports-animals-tests`** — seeds only depth-1 indexes
  (`flows/api-journey.ts:54-58`, all `'line0'`; no `unit[0-9]` anywhere in the
  repo), so it cannot even detect the regression, let alone fix it.
- **`trade-imports-animals-frontend`** — the only interpreter of the shape, and
  therefore the correct owner. Recorded there as Missing Changes #1.

The point worth carrying to this repo's reviewers: **do not expect a backend
change, but do confirm the frontend has one before merge**, because the failure
surfaces as corrupt-looking data in this repo's store with no backend-side
signal.

Also relevant: because `submittedFulfilmentsBaseline` (`Notification.java:52-54`)
is a snapshot of the same opaque payload, a notification in `AMEND` status
holds **two** copies of the old-delimiter data. Any frontend-side migration must
be a read-path normalisation rather than a one-shot write-path rewrite, or the
baseline copy will be left stale and a `cancelAmend` will restore unreadable
records. This interaction between EUDPA-171 (the diff actually cached here) and
EUDPA-349 is worth flagging to whoever implements the migration.

## Unique Changes

Everything in the cached diff is unique to this repo and belongs to
**EUDPA-171**, not EUDPA-349: the `amend` controller endpoint and its
`@ApiResponse` set, the `AMEND` enum member, the widened `copyNotification`
status guard, the new outbox event type and repository method, and their unit
tests. Not suspicious — simply out of scope for this review. It is already
merged, so it needs no ruling here.

No EUDPA-349-attributable change exists in this repo.

## Verdict

**Status:** SINGLE REPO (N/A) — this repo is not part of EUDPA-349
**Issues:** 0 inconsistencies attributable to this repo; 1 cross-repo data gap
noted for the frontend to own
**Summary:** EUDPA-349 is a frontend-only change and this repo correctly carries
none of it — the fulfilment payload is stored as an opaque `List<Document>` and
never interpreted, so the delimiter swap is invisible to every Java type here;
the only cross-repo concern is that the pre-existing data in this repo's store
becomes unreadable to the new frontend decoder, which the frontend must
normalise on read.
