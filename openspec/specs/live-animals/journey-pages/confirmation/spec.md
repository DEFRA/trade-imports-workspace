# Confirmation Page Specification

## Purpose

The page shown once a notification has been submitted, confirming it and telling the user what happens next. The page is titled "Import notification submitted".

## Requirements

### Requirement: The page confirms the submission and shows the notification's reference number
**ID**: REQ-CONFIRM-001
The system MUST confirm a completed submission on its own page, showing the reference number of the notification just submitted, and MUST NOT repeat the date of declaration, which the declaration page has already shown, nor offer a back link from it.

#### Scenario: Submitting a notification through the full journey shows its reference number on confirmation
**ID**: SCN-CONFIRM-001-A
- **GIVEN** the user has walked through every section of a notification and reached the declaration
- **WHEN** they submit it
- **THEN** the confirmation page shows "Import notification submitted", carrying that notification's own reference number
- **AND** the date of declaration is not repeated here
- **AND** no back link is offered

### Requirement: The confirmation page is not shown for a notification that has not yet been submitted
**ID**: REQ-CONFIRM-002
The system MUST redirect a request for the confirmation page to the notification's overview when the notification it names has not been submitted.

#### Scenario: Requesting confirmation for an unsubmitted notification opens its overview
**ID**: SCN-CONFIRM-002-A
- **GIVEN** a notification has been started but not submitted
- **WHEN** its confirmation page is requested directly
- **THEN** the notification's overview, headed "Notification tasklist", is shown instead

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
The system MUST tell the user 'You can view or change this notification from your dashboard.' and MUST offer a way back to the dashboard.

#### Scenario: The confirmation page offers a route back to the dashboard
**ID**: SCN-CONFIRM-004-A
- **GIVEN** a notification has just been submitted
- **WHEN** the user reads the confirmation page
- **THEN** it reads 'You can view or change this notification from your dashboard.'
- **AND** a link back to the dashboard is offered

### Requirement: The page tells the user where to get help
**ID**: REQ-CONFIRM-005
The system MUST offer the user routes to help — where to email about import notifications, how to reach the Animal and Plant Health Agency for technical help with the service including its opening hours, and where to go for help with a customs declaration. The 'contact HMRC' and 'Find out about call charges' links MUST open in a new tab, keeping that link text. Each link MUST tell screen-reader users that it opens in a new tab, without changing its visible text.

#### Scenario: The confirmation page carries the help routes
**ID**: SCN-CONFIRM-005-A
- **GIVEN** a notification has just been submitted
- **WHEN** the user reads the confirmation page
- **THEN** it gives an email address for help with import notifications, a telephone number and opening hours for technical help, and a route to help with a customs declaration

#### Scenario: The HMRC links open in a new tab
**ID**: SCN-CONFIRM-005-B
- **GIVEN** a notification has just been submitted
- **WHEN** the user reads the help section
- **THEN** 'contact HMRC' and 'Find out about call charges' each open in a new tab
- **AND** each link tells screen-reader users it opens in a new tab, while its visible text stays 'contact HMRC' / 'Find out about call charges'

### Requirement: The page tells the user they still owe the ITAHC when none was uploaded
**ID**: REQ-CONFIRM-006
The system MUST show a "Before the consignment is imported" section, telling the user they still need to 'upload the ITAHC and any other required documents', whenever the notification was submitted without an ITAHC, whatever other documents were uploaded, and MUST NOT show it when an ITAHC was uploaded.

#### Scenario: A submission with no documents carries the outstanding-work section
**ID**: SCN-CONFIRM-006-A
- **GIVEN** a notification was submitted with no documents recorded
- **WHEN** the user reads the confirmation page
- **THEN** a "Before the consignment is imported" section tells them they still need to 'upload the ITAHC and any other required documents'

#### Scenario: A submission with documents but no ITAHC carries the outstanding-work section
**ID**: SCN-CONFIRM-006-B
- **GIVEN** a notification was submitted with documents recorded, none of them an ITAHC
- **WHEN** the user reads the confirmation page
- **THEN** a "Before the consignment is imported" section tells them they still need to 'upload the ITAHC and any other required documents'

#### Scenario: A submission with an ITAHC carries no outstanding-work section
**ID**: SCN-CONFIRM-006-C
- **GIVEN** a notification was submitted with an ITAHC uploaded
- **WHEN** the user reads the confirmation page
- **THEN** the panel is followed by "Transporting the consignment", and the page's sections are exactly transporting, view or amend, and help

### Requirement: The page offers a way to start a new notification directly
**ID**: REQ-CONFIRM-007
The system MUST offer an action on the confirmation page that starts a fresh notification and opens it at the journey's entry page, without requiring the user to return to the dashboard first.

#### Scenario: Creating a new notification from confirmation opens a fresh journey
**ID**: SCN-CONFIRM-007-A
- **GIVEN** a notification has just been submitted
- **WHEN** the user chooses to create a new notification from the confirmation page
- **THEN** a new notification is started and its own entry page (origin of the import) is shown
- **AND** the new notification has its own reference number, different from the one just submitted
