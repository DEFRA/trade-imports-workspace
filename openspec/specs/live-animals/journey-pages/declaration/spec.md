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

### Requirement: The declaration is reached only by continuing from check your answers
**ID**: REQ-DECLARATION-005
The system MUST show the declaration only when the user continues from a check your answers shown in their own browser, and MUST send a user who reaches the declaration by a bookmark or typed address, or by a form altered to post to it before check your answers has been shown for the notification as it now stands in this browser, to check your answers instead.

#### Scenario: Opening the declaration page directly shows check your answers
**ID**: SCN-DECLARATION-005-A
- **GIVEN** a draft notification
- **WHEN** the user opens its declaration page directly, without continuing from check your answers
- **THEN** check your answers is shown instead

#### Scenario: A form altered to continue to the declaration, without check your answers having been opened, shows check your answers
**ID**: SCN-DECLARATION-005-B
- **GIVEN** a ready draft notification whose check your answers has not been opened in this browser
- **WHEN** another page's form is altered to continue to the declaration, and sent
- **THEN** check your answers is shown, not the declaration

### Requirement: A notification is submitted only as check your answers showed it
**ID**: REQ-DECLARATION-006
The system MUST submit a notification only if it is unchanged since the check your answers the user continued from was shown, even when the declaration has been shown again since. If it has changed at any moment up to the submission, the system MUST NOT submit it, and MUST return the user to check your answers under a message that it has been updated since they opened it.

#### Scenario: A notification unchanged since check your answers submits
**ID**: SCN-DECLARATION-006-A
- **GIVEN** the user has continued from check your answers to the declaration, and nothing has changed since
- **WHEN** they confirm the declaration and submit
- **THEN** the notification is submitted and the confirmation page is shown

#### Scenario: A change made after the declaration was shown stops the submission
**ID**: SCN-DECLARATION-006-B
- **GIVEN** the declaration is shown
- **AND** the notification is then changed in another tab or by another user
- **WHEN** the user confirms the declaration and submits
- **THEN** the notification is not submitted
- **AND** check your answers is shown with the changed answer, under a message that the notification has been updated since they opened it

#### Scenario: A declaration shown again is still held to the original check your answers
**ID**: SCN-DECLARATION-006-C
- **GIVEN** the declaration was shown again because the user submitted it unconfirmed
- **AND** the notification is then changed elsewhere
- **WHEN** the user submits the declaration again
- **THEN** the notification is not submitted, and check your answers is shown under the updated message

#### Scenario: Refreshing the declaration after a change does not show it again
**ID**: SCN-DECLARATION-006-D
- **GIVEN** the declaration is shown
- **AND** the notification is then changed elsewhere
- **WHEN** the user refreshes the declaration, sending its form again
- **THEN** check your answers is shown under the updated message, not the declaration

#### Scenario: A change landing at the moment of submission stops the submission
**ID**: SCN-DECLARATION-006-E
- **GIVEN** the user has confirmed the declaration and the checks before submission have passed
- **WHEN** another change to the notification lands before it is submitted
- **THEN** the notification is not submitted, and check your answers is shown under the updated message
