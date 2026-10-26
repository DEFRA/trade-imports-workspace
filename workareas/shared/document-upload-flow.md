# Live-animals document upload flow

End-to-end sequence for the accompanying-documents journey. On the way in the
file travels browser → nginx sidecar → CDP Uploader → S3, while
`trade-imports-animals-backend` takes only the calls *about* it: the register,
the claim and the scan result.

`trade-imports-animals-frontend` opens an upload session, the browser posts the
file straight to the platform's `/upload-and-scan` bypass rather than through
the frontend, and the frontend takes the document on when the browser is
returned — so no document's bytes reach either service on the way in. A
download goes the other way and does pass through both: the backend reads the
file from S3 and streams it through the frontend to the browser.

`{docs}` in the diagram stands for the frontend's documents route,
`/notifications/{journeyId}/accompanying-documents` — `pageRoutePath` in
`repos/trade-imports-animals-frontend/src/server/app/shared/paths.js` applied to
`documentsPage.slug`. Spelling it out on every arrow makes the diagram
unreadable; every other path below is the literal route.

```mermaid
sequenceDiagram
    autonumber
    actor U as User (Browser)
    participant NX as nginx sidecar<br/>(CDP nginx-upstreams)
    participant FE as animals-frontend<br/>(Node/Hapi)
    participant BE as animals-backend<br/>(Java/Spring)
    participant CDP as cdp-uploader<br/>(DEFRA platform)
    participant S3 as S3 (documents bucket)
    participant DB as MongoDB<br/>(document_upload_sessions,<br/>accompanying_documents)

    U->>NX: GET {docs}
    NX->>FE: proxy (10M cap on /)
    FE->>FE: mint correlationId (UUID)
    FE->>CDP: POST /initiate<br/>{redirect: {docs}?upload=correlationId,<br/>callback, s3Bucket, s3Path,<br/>maxFileSize 50MB, mimeTypes,<br/>metadata{correlationId}}
    CDP-->>FE: {uploadId, statusUrl}
    FE->>BE: POST /notifications/{journeyId}/document-uploads<br/>{uploadId, correlationId}
    BE->>DB: save UploadSession<br/>(expires after 24h; no document yet)
    BE-->>FE: 201
    FE-->>U: Render form; the Add button carries<br/>formaction=/upload-and-scan/{uploadId}

    Note over U,NX: Add submits the file; every other<br/>action posts to the page instead

    U->>NX: POST /upload-and-scan/{uploadId}<br/>(multipart: file + text fields)
    NX->>CDP: proxy direct (2304M cap on this path)
    CDP-->>U: 302 to {docs}?upload=correlationId

    Note over CDP,S3: async antivirus scan

    U->>NX: GET {docs}?upload=correlationId
    NX->>FE: proxy
    FE->>BE: GET /notifications/{journeyId}/document-upload-sessions/{correlationId}
    BE-->>FE: the session, or 404 if this notification never opened it
    FE->>CDP: GET /status/{uploadId}
    CDP-->>FE: {uploadStatus, form{documentType, reference,<br/>dateOfIssue, file{filename, hasError, errorCode}}}

    alt file refused, a page rule broken, or at capacity
        FE-->>U: Re-render with the answers kept and the reason
    else taken on
        FE->>BE: POST /document-uploads/{uploadId}/claim<br/>{documentType, documentReference, dateOfIssue}
        BE->>DB: write the AccompanyingDocument<br/>(created here unless the scan got in first),<br/>store the details, mark claimed
        FE->>FE: append the journey's documents entry
        FE-->>U: 302 to {docs} (clean path)
    end

    CDP->>S3: PutObject (if clean)
    CDP->>BE: POST /document-uploads/pending/scan-results<br/>{metadata{correlationId}, form{file},<br/>numberOfRejectedFiles}
    BE->>DB: resolve the session by correlationId,<br/>write the document if the claim has not yet,<br/>set scanStatus + files (s3Key null if rejected)

    loop every 3s, up to 10 attempts
        U->>FE: GET {docs}/status (client JS)
        FE->>BE: GET /document-uploads/{uploadId}
        BE-->>FE: {scanStatus, files}
        FE-->>U: update row (PENDING to COMPLETE or REJECTED)
    end

    opt Download later
        U->>FE: GET {docs}/{uploadId}/file
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

This file owns the cross-service explanation of the flow: who mints which id,
why a session is not a document, why the bytes bypass both services, and the
poll. A service repo's own `docs/` and its code carry only what is true of that
repo alone and link here for the rest, so one copy has to be re-checked when the
flow moves.

- **Two IDs, neither minted by the backend.** `uploadId` comes from cdp-uploader and
  keys every user-facing route; `correlationId` is minted by the frontend and rides
  in the cdp-uploader metadata so the scan callback can find its notification. The
  callback body carries neither a document's details nor the `uploadId`, and the
  callback URL is fixed inside the `/initiate` request — before an `uploadId`
  exists — so the frontend is the only party holding both and has to register them.
- **A session is not a document.** The page opens a session every time it is
  painted, so a trader who loads, reloads and returns to it opens several; writing a
  document then would leave the notification holding one per page view. The document
  is written by whichever of the claim and the scan callback arrives first — both
  mean a file genuinely exists — and the second adds to it rather than starting
  another. Sessions nobody uploads through expire a day after they are opened.
- **The handle alone proves nothing.** `correlationId` comes back from the browser,
  so looking a session up is scoped to its notification and cannot reach one opened
  elsewhere.
- **Unclaimed uploads never reach an event.** A document the scan callback created
  stays unclaimed until the frontend claims it. `OutboxService` reads claimed
  `COMPLETE` documents only, so a clean scan on an upload the user walked away from
  does not ship on the next GBN-AG event. See
  `repos/trade-imports-animals-backend/docs/design-notes.md`.
- **The page owns the field rules, cdp-uploader owns the file rules.** The page
  judges the submitted fields by its own rules when the browser returns, and sends
  only validated details on the claim. cdp-uploader judges the file — size and
  type — on receipt, and a refusal comes back as a form error rather than as a
  document row. Each set gets a deliberate second pass by the party that cannot
  take the first on trust: the browser's own check refuses an oversize file before
  it is ever posted, and the backend re-validates `documentType`,
  `documentReference` and `dateOfIssue` on `ClaimUploadRequest`.
- **The size limit is stated and checked before the upload.**
  `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/documents/upload-config.js`
  owns the figure, feeding the page's hint, the browser's own check, and the
  `maxFileSize` cdp-uploader is asked to enforce.
- **The scan is asynchronous.** The browser is returned as soon as cdp-uploader has
  the bytes, so a row appears while the scan is still running. The client polls
  `/notifications/{journeyId}/accompanying-documents/status` every 3s (10
  attempts); a user without JavaScript uses the manual refresh link.
- **REJECTED files have no `s3Key`.** The download route answers 404 rather than
  streaming a quarantined file (`DocumentService.findFile()`).
