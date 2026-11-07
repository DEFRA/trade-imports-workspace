# Transporters Specification

## Purpose

The add-a-transporter pages reached from the address book, and the address book's own transporter
record: its own resource, scoped to the caller's organisation, with a private-or-commercial type
and no roles.

## Requirements

### Requirement: The transporter type question asks whether the transporter is private or commercial
**ID**: REQ-INS-TRANSPORTER-001
The system MUST open the transporter type question under the caption 'Add a new transporter', headed and titled 'Choose a transporter type', with the warning 'Check the transporter list before adding new transporters to avoid duplicates.' above a radio for 'Private transporter' and one for 'Commercial' hinted 'This can only be a commercial transporter from Northern Ireland.', a 'Continue' button and a 'Back' link to the address type question.

#### Scenario: The transporter type question shows its caption, heading, warning, options and Continue
**ID**: SCN-INS-TRANSPORTER-001-A
- **GIVEN** the user has chosen 'Transporter' on 'Choose an address type'
- **WHEN** the transporter type question opens
- **THEN** it is captioned 'Add a new transporter' and headed 'Choose a transporter type'
- **AND** it warns 'Check the transporter list before adding new transporters to avoid duplicates.'
- **AND** it offers 'Private transporter' and 'Commercial', the second hinted 'This can only be a commercial transporter from Northern Ireland.', and a 'Continue' button

#### Scenario: Back returns to the address type question
**ID**: SCN-INS-TRANSPORTER-001-B
- **GIVEN** the user is on the transporter type question, reached from the address book
- **WHEN** they select 'Back'
- **THEN** 'Choose an address type' opens

### Requirement: Continuing the transporter type question with nothing chosen refuses the save
**ID**: REQ-INS-TRANSPORTER-002
The system MUST, when 'Continue' is selected with neither option chosen, keep the user on the transporter type question with 'Select what kind of transporter it is' shown against the options and in a 'There is a problem' summary whose link focuses the first option, and MUST store no transporter type.

#### Scenario: Continuing with nothing chosen shows the refusal and stores no type
**ID**: SCN-INS-TRANSPORTER-002-A
- **GIVEN** the user is on the transporter type question with neither option chosen
- **WHEN** they select 'Continue'
- **THEN** 'Select what kind of transporter it is' shows against the options and in the summary
- **AND** the summary link focuses 'Private transporter'
- **AND** no transporter type is stored

### Requirement: The chosen transporter type decides which form opens, and opening a form without its type chosen returns to the type question
**ID**: REQ-INS-TRANSPORTER-003
The system MUST open the private transporter form when 'Private transporter' is chosen and continued, and the commercial transporter form when 'Commercial' is chosen and continued. Opening either form directly without its type stored as chosen MUST open the transporter type question instead.

#### Scenario: Private opens the private form and Commercial the commercial form
**ID**: SCN-INS-TRANSPORTER-003-A
- **GIVEN** the user is on the transporter type question
- **WHEN** they choose 'Private transporter' and select 'Continue'
- **THEN** the private transporter form opens
- **GIVEN** the user is on the transporter type question
- **WHEN** they choose 'Commercial' and select 'Continue'
- **THEN** the commercial transporter form opens

#### Scenario: Opening a form without its type chosen returns to the type question
**ID**: SCN-INS-TRANSPORTER-003-B
- **GIVEN** the user has chosen no transporter type, or has chosen the other one
- **WHEN** they open the private transporter form or the commercial transporter form directly
- **THEN** the transporter type question opens instead

### Requirement: The private transporter form asks for the Standard Address Block, the contact fields and the transporter's country
**ID**: REQ-INS-TRANSPORTER-004
The system MUST ask, on the private transporter form, for name, address line 1, town or city, postcode, country, email address and phone number as mandatory, and address line 2 and county as optional, grouped under 'Address' and 'Contact details', offering every country the reference data service serves.

#### Scenario: The private transporter form shows its fields
**ID**: SCN-INS-TRANSPORTER-004-A
- **GIVEN** the user is on the private transporter form
- **WHEN** the page is shown
- **THEN** it asks for 'Name or organisation', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'County (optional)', 'Postcode or Zip code', 'Country', 'Email address' and 'Phone number'
- **AND** the address fields sit under 'Address' and the email and phone fields under 'Contact details'

### Requirement: The commercial transporter form asks for the Standard Address Block, the contact fields and an approval number, with a fixed country
**ID**: REQ-INS-TRANSPORTER-005
The system MUST ask, on the commercial transporter form, for the same fields as the private form plus a mandatory approval number, and MUST show the country fixed to Northern Ireland rather than offering a choice.

#### Scenario: The commercial transporter form shows its fields and the fixed country
**ID**: SCN-INS-TRANSPORTER-005-A
- **GIVEN** the user is on the commercial transporter form
- **WHEN** the page is shown
- **THEN** it asks for 'Name or organisation', 'Approval number', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'County (optional)', 'Postcode or Zip code', 'Email address' and 'Phone number'
- **AND** the country shows as 'Northern Ireland', fixed rather than offered as a choice

### Requirement: A commercial transporter's country is fixed to Northern Ireland, and a tampered value is refused
**ID**: REQ-INS-TRANSPORTER-006
The system MUST post the commercial transporter's country as a hidden, fixed value, and MUST refuse a save whose posted country is not Northern Ireland rather than correcting it to Northern Ireland.

#### Scenario: A tampered country is refused
**ID**: SCN-INS-TRANSPORTER-006-A
- **GIVEN** the commercial transporter form's fixed country field has been tampered with to post a different country
- **WHEN** the form is saved
- **THEN** the save is refused, naming that a commercial transporter must be in Northern Ireland
- **AND** nothing is created

### Requirement: Cancel on either transporter form returns to the address book filtered to transporters, adding nothing
**ID**: REQ-INS-TRANSPORTER-007
The system MUST, on both the private and the commercial transporter form, offer 'Cancel and return to address book' below the save control, and MUST, when it is followed, discard anything entered, create no transporter, and land on the address book filtered to the Transporter tab.

#### Scenario: Cancel with partial values entered saves nothing
**ID**: SCN-INS-TRANSPORTER-007-A
- **GIVEN** the user has entered some fields on the private transporter form, or on the commercial transporter form
- **WHEN** they follow 'Cancel and return to address book'
- **THEN** they land on the address book filtered to the Transporter tab
- **AND** no transporter holding what they entered exists in their organisation's address book

### Requirement: Saving either transporter form shows the address book's success message and the address book filtered to transporters, with the new transporter first
**ID**: REQ-INS-TRANSPORTER-008
The system MUST, on a valid save of the private or the commercial transporter form, create the transporter in the organisation's address book, show a 'Success' banner reading '<Name> added to your address book', and land on the address book filtered to the Transporter tab with the new transporter listed first, carrying its type label, its address, its approval number where it has one, and its country.

#### Scenario: Saving a private transporter shows the success banner and lists it first
**ID**: SCN-INS-TRANSPORTER-008-A
- **GIVEN** the user has filled in a valid private transporter form
- **WHEN** they save it
- **THEN** a 'Success' banner reads '<name> added to your address book'
- **AND** the address book opens on the Transporter tab with the new transporter listed first, its type reading 'Private' and its Approval number cell reading 'Not applicable'

#### Scenario: Saving a commercial transporter shows the success banner and lists it first with its approval number
**ID**: SCN-INS-TRANSPORTER-008-B
- **GIVEN** the user has filled in a valid commercial transporter form
- **WHEN** they save it
- **THEN** a 'Success' banner reads '<name> added to your address book'
- **AND** the address book opens on the Transporter tab with the new transporter listed first, its type reading 'Commercial' and its Approval number cell reading its stored approval number

### Requirement: The address book service holds a transporter as its own record, scoped to the caller's organisation, with no roles and an intrinsic private-or-commercial type
**ID**: REQ-INS-TRANSPORTER-009
The address book service MUST hold a transporter as its own record, scoped to the caller's organisation and never visible to another, carrying a private-or-commercial type and, for a commercial transporter, an approval number, and carrying no roles and no address type.

#### Scenario: A created transporter is scoped to its organisation
**ID**: SCN-INS-TRANSPORTER-009-A
- **GIVEN** a transporter is created for one organisation
- **WHEN** another organisation lists its transporters, or looks the transporter up by id
- **THEN** it is absent from the list, and the lookup by id is refused as not found

### Requirement: The address book service refuses a transporter outside the private-or-commercial shape
**ID**: REQ-INS-TRANSPORTER-010
The service MUST refuse a transporter whose type is outside private and commercial, a commercial transporter with no approval number, a private transporter carrying one, and a commercial transporter whose country is not Northern Ireland.

#### Scenario: A transporter type outside private and commercial is refused
**ID**: SCN-INS-TRANSPORTER-010-A
- **WHEN** a transporter is created with a type that is neither private nor commercial
- **THEN** the service refuses it naming the type

#### Scenario: An approval number is required for commercial and refused for private
**ID**: SCN-INS-TRANSPORTER-010-B
- **WHEN** a commercial transporter is created with no approval number
- **THEN** the service refuses it naming the approval number
- **WHEN** a private transporter is created carrying an approval number
- **THEN** the service refuses it naming the approval number

#### Scenario: A commercial transporter's country must be Northern Ireland
**ID**: SCN-INS-TRANSPORTER-010-C
- **WHEN** a commercial transporter is created with a country other than Northern Ireland
- **THEN** the service refuses it naming the country
- **WHEN** a private transporter is created with any country
- **THEN** it is accepted

### Requirement: The address book service lists, searches and tombstones an organisation's transporters
**ID**: REQ-INS-TRANSPORTER-011
The service MUST list the organisation's live transporters newest first, searchable by name, address lines, town, county, postcode and approval number and narrowable by country code and type, and MUST tombstone a deleted transporter rather than removing it.

#### Scenario: The organisation's live transporters are listed newest first
**ID**: SCN-INS-TRANSPORTER-011-A
- **GIVEN** an organisation has added two transporters, one after the other
- **WHEN** its transporters are listed
- **THEN** the more recently added transporter is returned first

#### Scenario: The list is searchable and narrowable
**ID**: SCN-INS-TRANSPORTER-011-B
- **GIVEN** an organisation's transporters include one matching a search term in its name, address lines, town, county, postcode or approval number
- **WHEN** the list is searched for that term
- **THEN** only the matching transporter is returned
- **GIVEN** transporters of both types
- **WHEN** the list is narrowed to one type or one country code
- **THEN** only the transporters of that type, or in that country, are returned

#### Scenario: A deleted transporter is tombstoned, not removed
**ID**: SCN-INS-TRANSPORTER-011-C
- **GIVEN** a transporter exists
- **WHEN** it is deleted
- **THEN** it no longer appears in the organisation's list
- **AND** it can still be fetched by its own id, marked deleted, with its details intact
