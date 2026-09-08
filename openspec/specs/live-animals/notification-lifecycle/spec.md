# Notification Lifecycle Specification

## Purpose

A notification's life from draft through submission, amendment and deletion — the statuses it moves through, what may be changed at each, and the durability of its answers.

## Requirements

### Requirement: A notification moves through a fixed lifecycle as the user acts on it
The system MUST move a notification through Draft, Submitted, Amend, and Deleted as it is created, submitted, amended, and removed, and MUST treat a repeated delete as idempotent. The state recorded as Amend MUST be shown to the user as "Amending" wherever a notification's state is displayed.

#### Scenario: A full lifecycle walk moves the notification through each status in turn
- **GIVEN** a new notification has just been created
- **WHEN** it is submitted, then an amendment is started on it, then that amendment is cancelled, then it is soft-deleted
- **THEN** the notification's status is Draft, then Submitted, then Amend, then Submitted again, then Deleted, at each corresponding step

#### Scenario: Deleting an already-deleted notification is idempotent
- **GIVEN** a notification has already been soft-deleted
- **WHEN** it is soft-deleted again
- **THEN** it remains Deleted and the repeat delete does not error

### Requirement: Copying a notification always produces a new, independent draft, carrying the source's answers
The system MUST create a distinct new draft notification each time a notification is copied, MUST carry over the answers already given on the source, and MUST leave the original unchanged. Both the source and the copy MUST remain separately listed afterwards.

#### Scenario: Copying a notification twice produces two distinct drafts
- **GIVEN** a notification exists
- **WHEN** it is copied twice
- **THEN** two new notifications are created, each with its own reference number, both in Draft status
- **AND** the original notification is unchanged by either copy

#### Scenario: A copy carries over the source's answers
- **GIVEN** a notification has an answer already given on one of its tasks
- **WHEN** it is copied
- **THEN** the new draft shows that task as already answered, carrying the same answer
- **AND** both the source and the copy are listed separately afterwards

### Requirement: A draft notification's answers are recorded as they are saved, and survive being reopened
The system MUST record a notification's answers as each is saved, keeping it in a draft state until it is submitted, so that reopening an unfinished notification shows everything already entered.

#### Scenario: An unfinished notification is recorded as a draft under its own reference number
- **GIVEN** the user has started a notification and answered at least one section, without submitting
- **WHEN** that notification is looked up as the system holds it
- **THEN** it exists under the same reference number, still in a draft state, carrying the answers entered so far

### Requirement: A submitted notification keeps every answer entered, and reopens showing them unchanged
The system MUST keep every section's answers when a notification is submitted, and MUST show the same answers, under a Submitted status, when it is reopened.

#### Scenario: A submitted notification's answers are all kept and shown again on reopening
- **GIVEN** the user has completed and submitted a full notification
- **WHEN** that notification is looked up as the system holds it
- **THEN** it carries the same reference number, a submitted status, and every section's answers as entered
- **WHEN** the user then reopens that notification
- **THEN** it shows as Submitted, with the same answers

### Requirement: A submitted notification is read-only until an amendment is started
The system MUST NOT offer any way to change a submitted notification's answers until an amendment has been started on it.

#### Scenario: A submitted notification shows no change controls
- **GIVEN** a notification has been submitted
- **WHEN** the user views it
- **THEN** the status shown is "Submitted"
- **AND** no "Change" links are shown against any answer
- **AND** no option to cancel an amendment is shown

### Requirement: Amending a submitted notification re-enters it at Overview
The system MUST let the user start an amendment on a submitted notification from the dashboard, re-entering the notification at Overview with editing enabled and marked "Amending".

#### Scenario: Starting an amendment opens Overview with editing enabled
- **GIVEN** a submitted notification exists
- **WHEN** the user starts an amendment on it from the dashboard
- **THEN** they land on Overview, with the notification's status shown as "Amending"

### Requirement: Resubmitting an amendment keeps the edited answers and returns the notification to Submitted
The system MUST let the user change an answer while amending, then resubmit through check-your-answers and the declaration, returning the notification to Submitted with the edited answer kept and the dashboard offering to amend it again.

#### Scenario: An edited answer survives resubmission
- **GIVEN** the user has started an amendment and is on check-your-answers
- **WHEN** they change an answer via its Change link and then resubmit through the declaration
- **THEN** the notification returns to Submitted, showing the edited answer
- **AND** no Change links are shown any longer
- **AND** searching the dashboard for the notification shows the option to amend it again

### Requirement: An in-progress amendment can be cancelled, discarding its edits
The system MUST let the user cancel an in-progress amendment, after confirming, restoring the notification to its previously submitted answers and status.

#### Scenario: A Cancel amendment option is offered while amending
- **GIVEN** a notification is being amended
- **WHEN** the user views it
- **THEN** a "Cancel amendment" option is shown alongside its "Amending" status

#### Scenario: Choosing to cancel asks for confirmation before discarding anything
- **GIVEN** a notification is being amended
- **WHEN** the user selects "Cancel amendment"
- **THEN** a confirmation page explains that changes made since amending began will be discarded and the submitted version restored, with options to confirm or reject
- **AND** a back link returns to check-your-answers without cancelling anything

#### Scenario: Declining the confirmation keeps the amendment in progress
- **GIVEN** the user has opened the cancel-amendment confirmation page
- **WHEN** they decline to cancel
- **THEN** they return to the notification, still "Amending", with its edits and Change links intact

#### Scenario: Confirming the cancellation restores the submitted answers
- **GIVEN** the user has changed an answer while amending and then opened the cancel-amendment confirmation page
- **WHEN** they confirm the cancellation
- **THEN** a message confirms the amendment was cancelled and the submitted version restored
- **AND** the notification's status shows "Submitted" again, with the changed answer reverted and no Change links shown
