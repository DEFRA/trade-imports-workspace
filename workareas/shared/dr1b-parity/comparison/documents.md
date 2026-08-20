# `documents` — dr1 against dr1b

Twelve findings each. Both runs read the same seven prototype captures
(`dr1-upload-documents`, `-error`, `-continue-error`, `-file-chosen`, `-limit-error`,
`-populated`, `-populated-scanning`) and the same two frontend captures
(`fe-documents-empty`, `fe-documents-populated`).

The evidence manifests now resolve to `dr1b-parity/capture/` — checked
`evidence/frontend@76a864ba/manifest.json` row 0, `html.file` points inside
`dr1b-parity`, so firewall item 1 of `PROVENANCE.md` is repaired for this domain.
Nothing in `PROVENANCE.md` item 3 (the `hub` leak) touches this domain, so agreement
here counts normally.

## Subject map

| Subject | dr1 | dr1b | Verdict |
|---|---|---|---|
| File field label — "Attachment" vs "Upload a file" | inc-041 | inc-038 | agree |
| Continue discards the part-filled add form | inc-042 | inc-039 | agree, both exact |
| Document count cap — 15 vs 10 | inc-043 | inc-045 | agree |
| No Document type field; type guessed from filename | inc-044 | inc-041 | agree, identical 13-option list |
| Drop zone vs bare `govukFileUpload` | inc-045 | inc-037 | agree |
| **File size — 50MB vs 10 MB** | inc-046 `needs-backend` | inc-042 `frontend-work` | **band disagreement — dr1b right** |
| Bordered "File upload" card grouping | inc-047 | — | **dr1-only, and real** |
| Missing page guidance (ITAHC intro, bullets, details table) | inc-048 | inc-044 | agree |
| JPG missing from the file-types hint | inc-049 | inc-043 (merged with ZIP) | agree |
| Scan status tag wording | inc-050 | inc-047 | agree; dr1b adds the hidden per-row label |
| Add-form validation message wording | inc-051 (4 messages) | inc-036 (3) + the cap message inside inc-045 | agree, different partition |
| ZIP prohibition never stated | inc-052 | inc-043 (merged) | agree |
| ITAHC label + the 14th `HEALTH_CERTIFICATE` type | folded into inc-044 | inc-040 (standalone) | agree, different partition |
| **Scan gate blocks Continue; manual refresh link** | one clause inside inc-042 | inc-046 `disputed` | **dr1b-only as a finding, and real** |

Eleven subjects are shared. One is dr1-only. One is dr1b-only. Two more differ only in
how the run partitioned the same material (the cap message; the ITAHC label) — neither
is a gap.

---

## 1. Is anything in `dr1b` wrong?

Eleven of twelve are **sound**. One is **sound in its conclusion but wrong in one
load-bearing sentence of its reasoning**.

### inc-042 (file size) — sound band, wrong mechanism

The finding's `difference` slot and its `correction` both assert:

> "the backend already accepts a file this size, and takes its per-upload ceiling from
> whatever the frontend sends it"
>
> "the frontend passes `maxFileSize` down with each upload it initiates
> (`documents/handlers/reads/download.js:36` into `services/document-uploads/real.js:26,38`),
> so the backend is currently being told 10 MB by the very constant this finding changes."

The first half of the sentence is right. The second half is **wrong**.

The frontend does put `maxFileSize` in the initiate body — confirmed at
`repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/documents/handlers/reads/download.js:36`
and `.../src/server/app/services/document-uploads/real.js:26,38`. But the backend's
request record has no such component:

`repos/trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentUploadRequest.java`
declares exactly three components — `documentType`, `documentReference`, `dateOfIssue`.
No `maxFileSize`, no `mimeTypes`. Nothing in `src/main` overrides Jackson's
`FAIL_ON_UNKNOWN_PROPERTIES` (grepped for `FAIL_ON_UNKNOWN_PROPERTIES`,
`fail-on-unknown-properties`, `@JsonIgnoreProperties` across `src/main` — no hits), so
Spring Boot's default applies and both fields are silently discarded.

What the backend actually sends to cdp-uploader is its own configured value:

```
DocumentService.java:93   cdpConfig.uploader().maxFileSize(),
application.yml:45        max-file-size: ${CDP_UPLOADER_MAX_FILE_SIZE:52428800}
```

52,428,800 bytes = 50 MiB. Plus `application.yml:29-30`,
`spring.servlet.multipart.max-file-size: 50MB` / `max-request-size: 51MB`.

**Grade: overstated.** The band survives — it survives more strongly than the verifier
argued. The backend is not "being told 10 MB"; it ignores the frontend entirely and
already runs at 50 MiB. So there is nothing on the backend to change and nothing to
land first, which is exactly what `frontend-work` means.

Worth flagging separately: the frontend sending a `maxFileSize`/`mimeTypes` pair that
the backend contract does not accept is a live dead-field mismatch. It is out of scope
for a parity comparison, but somebody should know.

### The other eleven

Spot-checked each against the rendered DOM and the cited source. All sound:

- **inc-036** — "No captured frontend state shows any of them" is true;
  `grep -c` for the three strings in `fe-documents-empty.html` returns 0. The prototype
  strings match `app/routes.js:9101-9155` character for character.
- **inc-037** — `dr1-upload-documents.html:514-520` is the dashed dropzone with
  `aria-live="polite"` status, `Choose file` label and `or drop file` span, exactly as
  described. `govuk-frontend: ^6.3.0` confirmed in `package.json:82`.
- **inc-039** — verified independently below.
- **inc-040** — `copy.en.js:27` is `ITAHC: 'ITAHC'`, `:39` is
  `HEALTH_CERTIFICATE: 'Health certificate'`. The prototype select has thirteen options
  and no "Health certificate".
- **inc-041** — the thirteen option labels in the finding match
  `dr1-upload-documents.html:348-406` in order, verbatim.
- **inc-043** — `<li>a PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX</li>` in the frontend DOM;
  `<li>PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX</li>` and
  `<li>ZIP files are not allowed for security reasons</li>` in the prototype's. The
  MIME-collapse mechanism at `upload-config.js:28-32` is as stated.
- **inc-044** — the intro paragraph and the three table rows are quoted exactly;
  `dr1-upload-documents-populated.html:284-294` carries the three `Consignment` /
  `Documents needed` rows word for word.
- **inc-045** — `obligations/sections/documents.js:25` is `maxEntries: 10`;
  `dr1-upload-documents-limit-error.html` has exactly 15 status tags
  (`grep -c app-upload-documents-table__status` → 15) and one error string.
- **inc-046** — verified below; genuinely new.
- **inc-047** — verified below against both DOMs.

## 2. What did `dr1b` find that `dr1` missed?

**One substantive finding: inc-046, the scan gate on Continue (`disputed`).**

It is real. `controller.js:272-277`:

```js
const pageState = await loadPage(request, h)
if (!kit.hubExitTarget(request) && isStillSettling(pageState.documents)) {
  return render(request, h, pageState, EMPTY_FORM, {
    summaryErrors: settlingSummaryErrors(pageState.documents)
  })
}
```

The prototype's continue branch at `app/routes.js:10173-10193` reads no scan status at
all, and `dr1-upload-documents-limit-error.html` proves the point in a picture: fifteen
rows, every one tagged "Scanning for virus", and the only error on the page is the file
count.

dr1 saw the same code and disposed of it in a single clause inside inc-042 — *"The
existing scan-settling block on Continue is a frontend extra and stays."* That is an
assertion, not a finding, and the corpus cannot support it. dr1b's `disputed` band is
the honest reading, and its sharpest observation has no counterpart in dr1: the gate is
skipped whenever the trader leaves via "Save and return to hub"
(`!kit.hubExitTarget(request)`), so an unsettled scan can already be walked past today.
The gate delays the trader on one button; it does not keep an unscanned attachment out
of a notification.

The other dr1b addition is a partition change, not new signal: **inc-040** promotes the
ITAHC label and the fourteenth `HEALTH_CERTIFICATE` type to a standalone finding, where
dr1 folded both into inc-044's difference slot. Same content, differently filed.

dr1b also carries two details dr1 lacks:

- **inc-047** adds the hidden per-row status label. Confirmed:
  `grep -o 'govuk-visually-hidden">[^<]*'` over `fe-documents-populated.html` returns
  the datepicker labels, the table caption, "Actions", "for document 1", "document 1"
  and "Support links" — and nothing naming the status cell. The prototype has
  `<span class="govuk-visually-hidden">Virus check status for ITAHC-2026-0001</span>`.
  dr1 inc-050 mentions the prototype's hidden text in its evidence paragraph but omits
  it from the fix.
- **inc-045** notes that DR1 anchors its cap error to the Attachment field
  (`href: '#attachment'`, `routes.js:9110`) where the frontend anchors it to the table.

## 3. What did `dr1` find that `dr1b` missed?

**One: inc-047, the bordered "File upload" card.** It is real and dr1b has no
counterpart anywhere in its 12 (searched the whole dr1b backlog for
`File upload|bordered|border` — seven hits, none on this page).

`dr1-upload-documents-populated.html`:

```
309  <section class="app-upload-documents-card" aria-labelledby="file-upload-heading">
311    <h2 class="app-upload-documents-card__heading" id="file-upload-heading">File upload</h2>
528    <button ... value="add-another" ...>Save and add another</button>
535    <table class="govuk-table app-upload-documents-table">
574  </section>
580  Save and continue
588  Save and return to overview
594  <a class="govuk-link" href="/notification-hub">Cancel and return to overview</a>
```

The card closes at 574; the three page-level actions sit outside it. The frontend has no
such container — the only `<h2>` elements in `fe-documents-populated.html` are the
datepicker dialog title (:171) and "Support links" (:289), and the
`fe-documents-empty` screenshot shows one unbroken column with "Save and add another"
and "Continue" reading as two buttons in the same list.

This matters more than it looks, because it is the visual half of the inc-039/inc-042
data-loss bug both runs found. dr1b diagnosed the loss and left the reason the trader
cannot see it coming unrecorded.

## 4. Where they contradict each other, which is right?

### The file-size band — dr1b is right, dr1 is wrong

**dr1 inc-046: `needs-backend`.** Its stated reason:

> "This cannot land in the frontend alone: the 10 MB figure exists because the platform
> ingress rejects a larger body before the application sees it, so the ingress limit has
> to be raised on the deployed environments first"

**dr1b inc-042: `frontend-work`**, after its verifier falsified the original
`needs-backend` banding.

Both runs started from the same source of belief — the comment at
`upload-config.js:40-41`:

```js
// 10 MB decimal (not MiB) so the user-facing "10 MB" hint is literally
// accurate and we stay ~485 KB clear of the CDP nginx ingress 10 MiB cap.
const MAX_FILE_SIZE_MB = 10
```

Three things settle it against dr1.

**(a) The contract's own band table.** `FINDING-CONTRACT.md:113` defines `needs-backend`
as *"An API, contract or persistence change has to land first."* A platform ingress cap
is none of those three. Even if the cap is real, it does not qualify.

**(b) The backend needs no change.** Already evidenced in §1:
`spring.servlet.multipart.max-file-size: 50MB` / `max-request-size: 51MB`
(`application.yml:29-30`) and `cdp.uploader.max-file-size: 52428800` = 50 MiB
(`application.yml:45`), all env-overridable, and `DocumentUploadRequest` carries no size
field to be told otherwise. There is no API change, no contract change, no persistence
change.

**(c) The nginx cap has no corroboration in the corpus.** `grep -rn` for
`nginx|ingress|client_max_body_size|proxy-body-size` across all of `repos/`
(excluding `node_modules`, `.git`, `coverage`, `.public`) returns exactly two
non-generated hits, and both are prose:

- `trade-imports-animals-frontend/.../documents/upload-config.js:40-41` — the comment above.
- `trade-imports-animals-tests/resources/file-upload/constants.ts:4-8` — a Javadoc-style
  comment on `ABOVE_PAYLOAD_CAP_BYTES` repeating the same "10 MiB (10,485,760 B) CDP
  nginx ingress cap".

The frontend repo holds no chart, no k8s manifest, no ingress annotation and no
environment variable for it (`ls -a` on the repo root: `Dockerfile`, `.github`,
`scripts`, no `helm/`, no `charts/`, no `k8s/`). dr1b's verifier said "no manifest or
chart corroborating it" — correct, though there are two comments across two repos, not
one.

**Verdict: `frontend-work`. dr1's `needs-backend` is wrong.** Both runs did believe the
same comment initially; dr1b's verification pass is what broke the tie, and it reached
the right band by a partly wrong route. The correct statement of the work is: one
frontend constant (`MAX_FILE_SIZE_MB`) feeds the hint bullet, `data-max-file-size`, the
hapi `maxBytes`, the server-side guard and the oversize message; the backend is already
sized for 50 MiB and ignores what the frontend sends it; the CDP ingress cap is a
pre-flight question for the platform team, not a dependency to schedule behind.

The scheduling consequence is real: dr1 pushes this behind a backend change that does
not exist. dr1b's `difference` slot keeps the ingress caveat as a check to make in the
same piece of work, which is the right place for it.

### The part-filled add form on Save and continue — both runs found it, both are exact

dr1 inc-042 and dr1b inc-039 make the same structural claim, and it holds.

Frontend, `controller.js:255-279`: the post handler branches on `retryRemoveUploadId`,
then `action === 'add'`, then `isRemoveAction(action)`, then falls through to
`loadPage` → the scan-settling check → `h.redirect(await kit.nextTarget(...))`. Nothing
on that path reads `accompanyingDocumentReference`, `accompanyingDocumentDateOfIssue` or
the file part. A part-filled row is discarded with no error and no record.

Prototype, `app/routes.js:10173-10193`:

```js
if (action === 'continue') {
  // Soft validation: uploads are optional, but once a document type is chosen
  // all document fields must be completed before continuing.
  if (getDocumentTypeValues(req.session.data).includes(values.documentType)) {
    const validation = validateUploadDocument(values, req.session.data)
    if (validation.errorList.length) { ... return renderUploadDocumentsPage(...) }
    addUploadedDocument(req.session.data, values)
  }
  ...
}
```

The captures corroborate the gate. `dr1-upload-documents-error.html` (Save and add
another, blank form) shows **four** errors — "Enter a document reference", "Select a
document type", "Enter a date of issue", "Upload a document".
`dr1-upload-documents-continue-error.html` (Save and continue, type chosen) shows
**three** — the same list minus "Select a document type". Exactly what the code predicts.

dr1 states it as "DR1 uses the document type as the has-the-user-started signal"; dr1b
as "DR1 uses the document type as the trigger for this". Same reading. dr1b adds a scope
note that the frontend's other two exits also discard the form but so does DR1's own
"Save and return to overview", so they should not be changed — a correct and useful
guard that dr1 does not make. dr1 adds that nothing on the page distinguishes the two
buttons, which is the link to its inc-047 that dr1b lacks.

**Neither is wrong. dr1b's is slightly better scoped; dr1's is slightly better joined
up.** This is not the leak-affected subject — nothing in `PROVENANCE.md` touches
`documents` — so the agreement counts as two independent confirmations.

## Copy spot-check — neither run tidied a string

Every quoted string in both runs was checked character by character against the rendered
DOM or, where a string never reaches the DOM, against the cited source line.

**Prototype strings, from `dr1-upload-documents.html` and the error captures:**

| String | Where | Both runs |
|---|---|---|
| `Attachment` | `:501` label | exact |
| `Your file must be:` | `:505` hint | exact (both sides use it) |
| `files that are smaller than 50MB` | `<li>` | exact, no space before MB |
| `PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX` | `<li>` | exact |
| `up to a maximum of 15 files` | `<li>` | exact |
| `ZIP files are not allowed for security reasons` | `<li>` | exact |
| `File upload` | `:311` `<h2>` | dr1 only, exact |
| `Select one` | `:347` option | exact |
| all 13 type labels | `:351-405` | exact and in order, both runs |
| `No file chosen` / `Choose file` / `or drop file` | `:515-518` | exact |
| `itahc-certificate.pdf` | file-chosen capture, `aria-live` region | exact |
| `Scanning for virus` / `Check completed` | populated + scanning captures | exact |
| `Virus check status for ITAHC-2026-0001` | populated capture | dr1b exact; dr1 wrote it as the template form `Virus check status for {document reference}` and labelled it as such |
| `Enter a document reference` / `Select a document type` / `Enter a date of issue` / `Upload a document` | error capture | exact |
| `You can upload a maximum of 15 files` | limit-error capture | exact |
| `Enter a real date` | `routes.js:9146` (never captured) | exact in source |
| intro paragraph, 55 words | `dr1-upload-documents.html` | exact, both runs |
| `Other documents you may need to attach include:` | | exact |
| `import licences or authorisations` / `commercial documents or invoices` | `<li>` | exact |
| `Check which additional documents you must upload` | details summary | exact |
| `Exporter's declaration that they are fit to travel` / `Bluetongue declaration GBHC172` / `RM39 licence and supplementary health certificate` | table cells | **dr1b exact; dr1 paraphrased** (see below) |

**Frontend strings, from `fe-documents-empty.html`, `fe-documents-populated.html` and
`copy/copy.en.js`:**

| String | Where | Both runs |
|---|---|---|
| `Upload a file` | `copy.en.js:12`, DOM | exact |
| `Your file must be:` / `smaller than 10 MB` | DOM bullets | exact |
| `a PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX` | DOM `<li>` | exact |
| `The selected file must be smaller than 10 MB` | `data-oversize-error` in DOM | exact |
| `data-max-file-size="10000000"` | DOM | exact |
| `Enter the date of issue` / `Enter a real date of issue` / `Select a file to upload` / `Enter a document reference` | `copy.en.js:66-69` | exact |
| `You can add a maximum of 10 documents` | `copy.en.js:73` template | exact, both runs render the template with 10 |
| `Safe` / `Checking` / `Virus found` / `Unknown` | `copy.en.js:53-56` + `data-scan-copy` in DOM | exact |
| `Still checking some documents. Refresh again in a moment.` | DOM | dr1b only, exact |
| `You cannot continue until all documents have been scanned or removed` | `copy.en.js:70-71` | dr1b only, exact |
| `Choose File` / `No file chosen` | screenshot (native widget, not in DOM) | exact — capital F in "Choose File" preserved by both, and it is the browser's, distinct from the prototype's lowercase `Choose file` |
| `Save and add another` / `Continue` / `Save and return to hub` / `Cancel and return to hub` | DOM | exact |

**No string in either run has been silently corrected.** The one that would have been
easiest to tidy — the prototype's `50MB` with no space against the frontend's `10 MB`
with one — is preserved verbatim by both, and dr1 inc-046 even calls the inconsistency
out as something to settle. The browser's capital-F `Choose File` against the
prototype's lowercase `Choose file` is likewise preserved on both sides by both runs.

Two imprecisions, neither a tidy:

1. **dr1 inc-048** quotes `"Check the documents you need on GOV.UK (opens in a new tab)"`
   as a single string. The DOM is
   `<a ...>Check the documents you need</a> on GOV.UK (opens in a new tab).` — the link
   text is only the first five words, and the sentence ends in a full stop the quote
   drops. It is a faithful concatenation of the visible text, not an alteration, but it
   is presented as one string when it is a link plus trailing prose. dr1b inc-044 gets
   this right: *"a 'Check the documents you need' link to GOV.UK opening in a new tab"*.
2. **dr1 inc-048** renders the three details-table rows as running prose — *"rodents
   imported for research purposes need an RM39 licence and a supplementary health
   certificate"* — where the cell reads `RM39 licence and supplementary health
   certificate`. It is prose about the table, not a quotation of it, so it is not a
   defect, but a builder copying from dr1 would type the wrong string. dr1b quotes all
   three cells.

## Citation accuracy

Both runs' line citations resolve. Sampled and confirmed exact:
`copy.en.js:11-16` (file block), `:26-42` (types), `:52-57` (scanTags), `:63-81`
(errors), `:27` (`ITAHC: 'ITAHC'`), `:39` (`HEALTH_CERTIFICATE`);
`obligations/sections/documents.js:25` (`maxEntries: 10`) and `:30-35`
(`accompanyingDocumentType` … `status: 'mandatory'`);
`controller.js:255-279`; `upload-config.js:40-52`;
`app/routes.js:9025` (`MAX_UPLOADED_DOCUMENTS = 15`), `:9101-9155`
(`validateUploadDocument`), `:10173-10193` (the continue branch),
`:9077-9086` (`getUploadedDocumentsForDisplay` status tags);
`app/views/upload-documents.html:213-224` (status cell markup).

One difference in citation quality on the shared 15-cap subject: dr1 inc-043 cites both
the constant (`routes.js:9025`) and the enforcement (`:9103-9112`); dr1b inc-045 cites
only the requirements bullet in the view (`upload-documents.html:165-170`) in its
evidence field, though its prose does name `routes.js:9106-9113` in the verification
line. dr1's evidence pointer is the better one.

## Summary

- **dr1b wrong: 0. Overstated: 1** (inc-042's claim that the backend takes its ceiling
  from the frontend — the backend ignores the field and uses its own 50 MiB config).
  **Sound: 11.**
- **dr1b found that dr1 missed: 1** substantive (inc-046, the scan gate on Continue,
  `disputed`) — real, and dr1's one-clause dismissal of the same code is unsupported.
  Plus two details (the hidden per-row status label, the cap error's anchor target).
- **dr1 found that dr1b missed: 1** (inc-047, the bordered "File upload" card) — real,
  and it is the visual cause of the data-loss bug both runs found.
- **Contradictions: 1** — the file-size band. **dr1b is right; dr1's `needs-backend` is
  wrong**, both on the contract's definition of the band and on the backend's actual
  configuration.
- **Copy: clean on both sides.** Every quoted error message and scan-status tag in both
  runs matches the rendered DOM or the cited source character for character. Two
  presentational imprecisions in dr1 inc-048 (a link text quoted as a whole sentence; a
  table row paraphrased in prose), neither a correction of the source.
