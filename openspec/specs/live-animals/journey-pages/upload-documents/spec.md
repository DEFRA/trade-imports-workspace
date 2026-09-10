# Upload Documents Page Specification

## Purpose

The accompanying documents attached to a notification — uploading, virus-scanning, viewing, removing, and their durability once attached. The page is titled "Upload documents".

## Requirements

### Requirement: The page states its upload constraints and shows an empty state before anything is added
**ID**: REQ-DOCS-001
The system MUST tell the user, before they add anything, which file types are accepted and the maximum file size, and MUST show an empty-state message when no documents have been added yet.

#### Scenario: The empty page states its constraints
**ID**: SCN-DOCS-001-A
- **GIVEN** the user opens the upload documents page on a notification with none added yet
- **WHEN** the page loads
- **THEN** it states the accepted file types and the maximum file size, and shows a message that no documents have been added

### Requirement: The page offers a route back to Overview
**ID**: REQ-DOCS-002
The system MUST offer a back link from the upload documents page that returns the user to Overview.

#### Scenario: The back link opens Overview
**ID**: SCN-DOCS-002-A
- **GIVEN** the user is on the upload documents page
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: A notification can hold at most fifteen accompanying documents
**ID**: REQ-DOCS-003
The system MUST accept up to fifteen documents per notification and MUST reject a sixteenth with an error that links to the documents-added list, preserving the reference value entered and returning the user to the list already added, without discarding the fifteen already added.

#### Scenario: A fifteenth document is accepted and a sixteenth is rejected
**ID**: SCN-DOCS-003-A
- **GIVEN** a notification already has fourteen accompanying documents added
- **WHEN** the user adds a fifteenth document
- **THEN** it is accepted and the list shows fifteen documents
- **WHEN** the user then tries to add a sixteenth document
- **THEN** an error explains that a maximum of fifteen documents can be added, links to the documents-added list, and preserves the reference value entered
- **AND** the list still shows only the original fifteen documents

### Requirement: Each accompanying document has a maximum file size
**ID**: REQ-DOCS-004
The system MUST reject a document over the maximum file size, both at the point of picking a very large file and at the exact size boundary, without adding it to the notification, and MUST also reject an oversize file submitted without the client-side check having run, preserving the empty state.

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
- **AND** the notification still shows no documents added

#### Scenario: An oversize file submitted without the browser check running is still refused
**ID**: SCN-DOCS-004-C
- **GIVEN** the user is adding a document, and the browser's own size check has not run
- **WHEN** an oversize file is nonetheless submitted
- **THEN** an error links to and focuses the file field
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
- **AND** the notification still shows no documents added

### Requirement: The reference and date of issue are each required, and individually validated
**ID**: REQ-DOCS-006
The system MUST require a reference and a valid date of issue for each document, MUST reject a reference over its maximum length, MUST reject a date that is not a real date, and MUST link to and focus whichever field is at fault while preserving the other field's value.

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
- **THEN** an error links to and focuses the reference field, which still holds the value typed
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

### Requirement: Every uploaded document is virus-scanned before it can be used
**ID**: REQ-DOCS-007
The system MUST show a document as "Scanning for virus" immediately after upload, and MUST resolve it to either "Check completed" with a way to view it, or "Virus found" with an error and no way to view it.

#### Scenario: A clean upload becomes checked and viewable
**ID**: SCN-DOCS-007-A
- **GIVEN** the user has uploaded a document
- **WHEN** it is first added
- **THEN** its row shows "Scanning for virus", and there is no way to view it yet
- **WHEN** the virus scan completes and the file is clean
- **THEN** its row shows "Check completed" and a link to view the file appears

#### Scenario: An infected upload is flagged and blocked
**ID**: SCN-DOCS-007-B
- **GIVEN** the user has uploaded a document
- **WHEN** it is first added
- **THEN** its row shows "Scanning for virus"
- **WHEN** the virus scan completes and finds a virus
- **THEN** its row shows "Virus found", an error explains the file contains a virus and must be removed, and there is no way to view the file

### Requirement: The user cannot continue while a document is still being scanned or is infected
**ID**: REQ-DOCS-008
The system MUST refuse to let the user continue past the page while any document's scan is still "Scanning for virus" or has come back "Virus found", showing an error explaining why, and MUST let them continue once every document has resolved to "Check completed" or the infected one has been removed.

#### Scenario: Continuing is blocked while a scan is still running
**ID**: SCN-DOCS-008-A
- **GIVEN** a document on the page is still "Scanning for virus"
- **WHEN** the user tries to continue
- **THEN** an error explains they cannot continue yet
- **WHEN** the scan resolves to "Check completed"
- **THEN** continuing takes them onward

#### Scenario: Continuing is blocked while an infected document remains
**ID**: SCN-DOCS-008-B
- **GIVEN** a document on the page has come back "Virus found"
- **WHEN** the user tries to continue
- **THEN** the same virus error is shown again
- **WHEN** they remove the infected document
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
- **AND** the notification shows that no documents have been added yet

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
The system MUST ask for a document type as a mandatory answer, offering a placeholder plus thirteen document types, and MUST place this question between the reference and the date of issue. The chosen type MUST be shown on the document's saved row.

#### Scenario: The type question offers thirteen types behind a placeholder, in position
**ID**: SCN-DOCS-013-A
- **GIVEN** the user is adding a document
- **WHEN** the page loads
- **THEN** a document type field is shown between the reference and the date of issue, offering a placeholder and thirteen document types

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
