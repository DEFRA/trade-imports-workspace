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

### Requirement: A transporter has its own details page, at its own URL, offering to edit or delete it
**ID**: REQ-INS-TRANSPORTER-012
The system MUST show a transporter's own record on its own page, at a URL that names the transporter rather than an address, listing each field the transporter holds against its label: the Standard Address Block, the contact fields, the transporter's type, its country, and its approval number for a commercial transporter. It MUST leave out an optional field the transporter holds no value for, never as a blank row, and MUST NOT show an approval number row for a private transporter, which cannot hold one. It MUST offer to edit and to delete that transporter, and a way back to the address book filtered to the Transporter tab, or to the page it was opened from. A transporter that is not live in the organisation's address book MUST return the user to the address book rather than show a page.

#### Scenario: The View link on a transporter row opens that transporter's own page
**ID**: SCN-INS-TRANSPORTER-012-A
- **GIVEN** the organisation's address book holds a transporter
- **WHEN** the user follows the View link on its row in the Transporter tab
- **THEN** a page headed with that transporter's name shows its record
- **AND** the URL names the transporter, not an address

#### Scenario: A commercial transporter's page shows its approval number and a private transporter's does not
**ID**: SCN-INS-TRANSPORTER-012-B
- **GIVEN** the user opens a commercial transporter
- **WHEN** the page is shown
- **THEN** its approval number is listed against its label, and its type reads 'Commercial'
- **GIVEN** the user opens a private transporter
- **WHEN** the page is shown
- **THEN** no approval number row is shown, and its type reads 'Private'

#### Scenario: The page offers to edit or delete the transporter being viewed
**ID**: SCN-INS-TRANSPORTER-012-C
- **GIVEN** the user is viewing a transporter
- **WHEN** the page is shown
- **THEN** an action to edit and an action to delete that same transporter are both offered

#### Scenario: Back from a transporter's page returns to the address book on the Transporter tab
**ID**: SCN-INS-TRANSPORTER-012-D
- **GIVEN** the user is viewing a transporter opened without a return
- **WHEN** they select Back
- **THEN** they return to the address book filtered to the Transporter tab

#### Scenario: A transporter that is not live returns the user to the address book
**ID**: SCN-INS-TRANSPORTER-012-E
- **GIVEN** an id that holds no live transporter in the organisation's address book, whether deleted, never created, or belonging to another organisation
- **WHEN** the user opens the transporter page for it
- **THEN** they are returned to the address book, and the attempt is logged once

### Requirement: Editing a transporter replaces the whole record, keeping its type, and refuses an edit of one that is not live
**ID**: REQ-INS-TRANSPORTER-013
The system MUST let the user edit a transporter from its own page, on a form asking for the same fields its add form asked for, holding the stored values, and MUST keep the transporter's type: the type question is not asked again, a private transporter stays private and a commercial one stays commercial, with a commercial transporter's country still fixed to Northern Ireland and its approval number still required. Saving MUST replace the whole record, clearing any optional field left blank, show a 'Success' banner reading '<Name> updated in your address book', and land on the address book filtered to the Transporter tab. Cancelling MUST discard the changes, leaving the stored transporter as it was. An edit of a transporter that is not live in the organisation's address book MUST return the user to the address book and change nothing.

#### Scenario: The edit form opens holding the stored values and does not ask the type again
**ID**: SCN-INS-TRANSPORTER-013-A
- **GIVEN** the organisation's address book holds a private transporter
- **WHEN** the user opens its edit form
- **THEN** every field holds the stored value
- **AND** no transporter type question is asked

#### Scenario: Saving an edit replaces the record and confirms it by name
**ID**: SCN-INS-TRANSPORTER-013-B
- **GIVEN** the user is editing a transporter and changes its name
- **WHEN** they save it
- **THEN** a 'Success' banner reads '<new name> updated in your address book'
- **AND** the address book opens on the Transporter tab showing the transporter under its new name

#### Scenario: An optional field left blank on an edit is cleared
**ID**: SCN-INS-TRANSPORTER-013-C
- **GIVEN** a transporter holding an address line 2 and a county
- **WHEN** the user clears both on the edit form and saves
- **THEN** the stored transporter holds neither, and its page shows no row for either

#### Scenario: A commercial transporter's fixed country and required approval number hold on edit
**ID**: SCN-INS-TRANSPORTER-013-D
- **GIVEN** the user is editing a commercial transporter
- **WHEN** the form is shown
- **THEN** its country is fixed to Northern Ireland and cannot be changed
- **WHEN** they clear the approval number and save
- **THEN** the save is refused, naming the approval number

#### Scenario: Cancelling an edit leaves the stored transporter as it was
**ID**: SCN-INS-TRANSPORTER-013-E
- **GIVEN** the user has changed a field on a transporter's edit form without saving
- **WHEN** they cancel
- **THEN** the stored transporter is unchanged, and they return to the address book on the Transporter tab

#### Scenario: Editing a transporter that is not live returns the user to the address book
**ID**: SCN-INS-TRANSPORTER-013-F
- **GIVEN** an id that holds no live transporter in the organisation's address book
- **WHEN** the user opens or submits its edit form
- **THEN** they are returned to the address book, nothing is changed, and the attempt is logged once

### Requirement: Deleting a transporter asks for confirmation, summarising it, and tombstones it
**ID**: REQ-INS-TRANSPORTER-014
The system MUST ask the user to confirm before deleting a transporter, on a page summarising the transporter it is about to delete so they can see they have the right one. Confirming MUST tombstone the transporter rather than remove it, show a 'Success' banner reading '<Name> deleted from your address book', and land on the address book filtered to the Transporter tab with the transporter gone from the list. Cancelling MUST leave the transporter in the address book. A delete of a transporter that is not live in the organisation's address book MUST return the user to the address book and change nothing.

#### Scenario: The delete page summarises the transporter before it is deleted
**ID**: SCN-INS-TRANSPORTER-014-A
- **GIVEN** the user has chosen to delete a transporter
- **WHEN** the confirmation page is shown
- **THEN** it names the transporter and summarises its details
- **AND** it offers an action to confirm the deletion and a way to cancel

#### Scenario: Confirming the deletion removes it from the list and confirms it by name
**ID**: SCN-INS-TRANSPORTER-014-B
- **GIVEN** the user is on a transporter's delete confirmation page
- **WHEN** they confirm the deletion
- **THEN** a 'Success' banner reads '<name> deleted from your address book'
- **AND** the address book opens on the Transporter tab without that transporter

#### Scenario: Cancelling the deletion leaves the transporter in the address book
**ID**: SCN-INS-TRANSPORTER-014-C
- **GIVEN** the user is on a transporter's delete confirmation page
- **WHEN** they cancel
- **THEN** the transporter is still in the address book on the Transporter tab

#### Scenario: Deleting a transporter that is not live returns the user to the address book
**ID**: SCN-INS-TRANSPORTER-014-D
- **GIVEN** an id that holds no live transporter in the organisation's address book
- **WHEN** the user opens or submits its delete confirmation
- **THEN** they are returned to the address book, nothing is changed, and the attempt is logged once
