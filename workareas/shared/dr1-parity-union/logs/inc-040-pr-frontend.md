## EUDPA-606 — six hub task rows are labelled differently from Design release 1

Increment: **inc-040** (DR1 parity union backlog)
Ticket: **EUDPA-606**

Six task-list rows on the live-animals hub carry wording that does not match Design release 1. The most visible is `transporter`, which the service calls "Transporter" and the design calls "Transport details".

### What changed

Row titles only, in both locales (`copy.en.js` and `copy.cy.js`):

| Row id | Was | Now |
|---|---|---|
| `importReason` | Main reason for importing | Main reason for import |
| `additionalDetails` | Additional commodity details | Additional details |
| `animalIdentification` | Animal identification details | Identification details |
| `transporter` | Transporter | Transport details |
| `contact` | Contact address | Contact address for this consignment |
| `documents` | Uploaded documents | Upload documents |

Nothing else about the hub moves. Which rows exist, and which section each row sits in, are inc-033 and inc-037 and are untouched here. The four rows that already agreed word for word, and the conditional "Transit countries" row, are left alone.

Note that "Uploaded documents" describes what is already on the page while the design's "Upload documents" describes the action the user is about to take, so that row is a genuine change of meaning rather than a tidy-up.

### Tests

- `copy.test.js` — the rendered-row table in `GET /hub` and the per-row assertions in `#hubHandler` move to the new wording.
- A new test pins all twelve **Welsh** row titles exhaustively. Copy parity only checks that a Welsh leaf differs from its English counterpart, so without this pin the Welsh wording is unguarded. The English titles are already pinned by the rendered-row table.
- The fit specs that navigate the hub by row label (`fit/journey-smoke.fit.spec.js`, `fit/live-animals-journey.js`, and the four `features/documents/fit/*.fit.spec.js` specs) are updated to the new labels.

### Repos

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.
