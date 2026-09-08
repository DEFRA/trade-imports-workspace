# Transporter Page Specification

## Purpose

Asks what kind of transporter is carrying the consignment, which decides what the journey asks next. The page is titled "What type of transporter will move the animals?".

## Requirements

### Requirement: The page asks the transporter type, with nothing chosen in advance
**ID**: REQ-TRANSPORTER-001
The system MUST ask the user what type of transporter is carrying the consignment, offering the available types and a save-and-continue action, and MUST leave every type unchosen when the page is first opened.

#### Scenario: The page presents its question with no type preselected
**ID**: SCN-TRANSPORTER-001-A
- **GIVEN** the user has reached the transporter page without answering it before
- **WHEN** the page loads
- **THEN** it asks the transporter type, offering the available types and a save-and-continue action
- **AND** no type is shown as chosen

### Requirement: A chosen transporter type is accepted
**ID**: REQ-TRANSPORTER-002
The system MUST accept a chosen transporter type, saving it without error.

#### Scenario: Choosing a transporter type saves without error
**ID**: SCN-TRANSPORTER-002-A
- **GIVEN** the user is on the transporter page
- **WHEN** they choose the commercial transporter type and save and continue
- **THEN** the answer is saved and no error summary is shown

### Requirement: The page explains that only a DAERA-authorised transporter is valid, not an EU-authorised one
**ID**: REQ-TRANSPORTER-003
The system MUST tell the user that authorisation issued by DAERA is valid but authorisation issued for EU transport is not, and MUST offer a link to further guidance on authorisation.

#### Scenario: The page carries the authorisation guidance and a link to more detail
**ID**: SCN-TRANSPORTER-003-A
- **GIVEN** the user is on the transporter page
- **WHEN** they read the guidance
- **THEN** it explains that DAERA authorisation is valid and EU authorisation is not
- **AND** a link is offered to further guidance
