# Commodity Selection Page Specification

## Purpose

Asks which commodities and species the consignment contains, found by searching rather than browsing, keeping a running tally of what has been chosen. The page is titled "What are you importing?".

## Requirements

### Requirement: The page asks what is being imported and holds nothing until it is searched
**ID**: REQ-COMMODITY-SELECT-001
The system MUST ask the user what they are importing, offering a search box and a save-and-continue action, and MUST list no species and show no selection tally until a search has been made.

#### Scenario: The page opens empty, with only a search box
**ID**: SCN-COMMODITY-SELECT-001-A
- **GIVEN** the user has reached the commodity selection page without choosing anything before
- **WHEN** the page loads
- **THEN** it asks what is being imported, offering a search box and a save-and-continue action
- **AND** no species are listed and no selection tally is shown

### Requirement: A search shorter than three characters returns nothing
**ID**: REQ-COMMODITY-SELECT-002
The system MUST list no species for a search of fewer than three characters, so that a partial word does not return the whole book.

#### Scenario: A two-character search lists nothing
**ID**: SCN-COMMODITY-SELECT-002-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for two characters
- **THEN** no species are listed

### Requirement: A search can match a commodity's code or a species' common or Latin name
**ID**: REQ-COMMODITY-SELECT-003
The system MUST search the commodity reference data against a commodity's code and against a species' common name as well as its Latin name, MUST leave out every species under a commodity code the reference data flags as germinal, with no other filter on the code, and MUST offer each species by its Latin name alone, as the reference data spells it.

#### Scenario: Searching by common name offers the species under each live-animal code, by Latin name
**ID**: SCN-COMMODITY-SELECT-003-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search by a species' common name
- **THEN** each matching species is offered under its live-animal commodity code, shown by its Latin name

#### Scenario: A search offers no commodity code the reference data flags as germinal
**ID**: SCN-COMMODITY-SELECT-003-B
- **GIVEN** the reference data lists a species under a live-animal code and under codes it flags as germinal
- **WHEN** the user searches by that species' common name
- **THEN** the species is offered under the live-animal code only

### Requirement: Matching species are grouped under the commodity they belong to, one group per matching commodity
**ID**: REQ-COMMODITY-SELECT-004
The system MUST group the species a search matches under a heading of their commodity code, MUST render a separate group for each commodity code a search matches, and MUST say so plainly when a search matches nothing. A species listed under two codes is two separate choices.

#### Scenario: A search groups its matching species under their commodity heading
**ID**: SCN-COMMODITY-SELECT-004-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term matching species under one commodity code
- **THEN** the matching species are listed together under a heading of that commodity code

#### Scenario: A search matching more than one commodity renders a group for each
**ID**: SCN-COMMODITY-SELECT-004-B
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term that matches species under two different commodity codes
- **THEN** two separate groups are shown, each headed by its own commodity code

#### Scenario: A search matching nothing says so
**ID**: SCN-COMMODITY-SELECT-004-C
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term that matches no commodity or species
- **THEN** the page says no results were found, and lists no species

### Requirement: The page explains what a commodity code is and links out to look one up
**ID**: REQ-COMMODITY-SELECT-005
The system MUST offer the user an explanation of what a commodity code is and where to find one, including a link that opens the Trade Tariff tool in a new tab, reading "Trade Tariff tool" with "(opens in a new tab)" on its own line after it, both part of the link's name.

#### Scenario: The commodity-code help explains the code and links to the Trade Tariff tool
**ID**: SCN-COMMODITY-SELECT-005-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they open the commodity-code help
- **THEN** it explains what the code is and offers a link to look one up, which opens the Trade Tariff tool in a new tab
- **AND** the link reads "Trade Tariff tool" with "(opens in a new tab)" on its own line after it, both part of the link's name

### Requirement: Species chosen under different searches are all kept, in a canonical order
**ID**: REQ-COMMODITY-SELECT-006
The system MUST keep every species the user has chosen, whichever search brought it on screen, MUST list them all in the selection tally without any search in place, MUST show each as still chosen when its own search brings it back, and MUST list saved species in a canonical order rather than the order they were chosen in.

#### Scenario: Species found under separate searches are kept together
**ID**: SCN-COMMODITY-SELECT-006-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they choose one species found under one search and another found under a different search, then save and continue
- **THEN** both are saved and no error summary is shown
- **WHEN** they return to the page
- **THEN** the selection tally lists both, and reports two chosen, with no search in place
- **AND** searching for either one again shows it as still chosen

#### Scenario: Saved species are ordered canonically, not by the order they were chosen
**ID**: SCN-COMMODITY-SELECT-006-B
- **GIVEN** the user chooses three species in a search order that does not match their canonical order
- **WHEN** they save, and open commodity details from Overview
- **THEN** the species appear there in their canonical order, not the order chosen

### Requirement: The back link returns to the origin of the import in the opening sequence, to the page that opened it, and to Overview otherwise
**ID**: REQ-COMMODITY-SELECT-007
The system MUST return the user to the origin of the import page when they follow the back link from the commodity selection page during the opening sequence, to commodity details or identification details when that page opened it, and to Overview when the page was opened from its Overview task.

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-COMMODITY-SELECT-007-A
- **GIVEN** the opening sequence has ended and the user opened what are you importing from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: In the opening sequence, the back link opens origin of the import
**ID**: SCN-COMMODITY-SELECT-007-B
- **GIVEN** the user is in the opening sequence and has saved origin of the import
- **WHEN** they follow the back link from what are you importing
- **THEN** the origin of the import page is shown

#### Scenario: Opened from commodity details, the back link opens commodity details
**ID**: SCN-COMMODITY-SELECT-007-C
- **GIVEN** the user opened what are you importing from the Add another commodity link on commodity details
- **WHEN** they follow the back link
- **THEN** commodity details is shown

### Requirement: The tally counts what has been chosen and can be cleared
**ID**: REQ-COMMODITY-SELECT-008
The system MUST report how many species have been chosen and name them, and MUST let the user clear the whole selection at once.

#### Scenario: The tally reports the choice and clearing empties it
**ID**: SCN-COMMODITY-SELECT-008-A
- **GIVEN** the user has chosen one species on the commodity selection page
- **WHEN** the page next renders
- **THEN** the tally reports one chosen and names it
- **WHEN** the user clears the selection
- **THEN** the tally is no longer shown

### Requirement: Saving without choosing a commodity is rejected on either save control
**ID**: REQ-COMMODITY-SELECT-009
The system MUST refuse to save from the commodity selection page when nothing has been chosen, on save and continue and on save and return to overview alike, showing "Select a commodity" in the error summary and inline on the search field, whether or not results are listed, with the summary link going to the search field. A selection already saved MUST stay as it was.

#### Scenario: Saving with nothing chosen shows an error summary
**ID**: SCN-COMMODITY-SELECT-009-A
- **GIVEN** the user is on the commodity selection page with nothing chosen
- **WHEN** they save and continue
- **THEN** an error summary headed "There is a problem" is shown, telling the user to select a commodity
- **AND** the same error shows inline on the search field, and the summary link goes to the search field

#### Scenario: Save and return to overview with nothing chosen shows the same error
**ID**: SCN-COMMODITY-SELECT-009-B
- **GIVEN** the user is on the commodity selection page with nothing chosen
- **WHEN** they save and return to overview
- **THEN** they stay on the page, which shows "Select a commodity" in the error summary and inline on the search field
- **AND** the commodity selection task reads "To do"

#### Scenario: With results listed, the error still sits on the search field
**ID**: SCN-COMMODITY-SELECT-009-C
- **GIVEN** the user has searched, so species are listed, and has chosen none
- **WHEN** they save and continue
- **THEN** "Select a commodity" shows in the error summary and inline on the search field, not on the listed species
- **AND** the summary link goes to the search field

#### Scenario: Save and return to overview after clearing a saved selection is refused and keeps the saved selection
**ID**: SCN-COMMODITY-SELECT-009-D
- **GIVEN** the user has a saved selection and clears it on the commodity selection page
- **WHEN** they save and return to overview
- **THEN** they stay on the page, which shows "Select a commodity"
- **AND** reopening the page shows the saved selection still chosen

### Requirement: A notification must carry at least one commodity line
**ID**: REQ-COMMODITY-SELECT-010
The system MUST require every notification to carry at least one commodity line, and MUST NOT let one with none be submitted.

#### Scenario: A notification with no commodity line cannot be submitted
**ID**: SCN-COMMODITY-SELECT-010-A
- **GIVEN** a notification carrying no commodity line
- **WHEN** the user tries to submit it
- **THEN** the submission is refused, and the missing commodity line is reported

### Requirement: The page says one notification is needed per ITAHC and how to search
**ID**: REQ-COMMODITY-SELECT-011
The system MUST show the inset "You must submit a separate notification for every single ITAHC. You must also submit a notification for goods that do not need an ITAHC." and the search hint "You can search by common name (for example, cattle), commodity code (0102), or Latin name (Bos taurus).", with no sentence about a minimum search length.

#### Scenario: The page explains the ITAHC rule and the ways to search
**ID**: SCN-COMMODITY-SELECT-011-A
- **GIVEN** the user has reached the commodity selection page
- **WHEN** the page loads
- **THEN** the inset reads "You must submit a separate notification for every single ITAHC. You must also submit a notification for goods that do not need an ITAHC."
- **AND** the search hint reads "You can search by common name (for example, cattle), commodity code (0102), or Latin name (Bos taurus)." with no sentence about a minimum number of characters

### Requirement: The page ends with Save and continue, Save and return to overview and Cancel and return to overview
**ID**: REQ-COMMODITY-SELECT-012
Outside an amendment the system MUST end the commodity selection page with "Save and continue", "Save and return to overview" and "Cancel and return to overview", in the opening sequence as when opened from Overview.

#### Scenario: The opening sequence offers all three controls
**ID**: SCN-COMMODITY-SELECT-012-A
- **GIVEN** the user is in the opening sequence on what are you importing
- **WHEN** the page is shown
- **THEN** it offers "Save and continue", "Save and return to overview" and "Cancel and return to overview"

### Requirement: Saving returns the user to the page that opened the question, else goes on
**ID**: REQ-COMMODITY-SELECT-013
The system MUST return the user to commodity details or identification details after a save on what are you importing when that page opened it, keeping any change context. Otherwise a save MUST go to the next step of the opening sequence, a save from a Change link on the review MUST go to commodity details, and save and return to overview MUST go to Overview.

#### Scenario: Opened from commodity details, saving returns there
**ID**: SCN-COMMODITY-SELECT-013-A
- **GIVEN** the user opened what are you importing from the Add another commodity link on commodity details
- **WHEN** they choose a further species and save and continue
- **THEN** commodity details is shown

#### Scenario: Opened from identification details, saving returns there
**ID**: SCN-COMMODITY-SELECT-013-B
- **GIVEN** the user opened what are you importing from identification details
- **WHEN** they save and continue
- **THEN** identification details is shown

#### Scenario: In the opening sequence, saving opens the reason for import
**ID**: SCN-COMMODITY-SELECT-013-C
- **GIVEN** the user is in the opening sequence on what are you importing
- **WHEN** they save and continue
- **THEN** the reason for import page is shown

#### Scenario: Opened from a review Change link, saving opens commodity details
**ID**: SCN-COMMODITY-SELECT-013-D
- **GIVEN** the user opened what are you importing from a Change link on the review
- **WHEN** they save and continue
- **THEN** commodity details is shown

#### Scenario: Opened from commodity details under a review Change, saving returns there keeping the change context
**ID**: SCN-COMMODITY-SELECT-013-E
- **GIVEN** the user opened what are you importing from commodity details, reached from a Change link on the review
- **WHEN** they save and continue
- **THEN** commodity details is shown, still carrying the change context

#### Scenario: A return value naming a page that does not open the question is ignored
**ID**: SCN-COMMODITY-SELECT-013-F
- **GIVEN** the user opened what are you importing with a return value that names a page other than commodity details or identification details
- **WHEN** they save and continue
- **THEN** the save goes where a save with no return value goes

### Requirement: One search lists no more than a hundred species
**ID**: REQ-COMMODITY-SELECT-014
The system MUST list no more than a hundred species for one search.

#### Scenario: A search matching more than a hundred species lists a hundred
**ID**: SCN-COMMODITY-SELECT-014-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a commodity code holding more than a hundred species
- **THEN** a hundred species are listed
