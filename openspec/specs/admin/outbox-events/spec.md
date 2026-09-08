# Admin Outbox Events Specification

## Purpose

An operator inspecting and replaying a notification's outbox events. What the system records at each transition is specified under `live-animals/notification-events`.

## Requirements

### Requirement: An operator can find a notification's outbox events by its reference number
The system MUST let an operator search the outbox events by a notification's exact reference number, show the matching events with their type and timestamp, and let the operator view an event's full detail, and MUST show an empty state naming the reference number when nothing matches.

#### Scenario: Searching by reference number shows that notification's outbox events
- **GIVEN** a notification has been submitted
- **WHEN** the operator searches outbox events by its reference number
- **THEN** the matching event is listed, showing its event type and a timestamp
- **AND** viewing that event's detail shows its full record, including the notification's reference number and its status at that point

#### Scenario: An unknown reference number shows an empty state
- **GIVEN** no notification exists with the searched reference number
- **WHEN** the operator searches outbox events by that reference number
- **THEN** an empty state is shown, naming the reference number that was searched

### Requirement: An operator can replay a notification's outbox events
The system MUST let an operator republish all of a notification's outbox events, show a success banner once done, and MUST leave the same events listed afterwards, and MUST record every replay in the audit trail.

#### Scenario: Replaying a notification's events shows a success banner and does not change what is recorded
- **GIVEN** a notification's outbox events are listed
- **WHEN** the operator replays them
- **THEN** a success banner confirms all outbox events have been re-published
- **AND** the same events are still listed afterwards
- **AND** the audit trail records a successful replay action, naming that notification and the number of events replayed
