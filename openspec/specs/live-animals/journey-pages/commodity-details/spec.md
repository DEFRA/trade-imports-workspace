# Commodity Details Page Specification

## Purpose

**Maturity**: detailing

**Page**: consignmentDetails

Asks how much of each chosen species the consignment carries — one number of animals and, where the commodity calls for it, a number of packages — grouped under the commodity and species chosen on the previous page. The page is titled "Commodity details".

## Requirements

### Requirement: The page asks a number of animals, and where owed a number of packages, per species chosen — starting empty
**ID**: REQ-COMMODITY-DETAILS-001
The system MUST ask, for every species the user chose on the previous page, a number of animals and, where that species' commodity calls for one, a number of packages, grouping each species' questions under its own heading, its label, nested under a heading of its commodity code, offering a save-and-continue action, and MUST leave every field empty when the page is first opened.

#### Scenario: The page presents one set of questions per chosen species, all empty
**ID**: SCN-COMMODITY-DETAILS-001-A
- **GIVEN** the user has chosen more than one species, from more than one commodity, and reaches the commodity details page for the first time
- **WHEN** the page loads
- **THEN** it groups each species' number-of-animals and number-of-packages questions under its own heading, nested under its commodity's heading
- **AND** a save-and-continue action is offered
- **AND** every field is empty

### Requirement: A complete set of commodity details is accepted
**ID**: REQ-COMMODITY-DETAILS-002
The system MUST accept the commodity details once every species' number of animals is given, along with a number of packages for any species whose commodity calls for one, saving them without error. Pressing Enter in a quantity field MUST save the page's counts rather than removing a species or commodity.

#### Scenario: Entering the counts for every species saves without error
**ID**: SCN-COMMODITY-DETAILS-002-A
- **GIVEN** the user is on the commodity details page with more than one species to answer for
- **WHEN** they enter a number of animals, and a number of packages where asked for, for every species, then save and continue
- **THEN** the answers are saved and no error summary is shown

#### Scenario: Pressing Enter in a quantity field saves the counts
**ID**: SCN-COMMODITY-DETAILS-002-B
- **GIVEN** the user has entered valid counts for every species
- **WHEN** they press Enter in a quantity field
- **THEN** the counts are saved and the page the primary save leads to is shown

### Requirement: A collection table lists the chosen commodities and species, each row removable on its own
**ID**: REQ-COMMODITY-DETAILS-003
The system MUST list the chosen commodities in a table with the columns "Commodity code" and "Species" — one row per commodity code, except under commodity code 01061900, where each chosen species has its own row — the Species cell listing the label of each species chosen under that row, and MUST let the user remove any row on its own, with no effect on another row's saved counts.

#### Scenario: The table lists each commodity with its code
**ID**: SCN-COMMODITY-DETAILS-003-A
- **GIVEN** the user has chosen more than one species
- **WHEN** they view the commodity details page
- **THEN** the table lists each commodity by its code and the label of each species chosen under it; one row per code except under code 01061900 (see SCN-COMMODITY-DETAILS-003-C)

#### Scenario: Removing one species leaves another's saved counts untouched
**ID**: SCN-COMMODITY-DETAILS-003-B
- **GIVEN** the user has saved counts for two species under different commodities
- **WHEN** they remove one
- **THEN** it no longer appears in the table, and the other species' saved counts are unchanged

#### Scenario: A commodity under code 01061900 lists each species as its own removable row
**ID**: SCN-COMMODITY-DETAILS-003-C
- **GIVEN** the user has chosen a species under commodity code 01061900 (for example, cats) alongside one under another code
- **WHEN** they view the commodity details page
- **THEN** the 01061900 species has its own row, with the commodity's code and the species' label
- **AND** removing that row drops only that species, while a row under any other code removes its whole commodity
- **AND** removing the last species under a commodity removes that commodity's row too

#### Scenario: Each row's Species cell lists the labels chosen under it
**ID**: SCN-COMMODITY-DETAILS-003-D
- **GIVEN** the user has chosen two species under commodity code 0102
- **WHEN** they view the commodity details page
- **THEN** the table has the columns "Commodity code" and "Species"
- **AND** the 0102 row reads 0102 and the label of each of the two species

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
The system MUST let the user add a further commodity from the commodity details page, returning them to commodity selection with what they already chose still selected, MUST return them to commodity details once the new one is saved, and MUST preserve every already-saved species' counts once the new one is added.

#### Scenario: Adding another commodity keeps the earlier species selected and their counts intact
**ID**: SCN-COMMODITY-DETAILS-007-A
- **GIVEN** the user has saved a count for one species
- **WHEN** they choose to add another commodity, select a further species and save
- **THEN** the earlier species was still shown as selected on the selection page
- **AND** commodity details is shown again, the earlier species' saved number of animals and number of packages are unchanged, and the new species starts with an empty count

#### Scenario: After Save and continue, adding another commodity returns to commodity details
**ID**: SCN-COMMODITY-DETAILS-007-B
- **GIVEN** the user is on commodity details
- **WHEN** they choose to add another commodity, select a further species and save
- **THEN** commodity details is shown, not the reason for import

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

### Requirement: The back link returns to where the user came from
**ID**: REQ-COMMODITY-DETAILS-009
The system MUST return the user, when they follow the back link from the commodity details page, to the page they saved and continued from, to Overview when they opened it from its Overview task, and to the review when they opened it from a Change link on the review, as `live-animals/journey-flow` describes. That page is Main import reason.

#### Scenario: After Save and continue, the back link opens the page before
**ID**: SCN-COMMODITY-DETAILS-009-A
- **GIVEN** the user reached the commodity details page by saving and continuing from Main import reason
- **WHEN** they follow the back link
- **THEN** that page is shown

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-COMMODITY-DETAILS-009-B
- **GIVEN** the user opened the commodity details page from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the review when the page was opened from a Change link
**ID**: SCN-COMMODITY-DETAILS-009-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link that opens the commodity details page and then the back link
- **THEN** the review is shown

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
The system MUST end the commodity details page with "Save and continue", "Save and return to overview" and "Cancel and return to overview", on a draft and while amending, as when opened from Overview.

#### Scenario: A page reached by Save and continue offers all three controls
**ID**: SCN-COMMODITY-DETAILS-011-A
- **GIVEN** the user is on commodity details
- **WHEN** the page is shown
- **THEN** it offers "Save and continue", "Save and return to overview" and "Cancel and return to overview"

### Requirement: A removal keeps what the user has typed, and names the row it removes
**ID**: REQ-COMMODITY-DETAILS-012
The system MUST keep, after a removal, the numbers already typed into the rows that stay, showing them back in their own fields, and MUST name the removed row rather than its position, so a removal naming a row the selection no longer holds shows the page as it stands rather than removing a different row.

#### Scenario: Numbers typed into other rows survive a removal
**ID**: SCN-COMMODITY-DETAILS-012-A
- **GIVEN** the user has typed numbers into more than one species' fields and has not yet saved
- **WHEN** they remove one row
- **THEN** that row is gone from the table and from the selection
- **AND** every other species' field still holds the number typed into it

#### Scenario: A removal submitted again shows the page as it stands rather than removing another row
**ID**: SCN-COMMODITY-DETAILS-012-B
- **GIVEN** the user has removed a row
- **WHEN** the same removal is submitted again
- **THEN** the commodity details page is shown holding the rows the first removal left, with nothing further removed

### Requirement: A number of animals or a number of packages above the largest the service stores is refused on its own field
**ID**: REQ-COMMODITY-DETAILS-013
The system MUST refuse a number of animals, and a number of packages, above 2,147,483,647, the largest figure the service stores for either, with an error against that species' own field — "Number of animals must be 2,147,483,647 or fewer" or "Number of packages must be 2,147,483,647 or fewer" — keeping what the user typed, and MUST accept either number at or below that figure.

#### Scenario: A number of animals above the largest the service stores is refused on its own field
**ID**: SCN-COMMODITY-DETAILS-013-A
- **GIVEN** the user is entering a number of animals for one species
- **WHEN** they enter a number above 2,147,483,647 and save
- **THEN** the save is blocked, with the error "Number of animals must be 2,147,483,647 or fewer" against that species' own field
- **AND** the field still shows the digits they typed

#### Scenario: A number of animals at the largest the service stores is accepted
**ID**: SCN-COMMODITY-DETAILS-013-B
- **GIVEN** the user is entering a number of animals for one species
- **WHEN** they enter 2,147,483,647 and save
- **THEN** the save is not blocked and the journey moves on
- **AND** reopening the page shows the figure that was saved

#### Scenario: A number of packages above the largest the service stores is refused on its own field
**ID**: SCN-COMMODITY-DETAILS-013-C
- **GIVEN** the user is entering a number of packages for one species
- **WHEN** they enter a number above 2,147,483,647 and save
- **THEN** the save is blocked, with the error "Number of packages must be 2,147,483,647 or fewer" against that species' own field
- **AND** the field still shows the digits they typed

#### Scenario: A number of packages at the largest the service stores is accepted
**ID**: SCN-COMMODITY-DETAILS-013-D
- **GIVEN** the user is entering a number of packages for one species
- **WHEN** they enter 2,147,483,647 and save
- **THEN** the save is not blocked and the journey moves on
