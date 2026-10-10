# Commodity Details Page Specification

## Purpose

Asks how much of each chosen species the consignment carries — one number of animals and, where the commodity calls for it, a number of packages — grouped under the commodity and species chosen on the previous page. The page is titled "Commodity details".

## Requirements

### Requirement: The page asks a number of animals, and where owed a number of packages, per species chosen — starting empty
**ID**: REQ-COMMODITY-DETAILS-001
The system MUST ask, for every species the user chose on the previous page, a number of animals and, where that species' commodity calls for one, a number of packages, grouping each species' questions under its own heading nested under its commodity's heading, offering a save-and-continue action, and MUST leave every field empty when the page is first opened.

#### Scenario: The page presents one set of questions per chosen species, all empty
**ID**: SCN-COMMODITY-DETAILS-001-A
- **GIVEN** the user has chosen more than one species, from more than one commodity, and reaches the commodity details page for the first time
- **WHEN** the page loads
- **THEN** it groups each species' number-of-animals and number-of-packages questions under its own heading, nested under its commodity's heading
- **AND** a save-and-continue action is offered
- **AND** every field is empty

### Requirement: A complete set of commodity details is accepted
**ID**: REQ-COMMODITY-DETAILS-002
The system MUST accept the commodity details once every species' number of animals is given, along with a number of packages for any species whose commodity calls for one, saving them without error.

#### Scenario: Entering the counts for every species saves without error
**ID**: SCN-COMMODITY-DETAILS-002-A
- **GIVEN** the user is on the commodity details page with more than one species to answer for
- **WHEN** they enter a number of animals, and a number of packages where asked for, for every species, then save and continue
- **THEN** the answers are saved and no error summary is shown

### Requirement: A collection table lists every chosen species, each removable on its own
**ID**: REQ-COMMODITY-DETAILS-003
The system MUST list every chosen commodity and species in a table with the columns "Commodity code", "Common name" and "Species", the Species cell listing the Latin names of the species chosen under that row, and MUST let the user remove a single species without affecting another's saved counts — removing the last species under a commodity removes that commodity's row too.

#### Scenario: The table lists each commodity and species with its code
**ID**: SCN-COMMODITY-DETAILS-003-A
- **GIVEN** the user has chosen more than one species
- **WHEN** they view the commodity details page
- **THEN** the table lists each commodity by name and code, and each of its chosen species

#### Scenario: Removing one species leaves another's saved counts untouched
**ID**: SCN-COMMODITY-DETAILS-003-B
- **GIVEN** the user has saved counts for two species under different commodities
- **WHEN** they remove one species
- **THEN** it no longer appears in the table, and the other species' saved counts are unchanged

#### Scenario: Each row's Species cell lists the Latin names chosen under it
**ID**: SCN-COMMODITY-DETAILS-003-C
- **GIVEN** the user has chosen two species under the Cow commodity
- **WHEN** they view the commodity details page
- **THEN** the table has the columns "Commodity code", "Common name" and "Species"
- **AND** the Cow row reads 0102, Cow, and the Latin name of each of the two species

### Requirement: A number of animals or a number of packages must be a positive whole number
**ID**: REQ-COMMODITY-DETAILS-004
The system MUST reject a number of animals or a number of packages that is not a positive whole number, linking the resulting error to and focusing the field at fault, without disturbing another species' valid counts.

#### Scenario: A non-whole-number animal count is rejected, preserving the other valid counts
**ID**: SCN-COMMODITY-DETAILS-004-A
- **GIVEN** the user has entered a valid number of animals for one species
- **WHEN** they enter a non-whole-number count for another species and save
- **THEN** the save is blocked, an error links to and focuses the invalid field
- **AND** the other species' valid count is still shown

#### Scenario: A non-whole-number package count is rejected the same way
**ID**: SCN-COMMODITY-DETAILS-004-B
- **GIVEN** the user has entered a valid number of packages for one species
- **WHEN** they enter a non-whole-number package count for another species and save
- **THEN** the save is blocked, an error links to and focuses the invalid field
- **AND** the other species' valid counts are still shown

### Requirement: The page holds until every species has a number of animals
**ID**: REQ-COMMODITY-DETAILS-005
The system MUST refuse to save while any chosen species has no number of animals, naming every species left blank in the error and linking to each.

#### Scenario: Leaving every species' count blank names each one in the error
**ID**: SCN-COMMODITY-DETAILS-005-A
- **GIVEN** the user is on the commodity details page for more than one species
- **WHEN** they save without entering any number of animals
- **THEN** the save is blocked, with one error per species naming it
- **AND** following an error focuses that species' own field

#### Scenario: Leaving one species' count blank names only that species
**ID**: SCN-COMMODITY-DETAILS-005-B
- **GIVEN** the user has filled in the number of animals for one species but not another
- **WHEN** they save
- **THEN** the save is blocked, with an error naming only the species left blank
- **AND** the filled-in species' count is still shown

### Requirement: Species and counts persist across a reload
**ID**: REQ-COMMODITY-DETAILS-006
The system MUST persist each species' saved counts, so a reload of the page shows them unchanged.

#### Scenario: Reloading the page after saving shows the same counts
**ID**: SCN-COMMODITY-DETAILS-006-A
- **GIVEN** the user has saved counts for more than one species
- **WHEN** they reload the commodity details page
- **THEN** every species still shows the counts they saved

### Requirement: Adding another commodity from this page preserves what was already entered
**ID**: REQ-COMMODITY-DETAILS-007
The system MUST let the user add a further commodity from the commodity details page, returning them to commodity selection with what they already chose still selected, and MUST preserve every already-saved species' counts once the new one is added.

#### Scenario: Adding another commodity keeps the earlier species selected and their counts intact
**ID**: SCN-COMMODITY-DETAILS-007-A
- **GIVEN** the user has saved a count for one species
- **WHEN** they choose to add another commodity, select a further species and save
- **THEN** the earlier species was still shown as selected on the selection page
- **AND** its saved count is unchanged, and the new species starts with an empty count

### Requirement: Removing every species returns the user to commodity selection
**ID**: REQ-COMMODITY-DETAILS-008
The system MUST return the user to the commodity selection page once every chosen species has been removed, whether reached by removing them on this page or by opening it with nothing left selected.

#### Scenario: Removing the last two species returns to commodity selection
**ID**: SCN-COMMODITY-DETAILS-008-A
- **GIVEN** the user has exactly two species chosen, from different commodities
- **WHEN** they remove both
- **THEN** the commodity selection page is shown
- **WHEN** they reopen the commodity details page directly afterwards
- **THEN** the commodity selection page is shown, since there is nothing left to ask about

### Requirement: The back link returns to what are you importing in the opening sequence, and to Overview otherwise
**ID**: REQ-COMMODITY-DETAILS-009
The system MUST return the user to the commodity selection page ("What are you importing?") when they follow the back link from commodity details during the opening sequence, not to the main reason for import that comes between them, and MUST return them to Overview when the page was opened from its Overview task.

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-COMMODITY-DETAILS-009-A
- **GIVEN** the opening sequence has ended and the user opened commodity details from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: In the opening sequence, the back link opens what are you importing, with the choice kept
**ID**: SCN-COMMODITY-DETAILS-009-B
- **GIVEN** the user is in the opening sequence and reached commodity details from main reason for import
- **WHEN** they follow the back link
- **THEN** "What are you importing?" is shown, with the species they chose still chosen

### Requirement: The error summary lists errors by question
**ID**: REQ-COMMODITY-DETAILS-010
The system MUST list every number of animals error in the error summary before any number of packages error, each linking to its own field.

#### Scenario: Two species with blank counts and invalid package counts list both animals errors first
**ID**: SCN-COMMODITY-DETAILS-010-A
- **GIVEN** the user has two species on the commodity details page, each missing its number of animals and each with a number of packages that is not a whole number
- **WHEN** they save and continue
- **THEN** the error summary lists the number of animals error for both species, then the number of packages error for both species
- **AND** each error links to its own field

### Requirement: The page ends with Save and continue, Save and return to overview and Cancel and return to overview
**ID**: REQ-COMMODITY-DETAILS-011
Outside an amendment the system MUST end the commodity details page with "Save and continue", "Save and return to overview" and "Cancel and return to overview", in the opening sequence as when opened from Overview.

#### Scenario: The opening sequence offers all three controls
**ID**: SCN-COMMODITY-DETAILS-011-A
- **GIVEN** the user is in the opening sequence on commodity details
- **WHEN** the page is shown
- **THEN** it offers "Save and continue", "Save and return to overview" and "Cancel and return to overview"
