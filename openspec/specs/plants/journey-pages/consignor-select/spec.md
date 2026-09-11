# Consignor Select Page Specification

## Purpose

Asks which address-book record is the consignor or exporter. The page is titled "Consignor or exporter".

## Requirements

### Requirement: The page asks for a consignor with the searchable address-book picker
**ID**: REQ-PLANTS-CONSIGNOR-001
The system MUST ask which address is the consignor or exporter, showing the parties section caption, a short description that this is the sender, and the searchable address-book picker, with save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview.

#### Scenario: The page presents its caption, heading, description and search
**ID**: SCN-PLANTS-CONSIGNOR-001-A
- **GIVEN** the user has reached the consignor page on a wood or plants-for-planting notification
- **WHEN** the page loads
- **THEN** it shows the parties section caption, the heading "Consignor or exporter", the sender description, and a search box
- **AND** the three save controls are offered

### Requirement: The page is reachable from Overview's consignor task row
**ID**: REQ-PLANTS-CONSIGNOR-002
The system MUST open this page when the user follows Overview's consignor or exporter task row.

#### Scenario: Overview's consignor row opens the page
**ID**: SCN-PLANTS-CONSIGNOR-002-A
- **GIVEN** a wood or plants-for-planting notification on Overview
- **WHEN** the user opens the consignor or exporter task row
- **THEN** the consignor page is shown

### Requirement: A chosen consignor is accepted, continues the journey, and persists
**ID**: REQ-PLANTS-CONSIGNOR-003
The system MUST accept a chosen address, continue to identification numbers on save-and-continue, and MUST show that address still chosen when the user returns. Choosing a different address MUST replace the previous one. Save-and-return-to-overview MUST save without continuing; cancel-and-return-to-overview MUST reach Overview without saving.

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
- **GIVEN** the user is on the consignor page
- **WHEN** they choose an address and select save-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows that address still chosen

#### Scenario: Cancel and return to overview reaches Overview without saving
**ID**: SCN-PLANTS-CONSIGNOR-003-D
- **GIVEN** the user is on the consignor page
- **WHEN** they choose an address and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows no address chosen

### Requirement: Saving with nothing chosen, or after a no-match search, is refused with focused recovery
**ID**: REQ-PLANTS-CONSIGNOR-004
The system MUST refuse to save when nothing has been chosen, focusing the first address row when the user follows the error, and MUST focus the search field instead when the list is empty after a no-match search. Choosing an address after the error MUST recover.

#### Scenario: Saving with nothing chosen shows the error and focuses the first row
**ID**: SCN-PLANTS-CONSIGNOR-004-A
- **GIVEN** the user is on the consignor page with nothing chosen
- **WHEN** they save and continue and follow the error
- **THEN** the first address row is focused

#### Scenario: Saving after a no-match search focuses the search field
**ID**: SCN-PLANTS-CONSIGNOR-004-B
- **GIVEN** the user has searched for a term that matched nothing
- **WHEN** they save and continue and follow the error
- **THEN** the search field is focused

#### Scenario: Choosing an address after the error recovers
**ID**: SCN-PLANTS-CONSIGNOR-004-C
- **GIVEN** the consignor page is showing the nothing-chosen error
- **WHEN** the user chooses an address and saves
- **THEN** they continue to identification numbers

### Requirement: The back link returns to Overview
**ID**: REQ-PLANTS-CONSIGNOR-005
The system MUST return the user to Overview when they follow the back link from the consignor page.

#### Scenario: The back link opens Overview
**ID**: SCN-PLANTS-CONSIGNOR-005-A
- **GIVEN** the user is on the consignor page
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: When consignor is out of scope the page is not served
**ID**: REQ-PLANTS-CONSIGNOR-006
The system MUST NOT serve the consignor page once the commodity type is potatoes, including when the user navigates directly to it, and MUST hide Overview's consignor task row.

#### Scenario: Switching to potatoes hides the row and refuses a direct open
**ID**: SCN-PLANTS-CONSIGNOR-006-A
- **GIVEN** a wood notification that had reached the consignor page
- **WHEN** the commodity type is changed to potatoes
- **THEN** Overview shows no consignor task row
- **AND** opening the consignor URL does not show the consignor page
