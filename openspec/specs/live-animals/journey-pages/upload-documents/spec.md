# Upload Documents Page Specification

## Purpose

The accompanying documents attached to a notification — uploading, virus-scanning, viewing, removing, and their durability once attached. The page is titled "Upload documents".

## Requirements

### Requirement: The page states its upload constraints and shows an empty state before anything is added
The system MUST tell the user, before they add anything, which file types are accepted and the maximum file size, and MUST show an empty-state message when no documents have been added yet.

#### Scenario: The empty page states its constraints
- **GIVEN** the user opens the upload documents page on a notification with none added yet
- **WHEN** the page loads
- **THEN** it states the accepted file types and the maximum file size, and shows a message that no documents have been added

### Requirement: The page offers a route back to Overview
The system MUST offer a back link from the upload documents page that returns the user to Overview.

#### Scenario: The back link opens Overview
- **GIVEN** the user is on the upload documents page
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: A notification can hold at most ten accompanying documents
The system MUST accept up to ten documents per notification and MUST reject an eleventh with an error that links to and focuses the reference field, preserving the value entered and returning the user to the list already added, without discarding the ten already added.

#### Scenario: A tenth document is accepted and an eleventh is rejected
- **GIVEN** a notification already has nine accompanying documents added
- **WHEN** the user adds a tenth document
- **THEN** it is accepted and the list shows ten documents
- **WHEN** the user then tries to add an eleventh document
- **THEN** an error explains that a maximum of ten documents can be added, and links to and focuses the reference field
- **AND** the list still shows only the original ten documents

### Requirement: Each accompanying document has a maximum file size
The system MUST reject a document over the maximum file size, both at the point of picking a very large file and at the exact size boundary, without adding it to the notification, and MUST also reject an oversize file submitted without the client-side check having run, preserving the empty state.

#### Scenario: A file at exactly the size limit is accepted, one byte over is rejected
- **GIVEN** the user is adding a document
- **WHEN** they upload a file exactly at the maximum allowed size
- **THEN** it is accepted
- **WHEN** they then upload a file one byte over that size
- **THEN** an error explains the file must be smaller than the maximum size
- **AND** the oversize file is not added to the document list

#### Scenario: Picking a grossly oversize file is refused before any document is added
- **GIVEN** the user is adding a document to a notification with none yet added
- **WHEN** they pick a file well above the maximum allowed size
- **THEN** an error explains the file is too large
- **AND** the notification still shows no documents added

#### Scenario: An oversize file submitted without the browser check running is still refused
- **GIVEN** the user is adding a document, and the browser's own size check has not run
- **WHEN** an oversize file is nonetheless submitted
- **THEN** an error links to and focuses the file field
- **AND** the notification still shows no documents added

### Requirement: Only supported file types can be uploaded
The system MUST reject a file of an unsupported type without adding it to the notification, linking to and focusing the file field while preserving the reference and date already entered.

#### Scenario: An unsupported file type is rejected
- **GIVEN** the user is adding a document to a notification with none yet added
- **WHEN** they upload a file of an unsupported type
- **THEN** an error is shown, linking to and focusing the file field
- **AND** the reference and date already entered are preserved
- **AND** the notification still shows no documents added

### Requirement: The reference and date of issue are each required, and individually validated
The system MUST require a reference and a valid date of issue for each document, MUST reject a reference over its maximum length, MUST reject a date that is not a real date, and MUST link to and focus whichever field is at fault while preserving the other field's value.

#### Scenario: An empty reference links to and focuses the reference field, preserving the date
- **GIVEN** the user is adding a document with the date of issue filled in but no reference
- **WHEN** they try to add it
- **THEN** an error links to and focuses the reference field, which is empty
- **AND** the date of issue already entered is preserved

#### Scenario: A reference over the maximum length links to and focuses the reference field, preserving the value
- **GIVEN** the user enters a reference longer than the maximum allowed
- **WHEN** they try to add the document
- **THEN** an error links to and focuses the reference field, which still holds the value typed
- **AND** the date of issue already entered is preserved

#### Scenario: An empty date of issue links to and focuses the date field, preserving the reference
- **GIVEN** the user is adding a document with the reference filled in but no date of issue
- **WHEN** they try to add it
- **THEN** an error links to and focuses the date field, which is empty
- **AND** the reference already entered is preserved

#### Scenario: An impossible date links to and focuses the date field, preserving what was typed
- **GIVEN** the user types a date of issue that is not a real date
- **WHEN** they try to add the document
- **THEN** an error links to and focuses the date field, which still holds what was typed
- **AND** the reference already entered is preserved

#### Scenario: No file chosen links to and focuses the file field, preserving the reference and date
- **GIVEN** the user has filled in the reference and date of issue but chosen no file
- **WHEN** they try to add the document
- **THEN** an error links to and focuses the file field
- **AND** the reference and date already entered are preserved

### Requirement: Every uploaded document is virus-scanned before it can be used
The system MUST show a document as "Checking" immediately after upload, and MUST resolve it to either "Safe" with a way to view it, or "Virus found" with an error and no way to view it.

#### Scenario: A clean upload becomes Safe and viewable
- **GIVEN** the user has uploaded a document
- **WHEN** it is first added
- **THEN** its row shows "Checking", and there is no way to view it yet
- **WHEN** the virus scan completes and the file is clean
- **THEN** its row shows "Safe" and a link to view the file appears

#### Scenario: An infected upload is flagged and blocked
- **GIVEN** the user has uploaded a document
- **WHEN** it is first added
- **THEN** its row shows "Checking"
- **WHEN** the virus scan completes and finds a virus
- **THEN** its row shows "Virus found", an error explains the file contains a virus and must be removed, and there is no way to view the file

### Requirement: The user cannot continue while a document is still being scanned or is infected
The system MUST refuse to let the user continue past the page while any document's scan is still "Checking" or has come back "Virus found", showing an error explaining why, and MUST let them continue once every document has resolved to "Safe" or the infected one has been removed.

#### Scenario: Continuing is blocked while a scan is still checking
- **GIVEN** a document on the page is still "Checking"
- **WHEN** the user tries to continue
- **THEN** an error explains they cannot continue yet
- **WHEN** the scan resolves to "Safe"
- **THEN** continuing takes them onward

#### Scenario: Continuing is blocked while an infected document remains
- **GIVEN** a document on the page has come back "Virus found"
- **WHEN** the user tries to continue
- **THEN** the same virus error is shown again
- **WHEN** they remove the infected document
- **THEN** continuing takes them onward

### Requirement: Each document's scan status updates independently, and completion is announced
The system MUST update a document's row once its own scan resolves without waiting for or affecting any other document still being scanned, and MUST announce a scan's completion for assistive technology.

#### Scenario: One document settles while another stays pending
- **GIVEN** two documents have been uploaded and both are still "Checking"
- **WHEN** one of them resolves to "Safe"
- **THEN** its row updates to "Safe" with a link to view it, and completion is announced
- **AND** the other document's row still shows "Checking"

### Requirement: Scan progress can be followed without client-side JavaScript
The system MUST let a user without JavaScript manually refresh a document's scan status until it resolves, rather than requiring an automatic client-side update.

#### Scenario: A manual refresh reflects scan progress until the file is Safe
- **GIVEN** a user without JavaScript has uploaded a document that is still "Checking"
- **WHEN** they use the manual refresh option, repeating it if the scan has not yet finished
- **THEN** each refresh reflects the current scan status
- **AND** once the scan completes, the row shows "Safe", the refresh option is no longer shown, and a link to view the file appears

### Requirement: An uploaded document can be viewed and removed
The system MUST let the user download exactly the file they uploaded once it is marked Safe, served with protections against the browser reinterpreting its content type, and MUST let them remove a document from the notification.

#### Scenario: Viewing a Safe document downloads exactly the uploaded file
- **GIVEN** a document has been uploaded and scanned Safe
- **WHEN** the user views the document
- **THEN** the file downloaded is byte-for-byte identical to the one uploaded
- **AND** the response's content type matches the file and is served with the browser instructed not to reinterpret it

#### Scenario: Removing a document takes it off the notification
- **GIVEN** a notification has one accompanying document
- **WHEN** the user removes that document
- **THEN** it no longer appears in the document list
- **AND** the notification shows that no documents have been added yet

### Requirement: An attached document keeps its exact file and survives a reload
The system MUST keep an uploaded document's file and details once it has been scanned safe, and MUST still show it after a fresh page load.

#### Scenario: An uploaded document is kept intact and still listed after a reload
- **GIVEN** the user has uploaded a document and it has been scanned safe
- **WHEN** that document is looked up as the system holds it
- **THEN** it carries the same reference, the uploaded file's exact content and type, and a completed scan status
- **WHEN** the user reloads the accompanying-documents page
- **THEN** the document is still shown in the list
