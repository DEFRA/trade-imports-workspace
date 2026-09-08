# Obligation Scope and Status Specification

## Purpose

How an obligation comes to apply to a notification, and what becomes of its answer when it stops applying. The rules for particular pages sit beside this one, each named for the page whose answers drive them.

## Requirements

### Requirement: An obligation either applies to a notification or does not, and when it applies it is either mandatory or optional
**ID**: REQ-OB-SCOPE-001
The system MUST decide, for every obligation, whether it applies to the notification in hand, and MUST give each applying obligation a status of either mandatory or optional. An obligation that does not apply MUST NOT be asked for, and MUST NOT hold the notification back from submission.

#### Scenario: An obligation that does not apply is neither asked for nor required
**ID**: SCN-OB-SCOPE-001-A
- **GIVEN** a notification whose answers do not bring an obligation into play
- **WHEN** the user works through the journey and reaches check your answers
- **THEN** that obligation is not asked for anywhere
- **AND** its absence does not stop the notification being submitted

### Requirement: An obligation that stops applying has its answer discarded
**ID**: REQ-OB-SCOPE-002
The system MUST discard the stored answer to an obligation once the notification's answers no longer bring it into play, so that if it later applies again it is asked afresh rather than re-offering the earlier answer.

#### Scenario: An answer is discarded when the obligation stops applying
**ID**: SCN-OB-SCOPE-002-A
- **GIVEN** the user has answered an obligation that applied because of an earlier choice
- **WHEN** they change that earlier choice so the obligation no longer applies
- **THEN** the stored answer is discarded
- **WHEN** they change the earlier choice back, so it applies again
- **THEN** the obligation is asked with nothing filled in

### Requirement: An obligation that only changes status keeps its answer
**ID**: REQ-OB-SCOPE-003
The system MUST keep the stored answer to an obligation that continues to apply and merely changes between mandatory and optional, discarding an answer only where the obligation stops applying altogether.

#### Scenario: An answer survives a change of status
**ID**: SCN-OB-SCOPE-003-A
- **GIVEN** the user has answered an obligation that applies as mandatory
- **WHEN** they change an earlier answer so that it applies as optional instead
- **THEN** the answer they gave is still held, and still shown

### Requirement: A task row reflects only what applies to the notification in hand
**ID**: REQ-OB-SCOPE-004
The system MUST judge a task row's status against the obligations that apply to that notification, counting a row as ready when its obligations are fulfilled, do not apply, or are optional.

#### Scenario: A row whose obligations do not apply does not hold submission back
**ID**: SCN-OB-SCOPE-004-A
- **GIVEN** a notification with a task row whose obligations do not apply to it
- **WHEN** the user reaches check your answers
- **THEN** that row does not hold the notification back from being submitted
