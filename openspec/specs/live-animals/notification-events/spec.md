# Notification Events Specification

## Purpose

The outbox events the system records as a notification moves through its lifecycle — the contract downstream consumers read.

## Requirements

### Requirement: One outbox event is recorded per meaningful lifecycle transition
**ID**: REQ-EVENTS-001
The system MUST record a distinctly named outbox event for each of the following notification transitions: creation, submission, starting an amendment, cancelling an amendment, and soft-deleting a draft or a submitted notification, each carrying the notification's status at that point.

#### Scenario: Creating a notification records a creation event
**ID**: SCN-EVENTS-001-A
- **GIVEN** a user starts a new notification
- **WHEN** the outbox is checked
- **THEN** a creation event exists for that notification, showing its status as draft

#### Scenario: Submitting a notification records a submission event carrying the submitted detail
**ID**: SCN-EVENTS-001-B
- **GIVEN** a user submits a notification through the full journey
- **WHEN** the outbox is checked
- **THEN** a submission event exists for that notification, showing its status as submitted and carrying the submitted consignment detail, along with the identity of who submitted it

#### Scenario: Starting and cancelling an amendment each record their own event
**ID**: SCN-EVENTS-001-C
- **GIVEN** a submitted notification has an amendment started on it, which is then cancelled
- **WHEN** the outbox is checked
- **THEN** an amendment-started event exists showing the notification's status as amending, and an amendment-cancelled event exists showing it back as submitted

#### Scenario: Soft-deleting a draft and soft-deleting a submitted notification record different events
**ID**: SCN-EVENTS-001-D
- **GIVEN** one notification is still a draft and another has been submitted
- **WHEN** each is soft-deleted
- **THEN** the draft's deletion records a deletion event, and the submitted one's deletion records a distinctly named "submission deleted" event, each showing a status of deleted

### Requirement: Deleting a never-submitted draft records no withdrawal event
**ID**: REQ-EVENTS-002
The system MUST NOT record a withdrawal event when a draft that was never submitted is deleted, since there is nothing downstream to withdraw.

#### Scenario: Deleting a draft that was never submitted records no separate withdrawal event
**ID**: SCN-EVENTS-002-A
- **GIVEN** a user starts a notification and deletes it while it is still a draft
- **WHEN** the outbox is checked
- **THEN** no withdrawal event exists for it

### Requirement: Every event references the notification's scanned accompanying documents, coded by type
**ID**: REQ-EVENTS-003
A notification event MUST reference each of the notification's accompanying documents that has passed its virus scan, giving the document's type code from the GBN-AG document-type codelist, the codelist that defines that code, the document's reference and its date of issue. A document still being scanned or rejected by the scan MUST NOT be referenced, and a notification with no scanned documents MUST send no document references at all rather than an empty list.

#### Scenario: A submitted notification references each scanned document with its type code and codelist
**ID**: SCN-EVENTS-003-A
- **GIVEN** a user uploads a document that passes its virus scan and submits the notification
- **WHEN** the outbox is checked
- **THEN** the submission event references that document once, with its type code, the codelist that defines the code, its reference and its date of issue

#### Scenario: A notification with no documents sends no document references
**ID**: SCN-EVENTS-003-B
- **GIVEN** a user submits a notification without uploading any document
- **WHEN** the outbox is checked
- **THEN** the submission event carries no document references, not even an empty list

#### Scenario: A document still being scanned is not referenced
**ID**: SCN-EVENTS-003-C
- **GIVEN** a notification has one document that passed its virus scan and one still being scanned
- **WHEN** it is submitted
- **THEN** the submission event references only the scanned document
