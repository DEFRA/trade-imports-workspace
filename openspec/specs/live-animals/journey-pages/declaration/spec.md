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

### Requirement: The declaration is confirmed with a small checkbox in a group named for screen readers, and the page shows no status bar
**ID**: REQ-DECLARATION-005
The system MUST offer the confirmation as a small GOV.UK checkbox in a group whose legend "Declaration confirmation" is announced to screen-reader users but not shown on screen. It MUST NOT show a status bar above the heading — no "Draft" or "Amend" tag, no reference number and no "Cancel amend" — whether the notification is a draft being submitted for the first time or an amendment being re-submitted.

#### Scenario: A draft's declaration offers a small confirmation in a hidden-legend group and no status bar
**ID**: SCN-DECLARATION-005-A
- **GIVEN** a draft notification ready to submit
- **WHEN** the user opens the declaration
- **THEN** the confirmation is a small checkbox in a group named "Declaration confirmation", whose name is not shown on screen
- **AND** no status bar is shown above the heading

#### Scenario: An amendment's declaration shows no status bar
**ID**: SCN-DECLARATION-005-B
- **GIVEN** a notification is being amended
- **WHEN** the user continues from check your answers to the declaration
- **THEN** no status bar, reference number or "Cancel amend" is shown above the heading
