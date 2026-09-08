# Admin DLQ Management Specification

## Purpose

An operator inspecting and clearing the dead-letter queue of failed messages.

## Requirements

### Requirement: An operator can list and replay every dead-letter-queue message
**ID**: REQ-ADMIN-DLQ-001
The system MUST list dead-letter-queue messages as they arrive, and MUST let an operator replay all of them, showing a success banner once the replay has started.

#### Scenario: A DLQ message appears and can be replayed
**ID**: SCN-ADMIN-DLQ-001-A
- **GIVEN** a message has arrived on the dead-letter queue
- **WHEN** the operator opens the DLQ events page
- **THEN** the message is listed
- **WHEN** they choose to replay all messages
- **THEN** a success banner confirms the replay has started

### Requirement: An operator can delete every dead-letter-queue message, after confirming
**ID**: REQ-ADMIN-DLQ-002
The system MUST ask an operator to confirm before deleting every dead-letter-queue message, and MUST show a success banner once the deletion has started.

#### Scenario: Deleting all DLQ messages requires confirmation
**ID**: SCN-ADMIN-DLQ-002-A
- **GIVEN** a message is listed on the DLQ events page
- **WHEN** the operator chooses to delete all messages
- **THEN** a confirmation dialog is shown
- **WHEN** they confirm
- **THEN** a success banner confirms the deletion has started
