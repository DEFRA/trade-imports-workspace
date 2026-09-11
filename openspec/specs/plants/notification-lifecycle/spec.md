# Notification Lifecycle Specification

## Purpose

A high-risk plants notification's life from draft through submission, amendment and deletion — the statuses it moves through, what may be changed at each, and the durability of its answers.

## Requirements

### Requirement: A notification moves through a fixed lifecycle as the user acts on it
**ID**: REQ-PLANTS-LIFECYCLE-001
The system MUST move a notification through Draft, Submitted, Amend, and Deleted as it is created, submitted, amended, and removed. The state recorded as Amend MUST be shown to the user as "Amending" wherever a notification's state is displayed.

#### Scenario: A full lifecycle walk moves the notification through each status in turn
**ID**: SCN-PLANTS-LIFECYCLE-001-A
- **GIVEN** a new notification has just been created
- **WHEN** it is submitted, then an amendment is started on it, then that amendment is cancelled, then it is soft-deleted
- **THEN** the notification's status is Draft, then Submitted, then Amend, then Submitted again, then Deleted, at each corresponding step

### Requirement: A draft notification's answers are recorded as they are saved, and survive being reopened
**ID**: REQ-PLANTS-LIFECYCLE-002
The system MUST record a notification's answers as each is saved, keeping it in a draft state until it is submitted, so that reopening an unfinished notification shows everything already entered.

#### Scenario: An unfinished notification is recorded as a draft under its own reference number
**ID**: SCN-PLANTS-LIFECYCLE-002-A
- **GIVEN** the user has started a notification and answered at least one section, without submitting
- **WHEN** that notification is looked up as the system holds it
- **THEN** it exists under the same reference number, still in a draft state, carrying the answers entered so far

### Requirement: A submitted notification keeps every answer entered, and reopens showing them unchanged
**ID**: REQ-PLANTS-LIFECYCLE-003
The system MUST keep every section's answers when a notification is submitted, and MUST show the same answers, under a Submitted status, when it is reopened.

#### Scenario: A submitted notification's answers are all kept and shown again on reopening
**ID**: SCN-PLANTS-LIFECYCLE-003-A
- **GIVEN** the user has completed and submitted a full notification
- **WHEN** that notification is looked up as the system holds it
- **THEN** it carries the same reference number, a submitted status, and every section's answers as entered
- **WHEN** the user then reopens that notification
- **THEN** it shows as Submitted, with the same answers

### Requirement: A submitted notification is read-only until an amendment is started
**ID**: REQ-PLANTS-LIFECYCLE-004
The system MUST NOT offer any way to change a submitted notification's answers until an amendment has been started on it.

#### Scenario: A submitted notification shows no change controls
**ID**: SCN-PLANTS-LIFECYCLE-004-A
- **GIVEN** a notification has been submitted
- **WHEN** the user views it
- **THEN** the status shown is "Submitted"
- **AND** no "Change" links are shown against any answer
- **AND** no option to cancel an amendment is shown

### Requirement: Amending a submitted notification re-enters it at Overview
**ID**: REQ-PLANTS-LIFECYCLE-005
The system MUST let the user start an amendment on a submitted notification from the dashboard, re-entering the notification at Overview with editing enabled and marked "Amending".

#### Scenario: Starting an amendment opens Overview with editing enabled
**ID**: SCN-PLANTS-LIFECYCLE-005-A
- **GIVEN** a submitted notification exists
- **WHEN** the user starts an amendment on it from the dashboard
- **THEN** they land on Overview, with the notification's status shown as "Amending"

### Requirement: Resubmitting an amendment keeps the edited answers and returns the notification to Submitted
**ID**: REQ-PLANTS-LIFECYCLE-006
The system MUST let the user change an answer while amending, then resubmit through check-your-answers and the declaration, returning the notification to Submitted with the edited answer kept and the dashboard offering to amend it again.

#### Scenario: An edited answer survives resubmission
**ID**: SCN-PLANTS-LIFECYCLE-006-A
- **GIVEN** the user has started an amendment and is on check-your-answers
- **WHEN** they change an answer via its Change link and then resubmit through the declaration
- **THEN** the notification returns to Submitted, showing the edited answer
- **AND** no Change links are shown any longer
- **AND** searching the dashboard for the notification shows the option to amend it again

### Requirement: An in-progress amendment can be cancelled, discarding its edits
**ID**: REQ-PLANTS-LIFECYCLE-007
The system MUST let the user cancel an in-progress amendment, after confirming, restoring the notification to its previously submitted answers and status.

#### Scenario: A Cancel amendment option is offered while amending
**ID**: SCN-PLANTS-LIFECYCLE-007-A
- **GIVEN** a notification is being amended
- **WHEN** the user views it on the dashboard or check-your-answers
- **THEN** a "Cancel amendment" option is shown alongside its "Amending" status

#### Scenario: Choosing to cancel asks for confirmation before discarding anything
**ID**: SCN-PLANTS-LIFECYCLE-007-B
- **GIVEN** a notification is being amended
- **WHEN** the user selects "Cancel amendment"
- **THEN** a confirmation page asks whether to cancel this amendment, with options to confirm or reject

#### Scenario: Declining the confirmation keeps the amendment in progress
**ID**: SCN-PLANTS-LIFECYCLE-007-C
- **GIVEN** the user has opened the cancel-amendment confirmation page
- **WHEN** they decline to cancel
- **THEN** they return to the notification, still "Amending", with its edits intact

#### Scenario: Confirming the cancellation restores the submitted answers
**ID**: SCN-PLANTS-LIFECYCLE-007-D
- **GIVEN** the user has changed an answer while amending and then opened the cancel-amendment confirmation page
- **WHEN** they confirm the cancellation
- **THEN** a message confirms the amendment was cancelled and the submitted version restored
- **AND** the notification's status shows "Submitted" again, with the changed answer reverted and no Change links shown

### Requirement: A draft or submitted notification can be deleted after confirmation
**ID**: REQ-PLANTS-LIFECYCLE-008
The system MUST let the user delete a draft from the dashboard, and a submitted notification from check-your-answers, each after confirming, removing it from the dashboard listing.

#### Scenario: Deleting a draft removes it from the dashboard
**ID**: SCN-PLANTS-LIFECYCLE-008-A
- **GIVEN** a draft notification exists
- **WHEN** the user confirms its deletion from the dashboard
- **THEN** a message confirms the notification has been deleted
- **AND** searching the dashboard for its reference number shows no card

#### Scenario: Deleting a submitted notification removes it from the dashboard
**ID**: SCN-PLANTS-LIFECYCLE-008-B
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user confirms its deletion
- **THEN** they return to the dashboard with a deletion confirmation
- **AND** searching for its reference number shows no card
