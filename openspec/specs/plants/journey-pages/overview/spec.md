# Overview Page Specification

## Purpose

The task list a user works a high-risk plants notification from, listing every task under numbered section headings and letting them be answered in any order. The page is titled "Overview".

## Requirements

### Requirement: Overview groups the notification's tasks under four fixed, numbered sections
**ID**: REQ-PLANTS-OVERVIEW-001
The system MUST group the notification's tasks on the Overview page under four numbered section headings, in a fixed order, with one task list per section. A group that has landed no task row MUST NOT be rendered.

#### Scenario: A fresh notification's Overview lists its always-present tasks under the four sections
**ID**: SCN-PLANTS-OVERVIEW-001-A
- **GIVEN** a new notification has just been started
- **WHEN** the user views Overview
- **THEN** it shows four numbered section headings in order: "1. About the consignment", "2. Arrival and destination", "3. Consignment parties", "4. Check and submit"
- **AND** each section lists that notification's always-present tasks (for example, "What are you importing?" under the first section, and "Check and submit" under the last)
- **AND** a conditional task that is not applicable (for example, consignor on a potato notification with no type yet chosen) is not shown

### Requirement: Each task row shows its own status, and an unready review task offers no link
**ID**: REQ-PLANTS-OVERVIEW-002
The system MUST show each task row's status using a fixed set of labels reflecting whether it has been answered, is available to start, or is blocked, and MUST NOT offer a link into the review task while it cannot yet be started. Why the review task is blocked until every other task is ready is specified separately, under `plants/journey-flow`.

#### Scenario: A fresh notification shows later tasks as not yet started or blocked
**ID**: SCN-PLANTS-OVERVIEW-002-A
- **GIVEN** a new notification whose entry page has not yet been answered
- **WHEN** the user views Overview
- **THEN** the commodities task's row shows as not yet started, with a link
- **AND** a task that depends on earlier answers shows as cannot start yet, with no link offered
- **AND** the review task shows as cannot start yet, with no link offered

#### Scenario: Completing every task unlocks a link into the review
**ID**: SCN-PLANTS-OVERVIEW-002-B
- **GIVEN** every task on a notification has been fulfilled, not applicable, or optional
- **WHEN** the user views Overview
- **THEN** the review task's row no longer shows cannot start yet, and offers a link to check your answers

### Requirement: Overview offers a route back to the dashboard
**ID**: REQ-PLANTS-OVERVIEW-003
The system MUST offer both a back link and a return-to-dashboard action from Overview, and MUST take the user to the dashboard either way.

#### Scenario: Both the back link and the return action lead to the dashboard
**ID**: SCN-PLANTS-OVERVIEW-003-A
- **GIVEN** the user is on Overview
- **WHEN** they use either the back link or the return-to-dashboard action
- **THEN** they arrive at the dashboard

### Requirement: Overview does not show commodity running totals
**ID**: REQ-PLANTS-OVERVIEW-004
The system MUST NOT show running totals of animals, packages or similar commodity quantity panels on Overview.

#### Scenario: Overview carries no commodity totals panel
**ID**: SCN-PLANTS-OVERVIEW-004-A
- **GIVEN** the user has started a notification
- **WHEN** they view Overview
- **THEN** no commodity totals panel is shown
