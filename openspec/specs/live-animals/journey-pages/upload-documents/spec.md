# Upload Documents Page Specification

## Purpose

The accompanying documents attached to a notification — uploading, virus-scanning, viewing, removing, their durability once attached, and the condition under which the page itself can be opened. The page is titled "Upload documents"; whether it is offered at all and whether a journey opened out of context lands here are `live-animals/journey-flow`'s (REQ-FLOW-005, REQ-FLOW-008, REQ-FLOW-009), and every Overview row being linked with no blocked state is `live-animals/journey-pages/overview`'s (REQ-OVERVIEW-002).

## Requirements

### Requirement: The page states its upload constraints before anything is added
**ID**: REQ-DOCS-001
The system MUST tell the user, before they add anything, which file types are accepted and the maximum file size, and MUST show no table and no message in the File upload card when no documents have been added yet.

#### Scenario: The empty page states its constraints
**ID**: SCN-DOCS-001-A
- **GIVEN** the user opens the upload documents page on a notification with none added yet
- **WHEN** the page loads
- **THEN** it states the maximum file size as "files that are smaller than 50MB" and the accepted file types as "PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX"
- **AND** the File upload card shows no table and no message after its "Save and add another" button

#### Scenario: The limit stays stated once documents have been added
**ID**: SCN-DOCS-001-B
- **GIVEN** the user has added a document
- **WHEN** the page shows the saved document
- **THEN** the page still states the maximum number of files, as it did before anything was added

### Requirement: The page's back link follows where the user came from
**ID**: REQ-DOCS-002
The system MUST open the review page from the upload documents page's back link when the page was opened by changing an answer from the review, or whenever the notification is being amended however the page was opened, and MUST open Overview otherwise.

#### Scenario: The back link opens Overview for a draft opened from Overview
**ID**: SCN-DOCS-002-A
- **GIVEN** the user opens the upload documents page from Overview, on a draft that is not being amended
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the review when changing an answer from the review
**ID**: SCN-DOCS-002-B
- **GIVEN** the user opens the upload documents page by changing the uploaded documents from the review
- **WHEN** they follow the back link
- **THEN** the review is shown

#### Scenario: The back link opens the review while the notification is being amended, however the page was opened
**ID**: SCN-DOCS-002-C
- **GIVEN** the notification is being amended
- **WHEN** the user opens the upload documents page from Overview and follows the back link
- **THEN** the review is shown

#### Scenario: The back link still opens the review after the page refuses a part-filled document
**ID**: SCN-DOCS-002-D
- **GIVEN** the user opened the upload documents page by changing an answer from the review
- **WHEN** they try to add a document with only the reference filled in, and it is refused
- **THEN** the back link still opens the review
- **WHEN** they follow it
- **THEN** the review is shown

### Requirement: A notification can hold at most fifteen accompanying documents
**ID**: REQ-DOCS-003
The system MUST accept up to fifteen documents per notification and MUST reject a sixteenth with an error that links to the Attachment field and shows on that field, preserving the reference value entered, without discarding the fifteen already added.

#### Scenario: A fifteenth document is accepted and a sixteenth is rejected
**ID**: SCN-DOCS-003-A
- **GIVEN** a notification already has fourteen accompanying documents added
- **WHEN** the user adds a fifteenth document
- **THEN** it is accepted and the list shows fifteen documents
- **WHEN** the user then tries to add a sixteenth document
- **THEN** the error summary reads "You can upload a maximum of 15 files" and links to the Attachment field, the same message shows on that field, and the reference value entered is preserved
- **AND** the list still shows only the original fifteen documents

### Requirement: Each accompanying document has a maximum file size
**ID**: REQ-DOCS-004
The system MUST reject a document over the maximum file size, both at the point of picking a very large file and at the exact size boundary, without adding it to the notification, and MUST also reject an oversize file submitted without the client-side check having run, preserving the empty state. However the file is submitted, the user MUST be returned to the page with the same error explaining the file must be smaller than the maximum size.

#### Scenario: A file at exactly the size limit is accepted, one byte over is rejected
**ID**: SCN-DOCS-004-A
- **GIVEN** the user is adding a document
- **WHEN** they upload a file exactly at the maximum allowed size
- **THEN** it is accepted
- **WHEN** they then upload a file one byte over that size
- **THEN** an error explains the file must be smaller than the maximum size
- **AND** the oversize file is not added to the document list

#### Scenario: Picking a grossly oversize file is refused before any document is added
**ID**: SCN-DOCS-004-B
- **GIVEN** the user is adding a document to a notification with none yet added
- **WHEN** they pick a file well above the maximum allowed size
- **THEN** an error explains the file is too large
- **AND** no added-documents table is shown

#### Scenario: An oversize file submitted without the browser check running is still refused
**ID**: SCN-DOCS-004-C
- **GIVEN** the user is adding a document, and the browser's own size check has not run
- **WHEN** an oversize file is nonetheless submitted
- **THEN** it is refused, and the page comes back with the error explaining the file must be smaller than the maximum size
- **AND** an error links to and focuses the file field
- **AND** the notification still shows no documents added

### Requirement: Only supported file types can be uploaded
**ID**: REQ-DOCS-005
The system MUST reject a file of an unsupported type without adding it to the notification, linking to and focusing the file field while preserving the reference and date already entered.

#### Scenario: An unsupported file type is rejected
**ID**: SCN-DOCS-005-A
- **GIVEN** the user is adding a document to a notification with none yet added
- **WHEN** they upload a file of an unsupported type
- **THEN** an error is shown, linking to and focusing the file field
- **AND** the reference and date already entered are preserved
- **AND** no added-documents table is shown

### Requirement: The reference and date of issue are each required, and individually validated
**ID**: REQ-DOCS-006
The system MUST require a reference and a valid date of issue for each document. A reference MUST be made only of letters, numbers, spaces, hyphens, full stops and forward slashes, up to a maximum of one hundred characters; the system MUST reject one carrying any other character and MUST reject one over that length. The system MUST reject a date that is not a real date, and MUST link to and focus whichever field is at fault while preserving the other field's value.

#### Scenario: An empty reference links to and focuses the reference field, preserving the date
**ID**: SCN-DOCS-006-A
- **GIVEN** the user is adding a document with the date of issue filled in but no reference
- **WHEN** they try to add it
- **THEN** an error links to and focuses the reference field, which is empty
- **AND** the date of issue already entered is preserved

#### Scenario: A reference over the maximum length links to and focuses the reference field, preserving the value
**ID**: SCN-DOCS-006-B
- **GIVEN** the user enters a reference longer than the maximum allowed
- **WHEN** they try to add the document
- **THEN** an error reading "Document reference must be 100 characters or fewer" links to and focuses the reference field, which still holds the value typed
- **AND** the date of issue already entered is preserved

#### Scenario: An empty date of issue links to and focuses the date field, preserving the reference
**ID**: SCN-DOCS-006-C
- **GIVEN** the user is adding a document with the reference filled in but no date of issue
- **WHEN** they try to add it
- **THEN** an error links to and focuses the date field, which is empty
- **AND** the reference already entered is preserved

#### Scenario: An impossible date links to and focuses the date field, preserving what was typed
**ID**: SCN-DOCS-006-D
- **GIVEN** the user types a date of issue that is not a real date
- **WHEN** they try to add the document
- **THEN** an error links to and focuses the date field, which still holds what was typed
- **AND** the reference already entered is preserved

#### Scenario: No file chosen links to and focuses the file field, preserving the reference and date
**ID**: SCN-DOCS-006-E
- **GIVEN** the user has filled in the reference and date of issue but chosen no file
- **WHEN** they try to add the document
- **THEN** an error links to and focuses the file field
- **AND** the reference and date already entered are preserved

#### Scenario: A reference written in one of the shapes real documents carry is taken on
**ID**: SCN-DOCS-006-F
- **GIVEN** the user enters a reference written as an air waybill with a hyphen, a certificate with full stops, or an invoice with a space and a forward slash
- **WHEN** they add the document
- **THEN** it is taken on and held against the notification with that reference as typed

#### Scenario: A reference carrying a disallowed character is refused
**ID**: SCN-DOCS-006-G
- **GIVEN** the user enters a reference carrying a character other than a letter, number, space, hyphen, full stop or forward slash
- **WHEN** they try to add the document
- **THEN** an error reading "Document reference must only include letters, numbers, spaces, hyphens, full stops and forward slashes" is shown on the Document reference field
- **AND** no document is added to the notification

### Requirement: Every uploaded document is virus-scanned before it can be used
**ID**: REQ-DOCS-007
The system MUST show a document as "Scanning for virus" immediately after upload, and MUST resolve it to either "Check completed" with a way to view it, or a refusal with an error and no way to view it. A refused document MUST be shown as the reason the upload service gave ("Virus found", "Upload failed" or "Download failed"), say the same to assistive technology, and read "Rejected" for a reason the system has no wording for.

#### Scenario: A clean upload becomes checked and viewable
**ID**: SCN-DOCS-007-A
- **GIVEN** the user has uploaded a document
- **WHEN** it is first added
- **THEN** its row shows "Scanning for virus", and there is no way to view it yet
- **WHEN** the virus scan completes and the file is clean
- **THEN** its row shows "Check completed" and a link to view the file appears

#### Scenario: A rejected upload is flagged and blocked, naming the reason
**ID**: SCN-DOCS-007-B
- **GIVEN** the user has uploaded a document
- **WHEN** it is first added
- **THEN** its row shows "Scanning for virus"
- **WHEN** the scan completes and refuses the file for carrying a virus
- **THEN** its row shows "Virus found", an error explains the file cannot be used and must be removed, and there is no way to view the file
- **AND** assistive technology is told the file contains a virus

#### Scenario: A refusal the system has no wording for is not named wrongly
**ID**: SCN-DOCS-007-C
- **GIVEN** the user has uploaded a document
- **WHEN** the scan refuses the file for a reason the system has no wording for
- **THEN** its row shows "Rejected" rather than naming a cause, and there is no way to view the file

### Requirement: The user cannot continue while a document has been rejected
**ID**: REQ-DOCS-008
The system MUST let the user continue past the page while a document's scan is still "Scanning for virus", MUST refuse to let them continue while any document has come back "Rejected", showing an error explaining why, and MUST let them continue once the rejected document has been removed.

#### Scenario: Continuing is not blocked while a scan is still running
**ID**: SCN-DOCS-008-A
- **GIVEN** a document on the page is still "Scanning for virus"
- **WHEN** the user tries to continue
- **THEN** continuing takes them onward
- **WHEN** they come back to the page
- **THEN** the document is still listed, and its row settles to "Check completed" once the scan finishes

#### Scenario: Continuing is blocked while a rejected document remains
**ID**: SCN-DOCS-008-B
- **GIVEN** a document on the page has come back "Rejected"
- **WHEN** the user tries to continue
- **THEN** the same rejection error is shown again
- **WHEN** they remove the rejected document
- **THEN** continuing takes them onward

### Requirement: Each document's scan status updates independently, and completion is announced
**ID**: REQ-DOCS-009
The system MUST update a document's row once its own scan resolves without waiting for or affecting any other document still being scanned, and MUST announce a scan's completion for assistive technology.

#### Scenario: One document settles while another stays pending
**ID**: SCN-DOCS-009-A
- **GIVEN** two documents have been uploaded and both are still "Scanning for virus"
- **WHEN** one of them resolves to "Check completed"
- **THEN** its row updates to "Check completed" with a link to view it, and completion is announced
- **AND** the other document's row still shows "Scanning for virus"

### Requirement: Scan progress can be followed without client-side JavaScript
**ID**: REQ-DOCS-010
The system MUST let a user without JavaScript manually refresh a document's scan status until it resolves, rather than requiring an automatic client-side update.

#### Scenario: A manual refresh reflects scan progress until the file is checked
**ID**: SCN-DOCS-010-A
- **GIVEN** a user without JavaScript has uploaded a document that is still "Scanning for virus"
- **WHEN** they use the manual refresh option, repeating it if the scan has not yet finished
- **THEN** each refresh reflects the current scan status
- **AND** once the scan completes, the row shows "Check completed", the refresh option is no longer shown, and a link to view the file appears

### Requirement: An uploaded document can be viewed and removed
**ID**: REQ-DOCS-011
The system MUST let the user download exactly the file they uploaded once it is marked Safe, served with protections against the browser reinterpreting its content type, and MUST let them remove a document from the notification.

#### Scenario: Viewing a Safe document downloads exactly the uploaded file
**ID**: SCN-DOCS-011-A
- **GIVEN** a document has been uploaded and scanned Safe
- **WHEN** the user views the document
- **THEN** the file downloaded is byte-for-byte identical to the one uploaded
- **AND** the response's content type matches the file and is served with the browser instructed not to reinterpret it

#### Scenario: Removing a document takes it off the notification
**ID**: SCN-DOCS-011-B
- **GIVEN** a notification has one accompanying document
- **WHEN** the user removes that document
- **THEN** it no longer appears in the document list
- **AND** the File upload card shows no table and no message after its "Save and add another" button

### Requirement: An attached document keeps its exact file and survives a reload
**ID**: REQ-DOCS-012
The system MUST keep an uploaded document's file and details once it has been scanned safe, and MUST still show it after a fresh page load.

#### Scenario: An uploaded document is kept intact and still listed after a reload
**ID**: SCN-DOCS-012-A
- **GIVEN** the user has uploaded a document and it has been scanned safe
- **WHEN** that document is looked up as the system holds it
- **THEN** it carries the same reference, the uploaded file's exact content and type, and a completed scan status
- **WHEN** the user reloads the accompanying-documents page
- **THEN** the document is still shown in the list

### Requirement: Each document also asks for its type, chosen from a fixed list, positioned between the reference and the date of issue
**ID**: REQ-DOCS-013
The system MUST ask for a document type as a mandatory answer, offering a placeholder plus the thirteen document types named in the scenario below, and MUST place this question between the reference and the date of issue. The chosen type MUST be shown on the document's saved row.

#### Scenario: The type question offers thirteen types behind a placeholder, in position
**ID**: SCN-DOCS-013-A
- **GIVEN** the user is adding a document
- **WHEN** the page loads
- **THEN** a document type field is shown between the reference and the date of issue, offering a placeholder and then: Intra Trade Animal Health Certificate (ITAHC), Veterinary health certificate, Air waybill, Import permit, Letter of authority (Directive 2008/61/EC), Commercial invoice, Sea waybill, Rail waybill, Bill of lading, Catch certificate, Laboratory sampling results for aflatoxin (Reg 2019/1793), Journey log, Other

#### Scenario: Leaving the type on its placeholder is rejected
**ID**: SCN-DOCS-013-B
- **GIVEN** the user has filled in every other field but left the document type on its placeholder
- **WHEN** they try to add the document
- **THEN** an error links to and focuses the type field, preserving every other answer given

#### Scenario: The saved row reports the chosen type
**ID**: SCN-DOCS-013-C
- **GIVEN** the user has added a document, choosing a document type
- **WHEN** the saved row is shown
- **THEN** it reports the type chosen, regardless of the uploaded file's own name

#### Scenario: A document recorded as Health certificate is listed with that type while the type question offers thirteen
**ID**: SCN-DOCS-013-D
- **GIVEN** a notification holds a document recorded as Health certificate
- **WHEN** the upload documents page opens
- **THEN** that document is listed with Health certificate as its type
- **AND** the type question offers thirteen document types

### Requirement: The file can be chosen from a drop zone, not only the browser's own file picker
**ID**: REQ-DOCS-014
The system MUST offer a drop zone carrying the service's own choose-file button and a drop instruction, MUST accept a file dropped onto the zone and name it in a status announced to assistive technology, and MUST draw a file-required validation failure on the zone itself.

#### Scenario: The drop zone offers a choose-file button and accepts a dropped file
**ID**: SCN-DOCS-014-A
- **GIVEN** the user is adding a document
- **WHEN** they drop a file onto the drop zone rather than using the choose-file button
- **THEN** the zone names the dropped file in a status region
- **AND** that file is what the form submits

#### Scenario: No file chosen draws its error on the drop zone itself
**ID**: SCN-DOCS-014-B
- **GIVEN** the user tries to add a document without choosing a file
- **WHEN** the error is shown
- **THEN** the drop zone itself carries the error state, not a separate control

### Requirement: The page tells the user what to attach, above the upload form
**ID**: REQ-DOCS-015
The system MUST show guidance above the upload form saying that an ITAHC must be attached if the consignment requires one, that it can be added later, that documents should be uploaded before the consignment arrives at the UK port, and that documents must be in English with all pages uploaded, followed by the other documents the user may need. The system MUST keep a table of additional documents by type of consignment behind a closed expander, with a GOV.UK guidance link that opens in a new tab.

#### Scenario: The guidance sits above the form
**ID**: SCN-DOCS-015-A
- **GIVEN** the user opens the upload documents page
- **WHEN** the page loads
- **THEN** the guidance on attaching an ITAHC and the other documents they may need is shown outside the form and before it

#### Scenario: The additional documents table is behind a closed expander
**ID**: SCN-DOCS-015-B
- **GIVEN** the user opens the upload documents page
- **WHEN** the page loads
- **THEN** the additional documents table is hidden behind an expander headed "Check which additional documents you must upload"
- **WHEN** the user opens the expander
- **THEN** a table lists, for each type of consignment, the documents needed

#### Scenario: The guidance links out to GOV.UK in a new tab
**ID**: SCN-DOCS-015-C
- **GIVEN** the user has opened the additional documents expander
- **WHEN** they look at its link to the GOV.UK guidance
- **THEN** it opens in a new tab

#### Scenario: The additional documents table names the documents each consignment needs
**ID**: SCN-DOCS-015-D
- **GIVEN** the user has opened the additional documents expander
- **WHEN** they read the table
- **THEN** "Animals that do not need a health certificate" needs "Exporter's declaration that they are fit to travel"
- **AND** "Rodents imported for research purposes" needs "RM39 licence and supplementary health certificate"

### Requirement: Every save button keeps a document the user has filled in, says what is missing from one half filled in, adds a complete one and lets an untouched form leave
**ID**: REQ-DOCS-016
The system MUST keep a document the user has filled in, whichever save button they select. A document is started by any of its reference, type, date of issue or a chosen file. One not complete MUST keep the user on the page with an error for each detail not given, what they typed kept and nothing added. A complete one MUST be added by every save button. An untouched form MUST let the user leave.

#### Scenario: Save and return to overview with every detail filled in adds the document and shows Overview
**ID**: SCN-DOCS-016-A
- **GIVEN** the user has filled in the reference, document type, date of issue and chosen a file
- **WHEN** they save and return to overview
- **THEN** Overview is shown
- **AND** reopening Upload documents lists the document, its row showing the type chosen

#### Scenario: Save and continue with only the document type says what is missing
**ID**: SCN-DOCS-016-B
- **GIVEN** the user has chosen a document type and filled in nothing else
- **WHEN** they save and continue
- **THEN** errors say the reference and the date of issue are required
- **AND** an error on the file says "Upload a document"
- **AND** the user stays on the upload documents page

#### Scenario: Save and continue with an untouched form leaves the page
**ID**: SCN-DOCS-016-C
- **GIVEN** the user has added nothing and filled in nothing
- **WHEN** they save and continue
- **THEN** Overview is shown

#### Scenario: Save and return to overview with a part-filled document is refused
**ID**: SCN-DOCS-016-D
- **GIVEN** the user has filled in only the reference
- **WHEN** they save and return to overview
- **THEN** they stay on the upload documents page, with an error for each of the document type, the date of issue and the file
- **AND** the reference they typed is still on the form
- **AND** no document is added

#### Scenario: A reference, date of issue and attachment with no document type is refused on save and continue
**ID**: SCN-DOCS-016-E
- **GIVEN** the user has filled in the reference and the date of issue, chosen a file and left the document type unchosen
- **WHEN** they save and continue
- **THEN** the page shows "Select a document type"
- **AND** no document is added

#### Scenario: The same rules hold without JavaScript
**ID**: SCN-DOCS-016-F
- **GIVEN** the user has no JavaScript
- **WHEN** they save and return to overview with every detail filled in
- **THEN** Overview is shown and reopening Upload documents lists the document
- **WHEN** they save and return to overview with only the reference filled in
- **THEN** they stay on the upload documents page with an error for each detail not given, and no document is added

#### Scenario: A complete document saved with Save and continue is added and held while it is scanned
**ID**: SCN-DOCS-016-G
- **GIVEN** the user has filled in the reference, document type, date of issue and chosen a file
- **WHEN** they save and continue
- **THEN** the document is added and listed as "Scanning for virus"
- **AND** they stay on the upload documents page, which shows "You cannot continue until all documents have been scanned or removed"
- **AND** the same holds while amending for "Save and return" and "Save and continue"

#### Scenario: While amending, an untouched form leaves by the button chosen
**ID**: SCN-DOCS-016-H
- **GIVEN** a notification being amended, with the upload documents page opened from a Change link and nothing filled in
- **WHEN** the user selects "Save and return"
- **THEN** the review is shown
- **WHEN** they instead select "Save and continue"
- **THEN** the page after upload documents is shown, not the review

#### Scenario: Save and add another with a part-filled document is refused
**ID**: SCN-DOCS-016-I
- **GIVEN** the user has filled in some but not all of the reference, document type, date of issue and file
- **WHEN** they select "Save and add another"
- **THEN** they stay on the upload documents page, with an error for each detail not given
- **AND** the values they typed are still on the form
- **AND** no document is added

### Requirement: Two tabs on one notification each keep their own upload
**ID**: REQ-DOCS-017
The system MUST let a user with the same notification open in two tabs upload a document from each, adding both to the notification with their own files, rather than one tab's upload replacing the other's.

#### Scenario: Each of two tabs adds its own document
**ID**: SCN-DOCS-017-A
- **GIVEN** the user has the upload documents page open in two tabs on one notification
- **WHEN** they add a different document from each tab
- **THEN** each tab's row resolves to "Check completed"
- **AND** reloading the page lists both documents
- **AND** viewing each document serves back the file its own tab uploaded

### Requirement: The added-documents table is headed and keeps each row's actions at its end
**ID**: REQ-DOCS-018
The system MUST head the added-documents table "Document reference", "Document type", "Date of issue", "Status" and a visually hidden "Action", and MUST place each row's "View file" and "Remove" at the right-hand end of the row.

#### Scenario: The table shows five headings with each row's actions at its end
**ID**: SCN-DOCS-018-A
- **GIVEN** the user has added a document and its scan has completed
- **WHEN** the page shows the added-documents table
- **THEN** its column headings are "Document reference", "Document type", "Date of issue", "Status" and a visually hidden "Action"
- **AND** the row's "View file" and "Remove" sit at the right-hand end of the row

### Requirement: The document reference has no hint and the date of issue hints an example date
**ID**: REQ-DOCS-019
The system MUST ask for the document reference with no hint, and MUST hint the date of issue with an example date.

#### Scenario: The reference carries no hint and the date of issue carries an example
**ID**: SCN-DOCS-019-A
- **GIVEN** the user opens the upload documents page
- **WHEN** the page loads
- **THEN** the Document reference field has no hint
- **AND** the hint under the Date of issue field reads "For example, 27/3/2026"

### Requirement: The page can be opened as soon as the origin of the import is answered
**ID**: REQ-DOCS-020
The system MUST offer and open the upload documents page with nothing beyond the origin of the import answered, and MUST ask nothing of what the trader is importing or of any later part of the notification before showing it.

#### Scenario: Reaching the page from Overview with only the origin answered
**ID**: SCN-DOCS-020-A
- **GIVEN** a new notification with only the origin of the import answered
- **WHEN** the user follows Overview's "Upload documents" row
- **THEN** the page titled "Upload documents" is shown

#### Scenario: Opening the page with the origin and what they are importing answered
**ID**: SCN-DOCS-020-B
- **GIVEN** a new notification with the origin of the import and what they are importing answered, and nothing else
- **WHEN** the user opens the upload documents page
- **THEN** the page titled "Upload documents" is shown
