# Origin Obligations Specification

## Purpose

What answering the origin brings into play. The region of origin code always applies; the answer to whether one is required decides whether it is mandatory, and answering that none is required clears a code already given.

## Requirements

### Requirement: Whether a region of origin code is required decides whether the code is mandatory, not whether it is asked for
**ID**: REQ-OB-ORIGIN-001
The system MUST always ask for the region of origin code, and MUST make it mandatory when the user has answered that a region code is required, and optional otherwise.

#### Scenario: Answering that a region code is required makes it mandatory
**ID**: SCN-OB-ORIGIN-001-A
- **GIVEN** the user is answering the origin of the import
- **WHEN** they answer that a region of origin code is required
- **THEN** the region of origin code must be given before the notification can be submitted

#### Scenario: Answering that no region code is required leaves it optional
**ID**: SCN-OB-ORIGIN-001-B
- **GIVEN** the user is answering the origin of the import
- **WHEN** they answer that no region of origin code is required
- **THEN** the region of origin code is still offered, but the notification can be submitted without it

### Requirement: Answering that no region code is required clears a code already given
**ID**: REQ-OB-ORIGIN-002
The system MUST clear a region of origin code the user has already given when they change the answer so that no region code is required, so the review page shows the code as not applicable and choosing Yes again starts from an empty box.

#### Scenario: The code is cleared when the answer changes to No
**ID**: SCN-OB-ORIGIN-002-A
- **GIVEN** the user has chosen France, answered that a region code is required, given the code 75 and saved
- **WHEN** they change the answer so that no region code is required and save
- **THEN** the review page shows "Not applicable" for the region of origin code
- **AND** choosing Yes again on the origin page shows an empty region code box
