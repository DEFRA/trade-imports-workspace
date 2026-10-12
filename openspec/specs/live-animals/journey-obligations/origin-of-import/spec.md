# Origin Obligations Specification

## Purpose

What answering the origin brings into play. The answer to whether a region of origin code is required decides whether the code is asked for: Yes asks for it as a mandatory answer, and No asks for none and clears a code already given.

## Requirements

### Requirement: Whether a region of origin code is required decides whether the code is asked for, and makes it mandatory when it is
**ID**: REQ-OB-ORIGIN-001
The system MUST ask for the region of origin code, as a mandatory answer, only when the user has answered that a region code is required. When they answer that none is required, or have not answered that question, it MUST NOT ask for a region of origin code or save one, and the notification MUST be able to be submitted without it.

#### Scenario: Answering that a region code is required makes it mandatory
**ID**: SCN-OB-ORIGIN-001-A
- **GIVEN** the user is answering the origin of the import
- **WHEN** they answer that a region of origin code is required
- **THEN** the region of origin code is asked for, and must be given before the notification can be submitted

#### Scenario: Answering that no region code is required asks for no code
**ID**: SCN-OB-ORIGIN-001-B
- **GIVEN** the user is answering the origin of the import
- **WHEN** they answer that no region of origin code is required and save
- **THEN** no region of origin code is asked for or saved
- **AND** the notification can be submitted without one

### Requirement: Answering that no region code is required clears a code already given
**ID**: REQ-OB-ORIGIN-002
The system MUST clear a region of origin code the user has already given when they change the answer so that no region code is required, so the review page shows the code as not applicable and choosing Yes again starts from an empty box.

#### Scenario: The code is cleared when the answer changes to No
**ID**: SCN-OB-ORIGIN-002-A
- **GIVEN** the user has chosen France, answered that a region code is required, given the code 75 and saved
- **WHEN** they change the answer so that no region code is required and save
- **THEN** the review page shows "Not applicable" for the region of origin code
- **AND** choosing Yes again on the origin page shows an empty region code box
