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

### Requirement: A search can match a commodity's code or a species' common or scientific name
**ID**: REQ-COMMODITY-SELECT-003
The system MUST match a search against a commodity's code and against a species' common name as well as its scientific name, and MUST offer each species as its common name with the scientific name after it.

#### Scenario: Searching by common name finds the same species as searching by code
**ID**: SCN-COMMODITY-SELECT-003-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search by a species' common name
- **THEN** the same species is offered as when searching by that commodity's code, shown as its common name followed by its scientific name

### Requirement: Matching species are grouped under the commodity they belong to, one group per matching commodity
**ID**: REQ-COMMODITY-SELECT-004
The system MUST group the species a search matches under a heading naming their commodity and its code, MUST render a separate group for each commodity a search matches, and MUST say so plainly when a search matches nothing.

#### Scenario: A search groups its matching species under their commodity heading
**ID**: SCN-COMMODITY-SELECT-004-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search by a commodity's code
- **THEN** the matching species are listed together under a heading naming that commodity and its code

#### Scenario: A search matching more than one commodity renders a group for each
**ID**: SCN-COMMODITY-SELECT-004-B
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term that matches species under two different commodities
- **THEN** two separate groups are shown, each headed by its own commodity's name and code

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

### Requirement: The back link returns to Overview
**ID**: REQ-COMMODITY-SELECT-007
The system MUST return the user to Overview when they follow the back link from the commodity selection page.

#### Scenario: The back link opens Overview
**ID**: SCN-COMMODITY-SELECT-007-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they follow the back link
- **THEN** Overview is shown

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

### Requirement: Saving and continuing without choosing a commodity is rejected
**ID**: REQ-COMMODITY-SELECT-009
The system MUST refuse to save and continue from the commodity selection page when nothing has been chosen, showing "Select a commodity" in the error summary and inline on the search field, whether or not results are listed, with the summary link going to the search field. On save and return to overview the system MUST NOT check the choice: it saves the selection as it stands, an empty one included, and the Overview shows the commodity selection task as "To do" when nothing is chosen.

#### Scenario: Saving with nothing chosen shows an error summary
**ID**: SCN-COMMODITY-SELECT-009-A
- **GIVEN** the user is on the commodity selection page with nothing chosen
- **WHEN** they save and continue
- **THEN** an error summary headed "There is a problem" is shown, telling the user to select a commodity
- **AND** the same error shows inline on the search field, and the summary link goes to the search field

#### Scenario: Save and return to overview with nothing chosen returns to Overview without an error
**ID**: SCN-COMMODITY-SELECT-009-B
- **GIVEN** the user is on the commodity selection page with nothing chosen
- **WHEN** they save and return to overview
- **THEN** they return to Overview with no error shown
- **AND** the commodity selection task reads "To do"

#### Scenario: With results listed, the error still sits on the search field
**ID**: SCN-COMMODITY-SELECT-009-C
- **GIVEN** the user has searched, so species are listed, and has chosen none
- **WHEN** they save and continue
- **THEN** "Select a commodity" shows in the error summary and inline on the search field, not on the listed species
- **AND** the summary link goes to the search field

#### Scenario: Save and return to overview after clearing a saved selection empties it
**ID**: SCN-COMMODITY-SELECT-009-D
- **GIVEN** the user has a saved selection and clears it on the commodity selection page
- **WHEN** they save and return to overview
- **THEN** they return to Overview with no error shown and the commodity selection task reads "To do"
- **AND** reopening the page shows nothing chosen

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
