# Notification Tracking Specification

## Purpose

The Import Notification Service keeping track of every notification across the journeys that feed it, so status and detail can be read in one place.

## Requirements

### Requirement: One record is kept per notification, updated in place as it changes
The system MUST keep one record per notification once it exists, MUST keep that record up to date as the notification's status and detail change, and MUST NOT create a second record for the same notification when it is submitted.

#### Scenario: An in-progress notification is tracked as Draft, with its detail
- **GIVEN** a user has worked through a notification up to its declaration page, without submitting
- **WHEN** the service is asked what it holds for that notification
- **THEN** one record exists for it, showing a Draft status and reflecting the answers entered so far

#### Scenario: Submitting the notification updates the same record to Submitted
- **GIVEN** an in-progress notification is already tracked as Draft
- **WHEN** the user submits the notification
- **THEN** that same record updates to show a Submitted status
- **AND** no second record is created for that notification
