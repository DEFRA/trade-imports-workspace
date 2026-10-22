# Transporter Page Specification

## Purpose

Lists every commercial and private transporter the service knows about, letting the user choose one for the consignment or add a new one. The page is titled "Transporter details". Which transporter is required, and what adding one asks, is governed by `live-animals/journey-obligations/transporter`.

## Requirements

### Requirement: The list shows every known transporter in headed columns, with a status tag
**ID**: REQ-TRANSPORTER-001
The system MUST list every transporter the service knows about, each row showing its name, address, approval number (blank for a private transporter), type, and a status tag — green for "Approved", magenta for "New" — under columns headed to match, alongside a radio to choose it.

#### Scenario: The list shows every transporter's key facts under the right column
**ID**: SCN-TRANSPORTER-001-A
- **GIVEN** the user has reached the transporter list
- **WHEN** the page loads
- **THEN** every known transporter is shown as a row under columns headed Name, Address, Approval number, Type and Status
- **AND** a private transporter's approval number cell is blank

#### Scenario: An approved transporter is tagged green, a newly added one magenta
**ID**: SCN-TRANSPORTER-001-B
- **GIVEN** the transporter list is shown
- **WHEN** a row is for a transporter already approved
- **THEN** it carries a green "Approved" tag
- **WHEN** a row is for a transporter added but not yet approved
- **THEN** it carries a magenta "New" tag

### Requirement: The list can be searched by name, address, approval number, type or status, narrowing as the user types
**ID**: REQ-TRANSPORTER-002
The system MUST offer a labelled search over the transporter list, hinted with what it matches and run from a button named "Search". It MUST narrow the list to transporters matching the term by name, address, approval number, type or status, ignoring case and accents, as the user types when JavaScript is on, and MUST show a message rather than an empty table when nothing matches.

#### Scenario: Searching narrows the list by name, address, approval number, type or status
**ID**: SCN-TRANSPORTER-002-A
- **GIVEN** the user is on the transporter list
- **WHEN** they search by a transporter's name, its address, its approval number, its type or its status
- **THEN** only the matching transporters are shown

#### Scenario: A search matching nothing says so, rather than showing an empty table
**ID**: SCN-TRANSPORTER-002-B
- **GIVEN** the user searches the transporter list for a term matching no transporter
- **WHEN** the results are shown
- **THEN** a message says nothing matched, not an empty table

#### Scenario: Typing narrows the list in place with bold matches and an announced count
**ID**: SCN-TRANSPORTER-002-C
- **GIVEN** the user is on the transporter list with JavaScript on
- **WHEN** they type the plain letters "garcia" into the search box
- **THEN** only the transporter named "García Livestock Transport SL" is shown, with the letters "García" in bold
- **AND** the page does not reload and the search box keeps focus
- **AND** the number of transporters shown is announced
- **WHEN** they press the "Search" button or Enter and then type a term matching another transporter
- **THEN** that transporter is shown

#### Scenario: A transporter chosen before filtering stays chosen when filtered out of view
**ID**: SCN-TRANSPORTER-002-D
- **GIVEN** the user has chosen a transporter on the list with JavaScript on
- **WHEN** they type a term that filters that transporter out of view and save
- **THEN** the transporter they chose is the one saved

#### Scenario: Without JavaScript the button or Enter narrows the list on the server
**ID**: SCN-TRANSPORTER-002-E
- **GIVEN** the user is on the transporter list with JavaScript off
- **WHEN** they enter a term and press the "Search" button or Enter
- **THEN** the list comes back narrowed to the matching transporters
- **AND** the search box still holds the term

### Requirement: The page explains that only a DAERA-authorised transporter is valid, not an EU-authorised one
**ID**: REQ-TRANSPORTER-003
The system MUST tell the user that a transporter authorisation issued by DAERA or APHA is required for transporting live vertebrate animals in, to, from or through Great Britain on journeys over 65 km as part of an economic activity, MUST tell them that documents issued by DAERA are valid for use in GB and that documents issued by any EU member state are not, and MUST offer a link to further guidance.

#### Scenario: The list carries the full authorisation guidance and a link to more detail
**ID**: SCN-TRANSPORTER-003-A
- **GIVEN** the user is on the transporter list
- **WHEN** they read the guidance
- **THEN** it states when a transporter authorisation is required, that DAERA authorisation is valid and EU authorisation is not
- **AND** a link is offered to further guidance

### Requirement: The list offers Add a transporter beside the search, above the transporter choices
**ID**: REQ-TRANSPORTER-004
The system MUST offer "Add a transporter" on the same row as the search, above the list and before the transporter choices in page order, and it MUST open "Choose a transporter type".

#### Scenario: Add a transporter sits beside the search and opens the transporter type question
**ID**: SCN-TRANSPORTER-004-A
- **GIVEN** the user is on the transporter list
- **WHEN** the page loads
- **THEN** "Add a transporter" is shown on the search row, above the list of transporters
- **AND** pressing Tab from the search box reaches the "Search" button, then "Add a transporter", then the transporter choices
- **WHEN** they choose "Add a transporter"
- **THEN** the "Choose a transporter type" page opens
