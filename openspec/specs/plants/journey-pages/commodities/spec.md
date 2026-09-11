# Commodities List Page Specification

## Purpose

Lists every commodity line the consignment holds, letting the user add, change or remove one. The page is titled "Commodities in the consignment".

## Requirements

### Requirement: The page lists every saved line, showing its category, genus or variety, and quantity
**ID**: REQ-PLANTS-COMMODITIES-001
The system MUST list every commodity line the consignment holds in a table, each row showing its category, genus or variety, and quantity, alongside a Change and a Remove control naming the line's position, and MUST offer an action to add another commodity line.

#### Scenario: Every saved line is shown with its key facts
**ID**: SCN-PLANTS-COMMODITIES-001-A
- **GIVEN** the consignment holds more than one commodity line
- **WHEN** the list page loads
- **THEN** every line is shown as a row naming its category, genus or variety, and quantity

### Requirement: A consignment with no line at all is sent straight to the entry sub-page
**ID**: REQ-PLANTS-COMMODITIES-002
The system MUST send the user directly to the commodity-details entry sub-page when the list would otherwise show no line, rather than showing an empty list page.

#### Scenario: Opening the list with no line saved opens the entry sub-page instead
**ID**: SCN-PLANTS-COMMODITIES-002-A
- **GIVEN** the consignment holds no commodity line
- **WHEN** the user opens the commodities list
- **THEN** the commodity-details entry sub-page is shown instead

### Requirement: Change opens the entry sub-page pre-filled for that line
**ID**: REQ-PLANTS-COMMODITIES-003
The system MUST open the commodity-details entry sub-page pre-filled with a line's saved values when the user selects Change for that line.

#### Scenario: Change reopens a line's saved values
**ID**: SCN-PLANTS-COMMODITIES-003-A
- **GIVEN** the consignment holds a saved commodity line
- **WHEN** the user selects Change for that line
- **THEN** the entry sub-page opens showing that line's saved values

### Requirement: Remove takes the named line off the list, and removing the last line reopens the entry sub-page
**ID**: REQ-PLANTS-COMMODITIES-004
The system MUST remove the line a Remove control names, without affecting any other line, and MUST send the user to the commodity-details entry sub-page when that removal leaves no line at all.

#### Scenario: Removing one of several lines leaves the others intact
**ID**: SCN-PLANTS-COMMODITIES-004-A
- **GIVEN** the consignment holds more than one commodity line
- **WHEN** the user removes one of them
- **THEN** that line no longer appears on the list
- **AND** every other line still does

#### Scenario: Removing the only line reopens the entry sub-page
**ID**: SCN-PLANTS-COMMODITIES-004-B
- **GIVEN** the consignment holds exactly one commodity line
- **WHEN** the user removes it
- **THEN** the commodity-details entry sub-page is shown

### Requirement: A change of commodity type that removes lines is reported on this page
**ID**: REQ-PLANTS-COMMODITIES-005
The system MUST report, on this page, how many lines a commodity-type change removed and which type they were removed for, and MUST offer to add a fresh line from that report.

#### Scenario: The list reports what a type change removed
**ID**: SCN-PLANTS-COMMODITIES-005-A
- **GIVEN** a commodity-type change has just removed one or more lines
- **WHEN** the list page loads
- **THEN** it reports how many lines were removed and names the type they did not belong to
- **AND** it offers a control to add a fresh line

### Requirement: The page ends with its primary action alone, and continuing leaves the section for origin
**ID**: REQ-PLANTS-COMMODITIES-006
The system MUST offer only a save-and-continue action on this page, with no save-and-return or cancel-and-return control, and MUST take the user to the origin page once they continue with at least one line saved.

#### Scenario: The page offers only its primary action
**ID**: SCN-PLANTS-COMMODITIES-006-A
- **GIVEN** the user is on the commodities list with at least one line saved
- **WHEN** the page is shown
- **THEN** only the save-and-continue action is offered

#### Scenario: Continuing with at least one line leaves the section for origin
**ID**: SCN-PLANTS-COMMODITIES-006-B
- **GIVEN** the consignment holds at least one commodity line
- **WHEN** the user saves and continues from the list
- **THEN** the origin page is shown

### Requirement: The back link returns to Overview
**ID**: REQ-PLANTS-COMMODITIES-007
The system MUST return the user to Overview when they follow the back link from the commodities list.

#### Scenario: The back link opens Overview
**ID**: SCN-PLANTS-COMMODITIES-007-A
- **GIVEN** the user is on the commodities list
- **WHEN** they follow the back link
- **THEN** Overview is shown
