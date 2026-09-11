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

### Requirement: The list can be searched by name, approval number or address
**ID**: REQ-TRANSPORTER-002
The system MUST offer a labelled search over the transporter list, hinted with what it matches, and MUST narrow the list to transporters matching the search term by name, approval number or address, showing a message rather than an empty table when nothing matches.

#### Scenario: Searching narrows the list by name, approval number, or address
**ID**: SCN-TRANSPORTER-002-A
- **GIVEN** the user is on the transporter list
- **WHEN** they search by a transporter's name, its approval number, or its address
- **THEN** only the matching transporter is shown

#### Scenario: A search matching nothing says so, rather than showing an empty table
**ID**: SCN-TRANSPORTER-002-B
- **GIVEN** the user searches the transporter list for a term matching no transporter
- **WHEN** the results are shown
- **THEN** a message says nothing matched, not an empty table

### Requirement: The page explains that only a DAERA-authorised transporter is valid, not an EU-authorised one
**ID**: REQ-TRANSPORTER-003
The system MUST tell the user that a transporter authorisation issued by DAERA or APHA is required for transporting live vertebrate animals in, to, from or through Great Britain on journeys over 65 km as part of an economic activity, MUST tell them that documents issued by DAERA are valid for use in GB and that documents issued by any EU member state are not, and MUST offer a link to further guidance.

#### Scenario: The list carries the full authorisation guidance and a link to more detail
**ID**: SCN-TRANSPORTER-003-A
- **GIVEN** the user is on the transporter list
- **WHEN** they read the guidance
- **THEN** it states when a transporter authorisation is required, that DAERA authorisation is valid and EU authorisation is not
- **AND** a link is offered to further guidance
