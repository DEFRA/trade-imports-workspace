# Consignment Addresses Page Specification

## Purpose

Lists the party roles a notification needs an address for, each row leading to where that role's address is chosen, under `live-animals/addresses`. The page is titled "Consignment addresses".

## Requirements

### Requirement: The page lists each party role the notification needs an address for
**ID**: REQ-CONSIGN-ADDR-001
The system MUST list a row for each party role a notification needs an address for — place of origin, consignor or exporter, consignee, importer, and place of destination — and MUST offer a continue action to leave the page.

#### Scenario: The page lists the party roles with a way to add each
**ID**: SCN-CONSIGN-ADDR-001-A
- **GIVEN** the user has reached the consignment addresses page on a new notification
- **WHEN** the page loads
- **THEN** it lists a row for place of origin, consignor or exporter, consignee, importer and place of destination
- **AND** each row offers a way to add an address for that role
- **AND** a continue action is offered

### Requirement: A role's row offers to change an address once one has been chosen
**ID**: REQ-CONSIGN-ADDR-002
The system MUST offer to change a role's address, in place of adding one, once an address has been chosen for that role, and MUST show the chosen address on the row.

#### Scenario: A row switches from Add to Change once an address is chosen
**ID**: SCN-CONSIGN-ADDR-002-A
- **GIVEN** the user has chosen an address for a party role from the picker
- **WHEN** they return to the consignment addresses page
- **THEN** that role's row shows the chosen address and offers to change it, rather than to add one

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
