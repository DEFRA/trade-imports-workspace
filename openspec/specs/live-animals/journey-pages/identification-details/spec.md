# Identification Details Page Specification

## Purpose

The identifier records entered for the animals on a commodity line: the page that captures one record, and how many records a line may hold. The page is titled "Identification details".

## Requirements

### Requirement: The page opens with a summary of every commodity the notification holds, above one card per commodity
**ID**: REQ-IDENT-001
The system MUST show, above the identification cards, a summary table listing every chosen commodity's code, common name and declared number of animals, and MUST offer a Change link from each summary row back to commodity selection.

#### Scenario: The summary lists every commodity with a change link, ahead of the cards
**ID**: SCN-IDENT-001-A
- **GIVEN** the user has chosen more than one commodity
- **WHEN** they open the identification details page
- **THEN** a summary table lists every commodity's code, common name and declared number of animals, ahead of the identification cards
- **AND** each row offers a Change link that opens commodity selection

### Requirement: The page asks for one animal's identifiers per card, and offers two ways to save
**ID**: REQ-IDENT-002
The system MUST ask the user for the identifiers of a single animal on a card scoped to one commodity, and MUST offer both a save-and-add-another action and a save-and-finish action, so a record can be followed by the next or end the run.

#### Scenario: The page presents its identifier fields and both save routes
**ID**: SCN-IDENT-002-A
- **GIVEN** the user has reached the identification details page for a commodity
- **WHEN** the page loads
- **THEN** it asks for that animal's identifiers, offering both a save-and-add-another action and a save-and-finish action

### Requirement: Each card offers a way to change that commodity's declared animal count, and a way to add a further commodity
**ID**: REQ-IDENT-003
The system MUST offer, on every card, a Change link that opens commodity details with that commodity's number-of-animals field ready to edit, and MUST offer an Add another commodity link — reachable while there are still commodities to identify, not only once none remain — that opens commodity selection.

#### Scenario: Change number of animals opens commodity details on that line
**ID**: SCN-IDENT-003-A
- **GIVEN** the user has more than one commodity to identify
- **WHEN** they follow Change number of animals on one of the cards
- **THEN** commodity details opens, showing that commodity's currently declared count

#### Scenario: Add another commodity is offered while cards still need identifying
**ID**: SCN-IDENT-003-B
- **GIVEN** the user has a commodity still to identify
- **WHEN** they follow Add another commodity
- **THEN** commodity selection opens

### Requirement: The identifier fields start empty for each new record
**ID**: REQ-IDENT-004
The system MUST leave the identifier fields empty when the page is opened for a new record, so a previous animal's details are never carried into the next.

#### Scenario: A new identifier record opens with empty fields
**ID**: SCN-IDENT-004-A
- **GIVEN** the user has reached the identification details page for a new record
- **WHEN** the page loads
- **THEN** the identifier fields are empty

### Requirement: A valid identifier is accepted
**ID**: REQ-IDENT-005
The system MUST accept an identifier record once a valid identifier has been entered, saving it without error.

#### Scenario: Entering a valid identifier and finishing saves without error
**ID**: SCN-IDENT-005-A
- **GIVEN** the user is on the identification details page
- **WHEN** they enter a valid identifier and save and finish
- **THEN** the record is saved and no error summary is shown

### Requirement: The identifier fields offered for an animal depend on its commodity
**ID**: REQ-IDENT-006
The system MUST show only the identifier fields that a given commodity supports, MUST offer a permanent-address field (with no country field, since it is assumed to be in Great Britain) for commodities that require one, and MUST fall back to free-text identification fields, either of which alone is sufficient, for a commodity with no typed identifiers of its own.

#### Scenario: A commodity with typed identifiers shows only its own identifier fields
**ID**: SCN-IDENT-006-A
- **GIVEN** the user is entering identifier details for a commodity with its own typed identifiers and a permanent-address requirement (for example, cats)
- **WHEN** they view the entry form
- **THEN** only that commodity's identifier fields are shown, along with a permanent-address field with no country field
- **AND** identifier fields belonging to other commodities, and the free-text fallback fields, are not shown

#### Scenario: A commodity with no typed identifiers shows only the free-text fallback
**ID**: SCN-IDENT-006-B
- **GIVEN** the user is entering identifier details for a commodity with no typed identifiers of its own (for example, fish)
- **WHEN** they view the entry form
- **THEN** only the free-text identification-details and animal-description fields are shown, and no typed identifier fields are shown
- **AND** filling in either of the free-text fields alone is enough to save the record

### Requirement: Identifier records for a commodity line are capped at its declared animal count
**ID**: REQ-IDENT-007
The system MUST let the user add identifier records up to the declared number of animals for a commodity line, MUST replace the entry form with a completion message once that count is reached while keeping the saved records removable, and MUST block lowering the declared count below the number of identifier records already entered.

#### Scenario: Reaching the declared count replaces the entry form with a completion message
**ID**: SCN-IDENT-007-A
- **GIVEN** a commodity line has a declared count of two animals and one identifier record has been added
- **WHEN** the user adds the second identifier record
- **THEN** the page shows that details have been entered for all of that commodity's animals, and no further entry form or "save and add another" option is shown
- **WHEN** the user removes one of the saved records
- **THEN** the entry form reopens, ready for a replacement record

#### Scenario: Lowering the declared count below the number of identifier records is blocked
**ID**: SCN-IDENT-007-B
- **GIVEN** a commodity line has two identifier records already entered
- **WHEN** the user lowers that commodity's declared animal count to one and tries to save
- **THEN** the save is blocked with an error naming the species and explaining that identifier records must be removed, or the higher count kept
- **AND** following the error opens the identifier records for that species
- **WHEN** the user removes enough records to be at or under the new count
- **THEN** the lower count then saves successfully

### Requirement: Every animal record must carry at least one identifier
**ID**: REQ-IDENT-008
The system MUST require each animal record to carry at least one of the identifiers open to it — a microchip, passport, tattoo, ear tag, horse name, identification details or description — and MUST hold the section incomplete, naming each record at fault, until every one does.

#### Scenario: A record carrying no identifier holds the section incomplete
**ID**: SCN-IDENT-008-A
- **GIVEN** the user has added an animal record for a commodity line
- **WHEN** that record carries none of the identifiers open to it
- **THEN** the section is held incomplete, and the record at fault is named

### Requirement: Saving a record with no identifier given at all is refused, focusing the commodity's first identifier field
**ID**: REQ-IDENT-009
The system MUST refuse to save a record where every identifier field is left blank, and MUST focus the commodity's first identifier field when the resulting error is followed.

#### Scenario: An entirely blank record links to and focuses the first identifier field
**ID**: SCN-IDENT-009-A
- **GIVEN** the user is entering identifier details for a commodity and fills in none of its identifier fields
- **WHEN** they try to save
- **THEN** the save is refused
- **WHEN** they follow the resulting error
- **THEN** that commodity's first identifier field is focused, and remains empty

### Requirement: A typed identifier value has a maximum length
**ID**: REQ-IDENT-010
The system MUST reject a typed identifier value that is too long, MUST link the resulting error to and focus the field, and MUST preserve the over-length value.

#### Scenario: An over-length identifier value blocks the save with the value preserved
**ID**: SCN-IDENT-010-A
- **GIVEN** the user enters a typed identifier value that is too long
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field
- **AND** the over-length value is still shown

### Requirement: The permanent address asks for eight named fields, six mandatory and two optional
**ID**: REQ-IDENT-011
The system MUST ask for name or organisation name, address line 1, address line 2, town or city, county, postal or zip code, telephone number and email address, with only address line 2 and county optional, and MUST hint that an international telephone number should include its country code.

#### Scenario: Every field is asked for, with two marked optional
**ID**: SCN-IDENT-011-A
- **GIVEN** the user is entering a permanent address for an animal identifier
- **WHEN** the form is shown
- **THEN** all eight fields are asked for, with address line 2 and county alone marked optional
- **AND** the telephone number field hints that an international number should include its country code

### Requirement: The permanent address warns that a false address is fraud, and that it may be checked
**ID**: REQ-IDENT-012
The system MUST warn the user, on the permanent-address form, that giving a false address is fraud, and that the Animal and Plant Health Agency may check it.

#### Scenario: The permanent-address form carries the fraud warning
**ID**: SCN-IDENT-012-A
- **GIVEN** the user is entering a permanent address for an animal identifier
- **WHEN** the form is shown
- **THEN** it warns that a false address is fraud, and that the address may be checked

### Requirement: A blank mandatory permanent-address field is refused, and an over-length one is rejected, without losing the rest of the record
**ID**: REQ-IDENT-013
The system MUST refuse to save a permanent address with a mandatory field left blank, MUST reject a field whose value exceeds its maximum length, and in both cases MUST link the resulting error to and focus the field at fault while preserving every other field already entered on the record, including its identifiers.

#### Scenario: A blank mandatory address field blocks the save without losing the identifier already entered
**ID**: SCN-IDENT-013-A
- **GIVEN** the user has entered a valid identifier and a permanent address with one mandatory field left blank
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses the blank field
- **AND** the identifier already entered is still shown

#### Scenario: An over-length address field blocks the save with its value preserved
**ID**: SCN-IDENT-013-B
- **GIVEN** the user enters a value exceeding an address field's maximum length
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field, with the over-length value still shown
- **AND** the identifier already entered is still shown

### Requirement: The saved-animals table is headed by every identifier the commodity declares, whether or not a given record filled it in
**ID**: REQ-IDENT-014
The system MUST head the saved-animals table with a column for every identifier the commodity declares, not only the ones a particular record happens to hold, naming each row by its species and its number among that commodity's records.

#### Scenario: The table heads every identifier the commodity declares
**ID**: SCN-IDENT-014-A
- **GIVEN** the user has saved one record for a commodity that declares more than one identifier
- **WHEN** they view the saved-animals table
- **THEN** it is headed with a column for every identifier that commodity declares, not only the one the saved record used

### Requirement: A record can be removed from the saved-animals table
**ID**: REQ-IDENT-015
The system MUST let the user remove a saved animal record, taking it out of the table.

#### Scenario: Removing a saved record takes it out of the table
**ID**: SCN-IDENT-015-A
- **GIVEN** the user has a saved animal record
- **WHEN** they remove it
- **THEN** it no longer appears in the saved-animals table

### Requirement: An add submitted after the declared count is already reached is refused, naming the cap
**ID**: REQ-IDENT-016
The system MUST refuse an attempt to add a further record once a commodity's declared count has already been reached, MUST show an error naming that count, and MUST return the user to that commodity's card when the error is followed.

#### Scenario: An add beyond the reached cap is refused and returns to the card
**ID**: SCN-IDENT-016-A
- **GIVEN** a commodity's declared animal count has already been reached
- **WHEN** a further add is submitted for it regardless
- **THEN** it is refused, with an error naming the declared count
- **WHEN** the error is followed
- **THEN** that commodity's own card is shown

### Requirement: A heading reports progress toward the declared count for a commodity still being entered
**ID**: REQ-IDENT-017
The system MUST show a heading reporting how many of a commodity's declared animal count have been entered so far, for as long as its identification is incomplete.

#### Scenario: The heading reports progress and updates as records are added or removed
**ID**: SCN-IDENT-017-A
- **GIVEN** a commodity has a declared count greater than the number of records entered for it
- **WHEN** the user views its card
- **THEN** a heading reports how many of the declared count have been entered so far
- **AND** that count changes as records are added to or removed from the commodity

### Requirement: The back link returns to Overview
**ID**: REQ-IDENT-018
The system MUST return the user to Overview when they follow the back link from the identification details page.

#### Scenario: The back link opens Overview
**ID**: SCN-IDENT-018-A
- **GIVEN** the user is on the identification details page
- **WHEN** they follow the back link
- **THEN** Overview is shown
