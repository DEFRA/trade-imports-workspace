# Transporter Type Page Specification

## Purpose

Asks what kind of transporter is being added, so the journey knows which form to show next. The page is reached only from "Add a transporter" on the transporter list (`live-animals/journey-pages/transporter`, which carries the full DAERA/EU authorisation guidance) — it is no longer a mandatory step of the transport section itself. The page is titled "Choose a transporter type".

## Requirements

### Requirement: The page asks the transporter type, private listed first and unhinted, with nothing chosen in advance
**ID**: REQ-TRANSPORTER-TYPE-001
The system MUST ask the user what type of transporter is being added, offering Private first with no further explanation and Commercial second, and MUST leave every type unchosen when the page is first opened.

#### Scenario: The page presents its question with no type preselected
**ID**: SCN-TRANSPORTER-TYPE-001-A
- **GIVEN** the user has selected "Add a transporter" from the transporter list
- **WHEN** the page loads
- **THEN** it asks the transporter type, offering Private then Commercial and a Continue action
- **AND** no type is shown as chosen

### Requirement: A chosen transporter type is accepted
**ID**: REQ-TRANSPORTER-TYPE-002
The system MUST accept a chosen transporter type, saving it without error.

#### Scenario: Choosing a transporter type saves without error
**ID**: SCN-TRANSPORTER-TYPE-002-A
- **GIVEN** the user is on the transporter type page
- **WHEN** they choose the commercial transporter type and continue
- **THEN** the answer is saved and no error summary is shown

### Requirement: The commercial option warns it can only be a Northern Ireland transporter
**ID**: REQ-TRANSPORTER-TYPE-003
The system MUST tell the user, alongside the Commercial option, that a commercial transporter added this way can only be based in Northern Ireland.

#### Scenario: The commercial option carries the Northern Ireland condition
**ID**: SCN-TRANSPORTER-TYPE-003-A
- **GIVEN** the user is on the transporter type page
- **WHEN** they read the Commercial option
- **THEN** it says this can only be a commercial transporter from Northern Ireland

### Requirement: The page warns the trader to check the list for duplicates, under a new-transporter caption
**ID**: REQ-TRANSPORTER-TYPE-004
The system MUST show this page under a caption identifying it as part of adding a new transporter, and MUST warn the trader to check the transporter list before adding a new record, to avoid duplicates.

#### Scenario: The page carries the new-transporter caption and duplicate-check warning
**ID**: SCN-TRANSPORTER-TYPE-004-A
- **GIVEN** the user has selected "Add a transporter" from the transporter list
- **WHEN** the type question is shown
- **THEN** it is captioned to show it is part of adding a new transporter
- **AND** it warns the trader to check the transporter list before adding a new transporter, to avoid duplicates

### Requirement: A transporter type must be chosen
**ID**: REQ-TRANSPORTER-TYPE-005
The system MUST refuse to continue when no transporter type is chosen, or when the submitted type is one the page does not offer, keeping the user on the page with the message "Select a transporter type" in a "There is a problem" summary linking to the first option and shown inline above the radios, and MUST leave the transporter type already saved on the notification unchanged.

#### Scenario: Continuing with nothing chosen is refused
**ID**: SCN-TRANSPORTER-TYPE-005-A
- **GIVEN** the user is on the transporter type page
- **WHEN** they continue without choosing a type
- **THEN** they stay on the page with "Select a transporter type" in a "There is a problem" summary linking to the first option and shown inline above the radios
- **AND** the transporter type already saved on the notification, if any, is unchanged

#### Scenario: A submitted type the page does not offer is refused
**ID**: SCN-TRANSPORTER-TYPE-005-B
- **GIVEN** the user is on the transporter type page
- **WHEN** the submitted transporter type is neither Private nor Commercial
- **THEN** they stay on the page with "Select a transporter type" in a "There is a problem" summary linking to the first option and shown inline above the radios
- **AND** the transporter type already saved on the notification, if any, is unchanged
