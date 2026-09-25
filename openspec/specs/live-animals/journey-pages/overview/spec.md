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
- **THEN** it shows six numbered section headings in order: "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Documents", "5. Consignment parties", "6. Contact address"
- **AND** each section lists that notification's always-present tasks (for example, "Where is this consignment coming from?" and "What are you importing?" under the first section)

### Requirement: Each task row shows one of two statuses, and Overview offers a review button open at any point
**ID**: REQ-OVERVIEW-002
The system MUST show each task row's status as one of two labels — Complete once it is answered, To do otherwise, never a third or blocked state — and MUST offer a fixed "Review and submit" button, not a task row, that opens the review page at any point in the journey however much of the notification remains outstanding.

#### Scenario: A fresh notification shows an answered task as Complete and an unworked task as To do, both linked
**ID**: SCN-OVERVIEW-002-A
- **GIVEN** a new notification whose entry page has been answered but nothing else
- **WHEN** the user views Overview
- **THEN** the entry task's row shows Complete, with a link
- **AND** a task not yet worked on shows To do, with a link to begin it

#### Scenario: The Review and submit button opens the review before every task is answered
**ID**: SCN-OVERVIEW-002-B
- **GIVEN** a notification with only its entry page answered
- **WHEN** the user views Overview
- **THEN** a "Review and submit" button is offered, not a task row, with no cannot-start-yet state shown anywhere on the page
- **AND** following it opens the review page

### Requirement: Overview's only route off the page is the Return to dashboard action — there is no back link
**ID**: REQ-OVERVIEW-003
The system MUST offer a return-to-dashboard action from Overview and take the user to the dashboard, and MUST NOT show a back link, since Overview is the top of the notification rather than a step within it.

#### Scenario: The return action leads to the dashboard, with no back link present
**ID**: SCN-OVERVIEW-003-A
- **GIVEN** the user is on Overview
- **WHEN** they view the page
- **THEN** no back link is shown
- **WHEN** they use the return-to-dashboard action
- **THEN** they arrive at the dashboard

### Requirement: Overview shows running totals of animals and packages once commodity lines exist
**ID**: REQ-OVERVIEW-004
The system MUST show, once at least one commodity line has been added, a running total of the number of animals and a running total of the number of packages declared across the notification's commodity lines, each as a figure with a label and a caption.

#### Scenario: Overview totals the animals and packages entered so far
**ID**: SCN-OVERVIEW-004-A
- **GIVEN** the user has added a commodity line and entered its number of animals and number of packages
- **WHEN** they view Overview
- **THEN** it shows the total number of animals and the total number of packages, each labelled and captioned
