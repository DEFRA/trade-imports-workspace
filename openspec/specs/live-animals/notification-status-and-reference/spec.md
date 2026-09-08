# Notification Status and Reference Specification

## Purpose

Which notification the user is working on and what state it is in, shown on every page of its journey.

## Requirements

### Requirement: Every page of a notification shows what state it is in
**ID**: REQ-STATUS-REF-001
The system MUST show the notification's current state on every page of its journey, and MUST distinguish the states by colour: blue for Draft, green for Submitted, yellow for Amending, and grey for Deleted.

#### Scenario: Each state is shown, and distinguished by colour
**ID**: SCN-STATUS-REF-001-A
- **GIVEN** a notification in any of its states
- **WHEN** the user views a page of it
- **THEN** a draft notification is shown as "Draft" in blue, a submitted one as "Submitted" in green, one being amended as "Amending" in yellow, and a deleted one as "Deleted" in grey

### Requirement: Every page of a notification shows its reference number, from the moment it is created
**ID**: REQ-STATUS-REF-002
The system MUST show the notification's GBN-AG reference number on every page of its journey, from the first page onward. The reference is given to the notification when it is created, so it MUST be shown before the user has saved any answer.

#### Scenario: The reference is shown on the entry page before anything is saved
**ID**: SCN-STATUS-REF-002-A
- **GIVEN** the user has just created a notification and landed on its entry page
- **WHEN** the page is shown, before any answer has been saved
- **THEN** the notification's reference number is shown, alongside its state of "Draft"

#### Scenario: The reference and state stay visible through every later page
**ID**: SCN-STATUS-REF-002-B
- **GIVEN** the user has just started a new notification
- **WHEN** they save their first answer, and then visit Overview and any task page
- **THEN** every one of those pages shows the notification's state of "Draft" and its GBN-AG-shaped reference number

### Requirement: No state or reference is shown where there is no notification to describe
**ID**: REQ-STATUS-REF-003
The system MUST NOT show a state or reference number on the dashboard, which precedes any journey and describes no single notification.

#### Scenario: The dashboard shows no state or reference
**ID**: SCN-STATUS-REF-003-A
- **GIVEN** the user is on the notification dashboard, before starting a notification
- **WHEN** they view the page
- **THEN** no notification state or reference number is shown
