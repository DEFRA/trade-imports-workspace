# Admin Notification Management Specification

## Purpose

An operator finding and deleting notifications, and the audit trail that records every attempt.

## Requirements

### Requirement: An operator can find and delete a notification by its exact reference number
**ID**: REQ-ADMIN-NOTIF-001
The system MUST let an operator locate a notification by its exact reference number and delete it, after confirming, and MUST show a success message and remove it from the list once deleted.

#### Scenario: Deleting a submitted notification by reference number
**ID**: SCN-ADMIN-NOTIF-001-A
- **GIVEN** a submitted notification exists
- **WHEN** the operator enters its exact reference number and confirms deletion
- **THEN** a success message confirms the notification was deleted
- **AND** it no longer appears in the notification list

### Requirement: An operator can select one or more notifications by checkbox and delete them together
**ID**: REQ-ADMIN-NOTIF-002
The system MUST let an operator select notifications by checkbox and delete the selection together, after confirming, and MUST leave them untouched if the confirmation is cancelled.

#### Scenario: Deleting a checked notification
**ID**: SCN-ADMIN-NOTIF-002-A
- **GIVEN** a submitted notification exists
- **WHEN** the operator checks its checkbox, chooses to delete, and confirms
- **THEN** a success message confirms the notification was deleted
- **AND** it no longer appears in the notification list

#### Scenario: Cancelling the delete confirmation leaves the notification untouched
**ID**: SCN-ADMIN-NOTIF-002-B
- **GIVEN** the operator has checked a notification and chosen to delete it
- **WHEN** they cancel the confirmation instead of confirming
- **THEN** the notification is still shown in the list

### Requirement: Deleting by an unknown reference number is rejected, not silently ignored
**ID**: REQ-ADMIN-NOTIF-003
The system MUST show an error when an operator attempts to delete a reference number that does not exist.

#### Scenario: An unknown reference number is rejected with an error
**ID**: SCN-ADMIN-NOTIF-003-A
- **GIVEN** the operator enters a reference number that does not match any notification
- **WHEN** they confirm deletion
- **THEN** an error explains that there was a problem deleting the notifications

### Requirement: Every delete attempt is written to an audit trail, whether it succeeds or fails
**ID**: REQ-ADMIN-NOTIF-004
The system MUST record an audit entry for every notification-delete attempt, naming the action, its result, who performed it, and which reference numbers were involved.

#### Scenario: A successful delete is audited
**ID**: SCN-ADMIN-NOTIF-004-A
- **GIVEN** an operator has successfully deleted one notification by reference number
- **WHEN** the audit trail is checked
- **THEN** it holds one entry recording a successful notification-delete action, naming that operator and that reference number

#### Scenario: A failed delete is also audited
**ID**: SCN-ADMIN-NOTIF-004-B
- **GIVEN** an operator has attempted to delete an unknown reference number
- **WHEN** the audit trail is checked
- **THEN** it holds one entry recording a failed notification-delete action, naming that operator and the attempted reference number
