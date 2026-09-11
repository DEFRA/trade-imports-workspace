# Confirmation Page Specification

## Purpose

The page shown once a high-risk plants notification has been submitted, confirming it and offering routes back into the notification and the dashboard. The page is titled "Notification submitted".

## Requirements

### Requirement: The page confirms the submission and shows the notification's reference number
**ID**: REQ-PLANTS-CONFIRMATION-001
The system MUST confirm a completed submission on its own page, showing the reference number of the notification just submitted and the date of notification, and MUST NOT offer a back link from it.

#### Scenario: Submitting a notification shows its reference number on confirmation
**ID**: SCN-PLANTS-CONFIRMATION-001-A
- **GIVEN** the user has walked through every section of a notification and reached the declaration
- **WHEN** they submit it
- **THEN** the confirmation page shows "Notification submitted", carrying that notification's own reference number
- **AND** the date of notification is shown
- **AND** no back link is offered

### Requirement: The confirmation page is not shown for a notification that has not yet been submitted
**ID**: REQ-PLANTS-CONFIRMATION-002
The system MUST redirect a request for the confirmation page to check-your-answers when the notification it names has not been submitted.

#### Scenario: Requesting confirmation for an unsubmitted notification redirects to check-your-answers
**ID**: SCN-PLANTS-CONFIRMATION-002-A
- **GIVEN** a notification has been started but not submitted
- **WHEN** its confirmation page is requested directly
- **THEN** check-your-answers is shown instead

### Requirement: The page offers routes to view the notification and return to the dashboard
**ID**: REQ-PLANTS-CONFIRMATION-003
The system MUST offer a way to view the submitted notification and a way back to the dashboard, and MUST keep the same receipt when the page is reloaded.

#### Scenario: View notification and return to dashboard are offered
**ID**: SCN-PLANTS-CONFIRMATION-003-A
- **GIVEN** a notification has just been submitted
- **WHEN** the user follows "View your notification"
- **THEN** the read-only check-your-answers opens
- **WHEN** they return to confirmation and follow "Return to dashboard"
- **THEN** the dashboard is shown

### Requirement: A late submission shows the late banner; an on-time submission does not
**ID**: REQ-PLANTS-CONFIRMATION-004
The system MUST show a late banner on confirmation when the notification was recorded late at first submission, quoting the commodity type's timing rule, and MUST NOT show that banner for an on-time submission. The timing rules and the recorded flag are governed by `plants/journey-obligations/review`.

#### Scenario: A late submission carries the late banner on confirmation
**ID**: SCN-PLANTS-CONFIRMATION-004-A
- **GIVEN** a potato notification was submitted late
- **WHEN** the user reads the confirmation page
- **THEN** a banner explains the notification was made outside the required timing, quoting the potato rule

#### Scenario: An on-time submission shows no late banner on confirmation
**ID**: SCN-PLANTS-CONFIRMATION-004-B
- **GIVEN** a notification was submitted on time
- **WHEN** the user reads the confirmation page
- **THEN** no late banner is shown
