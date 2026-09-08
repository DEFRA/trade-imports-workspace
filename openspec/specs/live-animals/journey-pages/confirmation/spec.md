# Confirmation Page Specification

## Purpose

The page shown once a notification has been submitted, confirming it and telling the user what happens next. The page is titled "Import notification submitted".

## Requirements

### Requirement: The page confirms the submission and shows the notification's reference number
**ID**: REQ-CONFIRM-001
The system MUST confirm a completed submission on its own page, showing the reference number of the notification just submitted and the date it was declared, and MUST NOT offer a back link from it.

#### Scenario: Submitting a notification through the full journey shows its reference number on confirmation
**ID**: SCN-CONFIRM-001-A
- **GIVEN** the user has walked through every section of a notification and reached the declaration
- **WHEN** they submit it
- **THEN** the confirmation page shows "Import notification submitted", carrying that notification's own reference number
- **AND** the date of declaration is shown
- **AND** no back link is offered

### Requirement: The confirmation page is not shown for a notification that has not yet been submitted
**ID**: REQ-CONFIRM-002
The system MUST redirect a request for the confirmation page to Overview when the notification it names has not been submitted.

#### Scenario: Requesting confirmation for an unsubmitted notification redirects to Overview
**ID**: SCN-CONFIRM-002-A
- **GIVEN** a notification has been started but not submitted
- **WHEN** its confirmation page is requested directly
- **THEN** Overview is shown instead

### Requirement: The page tells the user how the consignment must be transported
**ID**: REQ-CONFIRM-003
The system MUST tell the user that the consignment must go directly to its place of destination on entry to Great Britain, that it may need to be inspected, and that if so the animals must stay at the place of destination for the time stated on the health certificate, or 48 hours where none is stated.

#### Scenario: The confirmation page carries the transporting guidance
**ID**: SCN-CONFIRM-003-A
- **GIVEN** a notification has just been submitted
- **WHEN** the user reads the confirmation page
- **THEN** it tells them to have the transporter take the consignment directly to the place of destination, that it may need inspecting, and how long the animals must then stay there

### Requirement: The page tells the user how to view or amend the notification later
**ID**: REQ-CONFIRM-004
The system MUST tell the user they can view or amend the notification from their dashboard and resubmit it, and MUST offer a way back to the dashboard.

#### Scenario: The confirmation page offers a route back to the dashboard
**ID**: SCN-CONFIRM-004-A
- **GIVEN** a notification has just been submitted
- **WHEN** the user reads the confirmation page
- **THEN** it explains they can view or amend the notification from their dashboard and resubmit it
- **AND** a link back to the dashboard is offered

### Requirement: The page tells the user where to get help
**ID**: REQ-CONFIRM-005
The system MUST offer the user routes to help — where to email about import notifications, how to reach the Animal and Plant Health Agency for technical help with the service including its opening hours, and where to go for help with a customs declaration.

#### Scenario: The confirmation page carries the help routes
**ID**: SCN-CONFIRM-005-A
- **GIVEN** a notification has just been submitted
- **WHEN** the user reads the confirmation page
- **THEN** it gives an email address for help with import notifications, a telephone number and opening hours for technical help, and a route to help with a customs declaration
