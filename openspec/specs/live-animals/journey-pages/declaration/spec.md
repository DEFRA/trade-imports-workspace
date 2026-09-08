# Declaration Page Specification

## Purpose

The last step before a notification is submitted, asking the user to confirm the declaration. The page is titled "Declaration".

## Requirements

### Requirement: The page asks the user to confirm the declaration, having told them what they are agreeing to
**ID**: REQ-DECLARATION-001
The system MUST present the declaration's statements before asking the user to confirm it — that they are contactable in the UK, that they are responsible for the accuracy of the information given, what they are accountable for, that they are authorised to act, and that they are legally acting on behalf of who they represent — MUST show the date of declaration, and MUST offer a confirmation to agree to and a continue action.

#### Scenario: The page presents the declaration's statements, the date, and its confirmation
**ID**: SCN-DECLARATION-001-A
- **GIVEN** the user has reached the declaration page
- **WHEN** the page loads
- **THEN** it presents the declaration's statements and the date of declaration, offering a confirmation to agree to and a continue action

### Requirement: Continuing without confirming the declaration is rejected, focusing the confirmation
**ID**: REQ-DECLARATION-002
The system MUST refuse to submit the notification while the declaration is unconfirmed, showing an error summary that links to and focuses the confirmation, and MUST leave it unchecked.

#### Scenario: Continuing with the declaration unconfirmed shows an error summary that focuses the confirmation
**ID**: SCN-DECLARATION-002-A
- **GIVEN** the user is on the declaration page and has not confirmed the declaration
- **WHEN** they continue
- **THEN** an error summary headed "There is a problem" is shown
- **WHEN** the user follows the error
- **THEN** the confirmation is focused, and remains unchecked

### Requirement: The page offers a route back to check your answers
**ID**: REQ-DECLARATION-003
The system MUST offer a back link from the declaration page that returns the user to check your answers.

#### Scenario: The back link opens check your answers
**ID**: SCN-DECLARATION-003-A
- **GIVEN** the user is on the declaration page
- **WHEN** they follow the back link
- **THEN** check your answers is shown

### Requirement: The declaration page is not shown once the notification has been submitted
**ID**: REQ-DECLARATION-004
The system MUST redirect a request for the declaration page to the confirmation page once the notification it names has already been submitted.

#### Scenario: Requesting the declaration page for a submitted notification redirects to confirmation
**ID**: SCN-DECLARATION-004-A
- **GIVEN** the user has just submitted a notification
- **WHEN** they request the declaration page for it again
- **THEN** the confirmation page is shown instead
