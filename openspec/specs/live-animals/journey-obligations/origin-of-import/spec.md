# Origin Obligations Specification

## Purpose

What answering the origin brings into play. The journey's one retain-value gate: the region of origin code always applies, and the answer changes only whether it is mandatory.

## Requirements

### Requirement: Whether a region of origin code is required decides whether the code is mandatory, not whether it is asked for
The system MUST always ask for the region of origin code, and MUST make it mandatory when the user has answered that a region code is required, and optional otherwise.

#### Scenario: Answering that a region code is required makes it mandatory
- **GIVEN** the user is answering the origin of the import
- **WHEN** they answer that a region of origin code is required
- **THEN** the region of origin code must be given before the notification can be submitted

#### Scenario: Answering that no region code is required leaves it optional
- **GIVEN** the user is answering the origin of the import
- **WHEN** they answer that no region of origin code is required
- **THEN** the region of origin code is still offered, but the notification can be submitted without it

### Requirement: A region of origin code already given is kept when it becomes optional
The system MUST keep a region of origin code the user has already given when they change the answer so that it is no longer required, since the code continues to apply and only its status changes.

#### Scenario: The code survives being made optional
- **GIVEN** the user has answered that a region code is required and given the code
- **WHEN** they change the answer so that no region code is required
- **THEN** the code they gave is still held, and still shown
