# Consignment Addresses Page Specification

## Purpose

Sets out each party role a notification needs an address for as its own headed section, under the introduction "Add all the addresses that are involved in the consignment.", each leading to where that role's address is chosen, under `live-animals/addresses`. The page is titled "Consignment addresses".

## Requirements

### Requirement: The page sets out each party role the notification needs an address for as its own section
**ID**: REQ-CONSIGN-ADDR-001
The system MUST show a section for each party role a notification needs an address for — place of origin, consignor, consignee, importer, and place of destination — each with a heading, its hint and a link named for the role that adds an address, and MUST offer a continue action to leave the page.

#### Scenario: The page shows a headed section for each party role with a named link to add its address
**ID**: SCN-CONSIGN-ADDR-001-A
- **GIVEN** the user has reached the consignment addresses page on a new notification
- **WHEN** the page loads
- **THEN** the paragraph "Add all the addresses that are involved in the consignment." is shown under the heading
- **AND** a section is shown for each of Place of origin, Consignor, Consignee, Importer and Place of destination, each headed by the role and followed by its hint
- **AND** the sections offer the links "Add a place of origin", "Add a consignor", "Add a consignee", "Add an importer" and "Add a place of destination"
- **AND** a continue action is offered

#### Scenario: Following the consignor link opens the consignor picker
**ID**: SCN-CONSIGN-ADDR-001-B
- **GIVEN** the user is on the consignment addresses page with no consignor chosen
- **WHEN** they follow "Add a consignor"
- **THEN** the picker is shown, headed "Consignor"

### Requirement: A role's section shows the chosen address and offers to change it once an address has been chosen
**ID**: REQ-CONSIGN-ADDR-002
The system MUST show the chosen address in a role's section, in place of the link that adds one, as the name in bold followed by each address line on its own line, the last line ending with the country, and MUST offer "Change" and "Edit details" links under it, each announcing the role to a screen reader.

#### Scenario: A section shows the chosen address with Change and Edit details once an address is chosen
**ID**: SCN-CONSIGN-ADDR-002-A
- **GIVEN** the user has chosen an address for a party role from the picker
- **WHEN** they return to the consignment addresses page
- **THEN** that role's section shows the name in bold, then each address line on its own line, the last line ending with the country, such as "Hull, HU9 5PX, United Kingdom"
- **AND** the section offers "Change" and "Edit details" links, and does not offer the link that adds an address

### Requirement: The back link returns to Overview
**ID**: REQ-CONSIGN-ADDR-003
The system MUST return the user to Overview when they follow the back link from the consignment addresses page.

#### Scenario: The back link opens Overview
**ID**: SCN-CONSIGN-ADDR-003-A
- **GIVEN** the user is on the consignment addresses page
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: Overview's task for this page shows Completed once every role has an address
**ID**: REQ-CONSIGN-ADDR-004
The system MUST show Overview's "Roles and addresses" task as Completed once every party role on the consignment addresses page has been given an address.

#### Scenario: Answering every role marks the Overview task Completed
**ID**: SCN-CONSIGN-ADDR-004-A
- **GIVEN** the user has chosen an address for every party role on the consignment addresses page
- **WHEN** they return to Overview
- **THEN** the "Roles and addresses" task shows Completed

### Requirement: The page also sets out a CPH number section when a commodity on the notification requires one
**ID**: REQ-CONSIGN-ADDR-005
The system MUST show an additional section for the County Parish Holding (CPH) number, alongside the five party-role sections, only when at least one commodity line on the notification is one the service treats as requiring a CPH number, and MUST NOT show this section otherwise.

#### Scenario: A CPH-eligible commodity brings the CPH section into the page, empty
**ID**: SCN-CONSIGN-ADDR-005-A
- **GIVEN** the notification has a commodity line the service treats as requiring a CPH number
- **WHEN** the user views the consignment addresses page
- **THEN** a section headed "County parish holding (CPH) number" is shown, with no value yet added, offering the link "Add a CPH number"

#### Scenario: No CPH-eligible commodity leaves the section off the page
**ID**: SCN-CONSIGN-ADDR-005-B
- **GIVEN** none of the notification's commodity lines is one the service treats as requiring a CPH number
- **WHEN** the user views the consignment addresses page
- **THEN** no CPH number section is shown

### Requirement: The page warns that a false address is fraud
**ID**: REQ-CONSIGN-ADDR-006
The system MUST warn the user, on the consignment addresses page, that providing a false address is an act of fraud.

#### Scenario: The consignment addresses page carries the fraud warning
**ID**: SCN-CONSIGN-ADDR-006-A
- **GIVEN** the user is on the consignment addresses page
- **WHEN** the page loads
- **THEN** the warning "Providing a false address is an act of fraud" is shown

### Requirement: The page works without JavaScript and has no serious or critical accessibility violations
**ID**: REQ-CONSIGN-ADDR-007
The system MUST let the user add an address from the consignment addresses page with JavaScript off, and MUST show the page with no serious or critical accessibility violations, with no address chosen and with every address chosen, at desktop and at phone width.

#### Scenario: The empty page works without JavaScript and has no serious or critical accessibility violations
**ID**: SCN-CONSIGN-ADDR-007-A
- **GIVEN** the user is on the consignment addresses page with no address chosen
- **WHEN** the page loads at desktop width and at phone width
- **THEN** the page has no serious or critical accessibility violations
- **AND** with JavaScript off, every section is shown and "Add a consignor" opens the consignor picker

#### Scenario: The complete page has no serious or critical accessibility violations
**ID**: SCN-CONSIGN-ADDR-007-B
- **GIVEN** the user has chosen an address for every party role
- **WHEN** the consignment addresses page loads at desktop width and at phone width
- **THEN** the page has no serious or critical accessibility violations
