# Identification Details Page Specification

## Purpose

The identifier records entered for the animals of each species on a consignment: the page that groups identification into one section per commodity with one card per species, captures one record at a time, and limits how many records a species may hold. The page is titled "Identification details".

## Requirements

### Requirement: The page opens with a summary of every commodity the notification holds, above one section per commodity
**ID**: REQ-IDENT-001
The system MUST show, above the identification sections, a summary table with one row per chosen commodity — one row per chosen species under commodity code 01061900 — listing its code, the Latin names of its species and its number of animals (the total of that commodity's species), and MUST offer a Change link from each summary row back to commodity selection.

#### Scenario: The summary lists every commodity with its species and a change link, ahead of the sections
**ID**: SCN-IDENT-001-A
- **GIVEN** the user has chosen more than one commodity
- **WHEN** they open the identification details page
- **THEN** a summary table headed Commodity code, Species and Number of animals lists every commodity, ahead of the identification sections
- **AND** each row offers a Change link that opens commodity selection

#### Scenario: Two species of one commodity share a row listing both Latin names and their total
**ID**: SCN-IDENT-001-B
- **GIVEN** the user has chosen two species under one commodity (for example, two cattle species with 2 and 3 animals)
- **WHEN** they open the identification details page
- **THEN** the summary shows one row for that commodity code, listing both Latin names
- **AND** its number of animals is the total of the two species

#### Scenario: Each species under commodity code 01061900 has its own row
**ID**: SCN-IDENT-001-C
- **GIVEN** the user has chosen a species under commodity code 01061900 (for example, a cat) and a species under another commodity
- **WHEN** they open the identification details page
- **THEN** the summary shows that species on its own row, with its Latin name and its own number of animals

### Requirement: The page asks for one animal's identifiers per species card, and the card's save button says what is left on the line
**ID**: REQ-IDENT-002
The system MUST ask the user for the identifiers of a single animal on a card scoped to one species within its commodity section, and MUST label the card's own save button for what the line still owes — a save-and-add-another action while more than one animal is outstanding, a save-and-finish action on the last outstanding animal, and no card button at all on a line of one animal, whose record the page's own Save and continue captures.

#### Scenario: A line of several animals offers add-another, then finish on the last
**ID**: SCN-IDENT-002-A
- **GIVEN** the user has reached the identification details page for a commodity line declared as more than one animal
- **WHEN** the page loads, and again after each record is saved
- **THEN** it asks for that animal's identifiers, offering a save-and-add-another action while more than one animal is outstanding
- **AND** on the last outstanding animal the same button reads save-and-finish instead

#### Scenario: A line of one animal has no card button and saves on Save and continue
**ID**: SCN-IDENT-002-B
- **GIVEN** the user has reached the identification details page for a commodity line declared as one animal
- **WHEN** the page loads
- **THEN** it asks for that animal's identifiers, with no save-and-add-another or save-and-finish action on the card
- **AND** the page's own Save and continue is offered, and saves the record

### Requirement: Each card offers a way to change that species' declared animal count, and a way to add a further commodity
**ID**: REQ-IDENT-003
The system MUST offer, on every species card, a Change number of animals link, naming that species to screen readers, that opens commodity details with that species' number-of-animals field ready to edit, and MUST offer an Add another commodity link — reachable while there are still commodities to identify, not only once none remain — that opens commodity selection.

#### Scenario: Change number of animals opens commodity details on that line
**ID**: SCN-IDENT-003-A
- **GIVEN** the user has more than one species to identify
- **WHEN** they follow Change number of animals on one species' card
- **THEN** the link's accessible name names that species
- **AND** commodity details opens, showing that species' currently declared count

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

#### Scenario: Entering a valid identifier and saving succeeds without error
**ID**: SCN-IDENT-005-A
- **GIVEN** the user is on the identification details page
- **WHEN** they enter a valid identifier and save, with Save and continue on a line of one animal or the card's save-and-finish on the last of several
- **THEN** the record is saved and no error summary is shown

### Requirement: The identifier fields offered for an animal depend on its commodity, and a commodity with none of its own gets no panel
**ID**: REQ-IDENT-006
The system MUST show only the identifier fields that a given commodity supports, MUST offer a permanent-address field (with no country field, since it is assumed to be in Great Britain) for commodities that require one, and MUST show no identifier panel at all — no typed fields and no free-text fallback — for a commodity with none of its own.

#### Scenario: A commodity with typed identifiers shows only its own identifier fields
**ID**: SCN-IDENT-006-A
- **GIVEN** the user is entering identifier details for a commodity with its own typed identifiers and a permanent-address requirement (for example, cats)
- **WHEN** they view the entry form
- **THEN** only that commodity's identifier fields are shown, along with a permanent-address field with no country field
- **AND** identifier fields belonging to other commodities are not shown

#### Scenario: A commodity with no identifier of its own earns no panel
**ID**: SCN-IDENT-006-B
- **GIVEN** a commodity line whose commodity carries no identifier of its own (for example, ostriches)
- **WHEN** the user views the identification details page
- **THEN** that line has no identification card at all — no typed fields and no free-text fields

### Requirement: Identifier records for a species are capped at its declared animal count
**ID**: REQ-IDENT-007
The system MUST let the user add identifier records up to the declared number of animals for a species, MUST leave only the saved-animals table on its card once that count is reached — no entry form, no card button and no completion message — keeping the saved records removable, MUST keep an over-count message on the card when its records exceed a lowered count, and MUST block lowering the declared count below the number of identifier records already entered.

#### Scenario: Reaching the declared count leaves only the saved-animals table
**ID**: SCN-IDENT-007-A
- **GIVEN** a species has a declared count of two animals and one identifier record has been added
- **WHEN** the user adds the second identifier record
- **THEN** that species' card shows only its saved-animals table with both records removable, and no entry form, "save and add another" option or completion message
- **WHEN** the user removes one of the saved records
- **THEN** the entry form reopens, ready for a replacement record

#### Scenario: Lowering the declared count below the number of identifier records is blocked
**ID**: SCN-IDENT-007-B
- **GIVEN** a species has two identifier records already entered
- **WHEN** the user lowers that species' declared animal count to one and tries to save
- **THEN** the save is blocked with an error naming the species and explaining that identifier records must be removed, or the higher count kept
- **AND** following the error opens that species' card within its commodity section
- **WHEN** the user removes enough records to be at or under the new count
- **THEN** the lower count then saves successfully

### Requirement: Every animal record must carry at least one identifier
**ID**: REQ-IDENT-008
The system MUST require each animal record to carry at least one of the identifiers open to it — a microchip, passport, tattoo, ear tag or horse name — and MUST hold the section incomplete, naming each record at fault, until every one does.

#### Scenario: A record carrying no identifier holds the section incomplete
**ID**: SCN-IDENT-008-A
- **GIVEN** the user has added an animal record for a commodity line
- **WHEN** that record carries none of the identifiers open to it
- **THEN** the section is held incomplete, and the record at fault is named

### Requirement: Saving a record with no identifier given at all is refused, focusing the species' first identifier field
**ID**: REQ-IDENT-009
The system MUST refuse a card's save button when every identifier field on that card is left blank, and MUST focus the species' first identifier field when the resulting error is followed.

#### Scenario: An entirely blank record links to and focuses the first identifier field
**ID**: SCN-IDENT-009-A
- **GIVEN** the user is entering identifier details for a species and fills in none of its identifier fields
- **WHEN** they press that card's save button
- **THEN** the save is refused
- **WHEN** they follow the resulting error
- **THEN** that species' first identifier field is focused, and remains empty

### Requirement: A typed identifier value has a maximum length
**ID**: REQ-IDENT-010
The system MUST reject a typed identifier value of more than 58 characters in a form that a save submits, with the message "<identifier> must be 58 characters or less" naming Microchip, Passport, Tattoo, Ear tag or Horse name, MUST link the resulting error to and focus the field, MUST preserve the over-length value, and MUST save a value of 58 characters typed with spaces around it without them.

#### Scenario: An over-length identifier value blocks the save with the value preserved
**ID**: SCN-IDENT-010-A
- **GIVEN** the user enters a typed identifier value of more than 58 characters in a form that the save they press submits
- **WHEN** they try to save
- **THEN** the save is blocked and the error summary and the field read "Microchip must be 58 characters or less" (or the same for Passport, Tattoo, Ear tag or Horse name), linking to and focusing that field
- **AND** the over-length value is still shown

#### Scenario: A 58-character value typed with surrounding spaces saves without them
**ID**: SCN-IDENT-010-B
- **GIVEN** the user types an identifier of exactly 58 characters with spaces before and after it
- **WHEN** they press the card's save button
- **THEN** the record is saved with no error, and the saved identifier carries no surrounding spaces

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
The system MUST refuse a save that submits a permanent address with a mandatory field left blank, MUST reject a field whose value exceeds its maximum length, and in both cases MUST link the resulting error to and focus the field at fault while preserving every other field already entered on the record, including its identifiers.

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
The system MUST head the saved-animals table with a column for every identifier the commodity declares, not only the ones a particular record happens to hold, naming each row by its species and its number among that species' records, and MUST place it below the entry form and the card button while the species still has animals to enter.

#### Scenario: The table heads every identifier the commodity declares
**ID**: SCN-IDENT-014-A
- **GIVEN** the user has saved one record for a commodity that declares more than one identifier
- **WHEN** they view the saved-animals table
- **THEN** it is headed with a column for every identifier that commodity declares, not only the one the saved record used

#### Scenario: The saved-animals table sits below the entry form and the card button
**ID**: SCN-IDENT-014-B
- **GIVEN** a species has more animals to enter and one record saved
- **WHEN** the user views its card
- **THEN** the entry form and the card button come first and the saved-animals table follows below them

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
The system MUST refuse an attempt to add a further record once a species' declared count has already been reached, MUST show an error naming that count, and MUST return the user to that species' card when the error is followed.

#### Scenario: An add beyond the reached cap is refused and returns to the card
**ID**: SCN-IDENT-016-A
- **GIVEN** a species' declared animal count has already been reached
- **WHEN** a further add is submitted for it regardless
- **THEN** it is refused, with an error naming the declared count
- **WHEN** the error is followed
- **THEN** that species' own card is shown

### Requirement: A heading reports progress toward the declared count for a species still being entered
**ID**: REQ-IDENT-017
The system MUST show a heading reporting how many of a species' declared animal count have been entered so far, for as long as its identification is incomplete.

#### Scenario: The heading reports progress and updates as records are added or removed
**ID**: SCN-IDENT-017-A
- **GIVEN** a species has a declared count of three and no records entered
- **WHEN** the user views its card
- **THEN** the heading reads "Enter details for Bos taurus 1 of 3" (for a cattle species)
- **AND** that count changes as records are added to or removed from the species

### Requirement: The back link returns to Overview
**ID**: REQ-IDENT-018
The system MUST return the user to Overview when they follow the back link from the identification details page.

#### Scenario: The back link opens Overview
**ID**: SCN-IDENT-018-A
- **GIVEN** the user is on the identification details page
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: A consignment with nothing to identify never shows the page
**ID**: REQ-IDENT-019
The system MUST pass the user on, without showing the identification details page, when no commodity on the notification carries an identifier of its own.

#### Scenario: A consignment of ostriches alone carries on past the page
**ID**: SCN-IDENT-019-A
- **GIVEN** the notification holds only a commodity with no identifier of its own (for example, ostriches)
- **WHEN** the identification details page is requested directly
- **THEN** Overview is shown instead, and the page itself is never rendered

### Requirement: Identification is shown as one section per commodity holding one card per species
**ID**: REQ-IDENT-020
The system MUST show identification as one section per commodity code, headed with the code, holding one card per selected species that has identifier fields and a number of animals, in the order their species are listed for selection, each headed by the species name with a Change number of animals link, and MUST show no card for a species with no number of animals.

#### Scenario: A commodity with two species shows one section holding two cards
**ID**: SCN-IDENT-020-A
- **GIVEN** the user has chosen two cattle species, each with a number of animals, and a horse
- **WHEN** they open the identification details page
- **THEN** a section headed "0102" holds one card for each cattle species, each headed by its Latin name
- **AND** a separate section holds the horse's card

#### Scenario: A species with no number of animals has no card
**ID**: SCN-IDENT-020-B
- **GIVEN** a species that has identifier fields but no number of animals
- **WHEN** the user opens the identification details page
- **THEN** the summary lists that species and no card or entry form is shown for it

### Requirement: A card's button saves only its own species, and the page's save buttons save only species of one animal
**ID**: REQ-IDENT-021
The system MUST, when a species card's save button is pressed, validate and save only that species' current animal and reload with that species' form empty, MUST NOT validate or save values typed into any other species' form, MUST validate and save the typed identifiers of each species with one animal when Save and continue or Save and return to overview is pressed, and MUST NOT validate or save anything typed into the form of a species with more than one animal on those buttons.

#### Scenario: A card button saves only its own species and shows no error for another
**ID**: SCN-IDENT-021-A
- **GIVEN** a valid ear tag is typed into one species' form and an over-length ear tag into another species' form
- **WHEN** the user presses the first species' card button
- **THEN** the first species' animal is saved and no error summary is shown
- **AND** the first species' form reloads empty and the second species' typed value is not saved

#### Scenario: Save and continue saves a species of one animal and not a species of several
**ID**: SCN-IDENT-021-B
- **GIVEN** identifiers are typed into the form of a species with one animal and of a species with two animals
- **WHEN** the user presses Save and continue
- **THEN** the one-animal species' record is saved
- **AND** the two-animal species has no record saved, and its card still asks for its first animal

### Requirement: The identifier fields are labelled Microchip, Passport, Tattoo, Ear tag and Horse name, with no hint text
**ID**: REQ-IDENT-022
The system MUST label the identifier fields Microchip, Passport, Tattoo, Ear tag and Horse name, and MUST show no hint text under them.

#### Scenario: The identifier fields carry their names and no hint
**ID**: SCN-IDENT-022-A
- **GIVEN** the user is entering identifier details for a species whose commodity declares an identifier (for example, cats)
- **WHEN** they view the entry form
- **THEN** the fields are labelled "Microchip", "Passport" and "Tattoo"
- **AND** none of them shows hint text
