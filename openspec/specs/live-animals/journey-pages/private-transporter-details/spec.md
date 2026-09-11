# Private Transporter Details Page Specification

## Purpose

Asks for the name and address of a private transporter, keyed in by hand rather than chosen from the address book. Reached only via "Add a transporter" from the transporter list, after choosing "Private" on the type question — not as a mandatory branch of the transport section itself. The address itself is governed by `live-animals/addresses`. The page is titled "Add private transporter".

## Requirements

### Requirement: The page asks for the transporter's name and full contact address, with two fields optional
**ID**: REQ-PRIVATE-TRANS-001
The system MUST ask the user for the private transporter's name or organisation name, and for a full address — address line 1, an optional address line 2, town or city, an optional county, postal or zip code, country, telephone number and email address — offering a save-and-continue action.

#### Scenario: The page presents its name and address questions, marking two fields optional
**ID**: SCN-PRIVATE-TRANS-001-A
- **GIVEN** the user has chosen the private transporter type and reached the private transporter details page
- **WHEN** the page loads
- **THEN** it asks for a name or organisation name, address line 1, address line 2, a town or city, a county, a postal or zip code, a country, a telephone number and an email address, offering a save-and-continue action
- **AND** address line 2 and county are marked optional

### Requirement: A complete set of private transporter details is saved as one record and reloads into the form
**ID**: REQ-PRIVATE-TRANS-002
The system MUST save the transporter's name and address together as a single record once every mandatory field is given, MUST return the user to Overview, and MUST show the saved values again in the form when they return to the page.

#### Scenario: Completing the details saves them and returns to Overview
**ID**: SCN-PRIVATE-TRANS-002-A
- **GIVEN** the user is on the private transporter details page with the name entered
- **WHEN** they complete every mandatory address field and save and continue
- **THEN** they return to Overview

#### Scenario: Returning to the page shows the saved details in the form
**ID**: SCN-PRIVATE-TRANS-002-B
- **GIVEN** the user has saved a complete set of private transporter details
- **WHEN** they return to the private transporter details page
- **THEN** the name and country they saved are shown in the form

### Requirement: A blank mandatory field, an over-length one, and an invalid country are each rejected in their own way
**ID**: REQ-PRIVATE-TRANS-003
The system MUST reject a blank mandatory field, a field over its maximum length, or a country not in the offered list, in each case linking the resulting error to and focusing the field at fault while preserving every other field already entered. An over-length value MUST be preserved so it can be edited down; an invalid country MUST instead be cleared to empty.

#### Scenario: A blank mandatory field blocks the save without losing the rest of the address
**ID**: SCN-PRIVATE-TRANS-003-A
- **GIVEN** the user has left one mandatory field blank in the private transporter's address
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field, and every other field still shows what was entered

#### Scenario: An over-length field blocks the save with its value preserved
**ID**: SCN-PRIVATE-TRANS-003-B
- **GIVEN** the user has entered a value longer than a field's maximum length in the private transporter's address
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field, and the over-length value is still shown

#### Scenario: An invalid country blocks the save and clears, rather than preserving
**ID**: SCN-PRIVATE-TRANS-003-C
- **GIVEN** the user has entered a country not in the offered list for the private transporter's address, alongside valid values in every other field
- **WHEN** they try to save
- **THEN** the save is blocked, the country field is cleared to empty, and every other field still shows what was entered

### Requirement: A completely blank private transporter record is accepted
**ID**: REQ-PRIVATE-TRANS-004
The system MUST accept the page being saved with every field left blank, without error, since adding a private transporter this way is itself optional until the trader starts filling it in.

#### Scenario: Saving the page with nothing entered succeeds
**ID**: SCN-PRIVATE-TRANS-004-A
- **GIVEN** the user is on the private transporter details page with every field blank
- **WHEN** they save and continue
- **THEN** the save succeeds without an error summary
