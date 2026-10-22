# Consignor Select Page Specification

## Purpose

Asks which address-book record is the consignor. The page is titled "Consignor".

## Requirements

### Requirement: The page asks for a consignor with the searchable address-book picker
**ID**: REQ-PLANTS-CONSIGNOR-001
The system MUST ask which address is the consignor, showing the parties section caption, a short description that this is the sender, and the searchable address-book picker. Outside an amendment it MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview. While the notification is being amended, `plants/journey-flow` REQ-PLANTS-FLOW-014 governs how the page ends instead.

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
The system MUST accept a chosen address, continue to identification numbers on save-and-continue during the opening sequence, and return to Overview when the page was opened from its Overview task, and MUST show that address still chosen when the user returns. Choosing a different address MUST replace the previous one. Outside an amendment (REQ-PLANTS-CONSIGNOR-001), save-and-return-to-overview MUST save without continuing, and cancel-and-return-to-overview MUST reach Overview without saving.

#### Scenario: Choosing a consignor in the opening sequence saves, continues to identification numbers, and persists on return
**ID**: SCN-PLANTS-CONSIGNOR-003-A
- **GIVEN** the user is on the consignor page in the opening sequence
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

#### Scenario: Opened from Overview, saving returns to Overview
**ID**: SCN-PLANTS-CONSIGNOR-003-E
- **GIVEN** the consignor page opened from its Overview task
- **WHEN** the user chooses an address and saves and continues
- **THEN** Overview is shown, with the consignor task Completed

### Requirement: Saving with nothing chosen moves on without an error, and a value not in the book is refused
**ID**: REQ-PLANTS-CONSIGNOR-004
The system MUST NOT refuse a save with nothing chosen: save-and-continue MUST continue to identification numbers in the opening sequence, or return to Overview when the page was opened from it, with no error and no consignor saved. A consignor already held MUST be kept, as governed by `plants/addresses`. A submitted value that is not an address in the book MUST be refused as governed by `plants/addresses`, and choosing an address after that refusal MUST recover.

#### Scenario: Saving with nothing chosen continues without an error
**ID**: SCN-PLANTS-CONSIGNOR-004-A
- **GIVEN** the user is on the consignor page in the opening sequence with nothing chosen and no consignor held yet
- **WHEN** they save and continue
- **THEN** they reach identification numbers, with no error
- **AND** Overview shows the consignor task not yet started

#### Scenario: Choosing an address after a refused value recovers
**ID**: SCN-PLANTS-CONSIGNOR-004-C
- **GIVEN** the consignor page, reached in the opening sequence, is showing the refusal of a value that is not an address in the book
- **WHEN** the user chooses an address and saves
- **THEN** they continue to identification numbers

#### Scenario: Save and return to overview with nothing chosen reaches Overview without an error
**ID**: SCN-PLANTS-CONSIGNOR-004-D
- **GIVEN** the user is on the consignor page with nothing chosen and no consignor held yet
- **WHEN** they select save and return to overview
- **THEN** Overview is shown, with no error and no consignor saved

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
