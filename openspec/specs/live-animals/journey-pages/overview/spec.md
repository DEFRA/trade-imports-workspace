# Overview Page Specification

## Purpose

The task list a user works a notification from, listing every task under numbered section headings and letting them be answered in any order. The page is titled "Overview".

## Requirements

### Requirement: Overview groups the notification's tasks under six fixed, numbered sections
**ID**: REQ-OVERVIEW-001
The system MUST group the notification's tasks on the Overview page under six numbered section headings, in a fixed order, with one task list per section.

#### Scenario: A fresh notification's Overview lists its always-present tasks under the six sections
**ID**: SCN-OVERVIEW-001-A
- **GIVEN** a new notification has just been started
- **WHEN** the user views Overview
- **THEN** it shows six numbered section headings in order: "1. About the consignment", "2. Commodity details", "3. Movement", "4. Addresses", "5. Documents", "6. Check and submit"
- **AND** each section lists that notification's always-present tasks (for example, "Where is this consignment coming from?" and "What are you importing?" under the first section)

### Requirement: Each task row shows its own status, and an unready review task offers no link
**ID**: REQ-OVERVIEW-002
The system MUST show each task row's status using a fixed set of labels reflecting whether it has been answered, is available to start, or is blocked, and MUST NOT offer a link into the review task while it cannot yet be started. Why the review task is blocked until every other task is ready is specified separately, under `live-animals/journey-flow`.

#### Scenario: A fresh notification shows an answered task as completed and later tasks as not yet started or blocked
**ID**: SCN-OVERVIEW-002-A
- **GIVEN** a new notification whose entry page has been answered but nothing else
- **WHEN** the user views Overview
- **THEN** the entry task's row shows as completed, with a link
- **AND** a task not yet worked on shows as not yet started, with a link to begin it
- **AND** the review task shows as cannot start yet, with no link offered

#### Scenario: Completing every task unlocks a link into the review
**ID**: SCN-OVERVIEW-002-B
- **GIVEN** every task on a notification has been fulfilled, not applicable, or optional
- **WHEN** the user views Overview
- **THEN** the review task's row no longer shows cannot start yet, and offers a link to check your answers

### Requirement: Overview offers a route back to the dashboard
**ID**: REQ-OVERVIEW-003
The system MUST offer both a back link and a return-to-dashboard action from Overview, and MUST take the user to the dashboard either way.

#### Scenario: Both the back link and the return action lead to the dashboard
**ID**: SCN-OVERVIEW-003-A
- **GIVEN** the user is on Overview
- **WHEN** they use either the back link or the return-to-dashboard action
- **THEN** they arrive at the dashboard

### Requirement: Overview shows running totals of animals and packages once commodity lines exist
**ID**: REQ-OVERVIEW-004
The system MUST show, once at least one commodity line has been added, a running total of the number of animals and a running total of the number of packages declared across the notification's commodity lines, each as a figure with a label and a caption.

#### Scenario: Overview totals the animals and packages entered so far
**ID**: SCN-OVERVIEW-004-A
- **GIVEN** the user has added a commodity line and entered its number of animals and number of packages
- **WHEN** they view Overview
- **THEN** it shows the total number of animals and the total number of packages, each labelled and captioned
