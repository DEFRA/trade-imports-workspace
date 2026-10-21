# Live-animals document upload flow

End-to-end sequence for the accompanying-documents journey in
`trade-imports-animals-frontend` → CDP Uploader → `trade-imports-animals-backend`
→ S3.

The browser posts the file to the platform's `/upload-and-scan` bypass rather than
through the frontend, so no document passes through either service. The frontend
opens an upload session, the browser uploads to it, and the frontend takes the
document on when the browser is returned.

```mermaid
sequenceDiagram
    autonumber
    actor U as User (Browser)
    participant NX as nginx sidecar<br/>(CDP nginx-upstreams)
    participant FE as animals-frontend<br/>(Node/Hapi)
    participant BE as animals-backend<br/>(Java/Spring)
    participant CDP as cdp-uploader<br/>(DEFRA platform)
    participant S3 as S3 (documents bucket)
    participant DB as MongoDB<br/>(accompanying_documents)

    U->>NX: GET /documents
    NX->>FE: proxy (10M cap on /)
    FE->>FE: mint correlationId (UUID)
    FE->>CDP: POST /initiate<br/>{redirect: /documents?upload=correlationId,<br/>callback, s3Bucket, s3Path,<br/>maxFileSize 50MB, mimeTypes,<br/>metadata{correlationId}}
    CDP-->>FE: {uploadId, statusUrl}
    FE->>BE: POST /notifications/{journeyId}/document-uploads<br/>{uploadId, correlationId}
    BE->>DB: save AccompanyingDocument<br/>(PENDING, unclaimed, no details)
    BE-->>FE: 201
    FE-->>U: Render form; the Add button carries<br/>formaction=/upload-and-scan/{uploadId}

    Note over U,NX: Add submits the file; every other<br/>action posts to the page instead

    U->>NX: POST /upload-and-scan/{uploadId}<br/>(multipart: file + text fields)
    NX->>CDP: proxy direct (2304M cap on this path)
    CDP-->>U: 302 to /documents?upload=correlationId

    Note over CDP,S3: async antivirus scan

    U->>NX: GET /documents?upload=correlationId
    NX->>FE: proxy
    FE->>BE: GET /notifications/{journeyId}/document-uploads
    BE-->>FE: documents, each with its correlationId
    FE->>CDP: GET /status/{uploadId}
    CDP-->>FE: {uploadStatus, form{documentType, reference,<br/>dateOfIssue, file{filename, hasError, errorCode}}}

    alt file refused, a page rule broken, or at capacity
        FE-->>U: Re-render with the answers kept and the reason
    else taken on
        FE->>BE: POST /document-uploads/{uploadId}/claim<br/>{documentType, documentReference, dateOfIssue}
        BE->>DB: store the details, mark claimed
        FE->>FE: append the journey's documents entry
        FE-->>U: 302 to /documents (clean path)
    end

    CDP->>S3: PutObject (if clean)
    CDP->>BE: POST /document-uploads/pending/scan-results<br/>{metadata{correlationId}, form{file},<br/>numberOfRejectedFiles}
    BE->>DB: resolve by correlationId,<br/>set scanStatus + files (s3Key null if rejected)

    loop every 3s, up to 10 attempts
        U->>FE: GET /documents/status (client JS)
        FE->>BE: GET /document-uploads/{uploadId}
        BE-->>FE: {scanStatus, files}
        FE-->>U: update row (PENDING to COMPLETE or REJECTED)
    end

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

- **Two IDs, neither minted by the backend.** `uploadId` comes from cdp-uploader and
  keys every user-facing route; `correlationId` is minted by the frontend and rides
  in the cdp-uploader metadata so the scan callback can find the document. The
  callback body carries neither a document's details nor the `uploadId`, and the
  callback URL is fixed inside the `/initiate` request — before an `uploadId`
  exists — so the frontend is the only party holding both and has to register them.
- **Unclaimed uploads never reach an event.** A registered document stays unclaimed
  until the frontend claims it. `OutboxService` reads claimed `COMPLETE` documents
  only, so a clean scan on an upload the user walked away from does not ship on the
  next GBN-AG event. See
  `repos/trade-imports-animals-backend/docs/design-notes.md`.
- **Nothing is judged twice.** The page judges the submitted fields by its own rules
  when the browser returns, and sends only validated details on the claim.
  cdp-uploader judges the file — size and type — on receipt, and a refusal comes
  back as a form error rather than as a document row.
- **The size limit is stated and checked before the upload.**
  `features/documents/upload-config.js` owns the figure, feeding the page's hint,
  the browser's own check, and the `maxFileSize` cdp-uploader is asked to enforce.
- **The scan is asynchronous.** The browser is returned as soon as cdp-uploader has
  the bytes, so a row appears while the scan is still running. The client polls
  `/documents/status` every 3s (10 attempts); a user without JavaScript uses the
  manual refresh link.
- **REJECTED files have no `s3Key`.** The download route answers 404 rather than
  streaming a quarantined file (`DocumentService.findFile()`).
