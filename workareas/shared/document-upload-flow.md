# Live-animals document upload flow

End-to-end sequence for the accompanying-documents journey in
`trade-imports-animals-frontend` → `trade-imports-animals-backend`
→ CDP Uploader → S3.

```mermaid
sequenceDiagram
    autonumber
    actor U as User (Browser)
    participant FE as animals-frontend<br/>(Node/Hapi)
    participant BE as animals-backend<br/>(Java/Spring)
    participant CDP as cdp-uploader<br/>(DEFRA platform)
    participant S3 as S3 (documents bucket)
    participant DB as MongoDB<br/>(accompanying_documents)

    U->>FE: GET /documents (form page)
    FE-->>U: Render upload form (multipart, 10MB cap)

    U->>FE: POST /documents<br/>(file + reference + dateOfIssue)
    Note over FE: Validate: type<br/>(PDF/DOC/JPG/PNG/XLS),<br/>size ≤10MB, metadata

    FE->>BE: POST /notifications/{journeyId}/document-uploads<br/>{documentType, reference, date, maxSize, mimeTypes}
    BE->>BE: mint correlationId (UUID)
    BE->>CDP: POST /initiate<br/>{redirect, callback, s3Bucket, s3Path,<br/>maxFileSize, mimeTypes, metadata{correlationId}}
    CDP-->>BE: {uploadId, uploadUrl}
    BE->>DB: save AccompanyingDocument<br/>(scanStatus=PENDING)
    BE-->>FE: 201 {uploadId, uploadUrl}

    FE->>BE: POST /document-uploads/{uploadId}/file<br/>(multipart, streamed)
    BE->>CDP: POST /upload-and-scan/{uploadId}<br/>(streamed via ResourceHttpMessageConverter)
    CDP-->>BE: 202 Accepted
    BE-->>FE: 202 Accepted
    FE-->>U: 302 → results page (polling UI)

    Note over CDP,S3: async antivirus scan
    CDP->>S3: PutObject (if clean)

    CDP->>BE: POST /document-uploads/pending/scan-results<br/>{correlationId, scanStatus, files[{s3Key, filename,…}]}
    BE->>DB: resolve by correlationId,<br/>update scanStatus + files (s3Key null if rejected)

    loop every 3s, up to 10 attempts
        U->>FE: GET /documents/status (client JS)
        FE->>BE: GET /document-uploads/{uploadId}
        BE->>DB: findByUploadId
        BE-->>FE: {scanStatus}
        FE-->>U: update row (PENDING → COMPLETE/REJECTED)
    end

    Note over U,FE: on settled: reload page to render final state

    opt Download later
        U->>FE: GET /documents/{uploadId}/file
        FE->>BE: GET /document-uploads/{uploadId}/file
        BE->>DB: lookup s3Key (404 if REJECTED)
        BE->>S3: GetObject (streamed)
        S3-->>BE: bytes
        BE-->>FE: stream
        FE-->>U: stream
    end

    opt Remove
        U->>FE: DELETE (via POST)
        FE->>BE: DELETE /document-uploads/{uploadId}
        BE->>DB: delete AccompanyingDocument
    end
```

## Key details

- **Two IDs.** `uploadId` (minted by cdp-uploader, used for all user-facing
  routes) and `correlationId` (minted by the backend, embedded in cdp
  metadata so the async scan callback can find the document even before
  the uploadId is fully persisted). See `DocumentService.initiate()`
  (`repos/trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentService.java:79-106`)
  and `handleScanResult()` (`:150-159`).
- **Streaming, not buffering.** Both frontend→backend and backend→cdp-uploader
  legs stream the multipart body — Hapi has `payload.output: 'stream'`
  on the route
  (`repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/documents/controller.js:308-318`),
  and the backend uses `ResourceHttpMessageConverter` in
  `CdpUploaderClient.uploadFile()`
  (`repos/trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderClient.java:95-116`)
  so a 10MB file never sits in the JVM heap.
- **Scan is fully asynchronous.** The `/file` POST returns 202
  immediately; final status arrives via the `scan-results` callback.
  Frontend polls `/documents/status` every 3s (10 attempts max) — see
  `.../documents/client/scan-status/poll.js` and `scan-poll.js`.
- **REJECTED files have no `s3Key`.** The download route returns 404
  rather than streaming a quarantined file
  (`DocumentService.findFile()` `:220-232`).
