# Declaration Page Specification

## Purpose

The last step before a high-risk plants notification is submitted, asking the user to confirm the declaration. The page is titled "Declaration".

## Requirements

### Requirement: The page asks the user to confirm the declaration, having told them what they are agreeing to
**ID**: REQ-PLANTS-DECLARATION-001
The system MUST present the declaration's statements before asking the user to confirm it — that they are notifying under the Plant Health National Notification Scheme, that the relevant plant health authority may spot-check the consignment without prior notice, and that failing to notify, notifying late or giving incorrect details may be treated as a non-compliance — MUST show the date of declaration, and MUST offer a confirmation to agree to and a continue action.

#### Scenario: The page presents the declaration's statements, the date, and its confirmation
**ID**: SCN-PLANTS-DECLARATION-001-A
- **GIVEN** the user has reached the declaration page
- **WHEN** the page loads
- **THEN** it presents the declaration's statements and the date of declaration, offering a confirmation to agree to and a continue action
- **AND** the confirmation is unchecked

### Requirement: Continuing without confirming the declaration is rejected, focusing the confirmation
**ID**: REQ-PLANTS-DECLARATION-002
The system MUST refuse to submit the notification while the declaration is unconfirmed, showing an error summary that links to and focuses the confirmation, and MUST leave it unchecked.

#### Scenario: Continuing with the declaration unconfirmed shows an error summary that focuses the confirmation
**ID**: SCN-PLANTS-DECLARATION-002-A
- **GIVEN** the user is on the declaration page and has not confirmed the declaration
- **WHEN** they continue
- **THEN** an error summary is shown asking them to confirm the information is true and correct before submitting
- **WHEN** the user follows the error
- **THEN** the confirmation is focused, and remains unchecked

### Requirement: The page offers a route back to check your answers
**ID**: REQ-PLANTS-DECLARATION-003
The system MUST offer a back link from the declaration page that returns the user to check your answers.

#### Scenario: The back link opens check your answers
**ID**: SCN-PLANTS-DECLARATION-003-A
- **GIVEN** the user is on the declaration page
- **WHEN** they follow the back link
- **THEN** check your answers is shown

### Requirement: The declaration page is not shown once the notification has been submitted
**ID**: REQ-PLANTS-DECLARATION-004
The system MUST redirect a request for the declaration page to the confirmation page once the notification it names has already been submitted.

#### Scenario: Requesting the declaration page for a submitted notification redirects to confirmation
**ID**: SCN-PLANTS-DECLARATION-004-A
- **GIVEN** the user has just submitted a notification
- **WHEN** they request the declaration page for it again
- **THEN** the confirmation page is shown instead

### Requirement: Confirming the declaration submits the notification and opens confirmation
**ID**: REQ-PLANTS-DECLARATION-005
The system MUST submit the notification when the user confirms the declaration and continues, opening the confirmation page, and MUST record whether the submission was late or on time as governed by `plants/journey-obligations/review`.

#### Scenario: Confirming and continuing opens confirmation for an on-time notification
**ID**: SCN-PLANTS-DECLARATION-005-A
- **GIVEN** the user is on the declaration page for an on-time draft
- **WHEN** they confirm the declaration and continue
- **THEN** the confirmation page opens
- **AND** the read-only check-your-answers shows no late banner
