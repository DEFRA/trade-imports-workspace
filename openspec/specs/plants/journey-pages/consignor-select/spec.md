# Consignor Select Page Specification

## Purpose

**Maturity**: exploring

Asks which address-book record is the consignor. The page is titled "Consignor".

## Requirements

### Requirement: The page asks for a consignor with the searchable address-book picker
**ID**: REQ-PLANTS-CONSIGNOR-001
The system MUST ask which address is the consignor, showing the parties section caption, a short description that this is the sender, and the searchable address-book picker. It MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview, on a draft and while amending alike.

#### Scenario: The page presents its caption, heading, description and search
**ID**: SCN-PLANTS-CONSIGNOR-001-A
- **GIVEN** the user has reached the consignor page on a wood or plants-for-planting notification that is not being amended
- **WHEN** the page loads
- **THEN** it shows the parties section caption, the heading "Consignor", the sender description, and a search box
- **AND** the three save controls are offered

### Requirement: The page is reachable from Overview's consignor task row
**ID**: REQ-PLANTS-CONSIGNOR-002
The system MUST open this page when the user follows Overview's consignor task row.

#### Scenario: Overview's consignor row opens the page
**ID**: SCN-PLANTS-CONSIGNOR-002-A
- **GIVEN** a wood or plants-for-planting notification on Overview
- **WHEN** the user opens the consignor task row
- **THEN** the consignor page is shown

### Requirement: A chosen consignor is accepted, continues the journey, and persists
**ID**: REQ-PLANTS-CONSIGNOR-003
The system MUST accept a chosen address, continue to identification numbers on save-and-continue from every start, Overview included, and MUST show that address still chosen when the user returns. Choosing a different address MUST replace the previous one. Save-and-return-to-overview MUST save without continuing, and cancel-and-return-to-overview MUST reach Overview without saving, on a draft and while amending alike.

#### Scenario: Choosing a consignor saves, continues to identification numbers, and persists on return
**ID**: SCN-PLANTS-CONSIGNOR-003-A
- **GIVEN** the user is on the consignor page
- **WHEN** they choose an address and save and continue
- **THEN** they reach identification numbers
- **AND** returning to the consignor page shows that address still chosen

#### Scenario: Choosing a different address replaces the one already saved
**ID**: SCN-PLANTS-CONSIGNOR-003-B
- **GIVEN** a consignor is already saved
- **WHEN** the user chooses a different address and saves
- **THEN** only the new address is shown as chosen

#### Scenario: Save and return to overview saves without continuing
**ID**: SCN-PLANTS-CONSIGNOR-003-C
- **GIVEN** the user is on the consignor page of a notification that is not being amended
- **WHEN** they choose an address and select save-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows that address still chosen

#### Scenario: Cancel and return to overview reaches Overview without saving
**ID**: SCN-PLANTS-CONSIGNOR-003-D
- **GIVEN** the user is on the consignor page of a notification that is not being amended
- **WHEN** they choose an address and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows no address chosen

#### Scenario: Opened from Overview, Save and continue goes on to identification numbers
**ID**: SCN-PLANTS-CONSIGNOR-003-E
- **GIVEN** the consignor page opened from its Overview task
- **WHEN** the user chooses an address and saves and continues
- **THEN** identification numbers is shown

### Requirement: Saving with nothing chosen moves on without an error, and a value not in the book is refused
**ID**: REQ-PLANTS-CONSIGNOR-004
Save-and-continue and save-and-return-to-overview MUST make the same checks. With nothing chosen, neither MUST show an error or save a consignor: save-and-continue MUST continue to identification numbers from every start, and save-and-return-to-overview MUST return to Overview. A held consignor MUST be kept. A value not in the book MUST be refused on either button, and choosing an address after that MUST recover, as governed by `plants/addresses`.

#### Scenario: Saving with nothing chosen continues without an error
**ID**: SCN-PLANTS-CONSIGNOR-004-A
- **GIVEN** the user is on the consignor page with nothing chosen and no consignor held yet
- **WHEN** they save and continue
- **THEN** they reach identification numbers, with no error
- **AND** Overview shows the consignor task not yet started

#### Scenario: Choosing an address after a refused value recovers
**ID**: SCN-PLANTS-CONSIGNOR-004-C
- **GIVEN** the consignor page, reached after Save and continue, is showing the refusal of a value that is not an address in the book
- **WHEN** the user chooses an address and saves
- **THEN** they continue to identification numbers

#### Scenario: Save and return to overview with nothing chosen reaches Overview without an error
**ID**: SCN-PLANTS-CONSIGNOR-004-D
- **GIVEN** the user is on the consignor page with nothing chosen and no consignor held yet
- **WHEN** they select save and return to overview
- **THEN** Overview is shown, with no error and no consignor saved

#### Scenario: Save and return to overview with a value not in the book is refused
**ID**: SCN-PLANTS-CONSIGNOR-004-E
- **GIVEN** the user is on the consignor page and a value that is not an address in the book is submitted
- **WHEN** they select save and return to overview
- **THEN** they stay on the page and "Select a consignor from the list" is shown
- **AND** the search term is kept and no consignor is saved

### Requirement: The back link returns to the place of destination after Save and continue, and to Overview otherwise
**ID**: REQ-PLANTS-CONSIGNOR-005
The system MUST return the user to the place of destination page when they follow the back link from the consignor page after reaching the page by Save and continue, and to Overview when the page was opened from Overview. When the page was opened from a Change link on the review, the back link MUST open the review, as `plants/journey-flow` describes.

#### Scenario: On a draft opened from a Change link, the back link opens the review
**ID**: SCN-PLANTS-CONSIGNOR-005-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link for the consignor and then the back link
- **THEN** the review is shown

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-PLANTS-CONSIGNOR-005-A
- **GIVEN** the user opened the consignor page from Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: After Save and continue, the back link opens the place of destination
**ID**: SCN-PLANTS-CONSIGNOR-005-B
- **GIVEN** the user reached the consignor page from the place of destination by saving and continuing
- **WHEN** they follow the back link
- **THEN** the place of destination page is shown

### Requirement: When consignor is out of scope the page is not served
**ID**: REQ-PLANTS-CONSIGNOR-006
The system MUST NOT serve the consignor page once the commodity type is potatoes, including when the user navigates directly to it, and MUST hide Overview's consignor task row.

#### Scenario: Switching to potatoes hides the row and refuses a direct open
**ID**: SCN-PLANTS-CONSIGNOR-006-A
- **GIVEN** a wood notification that had reached the consignor page
- **WHEN** the commodity type is changed to potatoes
- **THEN** Overview shows no consignor task row
- **AND** opening the consignor URL does not show the consignor page
